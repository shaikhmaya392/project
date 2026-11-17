/**
 * Makes the store's images fast: every image used from certifiedortho.com/wp-content/
 * is resized (max 1600px wide) and re-encoded as WebP into client/public/media/<path>.webp,
 * served by Vercel's CDN. The client maps the original URL to /media/<path>.webp (lib/format.js), the hero video to /media/<path>.mp4.
 *
 *   node tools/optimize-media.mjs <folder with the downloaded wp-content files>
 * Needs: sharp installed next to this script (npm i --no-save sharp) and ffmpeg for the hero video.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';

const SRC = path.resolve(process.argv[2] || 'media-orig');
const OUT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../client/public/media');
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]));

let before = 0; let after = 0; let n = 0;
for (const file of walk(SRC)) {
  const rel = path.relative(SRC, file);
  const ext = path.extname(rel).toLowerCase();
  before += fs.statSync(file).size;
  if (ext === '.mp4') {
    const dest = path.join(OUT, rel);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file, '-an', '-vf', "scale='min(1280,iw)':-2", '-c:v', 'libx264',
      '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', dest]);
    // poster frame shown instantly while the video loads
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', dest, '-frames:v', '1', '-q:v', '4', `${dest}.jpg`]);
    await sharp(`${dest}.jpg`).webp({ quality: 70 }).toFile(`${dest}.poster.webp`);
    fs.rmSync(`${dest}.jpg`);
    after += fs.statSync(dest).size;
    n++;
    continue;
  }
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif'].includes(ext)) continue;
  const dest = path.join(OUT, `${rel}.webp`); // keep the original extension: 02.jpg and 02.png both exist
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  await sharp(file, { animated: ext === '.gif' })
    .rotate()
    .resize({ width: 1600, withoutEnlargement: true })
    .webp({ quality: ext === '.png' ? 80 : 75, effort: 5 })
    .toFile(dest);
  after += fs.statSync(dest).size;
  n++;
}
console.log(`${n} files: ${(before / 1e6).toFixed(1)} MB → ${(after / 1e6).toFixed(1)} MB`);
