import { describe, expect, it, vi } from "vitest";
import {
  DASHBOARD_TOOL_NAMES,
  failure,
  FORM_NEXT_STEP,
  FORM_TOOL_NAMES,
  registerAll,
  type ModelContext,
  type WebMcpTool,
} from "./webmcp";

function fakeModelContext() {
  const registered: Array<{ tool: WebMcpTool; options?: WebMCP.ModelContextRegisterToolOptions }> = [];
  const modelContext = {
    registerTool: vi.fn(async (tool: WebMcpTool, options?: WebMCP.ModelContextRegisterToolOptions) => {
      registered.push({ tool, options });
    }),
  } as unknown as ModelContext;
  return { modelContext, registered };
}

function tool(name: string): WebMcpTool {
  return { name, description: `${name} description`, execute: async () => ({ ok: true }) };
}

describe("failure", () => {
  it("builds the structured failure shape", () => {
    expect(failure("RETURN_NOT_FOUND", "No such return.")).toEqual({
      ok: false,
      error: { code: "RETURN_NOT_FOUND", message: "No such return." },
    });
  });

  it("carries existingReturnId only when given", () => {
    expect(failure("DRAFT_ALREADY_EXISTS", "Exists.", "id-1")).toEqual({
      ok: false,
      error: { code: "DRAFT_ALREADY_EXISTS", message: "Exists.", existingReturnId: "id-1" },
    });
    expect(failure("X", "y").error).not.toHaveProperty("existingReturnId");
  });
});

describe("registerAll", () => {
  it("registers every tool in order under one signal", async () => {
    const { modelContext, registered } = fakeModelContext();
    const controller = new AbortController();
    await registerAll(modelContext, [tool("a"), tool("b")], controller.signal);
    expect(registered.map((r) => r.tool.name)).toEqual(["a", "b"]);
    for (const r of registered) expect(r.options?.signal).toBe(controller.signal);
  });

  it("registers nothing when the signal is already aborted", async () => {
    const { modelContext, registered } = fakeModelContext();
    const controller = new AbortController();
    controller.abort();
    await registerAll(modelContext, [tool("a")], controller.signal);
    expect(registered).toEqual([]);
  });

  it("rejects when registerTool rejects, so callers can fall back", async () => {
    const registered: string[] = [];
    const modelContext = {
      registerTool: vi.fn(async (t: WebMcpTool) => {
        if (t.name === "b") throw new Error("registration failed");
        registered.push(t.name);
      }),
    } as unknown as ModelContext;
    const controller = new AbortController();
    await expect(
      registerAll(modelContext, [tool("a"), tool("b"), tool("c")], controller.signal),
    ).rejects.toThrow("registration failed");
    expect(registered).toEqual(["a"]);
  });
});

describe("journey tool names", () => {
  it("names the form and dashboard tools for nextStep hints", () => {
    expect([...FORM_TOOL_NAMES]).toEqual([
      "get_tax_return_context",
      "update_taxpayer_profile",
      "update_income_and_credits",
      "add_assets",
      "add_family_members",
      "add_debts",
      "add_withholding_slips",
      "update_return_answers",
    ]);
    expect([...DASHBOARD_TOOL_NAMES]).toEqual(["list_tax_returns", "open_tax_return", "create_tax_return"]);
  });
});

describe("FORM_NEXT_STEP", () => {
  it("points at the tax return page and the form tools", () => {
    expect(FORM_NEXT_STEP.page).toBe("tax_return");
    expect(FORM_NEXT_STEP.tools).toEqual(FORM_TOOL_NAMES);
  });
});
