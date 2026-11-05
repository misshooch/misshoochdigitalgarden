require("dotenv").config();
const settings = require("../helpers/constants");
const pluginLoader = require("../helpers/pluginLoader");

// Section pages: everything published in one top-level folder of the vault.
// Same listing defaults as the A-Z and photos pages.
const allSettings = [
  ...settings.ALL_NOTE_SETTINGS,
  ...pluginLoader.getNoteSettingKeys(),
];

// Daily entries are named like 02-11-2026; newest first. Anything else: A to Z.
function dateKey(name) {
  const m = String(name).match(/(\d{1,2})[-.](\d{1,2})[-.](\d{4})/);
  return m ? Number(m[3] + m[2].padStart(2, "0") + m[1].padStart(2, "0")) : 0;
}

module.exports = {
  layout: "layouts/index.njk",
  eleventyExcludeFromCollections: true,
  isSectionPage: true,
  // Entries that link elsewhere (Media goes to /media/) don't get a page of their own.
  permalink: (data) => (data.section && data.section.href ? false : `/sections/${data.section.slug}/`),
  eleventyComputed: {
    title: (data) => (data.section ? data.section.name : "Section"),
    settings: () => {
      const noteSettings = {};
      allSettings.forEach((setting) => {
        noteSettings[setting] = process.env[setting] === "true";
      });
      noteSettings.dgShowBacklinks = false;
      noteSettings.dgShowLocalGraph = false;
      noteSettings.dgShowToc = false;
      return noteSettings;
    },
    sectionNotes: (data) => {
      if (!data.section) return [];
      const want = "/notes/" + data.section.folder.toLowerCase() + "/";
      const notes = ((data.collections && data.collections.note) || []).filter((note) => {
        const p = String(note.inputPath || "").replace(/\\/g, "/").toLowerCase();
        return p.includes(want) && note.data && note.data["dg-publish"] && !note.data.hide;
      });
      return notes
        .map((note) => ({
          url: note.url,
          title: String(note.data.title || note.fileSlug),
          description: note.data.description || (note.data["dg-note-properties"] || {}).description || "",
          key: dateKey(note.fileSlug),
        }))
        .sort((a, b) => b.key - a.key || a.title.localeCompare(b.title));
    },
  },
};
