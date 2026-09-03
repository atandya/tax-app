import { describe, expect, it } from "vitest";
import { DemoLoginError, postDemoLogin } from "./auth-api";

function fakeFetch(responder: (input: RequestInfo | URL, init?: RequestInit) => Response) {
  const calls: Array<{ input: RequestInfo | URL; init?: RequestInit }> = [];
  const impl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    calls.push({ input, init });
    return responder(input, init);
  }) as typeof fetch;
  return { impl, calls };
}

describe("postDemoLogin", () => {
  it("POSTs to the same-origin proxy with no body and resolves on 200", async () => {
    const { impl, calls } = fakeFetch(() => new Response(JSON.stringify({ ok: true }), { status: 200 }));
    await expect(postDemoLogin(impl)).resolves.toBeUndefined();
    expect(calls).toHaveLength(1);
    expect(calls[0].input).toBe("/api/be/auth/demo-login");
    expect(calls[0].init?.method).toBe("POST");
    expect(calls[0].init?.credentials).toBe("same-origin");
    expect(calls[0].init?.body).toBeUndefined();
  });

  it("rejects with the HTTP status on a non-2xx response", async () => {
    const { impl } = fakeFetch(() => new Response("", { status: 404 }));
    await expect(postDemoLogin(impl)).rejects.toMatchObject({ name: "DemoLoginError", status: 404 });
  });

  it("rejects with status 0 on a network failure", async () => {
    const impl = (async () => {
      throw new TypeError("offline");
    }) as unknown as typeof fetch;
    await expect(postDemoLogin(impl)).rejects.toBeInstanceOf(DemoLoginError);
    await expect(postDemoLogin(impl)).rejects.toMatchObject({ status: 0 });
  });
});
