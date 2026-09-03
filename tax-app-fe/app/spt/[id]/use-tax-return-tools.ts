"use client";

// React adapter for the WebMCP slice tools. Registers once per active return
// and feeds the tool layer through refs, so the tools always read the latest
// committed state without re-registering on every keystroke. Browsers without
// `document.modelContext` register nothing and keep the manual form as-is.

import { useEffect, useRef } from "react";
import { applyFilingProfile } from "../../_lib/filing-profile";
import type { SptData, SptReturn } from "../../_lib/spt";
import { registerTaxReturnTools } from "../../_lib/webmcp-tax-tools";

export interface UseTaxReturnToolsInput {
  spt: SptReturn;
  data: SptData;
  persistSptData(nextData: SptData): Promise<SptReturn>;
  showIndukPtkpUpdate(saved: SptReturn): void;
}

export function useTaxReturnTools(input: UseTaxReturnToolsInput): void {
  const latest = useRef(input);
  // Refresh after every commit so tool callbacks see the newest state.
  useEffect(() => {
    latest.current = input;
  });

  const returnId = input.spt.id;
  useEffect(() => {
    if (typeof document === "undefined") return;
    const modelContext = document.modelContext;
    if (!modelContext || typeof modelContext.registerTool !== "function") return;

    const controller = new AbortController();
    registerTaxReturnTools(
      modelContext,
      {
        getCurrentReturn: () => latest.current.spt,
        saveProfile: (profile) =>
          latest.current.persistSptData(
            applyFilingProfile(latest.current.data, profile),
          ),
        revealProfileUpdate: (saved) => latest.current.showIndukPtkpUpdate(saved),
      },
      controller.signal,
    ).catch(() => {
      if (process.env.NODE_ENV !== "production") {
        console.warn("WebMCP tool registration was rejected; manual form remains available.");
      }
    });

    // Abort removes both registrations on unmount, navigation, or dev remount.
    return () => controller.abort();
  }, [returnId]);
}
