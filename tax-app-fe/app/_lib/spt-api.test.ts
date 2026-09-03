import { describe, expect, it } from "vitest";
import { putSptData, SPT_SAVE_FAILED_MESSAGE, SptSaveError } from "./spt-api";
import type { SptData, SptReturn } from "./spt";

const RETURN_ID = "00000000-0000-4000-8000-000000000001";

function canonical(data: SptData): SptReturn {
  return {
    id: RETURN_ID,
    user_id: "00000000-0000-4000-8000-000000000002",
    tax_year: 2025,
    form_type: "1770 S",
    status: "DRAFT",
    data,
    pph_owed: 1,
    pph_credit: 2,
    balance_due: 3,
    payment_status: "Kurang Bayar",
    rejection_reason: null,
    reviewed_at: null,
    submitted_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-02T00:00:00.000Z",
    computed: {
      totalNet: 0,
      netAfterDeduction: 0,
      ptkpAmount: 63_000_000,
      taxableIncome: 0,
      pphOwed: 1,
      pphCredit: 2,
      balanceDue: 3,
      paymentStatus: "Kurang Bayar",
    },
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function fakeFetch(responder: (input: RequestInfo | URL, init?: RequestInit) => Response | Promise<Response>) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return responder(input, init);
  }) as typeof fetch;
  return { impl, calls };
}

describe("putSptData", () => {
  it("sends the exact same-origin PUT contract and returns the canonical return", async () => {
    const next: SptData = {
      filingProfile: { maritalStatus: "married", dependentCount: 1 },
      identity: { ptkp: "K/1", signer: "wp" },
      income: { employment: 10 },
    };
    const server = canonical(next);
    const { impl, calls } = fakeFetch(() => jsonResponse(server));

    const result = await putSptData(RETURN_ID, next, impl);

    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe(`/api/be/spt/${RETURN_ID}`);
    expect(calls[0].init?.method).toBe("PUT");
    expect(calls[0].init?.headers).toEqual({ "Content-Type": "application/json" });
    expect(calls[0].init?.credentials).toBe("same-origin");
    expect(JSON.parse(calls[0].init?.body as string)).toEqual({ data: next });
    expect(result).toEqual(server);
    expect(result).not.toBe(server);
  });

  it("surfaces the backend's structured message and status", async () => {
    const { impl } = fakeFetch(() =>
      jsonResponse({ statusCode: 400, message: "SPT yang sudah dikirim tidak dapat diubah." }, 400),
    );
    const err = await putSptData(RETURN_ID, {}, impl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SptSaveError);
    expect((err as SptSaveError).message).toBe("SPT yang sudah dikirim tidak dapat diubah.");
    expect((err as SptSaveError).status).toBe(400);
  });

  it("falls back to the stable message for non-JSON error bodies", async () => {
    const { impl } = fakeFetch(() => new Response("<html>502</html>", { status: 502 }));
    const err = await putSptData(RETURN_ID, {}, impl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SptSaveError);
    expect((err as SptSaveError).message).toBe(SPT_SAVE_FAILED_MESSAGE);
    expect((err as SptSaveError).status).toBe(502);
  });

  it("falls back to the stable message when the error message is not a string", async () => {
    const { impl } = fakeFetch(() => jsonResponse({ message: ["data must be an object"] }, 400));
    const err = await putSptData(RETURN_ID, {}, impl).catch((e: unknown) => e);
    expect((err as SptSaveError).message).toBe(SPT_SAVE_FAILED_MESSAGE);
    expect((err as SptSaveError).status).toBe(400);
  });

  it("wraps network failures with status 0", async () => {
    const { impl } = fakeFetch(() => {
      throw new TypeError("Failed to fetch");
    });
    const err = await putSptData(RETURN_ID, {}, impl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SptSaveError);
    expect((err as SptSaveError).message).toBe(SPT_SAVE_FAILED_MESSAGE);
    expect((err as SptSaveError).status).toBe(0);
  });

  it("rejects a 2xx response whose body is not JSON", async () => {
    const { impl } = fakeFetch(() => new Response("not json", { status: 200 }));
    const err = await putSptData(RETURN_ID, {}, impl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SptSaveError);
    expect((err as SptSaveError).status).toBe(200);
  });

  it("does not treat unauthorized as success", async () => {
    const { impl } = fakeFetch(() => jsonResponse({ message: "Sesi tidak valid." }, 401));
    const err = await putSptData(RETURN_ID, {}, impl).catch((e: unknown) => e);
    expect((err as SptSaveError).status).toBe(401);
    expect((err as SptSaveError).message).toBe("Sesi tidak valid.");
  });
});
