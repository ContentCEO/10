"""Cut vertical sermon clips (1080x1920) from the Sunday livestream.

Usage:  python3 make_sermon_clips.py /path/to/live.mp4          -> out/*.mp4
        python3 make_sermon_clips.py /path/to/live.mp4 --4k     -> out/4k/*.mp4

The livestream camera was mounted sideways, so frames are rotated back to
1280x720 and then cropped to 9:16 around the preacher. The crop follows him
by finding his blue suit in each shot. Within a clip, the framing alternates
between a wide and a tight shot at natural pauses so a static camera feels edited.

Captions come from transcript.json (word timestamps on the livestream).
Clip choices, titles and end cards are in CLIPS below.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent / "shorts"))
import make_shorts as ms  # noqa: E402  (shared caption/title/end-card drawing)

W, H, FPS, S = ms.W, ms.H, ms.FPS, ms.S
OUT = HERE / "out" / ("4k" if S > 1 else "")
SRC_W, SRC_H = 1280, 720  # after rotating the sideways livestream

WIDE = (405, 720)   # full height 9:16 crop
TIGHT = (304, 540)  # 1.33x punch-in, top kept at TIGHT_Y
TIGHT_Y = 120
SHOT_MIN, SHOT_MAX = 4.5, 8.0  # seconds per shot before cutting at the next pause

WORD_FIX = {"Jesus": "Jesus", "deus": "Deus"}

# Each clip: file, start/end (seconds on the livestream), title + end card text.
CLIPS = []


# ---------------------------------------------------------------- transcript

def load_words():
    segs = json.loads((HERE / "transcript.json").read_text())
    words = []
    for seg in segs:
        for w in seg["words"]:
            text = w["w"].strip()
            if not text:
                continue
            text = WORD_FIX.get(text, text)
            if text.startswith(".") and words:  # "3" + ".500" -> "3.500"
                words[-1]["w"] += text
                words[-1]["e"] = w["e"]
                continue
            words.append({"w": text, "s": w["s"], "e": w["e"]})
    return words


def plan_shots(words, t0, t1):
    """Split [t0, t1] into shots that change at pauses, alternating wide/tight."""
    cuts, start = [], t0
    inside = [w for w in words if t0 <= w["s"] < t1]
    for prev, nxt in zip(inside, inside[1:]):
        gap_mid = (prev["e"] + nxt["s"]) / 2
        long_enough = gap_mid - start >= SHOT_MIN
        pause = nxt["s"] - prev["e"] >= 0.18 or prev["w"][-1] in ",.?!;:"
        if long_enough and (pause or gap_mid - start >= SHOT_MAX) and t1 - gap_mid >= 2.5:
            cuts.append((start, gap_mid))
            start = gap_mid
    cuts.append((start, t1))
    return [(a, b, "tight" if i % 2 == 0 else "wide") for i, (a, b) in enumerate(cuts)]


# ---------------------------------------------------------------- framing

def frame_at(src, t):
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-ss", f"{t:.2f}", "-i", str(src), "-frames:v", "1",
         "-vf", "transpose=1,scale=320:180", "-f", "rawvideo", "-pix_fmt", "rgb24", "-"],
        capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(180, 320, 3).astype(int)


def preacher_x(src, a, b):
    """Horizontal centre of the preacher (blue suit) in source px, sampled across a shot."""
    xs = []
    for t in np.linspace(a + 0.3, b - 0.3, 3):
        f = frame_at(src, t)[60:175]  # body area, below the ceiling
        r, g, bl = f[..., 0], f[..., 1], f[..., 2]
        mask = (bl > 120) & (bl > r + 45) & (bl > g + 15)
        if mask.sum() > 40:
            xs.append(np.median(np.nonzero(mask)[1]) * SRC_W / 320)
    return float(np.median(xs)) if xs else SRC_W / 2


def crop_for(framing, cx):
    w, h = WIDE if framing == "wide" else TIGHT
    x = int(min(max(cx - w / 2, 0), SRC_W - w))
    y = 0 if framing == "wide" else TIGHT_Y
    return w, h, x, y


# ---------------------------------------------------------------- render

def render(src, clip, words, tmp):
    t0, t1 = clip["start"], clip["end"]
    length = t1 - t0
    shots = plan_shots(words, t0, t1)

    title, card = tmp / "title.png", tmp / "card.png"
    ms.title_png(title, clip["title"])
    ms.end_card_png(card, clip["end_label"], clip["end_lines"])
    inputs = ["-ss", f"{t0:.3f}", "-t", f"{length + 0.5:.3f}", "-i", str(src),
              "-loop", "1", "-t", f"{ms.TITLE_SECS:.2f}", "-i", str(title),
              "-loop", "1", "-t", f"{ms.END_CARD + ms.XFADE:.2f}", "-i", str(card)]

    caps = [c for c in ms.chunk_words(words) if t0 - 0.05 <= c["s"] < t1]
    for i, c in enumerate(caps):
        p = tmp / f"cap{i:03d}.png"
        ms.caption_png(c["text"], p)
        inputs += ["-i", str(p)]

    fc = [f"[0:v]transpose=1,fps={FPS},split={len(shots)}" + "".join(f"[s{i}]" for i in range(len(shots)))]
    for i, (a, b, framing) in enumerate(shots):
        w, h, x, y = crop_for(framing, preacher_x(src, a, b))
        fc.append(f"[s{i}]trim=start={a - t0:.3f}:end={b - t0:.3f},setpts=PTS-STARTPTS,"
                  f"crop={w}:{h}:{x}:{y},scale={W}:{H}:flags=lanczos,setsar=1,"
                  f"eq=contrast=1.05:saturation=1.08,unsharp=5:5:0.7[c{i}]")
    fc.append("".join(f"[c{i}]" for i in range(len(shots))) + f"concat=n={len(shots)}:v=1:a=0[cat]")
    fc.append(f"[1:v]fps={FPS},format=rgba,fade=t=out:st={ms.TITLE_SECS - 0.5:.2f}:d=0.5:alpha=1[title]")
    fc.append("[cat][title]overlay=0:0:eof_action=pass[v0]")
    last = "v0"
    for i, c in enumerate(caps):
        s = c["s"] - t0
        e = (caps[i + 1]["s"] - t0) if i + 1 < len(caps) else min(c["e"] - t0 + 0.6, length)
        fc.append(f"[{last}][{3 + i}:v]overlay=0:0:enable='between(t,{s:.3f},{e - 0.001:.3f})'[v{i + 1}]")
        last = f"v{i + 1}"
    fc.append(f"[2:v]fps={FPS},format=yuv420p,setsar=1,settb=1/{FPS}[card]")
    fc.append(f"[{last}]fps={FPS},format=yuv420p,settb=1/{FPS}[main]")
    fc.append(f"[main][card]xfade=transition=fade:duration={ms.XFADE}:offset={length - ms.XFADE:.3f}[vout]")
    fc.append(f"[0:a]atrim=start=0:end={length:.3f},asetpts=PTS-STARTPTS,"
              f"highpass=f=80,afade=t=in:d=0.12,afade=t=out:st={length - 0.5:.3f}:d=0.5,"
              f"apad=pad_dur={ms.END_CARD:.2f},loudnorm=I=-14:TP=-1.5:LRA=11[aout]")

    name = clip["file"] if S == 1 else clip["file"].replace(".mp4", "-4k.mp4")
    out = OUT / name
    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
           "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "slow" if S == 1 else "medium", "-crf", "18",
           *(["-maxrate", "12M", "-bufsize", "24M"] if S > 1 else []), "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-t", f"{length + ms.END_CARD:.3f}", "-movflags", "+faststart", str(out)]
    subprocess.run(cmd, check=True)
    print(f"wrote {out.relative_to(HERE)}  ({length + ms.END_CARD:.1f}s, {len(shots)} shots)")


def main():
    src = Path(next(a for a in sys.argv[1:] if not a.startswith("--")))
    only = [a.split("=", 1)[1] for a in sys.argv if a.startswith("--only=")]
    OUT.mkdir(parents=True, exist_ok=True)
    words = load_words()
    for clip in CLIPS:
        if only and not any(o in clip["file"] for o in only):
            continue
        with tempfile.TemporaryDirectory() as tmp:
            render(src, clip, words, Path(tmp))


if __name__ == "__main__":
    main()
