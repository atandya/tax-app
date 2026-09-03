// Income, deduction, and tax-credit facts saved through the assistant.
// Pure, client-safe module: no React, no network, no DOM. Mirrors the manual
// form's own rules: employment income is the sum of employment-slip nets,
// each Ya/Tidak answer follows its amount, and the backend recomputes tax.

import type { EmploymentSlip, SptData, YaTidak } from "./spt";

export interface EmploymentInput {
  employerName: string;
  /** Employer NPWP or NIK exactly as the user gave it; optional. */
  employerTaxId?: string;
  grossIncome: number;
  deductions: number;
}

export interface IncomeAndCreditsInput {
  employment?: EmploymentInput;
  businessIncome?: number;
  otherIncome?: number;
  foreignIncome?: number;
  zakat?: number;
  withholdingCredit?: number;
  installment25?: number;
  stp25?: number;
}

export const INCOME_AMOUNT_KEYS = [
  "businessIncome",
  "otherIncome",
  "foreignIncome",
  "zakat",
  "withholdingCredit",
  "installment25",
  "stp25",
] as const;
export type IncomeAmountKey = (typeof INCOME_AMOUNT_KEYS)[number];

const MAX_RUPIAH = 1_000_000_000_000_000; // 1e15, well above any real figure

function isRupiah(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= MAX_RUPIAH
  );
}

function isNonEmptyString(value: unknown, max: number): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= max;
}

/** Application-side re-validation of tool input. Mirrors the JSON schema:
 *  only known keys, whole non-negative rupiah amounts, at least one fact. */
export function parseIncomeAndCreditsInput(
  input: unknown,
): IncomeAndCreditsInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }
  const raw = input as Record<string, unknown>;
  const allowed = new Set<string>(["employment", ...INCOME_AMOUNT_KEYS]);
  const keys = Object.keys(raw);
  if (keys.length === 0) return null;
  if (keys.some((k) => !allowed.has(k))) return null;

  const out: IncomeAndCreditsInput = {};
  for (const key of INCOME_AMOUNT_KEYS) {
    if (key in raw) {
      if (!isRupiah(raw[key])) return null;
      out[key] = raw[key] as number;
    }
  }
  if ("employment" in raw) {
    const e = raw.employment;
    if (typeof e !== "object" || e === null || Array.isArray(e)) return null;
    const r = e as Record<string, unknown>;
    const eAllowed = new Set(["employerName", "employerTaxId", "grossIncome", "deductions"]);
    if (Object.keys(r).some((k) => !eAllowed.has(k))) return null;
    if (!isNonEmptyString(r.employerName, 120)) return null;
    if (!isRupiah(r.grossIncome) || !isRupiah(r.deductions)) return null;
    if (r.deductions > r.grossIncome) return null;
    if ("employerTaxId" in r && r.employerTaxId !== undefined) {
      if (!isNonEmptyString(r.employerTaxId, 40)) return null;
    }
    out.employment = {
      employerName: r.employerName.trim(),
      ...(typeof r.employerTaxId === "string"
        ? { employerTaxId: r.employerTaxId.trim() }
        : {}),
      grossIncome: r.grossIncome,
      deductions: r.deductions,
    };
  }
  return out;
}

const yaTidak = (amount: number): YaTidak => (amount > 0 ? "ya" : "tidak");

function slipNet(slip: EmploymentSlip): number {
  const g = Number(slip.gross ?? 0);
  const d = Number(slip.deduction ?? 0);
  const net = (Number.isFinite(g) ? g : 0) - (Number.isFinite(d) ? d : 0);
  return Math.max(0, net);
}

/** Returns a new `SptData` with the given facts applied. Never mutates
 *  `data`; every field not mentioned in `input` is carried over as-is.
 *  Employment replaces the employment-slip list with the one employer given
 *  and re-derives `income.employment` from the slips, like the manual table. */
export function applyIncomeAndCredits(
  data: SptData,
  input: IncomeAndCreditsInput,
): SptData {
  const next: SptData = {
    ...data,
    income: { ...data.income },
    deductions: { ...data.deductions },
    credits: { ...data.credits },
    answers: { ...data.answers },
  };
  const answers = next.answers as Record<string, YaTidak>;

  if (input.employment) {
    const net = Math.max(0, input.employment.grossIncome - input.employment.deductions);
    const slip: EmploymentSlip = {
      employer: input.employment.employerName,
      employerNpwp: input.employment.employerTaxId ?? "",
      gross: input.employment.grossIncome,
      deduction: input.employment.deductions,
      net,
    };
    next.employmentSlips = [slip];
    const sum = next.employmentSlips.reduce((s, r) => s + slipNet(r), 0);
    next.income!.employment = sum;
    answers.q1a = yaTidak(sum);
  }
  if (input.businessIncome !== undefined) {
    next.income!.business = input.businessIncome;
    answers.q1b = yaTidak(input.businessIncome);
  }
  if (input.otherIncome !== undefined) {
    next.income!.other = input.otherIncome;
    answers.q1c = yaTidak(input.otherIncome);
  }
  if (input.foreignIncome !== undefined) {
    next.income!.foreign = input.foreignIncome;
    answers.q1d = yaTidak(input.foreignIncome);
  }
  if (input.zakat !== undefined) {
    next.deductions!.zakat = input.zakat;
    answers.q3 = yaTidak(input.zakat);
  }
  if (input.withholdingCredit !== undefined) {
    next.credits!.withholding = input.withholdingCredit;
    answers.q10a = yaTidak(input.withholdingCredit);
  }
  if (input.installment25 !== undefined) {
    next.credits!.installment25 = input.installment25;
  }
  if (input.stp25 !== undefined) {
    next.credits!.stp25 = input.stp25;
  }
  return next;
}

/** Amounts the assistant may see: figures only, never names or identifiers. */
export interface IncomeSummary {
  employmentNet: number;
  business: number;
  other: number;
  foreign: number;
  zakat: number;
  withholdingCredit: number;
  installment25: number;
  stp25: number;
}

const num = (v: unknown): number => {
  const n = typeof v === "number" ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

export function summarizeIncome(data: SptData): IncomeSummary {
  return {
    employmentNet: num(data.income?.employment),
    business: num(data.income?.business),
    other: num(data.income?.other),
    foreign: num(data.income?.foreign),
    zakat: num(data.deductions?.zakat),
    withholdingCredit: num(data.credits?.withholding),
    installment25: num(data.credits?.installment25),
    stp25: num(data.credits?.stp25),
  };
}
