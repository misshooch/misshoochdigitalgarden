import { describe, it, expect } from "vitest";
import { chooseHomePage } from "./homeChoice.js";
import path from "path";

describe("chooseHomePage", () => {
  it("returns null when no note is a home page", () => {
    expect(chooseHomePage([])).toBe(null);
    expect(chooseHomePage(null)).toBe(null);
  });

  it("prefers the note with the most text over an empty one", () => {
    const winner = chooseHomePage([
      { file: "/notes/Untitled.md", bodyLength: 0 },
      { file: "/notes/Welcome.md", bodyLength: 300 },
    ]);
    expect(winner).toBe(path.resolve("/notes/Welcome.md"));
  });

  it("breaks ties by path so the result is stable", () => {
    const winner = chooseHomePage([
      { file: "/notes/b.md", bodyLength: 5 },
      { file: "/notes/a.md", bodyLength: 5 },
    ]);
    expect(winner).toBe(path.resolve("/notes/a.md"));
  });
});
