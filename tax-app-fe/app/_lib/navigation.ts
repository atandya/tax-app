// One place where agent tools change the page. `soft` matches the login
// button's push-then-refresh (client-side routing). `hard` forces a full
// load for clients that do not refresh their tool list on a client-side
// route change.
//
// The unconditional `refresh()` after `push()` in soft mode is deliberate:
// `router.refresh()` refreshes the current route's server components, which
// is needed after sign-in so they re-read the new session cookie — it does
// not re-fetch the destination. Other navigations pay a small extra
// round-trip for this, which is accepted in exchange for one uniform
// behaviour.
//
// Failure contract: this helper is best-effort and does not catch or
// swallow anything. Any exception it throws — including the local-href
// guard below — or that `push`/`refresh`/`assign` throw propagates
// unchanged to the caller. Tool callers are expected to catch it and map
// it to their own NAVIGATION_FAILED result.

export type NavigationMode = "soft" | "hard";

export interface AgentRouter {
  push(href: string): void;
  refresh(): void;
}

export function resolveNavigationMode(raw: string | undefined): NavigationMode {
  return raw === "hard" ? "hard" : "soft";
}

/** Build-time switch: NEXT_PUBLIC_WEBMCP_NAVIGATION=hard */
export const WEBMCP_NAVIGATION_MODE: NavigationMode = resolveNavigationMode(
  process.env.NEXT_PUBLIC_WEBMCP_NAVIGATION,
);

function isLocalHref(href: string): boolean {
  if (!href.startsWith("/")) return false;
  try {
    return new URL(href, "http://local.invalid").origin === "http://local.invalid";
  } catch {
    return false;
  }
}

export function navigateForAgent(
  router: AgentRouter,
  href: string,
  options: { mode?: NavigationMode; assign?: (href: string) => void } = {},
): void {
  if (!isLocalHref(href)) {
    throw new Error("navigateForAgent: refusing non-local href");
  }
  const mode = options.mode ?? WEBMCP_NAVIGATION_MODE;
  if (mode === "hard") {
    const assign = options.assign ?? ((h: string) => window.location.assign(h));
    assign(href);
    return;
  }
  router.push(href);
  router.refresh();
}
