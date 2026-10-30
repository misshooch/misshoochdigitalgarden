import { describe, it, expect } from "vitest";
import { azGroups } from "./azGroups.js";

describe("azGroups", () => {
  it("groups by first letter, case-insensitively, in order", () => {
    const g = azGroups([
      { title: "transhumanists", url: "/t/" },
      { title: "Barcodes", url: "/b/" },
      { title: "Still here?", url: "/s/" },
      { title: "tea", url: "/tea/" },
    ]);
    expect(g.map((x) => x.letter)).toEqual(["B", "S", "T"]);
    expect(g[2].notes.map((n) => n.title)).toEqual(["tea", "transhumanists"]);
  });

  it("puts digits and symbols under # at the end", () => {
    const g = azGroups([{ title: "2024 diary", url: "/d/" }, { title: "Angel", url: "/a/" }]);
    expect(g.map((x) => x.letter)).toEqual(["A", "#"]);
  });

  it("copes with empty input", () => {
    expect(azGroups([])).toEqual([]);
    expect(azGroups(undefined)).toEqual([]);
  });
});
