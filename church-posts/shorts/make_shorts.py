"""Edit vertical church shorts (1080x1920) from two synced camera angles.

Usage:  python3 make_shorts.py          -> out/*.mp4      (1080x1920, Reels/TikTok/Shorts)
        python3 make_shorts.py --4k     -> out/4k/*.mp4   (2160x3840, YouTube Shorts)

Angle A (source/angle-a.mp4) is the master: its audio is used throughout and
all times below are on its timeline. Angle B starts SYNC_B seconds into A.
Captions come from source/transcript-words.json (word timestamps on A).
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

HERE = Path(__file__).parent
SRC = HERE / "source"
OUT = HERE / "out"
FONTS = HERE.parent / "fonts"

# Layout is designed at 1080x1920; S scales every drawn size (2 for the 4K render).
S = 2 if "--4k" in sys.argv else 1
W, H, FPS = 1080 * S, 1920 * S, 30
if S > 1:
    OUT = OUT / "4k"


def px(v):
    return round(v * S)

SYNC_B = 10.202  # angle B's first frame = this time on angle A
END_CARD = 2.6
XFADE = 0.4
TITLE_SECS = 3.6  # title shows over the opening shot only, then fades

CREAM = (247, 244, 238, 255)
INK = (28, 27, 25, 255)
GREY = (95, 92, 86, 255)

# Framing per angle: "wide" = full frame, "tight" = punch-in crop (x, y, w, h in source px).
FRAMES = {
    ("A", "wide"): None,
    ("A", "tight"): (96, 68, 382, 680),  # 1.25x on the preacher
    ("B", "wide"): None,
    ("B", "tight"): (0, 0, 443, 788),  # 1.3x, preacher stands left of centre
}

# Cut lists: (start, end, angle, framing) on angle A's timeline.
# Angle B is shaky around 24.5-27.5s and 29-31s, so A covers those moments.
CORE = [
    (23.95, 27.80, "A", "tight"),  # "Graças a Deus, desde os seis anos..."
    (27.80, 32.60, "A", "wide"),   # "Fui criado em um hotel..."
    (32.60, 36.00, "B", "wide"),   # "Trabalhei em contabilidade..."
    (36.00, 39.60, "A", "wide"),   # "e agora estou pastoreando..."
    (39.60, 42.90, "B", "tight"),  # "Deus nos constituiu para esse tempo para servir."
]
SHORTS = [
    {
        "file": "short-1-para-servir.mp4",
        "cuts": CORE,
    },
    {
        "file": "short-2-full-message.mp4",
        "cuts": [
            (0.00, 4.40, "A", "wide"),
            (4.40, 10.30, "A", "tight"),
            (10.30, 14.45, "B", "wide"),
            (14.45, 20.55, "A", "wide"),
            (20.55, 23.95, "B", "tight"),
            *CORE,
            (42.90, 47.90, "A", "wide"),
            (47.90, 52.10, "A", "tight"),
        ],
    },
]

TITLE = [[("Deus nos constituiu", False)], [("para servir.", True)]]

# Transcript fixes (spelling/capitalisation) applied to individual words.
WORD_FIX = {"pastor": "Pastor", "3": "3", ".500": ".500"}


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


def serif(size, italic=False):
    return font(f"playfair-display-latin-400-{'italic' if italic else 'normal'}.woff", size)


# ---------------------------------------------------------------- captions

def load_words():
    words = json.loads((SRC / "transcript-words.json").read_text())
    out = []
    for w in words:
        text = w["w"].strip()
        text = WORD_FIX.get(text, text)
        if text.startswith(".") and out:  # "3" + ".500" -> "3.500"
            out[-1]["w"] += text
            out[-1]["e"] = w["e"]
            continue
        out.append({"w": text, "s": w["s"], "e": w["e"]})
    return out


def chunk_words(words, max_words=3, max_chars=20):
    """Group words into short caption chunks, breaking on punctuation."""
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        text = " ".join(x["w"] for x in cur)
        if w["w"][-1] in ",.?!" or len(cur) >= max_words or len(text) >= max_chars:
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    return [
        {"text": " ".join(x["w"] for x in c).rstrip(",."), "s": c[0]["s"], "e": c[-1]["e"]}
        for c in chunks
    ]


def caption_png(text, path):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    size = px(72)
    while d.textlength(text, font=font("Inter-ExtraBold.otf", size)) > W * 0.86:
        size -= px(2)  # shrink long lines to stay inside the safe area
    f = font("Inter-ExtraBold.otf", size)
    y = px(1330)
    # soft shadow, then white text with a thin dark outline
    d.text((W // 2 + px(3), y + px(4)), text, font=f, fill=(0, 0, 0, 140), anchor="ms",
           stroke_width=px(6), stroke_fill=(0, 0, 0, 90))
    d.text((W // 2, y), text, font=f, fill=(255, 255, 255, 255), anchor="ms",
           stroke_width=px(5), stroke_fill=(15, 15, 18, 255))
    img.save(path)


# ---------------------------------------------------------------- title + end card

def draw_lines(d, cx, baseline, lines, size, fill, leading=1.14, shadow=False):
    for i, line in enumerate(lines):
        y = baseline + i * round(size * leading)
        total = sum(d.textlength(t, font=serif(size, it)) for t, it in line)
        x = cx - total / 2
        for t, it in line:
            f = serif(size, it)
            if shadow:
                d.text((x + px(2), y + px(3)), t, font=f, fill=(0, 0, 0, 120), anchor="ls")
            d.text((x, y), t, font=f, fill=fill, anchor="ls")
            x += d.textlength(t, font=f)


def title_png(path, lines=TITLE):
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    # top gradient so the title reads on any background
    gh = px(520)
    grad = Image.new("L", (1, gh))
    for y in range(gh):
        grad.putpixel((0, y), round(170 * (1 - y / gh) ** 1.6))
    shade = Image.new("RGBA", (W, gh), (10, 10, 12, 255))
    shade.putalpha(grad.resize((W, gh)))
    img.alpha_composite(shade)
    draw_lines(ImageDraw.Draw(img), W // 2, px(250), lines, px(74), (255, 255, 255, 255), shadow=True)
    img.save(path)


def tracked_center(d, cx, y, text, f, fill, tracking=0.22):
    extra = f.size * tracking
    total = sum(d.textlength(c, font=f) + extra for c in text) - extra
    x = cx - total / 2
    for c in text:
        d.text((x, y), c, font=f, fill=fill, anchor="ls")
        x += d.textlength(c, font=f) + extra


END_LABEL = "DEUS NOS CONSTITUIU"
END_LINES = [[("Para", False)], [("servir.", True)]]


def end_card_png(path, label=END_LABEL, lines=END_LINES):
    img = Image.new("RGBA", (W, H), CREAM)
    d = ImageDraw.Draw(img)
    tracked_center(d, W // 2, px(760), label, font("Inter-SemiBold.otf", px(28)), INK)
    d.line([(W // 2 - px(30), px(800)), (W // 2 + px(30), px(800))], fill=INK, width=px(2))
    draw_lines(d, W // 2, px(960), lines, px(150), INK, leading=1.05)
    d.text((W // 2, px(1290)), "Compartilhe com alguém.", font=font("Inter-Medium.otf", px(36)),
           fill=GREY, anchor="ms")
    img.convert("RGB").save(path)


# ---------------------------------------------------------------- render

def angle_chain(idx, cut, label):
    start, end, angle, framing = cut
    src_start = start if angle == "A" else start - SYNC_B
    crop = FRAMES[(angle, framing)]
    f = [f"[{idx}:v]trim=start={src_start:.3f}:end={src_start + end - start:.3f}",
         "setpts=PTS-STARTPTS", f"fps={FPS}"]
    if crop:
        f.append("crop={2}:{3}:{0}:{1}".format(*crop))
    f += [f"scale={W}:{H}:flags=lanczos", "setsar=1",
          "eq=contrast=1.04:saturation=1.06", "unsharp=5:5:0.6" if S == 1 else "unsharp=7:7:0.5"]
    return ",".join(f) + f"[{label}]"


def render(short, words, tmp):
    cuts = short["cuts"]
    t0, t1 = cuts[0][0], cuts[-1][1]
    length = t1 - t0

    inputs = ["-i", str(SRC / "angle-a.mp4"), "-i", str(SRC / "angle-b.mp4")]
    title = tmp / "title.png"
    card = tmp / "card.png"
    title_png(title)
    end_card_png(card)
    inputs += ["-loop", "1", "-t", f"{TITLE_SECS:.2f}", "-i", str(title), "-loop", "1", "-t", f"{END_CARD + XFADE:.2f}", "-i", str(card)]

    caps = [c for c in chunk_words(words) if c["s"] >= t0 - 0.05 and c["s"] < t1]
    cap_inputs = []
    for i, c in enumerate(caps):
        p = tmp / f"cap{i:03d}.png"
        caption_png(c["text"], p)
        cap_inputs += ["-i", str(p)]
    inputs += cap_inputs

    fc = []
    for i, cut in enumerate(cuts):
        fc.append(angle_chain(0 if cut[2] == "A" else 1, cut, f"c{i}"))
    fc.append("".join(f"[c{i}]" for i in range(len(cuts))) + f"concat=n={len(cuts)}:v=1:a=0[cat]")
    fc.append(f"[2:v]fps={FPS},format=rgba,fade=t=out:st={TITLE_SECS - 0.5:.2f}:d=0.5:alpha=1[title]")
    fc.append("[cat][title]overlay=0:0:eof_action=pass[v0]")
    last = "v0"
    for i, c in enumerate(caps):
        s = c["s"] - t0
        e = (caps[i + 1]["s"] - t0) if i + 1 < len(caps) else min(c["e"] - t0 + 0.6, length)
        fc.append(f"[{last}][{4 + i}:v]overlay=0:0:enable='between(t,{s:.3f},{e - 0.001:.3f})'[v{i + 1}]")
        last = f"v{i + 1}"
    fc.append(f"[3:v]fps={FPS},format=yuv420p,setsar=1,settb=1/{FPS}[card]")
    fc.append(f"[{last}]fps={FPS},format=yuv420p,settb=1/{FPS}[main]")
    fc.append(f"[main][card]xfade=transition=fade:duration={XFADE}:offset={length - XFADE:.3f}[vout]")
    fc.append(f"[0:a]atrim=start={t0:.3f}:end={t1:.3f},asetpts=PTS-STARTPTS,"
              f"afade=t=in:d=0.12,afade=t=out:st={length - 0.5:.3f}:d=0.5,"
              f"apad=pad_dur={END_CARD:.2f},loudnorm=I=-14:TP=-1.5:LRA=11[aout]")

    out = OUT / (short["file"] if S == 1 else short["file"].replace(".mp4", "-4k.mp4"))
    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
           "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "slow" if S == 1 else "medium", "-crf", "18",
           *(["-maxrate", "12M", "-bufsize", "24M"] if S > 1 else []), "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-t", f"{length - XFADE + END_CARD + XFADE:.3f}",
           "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)
    print(f"wrote {out.relative_to(HERE)}  ({length + END_CARD:.1f}s)")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    words = load_words()
    for short in SHORTS:
        with tempfile.TemporaryDirectory() as tmp:
            render(short, words, Path(tmp))


if __name__ == "__main__":
    main()
