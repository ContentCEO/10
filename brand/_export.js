// One-off bulk exporter: SVG → PNG at multiple sizes, organized by type.
// Run with: node brand/_export.js
const sharp = require("sharp");
const path = require("path");

const SIZES = [1800, 900, 400, 192];

// Each row: [sourceSvg, destFolder, baseName]
const JOBS = [
  // ICONS — square 1:1 marks for favicons, social avatars, app icons.
  ["brand/icon.svg",             "brand/png/icons", "icon-primary"],
  ["brand/icon-crm.svg",         "brand/png/icons", "icon-crm"],
  ["brand/icon-marketplace.svg", "brand/png/icons", "icon-marketplace"],
  ["brand/icon-launchpad.svg",   "brand/png/icons", "icon-launchpad"],

  // WORDMARKS — text-only, no icon block.
  ["brand/wordmark.svg",             "brand/png/wordmarks", "wordmark-primary"],
  ["brand/wordmark-dark.svg",        "brand/png/wordmarks", "wordmark-primary-dark"],
  ["brand/wordmark-crm.svg",         "brand/png/wordmarks", "wordmark-crm"],
  ["brand/wordmark-marketplace.svg", "brand/png/wordmarks", "wordmark-marketplace"],
  ["brand/wordmark-launchpad.svg",   "brand/png/wordmarks", "wordmark-launchpad"],

  // FULL LOGOS — icon + wordmark lockups (the canonical brand mark).
  ["brand/logo.svg",                 "brand/png/full-logos", "logo-primary"],
  ["brand/logo-dark.svg",            "brand/png/full-logos", "logo-primary-dark"],
  ["brand/logo-primary-large.svg",   "brand/png/full-logos", "logo-primary-large"],
  ["brand/logo-crm-v2.svg",          "brand/png/full-logos", "logo-crm"],
  ["brand/logo-marketplace-v2.svg",  "brand/png/full-logos", "logo-marketplace"],
  ["brand/logo-launchpad-v2.svg",    "brand/png/full-logos", "logo-launchpad"],
];

async function main() {
  let count = 0;
  for (const [src, dest, name] of JOBS) {
    for (const w of SIZES) {
      const out = path.join(dest, `${name}-${w}.png`);
      // Density scales the rasterizer's DPI; bound it so massive icons
      // (e.g. 256 viewBox at 1800px target) don't trip sharp's pixel cap.
      const density = Math.min(600, Math.max(72, Math.round(w / 4)));
      await sharp(src, { density, limitInputPixels: false })
        .resize(w, null, { fit: "inside" })
        .png()
        .toFile(out);
      count++;
    }
  }
  console.log(`Exported ${count} PNGs across ${JOBS.length} source SVGs.`);
}
main().catch((e) => { console.error(e); process.exit(1); });
