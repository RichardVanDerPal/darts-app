// Regenerate PWA icons from public/favicon.svg.
// Usage: `pnpm run icons` (defined in package.json).
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import sharp from 'sharp';

const svg = readFileSync(resolve('public/favicon.svg'));
const outDir = resolve('public/icons');

async function main() {
  await Promise.all([
    sharp(svg).resize(192, 192).png().toFile(`${outDir}/icon-192.png`),
    sharp(svg).resize(512, 512).png().toFile(`${outDir}/icon-512.png`),
    // Maskable icon: pad the artwork to 80% inside a filled background so the
    // safe zone survives platform masks.
    sharp({
      create: { width: 512, height: 512, channels: 4, background: '#0f172a' },
    })
      .composite([{ input: await sharp(svg).resize(410, 410).png().toBuffer() }])
      .png()
      .toFile(`${outDir}/icon-512-maskable.png`),
  ]);
  console.log('Icons written to', outDir);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
