# ContractorFlow desktop icons

`icon.svg` is the source vector. CI generates a 1024×1024 PNG at build time
(`scripts/gen-tauri-icon.mjs`) and then runs `cargo tauri icon` which fans the
PNG out into the platform-specific files Tauri needs:

- `32x32.png`
- `128x128.png`
- `128x128@2x.png` (256×256)
- `icon.icns` (macOS)
- `icon.ico` (Windows)

To regenerate locally:

```bash
node scripts/gen-tauri-icon.mjs
npx @tauri-apps/cli@latest icon src-tauri/icons/icon.png
```
