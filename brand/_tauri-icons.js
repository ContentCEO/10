// Generate Tauri-required icon sizes for each module from the brand SVG.
// Outputs PNGs at all sizes Tauri's bundler expects, plus an .ico for Windows.
// .icns generation for macOS is best done on a Mac builder; if missing,
// Tauri will skip the .app icon and the CI macOS job can re-run `tauri icon`.

const sharp = require("sharp");
const toIco = require("to-ico");
const fs = require("fs");
const path = require("path");

const MODULES = [
  { name: "crm",         src: "brand/by-brand/crm/icon.svg",         out: "src-tauri/icons" },
  { name: "marketplace", src: "brand/by-brand/marketplace/icon.svg", out: "marketplace-app/src-tauri/icons" },
  { name: "launchpad",   src: "brand/by-brand/launchpad/icon.svg",   out: "launchpad-app/src-tauri/icons" },
];

// Sizes Tauri's bundler references in tauri.conf.json `bundle.icon`.
const PNG_SIZES = [
  { name: "32x32.png",        w: 32 },
  { name: "128x128.png",      w: 128 },
  { name: "128x128@2x.png",   w: 256 },
  { name: "icon.png",         w: 512 },          // fallback / Linux
  { name: "Square30x30Logo.png",   w: 30  },     // Windows store extras (harmless if unused)
  { name: "Square44x44Logo.png",   w: 44  },
  { name: "Square71x71Logo.png",   w: 71  },
  { name: "Square89x89Logo.png",   w: 89  },
  { name: "Square107x107Logo.png", w: 107 },
  { name: "Square142x142Logo.png", w: 142 },
  { name: "Square150x150Logo.png", w: 150 },
  { name: "Square284x284Logo.png", w: 284 },
  { name: "Square310x310Logo.png", w: 310 },
  { name: "StoreLogo.png",         w: 50  },
];

// ICO sizes — small set, Windows installer needs them.
const ICO_SIZES = [16, 32, 48, 64, 128, 256];

async function ensureDir(d) {
  await fs.promises.mkdir(d, { recursive: true });
}

async function buildModule({ name, src, out }) {
  if (!fs.existsSync(src)) {
    console.warn(`skip ${name}: source ${src} missing`);
    return;
  }
  await ensureDir(out);
  console.log(`\n→ ${name}`);

  // PNGs
  for (const s of PNG_SIZES) {
    const density = Math.min(600, Math.max(72, Math.round(s.w / 4)));
    const dest = path.join(out, s.name);
    await sharp(src, { density, limitInputPixels: false })
      .resize(s.w, s.w, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(dest);
    console.log(`  ${s.name} (${s.w}×${s.w})`);
  }

  // ICO from in-memory PNG buffers at ICO sizes
  const icoBuffers = await Promise.all(
    ICO_SIZES.map(async (w) => {
      const density = Math.min(600, Math.max(72, Math.round(w / 4)));
      return sharp(src, { density, limitInputPixels: false })
        .resize(w, w, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .png()
        .toBuffer();
    })
  );
  const icoOut = path.join(out, "icon.ico");
  await fs.promises.writeFile(icoOut, await toIco(icoBuffers));
  console.log(`  icon.ico (${ICO_SIZES.length} sizes)`);

  // Place the source SVG alongside for reference
  await fs.promises.copyFile(src, path.join(out, "icon.svg"));
  console.log(`  icon.svg`);

  // .icns left for the macOS builder. We drop a 1024×1024 PNG that
  // `cargo tauri icon` can promote to .icns on CI.
  const density1024 = Math.min(1600, Math.max(72, Math.round(1024 / 4)));
  await sharp(src, { density: density1024, limitInputPixels: false })
    .resize(1024, 1024, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(path.join(out, "icon-1024.png"));
  console.log(`  icon-1024.png (for .icns generation on macOS)`);
}

(async () => {
  for (const m of MODULES) await buildModule(m);
  console.log("\nAll module icons generated.");
})().catch((e) => { console.error(e); process.exit(1); });
