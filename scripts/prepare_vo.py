"""Normaliza la narración, recorta el silencio y exporta duraciones + tiempos por palabra.

Lee public/audio/vo/<locucion>.mp3 + scripts/out/vo-timings.json (generados por voiceover.py)
y guarda public/audio/vo/<locucion>.wav y src/data/vo.json. Los tiempos de las palabras quedan
relativos al audio ya recortado, por lo que el inicio de cada locución en la línea de tiempo marca la 1ª sílaba.

Uso (en la raíz del proyecto):
    python scripts/prepare_vo.py
"""

import json
import re
import subprocess
import sys
from pathlib import Path

import numpy as np
import soundfile as sf


def clean_text_for_display(text: str) -> str:
    """Elimina etiquetas de emoción entre corchetes [tag] para visualización en subtítulos."""
    cleaned = re.sub(r"\[.*?\]", "", text).strip()
    return re.sub(r"\s+", " ", cleaned)


ROOT = Path(__file__).resolve().parent.parent  # raíz del proyecto isekai-agricultura-video
VO = ROOT / "public" / "audio" / "vo"
TIMINGS = json.loads((ROOT / "scripts" / "out" / "vo-timings.json").read_text(encoding="utf-8"))
OUT_JSON = ROOT / "src" / "data" / "vo.json"

SR = 48000
TARGET_RMS_DB = -17.0
FADE = 0.012
MAX_SCENE_SEC = {
    "s0": 6.85,
    "s1": 10.85,
    "s2": 17.85,
    "s3": 13.85,
    "s4": 9.85,
}


def load(path: Path, tempo: float = 1.0) -> np.ndarray:
    cmd = ["ffmpeg", "-v", "error", "-i", str(path)]
    if tempo > 1.005:
        cmd += ["-af", f"atempo={tempo:.4f}"]
    cmd += ["-ac", "1", "-ar", str(SR), "-f", "f32le", "-"]
    raw = subprocess.run(
        cmd,
        capture_output=True,
        check=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def trim_bounds(x: np.ndarray) -> tuple[int, int]:
    idx = np.flatnonzero(np.abs(x) > 10 ** (-42 / 20))
    if len(idx) == 0:
        return 0, len(x)
    return max(idx[0] - int(0.015 * SR), 0), min(idx[-1] + int(0.08 * SR), len(x))


def normalize(x: np.ndarray) -> np.ndarray:
    speech = x[np.abs(x) > 10 ** (-45 / 20)]
    rms = np.sqrt(np.mean(speech**2)) if len(speech) else 1.0
    y = x * (10 ** (TARGET_RMS_DB / 20) / rms)
    peak = np.max(np.abs(y))
    return y * (0.89 / peak) if peak > 0.89 else y


def fade(x: np.ndarray) -> np.ndarray:
    n = min(int(FADE * SR), len(x) // 2)
    ramp = np.linspace(0, 1, n, dtype=np.float32)
    x[:n] *= ramp
    x[-n:] *= ramp[::-1]
    return x


def main() -> None:
    sys.stdout.reconfigure(encoding="utf-8")
    out = {}
    for key, line in TIMINGS["lines"].items():
        x_raw = normalize(load(VO / f"{key}.mp3"))
        a0, b0 = trim_bounds(x_raw)
        raw_dur = (b0 - a0) / SR
        max_sec = MAX_SCENE_SEC.get(key, 99.0)
        tempo = max(1.0, raw_dur / max_sec) if raw_dur > max_sec else 1.0

        x = normalize(load(VO / f"{key}.mp3", tempo=tempo))
        a, b = trim_bounds(x)
        y = fade(x[a:b].copy())
        sf.write(VO / f"{key}.wav", y, SR, subtype="PCM_16")
        offset = a0 / SR
        out[key] = {
            "text": clean_text_for_display(line["text"]),
            "seconds": round(len(y) / SR, 3),
            "words": [
                {
                    "text": w["text"],
                    "start": round(max(0.0, (w["start"] / tempo) - offset), 3),
                    "end": round(max(0.0, (w["end"] / tempo) - offset), 3),
                }
                for w in line["words"]
            ],
        }
        print(f"[{key}] {out[key]['seconds']}s (tempo: {tempo:.2f}x)")

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Guardado {OUT_JSON}")


if __name__ == "__main__":
    main()
