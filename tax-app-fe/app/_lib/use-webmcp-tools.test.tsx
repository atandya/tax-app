// @vitest-environment jsdom
import { cleanup, renderHook } from "@testing-library/react";
import { StrictMode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useWebMcpTools, type RegisterTools } from "./use-webmcp-tools";
import type { ModelContext } from "./webmcp";

type NoDeps = Record<string, never>;

function installModelContext() {
  const signals: AbortSignal[] = [];
  const modelContext = {
    registerTool: vi.fn(async (_tool: unknown, options?: { signal?: AbortSignal }) => {
      if (options?.signal) signals.push(options.signal);
    }),
  } as unknown as ModelContext;
  Object.defineProperty(document, "modelContext", { configurable: true, value: modelContext });
  return { modelContext, signals };
}

/** A registration that never settles, so a test can inspect its signal while
 *  the call is still in flight. */
function pendingRegister() {
  return vi.fn<RegisterTools<NoDeps>>(() => new Promise<void>(() => {}));
}

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "modelContext");
});

describe("useWebMcpTools", () => {
  it("registers once per key, reads the latest deps, and aborts on unmount", async () => {
    const { modelContext, signals } = installModelContext();
    const register = vi.fn<RegisterTools<{ n: number }>>(
      async (ctx, latest, signal) => {
        await ctx.registerTool(
          { name: "t", description: "d", execute: async () => latest().n },
          { signal },
        );
      },
    );

    const { rerender, unmount } = renderHook(
      ({ n }: { n: number }) => useWebMcpTools({ n }, register, "key-1"),
      { initialProps: { n: 1 } },
    );
    await vi.waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    expect(register.mock.calls[0][0]).toBe(modelContext);
    await vi.waitFor(() => expect(signals).toHaveLength(1));

    rerender({ n: 2 });
    expect(register).toHaveBeenCalledTimes(1);
    const latest = register.mock.calls[0][1];
    expect(latest()).toEqual({ n: 2 });

    expect(signals[0].aborted).toBe(false);
    unmount();
    expect(signals[0].aborted).toBe(true);
  });

  it("re-registers with the newest callback when the key changes", async () => {
    installModelContext();
    // Never settles, so signal #1 is still in flight when the key changes.
    const first = pendingRegister();
    const second = pendingRegister();

    const { rerender } = renderHook(
      ({ key, register }: { key: string; register: RegisterTools<NoDeps> }) =>
        useWebMcpTools({}, register, key),
      { initialProps: { key: "a", register: first as RegisterTools<NoDeps> } },
    );
    await vi.waitFor(() => expect(first).toHaveBeenCalledTimes(1));

    rerender({ key: "b", register: second as RegisterTools<NoDeps> });
    // The newest callback registers the new key; the stale one is not reused.
    await vi.waitFor(() => expect(second).toHaveBeenCalledTimes(1));
    expect(first).toHaveBeenCalledTimes(1);
    expect(first.mock.calls[0][2].aborted).toBe(true);
    expect(second.mock.calls[0][2].aborted).toBe(false);
  });

  it("re-registers under a live signal across a StrictMode remount", async () => {
    installModelContext();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Rejects when aborted, as a real client would when the StrictMode
    // teardown cancels the first in-flight registration.
    const register = vi.fn<RegisterTools<NoDeps>>(
      (_ctx, _latest, signal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    renderHook(() => useWebMcpTools({}, register, "k"), { wrapper: StrictMode });

    await vi.waitFor(() => expect(register).toHaveBeenCalledTimes(2));
    expect(register.mock.calls[0][2].aborted).toBe(true);
    expect(register.mock.calls[1][2].aborted).toBe(false);
    // The discarded first pass receives an already-aborted signal, so it never
    // settles; the teardown case below proves the abort guard itself.
    warn.mockRestore();
  });

  it("registers nothing without document.modelContext", () => {
    const register = vi.fn<RegisterTools<NoDeps>>(async () => {});
    renderHook(() => useWebMcpTools({}, register, "k"));
    expect(register).not.toHaveBeenCalled();
  });

  it("registers nothing when modelContext cannot register tools", () => {
    Object.defineProperty(document, "modelContext", {
      configurable: true,
      value: {} as unknown as ModelContext,
    });
    const register = vi.fn<RegisterTools<NoDeps>>(async () => {});
    renderHook(() => useWebMcpTools({}, register, "k"));
    expect(register).not.toHaveBeenCalled();
  });

  it("swallows a rejected registration", async () => {
    installModelContext();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // A sentinel distinct from the warning's own wording, so the assertion
    // proves the rejection's detail never reaches the log.
    const register = vi.fn<RegisterTools<NoDeps>>(async () => {
      throw new Error("taxpayer-detail-must-not-leak");
    });
    renderHook(() => useWebMcpTools({}, register, "k"));
    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(String(warn.mock.calls[0][0])).not.toContain(
      "taxpayer-detail-must-not-leak",
    );
    warn.mockRestore();
  });

  it("survives a synchronous throw and still cleans up", async () => {
    installModelContext();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const register = vi.fn<RegisterTools<NoDeps>>(() => {
      throw new Error("thrown-before-any-await");
    });

    // Rendering must not surface the throw: it is caught by the promise chain.
    const { unmount } = renderHook(() => useWebMcpTools({}, register, "k"));
    await vi.waitFor(() => expect(warn).toHaveBeenCalledTimes(1));
    expect(String(warn.mock.calls[0][0])).not.toContain(
      "thrown-before-any-await",
    );

    // The cleanup still ran, so unmounting aborts rather than crashing.
    expect(() => unmount()).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(1);
    warn.mockRestore();
  });

  it("does not warn when our own teardown aborts an in-flight registration", async () => {
    installModelContext();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    // Rejects only once the hook's cleanup aborts it, as a real client would.
    const register = vi.fn<RegisterTools<NoDeps>>(
      (_ctx, _latest, signal) =>
        new Promise<void>((_resolve, reject) => {
          signal.addEventListener("abort", () => reject(new Error("aborted")));
        }),
    );

    const { unmount } = renderHook(() => useWebMcpTools({}, register, "k"));
    await vi.waitFor(() => expect(register).toHaveBeenCalledTimes(1));
    unmount();
    await vi.waitFor(() => expect(register.mock.calls[0][2].aborted).toBe(true));
    await Promise.resolve();
    expect(warn).not.toHaveBeenCalled();
    warn.mockRestore();
  });
});
