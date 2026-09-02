// Generates PWA icons as PNG without any dependency (pure zlib PNG encoder).
// Design: dark pitch green square, white ball in the middle.
// Run: node scripts/gen-icons.mjs
import { deflateSync, crc32 } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';

const BG = [0x1f, 0x5f, 0x3a];
const WHITE = [0xf4, 0xf4, 0xf0];

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const typeBuf = Buffer.from(type, 'ascii');
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])) >>> 0);
  return Buffer.concat([len, typeBuf, data, crc]);
}

function png(size, { ballRadius }) {
  const raw = Buffer.alloc((size * 3 + 1) * size);
  const c = size / 2;
  const r = size * ballRadius;
  const ring = r * 0.82;
  for (let y = 0; y < size; y++) {
    raw[y * (size * 3 + 1)] = 0; // filter: none
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x + 0.5 - c, y + 0.5 - c);
      let px = BG;
      if (d <= r) px = WHITE;
      if (d <= ring && d >= ring - size * 0.02) px = BG; // thin ring for a "ball" look
      const o = y * (size * 3 + 1) + 1 + x * 3;
      raw[o] = px[0];
      raw[o + 1] = px[1];
      raw[o + 2] = px[2];
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

mkdirSync('public/icons', { recursive: true });
writeFileSync('public/icons/icon-192.png', png(192, { ballRadius: 0.3 }));
writeFileSync('public/icons/icon-512.png', png(512, { ballRadius: 0.3 }));
// Maskable: keep the motif inside the 80% safe zone.
writeFileSync('public/icons/icon-512-maskable.png', png(512, { ballRadius: 0.22 }));
writeFileSync('public/icons/apple-touch-icon.png', png(180, { ballRadius: 0.3 }));
console.log('icons written to public/icons');
