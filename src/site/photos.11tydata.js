require("dotenv").config();
const settings = require("../helpers/constants");
const pluginLoader = require("../helpers/pluginLoader");

// The photos page (/photos/): every photograph as uploaded and in each effect.
// Like the A-Z page it reuses the index layout with the listing defaults: no
// sidebar panels, settings from the environment.
const allSettings = [
  ...settings.ALL_NOTE_SETTINGS,
  ...pluginLoader.getNoteSettingKeys(),
];

module.exports = {
  layout: "layouts/index.njk",
  eleventyExcludeFromCollections: true,
  isPhotosPage: true,
  eleventyComputed: {
    title: () => "Photos",
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
  },
};
