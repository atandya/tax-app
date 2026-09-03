// Withholding certificates (bukti potong) saved through the assistant.
// Pure, client-safe module. Rows follow the L-1 part E table: withholder,
// withholder NPWP, slip number, date, tax type, tax base, amount withheld.
// By default the sum of all slips feeds line 10.a (withholding credit), the
// same figure the manual form asks for, so the two never disagree.

import { JENIS_PAJAK, type SptData, type WithholdingSlip, type YaTidak } from "./spt";

/** English keys the agent uses; values are the exact Coretax tax types. */
export const WITHHOLDING_TAX_TYPE_KEYS = {
  pph21: "PPh Pasal 21",
  pph22: "PPh Pasal 22",
  pph23: "PPh Pasal 23",
  pph24: "PPh Pasal 24",
  pph26: "PPh Pasal 26",
  final_4_2: "PPh Final Pasal 4 ayat (2)",
} as const;
export type WithholdingTaxTypeKey = keyof typeof WITHHOLDING_TAX_TYPE_KEYS;

export interface WithholdingSlipInput {
  withholderName: string;
  taxType: WithholdingTaxTypeKey;
  /** Tax withheld in whole rupiah. */
  amount: number;
  /** Gross amount the tax was computed on, in whole rupiah. */
  taxBase?: number;
  withholderTaxId?: string;
  slipNumber?: string;
  /** ISO date YYYY-MM-DD, only when the user gives it. */
  date?: string;
}

export interface AddWithholdingSlipsInput {
  slips: WithholdingSlipInput[];
  /** true replaces every stored slip; false (default) appends. */
  replaceExisting: boolean;
  /** true (default) sets line 10.a to the sum of all slips afterwards. */
  updateWithholdingCredit: boolean;
}

const MAX_RUPIAH = 1_000_000_000_000_000;
const MAX_SLIPS = 20;
const isRupiah = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_RUPIAH;
const isText = (v: unknown, max = 120): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ALLOWED = new Set([
  "withholderName",
  "taxType",
  "amount",
  "taxBase",
  "withholderTaxId",
  "slipNumber",
  "date",
]);

function parseSlip(raw: unknown): WithholdingSlipInput | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).some((k) => !ALLOWED.has(k))) return null;
  if (!isText(r.withholderName)) return null;
  if (typeof r.taxType !== "string" || !(r.taxType in WITHHOLDING_TAX_TYPE_KEYS)) return null;
  if (!isRupiah(r.amount)) return null;
  const out: WithholdingSlipInput = {
    withholderName: r.withholderName.trim(),
    taxType: r.taxType as WithholdingTaxTypeKey,
    amount: r.amount,
  };
  if (r.taxBase !== undefined) {
    if (!isRupiah(r.taxBase)) return null;
    out.taxBase = r.taxBase;
  }
  for (const k of ["withholderTaxId", "slipNumber"] as const) {
    if (r[k] !== undefined) {
      if (!isText(r[k], 60)) return null;
      out[k] = (r[k] as string).trim();
    }
  }
  if (r.date !== undefined) {
    if (typeof r.date !== "string" || !DATE_RE.test(r.date)) return null;
    out.date = r.date;
  }
  return out;
}

/** Application-side re-validation of tool input. Mirrors the JSON schema. */
export function parseAddWithholdingSlipsInput(input: unknown): AddWithholdingSlipsInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const r = input as Record<string, unknown>;
  const allowedTop = new Set(["slips", "replaceExisting", "updateWithholdingCredit"]);
  if (Object.keys(r).some((k) => !allowedTop.has(k))) return null;
  if (!Array.isArray(r.slips) || r.slips.length === 0 || r.slips.length > MAX_SLIPS) return null;
  for (const flag of ["replaceExisting", "updateWithholdingCredit"] as const) {
    if (r[flag] !== undefined && typeof r[flag] !== "boolean") return null;
  }
  const slips: WithholdingSlipInput[] = [];
  for (const raw of r.slips) {
    const parsed = parseSlip(raw);
    if (!parsed) return null;
    slips.push(parsed);
  }
  return {
    slips,
    replaceExisting: r.replaceExisting === true,
    updateWithholdingCredit: r.updateWithholdingCredit !== false,
  };
}

/** One tool row → one part E row with the table's own column names. */
export function toWithholdingSlipRow(input: WithholdingSlipInput): WithholdingSlip {
  const row: WithholdingSlip = {
    withholder: input.withholderName,
    taxType: WITHHOLDING_TAX_TYPE_KEYS[input.taxType],
    amount: input.amount,
  };
  if (input.withholderTaxId) row.withholderNpwp = input.withholderTaxId;
  if (input.slipNumber) row.slipNo = input.slipNumber;
  if (input.date) row.date = input.date;
  if (input.taxBase !== undefined) row.taxBase = input.taxBase;
  return row;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Returns a new `SptData` with the slips appended (or replacing all slips)
 *  and, unless opted out, line 10.a set to the sum of every slip's amount.
 *  Never mutates `data`; every other field is carried over as-is. */
export function applyWithholdingSlips(data: SptData, input: AddWithholdingSlipsInput): SptData {
  const rows = input.slips.map(toWithholdingSlipRow);
  const existing = input.replaceExisting ? [] : (data.withholdingSlips ?? []);
  const withholdingSlips = [...existing, ...rows];
  const next: SptData = { ...data, withholdingSlips };
  if (input.updateWithholdingCredit) {
    const total = withholdingSlips.reduce((s, r) => s + num(r.amount), 0);
    next.credits = { ...data.credits, withholding: total };
    next.answers = { ...data.answers, q10a: (total > 0 ? "ya" : "tidak") as YaTidak };
  }
  return next;
}

/** Figures only: counts by tax type and the summed amount withheld. */
export interface WithholdingSlipSummary {
  count: number;
  byTaxType: Partial<Record<WithholdingTaxTypeKey | "other", number>>;
  totalAmount: number;
}

export function summarizeWithholdingSlips(data: SptData): WithholdingSlipSummary {
  const byTaxType: WithholdingSlipSummary["byTaxType"] = {};
  let totalAmount = 0;
  for (const s of data.withholdingSlips ?? []) {
    const key =
      (Object.keys(WITHHOLDING_TAX_TYPE_KEYS) as WithholdingTaxTypeKey[]).find(
        (k) => WITHHOLDING_TAX_TYPE_KEYS[k] === s.taxType,
      ) ?? "other";
    byTaxType[key] = (byTaxType[key] ?? 0) + 1;
    totalAmount += num(s.amount);
  }
  return { count: (data.withholdingSlips ?? []).length, byTaxType, totalAmount };
}

export const WITHHOLDING_TAX_TYPE_LIST = JENIS_PAJAK;
