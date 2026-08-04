const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const testData = fs.mkdtempSync(path.join(os.tmpdir(), "memory-ai-exif-"));
process.env.MEMORY_AI_DATA_DIR = testData;

const { parseJpegExif } = require("../backend/life-service");
const { closeDb } = require("../backend/db");

function syntheticIphoneJpeg() {
  const tiff = Buffer.alloc(82);
  tiff.write("II", 0, "ascii");
  tiff.writeUInt16LE(42, 2);
  tiff.writeUInt32LE(8, 4);
  tiff.writeUInt16LE(2, 8);

  tiff.writeUInt16LE(0x010f, 10);
  tiff.writeUInt16LE(2, 12);
  tiff.writeUInt32LE(6, 14);
  tiff.writeUInt32LE(38, 18);

  tiff.writeUInt16LE(0x8769, 22);
  tiff.writeUInt16LE(4, 24);
  tiff.writeUInt32LE(1, 26);
  tiff.writeUInt32LE(44, 30);
  tiff.writeUInt32LE(0, 34);
  tiff.write("Apple\0", 38, "ascii");

  tiff.writeUInt16LE(1, 44);
  tiff.writeUInt16LE(0x9003, 46);
  tiff.writeUInt16LE(2, 48);
  tiff.writeUInt32LE(20, 50);
  tiff.writeUInt32LE(62, 54);
  tiff.writeUInt32LE(0, 58);
  tiff.write("2024:02:03 04:05:06\0", 62, "ascii");

  const payload = Buffer.concat([Buffer.from("Exif\0\0", "binary"), tiff]);
  const marker = Buffer.alloc(4);
  marker.writeUInt16BE(0xffe1, 0);
  marker.writeUInt16BE(payload.length + 2, 2);
  return Buffer.concat([Buffer.from([0xff, 0xd8]), marker, payload, Buffer.from([0xff, 0xd9])]);
}

test.after(() => {
  closeDb();
  fs.rmSync(testData, { recursive: true, force: true });
});

test("JPEG EXIF parser reads Apple make and original capture time", () => {
  const exif = parseJpegExif(syntheticIphoneJpeg());
  assert.equal(exif.make, "Apple");
  assert.equal(exif.date_time_original, "2024-02-03T04:05:06");
});
