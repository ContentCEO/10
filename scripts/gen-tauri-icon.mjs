#!/usr/bin/env node
// Rasterizes src-tauri/icons/icon.svg to a 1024×1024 PNG that `tauri icon`
// can fan out into the platform-specific icon set. Uses `sharp` (lightweight,
// no headless browser).

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const svgPath = path.join(root, "src-tauri", "icons", "icon.svg");
const outDir = path.join(root, "src-tauri", "icons");
const outPath = path.join(outDir, "icon.png");

if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

const svg = readFileSync(svgPath);

let sharp;
try {
  ({ default: sharp } = await import("sharp"));
} catch (e) {
  console.error("Missing 'sharp'. Install with: npm i -D sharp");
  process.exit(1);
}

const buffer = await sharp(svg, { density: 384 })
  .resize(1024, 1024)
  .png({ compressionLevel: 9 })
  .toBuffer();

writeFileSync(outPath, buffer);
console.log(`wrote ${outPath} (${buffer.byteLength} bytes)`);
