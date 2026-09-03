import { describe, expect, it, vi } from "vitest";
import { navigateForAgent, resolveNavigationMode } from "./navigation";

describe("resolveNavigationMode", () => {
  it("defaults to soft and accepts only the exact hard value", () => {
    expect(resolveNavigationMode(undefined)).toBe("soft");
    expect(resolveNavigationMode("")).toBe("soft");
    expect(resolveNavigationMode("soft")).toBe("soft");
    expect(resolveNavigationMode("HARD")).toBe("soft");
    expect(resolveNavigationMode("hard")).toBe("hard");
  });
});

describe("navigateForAgent", () => {
  it("soft mode pushes then refreshes the router, in order", () => {
    const calls: string[] = [];
    const router = {
      push: vi.fn(() => calls.push("push")),
      refresh: vi.fn(() => calls.push("refresh")),
    };
    const assign = vi.fn();
    navigateForAgent(router, "/spt/abc", { mode: "soft", assign });
    expect(router.push).toHaveBeenCalledWith("/spt/abc");
    expect(router.refresh).toHaveBeenCalledTimes(1);
    expect(assign).not.toHaveBeenCalled();
    expect(calls).toEqual(["push", "refresh"]);
  });

  it("hard mode performs a full page load", () => {
    const router = { push: vi.fn(), refresh: vi.fn() };
    const assign = vi.fn();
    navigateForAgent(router, "/spt", { mode: "hard", assign });
    expect(assign).toHaveBeenCalledWith("/spt");
    expect(router.push).not.toHaveBeenCalled();
  });

  it("defaults to soft mode: push then refresh with no options", () => {
    const router = { push: vi.fn(), refresh: vi.fn() };
    navigateForAgent(router, "/spt");
    expect(router.push).toHaveBeenCalledWith("/spt");
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  it("hard mode with no assign option falls back to window.location.assign", () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    try {
      const router = { push: vi.fn(), refresh: vi.fn() };
      navigateForAgent(router, "/spt", { mode: "hard" });
      expect(assign).toHaveBeenCalledWith("/spt");
      expect(router.push).not.toHaveBeenCalled();
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it("soft mode navigates normally for a href with query and hash", () => {
    const router = { push: vi.fn(), refresh: vi.fn() };
    navigateForAgent(router, "/spt/abc?taxYear=2025#top", { mode: "soft" });
    expect(router.push).toHaveBeenCalledWith("/spt/abc?taxYear=2025#top");
    expect(router.refresh).toHaveBeenCalledTimes(1);
  });

  describe("non-local href guard", () => {
    const badHrefs = [
      "https://example.test/x",
      "//evil",
      "javascript:alert(1)",
      "/\\evil.test",
      "/\\/evil.test",
      "/\t/evil.test",
      "/\n/evil.test",
    ];

    it.each(badHrefs)("soft mode throws and calls nothing for %s", (href) => {
      const router = { push: vi.fn(), refresh: vi.fn() };
      const assign = vi.fn();
      expect(() => navigateForAgent(router, href, { mode: "soft", assign })).toThrow(
        "navigateForAgent: refusing non-local href",
      );
      expect(router.push).not.toHaveBeenCalled();
      expect(router.refresh).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
    });

    it.each(badHrefs)("hard mode throws and calls nothing for %s", (href) => {
      const router = { push: vi.fn(), refresh: vi.fn() };
      const assign = vi.fn();
      expect(() => navigateForAgent(router, href, { mode: "hard", assign })).toThrow(
        "navigateForAgent: refusing non-local href",
      );
      expect(router.push).not.toHaveBeenCalled();
      expect(router.refresh).not.toHaveBeenCalled();
      expect(assign).not.toHaveBeenCalled();
    });
  });
});
