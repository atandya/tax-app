// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { ModelContext } from "../_lib/webmcp";

function installModelContext() {
  const registeredNames: string[] = [];
  const registerTool = vi.fn(async (tool: { name: string }) => {
    registeredNames.push(tool.name);
  });
  const modelContext = { registerTool } as unknown as ModelContext;
  Object.defineProperty(document, "modelContext", { configurable: true, value: modelContext });
  return { modelContext, registerTool, registeredNames };
}

function fakeRouter() {
  return { push: vi.fn(), refresh: vi.fn() };
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "modelContext");
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("useAuthTools", () => {
  it("registers exactly sign_in_demo when the build flag is enabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "true");
    vi.resetModules();
    const { useAuthTools } = await import("./use-auth-tools");
    const { registerTool, registeredNames } = installModelContext();

    renderHook(() => useAuthTools(fakeRouter()));

    await vi.waitFor(() => expect(registerTool).toHaveBeenCalledTimes(1));
    expect(registeredNames).toEqual(["sign_in_demo"]);
  });

  it("registers nothing when the build flag is explicitly disabled", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", "false");
    vi.resetModules();
    const { useAuthTools } = await import("./use-auth-tools");
    const { registerTool } = installModelContext();

    renderHook(() => useAuthTools(fakeRouter()));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(registerTool).not.toHaveBeenCalled();
  });

  it("registers nothing when the build flag is unset", async () => {
    vi.stubEnv("NEXT_PUBLIC_DEMO_LOGIN_ENABLED", undefined);
    vi.resetModules();
    const { useAuthTools } = await import("./use-auth-tools");
    const { registerTool } = installModelContext();

    renderHook(() => useAuthTools(fakeRouter()));

    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(registerTool).not.toHaveBeenCalled();
  });
});
