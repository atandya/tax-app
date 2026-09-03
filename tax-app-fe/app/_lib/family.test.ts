import { describe, expect, it } from "vitest";
import {
  applyFamilyMembers,
  parseAddFamilyMembersInput,
  summarizeFamily,
  toFamilyRow,
} from "./family";
import type { SptData } from "./spt";

function base(): SptData {
  return {
    identity: { ptkp: "K/1", signer: "wp" },
    family: [{ name: "Synthetic Child", nik: "0000000000000000", relation: "Anak Kandung" }],
    assets: [{ category: "Kas dan Setara Kas", code: "011", balance: 1 }],
  };
}

describe("parseAddFamilyMembersInput", () => {
  it("accepts members with optional NIK, birth date, and occupation", () => {
    expect(
      parseAddFamilyMembersInput({
        members: [
          { name: " Anak Sintetis ", relation: "child", nik: "1234567890123456", birthDate: "2015-06-30" },
          { name: "Ibu Sintetis", relation: "parent", occupation: "Pensiunan" },
        ],
      }),
    ).toEqual({
      members: [
        { name: "Anak Sintetis", relation: "child", nik: "1234567890123456", birthDate: "2015-06-30" },
        { name: "Ibu Sintetis", relation: "parent", occupation: "Pensiunan" },
      ],
      replaceExisting: false,
    });
  });

  it("rejects bad relations, malformed NIK or dates, unknown keys, and empty lists", () => {
    expect(parseAddFamilyMembersInput({ members: [] })).toBeNull();
    expect(parseAddFamilyMembersInput({})).toBeNull();
    expect(parseAddFamilyMembersInput({ members: [{ name: "X", relation: "cousin" }] })).toBeNull();
    expect(parseAddFamilyMembersInput({ members: [{ name: "", relation: "child" }] })).toBeNull();
    expect(parseAddFamilyMembersInput({ members: [{ name: "X", relation: "child", nik: "123" }] })).toBeNull();
    expect(parseAddFamilyMembersInput({ members: [{ name: "X", relation: "child", birthDate: "30/06/2015" }] })).toBeNull();
    expect(parseAddFamilyMembersInput({ members: [{ name: "X", relation: "child", age: 5 }] })).toBeNull();
    expect(parseAddFamilyMembersInput({ members: [{ name: "X", relation: "child" }], replaceExisting: "yes" })).toBeNull();
  });
});

describe("toFamilyRow / applyFamilyMembers", () => {
  it("maps to the part C columns, appends by default, replaces on request, never mutates", () => {
    expect(toFamilyRow({ name: "X", relation: "parent_in_law", occupation: "Guru" })).toEqual({
      name: "X",
      relation: "Mertua",
      job: "Guru",
    });
    const before = base();
    const snapshot = structuredClone(before);
    const appended = applyFamilyMembers(before, { members: [{ name: "Y", relation: "sibling" }], replaceExisting: false });
    expect(before).toEqual(snapshot);
    expect(appended.family).toHaveLength(2);
    expect(appended.assets).toEqual(before.assets);
    const replaced = applyFamilyMembers(before, { members: [{ name: "Y", relation: "sibling" }], replaceExisting: true });
    expect(replaced.family).toEqual([{ name: "Y", relation: "Saudara Kandung" }]);
  });
});

describe("summarizeFamily", () => {
  it("returns counts by relation only", () => {
    const data = applyFamilyMembers(base(), { members: [{ name: "Y", relation: "parent" }], replaceExisting: false });
    const summary = summarizeFamily(data);
    expect(summary).toEqual({ count: 2, byRelation: { child: 1, parent: 1 } });
    const json = JSON.stringify(summary);
    expect(json).not.toContain("Synthetic Child");
    expect(json).not.toContain("0000000000000000");
  });
});
