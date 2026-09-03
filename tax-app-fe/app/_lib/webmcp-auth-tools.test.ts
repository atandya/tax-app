import { describe, expect, it, vi } from "vitest";
import { DemoLoginError } from "./auth-api";
import type { ModelContext, WebMcpTool } from "./webmcp";
import {
  AUTH_TOOL_NAMES,
  registerAuthTools,
  SIGN_IN_DEMO_DESCRIPTION,
  SIGN_IN_DEMO_TOOL,
  type AuthToolDependencies,
} from "./webmcp-auth-tools";

function fakeModelContext() {
  const registered: Array<{ tool: WebMcpTool; options?: WebMCP.ModelContextRegisterToolOptions }> = [];
  const modelContext = {
    registerTool: vi.fn(async (tool: WebMcpTool, options?: WebMCP.ModelContextRegisterToolOptions) => {
      registered.push({ tool, options });
    }),
  } as unknown as ModelContext;
  return { modelContext, registered };
}

function fakeDeps(opts: { signInError?: Error; navigateError?: Error } = {}) {
  const calls: string[] = [];
  const deps: AuthToolDependencies = {
    signInDemo: async () => {
      calls.push("signIn");
      if (opts.signInError) throw opts.signInError;
    },
    goToDashboard: () => {
      calls.push("navigate");
      if (opts.navigateError) throw opts.navigateError;
    },
  };
  return { deps, calls };
}

async function setup(opts?: { signInError?: Error; navigateError?: Error }) {
  const { deps, calls } = fakeDeps(opts);
  const { modelContext, registered } = fakeModelContext();
  const controller = new AbortController();
  await registerAuthTools(modelContext, deps, controller.signal);
  const tool = registered[0].tool;
  return { registered, controller, calls, run: () => tool.execute({}, { signal: new AbortController().signal }) };
}

describe("registerAuthTools discovery metadata", () => {
  it("registers exactly sign_in_demo with an empty schema and the shared signal", async () => {
    const { registered, controller } = await setup();
    expect(registered.map((r) => r.tool.name)).toEqual([SIGN_IN_DEMO_TOOL]);
    expect([...AUTH_TOOL_NAMES]).toEqual(["sign_in_demo"]);
    expect(registered[0].tool.description).toBe(SIGN_IN_DEMO_DESCRIPTION);
    expect(registered[0].tool.inputSchema).toEqual({ type: "object", properties: {}, additionalProperties: false });
    expect(registered[0].tool.annotations).toEqual({ readOnlyHint: false });
    expect(registered[0].options?.signal).toBe(controller.signal);
  });

  it("does not describe or accept credentials", async () => {
    const { registered } = await setup();
    const json = JSON.stringify({ d: registered[0].tool.description, s: registered[0].tool.inputSchema }).toLowerCase();
    for (const banned of ["password", "kata sandi", "otp", "token"]) {
      expect(json.includes(banned), `no "${banned}"`).toBe(false);
    }
  });
});

describe("sign_in_demo execution", () => {
  it("signs in, navigates, and returns the dashboard next step without user data", async () => {
    const { run, calls } = await setup();
    const result = await run();
    expect(calls).toEqual(["signIn", "navigate"]);
    expect(result).toEqual({
      ok: true,
      signedInAs: "demo_taxpayer",
      message: "Signed in as the demonstration taxpayer. Opening the tax return dashboard.",
      nextStep: {
        page: "dashboard",
        tools: ["list_tax_returns", "open_tax_return", "create_tax_return"],
        hint: "Call list_tax_returns to find the return the user wants to work on.",
      },
    });
    const json = JSON.stringify(result);
    for (const key of ["user", "npwp", "name", "username", "cookie", "token"]) {
      expect(json).not.toContain(`"${key}"`);
    }
  });

  it("maps a 404 to DEMO_LOGIN_DISABLED and does not navigate", async () => {
    const { run, calls } = await setup({ signInError: new DemoLoginError(404) });
    expect(await run()).toMatchObject({ ok: false, error: { code: "DEMO_LOGIN_DISABLED" } });
    expect(calls).toEqual(["signIn"]);
  });

  it("maps any other failure to SIGN_IN_FAILED and does not navigate", async () => {
    for (const err of [new DemoLoginError(500), new DemoLoginError(0), new Error("boom")]) {
      const { run, calls } = await setup({ signInError: err });
      expect(await run()).toMatchObject({ ok: false, error: { code: "SIGN_IN_FAILED" } });
      expect(calls).toEqual(["signIn"]);
    }
  });

  it("reports NAVIGATION_FAILED when the session opened but routing threw", async () => {
    const { run, calls } = await setup({ navigateError: new Error("router") });
    const result = await run();
    expect(calls).toEqual(["signIn", "navigate"]);
    expect(result).toMatchObject({ ok: false, error: { code: "NAVIGATION_FAILED" } });
    expect(JSON.stringify(result)).toContain("/spt");
  });
});
