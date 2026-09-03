"use client";

// React adapter for the form-page WebMCP tools. Thin wrapper over the shared
// hook: supplies the latest return, data, persistence, and reveal callback.

import { applyAssets } from "../../_lib/assets";
import { applyDebts } from "../../_lib/debts";
import { applyFamilyMembers } from "../../_lib/family";
import { applyFilingProfile } from "../../_lib/filing-profile";
import { applyIncomeAndCredits } from "../../_lib/income-and-credits";
import type { SptData, SptReturn } from "../../_lib/spt";
import { useWebMcpTools } from "../../_lib/use-webmcp-tools";
import { applyReturnAnswers } from "../../_lib/return-answers";
import { registerTaxReturnTools } from "../../_lib/webmcp-tax-tools";
import { applyWithholdingSlips } from "../../_lib/withholding-slips";

export interface UseTaxReturnToolsInput {
  spt: SptReturn;
  data: SptData;
  persistSptData(nextData: SptData): Promise<SptReturn>;
  showIndukPtkpUpdate(saved: SptReturn): void;
  showIncomeUpdate(saved: SptReturn): void;
  showAssetsUpdate(saved: SptReturn, added: number): void;
  showFamilyUpdate(saved: SptReturn, added: number): void;
  showDebtsUpdate(saved: SptReturn, added: number): void;
  showWithholdingUpdate(saved: SptReturn, added: number): void;
  showAnswersUpdate(saved: SptReturn, count: number, section: string): void;
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
          saveIncome: (facts) =>
            latest().persistSptData(applyIncomeAndCredits(latest().data, facts)),
          revealIncomeUpdate: (saved) => latest().showIncomeUpdate(saved),
          saveAssets: (input) =>
            latest().persistSptData(applyAssets(latest().data, input)),
          revealAssetsUpdate: (saved, added) => latest().showAssetsUpdate(saved, added),
          saveFamily: (input) =>
            latest().persistSptData(applyFamilyMembers(latest().data, input)),
          revealFamilyUpdate: (saved, added) => latest().showFamilyUpdate(saved, added),
          saveDebts: (input) =>
            latest().persistSptData(applyDebts(latest().data, input)),
          revealDebtsUpdate: (saved, added) => latest().showDebtsUpdate(saved, added),
          saveWithholdingSlips: (input) =>
            latest().persistSptData(applyWithholdingSlips(latest().data, input)),
          revealWithholdingUpdate: (saved, added) =>
            latest().showWithholdingUpdate(saved, added),
          saveAnswers: (input) =>
            latest().persistSptData(applyReturnAnswers(latest().data, input)),
          revealAnswersUpdate: (saved, count, section) =>
            latest().showAnswersUpdate(saved, count, section),
        },
        signal,
      ),
    input.spt.id,
  );
}
