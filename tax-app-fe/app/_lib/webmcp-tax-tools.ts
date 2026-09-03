// WebMCP tool contracts for the taxpayer-profile vertical slice.
// Framework-free: the SPT detail page supplies live state and persistence
// through `TaxToolDependencies`; this module owns names, descriptions,
// schemas, validation, and structured results. It never logs arguments,
// taxpayer data, or backend responses.

import {
  buildTaxReturnContext,
  derivePtkpCode,
  isDependentCount,
  isEditableStatus,
  isFilingProfile,
  isMaritalStatus,
  type DependentCount,
  type FilingProfile,
  type MaritalStatus,
  type TaxReturnContext,
} from "./filing-profile";
import {
  ASSET_CODES,
  parseAddAssetsInput,
  type AddAssetsInput,
} from "./assets";
import { parseAddDebtsInput, type AddDebtsInput } from "./debts";
import {
  parseAddWithholdingSlipsInput,
  type AddWithholdingSlipsInput,
} from "./withholding-slips";
import {
  RETURN_QUESTION_IDS,
  RETURN_QUESTION_SECTION,
  RETURN_QUESTION_TEXT,
  parseReturnAnswersInput,
  type ReturnAnswersInput,
  type ReturnQuestionId,
} from "./return-answers";
import {
  parseAddFamilyMembersInput,
  type AddFamilyMembersInput,
} from "./family";
import {
  parseIncomeAndCreditsInput,
  type IncomeAndCreditsInput,
} from "./income-and-credits";
import type { SptReturn } from "./spt";
import {
  failure,
  FORM_TOOL_NAMES,
  registerAll,
  type ModelContext,
  type NextStep,
  type ToolFailure,
  type WebMcpTool,
} from "./webmcp";

export type TaxTool = WebMcpTool;
export type TaxModelContext = ModelContext;

export const GET_TAX_RETURN_CONTEXT_TOOL = FORM_TOOL_NAMES[0];
export const UPDATE_TAXPAYER_PROFILE_TOOL = FORM_TOOL_NAMES[1];
export const UPDATE_INCOME_AND_CREDITS_TOOL = FORM_TOOL_NAMES[2];
export const ADD_ASSETS_TOOL = FORM_TOOL_NAMES[3];
export const ADD_FAMILY_MEMBERS_TOOL = FORM_TOOL_NAMES[4];
export const ADD_DEBTS_TOOL = FORM_TOOL_NAMES[5];
export const ADD_WITHHOLDING_SLIPS_TOOL = FORM_TOOL_NAMES[6];
export const UPDATE_RETURN_ANSWERS_TOOL = FORM_TOOL_NAMES[7];

export const UPDATE_RETURN_ANSWERS_DESCRIPTION =
  "Answer the standalone Yes/No questions on the active Indonesian individual tax return (questions 8, 10.d, 11.b, 13.a–13.c, and 14.b–14.g) exactly as the user stated them. Pass only the questions the user actually answered. Do not use this for questions that carry an amount (income, zakat, withholding credit); those are set by update_income_and_credits, add_debts, and add_withholding_slips. Never guess an answer; a salaried employee with no other activity usually answers no to most of these, but confirm with the user. This modifies the visible draft but does not submit it.";

const YES_NO = { type: "string", enum: ["yes", "no"] } as const;

export const UPDATE_RETURN_ANSWERS_INPUT_SCHEMA = {
  type: "object",
  properties: Object.fromEntries(
    RETURN_QUESTION_IDS.map((id) => [id, { ...YES_NO, description: RETURN_QUESTION_TEXT[id] }]),
  ) as Record<ReturnQuestionId, { type: "string"; enum: readonly ["yes", "no"]; description: string }>,
  additionalProperties: false,
  minProperties: 1,
} as const;
export const TAX_TOOL_NAMES = FORM_TOOL_NAMES;

export const FORM_STAY_NEXT_STEP = {
  page: "tax_return",
  tools: FORM_TOOL_NAMES,
  hint: "Ask the user only for the missing facts, then save them with update_taxpayer_profile.",
} as const satisfies NextStep;

export const FORM_INCOME_NEXT_STEP = {
  page: "tax_return",
  tools: FORM_TOOL_NAMES,
  hint: "The taxpayer profile is saved. Ask the user for their employer, annual gross salary, deductions, and tax withheld, then save them with update_income_and_credits. If the user has a 1721-A1 withholding certificate, record it with add_withholding_slips instead of typing the credit; the website sums the slips into line 10.a. The website computes the tax.",
} as const satisfies NextStep;

export const ADD_WITHHOLDING_SLIPS_DESCRIPTION =
  "Add withholding certificates (bukti potong, such as form 1721-A1 from an employer) the user has to the active Indonesian individual tax return, one row per certificate: who withheld the tax, the tax type, and the amount withheld in whole rupiah; tax base, withholder NPWP, slip number, and date only when the user gives them. By default the website then sets the withholding credit on line 10.a to the sum of all slips. Rows are appended unless replaceExisting is true. Never invent amounts, numbers, or dates. This modifies the visible draft but does not submit it.";

export const ADD_WITHHOLDING_SLIPS_INPUT_SCHEMA = {
  type: "object",
  properties: {
    slips: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      description: "One entry per withholding certificate.",
      items: {
        type: "object",
        properties: {
          withholderName: { type: "string", minLength: 1, maxLength: 120, description: "Employer or payer that withheld the tax." },
          taxType: {
            type: "string",
            enum: ["pph21", "pph22", "pph23", "pph24", "pph26", "final_4_2"],
            description: "pph21 = salary withholding (1721-A1/A2); pph23 = services, dividends, interest, rent; pph22 = import/purchases; pph24 = foreign tax credit; pph26 = non-resident; final_4_2 = final tax such as bank interest or building rent.",
          },
          amount: { type: "integer", minimum: 0, description: "Tax withheld in whole rupiah, as printed on the certificate." },
          taxBase: { type: "integer", minimum: 0, description: "Gross amount the tax was computed on, if printed." },
          withholderTaxId: { type: "string", minLength: 1, maxLength: 60, description: "Withholder NPWP, only if the user gives it. Never invent digits." },
          slipNumber: { type: "string", minLength: 1, maxLength: 60, description: "Certificate number, only if the user gives it." },
          date: { type: "string", pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$", description: "Certificate date as YYYY-MM-DD, only if the user gives it." },
        },
        required: ["withholderName", "taxType", "amount"],
        additionalProperties: false,
      },
    },
    replaceExisting: { type: "boolean", description: "true replaces every slip already on the form; default false appends." },
    updateWithholdingCredit: {
      type: "boolean",
      description: "default true: set line 10.a (withholding credit) to the sum of all slips afterwards. Pass false only if the user wants to keep a manually entered credit.",
    },
  },
  required: ["slips"],
  additionalProperties: false,
} as const;

export const FORM_ASSETS_NEXT_STEP = {
  page: "tax_return",
  tools: FORM_TOOL_NAMES,
  hint: "The profile and income are saved. Ask the user what they owned at the end of the tax year (bank accounts, vehicles, property, investments) with each item's current value, then save them with add_assets.",
} as const satisfies NextStep;

export const FORM_FAMILY_NEXT_STEP = {
  page: "tax_return",
  tools: FORM_TOOL_NAMES,
  hint: "The profile claims dependants but none are listed. Ask the user for each dependant's name and relationship (child, adopted child, parent, parent-in-law, sibling, other), then save them with add_family_members.",
} as const satisfies NextStep;

export const FORM_DONE_NEXT_STEP = {
  page: "tax_return",
  tools: FORM_TOOL_NAMES,
  hint: "The profile, income, assets, and dependants are saved and the tax is computed. Ask once whether the user had any loans or credit-card balances at year end and save them with add_debts if so. Then walk through any questions still marked unanswered in context.questions and save the user's answers with update_return_answers. Finally tell the user the result and ask them to review the form and submit it themselves; no tool can declare or submit it.",
} as const satisfies NextStep;

export const ADD_DEBTS_DESCRIPTION =
  "Add year-end debt rows the user described to the active Indonesian individual tax return, one row per loan or balance: bank or finance-company loans, credit-card balances, loans from related parties, or other debts. Each row needs the type and the outstanding balance in whole rupiah as stated by the user; creditor name and ID, country, year borrowed, and a description are optional. Rows are appended unless replaceExisting is true. Never guess balances or creditor details; ask the user. This modifies the visible draft but does not submit it.";

export const ADD_DEBTS_INPUT_SCHEMA = {
  type: "object",
  properties: {
    debts: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      description: "One entry per debt outstanding at the end of the tax year.",
      items: {
        type: "object",
        properties: {
          type: {
            type: "string",
            enum: ["bank_loan", "credit_card", "affiliate_loan", "other"],
            description:
              "bank_loan = bank, mortgage, car or other finance-company loan; credit_card = card balance; affiliate_loan = loan from a related party such as family or own company; other = anything else.",
          },
          balance: {
            type: "integer",
            minimum: 0,
            description: "Outstanding balance at year end in whole rupiah.",
          },
          description: { type: "string", minLength: 1, maxLength: 120, description: "Short label, e.g. \"KPR rumah\" or \"Visa\". Defaults to the type label." },
          creditorName: { type: "string", minLength: 1, maxLength: 120, description: "Lender name, if given." },
          creditorTaxId: { type: "string", minLength: 1, maxLength: 120, description: "Lender NPWP or ID, only if the user gives it. Never invent digits." },
          country: {
            type: "string",
            enum: ["indonesia", "singapore", "malaysia", "hong_kong", "japan", "australia", "united_states", "netherlands", "other"],
            description: "Lender's country. Defaults to indonesia.",
          },
          year: { type: "integer", minimum: 1900, maximum: 2100, description: "Year the loan started, if known." },
          ownership: {
            type: "string",
            enum: ["own", "joint", "undivided_inheritance", "other_party", "other"],
            description: "Ownership note. Defaults to own.",
          },
        },
        required: ["type", "balance"],
        additionalProperties: false,
      },
    },
    replaceExisting: {
      type: "boolean",
      description: "true replaces every debt row already on the form; default false appends.",
    },
  },
  required: ["debts"],
  additionalProperties: false,
} as const;

export const ADD_FAMILY_MEMBERS_DESCRIPTION =
  "Add dependant family members the user named to the active Indonesian individual tax return, one row per person: name and relationship, plus NIK, birth date, and occupation only when the user gives them. Use this for the people behind the dependant count in the taxpayer profile. Rows are appended unless replaceExisting is true. Never invent names, NIKs, or dates. This modifies the visible draft but does not submit it.";

export const ADD_FAMILY_MEMBERS_INPUT_SCHEMA = {
  type: "object",
  properties: {
    members: {
      type: "array",
      minItems: 1,
      maxItems: 10,
      description: "One entry per dependant family member.",
      items: {
        type: "object",
        properties: {
          name: { type: "string", minLength: 1, maxLength: 120, description: "Full name as the user gave it." },
          relation: {
            type: "string",
            enum: ["child", "adopted_child", "parent", "parent_in_law", "sibling", "other"],
            description: "Relationship to the taxpayer.",
          },
          nik: {
            type: "string",
            pattern: "^[0-9]{16}$",
            description: "16-digit national ID number, only if the user gives it. Never invent digits.",
          },
          birthDate: {
            type: "string",
            pattern: "^[0-9]{4}-[0-9]{2}-[0-9]{2}$",
            description: "Birth date as YYYY-MM-DD, only if the user gives it.",
          },
          occupation: { type: "string", minLength: 1, maxLength: 80, description: "Occupation, if stated (e.g. student, retired)." },
        },
        required: ["name", "relation"],
        additionalProperties: false,
      },
    },
    replaceExisting: {
      type: "boolean",
      description: "true replaces every family row already on the form; default false appends.",
    },
  },
  required: ["members"],
  additionalProperties: false,
} as const;

export const ADD_ASSETS_DESCRIPTION =
  "Add year-end asset rows the user described to the active Indonesian individual tax return, one row per item: bank accounts and cash, receivables, investments, vehicles and other movable goods, land and buildings, and other assets. Each row needs the category, the DJP asset code from that category's list, and the current value in whole rupiah as stated by the user. Rows are appended unless replaceExisting is true. Never guess values, codes, or account details; ask the user. This modifies the visible draft but does not submit it.";

const CODE_HELP = (Object.keys(ASSET_CODES) as Array<keyof typeof ASSET_CODES>)
  .map((k) => `${k}: ${ASSET_CODES[k].join("/")}`)
  .join("; ");

const OPTIONAL_TEXT = (description: string) =>
  ({ type: "string", minLength: 1, maxLength: 120, description }) as const;

export const ADD_ASSETS_INPUT_SCHEMA = {
  type: "object",
  properties: {
    assets: {
      type: "array",
      minItems: 1,
      maxItems: 20,
      description: "One entry per asset the user owned at the end of the tax year.",
      items: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["cash", "receivable", "investment", "movable", "property", "other"],
            description:
              "cash = bank accounts, deposits, cash; receivable = money others owe the user; investment = shares, bonds, funds; movable = vehicles, electronics, jewellery, art; property = land and buildings; other = patents, royalties, anything else.",
          },
          code: {
            type: "string",
            pattern: "^[0-9]{3}$",
            description: `Three-digit DJP asset code from the chosen category. Allowed codes: ${CODE_HELP}. Common: 011 cash, 012 savings, 014 deposit, 032 shares, 036 mutual fund, 041 vehicle, 043 electronics/furniture, 044 precious metals, 061 residential land/building.`,
          },
          value: {
            type: "integer",
            minimum: 0,
            description:
              "Current value at year end in whole rupiah: the balance for cash, the outstanding balance for receivables, the current value otherwise.",
          },
          acquisitionPrice: {
            type: "integer",
            minimum: 0,
            description: "Purchase price in whole rupiah, if the user knows it. Defaults to value.",
          },
          year: { type: "integer", minimum: 1900, maximum: 2100, description: "Year acquired, if known." },
          location: {
            type: "string",
            enum: ["domestic", "abroad"],
            description: "Where the asset is held. Defaults to domestic.",
          },
          ownership: {
            type: "string",
            enum: ["own", "joint", "undivided_inheritance", "other_party", "other"],
            description: "Ownership note. Defaults to own.",
          },
          institutionName: OPTIONAL_TEXT("Bank, broker, or fund name for cash and investments."),
          accountNo: OPTIONAL_TEXT("Account number for cash and investments, only if the user gives it."),
          holderName: OPTIONAL_TEXT("Account holder name for cash, only if the user gives it."),
          institutionTaxId: OPTIONAL_TEXT("Institution NPWP for investments, only if the user gives it."),
          address: {
            type: "string",
            minLength: 1,
            maxLength: 240,
            description: "Property address for land and buildings.",
          },
          ownershipProofNo: OPTIONAL_TEXT("Certificate or registration number for vehicles and property."),
          borrowerName: OPTIONAL_TEXT("Who owes the receivable."),
          borrowerTaxId: OPTIONAL_TEXT("Borrower NIK or NPWP, only if the user gives it."),
        },
        required: ["category", "code", "value"],
        additionalProperties: false,
      },
    },
    replaceExisting: {
      type: "boolean",
      description: "true replaces every asset row already on the form; default false appends.",
    },
  },
  required: ["assets"],
  additionalProperties: false,
} as const;

export const GET_TAX_RETURN_CONTEXT_DESCRIPTION =
  "Read the active Indonesian individual tax return's filing status and the minimum missing taxpayer-profile facts. Use this before asking the user for information. This tool does not submit or modify the return.";

export const UPDATE_TAXPAYER_PROFILE_DESCRIPTION =
  "Save marital status and eligible dependant count confirmed by the user for the active Indonesian individual tax return. The website derives the PTKP code. Never guess either value. This modifies the visible draft but does not submit it.";

export const GET_TAX_RETURN_CONTEXT_INPUT_SCHEMA = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

export const UPDATE_TAXPAYER_PROFILE_INPUT_SCHEMA = {
  type: "object",
  properties: {
    maritalStatus: {
      type: "string",
      enum: ["unmarried", "married"],
      description:
        "Marital status at the end of the tax year, exactly as stated by the user.",
    },
    dependentCount: {
      type: "integer",
      minimum: 0,
      maximum: 3,
      description:
        "Number of eligible dependants the user says they supported, from 0 to 3.",
    },
  },
  required: ["maritalStatus", "dependentCount"],
  additionalProperties: false,
} as const;

export const UPDATE_INCOME_AND_CREDITS_DESCRIPTION =
  "Save income, deduction, and tax-credit facts confirmed by the user for the active Indonesian individual tax return, in whole rupiah for the full tax year. Give only the facts the user stated; omit the rest. For salaried work, pass employment with the employer name, annual gross salary, and deductions taken from pay (pension, JHT/JP); the website derives net employment income, sets the related Yes/No answers, and recomputes taxable income, tax owed, credits, and the balance. Never convert monthly figures or estimate deductions yourself; ask the user for annual totals. This modifies the visible draft but does not submit it.";

const RUPIAH = {
  type: "integer",
  minimum: 0,
  description: "Whole rupiah for the full tax year, as stated by the user.",
} as const;

export const UPDATE_INCOME_AND_CREDITS_INPUT_SCHEMA = {
  type: "object",
  properties: {
    employment: {
      type: "object",
      description:
        "The user's salaried employment for the year. Replaces any employment entry already on the form.",
      properties: {
        employerName: {
          type: "string",
          minLength: 1,
          maxLength: 120,
          description: "Employer's name exactly as the user gave it.",
        },
        employerTaxId: {
          type: "string",
          minLength: 1,
          maxLength: 40,
          description:
            "Employer's NPWP or NIK if the user has it; omit when unknown. Never invent digits.",
        },
        grossIncome: {
          ...RUPIAH,
          description: "Annual gross salary including allowances and bonuses.",
        },
        deductions: {
          ...RUPIAH,
          description:
            "Annual deductions taken from pay, such as pension or JHT/JP contributions. 0 if none.",
        },
      },
      required: ["employerName", "grossIncome", "deductions"],
      additionalProperties: false,
    },
    businessIncome: { ...RUPIAH, description: "Net income from business or freelance work." },
    otherIncome: { ...RUPIAH, description: "Other domestic net income, such as rent or prizes." },
    foreignIncome: { ...RUPIAH, description: "Net income earned abroad." },
    zakat: { ...RUPIAH, description: "Zakat or compulsory religious contribution paid to an official body." },
    withholdingCredit: {
      ...RUPIAH,
      description: "Income tax already withheld by employers or other payers (Article 21/23 withholding).",
    },
    installment25: { ...RUPIAH, description: "Article 25 instalments the user paid themselves." },
    stp25: { ...RUPIAH, description: "Article 25 principal paid through a tax collection letter (STP)." },
  },
  additionalProperties: false,
  minProperties: 1,
} as const;

export type TaxToolErrorCode =
  | "RETURN_NOT_EDITABLE"
  | "SAVE_FAILED"
  | "INVALID_PROFILE"
  | "INVALID_INCOME"
  | "INVALID_ASSETS"
  | "INVALID_FAMILY"
  | "INVALID_DEBTS"
  | "INVALID_WITHHOLDING"
  | "INVALID_ANSWERS";

export type TaxToolFailure = ToolFailure<TaxToolErrorCode>;

export interface GetTaxReturnContextResult {
  ok: true;
  context: TaxReturnContext;
  nextStep: NextStep;
}

export interface UpdateTaxpayerProfileResult {
  ok: true;
  changed: {
    section: "taxpayerProfile";
    maritalStatus: MaritalStatus;
    dependentCount: DependentCount;
    ptkpCode: string;
  };
  message: string;
  context: TaxReturnContext;
  nextStep: NextStep;
}

export interface UpdateIncomeAndCreditsResult {
  ok: true;
  changed: {
    section: "incomeAndCredits";
    fields: string[];
    employmentNet?: number;
  };
  message: string;
  context: TaxReturnContext;
  nextStep: NextStep;
}

export interface TaxToolDependencies {
  /** Latest canonical return as currently held by the page. */
  getCurrentReturn(): SptReturn;
  /** Apply the confirmed facts to the latest data, persist through the
   *  authenticated API, adopt the response, and resolve with it. Must reject
   *  on any failure and leave the previous canonical state in place. */
  saveProfile(profile: FilingProfile): Promise<SptReturn>;
  /** Presentation-only: show the Induk PTKP row and a saved-by-assistant notice. */
  revealProfileUpdate(saved: SptReturn): void;
  /** Same contract as `saveProfile`, for income, deduction, and credit facts. */
  saveIncome(facts: IncomeAndCreditsInput): Promise<SptReturn>;
  /** Presentation-only: show the income section and a saved-by-assistant notice. */
  revealIncomeUpdate(saved: SptReturn): void;
  /** Same contract as `saveProfile`, for year-end asset rows. */
  saveAssets(input: AddAssetsInput): Promise<SptReturn>;
  /** Presentation-only: show the assets table and a saved-by-assistant notice. */
  revealAssetsUpdate(saved: SptReturn, added: number): void;
  /** Same contract as `saveProfile`, for dependant family rows. */
  saveFamily(input: AddFamilyMembersInput): Promise<SptReturn>;
  /** Presentation-only: show the family table and a saved-by-assistant notice. */
  revealFamilyUpdate(saved: SptReturn, added: number): void;
  /** Same contract as `saveProfile`, for year-end debt rows. */
  saveDebts(input: AddDebtsInput): Promise<SptReturn>;
  /** Presentation-only: show the debts table and a saved-by-assistant notice. */
  revealDebtsUpdate(saved: SptReturn, added: number): void;
  /** Same contract as `saveProfile`, for withholding certificates. */
  saveWithholdingSlips(input: AddWithholdingSlipsInput): Promise<SptReturn>;
  /** Presentation-only: show the slips table and a saved-by-assistant notice. */
  revealWithholdingUpdate(saved: SptReturn, added: number): void;
  /** Same contract as `saveProfile`, for the standalone Yes/No answers. */
  saveAnswers(input: ReturnAnswersInput): Promise<SptReturn>;
  /** Presentation-only: show the section holding the first answered question. */
  revealAnswersUpdate(saved: SptReturn, count: number, section: string): void;
}

export interface UpdateReturnAnswersResult {
  ok: true;
  changed: {
    section: "questions";
    answered: ReturnQuestionId[];
  };
  message: string;
  context: TaxReturnContext;
  nextStep: NextStep;
}

const INVALID_ANSWERS_MESSAGE =
  "Give at least one of q8, q10d, q11b, q13a, q13b, q13c, q14b, q14c, q14d, q14e, q14f, q14g, each exactly \"yes\" or \"no\", with no other properties. Ask the user rather than guessing.";

const ANSWERS_SAVE_FAILED_MESSAGE =
  "The website could not save the answers. The previously saved values were kept. Ask the user to try again.";

export interface AddWithholdingSlipsResult {
  ok: true;
  changed: {
    section: "withholdingSlips";
    added: number;
    replaced: boolean;
    totalRows: number;
    totalWithheld: number;
    withholdingCredit: number;
  };
  message: string;
  context: TaxReturnContext;
  nextStep: NextStep;
}

const INVALID_WITHHOLDING_MESSAGE =
  "slips must be a non-empty list (max 20) of objects with withholderName, taxType (pph21, pph22, pph23, pph24, pph26, final_4_2), and a whole non-negative rupiah amount; optional fields must match the schema. Ask the user rather than guessing.";

const WITHHOLDING_SAVE_FAILED_MESSAGE =
  "The website could not save the withholding certificates. The previously saved values were kept. Ask the user to try again.";

export interface AddDebtsResult {
  ok: true;
  changed: {
    section: "debts";
    added: number;
    replaced: boolean;
    totalRows: number;
    totalBalance: number;
  };
  message: string;
  context: TaxReturnContext;
  nextStep: NextStep;
}

const INVALID_DEBTS_MESSAGE =
  "debts must be a non-empty list (max 20) of objects with type (bank_loan, credit_card, affiliate_loan, other) and a whole non-negative rupiah balance; optional fields must match the schema. Ask the user rather than guessing.";

const DEBTS_SAVE_FAILED_MESSAGE =
  "The website could not save the debt rows. The previously saved values were kept. Ask the user to try again.";

export interface AddFamilyMembersResult {
  ok: true;
  changed: {
    section: "family";
    added: number;
    replaced: boolean;
    totalRows: number;
  };
  message: string;
  context: TaxReturnContext;
  nextStep: NextStep;
}

const INVALID_FAMILY_MESSAGE =
  "members must be a non-empty list (max 10) of objects with name and relation (child, adopted_child, parent, parent_in_law, sibling, other); nik must be 16 digits and birthDate YYYY-MM-DD when given. Ask the user rather than guessing.";

const FAMILY_SAVE_FAILED_MESSAGE =
  "The website could not save the family members. The previously saved values were kept. Ask the user to try again.";

export interface AddAssetsResult {
  ok: true;
  changed: {
    section: "assets";
    added: number;
    replaced: boolean;
    totalRows: number;
    totalCurrentValue: number;
  };
  message: string;
  context: TaxReturnContext;
  nextStep: NextStep;
}

const INVALID_ASSETS_MESSAGE =
  "assets must be a non-empty list (max 20) of objects with category, a three-digit code from that category's list, and a whole non-negative rupiah value; optional fields must match the schema. Ask the user rather than guessing.";

const ASSETS_SAVE_FAILED_MESSAGE =
  "The website could not save the asset rows. The previously saved values were kept. Ask the user to try again.";

const INVALID_PROFILE_MESSAGE =
  "maritalStatus must be \"unmarried\" or \"married\" and dependentCount must be an integer from 0 to 3, with no other properties. Ask the user rather than guessing.";

const INVALID_INCOME_MESSAGE =
  "Give at least one known property. Amounts must be whole non-negative rupiah for the full year; employment needs employerName, grossIncome, and deductions no larger than grossIncome. Ask the user rather than guessing.";

const SAVE_FAILED_MESSAGE =
  "The website could not save the taxpayer profile. The previously saved values were kept. Ask the user to try again.";

const INCOME_SAVE_FAILED_MESSAGE =
  "The website could not save the income and credit facts. The previously saved values were kept. Ask the user to try again.";

/** Application-side re-validation of tool input. Mirrors the JSON schema:
 *  exactly the two required keys, enum marital status, integer 0–3. */
export function parseProfileInput(input: unknown): FilingProfile | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    return null;
  }
  const keys = Object.keys(input);
  if (keys.length !== 2) return null;
  if (!keys.includes("maritalStatus") || !keys.includes("dependentCount")) {
    return null;
  }
  const { maritalStatus, dependentCount } = input as Record<string, unknown>;
  if (!isMaritalStatus(maritalStatus)) return null;
  if (typeof dependentCount !== "number" || !Number.isInteger(dependentCount)) {
    return null;
  }
  if (!isDependentCount(dependentCount)) return null;
  return { maritalStatus, dependentCount };
}

export async function executeGetTaxReturnContext(
  deps: TaxToolDependencies,
): Promise<GetTaxReturnContextResult> {
  const context = buildTaxReturnContext(deps.getCurrentReturn());
  return {
    ok: true,
    context,
    nextStep: nextStepFor(context),
  };
}

function nextStepFor(context: TaxReturnContext): NextStep {
  if (!context.profileConfirmed) return FORM_STAY_NEXT_STEP;
  const missing = context.sectionsMissing;
  if (missing.includes("employmentIncome") || missing.includes("withholdingCredit")) {
    return FORM_INCOME_NEXT_STEP;
  }
  if (missing.includes("assets")) return FORM_ASSETS_NEXT_STEP;
  if (missing.includes("family")) return FORM_FAMILY_NEXT_STEP;
  return FORM_DONE_NEXT_STEP;
}

export async function executeUpdateReturnAnswers(
  deps: TaxToolDependencies,
  input: unknown,
): Promise<UpdateReturnAnswersResult | TaxToolFailure> {
  const parsed = parseReturnAnswersInput(input);
  if (!parsed) return failure("INVALID_ANSWERS", INVALID_ANSWERS_MESSAGE);

  const current = deps.getCurrentReturn();
  if (!isEditableStatus(current.status)) {
    return failure(
      "RETURN_NOT_EDITABLE",
      `This return has status ${current.status} and can no longer be edited.`,
    );
  }

  let saved: SptReturn;
  try {
    saved = await deps.saveAnswers(parsed);
  } catch {
    return failure("SAVE_FAILED", ANSWERS_SAVE_FAILED_MESSAGE);
  }

  const answered = RETURN_QUESTION_IDS.filter((id) => parsed[id] !== undefined);
  try {
    deps.revealAnswersUpdate(saved, answered.length, RETURN_QUESTION_SECTION[answered[0]]);
  } catch {
    // Presentation failures must not turn a persisted save into an error.
  }

  const context = buildTaxReturnContext(saved);
  return {
    ok: true,
    changed: { section: "questions", answered: [...answered] },
    message: `Saved ${answered.length} answer(s): ${answered.map((id) => `${id}=${context.questions[id]}`).join(", ")}.`,
    context,
    nextStep: nextStepFor(context),
  };
}

export async function executeAddWithholdingSlips(
  deps: TaxToolDependencies,
  input: unknown,
): Promise<AddWithholdingSlipsResult | TaxToolFailure> {
  const parsed = parseAddWithholdingSlipsInput(input);
  if (!parsed) return failure("INVALID_WITHHOLDING", INVALID_WITHHOLDING_MESSAGE);

  const current = deps.getCurrentReturn();
  if (!isEditableStatus(current.status)) {
    return failure(
      "RETURN_NOT_EDITABLE",
      `This return has status ${current.status} and can no longer be edited.`,
    );
  }

  let saved: SptReturn;
  try {
    saved = await deps.saveWithholdingSlips(parsed);
  } catch {
    return failure("SAVE_FAILED", WITHHOLDING_SAVE_FAILED_MESSAGE);
  }

  try {
    deps.revealWithholdingUpdate(saved, parsed.slips.length);
  } catch {
    // Presentation failures must not turn a persisted save into an error.
  }

  const context = buildTaxReturnContext(saved);
  const c = context.computed;
  return {
    ok: true,
    changed: {
      section: "withholdingSlips",
      added: parsed.slips.length,
      replaced: parsed.replaceExisting,
      totalRows: context.withholdingSlips.count,
      totalWithheld: context.withholdingSlips.totalAmount,
      withholdingCredit: context.income.withholdingCredit,
    },
    message: `Saved ${parsed.slips.length} withholding slip(s). The form now lists ${context.withholdingSlips.count} slip(s) totalling ${context.withholdingSlips.totalAmount}; the withholding credit is ${context.income.withholdingCredit} and the balance is ${c.balanceDue} (${c.paymentStatus}).`,
    context,
    nextStep: nextStepFor(context),
  };
}

export async function executeAddDebts(
  deps: TaxToolDependencies,
  input: unknown,
): Promise<AddDebtsResult | TaxToolFailure> {
  const parsed = parseAddDebtsInput(input);
  if (!parsed) return failure("INVALID_DEBTS", INVALID_DEBTS_MESSAGE);

  const current = deps.getCurrentReturn();
  if (!isEditableStatus(current.status)) {
    return failure(
      "RETURN_NOT_EDITABLE",
      `This return has status ${current.status} and can no longer be edited.`,
    );
  }

  let saved: SptReturn;
  try {
    saved = await deps.saveDebts(parsed);
  } catch {
    return failure("SAVE_FAILED", DEBTS_SAVE_FAILED_MESSAGE);
  }

  try {
    deps.revealDebtsUpdate(saved, parsed.debts.length);
  } catch {
    // Presentation failures must not turn a persisted save into an error.
  }

  const context = buildTaxReturnContext(saved);
  return {
    ok: true,
    changed: {
      section: "debts",
      added: parsed.debts.length,
      replaced: parsed.replaceExisting,
      totalRows: context.debts.count,
      totalBalance: context.debts.totalBalance,
    },
    message: `Saved ${parsed.debts.length} debt row(s). The form now lists ${context.debts.count} debt(s) with a total balance of ${context.debts.totalBalance}.`,
    context,
    nextStep: nextStepFor(context),
  };
}

export async function executeAddFamilyMembers(
  deps: TaxToolDependencies,
  input: unknown,
): Promise<AddFamilyMembersResult | TaxToolFailure> {
  const parsed = parseAddFamilyMembersInput(input);
  if (!parsed) return failure("INVALID_FAMILY", INVALID_FAMILY_MESSAGE);

  const current = deps.getCurrentReturn();
  if (!isEditableStatus(current.status)) {
    return failure(
      "RETURN_NOT_EDITABLE",
      `This return has status ${current.status} and can no longer be edited.`,
    );
  }

  let saved: SptReturn;
  try {
    saved = await deps.saveFamily(parsed);
  } catch {
    return failure("SAVE_FAILED", FAMILY_SAVE_FAILED_MESSAGE);
  }

  try {
    deps.revealFamilyUpdate(saved, parsed.members.length);
  } catch {
    // Presentation failures must not turn a persisted save into an error.
  }

  const context = buildTaxReturnContext(saved);
  return {
    ok: true,
    changed: {
      section: "family",
      added: parsed.members.length,
      replaced: parsed.replaceExisting,
      totalRows: context.family.count,
    },
    message: `Saved ${parsed.members.length} family member(s). The form now lists ${context.family.count} dependant(s).`,
    context,
    nextStep: nextStepFor(context),
  };
}

export async function executeAddAssets(
  deps: TaxToolDependencies,
  input: unknown,
): Promise<AddAssetsResult | TaxToolFailure> {
  const parsed = parseAddAssetsInput(input);
  if (!parsed) return failure("INVALID_ASSETS", INVALID_ASSETS_MESSAGE);

  const current = deps.getCurrentReturn();
  if (!isEditableStatus(current.status)) {
    return failure(
      "RETURN_NOT_EDITABLE",
      `This return has status ${current.status} and can no longer be edited.`,
    );
  }

  let saved: SptReturn;
  try {
    saved = await deps.saveAssets(parsed);
  } catch {
    return failure("SAVE_FAILED", ASSETS_SAVE_FAILED_MESSAGE);
  }

  try {
    deps.revealAssetsUpdate(saved, parsed.assets.length);
  } catch {
    // Presentation failures must not turn a persisted save into an error.
  }

  const context = buildTaxReturnContext(saved);
  return {
    ok: true,
    changed: {
      section: "assets",
      added: parsed.assets.length,
      replaced: parsed.replaceExisting,
      totalRows: context.assets.count,
      totalCurrentValue: context.assets.totalCurrentValue,
    },
    message: `Saved ${parsed.assets.length} asset row(s). The form now lists ${context.assets.count} asset(s) worth ${context.assets.totalCurrentValue} in total.`,
    context,
    nextStep: nextStepFor(context),
  };
}

export async function executeUpdateIncomeAndCredits(
  deps: TaxToolDependencies,
  input: unknown,
): Promise<UpdateIncomeAndCreditsResult | TaxToolFailure> {
  const facts = parseIncomeAndCreditsInput(input);
  if (!facts) return failure("INVALID_INCOME", INVALID_INCOME_MESSAGE);

  const current = deps.getCurrentReturn();
  if (!isEditableStatus(current.status)) {
    return failure(
      "RETURN_NOT_EDITABLE",
      `This return has status ${current.status} and can no longer be edited.`,
    );
  }

  let saved: SptReturn;
  try {
    saved = await deps.saveIncome(facts);
  } catch {
    return failure("SAVE_FAILED", INCOME_SAVE_FAILED_MESSAGE);
  }

  try {
    deps.revealIncomeUpdate(saved);
  } catch {
    // Presentation failures must not turn a persisted save into an error.
  }

  const context = buildTaxReturnContext(saved);
  const fields = Object.keys(facts).sort();
  const c = context.computed;
  return {
    ok: true,
    changed: {
      section: "incomeAndCredits",
      fields,
      ...(facts.employment ? { employmentNet: context.income.employmentNet } : {}),
    },
    message: `Saved ${fields.join(", ")}. The website recomputed the return: taxable income ${c.taxableIncome}, tax owed ${c.pphOwed}, credits ${c.pphCredit}, balance ${c.balanceDue} (${c.paymentStatus}).`,
    context,
    nextStep: nextStepFor(context),
  };
}

export async function executeUpdateTaxpayerProfile(
  deps: TaxToolDependencies,
  input: unknown,
): Promise<UpdateTaxpayerProfileResult | TaxToolFailure> {
  const profile = parseProfileInput(input);
  if (!profile) return failure("INVALID_PROFILE", INVALID_PROFILE_MESSAGE);

  const current = deps.getCurrentReturn();
  if (!isEditableStatus(current.status)) {
    return failure(
      "RETURN_NOT_EDITABLE",
      `This return has status ${current.status} and can no longer be edited.`,
    );
  }

  let saved: SptReturn;
  try {
    saved = await deps.saveProfile(profile);
  } catch {
    return failure("SAVE_FAILED", SAVE_FAILED_MESSAGE);
  }

  try {
    deps.revealProfileUpdate(saved);
  } catch {
    // Presentation failures must not turn a persisted save into an error.
  }

  // Report from the canonical saved return, falling back to the validated
  // input only if the backend echoed an unexpected shape.
  const storedProfile = saved.data?.filingProfile;
  const confirmed = isFilingProfile(storedProfile) ? storedProfile : profile;
  const ptkpCode = saved.data?.identity?.ptkp ?? derivePtkpCode(confirmed);

  return {
    ok: true,
    changed: {
      section: "taxpayerProfile",
      maritalStatus: confirmed.maritalStatus,
      dependentCount: confirmed.dependentCount,
      ptkpCode,
    },
    message: `Saved the confirmed taxpayer profile and updated PTKP to ${ptkpCode}.`,
    context: buildTaxReturnContext(saved),
    nextStep: nextStepFor(buildTaxReturnContext(saved)),
  };
}

/** Exactly the eight form tools. No declaration or submission tool exists. */
export function buildTaxReturnTools(deps: TaxToolDependencies): TaxTool[] {
  return [
    {
      name: GET_TAX_RETURN_CONTEXT_TOOL,
      description: GET_TAX_RETURN_CONTEXT_DESCRIPTION,
      inputSchema: GET_TAX_RETURN_CONTEXT_INPUT_SCHEMA,
      annotations: { readOnlyHint: true },
      execute: () => executeGetTaxReturnContext(deps),
    },
    {
      name: UPDATE_TAXPAYER_PROFILE_TOOL,
      description: UPDATE_TAXPAYER_PROFILE_DESCRIPTION,
      inputSchema: UPDATE_TAXPAYER_PROFILE_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeUpdateTaxpayerProfile(deps, input),
    },
    {
      name: UPDATE_INCOME_AND_CREDITS_TOOL,
      description: UPDATE_INCOME_AND_CREDITS_DESCRIPTION,
      inputSchema: UPDATE_INCOME_AND_CREDITS_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeUpdateIncomeAndCredits(deps, input),
    },
    {
      name: ADD_ASSETS_TOOL,
      description: ADD_ASSETS_DESCRIPTION,
      inputSchema: ADD_ASSETS_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeAddAssets(deps, input),
    },
    {
      name: ADD_FAMILY_MEMBERS_TOOL,
      description: ADD_FAMILY_MEMBERS_DESCRIPTION,
      inputSchema: ADD_FAMILY_MEMBERS_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeAddFamilyMembers(deps, input),
    },
    {
      name: ADD_DEBTS_TOOL,
      description: ADD_DEBTS_DESCRIPTION,
      inputSchema: ADD_DEBTS_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeAddDebts(deps, input),
    },
    {
      name: ADD_WITHHOLDING_SLIPS_TOOL,
      description: ADD_WITHHOLDING_SLIPS_DESCRIPTION,
      inputSchema: ADD_WITHHOLDING_SLIPS_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeAddWithholdingSlips(deps, input),
    },
    {
      name: UPDATE_RETURN_ANSWERS_TOOL,
      description: UPDATE_RETURN_ANSWERS_DESCRIPTION,
      inputSchema: UPDATE_RETURN_ANSWERS_INPUT_SCHEMA,
      annotations: { readOnlyHint: false },
      execute: (input) => executeUpdateReturnAnswers(deps, input),
    },
  ];
}

/** Register both tools against one abort signal so a single `abort()`
 *  removes every registration on unmount or navigation. */
export async function registerTaxReturnTools(
  modelContext: TaxModelContext,
  dependencies: TaxToolDependencies,
  signal: AbortSignal,
): Promise<void> {
  await registerAll(modelContext, buildTaxReturnTools(dependencies), signal);
}
