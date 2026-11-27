import { describe, it, expect } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import { stripBuffer, stripDirectory } from "./stripImageMetadata.js";

const fixture = (name) => fs.readFileSync(path.join(__dirname, "__fixtures__", name));

// Fixtures carry a made-up GPS position, a camera make and (JPEG) an XMP packet.
const LEAKS = ["TestCam", "xmpmeta", "GPSLatitude"];

// Orientation value of the first EXIF/TIFF block in the file (or 1).
function orientation(buf) {
  for (const mark of ["MM\0*", "II*\0"]) {
    const i = buf.indexOf(Buffer.from(mark, "latin1"));
    if (i === -1) continue;
    const le = mark === "II*\0";
    const u16 = (o) => (le ? buf.readUInt16LE(i + o) : buf.readUInt16BE(i + o));
    const u32 = (o) => (le ? buf.readUInt32LE(i + o) : buf.readUInt32BE(i + o));
    const ifd = u32(4);
    for (let k = 0; k < u16(ifd); k++) {
      const e = ifd + 2 + k * 12;
      if (u16(e) === 0x0112) return u16(e + 8);
    }
  }
  return 1;
}

const hasGpsPointer = (buf) =>
  buf.includes(Buffer.from([0x88, 0x25])) || buf.includes(Buffer.from([0x25, 0x88]));

describe("stripImageMetadata", () => {
  for (const name of ["gps-rotated.jpg", "gps.png", "gps.webp"]) {
    it(`removes location and camera details from ${name}, keeping rotation`, () => {
      const before = fixture(name);
      expect(orientation(before)).toBe(6);
      const after = stripBuffer(before);
      expect(after.length).toBeLessThan(before.length);
      for (const s of LEAKS) expect(after.includes(Buffer.from(s))).toBe(false);
      expect(hasGpsPointer(after)).toBe(false);
      expect(orientation(after)).toBe(6);
    });

    it(`is a no-op the second time for ${name}`, () => {
      const once = stripBuffer(fixture(name));
      expect(stripBuffer(once)).toBe(once);
    });
  }

  it("keeps the JPEG's end-of-image marker", () => {
    const after = stripBuffer(fixture("gps-rotated.jpg"));
    expect(after.slice(-2)).toEqual(Buffer.from([0xff, 0xd9]));
  });

  it("leaves files it doesn't understand alone", () => {
    const junk = Buffer.from("not an image at all");
    expect(stripBuffer(junk)).toBe(junk);
    const truncated = fixture("truncated.avif.jpg");
    expect(() => stripBuffer(truncated)).not.toThrow();
  });

  it("cleans a folder in place", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "strip-"));
    fs.mkdirSync(path.join(dir, "img"));
    fs.writeFileSync(path.join(dir, "img", "photo.jpeg"), fixture("gps-rotated.jpg"));
    fs.writeFileSync(path.join(dir, "notes.md"), "TestCam");
    const changed = stripDirectory(dir);
    expect(changed).toHaveLength(1);
    expect(fs.readFileSync(path.join(dir, "img", "photo.jpeg")).includes(Buffer.from("TestCam"))).toBe(false);
    expect(fs.readFileSync(path.join(dir, "notes.md"), "utf8")).toBe("TestCam");
  });
});
