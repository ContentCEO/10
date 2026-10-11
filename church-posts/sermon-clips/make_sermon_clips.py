"""Cut vertical sermon clips (1080x1920) from the Sunday livestream.

Usage:  python3 make_sermon_clips.py /path/to/live.mp4          -> out/*.mp4
        python3 make_sermon_clips.py /path/to/live.mp4 --4k     -> out/4k/*.mp4

The livestream camera was mounted sideways, so frames are rotated back to
1280x720 and then cropped to 9:16 around the preacher. The crop follows him
by finding his blue suit in each shot. Within a clip, the framing alternates
between a wide and a tight shot at natural pauses so a static camera feels edited.

Look: see style.py (Montserrat word-by-word captions, hook title, gold
progress bar, dark end card) plus a slow push-in zoom on every shot.

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
import make_shorts as ms  # noqa: E402  (shared timing constants)
import style  # noqa: E402

W, H, FPS, S = ms.W, ms.H, ms.FPS, ms.S
OUT = HERE / "out" / ("4k" if S > 1 else "")
SRC_W, SRC_H = 1280, 720  # after rotating the sideways livestream

WIDE = (405, 720)   # full height 9:16 crop
TIGHT = (304, 540)  # 1.33x punch-in, top kept at TIGHT_Y
TIGHT_Y = 120
SHOT_MIN, SHOT_MAX = 4.5, 8.0  # seconds per shot before cutting at the next pause
ZOOM = 0.07  # slow push-in over each shot (7%)

WORD_FIX = {"Jesus": "Jesus", "deus": "Deus"}

END_LABEL = "ASSEMBLEIA COLHEITA · MEDFORD"

# Each clip: file, start/end (seconds on the livestream), title + end card text,
# and caption fixes for words the transcriber misheard: (heard words, correct words).
CLIPS = [
    {
        "file": "01-suas-decisoes.mp4", "start": 806.85, "end": 852.15,
        "title": [[("Suas decisões de hoje", False)], [("decidem o seu amanhã.", True)]],
        "end_lines": [[("Decida", False)], [("bem.", True)]],
        "fixes": [("com sequências", "as consequências"), ("que o sobrevier", "que sobrevier")],
    },
    {
        "file": "02-ele-e-poderoso.mp4", "start": 1136.55, "end": 1171.45,
        "title": [[("Ele foi o meu auxílio.", False)], [("Ele socorre você também.", True)]],
        "end_lines": [[("Ele é", False)], [("poderoso.", True)]],
        "fixes": [("forta já,", "fortalece,"), ("irmão Montema,", "irmão,")],
    },
    {
        "file": "03-ouvir-e-praticar.mp4", "start": 1533.80, "end": 1550.30,
        "title": [[("Ouvir a Deus", False)], [("é praticar na segunda.", True)]],
        "end_lines": [[("Ouvir é", False)], [("praticar.", True)]],
        "fixes": [],
    },
    {
        "file": "04-muitas-vozes.mp4", "start": 1617.30, "end": 1661.05,
        "title": [[("Muitas vozes.", False)], [("Qual você tem ouvido?", True)]],
        "end_lines": [[("A voz", False)], [("de Deus.", True)]],
        "fixes": [("tem ecoado,", "têm ecoado,"), ("ouvidos, a voz", "ouvidos à voz"),
                  ("diz, a igreja,", "diz à igreja.")],
    },
    {
        "file": "05-nao-basta-comecar-bem.mp4", "start": 1944.05, "end": 1968.70,
        "title": [[("Não basta", False)], [("começar bem.", True)]],
        "end_lines": [[("Termine", False)], [("bem.", True)]],
        "fixes": [("a fé,", "a fé.")],
    },
    {
        "file": "06-e-a-sua-familia.mp4", "start": 2314.00, "end": 2334.60,
        "title": [[("Não é o dólar.", False)], [("É a sua família.", True)]],
        "end_lines": [[("Sua", False)], [("família.", True)]],
        "fixes": [("Paulo escrevendo, Timóteo diz,", "Paulo, escrevendo a Timóteo, diz,"),
                  ("transpassaram assim mesmo,", "traspassaram a si mesmos"),
                  ("da fé,", "da fé.")],
    },
]


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
            if text[0] in ".-" and words:  # "3" + ".500" -> "3.500", "segunda" + "-feira"
                words[-1]["w"] += text
                words[-1]["e"] = w["e"]
                continue
            words.append({"w": text, "s": w["s"], "e": w["e"]})
    return words


def apply_fixes(words, fixes):
    """Replace misheard word sequences, spreading the new words over the old timing."""
    words = list(words)
    for heard, correct in fixes:
        heard, correct = heard.split(), correct.split()
        for i in range(len(words) - len(heard) + 1):
            if [w["w"] for w in words[i:i + len(heard)]] == heard:
                s, e = words[i]["s"], words[i + len(heard) - 1]["e"]
                step = (e - s) / len(correct)
                words[i:i + len(heard)] = [{"w": c, "s": s + k * step, "e": s + (k + 1) * step}
                                           for k, c in enumerate(correct)]
                break
        else:
            raise ValueError(f"caption fix not found: {' '.join(heard)!r}")
    return words


WEAK = {"a", "o", "as", "os", "de", "do", "da", "dos", "das", "e", "que", "com", "na", "no",
        "nas", "nos", "em", "para", "por", "um", "uma", "à", "ao", "se", "não",
        "sua", "seu", "suas", "seus", "minha", "meu", "nossa", "nosso", "si"}


def chunk_words(words, max_words=3, max_chars=20, hard_chars=24):
    """Caption chunks of ~3 words; never end a line on a small word like "de" or "a"."""
    chunks, cur = [], []
    for w in words:
        cur.append(w)
        text = " ".join(x["w"] for x in cur)
        if w["w"][-1] in ",.?!":
            chunks.append(cur); cur = []
        elif len(cur) >= max_words or len(text) >= max_chars:
            if w["w"].lower() not in WEAK or len(text) >= hard_chars:
                chunks.append(cur); cur = []
    if cur:
        chunks.append(cur)
    out = [{"text": " ".join(x["w"] for x in c).rstrip(",."), "s": c[0]["s"], "e": c[-1]["e"],
            "words": c} for c in chunks]
    if out:
        out[0]["text"] = out[0]["text"][0].upper() + out[0]["text"][1:]
    return out


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

    # captions in clip time, each shown until the next one starts
    words = apply_fixes([w for w in words if t0 - 0.05 <= w["s"] < t1], clip["fixes"])
    caps = chunk_words([{**w, "s": w["s"] - t0, "e": w["e"] - t0} for w in words])
    for i, c in enumerate(caps):
        c["until"] = caps[i + 1]["s"] if i + 1 < len(caps) else min(c["e"] + 0.6, length)

    card, bar = tmp / "card.png", tmp / "bar.png"
    style.end_card(W, H, S, END_LABEL, clip["end_lines"], card)
    style.progress_bar(W, S, bar)
    inputs = ["-ss", f"{t0:.3f}", "-t", f"{length + 0.5:.3f}", "-i", str(src),
              "-f", "rawvideo", "-pix_fmt", "rgba", "-s", f"{W}x{H}", "-r", str(FPS), "-i", "pipe:0",
              "-loop", "1", "-t", f"{ms.END_CARD + ms.XFADE:.2f}", "-i", str(card),
              "-loop", "1", "-i", str(bar)]

    fc = [f"[0:v]transpose=1,fps={FPS},split={len(shots)}" + "".join(f"[s{i}]" for i in range(len(shots)))]
    for i, (a, b, framing) in enumerate(shots):
        w, h, x, y = crop_for(framing, preacher_x(src, a, b))
        n = max(1, round((b - a) * FPS))
        # crop to 9:16, upscale 2x so the slow zoom stays smooth, push in, then scale to size
        fc.append(f"[s{i}]trim=start={a - t0:.3f}:end={b - t0:.3f},setpts=PTS-STARTPTS,"
                  f"crop={w}:{h}:{x}:{y},scale={2 * W}:{2 * H}:flags=lanczos,"
                  f"zoompan=z='1+{ZOOM}*on/{n}':d=1:x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':"
                  f"s={W}x{H}:fps={FPS},setsar=1,"
                  f"eq=contrast=1.06:saturation=1.12,unsharp=5:5:0.7[c{i}]")
    fc.append("".join(f"[c{i}]" for i in range(len(shots))) + f"concat=n={len(shots)}:v=1:a=0[cat]")
    fc.append(f"[cat][1:v]overlay=0:0:eof_action=pass[v0]")
    fc.append(f"[v0][3:v]overlay=x='-w+w*t/{length:.3f}':y=0:shortest=1[v1]")
    fc.append(f"[2:v]fps={FPS},format=yuv420p,setsar=1,settb=1/{FPS}[card]")
    fc.append(f"[v1]fps={FPS},format=yuv420p,settb=1/{FPS}[main]")
    fc.append(f"[main][card]xfade=transition=fade:duration={ms.XFADE}:offset={length - ms.XFADE:.3f}[vout]")
    fc.append(f"[0:a]atrim=start=0:end={length:.3f},asetpts=PTS-STARTPTS,"
              f"highpass=f=80,afade=t=in:d=0.12,afade=t=out:st={length - 0.5:.3f}:d=0.5,"
              f"apad=pad_dur={ms.END_CARD:.2f},loudnorm=I=-14:TP=-1.5:LRA=11[aout]")

    name = clip["file"] if S == 1 else clip["file"].replace(".mp4", "-4k.mp4")
    out = OUT / name
    cmd = ["ffmpeg", "-v", "error", "-y", *inputs, "-filter_complex", ";".join(fc),
           "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "slow" if S == 1 else "medium", "-crf", "19",
           *(["-maxrate", "12M", "-bufsize", "24M"] if S > 1 else []), "-pix_fmt", "yuv420p",
           "-c:a", "aac", "-b:a", "192k", "-ar", "48000",
           "-t", f"{length + ms.END_CARD:.3f}", "-movflags", "+faststart", str(out)]
    proc = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    try:
        for frame in style.overlay_frames(W, H, S, FPS, length, clip["title"], caps):
            proc.stdin.write(frame)
    except BrokenPipeError:
        pass
    proc.stdin.close()
    if proc.wait():
        raise RuntimeError(f"ffmpeg failed for {name}")
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
