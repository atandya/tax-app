import { describe, expect, it, vi } from "vitest";
import {
  applyFilingProfile,
  type FilingProfile,
} from "./filing-profile";
import { applyAssets } from "./assets";
import { applyDebts } from "./debts";
import { applyWithholdingSlips } from "./withholding-slips";
import { applyReturnAnswers } from "./return-answers";
import { applyFamilyMembers } from "./family";
import { applyIncomeAndCredits } from "./income-and-credits";
import type { SptData, SptReturn } from "./spt";
import {
  FORM_DONE_NEXT_STEP,
  FORM_STAY_NEXT_STEP,
  GET_TAX_RETURN_CONTEXT_INPUT_SCHEMA,
  GET_TAX_RETURN_CONTEXT_TOOL,
  parseProfileInput,
  registerTaxReturnTools,
  TAX_TOOL_NAMES,
  ADD_ASSETS_TOOL,
  ADD_DEBTS_TOOL,
  ADD_FAMILY_MEMBERS_TOOL,
  ADD_WITHHOLDING_SLIPS_TOOL,
  UPDATE_INCOME_AND_CREDITS_TOOL,
  UPDATE_RETURN_ANSWERS_TOOL,
  type AddAssetsResult,
  type AddDebtsResult,
  type AddFamilyMembersResult,
  type AddWithholdingSlipsResult,
  type UpdateReturnAnswersResult,
  UPDATE_TAXPAYER_PROFILE_INPUT_SCHEMA,
  UPDATE_TAXPAYER_PROFILE_TOOL,
  type UpdateIncomeAndCreditsResult,
  type TaxModelContext,
  type TaxTool,
  type TaxToolDependencies,
  type TaxToolFailure,
  type UpdateTaxpayerProfileResult,
} from "./webmcp-tax-tools";

// ---- synthetic fixtures ----

function fixtureData(): SptData {
  return {
    identity: { ptkp: "TK/0", signer: "wp" },
    income: { employment: 120_000_000 },
    credits: { withholding: 3_000_000 },
    answers: { q1a: "ya" },
    assets: [{ category: "Kas dan Setara Kas", code: "011", description: "011 - Uang tunai", balance: 1_000_000, note: "Milik Sendiri" }],
    family: [{ name: "Synthetic Child", nik: "0000000000000000" }],
    employmentSlips: [{ employer: "PT Contoh Sintetis", employerNpwp: "00.000.000.0-000.000" }],
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
      ptkpAmount: 54_000_000,
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

/** A minimal in-memory stand-in for the page + backend: `saveProfile`
 *  behaves like the real adapter (apply → persist → adopt canonical). */
function fakeDeps(initial: SptReturn, opts: { failSave?: boolean } = {}) {
  let current = initial;
  const saveCalls: FilingProfile[] = [];
  const revealCalls: SptReturn[] = [];
  const revealSections: string[] = [];
  const deps: TaxToolDependencies = {
    getCurrentReturn: () => current,
    saveProfile: async (profile) => {
      saveCalls.push(profile);
      if (opts.failSave) throw new Error("boom");
      const nextData = applyFilingProfile(current.data, profile);
      current = { ...current, data: nextData, updated_at: "2026-01-02T00:00:00.000Z" };
      return current;
    },
    revealProfileUpdate: (saved) => {
      revealCalls.push(saved);
    },
    saveIncome: async (facts) => {
      if (opts.failSave) throw new Error("boom");
      const nextData = applyIncomeAndCredits(current.data, facts);
      current = { ...current, data: nextData, updated_at: "2026-01-02T00:00:00.000Z" };
      return current;
    },
    revealIncomeUpdate: (saved) => {
      revealCalls.push(saved);
    },
    saveAssets: async (input) => {
      if (opts.failSave) throw new Error("boom");
      const nextData = applyAssets(current.data, input);
      current = { ...current, data: nextData, updated_at: "2026-01-02T00:00:00.000Z" };
      return current;
    },
    revealAssetsUpdate: (saved) => {
      revealCalls.push(saved);
    },
    saveFamily: async (input) => {
      if (opts.failSave) throw new Error("boom");
      const nextData = applyFamilyMembers(current.data, input);
      current = { ...current, data: nextData, updated_at: "2026-01-02T00:00:00.000Z" };
      return current;
    },
    revealFamilyUpdate: (saved) => {
      revealCalls.push(saved);
    },
    saveDebts: async (input) => {
      if (opts.failSave) throw new Error("boom");
      const nextData = applyDebts(current.data, input);
      current = { ...current, data: nextData, updated_at: "2026-01-02T00:00:00.000Z" };
      return current;
    },
    revealDebtsUpdate: (saved) => {
      revealCalls.push(saved);
    },
    saveWithholdingSlips: async (input) => {
      if (opts.failSave) throw new Error("boom");
      const nextData = applyWithholdingSlips(current.data, input);
      current = { ...current, data: nextData, updated_at: "2026-01-02T00:00:00.000Z" };
      return current;
    },
    revealWithholdingUpdate: (saved) => {
      revealCalls.push(saved);
    },
    saveAnswers: async (input) => {
      if (opts.failSave) throw new Error("boom");
      const nextData = applyReturnAnswers(current.data, input);
      current = { ...current, data: nextData, updated_at: "2026-01-02T00:00:00.000Z" };
      return current;
    },
    revealAnswersUpdate: (saved, _count, section) => {
      revealCalls.push(saved);
      revealSections.push(section);
    },
  };
  return { deps, saveCalls, revealCalls, revealSections, getCurrent: () => current };
}

function fakeModelContext() {
  const registered: Array<{ tool: TaxTool; options?: WebMCP.ModelContextRegisterToolOptions }> = [];
  const modelContext = {
    registerTool: vi.fn(async (tool: TaxTool, options?: WebMCP.ModelContextRegisterToolOptions) => {
      registered.push({ tool, options });
    }),
  } as unknown as TaxModelContext;
  return { modelContext, registered };
}

async function registerWithFakes(initial: SptReturn, opts?: { failSave?: boolean }) {
  const fakes = fakeDeps(initial, opts);
  const { modelContext, registered } = fakeModelContext();
  const controller = new AbortController();
  await registerTaxReturnTools(modelContext, fakes.deps, controller.signal);
  const byName = (name: string) => {
    const hit = registered.find((r) => r.tool.name === name);
    if (!hit) throw new Error(`tool ${name} not registered`);
    return hit.tool;
  };
  const execOpts = { signal: new AbortController().signal };
  return {
    ...fakes,
    registered,
    controller,
    read: () => byName(GET_TAX_RETURN_CONTEXT_TOOL).execute({}, execOpts),
    update: (input: unknown) =>
      byName(UPDATE_TAXPAYER_PROFILE_TOOL).execute(input as Record<string, unknown>, execOpts) as Promise<
        UpdateTaxpayerProfileResult | TaxToolFailure
      >,
    income: (input: unknown) =>
      byName(UPDATE_INCOME_AND_CREDITS_TOOL).execute(input as Record<string, unknown>, execOpts) as Promise<
        UpdateIncomeAndCreditsResult | TaxToolFailure
      >,
    assets: (input: unknown) =>
      byName(ADD_ASSETS_TOOL).execute(input as Record<string, unknown>, execOpts) as Promise<
        AddAssetsResult | TaxToolFailure
      >,
    family: (input: unknown) =>
      byName(ADD_FAMILY_MEMBERS_TOOL).execute(input as Record<string, unknown>, execOpts) as Promise<
        AddFamilyMembersResult | TaxToolFailure
      >,
    debts: (input: unknown) =>
      byName(ADD_DEBTS_TOOL).execute(input as Record<string, unknown>, execOpts) as Promise<
        AddDebtsResult | TaxToolFailure
      >,
    slips: (input: unknown) =>
      byName(ADD_WITHHOLDING_SLIPS_TOOL).execute(input as Record<string, unknown>, execOpts) as Promise<
        AddWithholdingSlipsResult | TaxToolFailure
      >,
    answers: (input: unknown) =>
      byName(UPDATE_RETURN_ANSWERS_TOOL).execute(input as Record<string, unknown>, execOpts) as Promise<
        UpdateReturnAnswersResult | TaxToolFailure
      >,
  };
}

describe("update_return_answers", () => {
  it("saves the given answers, reveals the first question's section, and reports the question map", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.answers({ q13a: "no", q14c: "yes", q8: "no" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toEqual({ section: "questions", answered: ["q8", "q13a", "q14c"] });
    expect(result.context.questions).toMatchObject({ q8: "no", q13a: "no", q14c: "yes", q13b: "unanswered" });
    expect(fakes.getCurrent().data.answers).toEqual({ q1a: "ya", q8: "tidak", q13a: "tidak", q14c: "ya" });
    expect(fakes.getCurrent().data.income).toEqual(fixtureData().income);
    expect(fakes.revealSections).toEqual(["tax"]);
    expect(JSON.stringify(result)).not.toContain("0000000000000000");
  });

  it("exposes every question with its wording in the schema and rejects amount-bearing or unknown questions", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const tool = fakes.registered.find((r) => r.tool.name === "update_return_answers")!.tool;
    const props = (tool.inputSchema as { properties: Record<string, { description: string }> }).properties;
    expect(Object.keys(props)).toEqual(["q8", "q10d", "q11b", "q13a", "q13b", "q13c", "q14b", "q14c", "q14d", "q14e", "q14f", "q14g"]);
    expect(props.q14b.description).toMatch(/debts/);

    const snapshot = structuredClone(fakes.getCurrent().data);
    for (const bad of [{}, { q1a: "yes" }, { q10a: "no" }, { q8: "ya" }, { q99: "yes" }]) {
      const result = await fakes.answers(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_ANSWERS");
    }
    expect(fakes.getCurrent().data).toEqual(snapshot);
  });

  it("refuses non-editable returns and reports SAVE_FAILED on a rejected save", async () => {
    const locked = await registerWithFakes(fixtureReturn(fixtureData(), "REPORTED"));
    const lockedResult = await locked.answers({ q8: "no" });
    expect(lockedResult.ok).toBe(false);
    if (!lockedResult.ok) expect(lockedResult.error.code).toBe("RETURN_NOT_EDITABLE");

    const failing = await registerWithFakes(fixtureReturn(fixtureData()), { failSave: true });
    const failed = await failing.answers({ q8: "no" });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe("SAVE_FAILED");
  });

  it("add_debts flips 14.b to yes", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    await fakes.debts({ debts: [{ type: "credit_card", balance: 1 }] });
    expect(fakes.getCurrent().data.answers?.q14b).toBe("ya");
    const ctx = await fakes.read();
    expect((ctx as { context: { questions: { q14b: string } } }).context.questions.q14b).toBe("yes");
  });
});

describe("add_withholding_slips", () => {
  it("appends slips, re-derives line 10.a, and reports totals only", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.slips({
      slips: [
        { withholderName: "PT Sintetis Baru", taxType: "pph21", amount: 7_000_000, taxBase: 180_000_000, withholderTaxId: "01.234.567.8-052.000", slipNumber: "1721-A1-0001", date: "2025-12-31" },
        { withholderName: "Bank Sintetis", taxType: "final_4_2", amount: 200_000 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toEqual({
      section: "withholdingSlips",
      added: 2,
      replaced: false,
      totalRows: 2,
      totalWithheld: 7_200_000,
      withholdingCredit: 7_200_000,
    });
    expect(result.context.withholdingSlips).toEqual({ count: 2, byTaxType: { pph21: 1, final_4_2: 1 }, totalAmount: 7_200_000 });
    expect(result.context.income.withholdingCredit).toBe(7_200_000);
    const saved = fakes.getCurrent().data;
    expect(saved.withholdingSlips).toEqual([
      { withholder: "PT Sintetis Baru", taxType: "PPh Pasal 21", amount: 7_000_000, withholderNpwp: "01.234.567.8-052.000", slipNo: "1721-A1-0001", date: "2025-12-31", taxBase: 180_000_000 },
      { withholder: "Bank Sintetis", taxType: "PPh Final Pasal 4 ayat (2)", amount: 200_000 },
    ]);
    expect(saved.credits).toEqual({ withholding: 7_200_000 });
    expect(saved.answers).toMatchObject({ q10a: "ya" });
    expect(saved.family).toEqual(fixtureData().family);
    const json = JSON.stringify(result);
    expect(json).not.toContain("PT Sintetis Baru");
    expect(json).not.toContain("01.234.567.8-052.000");
    expect(json).not.toContain("1721-A1-0001");
    expect(fakes.revealCalls).toHaveLength(1);
  });

  it("keeps a manual credit when opted out and rejects invalid rows before any save", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const kept = await fakes.slips({ slips: [{ withholderName: "X", taxType: "pph23", amount: 500 }], updateWithholdingCredit: false });
    expect(kept.ok).toBe(true);
    if (kept.ok) expect(kept.changed.withholdingCredit).toBe(3_000_000);
    expect(fakes.getCurrent().data.credits).toEqual(fixtureData().credits);

    const snapshot = structuredClone(fakes.getCurrent().data);
    for (const bad of [{}, { slips: [] }, { slips: [{ withholderName: "X", taxType: "vat", amount: 1 }] }, { slips: [{ withholderName: "X", taxType: "pph21", amount: 1.5 }] }, { slips: [{ withholderName: "X", taxType: "pph21", amount: 1, date: "bad" }] }]) {
      const result = await fakes.slips(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_WITHHOLDING");
    }
    expect(fakes.getCurrent().data).toEqual(snapshot);
  });

  it("refuses non-editable returns and reports SAVE_FAILED on a rejected save", async () => {
    const locked = await registerWithFakes(fixtureReturn(fixtureData(), "REPORTED"));
    const lockedResult = await locked.slips({ slips: [{ withholderName: "X", taxType: "pph21", amount: 1 }] });
    expect(lockedResult.ok).toBe(false);
    if (!lockedResult.ok) expect(lockedResult.error.code).toBe("RETURN_NOT_EDITABLE");

    const failing = await registerWithFakes(fixtureReturn(fixtureData()), { failSave: true });
    const failed = await failing.slips({ slips: [{ withholderName: "X", taxType: "pph21", amount: 1 }] });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe("SAVE_FAILED");
  });
});

describe("add_debts", () => {
  it("appends rows in the part B layout and reports totals only", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.debts({
      debts: [
        { type: "bank_loan", balance: 250_000_000, creditorName: "Bank KPR Sintetis", creditorTaxId: "01.234.567.8-901.000", year: 2020, description: "KPR rumah" },
        { type: "credit_card", balance: 3_000_000 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toEqual({ section: "debts", added: 2, replaced: false, totalRows: 2, totalBalance: 253_000_000 });
    expect(result.context.debts).toEqual({ count: 2, byType: { bank_loan: 1, credit_card: 1 }, totalBalance: 253_000_000 });
    expect(fakes.getCurrent().data.debts).toEqual([
      { code: "101 - Utang bank / lembaga keuangan bukan bank", description: "KPR rumah", country: "Indonesia", balance: 250_000_000, note: "Milik Sendiri", creditorName: "Bank KPR Sintetis", creditorId: "01.234.567.8-901.000", year: 2020 },
      { code: "102 - Kartu kredit", description: "Kartu kredit", country: "Indonesia", balance: 3_000_000, note: "Milik Sendiri" },
    ]);
    expect(fakes.getCurrent().data.assets).toEqual(fixtureData().assets);
    const json = JSON.stringify(result);
    expect(json).not.toContain("Bank KPR Sintetis");
    expect(json).not.toContain("01.234.567.8-901.000");
    expect(json).not.toContain("0000000000000000");
    expect(fakes.revealCalls).toHaveLength(1);
  });

  it("replaces on request and rejects invalid rows before any save", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    await fakes.debts({ debts: [{ type: "other", balance: 1 }] });
    const replaced = await fakes.debts({ debts: [{ type: "credit_card", balance: 5 }], replaceExisting: true });
    expect(replaced.ok).toBe(true);
    if (replaced.ok) expect(replaced.changed).toMatchObject({ added: 1, replaced: true, totalRows: 1, totalBalance: 5 });

    const snapshot = structuredClone(fakes.getCurrent().data);
    for (const bad of [{}, { debts: [] }, { debts: [{ type: "mortgage", balance: 1 }] }, { debts: [{ type: "bank_loan", balance: -1 }] }]) {
      const result = await fakes.debts(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_DEBTS");
    }
    expect(fakes.getCurrent().data).toEqual(snapshot);
  });

  it("refuses non-editable returns and reports SAVE_FAILED on a rejected save", async () => {
    const locked = await registerWithFakes(fixtureReturn(fixtureData(), "REPORTED"));
    const lockedResult = await locked.debts({ debts: [{ type: "other", balance: 1 }] });
    expect(lockedResult.ok).toBe(false);
    if (!lockedResult.ok) expect(lockedResult.error.code).toBe("RETURN_NOT_EDITABLE");

    const failing = await registerWithFakes(fixtureReturn(fixtureData()), { failSave: true });
    const failed = await failing.debts({ debts: [{ type: "other", balance: 1 }] });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe("SAVE_FAILED");
  });
});

describe("add_family_members", () => {
  it("appends rows in the part C layout and reports counts only", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.family({
      members: [
        { name: "Anak Sintetis Dua", relation: "child", nik: "1234567890123456", birthDate: "2015-06-30" },
        { name: "Ibu Sintetis", relation: "parent", occupation: "Pensiunan" },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toEqual({ section: "family", added: 2, replaced: false, totalRows: 3 });
    expect(result.context.family).toEqual({ count: 3, byRelation: { other: 1, child: 1, parent: 1 } });
    expect(fakes.getCurrent().data.family).toEqual([
      ...fixtureData().family!,
      { name: "Anak Sintetis Dua", relation: "Anak Kandung", nik: "1234567890123456", birthDate: "2015-06-30" },
      { name: "Ibu Sintetis", relation: "Orang Tua", job: "Pensiunan" },
    ]);
    expect(fakes.getCurrent().data.assets).toEqual(fixtureData().assets);
    const json = JSON.stringify(result);
    expect(json).not.toContain("Anak Sintetis Dua");
    expect(json).not.toContain("1234567890123456");
    expect(json).not.toContain("2015-06-30");
    expect(json).not.toContain("Synthetic Child");
    expect(fakes.revealCalls).toHaveLength(1);
  });

  it("asks for dependants after a profile with dependants when none are listed", async () => {
    const fakes = await registerWithFakes(fixtureReturn({ ...fixtureData(), family: [] }));
    const profile = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    expect(profile.ok).toBe(true);
    if (!profile.ok) return;
    expect(profile.context.sectionsMissing).toContain("family");
    expect(profile.nextStep.hint).toMatch(/add_family_members/);
    const added = await fakes.family({ members: [{ name: "Anak", relation: "child" }] });
    expect(added.ok).toBe(true);
    if (added.ok) expect(added.context.sectionsMissing).not.toContain("family");
  });

  it("rejects invalid rows before any save and refuses locked returns", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const snapshot = structuredClone(fakes.getCurrent().data);
    for (const bad of [{}, { members: [] }, { members: [{ name: "X", relation: "cousin" }] }, { members: [{ name: "X", relation: "child", nik: "12" }] }]) {
      const result = await fakes.family(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_FAMILY");
    }
    expect(fakes.getCurrent().data).toEqual(snapshot);

    const locked = await registerWithFakes(fixtureReturn(fixtureData(), "REPORTED"));
    const lockedResult = await locked.family({ members: [{ name: "X", relation: "child" }] });
    expect(lockedResult.ok).toBe(false);
    if (!lockedResult.ok) expect(lockedResult.error.code).toBe("RETURN_NOT_EDITABLE");

    const failing = await registerWithFakes(fixtureReturn(fixtureData()), { failSave: true });
    const failed = await failing.family({ members: [{ name: "X", relation: "child" }] });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe("SAVE_FAILED");
  });
});

describe("add_assets", () => {
  it("appends rows in the sub-table layout and reports totals only", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.assets({
      assets: [
        { category: "cash", code: "012", value: 25_000_000, institutionName: "Bank Sintetis", accountNo: "1234567890" },
        { category: "movable", code: "041", value: 150_000_000, acquisitionPrice: 200_000_000, year: 2021 },
      ],
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toEqual({
      section: "assets",
      added: 2,
      replaced: false,
      totalRows: 3,
      totalCurrentValue: 176_000_000,
    });
    expect(result.context.assets).toEqual({
      count: 3,
      byCategory: { cash: 2, movable: 1 },
      totalAcquisition: 226_000_000,
      totalCurrentValue: 176_000_000,
    });
    const saved = fakes.getCurrent().data.assets ?? [];
    expect(saved).toEqual([
      fixtureData().assets![0],
      { category: "Kas dan Setara Kas", code: "012", description: "012 - Tabungan", note: "Milik Sendiri", balance: 25_000_000, location: "Dalam Negeri", institutionName: "Bank Sintetis", accountNo: "1234567890" },
      { category: "Harta Bergerak", code: "041", description: "041 - Alat transportasi", note: "Milik Sendiri", year: 2021, value: 150_000_000, acquisitionPrice: 200_000_000, location: "Dalam Negeri" },
    ]);
    expect(fakes.getCurrent().data.family).toEqual(fixtureData().family);
    const json = JSON.stringify(result);
    expect(json).not.toContain("1234567890");
    expect(json).not.toContain("Bank Sintetis");
    expect(json).not.toContain("0000000000000000");
    expect(fakes.revealCalls).toHaveLength(1);
  });

  it("replaces on request and rejects invalid rows before any save", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    await fakes.assets({ assets: [{ category: "cash", code: "011", value: 1_000_000 }] });
    const replaced = await fakes.assets({ assets: [{ category: "property", code: "061", value: 5 }], replaceExisting: true });
    expect(replaced.ok).toBe(true);
    if (replaced.ok) expect(replaced.changed).toMatchObject({ added: 1, replaced: true, totalRows: 1 });

    const snapshot = structuredClone(fakes.getCurrent().data);
    for (const bad of [{}, { assets: [] }, { assets: [{ category: "cash", code: "061", value: 1 }] }, { assets: [{ category: "cash", code: "012", value: 1.5 }] }]) {
      const result = await fakes.assets(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_ASSETS");
    }
    expect(fakes.getCurrent().data).toEqual(snapshot);
  });

  it("refuses non-editable returns and reports SAVE_FAILED on a rejected save", async () => {
    const locked = await registerWithFakes(fixtureReturn(fixtureData(), "REPORTED"));
    const lockedResult = await locked.assets({ assets: [{ category: "cash", code: "011", value: 1 }] });
    expect(lockedResult.ok).toBe(false);
    if (!lockedResult.ok) expect(lockedResult.error.code).toBe("RETURN_NOT_EDITABLE");

    const failing = await registerWithFakes(fixtureReturn(fixtureData()), { failSave: true });
    const failed = await failing.assets({ assets: [{ category: "cash", code: "011", value: 1 }] });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe("SAVE_FAILED");
  });
});

describe("update_income_and_credits", () => {
  it("saves employment and withholding, derives net, and reports the recomputed return", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.income({
      employment: { employerName: "PT Sintetis Baru", grossIncome: 220_000_000, deductions: 5_500_000 },
      withholdingCredit: 12_000_000,
    });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.changed).toEqual({
      section: "incomeAndCredits",
      fields: ["employment", "withholdingCredit"],
      employmentNet: 214_500_000,
    });
    expect(result.context.income.employmentNet).toBe(214_500_000);
    expect(result.context.income.withholdingCredit).toBe(12_000_000);
    expect(result.context.sectionsMissing).toEqual([]);
    const saved = fakes.getCurrent().data;
    expect(saved.employmentSlips).toEqual([
      { employer: "PT Sintetis Baru", employerNpwp: "", gross: 220_000_000, deduction: 5_500_000, net: 214_500_000 },
    ]);
    expect(saved.answers).toMatchObject({ q1a: "ya", q10a: "ya" });
    expect(saved.family).toEqual(fixtureData().family);
    expect(fakes.revealCalls).toHaveLength(1);
    const json = JSON.stringify(result);
    expect(json).not.toContain("0000000000000000");
    expect(json).not.toContain("Synthetic Child");
  });

  it("rejects invalid input before touching the return", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    for (const bad of [{}, { salary: 1 }, { zakat: -5 }, { employment: { employerName: "X", grossIncome: 1, deductions: 9 } }]) {
      const result = await fakes.income(bad);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("INVALID_INCOME");
    }
    expect(fakes.getCurrent().data).toEqual(fixtureData());
    expect(fakes.revealCalls).toHaveLength(0);
  });

  it("refuses non-editable returns and reports SAVE_FAILED on a rejected save", async () => {
    const locked = await registerWithFakes(fixtureReturn(fixtureData(), "REPORTED"));
    const lockedResult = await locked.income({ zakat: 1_000_000 });
    expect(lockedResult.ok).toBe(false);
    if (!lockedResult.ok) expect(lockedResult.error.code).toBe("RETURN_NOT_EDITABLE");

    const failing = await registerWithFakes(fixtureReturn(fixtureData()), { failSave: true });
    const failed = await failing.income({ zakat: 1_000_000 });
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(failed.error.code).toBe("SAVE_FAILED");
    expect(failing.getCurrent().data).toEqual(fixtureData());
  });
});

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

// ---- discovery metadata ----

describe("registerTaxReturnTools discovery metadata", () => {
  it("registers exactly the eight form tools, in order, with a shared abort signal", async () => {
    const { registered, controller } = await registerWithFakes(fixtureReturn(fixtureData()));
    const expected = [
      "get_tax_return_context",
      "update_taxpayer_profile",
      "update_income_and_credits",
      "add_assets",
      "add_family_members",
      "add_debts",
      "add_withholding_slips",
      "update_return_answers",
    ];
    expect(registered.map((r) => r.tool.name)).toEqual(expected);
    expect([...TAX_TOOL_NAMES]).toEqual(expected);
    for (const r of registered) {
      expect(r.options?.signal).toBe(controller.signal);
    }
  });

  it("never registers a declaration or submission tool", async () => {
    const { registered } = await registerWithFakes(fixtureReturn(fixtureData()));
    const names = registered.map((r) => r.tool.name.toLowerCase());
    for (const banned of ["submit", "declar", "lapor", "pernyataan", "sign", "payment", "bayar"]) {
      expect(names.some((n) => n.includes(banned))).toBe(false);
    }
    expect(registered).toHaveLength(8);
  });

  it("describes get_tax_return_context exactly as specified", async () => {
    const { registered } = await registerWithFakes(fixtureReturn(fixtureData()));
    const tool = registered[0].tool;
    expect(tool.description).toBe(
      "Read the active Indonesian individual tax return's filing status and the minimum missing taxpayer-profile facts. Use this before asking the user for information. This tool does not submit or modify the return.",
    );
    expect(tool.inputSchema).toEqual({ type: "object", properties: {}, additionalProperties: false });
    expect(tool.inputSchema).toBe(GET_TAX_RETURN_CONTEXT_INPUT_SCHEMA);
    expect(tool.annotations).toEqual({ readOnlyHint: true });
  });

  it("describes update_taxpayer_profile exactly as specified", async () => {
    const { registered } = await registerWithFakes(fixtureReturn(fixtureData()));
    const tool = registered[1].tool;
    expect(tool.description).toBe(
      "Save marital status and eligible dependant count confirmed by the user for the active Indonesian individual tax return. The website derives the PTKP code. Never guess either value. This modifies the visible draft but does not submit it.",
    );
    expect(tool.inputSchema).toBe(UPDATE_TAXPAYER_PROFILE_INPUT_SCHEMA);
    expect(tool.inputSchema).toEqual({
      type: "object",
      properties: {
        maritalStatus: {
          type: "string",
          enum: ["unmarried", "married"],
          description: expect.any(String),
        },
        dependentCount: {
          type: "integer",
          minimum: 0,
          maximum: 3,
          description: expect.any(String),
        },
      },
      required: ["maritalStatus", "dependentCount"],
      additionalProperties: false,
    });
    expect(tool.annotations).toEqual({ readOnlyHint: false });
  });

  it("does not register when the signal is already aborted", async () => {
    const { deps } = fakeDeps(fixtureReturn(fixtureData()));
    const { modelContext, registered } = fakeModelContext();
    const controller = new AbortController();
    controller.abort();
    await registerTaxReturnTools(modelContext, deps, controller.signal);
    expect(registered).toHaveLength(0);
  });
});

// ---- read tool ----

describe("get_tax_return_context", () => {
  it("reports an unconfirmed profile for a provisional PTKP and hides identifiers", async () => {
    const { read } = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = (await read()) as { ok: true; context: Record<string, unknown> };
    expect(result.ok).toBe(true);
    expect(result.context).toMatchObject({
      returnId: "00000000-0000-4000-8000-000000000001",
      taxYear: 2025,
      formType: "1770 S",
      status: "DRAFT",
      editable: true,
      taxpayerProfile: null,
      currentPtkpCode: "TK/0",
      profileConfirmed: false,
      missingFields: ["maritalStatus", "dependentCount"],
    });
    expect(result.context.suggestedQuestion).toEqual({
      id: expect.any(String),
      en: "Were you married at the end of the tax year, and how many eligible dependants did you support (from zero to three)?",
    });
    const json = JSON.stringify(result);
    for (const leak of [
      "00.000.000.0-000.000",
      "0000000000000000",
      "Wajib Pajak Sintetis",
      "PT Contoh Sintetis",
      "user_id",
      "employmentSlips",
      "declarationAgree",
    ]) {
      expect(json).not.toContain(leak);
    }
  });

  it("reads the latest return on every call, not a captured one", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const before = (await fakes.read()) as { context: { profileConfirmed: boolean }; nextStep: unknown };
    expect(before.context.profileConfirmed).toBe(false);
    expect(before.nextStep).toEqual(FORM_STAY_NEXT_STEP);
    await fakes.deps.saveProfile({ maritalStatus: "married", dependentCount: 2 });
    const after = (await fakes.read()) as { context: { profileConfirmed: boolean; currentPtkpCode: string }; nextStep: unknown };
    expect(after.context.profileConfirmed).toBe(true);
    expect(after.context.currentPtkpCode).toBe("K/2");
    expect(after.nextStep).toEqual(FORM_DONE_NEXT_STEP);
  });
});

// ---- write tool ----

describe("update_taxpayer_profile", () => {
  it.each(MAPPING)("saves %j and reports %s from the canonical return", async (profile, code) => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.update({ ...profile });
    expect(result).toEqual({
      ok: true,
      changed: {
        section: "taxpayerProfile",
        maritalStatus: profile.maritalStatus,
        dependentCount: profile.dependentCount,
        ptkpCode: code,
      },
      message: `Saved the confirmed taxpayer profile and updated PTKP to ${code}.`,
      context: expect.objectContaining({
        taxpayerProfile: profile,
        currentPtkpCode: code,
        profileConfirmed: true,
        missingFields: [],
        suggestedQuestion: null,
        status: "DRAFT",
      }),
      nextStep: FORM_DONE_NEXT_STEP,
    });
    expect(fakes.saveCalls).toEqual([profile]);
    expect(fakes.getCurrent().data.identity?.ptkp).toBe(code);
    expect(fakes.getCurrent().data.filingProfile).toEqual(profile);
  });

  it("matches the spec example for married + 1", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = (await fakes.update({ maritalStatus: "married", dependentCount: 1 })) as UpdateTaxpayerProfileResult;
    expect(result.changed).toEqual({
      section: "taxpayerProfile",
      maritalStatus: "married",
      dependentCount: 1,
      ptkpCode: "K/1",
    });
    expect(result.message).toBe("Saved the confirmed taxpayer profile and updated PTKP to K/1.");
  });

  it("reveals the update only after a successful save, with the saved return", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    await fakes.update({ maritalStatus: "unmarried", dependentCount: 0 });
    expect(fakes.revealCalls).toHaveLength(1);
    expect(fakes.revealCalls[0]).toBe(fakes.getCurrent());
    expect(fakes.revealCalls[0].data.identity?.ptkp).toBe("TK/0");
  });

  it("preserves unrelated data through the write path", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    await fakes.update({ maritalStatus: "married", dependentCount: 3 });
    const saved = fakes.getCurrent().data;
    expect(saved.identity?.signer).toBe("wp");
    expect(saved.income).toEqual({ employment: 120_000_000 });
    expect(saved.credits).toEqual({ withholding: 3_000_000 });
    expect(saved.answers).toEqual({ q1a: "ya" });
    expect(saved.family).toHaveLength(1);
    expect(saved.declarationAgree).toBe(false);
  });

  it("is idempotent for a repeated identical update", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const first = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    const second = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    expect(second).toEqual(first);
    expect(fakes.getCurrent().status).toBe("DRAFT");
    expect(fakes.getCurrent().data.filingProfile).toEqual({ maritalStatus: "married", dependentCount: 1 });
    expect(fakes.saveCalls).toHaveLength(2);
  });

  it("accepts a REJECTED return as editable", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData(), "REJECTED"));
    const result = await fakes.update({ maritalStatus: "married", dependentCount: 0 });
    expect(result.ok).toBe(true);
    expect(fakes.saveCalls).toHaveLength(1);
  });

  it.each(["WAITING_PAYMENT", "REPORTED"] as const)(
    "rejects a %s return without saving or revealing",
    async (status) => {
      const fakes = await registerWithFakes(fixtureReturn(fixtureData(), status));
      const result = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
      expect(result).toEqual({
        ok: false,
        error: { code: "RETURN_NOT_EDITABLE", message: expect.stringContaining(status) },
      });
      expect(fakes.saveCalls).toHaveLength(0);
      expect(fakes.revealCalls).toHaveLength(0);
      expect(fakes.getCurrent().data.filingProfile).toBeUndefined();
    },
  );

  it.each([
    ["missing dependentCount", { maritalStatus: "married" }],
    ["missing maritalStatus", { dependentCount: 1 }],
    ["extra property", { maritalStatus: "married", dependentCount: 1, ptkpCode: "K/1" }],
    ["unknown status", { maritalStatus: "single", dependentCount: 1 }],
    ["string count", { maritalStatus: "married", dependentCount: "1" }],
    ["count too high", { maritalStatus: "married", dependentCount: 4 }],
    ["negative count", { maritalStatus: "married", dependentCount: -1 }],
    ["fractional count", { maritalStatus: "married", dependentCount: 1.5 }],
    ["null input", null],
    ["array input", []],
    ["empty object", {}],
  ])("rejects invalid input (%s) before any save", async (_label, input) => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.update(input);
    expect(result).toEqual({
      ok: false,
      error: { code: "INVALID_PROFILE", message: expect.any(String) },
    });
    expect(fakes.saveCalls).toHaveLength(0);
    expect(fakes.revealCalls).toHaveLength(0);
  });

  it("checks validity before editability", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData(), "REPORTED"));
    const result = await fakes.update({ maritalStatus: "married" });
    expect((result as TaxToolFailure).error.code).toBe("INVALID_PROFILE");
  });

  it("returns SAVE_FAILED and keeps the previous state when persistence rejects", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()), { failSave: true });
    const result = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    expect(result).toEqual({
      ok: false,
      error: { code: "SAVE_FAILED", message: expect.any(String) },
    });
    expect(fakes.saveCalls).toHaveLength(1);
    expect(fakes.revealCalls).toHaveLength(0);
    expect(fakes.getCurrent().data.filingProfile).toBeUndefined();
    expect(fakes.getCurrent().data.identity?.ptkp).toBe("TK/0");
    const read = (await fakes.read()) as { context: { profileConfirmed: boolean } };
    expect(read.context.profileConfirmed).toBe(false);
  });

  it("still succeeds if the presentation callback throws after a persisted save", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    fakes.deps.revealProfileUpdate = () => {
      throw new Error("scroll failed");
    };
    const result = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    expect(result.ok).toBe(true);
  });

  it("does not leak identifiers or unrelated data in the success result", async () => {
    const fakes = await registerWithFakes(fixtureReturn(fixtureData()));
    const result = await fakes.update({ maritalStatus: "married", dependentCount: 1 });
    const json = JSON.stringify(result);
    for (const leak of [
      "00.000.000.0-000.000",
      "0000000000000000",
      "Wajib Pajak Sintetis",
      "PT Contoh Sintetis",
      "user_id",
    ]) {
      expect(json).not.toContain(leak);
    }
  });
});

describe("parseProfileInput", () => {
  it("returns a fresh object with only the two fields", () => {
    const input = { maritalStatus: "unmarried", dependentCount: 3 };
    const parsed = parseProfileInput(input);
    expect(parsed).toEqual(input);
    expect(parsed).not.toBe(input);
  });
});
