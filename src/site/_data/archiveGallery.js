const fs = require("fs");
const path = require("path");

// Photos for the /photos/ page and the homepage portrait. Three ways to add one,
// all without touching code:
//   0. Every image Obsidian uploads (src/site/img/user/) is included automatically.
//   1. Put an image in src/site/img/photos/ (or any folder called "photos" under
//      src/site/img, such as a vault folder "Photos" published from Obsidian).
//      Add an effect by putting its word before the extension:
//      beach.halftone.jpg   (words: halftone, phosphor, cyber, pixel, code)
//   2. Add a line to src/site/photos.txt:  https://link.jpg | effect | caption
//      (effect and caption are optional)
// A photo with no effect is shown in every effect on the photos page.
const ROOT = path.join(__dirname, "..", "img");
const LIST = path.join(__dirname, "..", "photos.txt");
const EXT = /\.(jpe?g|png|webp|gif|avif)$/i;
const EFFECTS = ["halftone", "phosphor", "cyber", "pixel", "code"];

function split(name) {
  const base = name.replace(EXT, "");
  const m = base.match(/^(.*)\.([a-z]+)$/i);
  if (m && EFFECTS.includes(m[2].toLowerCase())) return { title: m[1], effect: m[2].toLowerCase() };
  return { title: base, effect: "" };
}

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
      walk(full, inside || ["photos", "user"].includes(entry.name.toLowerCase()), out);
    } else if (inside && EXT.test(entry.name)) {
      const rel = path.relative(ROOT, full).split(path.sep).map(encodeURIComponent).join("/");
      const s = split(entry.name);
      out.push({ src: "/img/" + rel, name: s.title, effect: s.effect });
    }
  }
  return out;
}

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
    .filter((l) => l && !l.startsWith("#"))
    .map((l) => {
      const parts = l.split("|").map((x) => x.trim());
      const src = parts[0];
      if (!/^(https?:\/\/|\/)/.test(src) || src.includes('"')) return null;
      const effect = EFFECTS.includes((parts[1] || "").toLowerCase()) ? parts[1].toLowerCase() : "";
      const caption = parts[2] || (parts[1] && !effect ? parts[1] : "");
      const last = decodeURIComponent(src.split("/").pop() || "photo").replace(EXT, "");
      return { src, name: caption || split(last + ".jpg").title, effect };
    })
    .filter(Boolean);
}

module.exports = function () {
  const seen = new Set();
  const items = [...fromTextFile(), ...walk(ROOT, false, [])].filter((i) => {
    const key = decodeURIComponent(i.src.split("/").pop()).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  // The homepage portrait is redrawn in the browser, so it only uses photos on this site.
  const local = items.filter((i) => i.src.startsWith("/"));
  return { items, local, joined: local.map((i) => i.src).join("|") };
};
