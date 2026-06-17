#!/usr/bin/env node
/**
 * Headless renderer for the Contractor Flow launch teaser → MP4.
 *
 * Opens teaser/index.html?bare=1 at 1080x1920 in headless Chromium, records one
 * full loop in real time using Playwright's native video capture, then trims and
 * transcodes it to a clean H.264 MP4 with ffmpeg.
 *
 *   node teaser/render.mjs
 *   node teaser/render.mjs --out reel.mp4 --fps 30
 *
 * Requires: `playwright` (npm i -D playwright && npx playwright install chromium)
 *           and `ffmpeg` on PATH. Set CHROME_PATH to use a specific browser binary.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { readdir, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (f, d) => { const i = args.indexOf(f); return i !== -1 && args[i + 1] ? args[i + 1] : d; };
const FPS = parseInt(opt('--fps', '30'), 10);
const OUT = resolve(opt('--out', join(__dirname, 'contractor-flow-teaser.mp4')));
const PAGE = pathToFileURL(join(__dirname, 'index.html')).href + '?bare=1';

function run(cmd, a) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, a, { stdio: ['ignore', 'ignore', 'inherit'] });
    p.on('error', rej);
    p.on('close', (c) => (c === 0 ? res() : rej(new Error(`${cmd} exited ${c}`))));
  });
}

const launchOpts = { args: ['--no-sandbox', '--force-color-profile=srgb', '--disable-gpu'] };
if (process.env.CHROME_PATH) launchOpts.executablePath = process.env.CHROME_PATH;

const vdir = await mkdtemp(join(tmpdir(), 'cf-teaser-'));
const browser = await chromium.launch(launchOpts);
const ctx = await browser.newContext({
  viewport: { width: 1080, height: 1920 },
  deviceScaleFactor: 1,
  recordVideo: { dir: vdir, size: { width: 1080, height: 1920 } },
});
const page = await ctx.newPage();
await page.goto(PAGE, { waitUntil: 'domcontentloaded' });

const TOTAL = await page.evaluate(() => TL.reduce((a, b) => a + b.d, 0));
console.log(`Recording one ${(TOTAL / 1000).toFixed(1)}s loop…`);
await page.waitForTimeout(TOTAL + 900);       // one full loop + tail (trimmed precisely below)
await ctx.close();                            // finalizes the webm
await browser.close();

const webm = join(vdir, (await readdir(vdir)).filter((f) => f.endsWith('.webm')).sort().pop());

console.log('Encoding with ffmpeg…');
await run('ffmpeg', [
  '-y',
  '-ss', '0.40',                              // skip script boot so we open on the hook
  '-i', webm,
  '-t', (TOTAL / 1000).toFixed(3),            // exactly one loop
  '-vf', `scale=1080:1920:flags=lanczos,fps=${FPS},format=yuv420p`,
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '19',
  '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
  OUT,
]);
await rm(vdir, { recursive: true, force: true });
console.log(`\n✓ Done → ${OUT}`);
