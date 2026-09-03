import { describe, expect, it, vi } from "vitest";
import {
  applyFilingProfile,
  type FilingProfile,
} from "./filing-profile";
import type { SptData, SptReturn } from "./spt";
import {
  FORM_DONE_NEXT_STEP,
  FORM_STAY_NEXT_STEP,
  GET_TAX_RETURN_CONTEXT_INPUT_SCHEMA,
  GET_TAX_RETURN_CONTEXT_TOOL,
  parseProfileInput,
  registerTaxReturnTools,
  TAX_TOOL_NAMES,
  UPDATE_TAXPAYER_PROFILE_INPUT_SCHEMA,
  UPDATE_TAXPAYER_PROFILE_TOOL,
  type TaxModelContext,
  type TaxTool,
  type TaxToolDependencies,
  type TaxToolFailure,
  type UpdateTaxpayerProfileResult,
} from "./webmcp-tax-tools";

// ---- synthetic fixtures ----

function fixtureData(): SptData {
  return {
    identity: { ptkp: "TK/0", signer: "wp" },
    income: { employment: 120_000_000 },
    credits: { withholding: 3_000_000 },
    answers: { q1a: "ya" },
    family: [{ name: "Synthetic Child", nik: "0000000000000000" }],
    employmentSlips: [{ employer: "PT Contoh Sintetis", employerNpwp: "00.000.000.0-000.000" }],
    declarationAgree: false,
  };
}

function fixtureReturn(data: SptData, status: SptReturn["status"] = "DRAFT"): SptReturn {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: "00000000-0000-4000-8000-000000000002",
    tax_year: 2025,
    form_type: "1770 S",
    status,
    data,
    pph_owed: 0,
    pph_credit: 0,
    balance_due: 0,
    payment_status: null,
    rejection_reason: null,
    reviewed_at: null,
    submitted_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    computed: {
      totalNet: 0,
      netAfterDeduction: 0,
      ptkpAmount: 54_000_000,
      taxableIncome: 0,
      pphOwed: 0,
      pphCredit: 0,
      balanceDue: 0,
      paymentStatus: "Nihil",
    },
    taxpayer_name: "Wajib Pajak Sintetis",
    taxpayer_npwp: "00.000.000.0-000.000",
    taxpayer_username: "synthetic",
  };
}

/** A minimal in-memory stand-in for the page + backend: `saveProfile`
 *  behaves like the real adapter (apply → persist → adopt canonical). */
function fakeDeps(initial: SptReturn, opts: { failSave?: boolean } = {}) {
  let current = initial;
  const saveCalls: FilingProfile[] = [];
  const revealCalls: SptReturn[] = [];
  const deps: TaxToolDependencies = {
    getCurrentReturn: () => current,
    saveProfile: async (profile) => {
      saveCalls.push(profile);
      if (opts.failSave) throw new Error("boom");
      const nextData = applyFilingProfile(current.data, profile);
      current = { ...current, data: nextData, updated_at: "2026-01-02T00:00:00.000Z" };
      return current;
    },
    revealProfileUpdate: (saved) => {
      revealCalls.push(saved);
    },
  };
  return { deps, saveCalls, revealCalls, getCurrent: () => current };
}

function fakeModelContext() {
  const registered: Array<{ tool: TaxTool; options?: WebMCP.ModelContextRegisterToolOptions }> = [];
  const modelContext = {
    registerTool: vi.fn(async (tool: TaxTool, options?: WebMCP.ModelContextRegisterToolOptions) => {
      registered.push({ tool, options });
    }),
  } as unknown as TaxModelContext;
  return { modelContext, registered };
}

async function registerWithFakes(initial: SptReturn, opts?: { failSave?: boolean }) {
  const fakes = fakeDeps(initial, opts);
  const { modelContext, registered } = fakeModelContext();
  const controller = new AbortController();
  await registerTaxReturnTools(modelContext, fakes.deps, controller.signal);
  const byName = (name: string) => {
    const hit = registered.find((r) => r.tool.name === name);
    if (!hit) throw new Error(`tool ${name} not registered`);
    return hit.tool;
  };
  const execOpts = { signal: new AbortController().signal };
  return {
    ...fakes,
    registered,
    controller,
    read: () => byName(GET_TAX_RETURN_CONTEXT_TOOL).execute({}, execOpts),
    update: (input: unknown) =>
      byName(UPDATE_TAXPAYER_PROFILE_TOOL).execute(input as Record<string, unknown>, execOpts) as Promise<
        UpdateTaxpayerProfileResult | TaxToolFailure
      >,
  };
}

const MAPPING: Array<[FilingProfile, string]> = [
  [{ maritalStatus: "unmarried", dependentCount: 0 }, "TK/0"],
  [{ maritalStatus: "unmarried", dependentCount: 1 }, "TK/1"],
  [{ maritalStatus: "unmarried", dependentCount: 2 }, "TK/2"],
  [{ maritalStatus: "unmarried", dependentCount: 3 }, "TK/3"],
  [{ maritalStatus: "married", dependentCount: 0 }, "K/0"],
  [{ maritalStatus: "married", dependentCount: 1 }, "K/1"],
  [{ maritalStatus: "married", dependentCount: 2 }, "K/2"],
  [{ maritalStatus: "married", dependentCount: 3 }, "K/3"],
];

// ---- discovery metadata ----

describe("registerTaxReturnTools discovery metadata", () => {
  it("registers exactly the two slice tools, in order, with a shared abort signal", async () => {
    const { registered, controller } = await registerWithFakes(fixtureReturn(fixtureData()));
    expect(registered.map((r) => r.tool.name)).toEqual([
      "get_tax_return_context",
      "update_taxpayer_profile",
    ]);
    expect([...TAX_TOOL_NAMES]).toEqual(["get_tax_return_context", "update_taxpayer_profile"]);
    for (const r of registered) {
      expect(r.options?.signal).toBe(controller.signal);
    }
  });

  it("never registers a declaration or submission tool", async () => {
    const { registered } = await registerWithFakes(fixtureReturn(fixtureData()));
    const names = registered.map((r) => r.tool.name.toLowerCase());
    for (const banned of ["submit", "declar", "lapor", "pernyataan", "sign", "payment", "bayar"]) {
      expect(names.some((n) => n.includes(banned))).toBe(false);
    }
    expect(registered).toHaveLength(2);
  });

  it("describes get_tax_return_context exactly as specified", async () => {
    const { registered } = await registerWithFakes(fixtureReturn(fixtureData()));
    const tool = registered[0].tool;
    expect(tool.description).toBe(
      "Read the active Indonesian individual tax return's filing status and the minimum missing taxpayer-profile facts. Use this before asking the user for information. This tool does not submit or modify the return.",
    );
    expect(tool.inputSchema).toEqual({ type: "object", properties: {}, additionalProperties: false });
    expect(tool.inputSchema).toBe(GET_TAX_RETURN_CONTEXT_INPUT_SCHEMA);
    expect(tool.annotations).toEqual({ readOnlyHint: true });
  });

  it("describes update_taxpayer_profile exactly as specified", async () => {
    const { registered } = await registerWithFakes(fixtureReturn(fixtureData()));
    const tool = registered[1].tool;
    expect(tool.description).toBe(
      "Save marital status and eligible dependant count confirmed by the user for the active Indonesian individual tax return. The website derives the PTKP code. Never guess either value. This modifies the visible draft but does not submit it.",
    );
    expect(tool.inputSchema).toBe(UPDATE_TAXPAYER_PROFILE_INPUT_SCHEMA);
    expect(tool.inputSchema).toEqual({
      type: "object",
      properties: {
        maritalStatus: {
          type: "string",
          enum: ["unmarried", "married"],
          description: expect.any(String),
        },
        dependentCount: {
          type: "integer",
          minimum: 0,
          maximum: 3,
          description: expect.any(String),
        },
      },
      required: ["maritalStatus", "dependentCount"],
      additionalProperties: false,
    });
    expect(tool.annotations).toEqual({ readOnlyHint: false });
  });

  it("does not register when the signal is already aborted", async () => {
    const { deps } = fakeDeps(fixtureReturn(fixtureData()));
    const { modelContext, registered } = fakeModelContext();
    const controller = new AbortController();
    controller.abort();
    await registerTaxReturnTools(modelContext, deps, controller.signal);
    expect(registered).toHaveLength(0);
  });
});

// ---- read tool ----

describe("get_tax_return_context", () => {
  it("reports an unconfirmed profile for a provisional PTKP and hides identifiers", async () => {
    const { read } = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = (await read()) as { ok: true; context: Record<string, unknown> };
    expect(result.ok).toBe(true);
    expect(result.context).toMatchObject({
      returnId: "00000000-0000-4000-8000-000000000001",
      taxYear: 2025,
      formType: "1770 S",
      status: "DRAFT",
      editable: true,
      taxpayerProfile: null,
      currentPtkpCode: "TK/0",
      profileConfirmed: false,
      missingFields: ["maritalStatus", "dependentCount"],
    });
    expect(result.context.suggestedQuestion).toEqual({
      id: expect.any(String),
      en: "Were you married at the end of the tax year, and how many eligible dependants did you support (from zero to three)?",
    });
    const json = JSON.stringify(result);
    for (const leak of [
      "00.000.000.0-000.000",
      "0000000000000000",
      "Wajib Pajak Sintetis",
      "PT Contoh Sintetis",
      "120000000",
      "user_id",
      "income",
      "credits",
      "family",
      "employmentSlips",
      "declarationAgree",
    ]) {
      expect(json).not.toContain(leak);
    }
  });

  it("reads the latest return on every call, not a captured one", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const before = (await fakes.read()) as { context: { profileConfirmed: boolean }; nextStep: unknown };
    expect(before.context.profileConfirmed).toBe(false);
    expect(before.nextStep).toEqual(FORM_STAY_NEXT_STEP);
    await fakes.deps.saveProfile({ maritalStatus: "married", dependentCount: 2 });
    const after = (await fakes.read()) as { context: { profileConfirmed: boolean; currentPtkpCode: string }; nextStep: unknown };
    expect(after.context.profileConfirmed).toBe(true);
    expect(after.context.currentPtkpCode).toBe("K/2");
    expect(after.nextStep).toEqual(FORM_DONE_NEXT_STEP);
  });
});

// ---- write tool ----

describe("update_taxpayer_profile", () => {
  it.each(MAPPING)("saves %j and reports %s from the canonical return", async (profile, code) => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.update({ ...profile });
    expect(result).toEqual({
      ok: true,
      changed: {
        section: "taxpayerProfile",
        maritalStatus: profile.maritalStatus,
        dependentCount: profile.dependentCount,
        ptkpCode: code,
      },
      message: `Saved the confirmed taxpayer profile and updated PTKP to ${code}.`,
      context: expect.objectContaining({
        taxpayerProfile: profile,
        currentPtkpCode: code,
        profileConfirmed: true,
        missingFields: [],
        suggestedQuestion: null,
        status: "DRAFT",
      }),
      nextStep: FORM_DONE_NEXT_STEP,
    });
    expect(fakes.saveCalls).toEqual([profile]);
    expect(fakes.getCurrent().data.identity?.ptkp).toBe(code);
    expect(fakes.getCurrent().data.filingProfile).toEqual(profile);
  });

  it("matches the spec example for married + 1", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = (await fakes.update({ maritalStatus: "married", dependentCount: 1 })) as UpdateTaxpayerProfileResult;
    expect(result.changed).toEqual({
      section: "taxpayerProfile",
      maritalStatus: "married",
      dependentCount: 1,
      ptkpCode: "K/1",
    });
    expect(result.message).toBe("Saved the confirmed taxpayer profile and updated PTKP to K/1.");
  });

  it("reveals the update only after a successful save, with the saved return", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    await fakes.update({ maritalStatus: "unmarried", dependentCount: 0 });
    expect(fakes.revealCalls).toHaveLength(1);
    expect(fakes.revealCalls[0]).toBe(fakes.getCurrent());
    expect(fakes.revealCalls[0].data.identity?.ptkp).toBe("TK/0");
  });

  it("preserves unrelated data through the write path", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    await fakes.update({ maritalStatus: "married", dependentCount: 3 });
    const saved = fakes.getCurrent().data;
    expect(saved.identity?.signer).toBe("wp");
    expect(saved.income).toEqual({ employment: 120_000_000 });
    expect(saved.credits).toEqual({ withholding: 3_000_000 });
    expect(saved.answers).toEqual({ q1a: "ya" });
    expect(saved.family).toHaveLength(1);
    expect(saved.declarationAgree).toBe(false);
  });

  it("is idempotent for a repeated identical update", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const first = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    const second = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    expect(second).toEqual(first);
    expect(fakes.getCurrent().status).toBe("DRAFT");
    expect(fakes.getCurrent().data.filingProfile).toEqual({ maritalStatus: "married", dependentCount: 1 });
    expect(fakes.saveCalls).toHaveLength(2);
  });

  it("accepts a REJECTED return as editable", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData(), "REJECTED"));
    const result = await fakes.update({ maritalStatus: "married", dependentCount: 0 });
    expect(result.ok).toBe(true);
    expect(fakes.saveCalls).toHaveLength(1);
  });

  it.each(["WAITING_PAYMENT", "REPORTED"] as const)(
    "rejects a %s return without saving or revealing",
    async (status) => {
      const fakes = await registerWithFakes(fixtureReturn(fixtureData(), status));
      const result = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
      expect(result).toEqual({
        ok: false,
        error: { code: "RETURN_NOT_EDITABLE", message: expect.stringContaining(status) },
      });
      expect(fakes.saveCalls).toHaveLength(0);
      expect(fakes.revealCalls).toHaveLength(0);
      expect(fakes.getCurrent().data.filingProfile).toBeUndefined();
    },
  );

  it.each([
    ["missing dependentCount", { maritalStatus: "married" }],
    ["missing maritalStatus", { dependentCount: 1 }],
    ["extra property", { maritalStatus: "married", dependentCount: 1, ptkpCode: "K/1" }],
    ["unknown status", { maritalStatus: "single", dependentCount: 1 }],
    ["string count", { maritalStatus: "married", dependentCount: "1" }],
    ["count too high", { maritalStatus: "married", dependentCount: 4 }],
    ["negative count", { maritalStatus: "married", dependentCount: -1 }],
    ["fractional count", { maritalStatus: "married", dependentCount: 1.5 }],
    ["null input", null],
    ["array input", []],
    ["empty object", {}],
  ])("rejects invalid input (%s) before any save", async (_label, input) => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.update(input);
    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_PROFILE", message: expect.any(String) },
    });
    expect(fakes.saveCalls).toHaveLength(0);
    expect(fakes.revealCalls).toHaveLength(0);
  });

  it("checks validity before editability", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData(), "REPORTED"));
    const result = await fakes.update({ maritalStatus: "married" });
    expect((result as TaxToolFailure).error.code).toBe("INVALID_PROFILE");
  });

  it("returns SAVE_FAILED and keeps the previous state when persistence rejects", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()), { failSave: true });
    const result = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    expect(result).toEqual({
      ok: false,
      error: { code: "SAVE_FAILED", message: expect.any(String) },
    });
    expect(fakes.saveCalls).toHaveLength(1);
    expect(fakes.revealCalls).toHaveLength(0);
    expect(fakes.getCurrent().data.filingProfile).toBeUndefined();
    expect(fakes.getCurrent().data.identity?.ptkp).toBe("TK/0");
    const read = (await fakes.read()) as { context: { profileConfirmed: boolean } };
    expect(read.context.profileConfirmed).toBe(false);
  });

  it("still succeeds if the presentation callback throws after a persisted save", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    fakes.deps.revealProfileUpdate = () => {
      throw new Error("scroll failed");
    };
    const result = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    expect(result.ok).toBe(true);
  });

  it("does not leak identifiers or unrelated data in the success result", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    const json = JSON.stringify(result);
    for (const leak of [
      "00.000.000.0-000.000",
      "0000000000000000",
      "Wajib Pajak Sintetis",
      "PT Contoh Sintetis",
      "120000000",
      "user_id",
      "income",
      "family",
    ]) {
      expect(json).not.toContain(leak);
    }
  });
});

describe("parseProfileInput", () => {
  it("returns a fresh object with only the two fields", () => {
    const input = { maritalStatus: "unmarried", dependentCount: 3 };
    const parsed = parseProfileInput(input);
    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
  });
});
