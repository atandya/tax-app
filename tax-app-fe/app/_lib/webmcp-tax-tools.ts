// WebMCP tool contracts for the taxpayer-profile vertical slice.
// Framework-free: the SPT detail page supplies live state and persistence
// through `TaxToolDependencies`; this module owns names, descriptions,
// schemas, validation, and structured results. It never logs arguments,
// taxpayer data, or backend responses.

import {
  buildTaxReturnContext,
  derivePtkpCode,
  isDependentCount,
  isEditableStatus,
  isFilingProfile,
  isMaritalStatus,
  type DependentCount,
  type FilingProfile,
  type MaritalStatus,
  type TaxReturnContext,
} from "./filing-profile";
import type { SptReturn } from "./spt";
import {
  failure,
  FORM_TOOL_NAMES,
  registerAll,
  type ModelContext,
  type NextStep,
  type ToolFailure,
  type WebMcpTool,
} from "./webmcp";

export type TaxTool = WebMcpTool;
export type TaxModelContext = ModelContext;

export const GET_TAX_RETURN_CONTEXT_TOOL = FORM_TOOL_NAMES[0];
export const UPDATE_TAXPAYER_PROFILE_TOOL = FORM_TOOL_NAMES[1];
export const TAX_TOOL_NAMES = FORM_TOOL_NAMES;

export const FORM_STAY_NEXT_STEP = {
  page: "tax_return",
  tools: FORM_TOOL_NAMES,
  hint: "Ask the user only for the missing facts, then save them with update_taxpayer_profile.",
} as const satisfies NextStep;

export const FORM_DONE_NEXT_STEP = {
  page: "tax_return",
  tools: FORM_TOOL_NAMES,
  hint: "The taxpayer profile is saved. Ask the user to review the remaining sections and submit the return themselves; no tool can declare or submit it.",
} as const satisfies NextStep;

export const GET_TAX_RETURN_CONTEXT_DESCRIPTION =
  "Read the active Indonesian individual tax return's filing status and the minimum missing taxpayer-profile facts. Use this before asking the user for information. This tool does not submit or modify the return.";

export const UPDATE_TAXPAYER_PROFILE_DESCRIPTION =
  "Save marital status and eligible dependant count confirmed by the user for the active Indonesian individual tax return. The website derives the PTKP code. Never guess either value. This modifies the visible draft but does not submit it.";

export const GET_TAX_RETURN_CONTEXT_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export const UPDATE_TAXPAYER_PROFILE_INPUT_SCHEMA = {
  type: "object",
  properties: {
    maritalStatus: {
      type: "string",
      enum: ["unmarried", "married"],
      description:
        "Marital status at the end of the tax year, exactly as stated by the user.",
    },
    dependentCount: {
      type: "integer",
      minimum: 0,
      maximum: 3,
      description:
        "Number of eligible dependants the user says they supported, from 0 to 3.",
    },
  },
  required: ["maritalStatus", "dependentCount"],
  additionalProperties: false,
} as const;

export type TaxToolErrorCode =
  | "RETURN_NOT_EDITABLE"
  | "SAVE_FAILED"
  | "INVALID_PROFILE";

export type TaxToolFailure = ToolFailure<TaxToolErrorCode>;

export interface GetTaxReturnContextResult {
  ok: true;
  context: TaxReturnContext;
  nextStep: NextStep;
}

export interface UpdateTaxpayerProfileResult {
  ok: true;
  changed: {
    section: "taxpayerProfile";
    maritalStatus: MaritalStatus;
    dependentCount: DependentCount;
    ptkpCode: string;
  };
  message: string;
  context: TaxReturnContext;
  nextStep: NextStep;
}

export interface TaxToolDependencies {
  /** Latest canonical return as currently held by the page. */
  getCurrentReturn(): SptReturn;
  /** Apply the confirmed facts to the latest data, persist through the
   *  authenticated API, adopt the response, and resolve with it. Must reject
   *  on any failure and leave the previous canonical state in place. */
  saveProfile(profile: FilingProfile): Promise<SptReturn>;
  /** Presentation-only: show the Induk PTKP row and a saved-by-assistant notice. */
  revealProfileUpdate(saved: SptReturn): void;
}

const INVALID_PROFILE_MESSAGE =
  "maritalStatus must be \"unmarried\" or \"married\" and dependentCount must be an integer from 0 to 3, with no other properties. Ask the user rather than guessing.";

const SAVE_FAILED_MESSAGE =
  "The website could not save the taxpayer profile. The previously saved values were kept. Ask the user to try again.";

/** Application-side re-validation of tool input. Mirrors the JSON schema:
 *  exactly the two required keys, enum marital status, integer 0–3. */
export function parseProfileInput(input: unknown): FilingProfile | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }
  const keys = Object.keys(input);
  if (keys.length !== 2) return null;
  if (!keys.includes("maritalStatus") || !keys.includes("dependentCount")) {
    return null;
  }
  const { maritalStatus, dependentCount } = input as Record<string, unknown>;
  if (!isMaritalStatus(maritalStatus)) return null;
  if (typeof dependentCount !== "number" || !Number.isInteger(dependentCount)) {
    return null;
  }
  if (!isDependentCount(dependentCount)) return null;
  return { maritalStatus, dependentCount };
}

export async function executeGetTaxReturnContext(
  deps: TaxToolDependencies,
): Promise<GetTaxReturnContextResult> {
  const context = buildTaxReturnContext(deps.getCurrentReturn());
  return {
    ok: true,
    context,
    nextStep: context.profileConfirmed ? FORM_DONE_NEXT_STEP : FORM_STAY_NEXT_STEP,
  };
}

export async function executeUpdateTaxpayerProfile(
  deps: TaxToolDependencies,
  input: unknown,
): Promise<UpdateTaxpayerProfileResult | TaxToolFailure> {
  const profile = parseProfileInput(input);
  if (!profile) return failure("INVALID_PROFILE", INVALID_PROFILE_MESSAGE);

  const current = deps.getCurrentReturn();
  if (!isEditableStatus(current.status)) {
    return failure(
      "RETURN_NOT_EDITABLE",
      `This return has status ${current.status} and can no longer be edited.`,
    );
  }

  let saved: SptReturn;
  try {
    saved = await deps.saveProfile(profile);
  } catch {
    return failure("SAVE_FAILED", SAVE_FAILED_MESSAGE);
  }

  try {
    deps.revealProfileUpdate(saved);
  } catch {
    // Presentation failures must not turn a persisted save into an error.
  }

  // Report from the canonical saved return, falling back to the validated
  // input only if the backend echoed an unexpected shape.
  const storedProfile = saved.data?.filingProfile;
  const confirmed = isFilingProfile(storedProfile) ? storedProfile : profile;
  const ptkpCode = saved.data?.identity?.ptkp ?? derivePtkpCode(confirmed);

  return {
    ok: true,
    changed: {
      section: "taxpayerProfile",
      maritalStatus: confirmed.maritalStatus,
      dependentCount: confirmed.dependentCount,
      ptkpCode,
    },
    message: `Saved the confirmed taxpayer profile and updated PTKP to ${ptkpCode}.`,
    context: buildTaxReturnContext(saved),
    nextStep: FORM_DONE_NEXT_STEP,
  };
}

/** Exactly the two slice tools. No declaration or submission tool exists. */
export function buildTaxReturnTools(deps: TaxToolDependencies): TaxTool[] {
  return [
    {
      name: GET_TAX_RETURN_CONTEXT_TOOL,
      description: GET_TAX_RETURN_CONTEXT_DESCRIPTION,
      inputSchema: GET_TAX_RETURN_CONTEXT_INPUT_SCHEMA,
      annotations: { readOnlyHint: true },
      execute: () => executeGetTaxReturnContext(deps),
    },
    {
      name: UPDATE_TAXPAYER_PROFILE_TOOL,
      description: UPDATE_TAXPAYER_PROFILE_DESCRIPTION,
      inputSchema: UPDATE_TAXPAYER_PROFILE_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeUpdateTaxpayerProfile(deps, input),
    },
  ];
}

/** Register both tools against one abort signal so a single `abort()`
 *  removes every registration on unmount or navigation. */
export async function registerTaxReturnTools(
  modelContext: TaxModelContext,
  dependencies: TaxToolDependencies,
  signal: AbortSignal,
): Promise<void> {
  await registerAll(modelContext, buildTaxReturnTools(dependencies), signal);
}
