// Year-end asset rows saved through the assistant. Pure, client-safe module.
// Rows follow the L-1 sub-table layout exactly: the category decides which
// columns exist, the DJP code decides the stored description, and the value
// lands in the column that sub-table sums (Saldo, Saldo Piutang, or Nilai).

import {
  HARTA_CATEGORIES,
  HARTA_DESKRIPSI,
  HARTA_KETERANGAN,
  sumAssets,
  type AssetRow,
  type SptData,
} from "./spt";

/** English keys the agent uses; values are the exact Coretax categories. */
export const ASSET_CATEGORY_KEYS = {
  cash: "Kas dan Setara Kas",
  receivable: "Piutang",
  investment: "Investasi/Sekuritas",
  movable: "Harta Bergerak",
  property: "Harta Tidak Bergerak (Termasuk Tanah Bangunan)",
  other: "Harta Lainnya",
} as const;
export type AssetCategoryKey = keyof typeof ASSET_CATEGORY_KEYS;

export const ASSET_OWNERSHIP_KEYS = {
  own: "Milik Sendiri",
  joint: "Harta Bersama",
  undivided_inheritance: "Warisan Belum Terbagi",
  other_party: "Atas Nama Pihak Lain",
  other: "Lainnya",
} as const;
export type AssetOwnershipKey = keyof typeof ASSET_OWNERSHIP_KEYS;

export interface AssetInput {
  category: AssetCategoryKey;
  /** Three-digit DJP asset code from the category's list, e.g. "012". */
  code: string;
  /** Current value in whole rupiah: balance for cash, outstanding balance for
   *  receivables, current value for everything else. */
  value: number;
  acquisitionPrice?: number;
  year?: number;
  location?: "domestic" | "abroad";
  ownership?: AssetOwnershipKey;
  institutionName?: string;
  accountNo?: string;
  holderName?: string;
  institutionTaxId?: string;
  address?: string;
  ownershipProofNo?: string;
  borrowerName?: string;
  borrowerTaxId?: string;
}

export interface AddAssetsInput {
  assets: AssetInput[];
  /** true replaces every stored asset row; false (default) appends. */
  replaceExisting: boolean;
}

/** Code lists per category key, e.g. cash → ["011", "012", ...]. */
export const ASSET_CODES: Record<AssetCategoryKey, string[]> = Object.fromEntries(
  (Object.keys(ASSET_CATEGORY_KEYS) as AssetCategoryKey[]).map((key) => [
    key,
    (HARTA_DESKRIPSI[ASSET_CATEGORY_KEYS[key]] ?? []).map((d) => d.slice(0, 3)),
  ]),
) as Record<AssetCategoryKey, string[]>;

/** "012" → "012 - Tabungan" for the given category, or null if not listed. */
export function describeAssetCode(category: AssetCategoryKey, code: string): string | null {
  const list = HARTA_DESKRIPSI[ASSET_CATEGORY_KEYS[category]] ?? [];
  return list.find((d) => d.startsWith(`${code} - `)) ?? null;
}

const MAX_RUPIAH = 1_000_000_000_000_000;
const MAX_ASSETS = 20;

const isRupiah = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= MAX_RUPIAH;
const isYear = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= 1900 && v <= 2100;
const isText = (v: unknown, max = 120): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;

const TEXT_KEYS = [
  "institutionName",
  "accountNo",
  "holderName",
  "institutionTaxId",
  "address",
  "ownershipProofNo",
  "borrowerName",
  "borrowerTaxId",
] as const;

const ALLOWED_KEYS = new Set<string>([
  "category",
  "code",
  "value",
  "acquisitionPrice",
  "year",
  "location",
  "ownership",
  ...TEXT_KEYS,
]);

function parseAsset(raw: unknown): AssetInput | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).some((k) => !ALLOWED_KEYS.has(k))) return null;
  const category = r.category;
  if (typeof category !== "string" || !(category in ASSET_CATEGORY_KEYS)) return null;
  const key = category as AssetCategoryKey;
  if (typeof r.code !== "string" || !ASSET_CODES[key].includes(r.code)) return null;
  if (!isRupiah(r.value)) return null;
  const out: AssetInput = { category: key, code: r.code, value: r.value };
  if (r.acquisitionPrice !== undefined) {
    if (!isRupiah(r.acquisitionPrice)) return null;
    out.acquisitionPrice = r.acquisitionPrice;
  }
  if (r.year !== undefined) {
    if (!isYear(r.year)) return null;
    out.year = r.year;
  }
  if (r.location !== undefined) {
    if (r.location !== "domestic" && r.location !== "abroad") return null;
    out.location = r.location;
  }
  if (r.ownership !== undefined) {
    if (typeof r.ownership !== "string" || !(r.ownership in ASSET_OWNERSHIP_KEYS)) return null;
    out.ownership = r.ownership as AssetOwnershipKey;
  }
  for (const k of TEXT_KEYS) {
    if (r[k] !== undefined) {
      if (!isText(r[k], k === "address" ? 240 : 120)) return null;
      out[k] = (r[k] as string).trim();
    }
  }
  return out;
}

/** Application-side re-validation of tool input. Mirrors the JSON schema. */
export function parseAddAssetsInput(input: unknown): AddAssetsInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const r = input as Record<string, unknown>;
  const keys = Object.keys(r);
  if (keys.some((k) => k !== "assets" && k !== "replaceExisting")) return null;
  if (!Array.isArray(r.assets) || r.assets.length === 0 || r.assets.length > MAX_ASSETS) {
    return null;
  }
  if (r.replaceExisting !== undefined && typeof r.replaceExisting !== "boolean") return null;
  const assets: AssetInput[] = [];
  for (const raw of r.assets) {
    const parsed = parseAsset(raw);
    if (!parsed) return null;
    assets.push(parsed);
  }
  return { assets, replaceExisting: r.replaceExisting === true };
}

/** One tool row → one L-1 row with exactly the columns its sub-table shows. */
export function toAssetRow(input: AssetInput): AssetRow {
  const category = ASSET_CATEGORY_KEYS[input.category];
  const location = input.location === "abroad" ? "Luar Negeri" : "Dalam Negeri";
  const row: AssetRow = {
    category,
    code: input.code,
    description: describeAssetCode(input.category, input.code) ?? input.code,
    note: ASSET_OWNERSHIP_KEYS[input.ownership ?? "own"],
  };
  if (input.year !== undefined) row.year = input.year;
  switch (input.category) {
    case "cash":
      row.balance = input.value;
      row.location = location;
      if (input.accountNo) row.accountNo = input.accountNo;
      if (input.holderName) row.holderName = input.holderName;
      if (input.institutionName) row.institutionName = input.institutionName;
      break;
    case "receivable":
      row.receivableBalance = input.value;
      row.receivableValue = input.acquisitionPrice ?? input.value;
      row.borrowerLocation = location;
      if (input.borrowerName) row.borrowerName = input.borrowerName;
      if (input.borrowerTaxId) row.borrowerId = input.borrowerTaxId;
      break;
    case "investment":
      row.value = input.value;
      row.acquisitionPrice = input.acquisitionPrice ?? input.value;
      row.location = location;
      if (input.institutionName) row.institutionName = input.institutionName;
      if (input.institutionTaxId) row.institutionNpwp = input.institutionTaxId;
      if (input.accountNo) row.accountNo = input.accountNo;
      break;
    case "movable":
      row.value = input.value;
      row.acquisitionPrice = input.acquisitionPrice ?? input.value;
      row.location = location;
      if (input.ownershipProofNo) row.ownershipProofNo = input.ownershipProofNo;
      break;
    case "property":
      row.value = input.value;
      row.acquisitionPrice = input.acquisitionPrice ?? input.value;
      row.location = location;
      if (input.address) row.address = input.address;
      if (input.ownershipProofNo) row.ownershipProofNo = input.ownershipProofNo;
      break;
    case "other":
      row.value = input.value;
      row.acquisitionPrice = input.acquisitionPrice ?? input.value;
      row.location = location;
      break;
  }
  return row;
}

/** Returns a new `SptData` with the rows appended (or replacing all rows).
 *  Never mutates `data`; every other field is carried over as-is. */
export function applyAssets(data: SptData, input: AddAssetsInput): SptData {
  const rows = input.assets.map(toAssetRow);
  const existing = input.replaceExisting ? [] : (data.assets ?? []);
  return { ...data, assets: [...existing, ...rows] };
}

/** Figures only: how many rows per category and the A.7 totals. */
export interface AssetSummary {
  count: number;
  byCategory: Partial<Record<AssetCategoryKey, number>>;
  totalAcquisition: number;
  totalCurrentValue: number;
}

export function summarizeAssets(data: SptData): AssetSummary {
  const assets = data.assets ?? [];
  const byCategory: Partial<Record<AssetCategoryKey, number>> = {};
  for (const a of assets) {
    const key = (Object.keys(ASSET_CATEGORY_KEYS) as AssetCategoryKey[]).find(
      (k) => ASSET_CATEGORY_KEYS[k] === a.category,
    );
    if (key) byCategory[key] = (byCategory[key] ?? 0) + 1;
  }
  const totals = sumAssets(assets);
  return {
    count: assets.length,
    byCategory,
    totalAcquisition: totals.acquisition,
    totalCurrentValue: totals.current,
  };
}

export const ASSET_CATEGORY_LIST = HARTA_CATEGORIES;
export const ASSET_OWNERSHIP_LIST = HARTA_KETERANGAN;
