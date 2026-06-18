# Contractor Flow logo kit — by brand

Four folders. Each contains every variant you need for that brand.

```
by-brand/
├── contractor-flow/   # Parent brand (indigo→violet)
├── crm/                # Sub-brand (indigo, dashboard grid)
├── marketplace/        # Sub-brand (emerald, storefront)
└── launchpad/          # Sub-brand (orange, rocket)
```

## What's in each folder

| File              | Use case                                          |
|-------------------|---------------------------------------------------|
| `icon.svg` + PNGs | Square icon — favicons, social avatars, app icons |
| `wordmark.svg` + PNGs | Text only — email signatures, footers         |
| `logo.svg` + PNGs | Full lockup (icon + wordmark) — site headers, business cards |

## PNG sizes (per asset)

| Size | Typical use                       |
|------|-----------------------------------|
| 192  | Favicon, tiny avatar              |
| 400  | Social profile pic, small display |
| 900  | Web header, social post, email    |
| 1800 | Print, billboards, large displays |

For anything that needs to scale beyond 1800px, use the `.svg` source.

## Contractor Flow (parent) — extras

The parent brand folder has dark-background variants:
- `wordmark-dark.svg` / `wordmark-dark-*.png` — for dark surfaces
- `logo-dark.svg` / `logo-dark-*.png` — for dark surfaces
- `logo-large.svg` / `logo-large-*.png` — full lockup + "ONE LEAD · ONE CONTRACTOR" tagline

## Quick decisions

- **Favicon** → `icon-192.png`
- **Twitter/Instagram avatar** → `icon-400.png`
- **Site header (light)** → `logo-900.png`
- **Site header (dark)** → `logo-dark-900.png` (parent only)
- **Email signature** → `wordmark-400.png`
- **Billboard / print** → `logo-1800.png` or `logo.svg`

## Colors (hex)

| Brand           | Primary                        |
|-----------------|--------------------------------|
| Contractor Flow | `#6366f1` → `#8b5cf6` gradient |
| CRM             | `#4f46e5` → `#6366f1` gradient |
| Marketplace     | `#059669` → `#10b981` gradient |
| Launchpad       | `#ea580c` → `#f97316` gradient |
