"""Generate clean, minimal Instagram posts (1080x1350, 4:5) from church photos.

Usage:  python3 make_posts.py
Output: posts/*.jpg  (+ posts/_preview.jpg contact sheet)

Edit the POSTS list below to change wording, crops, or text placement.
"""
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = Path(__file__).parent
PHOTOS = ROOT / "photos"
OUT = ROOT / "posts"
FONTS = ROOT / "fonts"

W, H = 1080, 1350
MARGIN = 84

CREAM = (247, 244, 238)
INK = (28, 27, 25)
WHITE = (255, 255, 255)


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


SERIF = lambda s: font("playfair-display-latin-400-normal.woff", s)  # noqa: E731
SERIF_I = lambda s: font("playfair-display-latin-400-italic.woff", s)  # noqa: E731
SANS = lambda s: font("Inter-SemiBold.otf", s)  # noqa: E731
SANS_M = lambda s: font("Inter-Medium.otf", s)  # noqa: E731


# Each headline line is a list of (text, italic) segments.
POSTS = [
    {
        "file": "01-come-as-you-are.jpg",
        "photo": "congregation.jpg",
        "layout": "framed",
        "label": "SUNDAY WORSHIP",
        "headline": [[("Come as ", False), ("you are.", True)]],
        "sub": "There's a seat saved for you.",
    },
    {
        "file": "02-my-help.jpg",
        "photo": "looking-up.jpg",
        "layout": "bleed",
        "focus_x": 0.55,
        "label": "PSALM 121:2",
        "headline": [[("My help comes", False)], [("from the ", False), ("Lord.", True)]],
    },
    {
        "file": "03-pray.jpg",
        "photo": "prayer.jpg",
        "layout": "wall",  # dark text on the light wall, top-left
        "focus_x": 0.4,
        "label": "1 THESSALONIANS 5:17",
        "headline": [[("Pray", False)], [("without", False)], [("ceasing.", True)]],
    },
    {
        "file": "04-spirit-and-truth.jpg",
        "photo": "worship-leader.jpg",
        "layout": "bleed",
        "trim_top": 0.015,  # hides the dark screen edge at the top of the photo
        "focus_x": 0.5,
        "label": "JOHN 4:24",
        "headline": [[("Worship in spirit", False)], [("and in ", False), ("truth.", True)]],
    },
    {
        "file": "05-serve.jpg",
        "photo": "keys.jpg",
        "layout": "bleed",
        "focus_x": 0.5,
        "label": "1 PETER 4:10",
        "headline": [[("Serve with", False)], [("your ", False), ("gifts.", True)]],
    },
]


def load(post):
    img = ImageOps.exif_transpose(Image.open(PHOTOS / post["photo"])).convert("RGB")
    trim = round(img.height * post.get("trim_top", 0))
    return img.crop((0, trim, img.width, img.height))


def cover(img, w, h, focus_x=0.5, focus_y=0.5):
    """Scale + crop to fill w x h, keeping the focal point in frame."""
    scale = max(w / img.width, h / img.height)
    img = img.resize((round(img.width * scale), round(img.height * scale)), Image.LANCZOS)
    left = min(max(round(img.width * focus_x - w / 2), 0), img.width - w)
    top = min(max(round(img.height * focus_y - h / 2), 0), img.height - h)
    return img.crop((left, top, left + w, top + h))


def tracked(draw, xy, text, fnt, fill, tracking=0.0):
    """Draw text with letter-spacing (tracking in em)."""
    x, y = xy
    extra = fnt.size * tracking
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill, anchor="ls")
        x += draw.textlength(ch, font=fnt) + extra
    return x


def headline_lines(draw, x, baseline, lines, size, fill, leading=1.14):
    """Draw headline lines; `baseline` is the first line's baseline. Returns last baseline."""
    reg, ital = SERIF(size), SERIF_I(size)
    for i, line in enumerate(lines):
        if i:
            baseline += round(size * leading)
        cx = x
        for text, italic in line:
            f = ital if italic else reg
            draw.text((cx, baseline), text, font=f, fill=fill, anchor="ls")
            cx += draw.textlength(text, font=f)
    return baseline


def label(draw, x, baseline, text, fill):
    """Small tracked caps label with a short rule underneath."""
    tracked(draw, (x, baseline), text, SANS(24), fill, 0.22)
    draw.line([(x, baseline + 24), (x + 56, baseline + 24)], fill=fill, width=2)


def bottom_gradient(size, start, strength):
    """Black overlay that fades in from `start` (0-1 of height) to the bottom."""
    w, h = size
    mask = Image.new("L", (1, h))
    for yy in range(h):
        t = max(0.0, (yy / h - start) / (1 - start))
        mask.putpixel((0, yy), round(255 * strength * (t ** 1.4)))
    mask = mask.resize((w, h))
    black = Image.new("RGB", (w, h), (12, 12, 14))
    return black, mask


def first_baseline(last_baseline, lines, size, leading=1.14):
    return last_baseline - (len(lines) - 1) * round(size * leading)


def render_bleed(post):
    img = load(post)
    canvas = cover(img, W, H, post.get("focus_x", 0.5), post.get("focus_y", 0.5))
    black, mask = bottom_gradient((W, H), 0.45, 0.82)
    canvas.paste(black, (0, 0), mask)

    d = ImageDraw.Draw(canvas)
    size = 84
    top = first_baseline(H - MARGIN - 4, post["headline"], size)
    label(d, MARGIN, top - size - 52, post["label"], WHITE)
    headline_lines(d, MARGIN, top, post["headline"], size, WHITE)
    return canvas


def render_wall(post):
    img = load(post)
    canvas = cover(img, W, H, post.get("focus_x", 0.5), post.get("focus_y", 0.5))
    d = ImageDraw.Draw(canvas)
    size = 92
    label(d, MARGIN, MARGIN + 40, post["label"], INK)
    headline_lines(d, MARGIN, MARGIN + 40 + 60 + size, post["headline"], size, INK)
    return canvas


def render_framed(post):
    canvas = Image.new("RGB", (W, H), CREAM)
    img = load(post)
    pw = W - 2 * 56
    ph = round(pw * 0.86)
    photo = cover(img, pw, ph, post.get("focus_x", 0.5), post.get("focus_y", 0.5))
    canvas.paste(photo, (56, 56))

    d = ImageDraw.Draw(canvas)
    size = 96
    sub_base = H - MARGIN + 6
    last = sub_base - (62 if post.get("sub") else 0)
    top = first_baseline(last, post["headline"], size)
    label(d, MARGIN, top - size - 46, post["label"], INK)
    headline_lines(d, MARGIN, top, post["headline"], size, INK)
    if post.get("sub"):
        d.text((MARGIN, sub_base), post["sub"], font=SANS_M(30), fill=(95, 92, 86), anchor="ls")
    return canvas


RENDER = {"bleed": render_bleed, "wall": render_wall, "framed": render_framed}


def contact_sheet(paths):
    tw, th, gap = 360, 450, 16
    sheet = Image.new("RGB", (len(paths) * (tw + gap) + gap, th + 2 * gap), (230, 228, 224))
    for i, p in enumerate(paths):
        sheet.paste(Image.open(p).resize((tw, th), Image.LANCZOS), (gap + i * (tw + gap), gap))
    sheet.save(OUT / "_preview.jpg", quality=88)


def main():
    OUT.mkdir(exist_ok=True)
    written = []
    for post in POSTS:
        out = OUT / post["file"]
        RENDER[post["layout"]](post).save(out, quality=94, subsampling=0)
        written.append(out)
        print("wrote", out.relative_to(ROOT))
    contact_sheet(written)


if __name__ == "__main__":
    main()
