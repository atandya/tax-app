// WebMCP tool for the login page. Hackathon-only: signs in the synthetic
// demo taxpayer through a flag-gated endpoint. Takes no input, never handles
// a credential, and never returns user data.

import { DemoLoginError } from "./auth-api";
import {
  DASHBOARD_TOOL_NAMES,
  failure,
  registerAll,
  type ModelContext,
  type NextStep,
  type ToolFailure,
  type WebMcpTool,
} from "./webmcp";

export const SIGN_IN_DEMO_TOOL = "sign_in_demo";
export const AUTH_TOOL_NAMES = [SIGN_IN_DEMO_TOOL] as const;

export const SIGN_IN_DEMO_DESCRIPTION =
  "Sign in to this demonstration tax-filing site as the synthetic demo taxpayer. No credentials are needed or accepted; the website opens the demo session itself. Use this only when the user asks for help with their tax return and is not yet signed in. After it succeeds, the dashboard tools list_tax_returns, open_tax_return, and create_tax_return become available.";

export const SIGN_IN_DEMO_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export type AuthToolErrorCode =
  | "DEMO_LOGIN_DISABLED"
  | "SIGN_IN_FAILED"
  | "NAVIGATION_FAILED";

export type AuthToolFailure = ToolFailure<AuthToolErrorCode>;

export const DASHBOARD_NEXT_STEP = {
  page: "dashboard",
  tools: DASHBOARD_TOOL_NAMES,
  hint: "Call list_tax_returns to find the return the user wants to work on.",
} as const satisfies NextStep;

export interface SignInDemoResult {
  ok: true;
  signedInAs: "demo_taxpayer";
  message: string;
  nextStep: NextStep;
}

export interface AuthToolDependencies {
  /** POST the demo login through the same-origin proxy; reject on failure. */
  signInDemo(): Promise<void>;
  /** Navigate to the dashboard exactly as the manual login button does.
   *  Must be synchronous: a returned promise would be ignored and a
   *  navigation failure reported as success. */
  goToDashboard(): void;
}

export async function executeSignInDemo(
  deps: AuthToolDependencies,
): Promise<SignInDemoResult | AuthToolFailure> {
  try {
    await deps.signInDemo();
  } catch (e) {
    if (e instanceof DemoLoginError && e.status === 404) {
      return failure(
        "DEMO_LOGIN_DISABLED",
        "Demo sign-in is unavailable on this deployment. Ask the user to sign in manually.",
      );
    }
    return failure(
      "SIGN_IN_FAILED",
      "The website could not open the demo session. Ask the user to try again or sign in manually.",
    );
  }

  try {
    deps.goToDashboard();
  } catch {
    return failure(
      "NAVIGATION_FAILED",
      "Signed in, but the page could not navigate. Ask the user to open /spt manually.",
    );
  }

  return {
    ok: true,
    signedInAs: "demo_taxpayer",
    message: "Signed in as the demonstration taxpayer. Opening the tax return dashboard.",
    nextStep: DASHBOARD_NEXT_STEP,
  };
}

export function buildAuthTools(deps: AuthToolDependencies): WebMcpTool[] {
  return [
    {
      name: SIGN_IN_DEMO_TOOL,
      description: SIGN_IN_DEMO_DESCRIPTION,
      inputSchema: SIGN_IN_DEMO_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: () => executeSignInDemo(deps),
    },
  ];
}

export async function registerAuthTools(
  modelContext: ModelContext,
  deps: AuthToolDependencies,
  signal: AbortSignal,
): Promise<void> {
  await registerAll(modelContext, buildAuthTools(deps), signal);
}
