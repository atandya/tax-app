/**
 * Indonesian Personal Income Tax (PPh OP) calculation helpers.
 * Rates per UU HPP; PTKP amounts per PMK (annual).
 */

export const PTKP: Record<string, number> = {
  'TK/0': 54_000_000,
  'TK/1': 58_500_000,
  'TK/2': 63_000_000,
  'TK/3': 67_500_000,
  'K/0': 58_500_000,
  'K/1': 63_000_000,
  'K/2': 67_500_000,
  'K/3': 72_000_000,
};

// Progressive brackets (UU HPP): [upperBound, rate]
const BRACKETS: Array<[number, number]> = [
  [60_000_000, 0.05],
  [250_000_000, 0.15],
  [500_000_000, 0.25],
  [5_000_000_000, 0.3],
  [Infinity, 0.35],
];

/** Round a rupiah amount down to the nearest 1.000 (taxable income rule). */
export function floorToThousand(n: number): number {
  return Math.max(0, Math.floor(n / 1000) * 1000);
}

/** Progressive income tax on a taxable amount (Penghasilan Kena Pajak). */
export function progressiveTax(taxable: number): number {
  let remaining = Math.max(0, taxable);
  let lower = 0;
  let tax = 0;
  for (const [upper, rate] of BRACKETS) {
    if (remaining <= 0) break;
    const slice = Math.min(remaining, upper - lower);
    tax += slice * rate;
    remaining -= slice;
    lower = upper;
  }
  return Math.round(tax);
}

export interface SptData {
  identity?: { ptkp?: string; signer?: string };
  income?: {
    employment?: number;
    business?: number;
    other?: number;
    foreign?: number;
  };
  deductions?: { zakat?: number };
  credits?: { withholding?: number; installment25?: number; stp25?: number };
  assets?: Array<Record<string, unknown>>;
  debts?: Array<Record<string, unknown>>;
  declarationAgree?: boolean;
  [key: string]: unknown;
}

export interface SptComputation {
  totalNet: number;
  netAfterDeduction: number;
  ptkpAmount: number;
  taxableIncome: number;
  pphOwed: number;
  pphCredit: number;
  balanceDue: number; // >0 kurang bayar, <0 lebih bayar, 0 nihil
  paymentStatus: 'Nihil' | 'Kurang Bayar' | 'Lebih Bayar';
}

const num = (v: unknown): number => {
  const n = typeof v === 'number' ? v : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Derive all computed fields from raw form data. */
export function computeSpt(data: SptData): SptComputation {
  const inc = data.income ?? {};
  const totalNet =
    num(inc.employment) + num(inc.business) + num(inc.other) + num(inc.foreign);

  const zakat = num(data.deductions?.zakat);
  const netAfterDeduction = Math.max(0, totalNet - zakat);

  const ptkpCode = data.identity?.ptkp ?? 'TK/0';
  const ptkpAmount = PTKP[ptkpCode] ?? PTKP['TK/0'];

  const taxableIncome = floorToThousand(netAfterDeduction - ptkpAmount);
  const pphOwed = progressiveTax(taxableIncome);

  const pphCredit =
    num(data.credits?.withholding) +
    num(data.credits?.installment25) +
    num(data.credits?.stp25);
  const balanceDue = pphOwed - pphCredit;

  const paymentStatus =
    balanceDue > 0 ? 'Kurang Bayar' : balanceDue < 0 ? 'Lebih Bayar' : 'Nihil';

  return {
    totalNet,
    netAfterDeduction,
    ptkpAmount,
    taxableIncome,
    pphOwed,
    pphCredit,
    balanceDue,
    paymentStatus,
  };
}
