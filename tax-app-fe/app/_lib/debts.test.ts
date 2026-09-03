import { describe, expect, it } from "vitest";
import { applyDebts, parseAddDebtsInput, summarizeDebts, toDebtRow } from "./debts";
import type { SptData } from "./spt";

function base(): SptData {
  return {
    identity: { ptkp: "K/1", signer: "wp" },
    debts: [{ code: "102 - Kartu kredit", description: "Kartu kredit", creditorName: "Bank Sintetis", balance: 5_000_000 }],
    family: [{ name: "Synthetic Child" }],
  };
}

describe("parseAddDebtsInput", () => {
  it("accepts typed debts with optional creditor details", () => {
    expect(
      parseAddDebtsInput({
        debts: [
          { type: "bank_loan", balance: 250_000_000, creditorName: " Bank KPR Sintetis ", creditorTaxId: "01.234.567.8-901.000", year: 2020, description: "KPR rumah" },
          { type: "credit_card", balance: 3_000_000, country: "singapore", ownership: "joint" },
        ],
        replaceExisting: true,
      }),
    ).toEqual({
      debts: [
        { type: "bank_loan", balance: 250_000_000, creditorName: "Bank KPR Sintetis", creditorTaxId: "01.234.567.8-901.000", year: 2020, description: "KPR rumah" },
        { type: "credit_card", balance: 3_000_000, country: "singapore", ownership: "joint" },
      ],
      replaceExisting: true,
    });
  });

  it("rejects unknown types, countries, keys, bad amounts, and empty lists", () => {
    expect(parseAddDebtsInput({ debts: [] })).toBeNull();
    expect(parseAddDebtsInput({})).toBeNull();
    expect(parseAddDebtsInput({ debts: [{ type: "mortgage", balance: 1 }] })).toBeNull();
    expect(parseAddDebtsInput({ debts: [{ type: "bank_loan", balance: -1 }] })).toBeNull();
    expect(parseAddDebtsInput({ debts: [{ type: "bank_loan", balance: 1.5 }] })).toBeNull();
    expect(parseAddDebtsInput({ debts: [{ type: "bank_loan", balance: 1, country: "mars" }] })).toBeNull();
    expect(parseAddDebtsInput({ debts: [{ type: "bank_loan", balance: 1, rate: 5 }] })).toBeNull();
    expect(parseAddDebtsInput({ debts: [{ type: "bank_loan", balance: 1 }], replaceExisting: 1 })).toBeNull();
  });
});

describe("toDebtRow / applyDebts", () => {
  it("maps to the part B columns with sensible defaults", () => {
    expect(toDebtRow({ type: "bank_loan", balance: 7, creditorName: "Bank", year: 2019 })).toEqual({
      code: "101 - Utang bank / lembaga keuangan bukan bank",
      description: "Utang bank / lembaga keuangan bukan bank",
      country: "Indonesia",
      balance: 7,
      note: "Milik Sendiri",
      creditorName: "Bank",
      year: 2019,
    });
    expect(toDebtRow({ type: "credit_card", balance: 1, description: "Visa", country: "japan", ownership: "joint" })).toMatchObject({
      code: "102 - Kartu kredit",
      description: "Visa",
      country: "Jepang",
      note: "Harta Bersama",
    });
  });

  it("appends by default, replaces on request, never mutates", () => {
    const before = base();
    const snapshot = structuredClone(before);
    const appended = applyDebts(before, { debts: [{ type: "other", balance: 1 }], replaceExisting: false });
    expect(before).toEqual(snapshot);
    expect(appended.debts).toHaveLength(2);
    expect(appended.family).toEqual(before.family);
    expect(appended.answers?.q14b).toBe("ya");
    const replaced = applyDebts(before, { debts: [{ type: "other", balance: 1 }], replaceExisting: true });
    expect(replaced.debts).toHaveLength(1);
  });
});

describe("summarizeDebts", () => {
  it("returns counts by type and the total balance, matching codes by prefix", () => {
    const data = applyDebts({ ...base(), debts: [{ code: "102", balance: 5 }] }, { debts: [{ type: "bank_loan", balance: 100, creditorName: "Bank Sintetis" }], replaceExisting: false });
    const summary = summarizeDebts(data);
    expect(summary).toEqual({ count: 2, byType: { credit_card: 1, bank_loan: 1 }, totalBalance: 105 });
    expect(JSON.stringify(summary)).not.toContain("Bank Sintetis");
  });
});
