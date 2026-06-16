# Desktop apps — release guide

Three separate Tauri desktop apps, one per module. Each has its own
GitHub repo, its own GitHub Actions release pipeline, its own download
page on `contractorflowstore.com/download/[module]`.

| Module      | Repo                                         | Identifier                       | Default URL                                       |
|-------------|----------------------------------------------|----------------------------------|---------------------------------------------------|
| CRM         | `ContentCEO/10`                              | `com.contractorflow.crm`         | `https://contractorflowstore.com/dashboard`       |
| Marketplace | `ContentCEO/contractor-flow-marketplace`     | `com.contractorflow.marketplace` | `https://marketplace.contractorflowstore.com/dashboard` |
| Launchpad   | `ContentCEO/contractor-flow-launchpad`       | `com.contractorflow.launchpad`   | `https://launchpad.contractorflowstore.com/dashboard`   |

Each app:
- Loads its production URL on first launch
- Auto-updates from the same repo's GitHub Releases
- Has its own brand icon (indigo / emerald / orange)
- Ships unsigned by default (security warnings on macOS/Windows — see signing below)

---

## How to ship a release

### 1. From your local clone of the module's repo

```bash
# bump the version in tauri.conf.json + Cargo.toml + package.json
# then push a matching tag
git tag v0.2.1
git push origin v0.2.1
```

The GitHub Actions workflow at `.github/workflows/tauri-release.yml`
fires automatically. It builds for:
- macOS arm64 (.dmg + auto-update bundle)
- macOS x86_64 (.dmg + auto-update bundle)
- Windows (.exe NSIS installer)
- Linux (.AppImage + .deb)

Build takes ~25 minutes. When done, the artifacts appear under
`Releases → Latest`, and the `/download/[module]` page picks them up
automatically (cached 10 min).

### 2. Manually trigger a build (no tag needed)

GitHub → Actions tab → `tauri-release-[module]` workflow → **Run workflow**.

---

## Code signing (required to remove security warnings)

Unsigned builds work but show:
- **macOS**: "Apple cannot verify… is free of malware" — user must
  right-click → Open. Not ideal for first impressions.
- **Windows**: SmartScreen filter blocks the install — user must click
  "More info → Run anyway".

### Apple Developer (one cert covers all 3 apps · $99/year)

1. https://developer.apple.com → enroll
2. Generate a **Developer ID Application** certificate
3. Export it as `.p12` with a password
4. Add to each repo's GitHub Secrets:
   - `APPLE_CERTIFICATE`           — base64 of the .p12
   - `APPLE_CERTIFICATE_PASSWORD`  — the export password
   - `APPLE_SIGNING_IDENTITY`      — e.g. "Developer ID Application: Davi Chaves (TEAMID)"
   - `APPLE_ID`                    — your Apple ID email
   - `APPLE_PASSWORD`              — app-specific password from appleid.apple.com
   - `APPLE_TEAM_ID`               — the 10-char team ID

The workflow already references these env vars — once set, signing
+ notarization happens automatically.

### Windows EV code signing (optional, $300-700/year · per cert)

Same flow but with a Windows EV cert (DigiCert, Sectigo). Set:
- `WINDOWS_CERTIFICATE`
- `WINDOWS_CERTIFICATE_PASSWORD`

Add the steps to the workflow file when ready.

### Tauri updater signing (free · required for auto-updates)

The auto-updater verifies releases with a minisign key. Generate once:

```bash
# Install Tauri CLI globally first
cargo install tauri-cli@^2

# Generate a keypair for each app
tauri signer generate -w ~/.tauri/crm-updater.key
tauri signer generate -w ~/.tauri/marketplace-updater.key
tauri signer generate -w ~/.tauri/launchpad-updater.key
```

For each app:
1. Open the generated `.key.pub` file → copy the contents
2. Paste into `src-tauri/tauri.conf.json` → `plugins.updater.pubkey`
3. Take the private key (the `.key` file without `.pub`)
4. Add to GitHub Secrets:
   - `TAURI_SIGNING_PRIVATE_KEY`          — contents of the `.key` file
   - `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` — the passphrase you set

Currently the marketplace + launchpad apps have `pubkey: "REPLACE_ME"` —
they'll build fine but auto-updates won't work until you replace those.

---

## Local development

You don't need to do this for releases — GitHub Actions handles it. But
to test the desktop app locally:

```bash
# Install deps once
npm install
cargo install tauri-cli@^2

# Run the desktop app pointed at your local Next.js
cd marketplace-app
npm run dev                     # in one terminal
cargo tauri dev                 # in another, loads the dev URL
```

Or build a local installer:
```bash
cargo tauri build
# Output: src-tauri/target/release/bundle/[platform]/
```

---

## What lives where

```
ContentCEO/10                              (CRM)
├── src-tauri/             ← CRM Tauri config (indigo)
│   ├── tauri.conf.json    ← com.contractorflow.crm
│   ├── icons/             ← indigo CF icons
│   └── ...
└── .github/workflows/
    └── tauri-release.yml  ← builds on v* tag push

ContentCEO/contractor-flow-marketplace     (Marketplace)
├── src-tauri/             ← Marketplace Tauri config (emerald)
│   ├── tauri.conf.json    ← com.contractorflow.marketplace
│   ├── icons/             ← emerald storefront icons
│   └── ...
└── .github/workflows/
    └── tauri-release.yml

ContentCEO/contractor-flow-launchpad       (Launchpad)
├── src-tauri/             ← Launchpad Tauri config (orange)
│   ├── tauri.conf.json    ← com.contractorflow.launchpad
│   ├── icons/             ← orange rocket icons
│   └── ...
└── .github/workflows/
    └── tauri-release.yml
```

---

## Sept 23 launch sequence

For Marketplace launch specifically:

1. **Generate Tauri updater key** (5 min) — see above
2. **Update marketplace-app/src-tauri/tauri.conf.json pubkey** with the public half
3. **Push secrets to GitHub** (10 min) — the private key + password
4. **Tag a release**: `cd ~/contractor-flow-marketplace && git tag v0.1.0 && git push origin v0.1.0`
5. **Wait 25 minutes** for the build to finish
6. **Verify** at https://contractorflowstore.com/download/marketplace
   → should show the new release with Mac/Windows/Linux download buttons

Apple Developer cert + notarization can be added post-launch — users
can still install with the right-click-Open workaround.
