const fs = require("fs");
const path = require("path");

// Songs for the player, in the player's "Title|url; Title|url" format. Two sources:
//   1. src/site/playlist.txt: one song per line as  Title|https://link-to.mp3
//      (blank lines and lines starting with # are ignored)
//   2. audio files in src/site/img/music/, titled by file name.
const LIST = path.join(__dirname, "..", "playlist.txt");
const DIR = path.join(__dirname, "..", "img", "music");
const EXT = /\.(mp3|m4a|ogg|wav|flac|aac)$/i;
const clean = (t) => String(t).replace(/[;|]/g, " ").replace(/\s+/g, " ").trim();

function fromTextFile() {
  let text = "";
  try {
    text = fs.readFileSync(LIST, "utf8");
  } catch (e) {
    return [];
  }
  return text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith("#") && l.includes("|"))
    .map((l) => {
      const i = l.indexOf("|");
      const title = clean(l.slice(0, i));
      const url = l.slice(i + 1).trim();
      return /^(https?:\/\/|\/)/.test(url) && title && !url.includes(";") ? `${title}|${url}` : null;
    })
    .filter(Boolean);
}

function fromFolder() {
  let files = [];
  try {
    files = fs.readdirSync(DIR).filter((f) => EXT.test(f)).sort();
  } catch (e) {
    return [];
  }
  return files.map((f) => `${clean(f.replace(EXT, ""))}|/img/music/${encodeURIComponent(f)}`);
}

module.exports = function () {
  return { playlist: [...fromTextFile(), ...fromFolder()].join("; ") };
};
