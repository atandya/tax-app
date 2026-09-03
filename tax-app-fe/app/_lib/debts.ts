// Year-end debt rows saved through the assistant. Pure, client-safe module.
// Rows follow the L-1 part B table: DJP code, description, creditor id and
// name, creditor country, year borrowed, balance, ownership note. Creditor
// identities are stored on the form but never summarised back out.

import {
  HARTA_KETERANGAN,
  NEGARA_OPTIONS,
  UTANG_KODE,
  type DebtRow,
  type SptData,
} from "./spt";

/** English keys the agent uses; values are the exact Coretax code labels. */
export const DEBT_TYPE_KEYS = {
  bank_loan: "101 - Utang bank / lembaga keuangan bukan bank",
  credit_card: "102 - Kartu kredit",
  affiliate_loan: "103 - Utang afiliasi (pihak yang memiliki hubungan istimewa)",
  other: "109 - Utang lainnya",
} as const;
export type DebtTypeKey = keyof typeof DEBT_TYPE_KEYS;

export const DEBT_COUNTRY_KEYS = {
  indonesia: "Indonesia",
  singapore: "Singapura",
  malaysia: "Malaysia",
  hong_kong: "Hong Kong",
  japan: "Jepang",
  australia: "Australia",
  united_states: "Amerika Serikat",
  netherlands: "Belanda",
  other: "Lainnya",
} as const;
export type DebtCountryKey = keyof typeof DEBT_COUNTRY_KEYS;

export const DEBT_OWNERSHIP_KEYS = {
  own: "Milik Sendiri",
  joint: "Harta Bersama",
  undivided_inheritance: "Warisan Belum Terbagi",
  other_party: "Atas Nama Pihak Lain",
  other: "Lainnya",
} as const;
export type DebtOwnershipKey = keyof typeof DEBT_OWNERSHIP_KEYS;

export interface DebtInput {
  type: DebtTypeKey;
  /** Outstanding balance at year end in whole rupiah. */
  balance: number;
  description?: string;
  creditorName?: string;
  creditorTaxId?: string;
  country?: DebtCountryKey;
  year?: number;
  ownership?: DebtOwnershipKey;
}

export interface AddDebtsInput {
  debts: DebtInput[];
  /** true replaces every stored debt row; false (default) appends. */
  replaceExisting: boolean;
}

const MAX_RUPIAH = 1_000_000_000_000_000;
const MAX_DEBTS = 20;
const isRupiah = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_RUPIAH;
const isYear = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1900 && v <= 2100;
const isText = (v: unknown, max = 120): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const ALLOWED = new Set([
  "type",
  "balance",
  "description",
  "creditorName",
  "creditorTaxId",
  "country",
  "year",
  "ownership",
]);

function parseDebt(raw: unknown): DebtInput | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).some((k) => !ALLOWED.has(k))) return null;
  if (typeof r.type !== "string" || !(r.type in DEBT_TYPE_KEYS)) return null;
  if (!isRupiah(r.balance)) return null;
  const out: DebtInput = { type: r.type as DebtTypeKey, balance: r.balance };
  for (const k of ["description", "creditorName", "creditorTaxId"] as const) {
    if (r[k] !== undefined) {
      if (!isText(r[k])) return null;
      out[k] = (r[k] as string).trim();
    }
  }
  if (r.country !== undefined) {
    if (typeof r.country !== "string" || !(r.country in DEBT_COUNTRY_KEYS)) return null;
    out.country = r.country as DebtCountryKey;
  }
  if (r.year !== undefined) {
    if (!isYear(r.year)) return null;
    out.year = r.year;
  }
  if (r.ownership !== undefined) {
    if (typeof r.ownership !== "string" || !(r.ownership in DEBT_OWNERSHIP_KEYS)) return null;
    out.ownership = r.ownership as DebtOwnershipKey;
  }
  return out;
}

/** Application-side re-validation of tool input. Mirrors the JSON schema. */
export function parseAddDebtsInput(input: unknown): AddDebtsInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const r = input as Record<string, unknown>;
  if (Object.keys(r).some((k) => k !== "debts" && k !== "replaceExisting")) return null;
  if (!Array.isArray(r.debts) || r.debts.length === 0 || r.debts.length > MAX_DEBTS) return null;
  if (r.replaceExisting !== undefined && typeof r.replaceExisting !== "boolean") return null;
  const debts: DebtInput[] = [];
  for (const raw of r.debts) {
    const parsed = parseDebt(raw);
    if (!parsed) return null;
    debts.push(parsed);
  }
  return { debts, replaceExisting: r.replaceExisting === true };
}

/** One tool row → one part B row with the table's own column names. */
export function toDebtRow(input: DebtInput): DebtRow {
  const row: DebtRow = {
    code: DEBT_TYPE_KEYS[input.type],
    description: input.description ?? DEBT_TYPE_KEYS[input.type].slice(6),
    country: DEBT_COUNTRY_KEYS[input.country ?? "indonesia"],
    balance: input.balance,
    note: DEBT_OWNERSHIP_KEYS[input.ownership ?? "own"],
  };
  if (input.creditorName) row.creditorName = input.creditorName;
  if (input.creditorTaxId) row.creditorId = input.creditorTaxId;
  if (input.year !== undefined) row.year = input.year;
  return row;
}

/** Returns a new `SptData` with the rows appended (or replacing all rows).
 *  Never mutates `data`; every other field is carried over as-is. */
export function applyDebts(data: SptData, input: AddDebtsInput): SptData {
  const rows = input.debts.map(toDebtRow);
  const existing = input.replaceExisting ? [] : (data.debts ?? []);
  const debts = [...existing, ...rows];
  // Question 14.b ("any debts at year end?") follows the table, like the
  // income answers follow their amounts.
  return {
    ...data,
    debts,
    answers: { ...data.answers, q14b: debts.length > 0 ? "ya" : "tidak" },
  };
}

/** Figures only: counts by type and the total balance. */
export interface DebtSummary {
  count: number;
  byType: Partial<Record<DebtTypeKey, number>>;
  totalBalance: number;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function summarizeDebts(data: SptData): DebtSummary {
  const byType: Partial<Record<DebtTypeKey, number>> = {};
  let totalBalance = 0;
  for (const d of data.debts ?? []) {
    const prefix = String(d.code ?? "").slice(0, 3);
    const key =
      (Object.keys(DEBT_TYPE_KEYS) as DebtTypeKey[]).find((k) =>
        DEBT_TYPE_KEYS[k].startsWith(prefix),
      ) ?? "other";
    byType[key] = (byType[key] ?? 0) + 1;
    totalBalance += num(d.balance);
  }
  return { count: (data.debts ?? []).length, byType, totalBalance };
}

export const DEBT_CODE_LIST = UTANG_KODE;
export const DEBT_COUNTRY_LIST = NEGARA_OPTIONS;
export const DEBT_OWNERSHIP_LIST = HARTA_KETERANGAN;
