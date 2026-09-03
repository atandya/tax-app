import { describe, expect, it } from "vitest";
import {
  RETURN_QUESTION_IDS,
  RETURN_QUESTION_SECTION,
  RETURN_QUESTION_TEXT,
  applyReturnAnswers,
  parseReturnAnswersInput,
  summarizeReturnQuestions,
} from "./return-answers";
import type { SptData } from "./spt";

function base(): SptData {
  return {
    identity: { ptkp: "K/1", signer: "wp" },
    answers: { q1a: "ya", q14b: "ya" },
    family: [{ name: "Synthetic Child" }],
  };
}

describe("parseReturnAnswersInput", () => {
  it("accepts any subset of the twelve questions", () => {
    expect(parseReturnAnswersInput({ q8: "no", q13a: "yes", q14c: "no" })).toEqual({ q8: "no", q13a: "yes", q14c: "no" });
  });

  it("rejects empty input, unknown questions, amount-bearing questions, and non yes/no values", () => {
    expect(parseReturnAnswersInput({})).toBeNull();
    expect(parseReturnAnswersInput(null)).toBeNull();
    expect(parseReturnAnswersInput({ q99: "yes" })).toBeNull();
    expect(parseReturnAnswersInput({ q1a: "yes" })).toBeNull();
    expect(parseReturnAnswersInput({ q10a: "no" })).toBeNull();
    expect(parseReturnAnswersInput({ q8: "ya" })).toBeNull();
    expect(parseReturnAnswersInput({ q8: true })).toBeNull();
  });

  it("maps every question to a section and a label", () => {
    for (const id of RETURN_QUESTION_IDS) {
      expect(RETURN_QUESTION_SECTION[id]).toBeTruthy();
      expect(RETURN_QUESTION_TEXT[id]).toMatch(/\?$/);
    }
  });
});

describe("applyReturnAnswers", () => {
  it("writes ya/tidak for the given questions only and never mutates", () => {
    const before = base();
    const snapshot = structuredClone(before);
    const next = applyReturnAnswers(before, { q8: "yes", q14b: "no", q13c: "no" });
    expect(before).toEqual(snapshot);
    expect(next.answers).toEqual({ q1a: "ya", q14b: "tidak", q8: "ya", q13c: "tidak" });
    expect(next.family).toEqual(before.family);
    expect(next.identity).toEqual(before.identity);
  });
});

describe("summarizeReturnQuestions", () => {
  it("reports yes, no, or unanswered for each question and nothing else", () => {
    const summary = summarizeReturnQuestions(applyReturnAnswers(base(), { q8: "no" }));
    expect(summary.q8).toBe("no");
    expect(summary.q14b).toBe("yes");
    expect(summary.q13a).toBe("unanswered");
    expect(Object.keys(summary).sort()).toEqual([...RETURN_QUESTION_IDS].sort());
    expect(JSON.stringify(summary)).not.toContain("Synthetic Child");
  });
});
