import { describe, expect, it } from "vitest";
import {
  applyFilingProfile,
  buildTaxReturnContext,
  derivePtkpCode,
  filingProfileFromPtkp,
  isFilingProfile,
  PROFILE_QUESTION,
  type FilingProfile,
} from "./filing-profile";
import type { SptData, SptReturn } from "./spt";

const MAPPING: Array<[FilingProfile, string]> = [
  [{ maritalStatus: "unmarried", dependentCount: 0 }, "TK/0"],
  [{ maritalStatus: "unmarried", dependentCount: 1 }, "TK/1"],
  [{ maritalStatus: "unmarried", dependentCount: 2 }, "TK/2"],
  [{ maritalStatus: "unmarried", dependentCount: 3 }, "TK/3"],
  [{ maritalStatus: "married", dependentCount: 0 }, "K/0"],
  [{ maritalStatus: "married", dependentCount: 1 }, "K/1"],
  [{ maritalStatus: "married", dependentCount: 2 }, "K/2"],
  [{ maritalStatus: "married", dependentCount: 3 }, "K/3"],
];

// Synthetic fixture only. Identifiers are obviously fake.
function fixtureData(): SptData {
  return {
    identity: { ptkp: "K/1", signer: "kuasa" },
    header: { status: "Normal", method: "Pencatatan", periodStart: 1, periodEnd: 12, source: "Pekerjaan" },
    income: { employment: 174_000_000, other: 1_000 },
    deductions: { zakat: 500_000 },
    credits: { withholding: 2_000_000 },
    answers: { q1a: "ya", q3: "ya" },
    assets: [{ category: "Kas dan Setara Kas", code: "012", balance: 10 }],
    debts: [{ code: "102", balance: 5 }],
    family: [{ name: "Synthetic Child", nik: "0000000000000000", relation: "Anak Kandung" }],
    employmentSlips: [{ employer: "PT Contoh Sintetis", employerNpwp: "00.000.000.0-000.000", gross: 1, deduction: 0, net: 1 }],
    withholdingSlips: [{ withholder: "PT Contoh Sintetis", amount: 1 }],
    declarationAgree: false,
  };
}

function fixtureReturn(data: SptData, status: SptReturn["status"] = "DRAFT"): SptReturn {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: "00000000-0000-4000-8000-000000000002",
    tax_year: 2025,
    form_type: "1770 S",
    status,
    data,
    pph_owed: 0,
    pph_credit: 0,
    balance_due: 0,
    payment_status: null,
    rejection_reason: null,
    reviewed_at: null,
    submitted_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    computed: {
      totalNet: 0,
      netAfterDeduction: 0,
      ptkpAmount: 0,
      taxableIncome: 0,
      pphOwed: 0,
      pphCredit: 0,
      balanceDue: 0,
      paymentStatus: "Nihil",
    },
    taxpayer_name: "Wajib Pajak Sintetis",
    taxpayer_npwp: "00.000.000.0-000.000",
    taxpayer_username: "synthetic",
  };
}

describe("derivePtkpCode", () => {
  it.each(MAPPING)("maps %j to %s", (profile, code) => {
    expect(derivePtkpCode(profile)).toBe(code);
  });
});

describe("filingProfileFromPtkp", () => {
  it.each(MAPPING)("decodes %s back to %j", (profile, code) => {
    expect(filingProfileFromPtkp(code)).toEqual(profile);
  });

  it.each(["", "K/4", "TK/-1", "HB/1", "K1", "k/1", "K/1 ", "TK/01"])(
    "rejects %j",
    (code) => {
      expect(filingProfileFromPtkp(code)).toBeNull();
    },
  );
});

describe("isFilingProfile", () => {
  it("accepts well-formed profiles", () => {
    expect(isFilingProfile({ maritalStatus: "married", dependentCount: 2 })).toBe(true);
  });

  it.each([
    null,
    undefined,
    "married",
    { maritalStatus: "married" },
    { dependentCount: 1 },
    { maritalStatus: "single", dependentCount: 1 },
    { maritalStatus: "married", dependentCount: 4 },
    { maritalStatus: "married", dependentCount: "1" },
    { maritalStatus: "married", dependentCount: 1.5 },
  ])("rejects %j", (value) => {
    expect(isFilingProfile(value)).toBe(false);
  });
});

describe("applyFilingProfile", () => {
  it("writes both filingProfile and the derived identity.ptkp", () => {
    const next = applyFilingProfile({}, { maritalStatus: "married", dependentCount: 1 });
    expect(next.filingProfile).toEqual({ maritalStatus: "married", dependentCount: 1 });
    expect(next.identity?.ptkp).toBe("K/1");
  });

  it("does not mutate the input and does not share the profile object", () => {
    const before = fixtureData();
    const snapshot = structuredClone(before);
    const profile: FilingProfile = { maritalStatus: "unmarried", dependentCount: 0 };
    const next = applyFilingProfile(before, profile);
    expect(before).toEqual(snapshot);
    expect(next).not.toBe(before);
    expect(next.filingProfile).not.toBe(profile);
    expect(next.identity).not.toBe(before.identity);
  });

  it("preserves signer, income, arrays, answers, and declaration", () => {
    const before = fixtureData();
    const next = applyFilingProfile(before, { maritalStatus: "unmarried", dependentCount: 2 });
    expect(next.identity).toEqual({ ptkp: "TK/2", signer: "kuasa" });
    expect(next.header).toEqual(before.header);
    expect(next.income).toEqual(before.income);
    expect(next.deductions).toEqual(before.deductions);
    expect(next.credits).toEqual(before.credits);
    expect(next.answers).toEqual(before.answers);
    expect(next.assets).toEqual(before.assets);
    expect(next.debts).toEqual(before.debts);
    expect(next.family).toEqual(before.family);
    expect(next.employmentSlips).toEqual(before.employmentSlips);
    expect(next.withholdingSlips).toEqual(before.withholdingSlips);
    expect(next.declarationAgree).toBe(false);
  });

  it("is idempotent for repeated identical profiles", () => {
    const profile: FilingProfile = { maritalStatus: "married", dependentCount: 3 };
    const once = applyFilingProfile(fixtureData(), profile);
    const twice = applyFilingProfile(once, profile);
    expect(twice).toEqual(once);
  });
});

describe("buildTaxReturnContext", () => {
  it("reports a legacy identity.ptkp without filingProfile as unconfirmed", () => {
    const ctx = buildTaxReturnContext(fixtureReturn(fixtureData()));
    expect(ctx).toEqual({
      returnId: "00000000-0000-4000-8000-000000000001",
      taxYear: 2025,
      formType: "1770 S",
      status: "DRAFT",
      editable: true,
      taxpayerProfile: null,
      currentPtkpCode: "K/1",
      profileConfirmed: false,
      missingFields: ["maritalStatus", "dependentCount"],
      suggestedQuestion: {
        id: PROFILE_QUESTION.id,
        en: "Were you married at the end of the tax year, and how many eligible dependants did you support (from zero to three)?",
      },
    });
  });

  it("defaults the PTKP code when identity is absent", () => {
    const ctx = buildTaxReturnContext(fixtureReturn({}));
    expect(ctx.currentPtkpCode).toBe("TK/0");
    expect(ctx.profileConfirmed).toBe(false);
  });

  it("reports a confirmed profile with no missing fields or question", () => {
    const data = applyFilingProfile(fixtureData(), { maritalStatus: "married", dependentCount: 1 });
    const ctx = buildTaxReturnContext(fixtureReturn(data));
    expect(ctx.taxpayerProfile).toEqual({ maritalStatus: "married", dependentCount: 1 });
    expect(ctx.currentPtkpCode).toBe("K/1");
    expect(ctx.profileConfirmed).toBe(true);
    expect(ctx.missingFields).toEqual([]);
    expect(ctx.suggestedQuestion).toBeNull();
  });

  it("treats a malformed stored filingProfile as unconfirmed", () => {
    const data = { ...fixtureData(), filingProfile: { maritalStatus: "married" } } as unknown as SptData;
    const ctx = buildTaxReturnContext(fixtureReturn(data));
    expect(ctx.taxpayerProfile).toBeNull();
    expect(ctx.profileConfirmed).toBe(false);
  });

  it.each([
    ["DRAFT", true],
    ["REJECTED", true],
    ["WAITING_PAYMENT", false],
    ["REPORTED", false],
  ] as const)("marks %s editable=%s", (status, editable) => {
    expect(buildTaxReturnContext(fixtureReturn({}, status)).editable).toBe(editable);
  });

  it("omits identifiers and financial collections from the serialized context", () => {
    const ctx = buildTaxReturnContext(fixtureReturn(fixtureData()));
    const json = JSON.stringify(ctx);
    expect(json).not.toContain("00.000.000.0-000.000");
    expect(json).not.toContain("0000000000000000");
    expect(json).not.toContain("Wajib Pajak Sintetis");
    expect(json).not.toContain("PT Contoh Sintetis");
    expect(json).not.toContain("synthetic");
    expect(json).not.toContain("174000000");
    for (const key of [
      "user_id",
      "taxpayer_name",
      "taxpayer_npwp",
      "taxpayer_username",
      "nik",
      "npwp",
      "income",
      "credits",
      "deductions",
      "assets",
      "debts",
      "family",
      "employmentSlips",
      "withholdingSlips",
      "answers",
      "declarationAgree",
    ]) {
      expect(json).not.toContain(`"${key}"`);
    }
    expect(Object.keys(ctx).sort()).toEqual(
      [
        "returnId",
        "taxYear",
        "formType",
        "status",
        "editable",
        "taxpayerProfile",
        "currentPtkpCode",
        "profileConfirmed",
        "missingFields",
        "suggestedQuestion",
      ].sort(),
    );
  });
});
