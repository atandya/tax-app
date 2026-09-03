"use client";

// React adapter for the dashboard WebMCP tools. Supplies the latest return
// list, the shared draft-creation request, and agent navigation. Takes the
// router as a parameter, like the login page's hook, so it stays testable.

import { navigateForAgent, type AgentRouter } from "../_lib/navigation";
import type { SptReturn, SupportedTaxYear } from "../_lib/spt";
import { useWebMcpTools } from "../_lib/use-webmcp-tools";
import { registerDashboardTools } from "../_lib/webmcp-dashboard-tools";

export interface UseDashboardToolsInput {
  router: AgentRouter;
  returns: SptReturn[];
  /** POST the draft, add it to page state, resolve with the canonical row. */
  createDraftForAgent(taxYear: SupportedTaxYear): Promise<SptReturn>;
}

export function useDashboardTools(input: UseDashboardToolsInput): void {
  useWebMcpTools(
    input,
    (modelContext, latest, signal) =>
      registerDashboardTools(
        modelContext,
        {
          getReturns: () => latest().returns,
          createDraft: (taxYear) => latest().createDraftForAgent(taxYear),
          openReturn: (id) => navigateForAgent(latest().router, `/spt/${encodeURIComponent(id)}`),
        },
        signal,
      ),
    "dashboard",
  );
}
