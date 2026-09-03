// WebMCP tools for the taxpayer dashboard: list, open, create. Pure and
// framework-free; the page supplies live state, creation, and navigation
// through `DashboardToolDependencies`. Results carry return ids, years,
// statuses, and the profile flag only. Never logs or returns taxpayer data.

import { isEditableStatus, isFilingProfile } from "./filing-profile";
import { SptSaveError } from "./spt-api";
import {
  isSupportedTaxYear,
  SUPPORTED_FORM_TYPE,
  SUPPORTED_TAX_YEARS,
  type SptReturn,
  type SptStatus,
  type SupportedTaxYear,
} from "./spt";
import {
  DASHBOARD_TOOL_NAMES,
  failure,
  FORM_NEXT_STEP,
  registerAll,
  type ModelContext,
  type NextStep,
  type ToolFailure,
  type WebMcpTool,
} from "./webmcp";

export { DASHBOARD_TOOL_NAMES };
export const LIST_TAX_RETURNS_TOOL = DASHBOARD_TOOL_NAMES[0];
export const OPEN_TAX_RETURN_TOOL = DASHBOARD_TOOL_NAMES[1];
export const CREATE_TAX_RETURN_TOOL = DASHBOARD_TOOL_NAMES[2];

export const LIST_TAX_RETURNS_DESCRIPTION =
  "List the signed-in taxpayer's Indonesian individual tax returns with their year, status, whether they can still be edited, and whether the taxpayer profile has been confirmed. Use this to find which return to open. This tool does not modify anything.";

export const OPEN_TAX_RETURN_DESCRIPTION =
  "Open one of the taxpayer's returns so it becomes the active return. Use the returnId from list_tax_returns. The page navigates to the return and the tools get_tax_return_context and update_taxpayer_profile become available. This tool does not modify the return.";

export const CREATE_TAX_RETURN_DESCRIPTION =
  "Create a new 1770 S draft return for the given tax year and open it. Only use this when list_tax_returns shows no return for that year; if one exists, open it instead. The website refuses a year that already has a return. This creates a draft but never submits it.";

export const LIST_TAX_RETURNS_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export const OPEN_TAX_RETURN_INPUT_SCHEMA = {
  type: "object",
  properties: {
    returnId: {
      type: "string",
      description: "The returnId of a return listed by list_tax_returns.",
    },
  },
  required: ["returnId"],
  additionalProperties: false,
} as const;

export const CREATE_TAX_RETURN_INPUT_SCHEMA = {
  type: "object",
  properties: {
    taxYear: {
      type: "integer",
      enum: [...SUPPORTED_TAX_YEARS],
      description: "The tax year the user wants to file, as stated by the user.",
    },
  },
  required: ["taxYear"],
  additionalProperties: false,
} as const;

export type DashboardToolErrorCode =
  | "RETURN_NOT_FOUND"
  | "INVALID_INPUT"
  | "INVALID_TAX_YEAR"
  | "RETURN_ALREADY_EXISTS"
  | "CREATE_FAILED"
  | "NAVIGATION_FAILED";

export type DashboardToolFailure = ToolFailure<DashboardToolErrorCode>;

export interface TaxReturnSummary {
  returnId: string;
  taxYear: number;
  formType: string;
  status: SptStatus;
  editable: boolean;
  profileConfirmed: boolean;
}

export interface ListTaxReturnsResult {
  ok: true;
  returns: TaxReturnSummary[];
  nextStep: NextStep;
}

export interface OpenTaxReturnResult {
  ok: true;
  opened: TaxReturnSummary;
  message: string;
  nextStep: NextStep;
}

export interface CreateTaxReturnResult {
  ok: true;
  created: TaxReturnSummary;
  message: string;
  nextStep: NextStep;
}

/** Tool calls are not cancellable: the execute-time abort signal is not
 *  forwarded to these methods, so an aborted call may still create a draft. */
export interface DashboardToolDependencies {
  /** Latest return list as currently held by the dashboard. */
  getReturns(): SptReturn[];
  /** POST a 1770 S draft, add the canonical response to page state, and
   *  resolve with it. Must reject on any failure. */
  createDraft(taxYear: SupportedTaxYear): Promise<SptReturn>;
  /** Navigate to `/spt/{returnId}` the same way the manual button does.
   *  Must be synchronous; a returned promise would be ignored. */
  openReturn(returnId: string): void;
}

export function summarizeReturn(r: SptReturn): TaxReturnSummary {
  return {
    returnId: r.id,
    taxYear: r.tax_year,
    formType: r.form_type,
    status: r.status,
    editable: isEditableStatus(r.status),
    profileConfirmed: isFilingProfile(r.data?.filingProfile),
  };
}

function findByYear(returns: SptReturn[], taxYear: number): SptReturn | undefined {
  return returns.find((r) => r.tax_year === taxYear);
}

const NAVIGATION_FAILED_MESSAGE =
  "The page could not navigate. Ask the user to open the return from the dashboard manually.";

export async function executeListTaxReturns(
  deps: DashboardToolDependencies,
): Promise<ListTaxReturnsResult> {
  const returns = deps.getReturns();
  const anyEditable = returns.some((r) => isEditableStatus(r.status));
  return {
    ok: true,
    returns: returns.map(summarizeReturn),
    nextStep: {
      page: "dashboard",
      tools: [OPEN_TAX_RETURN_TOOL, CREATE_TAX_RETURN_TOOL],
      hint: anyEditable
        ? "Open an editable return with open_tax_return."
        : "No editable return exists; create one with create_tax_return.",
    },
  };
}

const INVALID_OPEN_INPUT_MESSAGE =
  "Pass exactly { returnId } with a non-empty string and no other properties.";

/** Exactly `{ returnId: string }` with a non-empty string, or null. Does not
 *  check whether the id names a listed return — that is a separate lookup
 *  so shape failures can be told apart from an unknown but well-formed id. */
export function parseOpenInput(input: unknown): string | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== 1 || keys[0] !== "returnId") return null;
  const { returnId } = input as Record<string, unknown>;
  if (typeof returnId !== "string" || !returnId) return null;
  return returnId;
}

export async function executeOpenTaxReturn(
  deps: DashboardToolDependencies,
  input: unknown,
): Promise<OpenTaxReturnResult | DashboardToolFailure> {
  const returnId = parseOpenInput(input);
  if (returnId === null) {
    return failure("INVALID_INPUT", INVALID_OPEN_INPUT_MESSAGE);
  }
  const target = deps.getReturns().find((r) => r.id === returnId) ?? null;
  if (!target) {
    return failure(
      "RETURN_NOT_FOUND",
      "No listed return has that returnId. Call list_tax_returns and use one of its returnId values.",
    );
  }
  try {
    deps.openReturn(target.id);
  } catch {
    return failure("NAVIGATION_FAILED", NAVIGATION_FAILED_MESSAGE);
  }
  return {
    ok: true,
    opened: summarizeReturn(target),
    message: `Opening the ${target.tax_year} ${target.form_type} return.`,
    nextStep: FORM_NEXT_STEP,
  };
}

/** Exactly `{ taxYear }` with a supported integer year, or null. */
export function parseCreateInput(input: unknown): SupportedTaxYear | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const keys = Object.keys(input);
  if (keys.length !== 1 || keys[0] !== "taxYear") return null;
  const { taxYear } = input as Record<string, unknown>;
  if (typeof taxYear !== "number" || !Number.isInteger(taxYear)) return null;
  return isSupportedTaxYear(taxYear) ? taxYear : null;
}

export async function executeCreateTaxReturn(
  deps: DashboardToolDependencies,
  input: unknown,
): Promise<CreateTaxReturnResult | DashboardToolFailure> {
  const taxYear = parseCreateInput(input);
  if (taxYear === null) {
    return failure(
      "INVALID_TAX_YEAR",
      `taxYear must be one of ${SUPPORTED_TAX_YEARS.join(", ")} with no other properties. Ask the user rather than guessing.`,
    );
  }

  const existing = findByYear(deps.getReturns(), taxYear);
  if (existing) {
    return failure(
      "RETURN_ALREADY_EXISTS",
      isEditableStatus(existing.status)
        ? `An editable ${taxYear} return already exists. Open it with open_tax_return instead of creating another.`
        : `A ${taxYear} return already exists with status ${existing.status} and can no longer be edited; this demonstration does not support a second return for the same year. Open it with open_tax_return to view it.`,
      existing.id,
    );
  }

  let created: SptReturn;
  try {
    created = await deps.createDraft(taxYear);
  } catch (e) {
    if (e instanceof SptSaveError && e.status === 409) {
      return failure(
        "RETURN_ALREADY_EXISTS",
        "The website reports a return already exists for that year. Call list_tax_returns to find it, then open it with open_tax_return.",
      );
    }
    return failure(
      "CREATE_FAILED",
      "The website could not confirm that the draft was created. Call list_tax_returns before trying again.",
    );
  }

  try {
    deps.openReturn(created.id);
  } catch {
    return failure(
      "NAVIGATION_FAILED",
      `The ${taxYear} draft was created but the page could not navigate. Call open_tax_return with the existingReturnId.`,
      created.id,
    );
  }

  return {
    ok: true,
    created: summarizeReturn(created),
    message: `Created a ${taxYear} ${SUPPORTED_FORM_TYPE} draft and opening it.`,
    nextStep: FORM_NEXT_STEP,
  };
}

/** Exactly the three dashboard tools. No delete, declaration, or submission tool exists. */
export function buildDashboardTools(deps: DashboardToolDependencies): WebMcpTool[] {
  return [
    {
      name: LIST_TAX_RETURNS_TOOL,
      description: LIST_TAX_RETURNS_DESCRIPTION,
      inputSchema: LIST_TAX_RETURNS_INPUT_SCHEMA,
      annotations: { readOnlyHint: true },
      execute: () => executeListTaxReturns(deps),
    },
    {
      name: OPEN_TAX_RETURN_TOOL,
      description: OPEN_TAX_RETURN_DESCRIPTION,
      inputSchema: OPEN_TAX_RETURN_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeOpenTaxReturn(deps, input),
    },
    {
      name: CREATE_TAX_RETURN_TOOL,
      description: CREATE_TAX_RETURN_DESCRIPTION,
      inputSchema: CREATE_TAX_RETURN_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeCreateTaxReturn(deps, input),
    },
  ];
}

export async function registerDashboardTools(
  modelContext: ModelContext,
  deps: DashboardToolDependencies,
  signal: AbortSignal,
): Promise<void> {
  await registerAll(modelContext, buildDashboardTools(deps), signal);
}
