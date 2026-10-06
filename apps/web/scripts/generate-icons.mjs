// Genera le icone PWA/favicon da un SVG placeholder. Uso: node scripts/generate-icons.mjs
import sharp from 'sharp';
import { writeFile } from 'node:fs/promises';

const svg = Buffer.from(`<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <rect width="512" height="512" rx="96" fill="#0a0a0a"/>
  <rect width="512" height="512" rx="96" fill="#10b981" opacity="0.15"/>
  <text x="256" y="330" font-family="DejaVu Sans, Arial, sans-serif" font-size="230" font-weight="bold" fill="#10b981" text-anchor="middle">FC</text>
</svg>`);

const out = (p) => new URL(`../${p}`, import.meta.url).pathname;
await sharp(svg).resize(512, 512).png().toFile(out('public/icon-512.png'));
await sharp(svg).resize(192, 192).png().toFile(out('public/icon-192.png'));
await sharp(svg).resize(180, 180).png().toFile(out('public/apple-icon.png'));

// favicon.ico con PNG 32x32 incorporato (formato ICO supportato da tutti i browser moderni).
const png = await sharp(svg).resize(32, 32).png().toBuffer();
const header = Buffer.alloc(22);
header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
header.writeUInt8(32, 6); header.writeUInt8(32, 7); header.writeUInt8(0, 8); header.writeUInt8(0, 9);
header.writeUInt16LE(1, 10); header.writeUInt16LE(32, 12);
header.writeUInt32LE(png.length, 14); header.writeUInt32LE(22, 18);
await writeFile(out('src/app/favicon.ico'), Buffer.concat([header, png]));
console.log('icons generated');
