const path = require("path");

/**
 * Pick the one note that gets the `/` permalink when several notes are marked
 * as the garden's home page (`dg-home` in Obsidian).
 *
 * Two notes writing `dist/index.html` fails the whole Eleventy build, so the
 * build never lets that happen: the note with the most text wins, and ties go
 * to the alphabetically first path. Every other note keeps its own permalink.
 *
 * @param {{file: string, bodyLength: number}[]} candidates
 * @returns {string|null} the winning file path, or null when there are none
 */
function chooseHomePage(candidates) {
  if (!Array.isArray(candidates) || candidates.length === 0) {
    return null;
  }
  const sorted = candidates.slice().sort((a, b) => {
    if (b.bodyLength !== a.bodyLength) {
      return b.bodyLength - a.bodyLength;
    }
    return path.resolve(a.file).localeCompare(path.resolve(b.file));
  });
  return path.resolve(sorted[0].file);
}

module.exports = { chooseHomePage };
