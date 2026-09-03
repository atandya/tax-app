import { describe, expect, it } from "vitest";
import {
  ASSET_CODES,
  applyAssets,
  describeAssetCode,
  parseAddAssetsInput,
  summarizeAssets,
  toAssetRow,
} from "./assets";
import type { SptData } from "./spt";

function base(): SptData {
  return {
    identity: { ptkp: "K/1", signer: "wp" },
    assets: [{ category: "Kas dan Setara Kas", code: "012", description: "012 - Tabungan", balance: 10_000_000, note: "Milik Sendiri" }],
    family: [{ name: "Synthetic Child" }],
  };
}

describe("parseAddAssetsInput", () => {
  it("accepts one row per category with the category's own codes", () => {
    const parsed = parseAddAssetsInput({
      assets: [
        { category: "cash", code: "012", value: 25_000_000, institutionName: " Bank Sintetis ", accountNo: "123", year: 2020 },
        { category: "property", code: "061", value: 900_000_000, acquisitionPrice: 700_000_000, address: "Jl. Sintetis 1", year: 2018, ownership: "joint" },
        { category: "movable", code: "041", value: 150_000_000, location: "domestic" },
      ],
      replaceExisting: false,
    });
    expect(parsed?.assets).toHaveLength(3);
    expect(parsed?.assets[0]).toEqual({ category: "cash", code: "012", value: 25_000_000, institutionName: "Bank Sintetis", accountNo: "123", year: 2020 });
    expect(parsed?.replaceExisting).toBe(false);
  });

  it("rejects wrong codes, unknown keys, bad amounts, and empty lists", () => {
    expect(parseAddAssetsInput({ assets: [] })).toBeNull();
    expect(parseAddAssetsInput({})).toBeNull();
    expect(parseAddAssetsInput({ assets: [{ category: "cash", code: "061", value: 1 }] })).toBeNull();
    expect(parseAddAssetsInput({ assets: [{ category: "villa", code: "061", value: 1 }] })).toBeNull();
    expect(parseAddAssetsInput({ assets: [{ category: "cash", code: "012", value: -1 }] })).toBeNull();
    expect(parseAddAssetsInput({ assets: [{ category: "cash", code: "012", value: 1, colour: "red" }] })).toBeNull();
    expect(parseAddAssetsInput({ assets: [{ category: "cash", code: "012", value: 1, year: 1800 }] })).toBeNull();
    expect(parseAddAssetsInput({ assets: [{ category: "cash", code: "012", value: 1 }], replaceExisting: "yes" })).toBeNull();
    expect(parseAddAssetsInput({ assets: [{ category: "cash", code: "012", value: 1 }], extra: 1 })).toBeNull();
  });

  it("lists the DJP codes per category", () => {
    expect(ASSET_CODES.cash).toEqual(["011", "012", "013", "014", "019"]);
    expect(ASSET_CODES.property).toEqual(["061", "062", "063", "069"]);
    expect(describeAssetCode("cash", "012")).toBe("012 - Tabungan");
    expect(describeAssetCode("cash", "061")).toBeNull();
  });
});

describe("toAssetRow", () => {
  it("puts the value in the column each sub-table sums", () => {
    expect(toAssetRow({ category: "cash", code: "012", value: 5, institutionName: "Bank" })).toEqual({
      category: "Kas dan Setara Kas", code: "012", description: "012 - Tabungan", note: "Milik Sendiri", balance: 5, location: "Dalam Negeri", institutionName: "Bank",
    });
    expect(toAssetRow({ category: "receivable", code: "021", value: 5, acquisitionPrice: 8, borrowerName: "Pihak" })).toMatchObject({
      category: "Piutang", receivableBalance: 5, receivableValue: 8, borrowerLocation: "Dalam Negeri", borrowerName: "Pihak",
    });
    expect(toAssetRow({ category: "property", code: "061", value: 9, location: "abroad", ownership: "joint", address: "X" })).toMatchObject({
      category: "Harta Tidak Bergerak (Termasuk Tanah Bangunan)", value: 9, acquisitionPrice: 9, location: "Luar Negeri", note: "Harta Bersama", address: "X",
    });
  });
});

describe("applyAssets", () => {
  it("appends by default, replaces on request, and never mutates the input", () => {
    const before = base();
    const snapshot = structuredClone(before);
    const appended = applyAssets(before, { assets: [{ category: "movable", code: "041", value: 100 }], replaceExisting: false });
    expect(before).toEqual(snapshot);
    expect(appended.assets).toHaveLength(2);
    expect(appended.family).toEqual(before.family);
    const replaced = applyAssets(before, { assets: [{ category: "movable", code: "041", value: 100 }], replaceExisting: true });
    expect(replaced.assets).toHaveLength(1);
    expect(replaced.assets?.[0].category).toBe("Harta Bergerak");
  });
});

describe("summarizeAssets", () => {
  it("returns counts and totals only", () => {
    const data = applyAssets(base(), { assets: [{ category: "property", code: "061", value: 900, acquisitionPrice: 700 }], replaceExisting: false });
    const summary = summarizeAssets(data);
    expect(summary).toEqual({ count: 2, byCategory: { cash: 1, property: 1 }, totalAcquisition: 10_000_700, totalCurrentValue: 10_000_900 });
    expect(JSON.stringify(summary)).not.toContain("Synthetic Child");
  });
});
