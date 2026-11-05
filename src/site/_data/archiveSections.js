const fs = require("fs");
const path = require("path");

// Section pages (/sections/<name>/): one page per top-level folder of published
// notes, listing everything inside it. Make a folder in Obsidian, publish a note
// into it, and its section page appears on its own.
// The names below always get a page, even before anything is published into them.
const ALWAYS = ["Daily Entry", "Other Essays", "Things of Interest"];
// Shown last in the list and linking to the media page (every photograph) instead of a folder page.
const MEDIA = { name: "Media", folder: "", slug: "media", href: "/media/" };
const HIDDEN = ["photos", "media"];
const NOTES = path.join(__dirname, "..", "notes");

function slug(name) {
  return name.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "section";
}

module.exports = function () {
  let folders = [];
  try {
    folders = fs.readdirSync(NOTES, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name);
  } catch (e) {}
  const names = [...ALWAYS];
  for (const f of folders.sort((a, b) => a.localeCompare(b))) {
    if (HIDDEN.includes(f.toLowerCase())) continue;
    if (!names.some((n) => n.toLowerCase() === f.toLowerCase())) names.push(f);
  }
  const seen = new Set();
  return names
    .map((name) => {
      const folder = folders.find((f) => f.toLowerCase() === name.toLowerCase()) || name;
      return { name, folder, slug: slug(name) };
    })
    .filter((s) => (seen.has(s.slug) ? false : seen.add(s.slug)))
    .concat([MEDIA]);
};
