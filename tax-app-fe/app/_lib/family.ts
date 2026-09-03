// Dependant family members saved through the assistant. Pure, client-safe.
// Rows follow the L-1 part C table: name, NIK, birth date, relation, job.
// Names and NIKs are stored on the form but never summarised back out.

import { RELATION_OPTIONS, type FamilyMember, type SptData } from "./spt";

/** English keys the agent uses; values are the exact Coretax relations. */
export const FAMILY_RELATION_KEYS = {
  child: "Anak Kandung",
  adopted_child: "Anak Angkat",
  parent: "Orang Tua",
  parent_in_law: "Mertua",
  sibling: "Saudara Kandung",
  other: "Lainnya",
} as const;
export type FamilyRelationKey = keyof typeof FAMILY_RELATION_KEYS;

export interface FamilyMemberInput {
  name: string;
  relation: FamilyRelationKey;
  /** 16-digit NIK, only when the user gives it. */
  nik?: string;
  /** ISO date YYYY-MM-DD, only when the user gives it. */
  birthDate?: string;
  occupation?: string;
}

export interface AddFamilyMembersInput {
  members: FamilyMemberInput[];
  /** true replaces every stored family row; false (default) appends. */
  replaceExisting: boolean;
}

const MAX_MEMBERS = 10;
const isText = (v: unknown, max = 120): v is string =>
  typeof v === "string" && v.trim().length > 0 && v.length <= max;
const NIK_RE = /^\d{16}$/;
const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
const ALLOWED = new Set(["name", "relation", "nik", "birthDate", "occupation"]);

function parseMember(raw: unknown): FamilyMemberInput | null {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return null;
  const r = raw as Record<string, unknown>;
  if (Object.keys(r).some((k) => !ALLOWED.has(k))) return null;
  if (!isText(r.name)) return null;
  if (typeof r.relation !== "string" || !(r.relation in FAMILY_RELATION_KEYS)) return null;
  const out: FamilyMemberInput = {
    name: r.name.trim(),
    relation: r.relation as FamilyRelationKey,
  };
  if (r.nik !== undefined) {
    if (typeof r.nik !== "string" || !NIK_RE.test(r.nik)) return null;
    out.nik = r.nik;
  }
  if (r.birthDate !== undefined) {
    if (typeof r.birthDate !== "string" || !DATE_RE.test(r.birthDate)) return null;
    out.birthDate = r.birthDate;
  }
  if (r.occupation !== undefined) {
    if (!isText(r.occupation, 80)) return null;
    out.occupation = r.occupation.trim();
  }
  return out;
}

/** Application-side re-validation of tool input. Mirrors the JSON schema. */
export function parseAddFamilyMembersInput(input: unknown): AddFamilyMembersInput | null {
  if (typeof input !== "object" || input === null || Array.isArray(input)) return null;
  const r = input as Record<string, unknown>;
  if (Object.keys(r).some((k) => k !== "members" && k !== "replaceExisting")) return null;
  if (!Array.isArray(r.members) || r.members.length === 0 || r.members.length > MAX_MEMBERS) {
    return null;
  }
  if (r.replaceExisting !== undefined && typeof r.replaceExisting !== "boolean") return null;
  const members: FamilyMemberInput[] = [];
  for (const raw of r.members) {
    const parsed = parseMember(raw);
    if (!parsed) return null;
    members.push(parsed);
  }
  return { members, replaceExisting: r.replaceExisting === true };
}

/** One tool row → one part C row with the table's own column names. */
export function toFamilyRow(input: FamilyMemberInput): FamilyMember {
  const row: FamilyMember = {
    name: input.name,
    relation: FAMILY_RELATION_KEYS[input.relation],
  };
  if (input.nik) row.nik = input.nik;
  if (input.birthDate) row.birthDate = input.birthDate;
  if (input.occupation) row.job = input.occupation;
  return row;
}

/** Returns a new `SptData` with the rows appended (or replacing all rows).
 *  Never mutates `data`; every other field is carried over as-is. */
export function applyFamilyMembers(data: SptData, input: AddFamilyMembersInput): SptData {
  const rows = input.members.map(toFamilyRow);
  const existing = input.replaceExisting ? [] : (data.family ?? []);
  return { ...data, family: [...existing, ...rows] };
}

/** Counts only: no names, NIKs, or birth dates. */
export interface FamilySummary {
  count: number;
  byRelation: Partial<Record<FamilyRelationKey, number>>;
}

export function summarizeFamily(data: SptData): FamilySummary {
  const byRelation: Partial<Record<FamilyRelationKey, number>> = {};
  for (const m of data.family ?? []) {
    const key =
      (Object.keys(FAMILY_RELATION_KEYS) as FamilyRelationKey[]).find(
        (k) => FAMILY_RELATION_KEYS[k] === m.relation,
      ) ?? "other";
    byRelation[key] = (byRelation[key] ?? 0) + 1;
  }
  return { count: (data.family ?? []).length, byRelation };
}

export const FAMILY_RELATION_LIST = RELATION_OPTIONS;
