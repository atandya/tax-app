"use client";

// Generic WebMCP registration for one page. Holds the page's dependencies in
// a ref so tool callbacks always read the latest committed state without
// re-registering on every render; registers once per `key` under one
// AbortController and aborts on unmount, navigation, or dev remount.
// Browsers without `document.modelContext` register nothing.

import { useEffect, useRef } from "react";
import type { ModelContext } from "./webmcp";

/** Registers a page's tools under `signal`. Implementations must tolerate a
 *  signal that is already aborted (a discarded StrictMode pass) and should
 *  reject, not throw, when the client refuses a registration. */
export type RegisterTools<Deps> = (
  modelContext: ModelContext,
  latest: () => Deps,
  signal: AbortSignal,
) => Promise<void>;

export function useWebMcpTools<Deps>(
  deps: Deps,
  register: RegisterTools<Deps>,
  key: string,
): void {
  const latestDeps = useRef(deps);
  const latestRegister = useRef(register);
  // Refresh after every commit so callbacks see the newest state.
  useEffect(() => {
    latestDeps.current = deps;
    latestRegister.current = register;
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const modelContext = document.modelContext;
    if (!modelContext || typeof modelContext.registerTool !== "function") return;

    const controller = new AbortController();
    // Called inside the promise chain so a synchronous throw becomes a
    // rejection instead of escaping the effect and skipping the cleanup.
    Promise.resolve()
      .then(() =>
        latestRegister.current(
          modelContext,
          () => latestDeps.current,
          controller.signal,
        ),
      )
      .catch(() => {
        // Our own teardown aborted the in-flight registration: expected on
        // unmount, navigation, and every StrictMode remount. Not a failure.
        if (controller.signal.aborted) return;
        if (process.env.NODE_ENV !== "production") {
          console.warn(
            "WebMCP tool registration was rejected; the manual page remains available.",
          );
        }
      });

    return () => controller.abort();
  }, [key]);
}
