"""Sintetiza la banda sonora de 60.0s para 'Isekai Agricultura Norfolk':
- 00:00 a 00:02.8: Orquesta dramática anime / camión-kun (cuerdas tensas) cortada abruptamente por un record scratch cómico.
- 00:02.8 a 00:57.5: Groove Lo-Fi relajado y alegre con laúd acústico (pluck), flauta folk y bajo cálido (94 BPM),
  evocando un anime de agricultura medieval próspero y cómico.
- 00:57.5 a 01:00.0: Riser y arpegio brillante que se resuelve en la tónica inicial creando un bucle infinito (seamless loop).
"""

from pathlib import Path
import numpy as np
import soundfile as sf
from scipy.signal import butter, sosfilt

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "audio" / "music.wav"
OUT.parent.mkdir(parents=True, exist_ok=True)

SR = 48000
DUR = 60.0
N = int(SR * DUR)
BPM = 94
BEAT = 60.0 / BPM
BAR = BEAT * 4
rng = np.random.default_rng(42)


def hz(m: float) -> float:
    return 440.0 * (2.0 ** ((m - 69.0) / 12.0))


def tt(d: float) -> np.ndarray:
    return np.arange(int(d * SR)) / SR


def stereo(x: np.ndarray, p: float = 0.0) -> np.ndarray:
    return np.stack([x * np.cos((p + 1) * np.pi / 4), x * np.sin((p + 1) * np.pi / 4)], axis=1)


def place(bus: np.ndarray, sig: np.ndarray, at: float, gain: float = 1.0) -> None:
    i = int(at * SR)
    if i >= len(bus) or i < 0:
        return
    if sig.ndim == 1:
        sig = stereo(sig)
    j = min(i + len(sig), len(bus))
    bus[i:j] += sig[: j - i] * gain


def lp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, min(fc, SR * 0.45), "low", fs=SR, output="sos"), x, axis=0)


def hp(x: np.ndarray, fc: float, order: int = 2) -> np.ndarray:
    return sosfilt(butter(order, fc, "high", fs=SR, output="sos"), x, axis=0)


def env(d: float, a: float, r: float) -> np.ndarray:
    t = tt(d)
    return np.minimum(1.0, t / max(a, 1e-4)) * np.clip((d - t) / max(r, 1e-4), 0.0, 1.0)


def saw(f: float, d: float) -> np.ndarray:
    t = tt(d)
    return 2.0 * (t * f - np.floor(0.5 + t * f))


def pluck(m: float, d: float = 1.2, brightness: float = 0.6) -> np.ndarray:
    f = hz(m)
    period = int(SR / f)
    noise = rng.uniform(-1, 1, period)
    repeats = int(d * SR / period) + 1
    buf = np.tile(noise, repeats)[: int(d * SR)].astype(np.float32)
    b, a = [1 - brightness, brightness], [1.0]
    filtered = np.zeros_like(buf)
    prev = 0.0
    for i in range(len(buf)):
        prev = 0.5 * (prev + buf[i]) * 0.992
        filtered[i] = prev
    return filtered * env(d, 0.003, d * 0.8)


def flute(m: float, d: float, vib_rate: float = 5.0) -> np.ndarray:
    t = tt(d)
    f = hz(m)
    vib = 1.0 + 0.012 * np.sin(2 * np.pi * vib_rate * t) * np.clip(t / 0.3, 0, 1)
    phase = 2 * np.pi * f * np.cumsum(vib) / SR
    sig = np.sin(phase) + 0.35 * np.sin(2 * phase) + 0.15 * np.sin(3 * phase)
    breath = rng.normal(0, 0.08, len(t))
    sig = lp(sig + breath, min(f * 4, SR * 0.45))
    return sig * env(d, 0.06, 0.12)


def kick(d: float = 0.4) -> np.ndarray:
    t = tt(d)
    f = 140 * np.exp(-t * 28) + 42
    phase = 2 * np.pi * np.cumsum(f) / SR
    return np.sin(phase) * np.exp(-t * 14)


def snare(d: float = 0.28) -> np.ndarray:
    t = tt(d)
    tone = np.sin(2 * np.pi * 180 * t) * np.exp(-t * 22) * 0.5
    noise = rng.uniform(-1, 1, len(t)) * np.exp(-t * 15)
    return tone + hp(noise, 1200) * 0.7


def hihat(d: float = 0.08, open_: bool = False) -> np.ndarray:
    dur = 0.25 if open_ else d
    t = tt(dur)
    noise = rng.uniform(-1, 1, len(t)) * np.exp(-t * (8 if open_ else 35))
    return hp(noise, 6500) * 0.4


def bass(m: float, d: float) -> np.ndarray:
    t = tt(d)
    f = hz(m)
    sig = np.sin(2 * np.pi * f * t) + 0.25 * np.sin(4 * np.pi * f * t)
    return lp(sig, 280) * env(d, 0.02, 0.08)


def build_track() -> np.ndarray:
    bus = np.zeros((N, 2), dtype=np.float32)

    # 1. Intro dramática camión-kun (0 a 2.5s)
    t_intro = tt(2.4)
    intro_chord = np.zeros((len(t_intro), 2), dtype=np.float32)
    for midi in [50, 53, 57, 62]:  # Dm tenso
        f = hz(midi)
        s = saw(f, 2.4) * env(2.4, 0.1, 0.3)
        intro_chord += stereo(lp(s, 1200), rng.uniform(-0.4, 0.4)) * 0.22
    place(bus, intro_chord, 0.0, gain=0.85)

    # Record Scratch cómico en 2.4s
    t_scratch = tt(0.35)
    scratch_f = 2200 * np.exp(-t_scratch * 18)
    scratch = np.sin(2 * np.pi * np.cumsum(scratch_f) / SR) * rng.uniform(0.7, 1.3, len(t_scratch))
    scratch = hp(scratch, 800) * env(0.35, 0.01, 0.05)
    place(bus, stereo(scratch, 0.1), 2.4, gain=0.7)

    # 2. Base Lo-Fi Medieval (2.8s a 58.0s)
    # Progresión campesina feliz en F mayor / D menor:
    # Compás 1: Fmaj (53, 57, 60, 65)
    # Compás 2: Cmaj (48, 52, 55, 60)
    # Compás 3: Dmin (50, 53, 57, 62)
    # Compás 4: Bbmaj (46, 50, 53, 58)
    chords = [
        ([53, 57, 60, 65], 41),  # F
        ([48, 52, 55, 60], 36),  # C
        ([50, 53, 57, 62], 38),  # Dm
        ([46, 50, 53, 58], 34),  # Bb
    ]

    start_time = 2.8
    cur = start_time
    bar_idx = 0
    while cur < 57.5:
        chord_notes, root = chords[bar_idx % len(chords)]

        # Drums (Lo-Fi beat)
        for beat in range(4):
            b_time = cur + beat * BEAT
            if b_time >= 57.5:
                break
            # Kick en beats 0 y 2.5
            if beat == 0:
                place(bus, kick(), b_time, gain=0.65)
            elif beat == 2:
                place(bus, kick(), b_time + BEAT * 0.5, gain=0.55)

            # Snare en beats 1 y 3
            if beat in (1, 3):
                place(bus, snare(), b_time, gain=0.55)

            # Hi-hat swing cada semicorchea
            place(bus, hihat(open_=(beat == 3)), b_time, gain=0.4)
            place(bus, hihat(), b_time + BEAT * 0.55, gain=0.28)

        # Bass
        place(bus, bass(root, BEAT * 1.8), cur, gain=0.6)
        place(bus, bass(root + 7, BEAT * 1.2), cur + BEAT * 2, gain=0.5)

        # Lute plucks (arpegios campestres)
        for step, note in enumerate(chord_notes):
            p_time = cur + step * BEAT * 0.85
            if p_time < 57.5:
                p = pluck(note, d=1.4, brightness=0.55)
                place(bus, stereo(p, p=((step % 2) * 2 - 1) * 0.35), p_time, gain=0.45)

        # Flute melodía cada 2 compases
        if bar_idx % 2 == 0:
            flute_notes = [chord_notes[-1] + 2, chord_notes[-1], chord_notes[-2], chord_notes[-1] + 4]
            for fi, fn in enumerate(flute_notes):
                f_time = cur + fi * BEAT * 0.75
                if f_time < 57.5:
                    fl = flute(fn, d=BEAT * 0.7)
                    place(bus, stereo(fl, p=0.2), f_time, gain=0.35)

        cur += BAR
        bar_idx += 1

    # 3. Cierre y loop riser (57.5s a 60.0s)
    t_end = tt(2.5)
    riser = np.sin(2 * np.pi * np.cumsum(np.linspace(300, 1400, len(t_end))) / SR) * env(2.5, 0.2, 0.1)
    chime = np.zeros((len(t_end), 2), dtype=np.float32)
    for note in [62, 65, 69, 74, 81]:  # Dm arpegio ascendente brillante
        p = pluck(note, d=2.0, brightness=0.85)
        chime[: len(p)] += stereo(p, rng.uniform(-0.4, 0.4))
    place(bus, stereo(lp(riser, 2200), 0.0), 57.5, gain=0.4)
    place(bus, chime, 57.8, gain=0.5)

    # Master limiter & soft clip
    bus = np.clip(bus * 0.85, -0.92, 0.92)
    return bus


if __name__ == "__main__":
    track = build_track()
    sf.write(OUT, track, SR, subtype="PCM_16")
    print(f"Banda sonora generada en: {OUT} ({len(track)/SR:.1f}s)")
