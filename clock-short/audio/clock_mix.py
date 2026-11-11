"""Synthesised sound for 'The City With Two Minute Hands': SFX on the story timeline + an original light score,
ducked under the voice. Output: out/mix.wav (48 kHz stereo)."""
import wave, numpy as np
SR = 48000
LEN = 64.0
N = int(SR * LEN)
rng = np.random.default_rng(7)

def load_voice(path):
    w = wave.open(path); sr = w.getframerate()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768
    t = np.arange(int(len(x) * SR / sr)) / SR
    return np.interp(t * sr, np.arange(len(x)), x).astype(np.float32)

def add(buf, x, t0, gain=1.0):
    i = int(t0 * SR)
    if i >= len(buf): return
    x = x[: len(buf) - i] if i >= 0 else x[-i:]
    buf[max(i, 0): max(i, 0) + len(x)] += gain * x

def pad(*xs):
    n = max(len(x) for x in xs); out = np.zeros(n, np.float32)
    for x in xs: out[: len(x)] += x
    return out

def env(n, a=0.002, d=0.1):
    t = np.arange(n) / SR
    return np.minimum(1, t / a) * np.exp(-t / d)

def noise_burst(dur, lp=0.2, d=0.05):
    n = int(dur * SR); x = rng.standard_normal(n).astype(np.float32)
    y = np.zeros(n, np.float32); s = 0.0
    for i in range(n): s += lp * (x[i] - s); y[i] = s
    return y * env(n, 0.003, d)

def tone(freq, dur, d=0.2, harm=(1, 0.4, 0.2), a=0.004):
    n = int(dur * SR); t = np.arange(n) / SR
    y = sum(h * np.sin(2 * np.pi * freq * (k + 1) * t) for k, h in enumerate(harm))
    return (y * env(n, a, d)).astype(np.float32) * 0.4

def pluck(freq, dur=0.8):
    n = int(dur * SR); p = max(2, int(SR / freq)); b = rng.uniform(-1, 1, p).astype(np.float32); y = np.zeros(n, np.float32)
    for i in range(n):
        y[i] = b[i % p]; b[i % p] = 0.5 * (b[i % p] + b[(i + 1) % p]) * 0.996
    return y * 0.5

def thump(f0=80, dur=0.35):
    n = int(dur * SR); t = np.arange(n) / SR
    return (np.sin(2 * np.pi * (f0 * np.exp(-t * 7) + 40) * t * 1.0) * env(n, 0.002, 0.12)).astype(np.float32)

def snare():
    return pad(noise_burst(0.14, 0.7, 0.04) * 0.6, tone(190, 0.12, 0.04, (1,)) * 0.5)

def chuff(): return pad(noise_burst(0.16, 0.12, 0.05) * 1.0, thump(60, 0.14) * 0.4)

def whistle(dur=1.1):
    n = int(dur * SR); t = np.arange(n) / SR
    f = 880 + 12 * np.sin(2 * np.pi * 6 * t)
    return (np.sin(2 * np.pi * np.cumsum(f) / SR) * 0.5 + np.sin(2 * np.pi * np.cumsum(f * 1.5) / SR) * 0.25).astype(np.float32) * np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.2) * 0.35

def bell(freq=660, dur=2.0): return tone(freq, dur, 0.7, (1, 0.5, 0.3, 0.2))

def tick(): return pad(noise_burst(0.02, 0.5, 0.006) * 0.7, tone(1800, 0.02, 0.008, (1,)) * 0.4)

def clop(): return pad(tone(300, 0.07, 0.03, (1, 0.5)) * 0.8, noise_burst(0.04, 0.4, 0.015) * 0.3)

def whoosh(dur=0.5):
    n = int(dur * SR); x = rng.standard_normal(n).astype(np.float32); y = np.zeros(n, np.float32); s = 0.0
    for i in range(n):
        lp = 0.02 + 0.3 * np.sin(np.pi * i / n) ** 2; s += lp * (x[i] - s); y[i] = s
    return y * np.sin(np.pi * np.arange(n) / n) * 1.6

sfx = np.zeros(N, np.float32)
# --- clocks ticking: Bristol and London (8.8-12.2), station (19-24), final bells
for t in np.arange(8.9, 12.3, 1.0): add(sfx, tick(), t, 0.5)
for t in np.arange(19.2, 24.2, 1.0): add(sfx, tick(), t, 0.35)
# --- horse + cart 12.3-15.6
for k, t in enumerate(np.arange(12.4, 15.6, 0.5)): add(sfx, clop(), t, 0.6); add(sfx, clop(), t + 0.22, 0.4)
# --- train arrives 15.5-18.6
add(sfx, whistle(1.1), 15.5, 0.9)
t = 15.9
gap = 0.22
while t < 18.4: add(sfx, chuff(), t, 0.9); t += gap; gap *= 1.07
add(sfx, noise_burst(1.2, 0.5, 0.5) * 0.5, 18.3, 0.8)
# --- running 24.4-28.1 + train leaves 25.6-28.8
for k, t in enumerate(np.arange(24.5, 28.0, 0.21)): add(sfx, noise_burst(0.05, 0.3, 0.02) * (0.6 if k % 2 else 0.4), t, 0.7)
add(sfx, whistle(0.9), 25.4, 0.8)
t = 25.7; gap = 0.4
while t < 28.8: add(sfx, chuff(), t, 0.9); t += gap; gap *= 0.9
# --- every clock jumps to London time: bells 30.6-32.3
for t, f in [(30.8, 660), (31.5, 784), (32.3, 880)]: add(sfx, bell(f), t, 0.55); add(sfx, whoosh(0.3), t - 0.25, 0.3)
# --- others gave in: train rushes by 34.6-39.4
t = 34.7; gap = 0.3
while t < 38.8: add(sfx, chuff(), t, 0.8); t += gap; gap = max(0.17, gap * 0.95)
add(sfx, whistle(1.2), 35.2, 0.7)
# --- second minute hand appears: tick + boing at 41.2
add(sfx, whoosh(0.5), 40.9, 0.7); add(sfx, tone(520, 0.25, 0.1, (1, 0.5)), 41.2, 0.8); add(sfx, tone(780, 0.3, 0.12, (1, 0.4)), 41.35, 0.7)
for t in np.arange(41.6, 44.3, 0.5): add(sfx, tick(), t, 0.5)
# --- drummers: ragged 44.8-47.2, then in step 47.3-50.2
for k in range(14):
    add(sfx, snare(), 44.9 + k * 0.17 + rng.uniform(-0.09, 0.09), 0.5); add(sfx, thump(), 44.95 + k * 0.17 + rng.uniform(-0.12, 0.12), 0.5)
for k, t in enumerate(np.arange(47.4, 50.3, 0.5)): add(sfx, thump(70, 0.35), t, 0.9); add(sfx, snare(), t + 0.25, 0.5)
# --- 1880: stamp 50.6; phone ping 54.3; final bells
add(sfx, thump(55, 0.5), 50.65, 1.0); add(sfx, noise_burst(0.1, 0.5, 0.03), 50.65, 0.6)
add(sfx, tone(1318, 0.25, 0.1, (1, 0.3)), 54.3, 0.6); add(sfx, tone(1760, 0.4, 0.15, (1, 0.3)), 54.45, 0.6)
for t, f in [(58.0, 523), (58.5, 659), (59.0, 784), (59.5, 1047)]: add(sfx, bell(f, 3.0), t, 0.28)
add(sfx, whoosh(1.2), 61.5, 0.4)

# --- music: gentle plucked loop (C Am F G), 96 bpm, plus soft bass; marchy snare under the drum beat is the SFX
mus = np.zeros(N, np.float32)
chords = [(261.6, 329.6, 392.0), (220.0, 261.6, 329.6), (174.6, 220.0, 261.6), (196.0, 246.9, 293.7)]
beat = 60 / 96
for bar in range(int(LEN / (beat * 4)) + 1):
    ch = chords[bar % 4]
    for k in range(8):
        t = bar * beat * 4 + k * beat / 2
        add(mus, pluck(ch[[0, 1, 2, 1, 0, 1, 2, 1][k]] * (2 if k % 2 else 1)), t, 0.35)
    add(mus, tone(ch[0] / 2, beat * 1.8, 0.8, (1, 0.3)), bar * beat * 4, 0.5)
    add(mus, tone(ch[0] / 2, beat * 1.8, 0.8, (1, 0.3)), bar * beat * 4 + beat * 2, 0.4)
mus *= np.minimum(1, np.arange(N) / (SR * 2)) * np.minimum(1, (N - np.arange(N)) / (SR * 3))

voice = np.zeros(N, np.float32)
v = load_voice("voice/voice.wav"); add(voice, v, 0.3)   # 0.3 s lead-in so the picture lands before the first word? no: keep exact
voice = np.zeros(N, np.float32); add(voice, v, 0.0)
# duck music + sfx under the voice
e = np.abs(voice); k = int(SR * 0.05); e = np.convolve(e, np.ones(k) / k, "same")
e = np.convolve(e, np.ones(int(SR * 0.4)) / int(SR * 0.4), "same")
duck = 1 - 0.55 * np.minimum(1, e / 0.06)
mix = voice * 1.0 + mus * 0.35 * 1.41 * duck + sfx * 0.5 * (0.6 + 0.4 * duck)   # music +3 dB, sfx -6 dB
pk = np.max(np.abs(mix)); mix = mix / max(pk, 1e-6) * 0.89
st = np.stack([mix, mix], 1)
import os; os.makedirs("out", exist_ok=True)
with wave.open("out/mix.wav", "wb") as w:
    w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((st * 32767).astype(np.int16).tobytes())
print("mix ok", LEN, "s peak", pk)
