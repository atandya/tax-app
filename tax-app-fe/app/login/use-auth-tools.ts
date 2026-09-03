"use client";

// Registers `sign_in_demo` on the login page only when the build enabled it.
// The tool signs in the synthetic demo taxpayer through the flag-gated
// backend endpoint and then navigates exactly like the manual login button.

import { postDemoLogin } from "../_lib/auth-api";
import { navigateForAgent, type AgentRouter } from "../_lib/navigation";
import { useWebMcpTools } from "../_lib/use-webmcp-tools";
import { registerAuthTools } from "../_lib/webmcp-auth-tools";

/** Build-time switch: NEXT_PUBLIC_DEMO_LOGIN_ENABLED=true */
const DEMO_LOGIN_TOOL_ENABLED =
  process.env.NEXT_PUBLIC_DEMO_LOGIN_ENABLED === "true";

export function useAuthTools(router: AgentRouter): void {
  useWebMcpTools(
    { router },
    (modelContext, latest, signal) => {
      if (!DEMO_LOGIN_TOOL_ENABLED) return Promise.resolve();
      return registerAuthTools(
        modelContext,
        {
          signInDemo: () => postDemoLogin(),
          goToDashboard: () => navigateForAgent(latest().router, "/spt"),
        },
        signal,
      );
    },
    "login",
  );
}
