require("dotenv").config();
const settings = require("../helpers/constants");
const pluginLoader = require("../helpers/pluginLoader");
const { azGroups } = require("../helpers/azGroups");

// The A-Z index page (/a-z/). It reuses the index layout like the fallback
// front page does, so it takes the same defaults: no sidebar panels, settings
// from the environment.
const allSettings = [
  ...settings.ALL_NOTE_SETTINGS,
  ...pluginLoader.getNoteSettingKeys(),
];

function noteTitle(note) {
  return String((note.data && note.data.title) || note.fileSlug || note.url);
}

module.exports = {
  layout: "layouts/index.njk",
  eleventyExcludeFromCollections: true,
  isAzPage: true,
  eleventyComputed: {
    title: () => "Index",
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
    azGroups: (data) => {
      const notes = (data.collections && data.collections.note) || [];
      return azGroups(
        notes
          .filter(
            (note) =>
              note.data &&
              note.data["dg-publish"] &&
              !note.data.hide &&
              !(note.data.tags || []).includes("gardenEntry")
          )
          .map((note) => ({ url: note.url, title: noteTitle(note) }))
      );
    },
  },
};
