"use client";

// React adapter for the form-page WebMCP tools. Thin wrapper over the shared
// hook: supplies the latest return, data, persistence, and reveal callback.

import { applyFilingProfile } from "../../_lib/filing-profile";
import type { SptData, SptReturn } from "../../_lib/spt";
import { useWebMcpTools } from "../../_lib/use-webmcp-tools";
import { registerTaxReturnTools } from "../../_lib/webmcp-tax-tools";

export interface UseTaxReturnToolsInput {
  spt: SptReturn;
  data: SptData;
  persistSptData(nextData: SptData): Promise<SptReturn>;
  showIndukPtkpUpdate(saved: SptReturn): void;
}

export function useTaxReturnTools(input: UseTaxReturnToolsInput): void {
  useWebMcpTools(
    input,
    (modelContext, latest, signal) =>
      registerTaxReturnTools(
        modelContext,
        {
          getCurrentReturn: () => latest().spt,
          saveProfile: (profile) =>
            latest().persistSptData(applyFilingProfile(latest().data, profile)),
          revealProfileUpdate: (saved) => latest().showIndukPtkpUpdate(saved),
        },
        signal,
      ),
    input.spt.id,
  );
}
