const fs = require("fs");
const path = require("path");

// Photos for the /photos/ page and the homepage portrait: every image that
// sits in a folder called "photos" (any capitalisation) under src/site/img,
// for example a vault folder "Photos" published through Obsidian lands in
// src/site/img/user/Photos/. Nothing to edit when you add or remove photos.
const ROOT = path.join(__dirname, "..", "img");
const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;

function walk(dir, inside, out) {
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (e) {
    return out;
  }
  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, inside || entry.name.toLowerCase() === "photos", out);
    } else if (inside && EXT.test(entry.name)) {
      const rel = path.relative(ROOT, full).split(path.sep).map(encodeURIComponent).join("/");
      out.push({ src: "/img/" + rel, name: entry.name.replace(EXT, "") });
    }
  }
  return out;
}

module.exports = function () {
  const items = walk(ROOT, false, []);
  return { items, joined: items.map((i) => i.src).join("|") };
};
