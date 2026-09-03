import { describe, expect, it } from "vitest";
import {
  applyIncomeAndCredits,
  parseIncomeAndCreditsInput,
  summarizeIncome,
} from "./income-and-credits";
import type { SptData } from "./spt";

function base(): SptData {
  return {
    identity: { ptkp: "K/1", signer: "wp" },
    income: { employment: 174_000_000 },
    answers: { q1a: "ya", q14b: "ya" },
    family: [{ name: "Synthetic Child" }],
    employmentSlips: [{ employer: "PT Lama", gross: 174_000_000, deduction: 0, net: 174_000_000 }],
    declarationAgree: false,
  };
}

describe("parseIncomeAndCreditsInput", () => {
  it("accepts a salaried employment plus withholding", () => {
    expect(
      parseIncomeAndCreditsInput({
        employment: { employerName: " PT Sintetis ", grossIncome: 220_000_000, deductions: 5_500_000 },
        withholdingCredit: 12_000_000,
      }),
    ).toEqual({
      employment: { employerName: "PT Sintetis", grossIncome: 220_000_000, deductions: 5_500_000 },
      withholdingCredit: 12_000_000,
    });
  });

  it("rejects empty, unknown, negative, fractional, and oversized input", () => {
    expect(parseIncomeAndCreditsInput({})).toBeNull();
    expect(parseIncomeAndCreditsInput({ salary: 1 })).toBeNull();
    expect(parseIncomeAndCreditsInput({ zakat: -1 })).toBeNull();
    expect(parseIncomeAndCreditsInput({ zakat: 1.5 })).toBeNull();
    expect(parseIncomeAndCreditsInput({ zakat: "1000" })).toBeNull();
    expect(parseIncomeAndCreditsInput(null)).toBeNull();
    expect(parseIncomeAndCreditsInput([])).toBeNull();
    expect(
      parseIncomeAndCreditsInput({ employment: { employerName: "", grossIncome: 1, deductions: 0 } }),
    ).toBeNull();
    expect(
      parseIncomeAndCreditsInput({ employment: { employerName: "X", grossIncome: 1, deductions: 2 } }),
    ).toBeNull();
    expect(
      parseIncomeAndCreditsInput({ employment: { employerName: "X", grossIncome: 1 } }),
    ).toBeNull();
  });
});

describe("applyIncomeAndCredits", () => {
  it("replaces the employment slip, derives net, and flips the answers", () => {
    const next = applyIncomeAndCredits(base(), {
      employment: { employerName: "PT Sintetis", employerTaxId: "12.345.678.9-012.000", grossIncome: 220_000_000, deductions: 5_500_000 },
      withholdingCredit: 12_000_000,
      businessIncome: 0,
    });
    expect(next.employmentSlips).toEqual([
      { employer: "PT Sintetis", employerNpwp: "12.345.678.9-012.000", gross: 220_000_000, deduction: 5_500_000, net: 214_500_000 },
    ]);
    expect(next.income).toEqual({ employment: 214_500_000, business: 0 });
    expect(next.credits).toEqual({ withholding: 12_000_000 });
    expect(next.answers).toEqual({ q1a: "ya", q1b: "tidak", q10a: "ya", q14b: "ya" });
  });

  it("keeps every unrelated field and never mutates the input", () => {
    const before = base();
    const snapshot = structuredClone(before);
    const next = applyIncomeAndCredits(before, { zakat: 2_000_000 });
    expect(before).toEqual(snapshot);
    expect(next.identity).toEqual(before.identity);
    expect(next.family).toEqual(before.family);
    expect(next.employmentSlips).toEqual(before.employmentSlips);
    expect(next.income).toEqual({ employment: 174_000_000 });
    expect(next.deductions).toEqual({ zakat: 2_000_000 });
    expect(next.answers?.q3).toBe("ya");
    expect(next.declarationAgree).toBe(false);
  });
});

describe("summarizeIncome", () => {
  it("returns figures only, defaulting missing sections to zero", () => {
    expect(summarizeIncome(base())).toEqual({
      employmentNet: 174_000_000,
      business: 0,
      other: 0,
      foreign: 0,
      zakat: 0,
      withholdingCredit: 0,
      installment25: 0,
      stp25: 0,
    });
    const json = JSON.stringify(summarizeIncome(base()));
    expect(json).not.toContain("PT Lama");
    expect(json).not.toContain("Synthetic Child");
  });
});
