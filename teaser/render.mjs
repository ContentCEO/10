#!/usr/bin/env node
/**
 * Headless renderer for the Contractor Flow launch teaser.
 *
 * Opens teaser/index.html at 1080x1920 in headless Chromium, hides the on-screen
 * controls, plays exactly one loop while capturing PNG frames, then encodes them
 * to an MP4 with ffmpeg.
 *
 *   node teaser/render.mjs
 *   node teaser/render.mjs --fps 30 --out reel.mp4
 *
 * Requires: `playwright` (npm i -D playwright && npx playwright install chromium)
 *           and `ffmpeg` on PATH. Set CHROME_PATH to use a specific browser binary.
 */
import { chromium } from 'playwright';
import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- args ----
const args = process.argv.slice(2);
const opt = (flag, def) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] ? args[i + 1] : def;
};
const FPS = parseInt(opt('--fps', '30'), 10);
const OUT = resolve(opt('--out', join(__dirname, 'contractor-flow-teaser.mp4')));
const PAGE = pathToFileURL(join(__dirname, 'index.html')).href;

function run(cmd, cmdArgs) {
  return new Promise((res, rej) => {
    const p = spawn(cmd, cmdArgs, { stdio: ['ignore', 'inherit', 'inherit'] });
    p.on('error', rej);
    p.on('close', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited ${code}`))));
  });
}

const launchOpts = { args: ['--no-sandbox', '--force-color-profile=srgb'] };
if (process.env.CHROME_PATH) launchOpts.executablePath = process.env.CHROME_PATH;

const browser = await chromium.launch(launchOpts);
const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
await page.goto(PAGE, { waitUntil: 'networkidle' });

// total runtime from the page's own timeline
const TOTAL = await page.evaluate(() =>
  TL.reduce((a, b) => a + b.d, 0)
);
const frameCount = Math.ceil((TOTAL / 1000) * FPS);
console.log(`Rendering ${frameCount} frames @ ${FPS}fps (~${(TOTAL / 1000).toFixed(1)}s)…`);

// hide controls + restart from a clean loop
await page.evaluate(() => {
  document.getElementById('hud').style.display = 'none';
  document.getElementById('progress').style.display = 'none';
  document.getElementById('replay').click();
});

const dir = await mkdtemp(join(tmpdir(), 'cf-teaser-'));
const frameInterval = 1000 / FPS;
const t0 = Date.now();
for (let i = 0; i < frameCount; i++) {
  const num = String(i).padStart(5, '0');
  await page.screenshot({ path: join(dir, `f${num}.png`) });
  // pace capture so the page's wall-clock animation advances ~one frame
  const target = t0 + (i + 1) * frameInterval;
  const wait = target - Date.now();
  if (wait > 0) await page.waitForTimeout(wait);
  if (i % FPS === 0) process.stdout.write(`  ${Math.round((i / frameCount) * 100)}%\r`);
}
await browser.close();

console.log('\nEncoding with ffmpeg…');
await run('ffmpeg', [
  '-y',
  '-framerate', String(FPS),
  '-i', join(dir, 'f%05d.png'),
  '-vf', 'scale=1080:1920:flags=lanczos,format=yuv420p',
  '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-movflags', '+faststart',
  OUT,
]);
await rm(dir, { recursive: true, force: true });
console.log(`\n✓ Done → ${OUT}`);
