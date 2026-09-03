// Confirmed taxpayer-profile facts and the deterministic PTKP mapping.
// Pure, client-safe module: no React, no network, no DOM.

import type { SptData, SptReturn, SptStatus } from "./spt";

export type MaritalStatus = "unmarried" | "married";
export type DependentCount = 0 | 1 | 2 | 3;

/** Facts the taxpayer has explicitly confirmed. Their presence on `SptData`
 *  is the evidence that `identity.ptkp` is no longer a provisional default. */
export interface FilingProfile {
  maritalStatus: MaritalStatus;
  dependentCount: DependentCount;
}

export const MARITAL_STATUSES: readonly MaritalStatus[] = [
  "unmarried",
  "married",
];
export const DEPENDENT_COUNTS: readonly DependentCount[] = [0, 1, 2, 3];

export type ProfileField = "maritalStatus" | "dependentCount";

export interface TaxReturnContext {
  returnId: string;
  taxYear: number;
  formType: string;
  status: SptStatus;
  editable: boolean;
  taxpayerProfile: FilingProfile | null;
  currentPtkpCode: string;
  profileConfirmed: boolean;
  missingFields: ProfileField[];
  suggestedQuestion: { id: string; en: string } | null;
}

export const PROFILE_QUESTION = {
  id: "taxpayer_profile",
  en: "Were you married at the end of the tax year, and how many eligible dependants did you support (from zero to three)?",
} as const;

const DEFAULT_PTKP = "TK/0";

export function isMaritalStatus(value: unknown): value is MaritalStatus {
  return (MARITAL_STATUSES as readonly unknown[]).includes(value);
}

export function isDependentCount(value: unknown): value is DependentCount {
  return (DEPENDENT_COUNTS as readonly unknown[]).includes(value);
}

/** Structural check used both for tool input and for stored JSON. */
export function isFilingProfile(value: unknown): value is FilingProfile {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return isMaritalStatus(v.maritalStatus) && isDependentCount(v.dependentCount);
}

export function isEditableStatus(status: SptStatus): boolean {
  return status === "DRAFT" || status === "REJECTED";
}

/** unmarried → TK/n, married → K/n. */
export function derivePtkpCode(profile: FilingProfile): string {
  const prefix = profile.maritalStatus === "married" ? "K" : "TK";
  return `${prefix}/${profile.dependentCount}`;
}

/** Inverse of `derivePtkpCode` for manual selector edits. Returns null for
 *  anything outside the eight supported codes. */
export function filingProfileFromPtkp(code: string): FilingProfile | null {
  const m = /^(TK|K)\/([0-3])$/.exec(code);
  if (!m) return null;
  return {
    maritalStatus: m[1] === "K" ? "married" : "unmarried",
    dependentCount: Number(m[2]) as DependentCount,
  };
}

/** Returns a new `SptData` with the confirmed facts and the derived PTKP.
 *  Never mutates `data`; every unrelated field is carried over as-is. */
export function applyFilingProfile(
  data: SptData,
  profile: FilingProfile,
): SptData {
  return {
    ...data,
    filingProfile: {
      maritalStatus: profile.maritalStatus,
      dependentCount: profile.dependentCount,
    },
    identity: { ...data.identity, ptkp: derivePtkpCode(profile) },
  };
}

/** The minimum context the assistant needs for this slice. Deliberately
 *  omits NIK, NPWP, names, income, credits, assets, debts, and family rows. */
export function buildTaxReturnContext(spt: SptReturn): TaxReturnContext {
  const data = spt.data ?? {};
  const stored = data.filingProfile;
  const profile: FilingProfile | null = isFilingProfile(stored)
    ? { maritalStatus: stored.maritalStatus, dependentCount: stored.dependentCount }
    : null;
  const confirmed = profile !== null;
  return {
    returnId: spt.id,
    taxYear: spt.tax_year,
    formType: spt.form_type,
    status: spt.status,
    editable: isEditableStatus(spt.status),
    taxpayerProfile: profile,
    currentPtkpCode: data.identity?.ptkp ?? DEFAULT_PTKP,
    profileConfirmed: confirmed,
    missingFields: confirmed ? [] : ["maritalStatus", "dependentCount"],
    suggestedQuestion: confirmed ? null : { ...PROFILE_QUESTION },
  };
}
