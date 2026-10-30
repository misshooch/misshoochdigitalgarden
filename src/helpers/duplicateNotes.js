const fs = require("fs");
const path = require("path");

/**
 * Finds published notes with identical text. Renaming or moving a note in
 * Obsidian leaves the old copy online; this spots those pairs so the build log
 * can point them out. It only reports, it never deletes anything.
 *
 * @param {{file: string, text: string}[]} notes
 * @returns {string[][]} groups of two or more file paths with the same body
 */
function groupDuplicates(notes) {
  const byBody = new Map();
  for (const n of notes) {
    const body = String(n.text || "").replace(/\s+/g, " ").trim();
    if (body.length < 20) continue; // empty or near-empty notes are not worth flagging
    if (!byBody.has(body)) byBody.set(body, []);
    byBody.get(body).push(n.file);
  }
  return [...byBody.values()].filter((g) => g.length > 1);
}

function stripFrontmatter(text) {
  return text.replace(/^---[\s\S]*?\n---\s*/, "");
}

function walk(dir, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith(".md")) out.push(full);
  }
  return out;
}

function findDuplicateNotes(notesDir) {
  const notes = walk(notesDir, []).map((file) => {
    let text = "";
    try {
      text = stripFrontmatter(fs.readFileSync(file, "utf8"));
    } catch (e) {}
    return { file, text };
  });
  return groupDuplicates(notes);
}

module.exports = { groupDuplicates, findDuplicateNotes };
