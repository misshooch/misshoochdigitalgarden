require("dotenv").config();
const path = require("path");
const settings = require("../../helpers/constants");
const { listHomePageNotes } = require("../../helpers/homePage");
const { chooseHomePage } = require("../../helpers/homeChoice");
const { pickNoteMetadata } = require("../../helpers/bases-engine/noteMetadata");
const pluginLoader = require("../../helpers/pluginLoader");
const { findDuplicateNotes } = require("../../helpers/duplicateNotes");

// Core note settings plus any per-note flags declared by enabled plugins
// (manifest "noteSettings"). Same resolution for both: per-note frontmatter
// wins, the env var of the same name is the global default.
const allSettings = [
  ...settings.ALL_NOTE_SETTINGS,
  ...pluginLoader.getNoteSettingKeys(),
];

// Only one note may own `/`. If several are marked as the home page, the one
// with the most text wins and the others fall back to their own permalinks, so
// a stray second `dg-home` in Obsidian can no longer fail the build with two
// templates writing dist/index.html.
// Renamed or moved notes leave an old copy online. Say so in the build log.
for (const group of findDuplicateNotes(__dirname)) {
  console.warn(
    "[duplicates] These notes have identical text; one is probably an old copy left behind by a rename or move: " +
      group.map((f) => path.relative(__dirname, f)).join("  |  ") +
      ". Remove the old one in Obsidian's Publication Center."
  );
}

const homeCandidates = listHomePageNotes(__dirname);
const homeNote = chooseHomePage(homeCandidates);
if (homeCandidates.length > 1) {
  console.warn(
    "[home] " +
      homeCandidates.length +
      " notes are marked as the home page (" +
      homeCandidates.map((c) => path.basename(c.file)).join(", ") +
      "). Using " +
      path.basename(homeNote) +
      "; the others are published at their own permalinks."
  );
}

function isHomePage(data) {
  if (data.tags.indexOf("gardenEntry") === -1) {
    return false;
  }
  if (!homeNote || !data.page || !data.page.inputPath) {
    return true;
  }
  return path.resolve(data.page.inputPath) === homeNote;
}

module.exports = {
  eleventyComputed: {
    layout: (data) => {
      if (isHomePage(data)) {
        return "layouts/index.njk";
      }
      return "layouts/note.njk";
    },
    permalink: (data) => {
      if (isHomePage(data)) {
        return "/";
      }
      return data.permalink || undefined;
    },
    basesNotes: (data) => {
      if (!data.collections || !data.collections.note) return [];
      return data.collections.note.map((item) => ({
        path: item.filePathStem.replace("/notes/", ""),
        url: item.url,
        metadata: pickNoteMetadata(item.data),
        fileSlug: item.fileSlug,
      }));
    },
    settings: (data) => {
      const noteSettings = {};
      allSettings.forEach((setting) => {
        let noteSetting = data[setting];
        let globalSetting = process.env[setting];

        let settingValue =
          noteSetting || (globalSetting === "true" && noteSetting !== false);
        noteSettings[setting] = settingValue;
      });
      return noteSettings;
    },
  },
};
