/*
  Photo privacy: removes location (GPS) and other hidden metadata from images.

  Phones and cameras write the exact place a photo was taken (plus the device,
  the time, sometimes your name) into the file. Anyone can download a photo
  from the site and read it. This removes it.

  It runs on its own in two places, so nothing needs doing by hand:
    - every site build, on the copies of photos that go live (dist/)
    - a GitHub Action, on photos Obsidian uploads to the repo
      (.github/workflows/strip-photo-metadata.yml)

  To run it yourself:  npm run strip-photos            (cleans src/site)
                       node src/helpers/stripImageMetadata.js some/folder

  How: the file's real format is read from its first bytes (extensions lie;
  iPhone HEIC photos are sometimes renamed .jpg). Nothing is re-compressed, so
  photos lose no quality.
    JPEG  keeps only the picture, colour profile and orientation (so photos
          don't turn sideways). Drops EXIF, GPS, XMP, IPTC, comments and the
          extra images iPhones append after the main one.
    PNG   drops eXIf and text chunks.
    WebP  drops EXIF and XMP chunks.
    HEIC, AVIF, TIFF  the GPS block is blanked in place and any XMP packet
          (which can also hold a location) is blanked, keeping the file valid.
  No dependencies, so the GitHub Action doesn't need npm install.
*/
const fs = require("fs");
const path = require("path");

const IMAGE_EXT = /\.(jpe?g|jfif|png|webp|heic|heif|avif|tiff?|gif)$/i;

function sniff(buf) {
  if (buf.length < 12) return "";
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "jpeg";
  if (buf.slice(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "png";
  if (buf.toString("latin1", 0, 4) === "RIFF" && buf.toString("latin1", 8, 12) === "WEBP") return "webp";
  if (buf.toString("latin1", 4, 8) === "ftyp") return "isobmff"; // HEIC, HEIF, AVIF
  const t = buf.toString("latin1", 0, 4);
  if (t === "II*\0" || t === "MM\0*") return "tiff";
  return "";
}

/* ---------- TIFF / EXIF structure helpers ---------- */

const TYPE_SIZE = { 1: 1, 2: 1, 3: 2, 4: 4, 5: 8, 6: 1, 7: 1, 8: 2, 9: 4, 10: 8, 11: 4, 12: 8, 13: 4 };

function tiffReader(buf, start) {
  const order = buf.toString("latin1", start, start + 2);
  const le = order === "II";
  if (!le && order !== "MM") return null;
  const u16 = (o) => (le ? buf.readUInt16LE(start + o) : buf.readUInt16BE(start + o));
  const u32 = (o) => (le ? buf.readUInt32LE(start + o) : buf.readUInt32BE(start + o));
  if (u16(2) !== 42) return null;
  return { le, u16, u32, start, ifd0: u32(4) };
}

// Entries of one IFD as {tag, type, count, valueOffset (absolute), size}
function readIfd(buf, t, ifdOffset) {
  const out = [];
  if (!ifdOffset || t.start + ifdOffset + 2 > buf.length) return out;
  const n = t.u16(ifdOffset);
  for (let i = 0; i < n; i++) {
    const e = ifdOffset + 2 + i * 12;
    if (t.start + e + 12 > buf.length) break;
    const tag = t.u16(e), type = t.u16(e + 2), count = t.u32(e + 4);
    const size = (TYPE_SIZE[type] || 1) * count;
    const valueOffset = size <= 4 ? t.start + e + 8 : t.start + t.u32(e + 8);
    out.push({ tag, type, count, entry: t.start + e, valueOffset, size });
  }
  return out;
}

function exifOrientation(buf, tiffStart) {
  try {
    const t = tiffReader(buf, tiffStart);
    if (!t) return 1;
    const o = readIfd(buf, t, t.ifd0).find((e) => e.tag === 0x0112);
    if (!o) return 1;
    const v = t.le ? buf.readUInt16LE(o.valueOffset) : buf.readUInt16BE(o.valueOffset);
    return v >= 1 && v <= 8 ? v : 1;
  } catch {
    return 1;
  }
}

// Blank the GPS block of a TIFF structure in place (sizes and offsets stay the
// same, so the surrounding file remains valid). Returns true if anything changed.
function blankGpsInPlace(buf, tiffStart) {
  let changed = false;
  try {
    const t = tiffReader(buf, tiffStart);
    if (!t) return false;
    const ifd0 = readIfd(buf, t, t.ifd0);
    for (const ptr of ifd0.filter((e) => e.tag === 0x8825)) {
      const gpsOffset = t.u32(ptr.entry - t.start + 8);
      for (const g of readIfd(buf, t, gpsOffset)) {
        const end = Math.min(g.valueOffset + g.size, buf.length);
        for (let i = g.valueOffset; i < end; i++) if (buf[i] !== 0) { buf[i] = 0; changed = true; }
        // And mark the entry empty (count 0), so readers find no value at all.
        const c = g.entry + 4;
        if (t.u32(c - t.start) !== 0) {
          t.le ? buf.writeUInt32LE(0, c) : buf.writeUInt32BE(0, c);
          changed = true;
        }
      }
    }
  } catch {
    /* malformed: leave it */
  }
  return changed;
}

// Overwrite every XMP packet with spaces (XMP can repeat the GPS position).
function blankXmpInPlace(buf) {
  let changed = false;
  const open = Buffer.from("<x:xmpmeta");
  const close = Buffer.from("</x:xmpmeta>");
  let i = buf.indexOf(open);
  while (i !== -1) {
    const j = buf.indexOf(close, i);
    if (j === -1) break;
    const end = j + close.length;
    for (let k = i; k < end; k++) if (buf[k] !== 0x20) { buf[k] = 0x20; changed = true; }
    i = buf.indexOf(open, end);
  }
  return changed;
}

/* ---------- JPEG ---------- */

function orientationApp1(orientation) {
  // "Exif\0\0" + big-endian TIFF with one IFD0 entry: Orientation.
  const b = Buffer.alloc(2 + 2 + 32);
  b.writeUInt16BE(0xffe1, 0);
  b.writeUInt16BE(34, 2);
  b.write("Exif\0\0", 4, "latin1");
  b.write("MM\0*", 10, "latin1");
  b.writeUInt32BE(8, 14); // IFD0 at 8
  b.writeUInt16BE(1, 18); // one entry
  b.writeUInt16BE(0x0112, 20);
  b.writeUInt16BE(3, 22); // SHORT
  b.writeUInt32BE(1, 24);
  b.writeUInt16BE(orientation, 28);
  b.writeUInt32BE(0, 32); // no next IFD
  return b;
}

function stripJpeg(buf) {
  const keep = [buf.slice(0, 2)]; // SOI
  let orientation = 1;
  let insertAt = 1; // after SOI, or after APP0 if present
  let pos = 2;

  let sawEoi = false;
  while (pos + 2 <= buf.length) {
    if (buf[pos] !== 0xff) return null; // not where a marker should be: don't touch
    let marker = buf[pos + 1];
    if (marker === 0xff) { pos++; continue; } // fill byte
    if (marker === 0xd9) { keep.push(buf.slice(pos, pos + 2)); pos += 2; sawEoi = true; break; } // EOI
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) { keep.push(buf.slice(pos, pos + 2)); pos += 2; continue; }

    if (pos + 4 > buf.length) return null;
    const len = buf.readUInt16BE(pos + 2);
    const segEnd = pos + 2 + len;
    if (len < 2 || segEnd > buf.length) return null;
    const seg = buf.slice(pos, segEnd);
    const body = buf.slice(pos + 4, segEnd);

    let drop = false;
    if (marker === 0xe1) {
      // APP1: EXIF or XMP
      if (body.toString("latin1", 0, 6) === "Exif\0\0") {
        const o = exifOrientation(body, 6);
        if (o !== 1) orientation = o;
      }
      drop = true;
    } else if (marker === 0xe2) {
      drop = body.toString("latin1", 0, 12) !== "ICC_PROFILE\0"; // keep colour, drop MPF etc.
    } else if (marker === 0xee) {
      drop = false; // APP14 Adobe: colour transform, needed for decoding
    } else if (marker === 0xe0) {
      drop = body.toString("latin1", 0, 5) !== "JFIF\0"; // keep JFIF, drop JFXX thumbnails etc.
    } else if (marker >= 0xe3 && marker <= 0xef) {
      drop = true; // APP3..APP15 (APP13 = Photoshop/IPTC, which can hold a location)
    } else if (marker === 0xfe) {
      drop = true; // COM
    }

    if (!drop) {
      keep.push(seg);
      if (marker === 0xe0 && keep.length === 2) insertAt = 2;
    }
    pos = segEnd;

    if (marker === 0xda) {
      // Start of scan: copy entropy-coded data up to the next real marker.
      let p = pos;
      while (p < buf.length) {
        if (buf[p] === 0xff && p + 1 < buf.length) {
          const n = buf[p + 1];
          if (n !== 0x00 && !(n >= 0xd0 && n <= 0xd7) && n !== 0xff) break;
        }
        p++;
      }
      keep.push(buf.slice(pos, p));
      pos = p;
    }
  }
  // Anything after EOI (iPhone gain maps / depth maps, each with their own
  // EXIF and GPS) is dropped. A file that ends early (no EOI) is still cleaned
  // and keeps all its picture data; decoders accept that.
  if (!sawEoi && pos < buf.length) keep.push(buf.slice(pos));

  if (orientation !== 1) keep.splice(insertAt, 0, orientationApp1(orientation));
  return Buffer.concat(keep);
}

/* ---------- PNG ---------- */

const PNG_DROP = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(b) {
  let c = 0xffffffff;
  for (const x of b) c = CRC_TABLE[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// The bare TIFF block (no "Exif\0\0" prefix) holding only Orientation.
function orientationTiff(orientation) {
  return orientationApp1(orientation).slice(10);
}

function stripPng(buf) {
  const keep = [buf.slice(0, 8)];
  let pos = 8;
  let orientation = 1;
  while (pos + 12 <= buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("latin1", pos + 4, pos + 8);
    const end = pos + 12 + len;
    if (end > buf.length) return null;
    if (type === "eXIf") orientation = exifOrientation(buf.slice(pos + 8, pos + 8 + len), 0);
    if (type === "IDAT" && orientation !== 1) {
      // eXIf must come before the image data
      const data = orientationTiff(orientation);
      const chunk = Buffer.alloc(12 + data.length);
      chunk.writeUInt32BE(data.length, 0);
      chunk.write("eXIf", 4, "latin1");
      data.copy(chunk, 8);
      chunk.writeUInt32BE(crc32(chunk.slice(4, 8 + data.length)), 8 + data.length);
      keep.push(chunk);
      orientation = 1;
    }
    if (!PNG_DROP.has(type)) keep.push(buf.slice(pos, end));
    pos = end;
    if (type === "IEND") break;
  }
  return Buffer.concat(keep);
}

/* ---------- WebP ---------- */

function stripWebp(buf) {
  const chunks = [];
  let pos = 12;
  let orientation = 1;
  const riffEnd = Math.min(buf.length, 8 + buf.readUInt32LE(4));
  while (pos + 8 <= riffEnd) {
    const id = buf.toString("latin1", pos, pos + 4);
    const size = buf.readUInt32LE(pos + 4);
    const end = pos + 8 + size + (size & 1);
    if (pos + 8 + size > buf.length) return null;
    if (id === "EXIF") {
      const d = buf.slice(pos + 8, pos + 8 + size);
      orientation = exifOrientation(d, d.toString("latin1", 0, 6) === "Exif\0\0" ? 6 : 0);
    }
    if (id !== "EXIF" && id !== "XMP ") chunks.push(Buffer.from(buf.slice(pos, Math.min(end, buf.length))));
    pos = end;
  }
  let hasVp8x = false;
  for (const c of chunks) {
    if (c.toString("latin1", 0, 4) === "VP8X") {
      hasVp8x = true;
      c[8] &= ~0x04; // no XMP
      if (orientation === 1) c[8] &= ~0x08; // no EXIF
    }
  }
  if (orientation !== 1 && hasVp8x) {
    // Keep only the rotation, as the last chunk (where EXIF belongs).
    const data = orientationTiff(orientation);
    const chunk = Buffer.alloc(8 + data.length + (data.length & 1));
    chunk.write("EXIF", 0, "latin1");
    chunk.writeUInt32LE(data.length, 4);
    data.copy(chunk, 8);
    chunks.push(chunk);
  }
  const body = Buffer.concat(chunks);
  const head = Buffer.alloc(12);
  head.write("RIFF", 0, "latin1");
  head.writeUInt32LE(4 + body.length, 4);
  head.write("WEBP", 8, "latin1");
  return Buffer.concat([head, body]);
}

/* ---------- HEIC / AVIF / TIFF (in place) ---------- */

function stripInPlace(buf, kind) {
  const out = Buffer.from(buf);
  let changed = false;
  if (kind === "tiff") {
    changed = blankGpsInPlace(out, 0) || changed;
  } else {
    // ISOBMFF stores EXIF as an item starting "Exif\0\0" followed by TIFF.
    const marker = Buffer.from("Exif\0\0");
    let i = out.indexOf(marker);
    while (i !== -1) {
      changed = blankGpsInPlace(out, i + 6) || changed;
      i = out.indexOf(marker, i + 6);
    }
  }
  changed = blankXmpInPlace(out) || changed;
  return changed ? out : buf;
}

/**
 * Returns a cleaned copy of the image bytes, or the same buffer if there was
 * nothing to remove or the file wasn't understood (never throws).
 */
function stripBuffer(buf) {
  try {
    const kind = sniff(buf);
    let out = null;
    if (kind === "jpeg") out = stripJpeg(buf);
    else if (kind === "png") out = stripPng(buf);
    else if (kind === "webp") out = stripWebp(buf);
    else if (kind === "isobmff" || kind === "tiff") out = stripInPlace(buf, kind);
    if (!out || out.length < 8) return buf;
    return out.equals(buf) ? buf : out;
  } catch {
    return buf;
  }
}

/** Clean one file in place. Returns true if it was changed. */
function stripFile(file) {
  let buf;
  try {
    buf = fs.readFileSync(file);
  } catch {
    return false;
  }
  const out = stripBuffer(buf);
  if (out === buf) return false;
  fs.writeFileSync(file, out);
  return true;
}

/** Clean every image under a folder. Returns the list of changed files. */
function stripDirectory(dir) {
  const changed = [];
  const walk = (d) => {
    let entries = [];
    try {
      entries = fs.readdirSync(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      if (e.name === "node_modules" || e.name === ".git" || e.name === "__fixtures__") continue;
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (IMAGE_EXT.test(e.name) && stripFile(full)) changed.push(full);
    }
  };
  walk(dir);
  return changed;
}

module.exports = { stripBuffer, stripFile, stripDirectory, sniff };

if (require.main === module) {
  const dirs = process.argv.slice(2);
  if (!dirs.length) dirs.push(path.join(__dirname, "..", "site"));
  let total = 0;
  for (const d of dirs) {
    const stat = fs.existsSync(d) && fs.statSync(d);
    const changed = stat && stat.isFile() ? (stripFile(d) ? [d] : []) : stripDirectory(d);
    for (const f of changed) console.log("[photo privacy] cleaned " + f);
    total += changed.length;
  }
  console.log(`[photo privacy] ${total} image(s) cleaned`);
}
