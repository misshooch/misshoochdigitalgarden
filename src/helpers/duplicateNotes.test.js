import { describe, it, expect } from "vitest";
import { groupDuplicates } from "./duplicateNotes.js";

describe("groupDuplicates", () => {
  it("groups notes with the same text, ignoring whitespace", () => {
    const g = groupDuplicates([
      { file: "a/2026-10-30.md", text: "Today I called off work.\n\nGoodnight, Miss Hooch" },
      { file: "a/30-10-2026.md", text: "Today I called off work. Goodnight,   Miss Hooch" },
      { file: "b/other.md", text: "Something completely different here" },
    ]);
    expect(g).toEqual([["a/2026-10-30.md", "a/30-10-2026.md"]]);
  });

  it("ignores empty and tiny notes", () => {
    expect(groupDuplicates([{ file: "a.md", text: "" }, { file: "b.md", text: "" }])).toEqual([]);
  });

  it("returns nothing when every note is different", () => {
    expect(groupDuplicates([{ file: "a.md", text: "first note with enough words" }, { file: "b.md", text: "second note with enough words" }])).toEqual([]);
  });
});
