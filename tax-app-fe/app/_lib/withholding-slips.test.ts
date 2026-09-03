import { describe, expect, it } from "vitest";
import {
  applyWithholdingSlips,
  parseAddWithholdingSlipsInput,
  summarizeWithholdingSlips,
  toWithholdingSlipRow,
} from "./withholding-slips";
import type { SptData } from "./spt";

function base(): SptData {
  return {
    identity: { ptkp: "K/1", signer: "wp" },
    credits: { withholding: 3_000_000, installment25: 100 },
    answers: { q1a: "ya", q10a: "ya" },
    withholdingSlips: [{ withholder: "PT Lama", withholderNpwp: "00.000.000.0-000.000", taxType: "PPh Pasal 21", amount: 3_000_000 }],
    family: [{ name: "Synthetic Child" }],
  };
}

describe("parseAddWithholdingSlipsInput", () => {
  it("accepts slips with optional details and defaults the flags", () => {
    expect(
      parseAddWithholdingSlipsInput({
        slips: [
          { withholderName: " PT Sintetis ", taxType: "pph21", amount: 7_000_000, taxBase: 180_000_000, withholderTaxId: "01.234.567.8-052.000", slipNumber: "1721-A1-0001", date: "2025-12-31" },
          { withholderName: "Bank Sintetis", taxType: "final_4_2", amount: 200_000 },
        ],
      }),
    ).toEqual({
      slips: [
        { withholderName: "PT Sintetis", taxType: "pph21", amount: 7_000_000, taxBase: 180_000_000, withholderTaxId: "01.234.567.8-052.000", slipNumber: "1721-A1-0001", date: "2025-12-31" },
        { withholderName: "Bank Sintetis", taxType: "final_4_2", amount: 200_000 },
      ],
      replaceExisting: false,
      updateWithholdingCredit: true,
    });
    expect(parseAddWithholdingSlipsInput({ slips: [{ withholderName: "X", taxType: "pph21", amount: 1 }], updateWithholdingCredit: false })?.updateWithholdingCredit).toBe(false);
  });

  it("rejects unknown tax types, bad amounts, bad dates, unknown keys, and empty lists", () => {
    expect(parseAddWithholdingSlipsInput({ slips: [] })).toBeNull();
    expect(parseAddWithholdingSlipsInput({})).toBeNull();
    expect(parseAddWithholdingSlipsInput({ slips: [{ withholderName: "X", taxType: "vat", amount: 1 }] })).toBeNull();
    expect(parseAddWithholdingSlipsInput({ slips: [{ withholderName: "X", taxType: "pph21", amount: -1 }] })).toBeNull();
    expect(parseAddWithholdingSlipsInput({ slips: [{ withholderName: "", taxType: "pph21", amount: 1 }] })).toBeNull();
    expect(parseAddWithholdingSlipsInput({ slips: [{ withholderName: "X", taxType: "pph21", amount: 1, date: "31/12/2025" }] })).toBeNull();
    expect(parseAddWithholdingSlipsInput({ slips: [{ withholderName: "X", taxType: "pph21", amount: 1, rate: 5 }] })).toBeNull();
    expect(parseAddWithholdingSlipsInput({ slips: [{ withholderName: "X", taxType: "pph21", amount: 1 }], updateWithholdingCredit: "no" })).toBeNull();
  });
});

describe("toWithholdingSlipRow / applyWithholdingSlips", () => {
  it("maps to the part E columns", () => {
    expect(toWithholdingSlipRow({ withholderName: "X", taxType: "pph23", amount: 5, taxBase: 100, slipNumber: "S1", date: "2025-06-30", withholderTaxId: "NPWP" })).toEqual({
      withholder: "X",
      taxType: "PPh Pasal 23",
      amount: 5,
      withholderNpwp: "NPWP",
      slipNo: "S1",
      date: "2025-06-30",
      taxBase: 100,
    });
  });

  it("appends and re-derives line 10.a from every slip by default", () => {
    const before = base();
    const snapshot = structuredClone(before);
    const next = applyWithholdingSlips(before, { slips: [{ withholderName: "PT Baru", taxType: "pph21", amount: 7_000_000 }], replaceExisting: false, updateWithholdingCredit: true });
    expect(before).toEqual(snapshot);
    expect(next.withholdingSlips).toHaveLength(2);
    expect(next.credits).toEqual({ withholding: 10_000_000, installment25: 100 });
    expect(next.answers).toEqual({ q1a: "ya", q10a: "ya" });
    expect(next.family).toEqual(before.family);
  });

  it("replaces on request and leaves the credit alone when opted out", () => {
    const replaced = applyWithholdingSlips(base(), { slips: [{ withholderName: "PT Baru", taxType: "pph21", amount: 7_000_000 }], replaceExisting: true, updateWithholdingCredit: true });
    expect(replaced.withholdingSlips).toHaveLength(1);
    expect(replaced.credits?.withholding).toBe(7_000_000);
    const untouched = applyWithholdingSlips(base(), { slips: [{ withholderName: "PT Baru", taxType: "pph21", amount: 7_000_000 }], replaceExisting: false, updateWithholdingCredit: false });
    expect(untouched.credits).toEqual(base().credits);
    expect(untouched.answers).toEqual(base().answers);
  });
});

describe("summarizeWithholdingSlips", () => {
  it("returns counts by tax type and the total, never names or numbers", () => {
    const data = applyWithholdingSlips(base(), { slips: [{ withholderName: "Bank Sintetis", taxType: "final_4_2", amount: 200_000 }], replaceExisting: false, updateWithholdingCredit: true });
    const summary = summarizeWithholdingSlips(data);
    expect(summary).toEqual({ count: 2, byTaxType: { pph21: 1, final_4_2: 1 }, totalAmount: 3_200_000 });
    const json = JSON.stringify(summary);
    expect(json).not.toContain("PT Lama");
    expect(json).not.toContain("00.000.000.0-000.000");
  });
});
