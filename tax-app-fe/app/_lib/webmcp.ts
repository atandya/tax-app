/// <reference types="webmcp-types" />
// Shared WebMCP vocabulary for every page that registers tools.
// Pure and framework-free: no React, no network, no DOM writes.

export type ModelContext = NonNullable<Document["modelContext"]>;
export type WebMcpTool = WebMCP.ModelContextTool;

/** Pages of the demonstration journey, used in `nextStep` hints. */
export type JourneyPage = "dashboard" | "tax_return";

export interface NextStep {
  page: JourneyPage;
  tools: readonly string[];
  hint: string;
}

export interface ToolFailure<Code extends string = string> {
  ok: false;
  /** `existingReturnId` is set only by create_tax_return (RETURN_ALREADY_EXISTS
   *  and post-create NAVIGATION_FAILED); other tools never populate it. */
  error: { code: Code; message: string; existingReturnId?: string };
}

/** Canonical definitions of the journey's tool names. The owning modules
 *  re-export these (e.g. `TAX_TOOL_NAMES` in webmcp-tax-tools.ts) so the
 *  names are defined once, and `nextStep` hints reference them to tell the
 *  agent what becomes available after navigation. */
export const FORM_TOOL_NAMES = [
  "get_tax_return_context",
  "update_taxpayer_profile",
] as const;

export const DASHBOARD_TOOL_NAMES = [
  "list_tax_returns",
  "open_tax_return",
  "create_tax_return",
] as const;

export const FORM_NEXT_STEP = {
  page: "tax_return",
  tools: FORM_TOOL_NAMES,
  hint: "Call get_tax_return_context first, then ask the user only for the missing facts.",
} as const satisfies NextStep;

export function failure<Code extends string>(
  code: Code,
  message: string,
  existingReturnId?: string,
): ToolFailure<Code> {
  return existingReturnId === undefined
    ? { ok: false, error: { code, message } }
    : { ok: false, error: { code, message, existingReturnId } };
}

/** Register every tool under one abort signal so a single `abort()` removes
 *  all of them on unmount or navigation. */
export async function registerAll(
  modelContext: ModelContext,
  tools: readonly WebMcpTool[],
  signal: AbortSignal,
): Promise<void> {
  for (const tool of tools) {
    if (signal.aborted) return;
    await modelContext.registerTool(tool, { signal });
  }
}
