"""Bold "sermon clip" look: Montserrat captions that light up word by word,
a hook title with a gold highlight, and a dark end card.

overlay_frames() yields one transparent RGBA frame per video frame; the
renderer pipes them into ffmpeg and lays them over the footage.
"""
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

FONTS = Path(__file__).parent.parent / "fonts"

GOLD = (255, 200, 61, 255)
WHITE = (255, 255, 255, 255)
INK = (14, 14, 16, 255)
DARK_BG = (15, 15, 17, 255)
MUTED = (190, 186, 178, 255)


@lru_cache(maxsize=None)
def mont(weight, size):
    return ImageFont.truetype(str(FONTS / f"montserrat-latin-{weight}-normal.woff"), size)


def ease_out_back(x):
    c1, c3 = 1.6, 2.6
    return 1 + c3 * (x - 1) ** 3 + c1 * (x - 1) ** 2


def fit(text, weight, size, max_w):
    """Largest font size <= size that fits text in max_w."""
    d = ImageDraw.Draw(Image.new("L", (1, 1)))
    while size > 10 and d.textlength(text, font=mont(weight, size)) > max_w:
        size -= 2
    return size


# ---------------------------------------------------------------- hook title

def draw_title(img, lines, s, progress):
    """Line 1 in white, line 2 on a gold highlight. `progress` 0..1 animates it in."""
    W = img.width
    d = ImageDraw.Draw(img)
    p = ease_out_back(min(max(progress, 0), 1)) if progress < 1 else 1
    alpha = int(255 * min(max(progress * 2.5, 0), 1))
    dy = int((1 - p) * -40 * s)
    top, plain = lines[0], " ".join(t for t, _ in lines[0]).upper()
    hl = " ".join(t for t, _ in lines[1]).upper() if len(lines) > 1 else ""

    size1 = fit(plain, 800, int(64 * s), W * 0.84)
    f1 = mont(800, size1)
    y1 = int(215 * s) + dy
    d.text((W // 2 + int(3 * s), y1 + int(3 * s)), plain, font=f1, fill=(0, 0, 0, alpha // 2), anchor="ms")
    d.text((W // 2, y1), plain, font=f1, fill=WHITE[:3] + (alpha,), anchor="ms")
    if hl:
        size2 = fit(hl, 900, int(72 * s), W * 0.80)
        f2 = mont(900, size2)
        tw = d.textlength(hl, font=f2)
        pad_x, y2 = int(28 * s), int(318 * s) + dy
        box = [W // 2 - tw / 2 - pad_x, y2 - size2 * 0.92, W // 2 + tw / 2 + pad_x, y2 + size2 * 0.30]
        d.rounded_rectangle(box, radius=int(14 * s), fill=GOLD[:3] + (alpha,))
        d.text((W // 2, y2), hl, font=f2, fill=INK[:3] + (alpha,), anchor="ms")


# ---------------------------------------------------------------- captions

def caption_layer(W, H, s, words, active, scale):
    """One caption line, uppercase, active word in gold, drawn at `scale` (for the pop)."""
    texts = [w["w"].upper().rstrip(",.") for w in words]
    base = fit(" ".join(texts), 900, int(78 * s), W * 0.86)
    f = mont(900, max(10, int(base * scale)))
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    space = d.textlength(" ", font=f)
    total = sum(d.textlength(t, font=f) for t in texts) + space * (len(texts) - 1)
    x, y = W / 2 - total / 2, int(1320 * s)
    stroke = max(2, int(7 * s * scale))
    for i, t in enumerate(texts):
        color = GOLD if i == active else WHITE
        d.text((x + 4 * s, y + 6 * s), t, font=f, fill=(0, 0, 0, 120), anchor="ls",
               stroke_width=stroke, stroke_fill=(0, 0, 0, 120))
        d.text((x, y), t, font=f, fill=color, anchor="ls", stroke_width=stroke, stroke_fill=INK)
        x += d.textlength(t, font=f) + space
    return img


def overlay_frames(W, H, s, fps, length, title_lines, chunks):
    """Yield RGBA bytes for each frame: hook title + karaoke captions."""
    cache = {}
    n = int(round(length * fps))
    ci = 0
    for k in range(n):
        t = k / fps
        title_step = min(int(t / 0.033), 12)  # title animates in over ~0.4s
        while ci + 1 < len(chunks) and chunks[ci + 1]["s"] <= t:
            ci += 1
        c = chunks[ci] if chunks and chunks[ci]["s"] <= t < chunks[ci]["until"] else None
        if c:
            active = max(i for i, w in enumerate(c["words"]) if w["s"] <= t or i == 0)
            pop = min(int((t - c["s"]) / 0.033), 4)  # pop-in over ~0.13s
            key = (title_step, ci, active, pop)
        else:
            key = (title_step, None)
        if key not in cache:
            img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
            draw_title(img, title_lines, s, title_step / 12)
            if c:
                scale = 0.82 + 0.18 * ease_out_back(pop / 4)
                img.alpha_composite(caption_layer(W, H, s, c["words"], active, scale))
            cache[key] = img.tobytes()
        yield cache[key]


# ---------------------------------------------------------------- end card

def end_card(W, H, s, label, lines, path):
    img = Image.new("RGBA", (W, H), DARK_BG)
    d = ImageDraw.Draw(img)
    f_label = mont(700, int(26 * s))
    extra = f_label.size * 0.25
    total = sum(d.textlength(c, font=f_label) + extra for c in label) - extra
    x = W / 2 - total / 2
    for c in label:
        d.text((x, int(760 * s)), c, font=f_label, fill=GOLD, anchor="ls")
        x += d.textlength(c, font=f_label) + extra
    top = " ".join(t for t, _ in lines[0]).upper()
    hl = " ".join(t for t, _ in lines[1]).upper() if len(lines) > 1 else ""
    f1 = mont(900, fit(top, 900, int(118 * s), W * 0.84))
    d.text((W // 2, int(930 * s)), top, font=f1, fill=WHITE, anchor="ms")
    if hl:
        f2 = mont(900, fit(hl, 900, int(118 * s), W * 0.78))
        tw = d.textlength(hl, font=f2)
        y2 = int(1080 * s)
        d.rounded_rectangle([W / 2 - tw / 2 - 30 * s, y2 - f2.size * 0.9, W / 2 + tw / 2 + 30 * s,
                             y2 + f2.size * 0.28], radius=int(18 * s), fill=GOLD)
        d.text((W // 2, y2), hl, font=f2, fill=INK, anchor="ms")
    d.text((W // 2, int(1250 * s)), "Compartilhe com alguém.", font=mont(700, int(36 * s)),
           fill=MUTED, anchor="ms")
    img.convert("RGB").save(path)


def progress_bar(W, s, path):
    Image.new("RGBA", (W, max(4, int(9 * s))), GOLD).save(path)
