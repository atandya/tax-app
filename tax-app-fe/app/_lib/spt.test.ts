import { describe, expect, it } from "vitest";
import { isSupportedTaxYear } from "./spt";

describe("isSupportedTaxYear", () => {
  it.each([2025, 2024, 2023])("accepts %s", (year) => {
    expect(isSupportedTaxYear(year)).toBe(true);
  });

  it.each([2022, 2026, "2025", 2025.5, NaN, null, undefined, true])(
    "rejects %s",
    (value) => {
      expect(isSupportedTaxYear(value)).toBe(false);
    },
  );
});
