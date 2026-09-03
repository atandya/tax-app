import { describe, expect, it, vi } from "vitest";
import type { SptReturn } from "./spt";
import { SptSaveError } from "./spt-api";
import type { ModelContext, WebMcpTool } from "./webmcp";
import {
  CREATE_TAX_RETURN_DESCRIPTION,
  CREATE_TAX_RETURN_TOOL,
  DASHBOARD_TOOL_NAMES,
  LIST_TAX_RETURNS_DESCRIPTION,
  LIST_TAX_RETURNS_TOOL,
  OPEN_TAX_RETURN_DESCRIPTION,
  OPEN_TAX_RETURN_TOOL,
  registerDashboardTools,
  summarizeReturn,
  type DashboardToolDependencies,
} from "./webmcp-dashboard-tools";

const SEED_ID = "00000000-0000-4000-8000-000000000001";
const REPORTED_ID = "00000000-0000-4000-8000-000000000003";

function fixtureReturn(overrides: Partial<SptReturn> = {}): SptReturn {
  return {
    id: SEED_ID,
    user_id: "00000000-0000-4000-8000-000000000002",
    tax_year: 2025,
    form_type: "1770 S",
    status: "DRAFT",
    data: {
      identity: { ptkp: "K/1", signer: "wp" },
      income: { employment: 120_000_000 },
      family: [{ name: "Synthetic Child", nik: "0000000000000000" }],
    },
    pph_owed: 1,
    pph_credit: 2,
    balance_due: 3,
    payment_status: "Kurang Bayar",
    rejection_reason: null,
    reviewed_at: null,
    submitted_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    computed: {
      totalNet: 0, netAfterDeduction: 0, ptkpAmount: 63_000_000, taxableIncome: 0,
      pphOwed: 1, pphCredit: 2, balanceDue: 3, paymentStatus: "Kurang Bayar",
    },
    taxpayer_name: "Wajib Pajak Sintetis",
    taxpayer_npwp: "00.000.000.0-000.000",
    taxpayer_username: "synthetic",
    ...overrides,
  };
}

function fakeModelContext() {
  const registered: Array<{ tool: WebMcpTool; options?: WebMCP.ModelContextRegisterToolOptions }> = [];
  const modelContext = {
    registerTool: vi.fn(async (tool: WebMcpTool, options?: WebMCP.ModelContextRegisterToolOptions) => {
      registered.push({ tool, options });
    }),
  } as unknown as ModelContext;
  return { modelContext, registered };
}

function fakeDeps(initial: SptReturn[], opts: { createError?: Error; openError?: Error } = {}) {
  let returns = initial;
  const opened: string[] = [];
  const created: number[] = [];
  const deps: DashboardToolDependencies = {
    getReturns: () => returns,
    createDraft: async (taxYear) => {
      created.push(taxYear);
      if (opts.createError) throw opts.createError;
      const row = fixtureReturn({ id: `created-${taxYear}`, tax_year: taxYear, data: {} });
      returns = [row, ...returns];
      return row;
    },
    openReturn: (id) => {
      opened.push(id);
      if (opts.openError) throw opts.openError;
    },
  };
  return { deps, opened, created, getReturns: () => returns };
}

async function setup(initial: SptReturn[], opts?: { createError?: Error; openError?: Error }) {
  const fakes = fakeDeps(initial, opts);
  const { modelContext, registered } = fakeModelContext();
  const controller = new AbortController();
  await registerDashboardTools(modelContext, fakes.deps, controller.signal);
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
    list: () => byName(LIST_TAX_RETURNS_TOOL).execute({}, execOpts),
    open: (input: unknown) => byName(OPEN_TAX_RETURN_TOOL).execute(input as Record<string, unknown>, execOpts),
    create: (input: unknown) => byName(CREATE_TAX_RETURN_TOOL).execute(input as Record<string, unknown>, execOpts),
  };
}

const FORM_NEXT = {
  page: "tax_return",
  tools: ["get_tax_return_context", "update_taxpayer_profile", "update_income_and_credits", "add_assets", "add_family_members", "add_debts", "add_withholding_slips", "update_return_answers"],
  hint: "Call get_tax_return_context first, then ask the user only for the missing facts.",
};

describe("summarizeReturn", () => {
  it("exposes only the summary fields", () => {
    expect(summarizeReturn(fixtureReturn())).toEqual({
      returnId: SEED_ID, taxYear: 2025, formType: "1770 S", status: "DRAFT", editable: true, profileConfirmed: false,
    });
    const confirmed = fixtureReturn({
      status: "REPORTED",
      data: { filingProfile: { maritalStatus: "married", dependentCount: 1 }, identity: { ptkp: "K/1" } },
    });
    expect(summarizeReturn(confirmed)).toMatchObject({ editable: false, profileConfirmed: true });
  });
});

describe("registerDashboardTools discovery metadata", () => {
  it("registers exactly the three dashboard tools in order under one signal", async () => {
    const { registered, controller } = await setup([fixtureReturn()]);
    expect(registered.map((r) => r.tool.name)).toEqual([...DASHBOARD_TOOL_NAMES]);
    for (const r of registered) expect(r.options?.signal).toBe(controller.signal);
    expect(registered[0].tool.annotations).toEqual({ readOnlyHint: true });
    expect(registered[1].tool.annotations).toEqual({ readOnlyHint: false });
    expect(registered[2].tool.annotations).toEqual({ readOnlyHint: false });
    expect(registered[0].tool.description).toBe(LIST_TAX_RETURNS_DESCRIPTION);
    expect(registered[1].tool.description).toBe(OPEN_TAX_RETURN_DESCRIPTION);
    expect(registered[2].tool.description).toBe(CREATE_TAX_RETURN_DESCRIPTION);
  });

  it("uses closed schemas with the supported years and no form-type field", async () => {
    const { registered } = await setup([]);
    expect(registered[0].tool.inputSchema).toEqual({ type: "object", properties: {}, additionalProperties: false });
    expect(registered[1].tool.inputSchema).toEqual({
      type: "object",
      properties: { returnId: { type: "string", description: expect.any(String) } },
      required: ["returnId"],
      additionalProperties: false,
    });
    expect(registered[2].tool.inputSchema).toEqual({
      type: "object",
      properties: { taxYear: { type: "integer", enum: [2025, 2024, 2023], description: expect.any(String) } },
      required: ["taxYear"],
      additionalProperties: false,
    });
  });

  it("never registers a delete, declaration, or submission tool", async () => {
    const { registered } = await setup([]);
    const names = registered.map((r) => r.tool.name.toLowerCase());
    for (const banned of ["delete", "hapus", "submit", "declar", "lapor", "approve", "reject"]) {
      expect(names.some((n) => n.includes(banned)), `no tool name contains "${banned}"`).toBe(false);
    }
  });
});

describe("list_tax_returns", () => {
  it("returns summaries only and points to open_tax_return when an editable one exists", async () => {
    const { list } = await setup([fixtureReturn(), fixtureReturn({ id: REPORTED_ID, tax_year: 2024, status: "REPORTED" })]);
    const result = await list();
    expect(result).toEqual({
      ok: true,
      returns: [
        { returnId: SEED_ID, taxYear: 2025, formType: "1770 S", status: "DRAFT", editable: true, profileConfirmed: false },
        { returnId: REPORTED_ID, taxYear: 2024, formType: "1770 S", status: "REPORTED", editable: false, profileConfirmed: false },
      ],
      nextStep: {
        page: "dashboard",
        tools: ["open_tax_return", "create_tax_return"],
        hint: "Open an editable return with open_tax_return.",
      },
    });
    const json = JSON.stringify(result);
    for (const leak of ["Sintetis", "00.000.000", "synthetic", "Kurang Bayar", "120000000", "Synthetic Child", "\"data\"", "user_id"]) {
      expect(json).not.toContain(leak);
    }
  });

  it("points to create_tax_return when nothing is editable", async () => {
    const { list } = await setup([fixtureReturn({ status: "REPORTED" })]);
    expect(await list()).toMatchObject({
      nextStep: { hint: "No editable return exists; create one with create_tax_return." },
    });
  });

  it("reads the latest list on every call", async () => {
    const { list, create } = await setup([]);
    expect(await list()).toMatchObject({ returns: [] });
    await create({ taxYear: 2024 });
    expect(await list()).toMatchObject({ returns: [{ taxYear: 2024 }] });
  });
});

describe("open_tax_return", () => {
  it("navigates to a listed return and announces the form tools", async () => {
    const { open, opened } = await setup([fixtureReturn()]);
    expect(await open({ returnId: SEED_ID })).toEqual({
      ok: true,
      opened: { returnId: SEED_ID, taxYear: 2025, formType: "1770 S", status: "DRAFT", editable: true, profileConfirmed: false },
      message: "Opening the 2025 1770 S return.",
      nextStep: FORM_NEXT,
    });
    expect(opened).toEqual([SEED_ID]);
  });

  it("reports RETURN_NOT_FOUND for a well-formed id that is not listed", async () => {
    const { open, opened } = await setup([fixtureReturn()]);
    expect(await open({ returnId: "nope" })).toMatchObject({ ok: false, error: { code: "RETURN_NOT_FOUND" } });
    expect(opened).toEqual([]);
  });

  it("reports RETURN_NOT_FOUND for a well-formed id when the list is empty", async () => {
    const { open, opened } = await setup([]);
    expect(await open({ returnId: SEED_ID })).toMatchObject({ ok: false, error: { code: "RETURN_NOT_FOUND" } });
    expect(opened).toEqual([]);
  });

  it("rejects empty, non-string, missing, and extra-property input as INVALID_INPUT without navigating", async () => {
    const { open, opened } = await setup([fixtureReturn()]);
    for (const input of [{ returnId: "" }, { returnId: 5 }, {}, { returnId: SEED_ID, extra: 1 }]) {
      expect(await open(input)).toMatchObject({ ok: false, error: { code: "INVALID_INPUT" } });
    }
    expect(opened).toEqual([]);
  });

  it("reports NAVIGATION_FAILED when the router throws", async () => {
    const { open } = await setup([fixtureReturn()], { openError: new Error("router") });
    expect(await open({ returnId: SEED_ID })).toMatchObject({ ok: false, error: { code: "NAVIGATION_FAILED" } });
  });
});

describe("create_tax_return", () => {
  it("rejects unsupported years before any request", async () => {
    const { create, created } = await setup([]);
    for (const input of [{ taxYear: 2022 }, { taxYear: "2025" }, { taxYear: 2025.5 }, {}, { taxYear: 2025, formType: "1770" }]) {
      expect(await create(input)).toMatchObject({ ok: false, error: { code: "INVALID_TAX_YEAR" } });
    }
    expect(created).toEqual([]);
  });

  it("refuses a duplicate editable year and returns the existing id", async () => {
    const { create, created, opened } = await setup([fixtureReturn({ status: "REJECTED" })]);
    expect(await create({ taxYear: 2025 })).toEqual({
      ok: false,
      error: {
        code: "RETURN_ALREADY_EXISTS",
        message: "An editable 2025 return already exists. Open it with open_tax_return instead of creating another.",
        existingReturnId: SEED_ID,
      },
    });
    expect(created).toEqual([]);
    expect(opened).toEqual([]);
  });

  it("refuses a REPORTED year even though it is no longer editable", async () => {
    const { create, created, opened } = await setup([fixtureReturn({ status: "REPORTED" })]);
    expect(await create({ taxYear: 2025 })).toMatchObject({
      ok: false,
      error: { code: "RETURN_ALREADY_EXISTS", existingReturnId: SEED_ID },
    });
    expect(created).toEqual([]);
    expect(opened).toEqual([]);
  });

  it("refuses a WAITING_PAYMENT year even though it is no longer editable", async () => {
    const { create, created, opened } = await setup([fixtureReturn({ status: "WAITING_PAYMENT" })]);
    expect(await create({ taxYear: 2025 })).toMatchObject({
      ok: false,
      error: { code: "RETURN_ALREADY_EXISTS", existingReturnId: SEED_ID },
    });
    expect(created).toEqual([]);
    expect(opened).toEqual([]);
  });

  it("creates a 1770 S draft, opens it, and announces the form tools", async () => {
    const { create, created, opened } = await setup([fixtureReturn()]);
    expect(await create({ taxYear: 2023 })).toEqual({
      ok: true,
      created: { returnId: "created-2023", taxYear: 2023, formType: "1770 S", status: "DRAFT", editable: true, profileConfirmed: false },
      message: "Created a 2023 1770 S draft and opening it.",
      nextStep: FORM_NEXT,
    });
    expect(created).toEqual([2023]);
    expect(opened).toEqual(["created-2023"]);
  });

  it("maps a backend or network failure to CREATE_FAILED", async () => {
    const { create, opened } = await setup([], { createError: new SptSaveError("Gagal membuat SPT.", 500) });
    expect(await create({ taxYear: 2024 })).toMatchObject({ ok: false, error: { code: "CREATE_FAILED" } });
    expect(opened).toEqual([]);
  });

  it("maps a server-side 409 duplicate to RETURN_ALREADY_EXISTS without an existingReturnId", async () => {
    const { create, opened } = await setup([], {
      createError: new SptSaveError("SPT tahun 2024 sudah ada.", 409),
    });
    const result = await create({ taxYear: 2024 });
    // toEqual is exact on object shape, so this also proves no
    // existingReturnId key is present (the page cannot know the id).
    expect(result).toEqual({
      ok: false,
      error: {
        code: "RETURN_ALREADY_EXISTS",
        message:
          "The website reports a return already exists for that year. Call list_tax_returns to find it, then open it with open_tax_return.",
      },
    });
    expect(opened).toEqual([]);
  });

  it("reports NAVIGATION_FAILED with the created id when routing throws after creation", async () => {
    const { create, getReturns } = await setup([], { openError: new Error("router") });
    const result = await create({ taxYear: 2024 });
    expect(result).toMatchObject({ ok: false, error: { code: "NAVIGATION_FAILED", existingReturnId: "created-2024" } });
    expect(JSON.stringify(result)).toContain("open_tax_return");
    expect(getReturns().map((r) => r.id)).toEqual(["created-2024"]);
  });
});
