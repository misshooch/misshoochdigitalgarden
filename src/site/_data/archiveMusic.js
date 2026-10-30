const fs = require("fs");
const path = require("path");

// Songs for the player: every audio file in src/site/img/music/. The title is
// the file name. Returned in the player's "Title|url; Title|url" format.
const DIR = path.join(__dirname, "..", "img", "music");
const EXT = /\.(mp3|m4a|ogg|wav|flac|aac)$/i;

module.exports = function () {
  let files = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => EXT.test(f)).sort();
  } catch (e) {
    return { playlist: "" };
  }
  const playlist = files
    .map((f) => f.replace(EXT, "").replace(/[|;]/g, " ") + "|/img/music/" + encodeURIComponent(f))
    .join("; ");
  return { playlist };
};
