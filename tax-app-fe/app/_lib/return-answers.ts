// Standalone Yes/No questions on the main form saved through the assistant.
// Pure, client-safe module. Covers only questions that carry no amount of
// their own; the amount-bearing ones (1.a–1.d, 3, 10.a) are set by their
// section tools so an answer can never contradict its figure.

import type { SptData, YaTidak } from "./spt";

export const RETURN_QUESTION_IDS = [
  "q8",
  "q10d",
  "q11b",
  "q13a",
  "q13b",
  "q13c",
  "q14b",
  "q14c",
  "q14d",
  "q14e",
  "q14f",
  "q14g",
] as const;
export type ReturnQuestionId = (typeof RETURN_QUESTION_IDS)[number];

/** Form section that renders each question; used to reveal the right row. */
export const RETURN_QUESTION_SECTION: Record<ReturnQuestionId, string> = {
  q8: "tax",
  q10d: "credits",
  q11b: "balance",
  q13a: "installment",
  q13b: "installment",
  q13c: "installment",
  q14b: "other",
  q14c: "other",
  q14d: "other",
  q14e: "other",
  q14f: "other",
  q14g: "other",
};

/** English wording the agent sees in the schema, matching the form's labels. */
export const RETURN_QUESTION_TEXT: Record<ReturnQuestionId, string> = {
  q8: "8. Are there any reductions to the tax owed?",
  q10d: "10.d Did you receive a refund of foreign tax credits already claimed?",
  q11b: "11.b Is there a decision letter granting instalments or deferred payment?",
  q13a: "13.a Do you receive regular income and owe Article 25 instalments next year?",
  q13b: "13.b Have you prepared your own calculation of next year's Article 25 instalments?",
  q13c: "13.c Will you pay Article 25 instalments as a certain-turnover taxpayer next year?",
  q14b: "14.b Did you hold any debts at the end of the tax year?",
  q14c: "14.c Did you receive income subject to final income tax?",
  q14d: "14.d Did you receive income that is not an object of tax?",
  q14e: "14.e Did you report fiscal depreciation or amortisation?",
  q14f: "14.f Did you report entertainment, promotion, benefit-in-kind or bad debt costs?",
  q14g: "14.g Did you receive foreign dividends or other income as a non-taxable object?",
};

export type YesNo = "yes" | "no";
export type ReturnAnswersInput = Partial<Record<ReturnQuestionId, YesNo>>;

export function isReturnQuestionId(value: unknown): value is ReturnQuestionId {
  return (RETURN_QUESTION_IDS as readonly unknown[]).includes(value);
}

/** Application-side re-validation of tool input. Mirrors the JSON schema:
 *  only known question ids, each "yes" or "no", at least one. */
export function parseReturnAnswersInput(input: unknown): ReturnAnswersInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const r = input as Record<string, unknown>;
  const keys = Object.keys(r);
  if (keys.length === 0) return null;
  const out: ReturnAnswersInput = {};
  for (const key of keys) {
    if (!isReturnQuestionId(key)) return null;
    const v = r[key];
    if (v !== "yes" && v !== "no") return null;
    out[key] = v;
  }
  return out;
}

const toYaTidak = (v: YesNo): YaTidak => (v === "yes" ? "ya" : "tidak");

/** Returns a new `SptData` with the given answers applied. Never mutates
 *  `data`; every unrelated field and answer is carried over as-is. */
export function applyReturnAnswers(data: SptData, input: ReturnAnswersInput): SptData {
  const answers: Record<string, YaTidak> = { ...data.answers };
  for (const key of RETURN_QUESTION_IDS) {
    const v = input[key];
    if (v !== undefined) answers[key] = toYaTidak(v);
  }
  return { ...data, answers };
}

/** Each standalone question as yes, no, or unanswered. No amounts, no names. */
export type QuestionSummary = Record<ReturnQuestionId, YesNo | "unanswered">;

export function summarizeReturnQuestions(data: SptData): QuestionSummary {
  const out = {} as QuestionSummary;
  for (const key of RETURN_QUESTION_IDS) {
    const v = data.answers?.[key];
    out[key] = v === "ya" ? "yes" : v === "tidak" ? "no" : "unanswered";
  }
  return out;
}
