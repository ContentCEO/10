# Contractor Flow — Launch Teaser (9:16)

An **Apple-style SaaS launch teaser** for Contractor Flow. Vertical **1080 × 1920**,
~22-second loop, fully self-contained in a single HTML file. No build step, no
dependencies — open it in a browser and it plays.

> *"Built where the work is."*

## What it is

A cinematic, minimalist product reel rendered entirely with HTML / CSS / JS —
real motion graphics, not a screen recording. Designed for sound-off viewing
(every beat is captioned) and built on the Contractor Flow brand system
(Inter + Instrument Serif, indigo `#6366f1` → violet `#8b5cf6` → magenta accents,
near-black `#06060A`).

### Story beats (the narrative)

| # | Scene | Copy | Treatment |
|---|-------|------|-----------|
| 1 | Hook | *when was the last time your tools felt built the way you actually work?* | tiny lowercase serif, floating on off-white |
| 2 | Problem | **Most contractor software is built for everyone.** | bold statement, `everyone` in gradient |
| 3 | Twist | **So it fits no one.** | emphasized muted word |
| 4 | Why | **Why?** | giant single word, motion-blur snap |
| 5 | Question | **What if it was built where the work is?** | accent on `work is?` |
| 6 | Reveal | the product UI | device hero — revenue counts up, chart bars grow, lead cards stack in |
| 7 | Payoff | **CRM. Leads. Launchpad.** | one operating system |
| 8 | Lockup | **Contractor Flow** · *Built where the work is.* | gradient `F` mark, wordmark, hairline, tagline |

### Production details

- **9:16, 1080×1920**, auto-scales to fit any screen, centered on a dark stage.
- **Cinematic ambience**: handheld drift, film grain, vignette, soft lens glow,
  and indigo/violet/magenta color bleed that leaks across dark frames.
- **Motion language**: blur-in / snap-to-focus text, crossfades + push
  transitions (no hard cuts), shallow-DOF floating device, parallax bleeds.
- **Real UI motion graphics**: animated bar chart, count-up revenue stat,
  stacking lead cards — themed to the real product (CRM · Marketplace · Launchpad).
- **Captioned** throughout for sound-off autoplay.

## View it

Open `teaser/index.html` in any modern browser (Chrome recommended):

```bash
open teaser/index.html        # macOS
xdg-open teaser/index.html    # Linux
```

It autoplays and loops. On-screen controls (bottom-left, excluded from exports):

- **↻ Replay** — restart the timeline
- **● Record .webm** — capture exactly one loop to a downloadable `.webm`
  (uses the browser Screen Capture API; pick the tab/window, recording stops
  automatically after one full loop)
- **Hide UI** — hide the controls for a clean recording / screenshot

## Export to MP4

The in-browser recorder produces a `.webm`. To get a clean, square-pixel **1080×1920 MP4**
(Instagram Reels / TikTok / YouTube Shorts ready):

**Option A — convert the recorded webm**

```bash
ffmpeg -i contractor-flow-teaser.webm \
  -vf "scale=1080:1920:flags=lanczos,format=yuv420p" \
  -c:v libx264 -preset slow -crf 18 -movflags +faststart \
  contractor-flow-teaser.mp4
```

**Option B — headless render with Playwright** (no on-screen capture, no UI chrome)

```bash
npm i -D playwright && npx playwright install chromium
node teaser/render.mjs                  # → teaser/contractor-flow-teaser.mp4
node teaser/render.mjs --fps 30 --out reel.mp4   # options
```

`render.mjs` opens the page headless at exactly 1080×1920, hides the controls,
plays one full loop while grabbing frames, then encodes them to MP4 with ffmpeg.
Requires `ffmpeg` on PATH. (It auto-detects a Playwright-managed Chromium, or set
`CHROME_PATH` to point at any Chromium/Chrome binary.)

## Customize

Everything lives in `index.html`:

- **Copy** — edit the `<section class="scene">` blocks.
- **Timing** — the `TL` array near the bottom (`d` = duration per beat in ms;
  total runtime is the sum). Currently ~22s; trim `d` values for a tighter cut.
- **Captions** — the `cap` field on each `TL` beat.
- **Colors** — the `:root` CSS variables (`--indigo`, `--violet`, `--magenta`).
- **Product mockup** — the `data-scene="reveal"` device markup (stats, chart
  bars `--h`, lead cards).
