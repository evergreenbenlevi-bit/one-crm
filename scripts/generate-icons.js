// Run: node scripts/generate-icons.js
// Generates placeholder PWA icons (192x192 and 512x512 PNGs)
const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) | 0;
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type), data]);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeInt32BE(crc32(typeAndData));
  return Buffer.concat([len, typeAndData, crcBuf]);
}

function createPNG(size) {
  // Brand color #0079c7 = RGB(0, 121, 199)
  const raw = Buffer.alloc((size * 3 + 1) * size);
  for (let y = 0; y < size; y++) {
    const rowOffset = y * (size * 3 + 1);
    raw[rowOffset] = 0; // filter byte
    for (let x = 0; x < size; x++) {
      const px = rowOffset + 1 + x * 3;
      raw[px] = 0;
      raw[px + 1] = 121;
      raw[px + 2] = 199;
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    signature,
    makeChunk("IHDR", ihdr),
    makeChunk("IDAT", zlib.deflateSync(raw)),
    makeChunk("IEND", Buffer.alloc(0)),
  ]);
}

const outDir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, "icon-192.png"), createPNG(192));
fs.writeFileSync(path.join(outDir, "icon-512.png"), createPNG(512));
console.log("Icons generated: public/icons/icon-192.png, public/icons/icon-512.png");
