// The sections that get a page of their own at /sections/<name>/ (Media links to /media/ instead).
const sections = require("./archiveSections.js");

module.exports = function () {
  return sections().filter((s) => !s.href);
};
