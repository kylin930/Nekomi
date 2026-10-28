// Build-time maintenance only: rasterize the supplied source without altering it.
// Sharp is already installed by Astro; no new runtime dependency is needed.
import sharp from 'sharp';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const root = new URL('../', import.meta.url);
const source = await readFile(new URL('public/favicon.svg', root));
await mkdir(new URL('docs/brand/', root), { recursive: true });
await sharp(source).resize(180, 180).png().toFile(fileURLToPath(new URL('public/apple-touch-icon.png', root)));
const icon = await sharp(source).resize(448, 448).png().toBuffer();
await sharp({ create: { width: 1280, height: 640, channels: 4, background: '#ffffff' } })
  .composite([{ input: icon, gravity: 'centre' }]).png()
  .toFile(fileURLToPath(new URL('docs/brand/github-social-preview.png', root)));
// An ICO container with PNG entries, all rendered from the same SVG.
const sizes = [16, 32, 48];
const entries = await Promise.all(sizes.map(size => sharp(source).resize(size, size).png().toBuffer()));
const header = Buffer.alloc(6 + 16 * sizes.length);
header.writeUInt16LE(1, 2);
header.writeUInt16LE(sizes.length, 4);
let offset = header.length;
entries.forEach((data, index) => {
  const entry = 6 + index * 16;
  header[entry] = sizes[index]; header[entry + 1] = sizes[index];
  header.writeUInt16LE(1, entry + 4); header.writeUInt16LE(32, entry + 6);
  header.writeUInt32LE(data.length, entry + 8); header.writeUInt32LE(offset, entry + 12);
  offset += data.length;
});
await writeFile(new URL('public/favicon.ico', root), Buffer.concat([header, ...entries]));
console.log('Generated Apple 180×180, ICO 16/32/48 and GitHub preview 1280×640 from public/favicon.svg.');
