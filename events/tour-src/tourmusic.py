# Soft instrumental of "Amazing Grace" (tune NEW BRITAIN, public domain): piano with a light string pad.
import numpy as np, wave, sys
SR = 44100
LEN = float(sys.argv[1]) if len(sys.argv) > 1 else 110.0
OUT = sys.argv[2] if len(sys.argv) > 2 else 'music.wav'
BPM = 64.0; BEAT = 60.0 / BPM

def hz(n): return 440.0 * 2 ** ((n - 69) / 12.0)
N = {'C3':48,'D3':50,'E3':52,'G2':43,'A2':45,'B2':47,'G3':55,'A3':57,'B3':59,'C4':60,'D4':62,'E4':64,'Fs4':66,'G4':67,'A4':69,'B4':71,'C5':72,'D5':74,'E5':76}
mel = [('D4',1),('G4',2),('B4',.5),('G4',.5),('B4',2),('A4',1),('G4',2),('E4',1),('D4',2),('D4',1),('G4',2),('B4',.5),('G4',.5),('B4',2),('A4',1),('D5',3),
       ('D5',2),('B4',1),('D5',1.5),('B4',.5),('D5',.5),('B4',.5),('G4',2),('D4',1),('E4',1.5),('G4',.5),('G4',.5),('E4',.5),('D4',2),('D4',1),('G4',2),('B4',.5),('G4',.5),('B4',2),('A4',1),('G4',3)]
# one chord per bar after the one-beat pickup
CH = {'G':['G2','D3','G3','B3'],'C':['C3','G3','C4','E4'],'D':['D3','A3','D4','Fs4'],'Em':['E3','B3','E4','G4']}
bars = ['G','G','C','G','G','D','D','G','G','G','C','G','G','D','G']

def piano(f, dur, vel):
    t = np.arange(int(SR * (dur + 2.5))) / SR
    s = np.zeros_like(t)
    for k in range(1, 8):
        s += (1.0 / k ** 1.6) * np.sin(2 * np.pi * f * k * t * (1 + 0.0004 * k)) * np.exp(-t * (0.9 + 0.55 * k))
    env = np.minimum(1, t / 0.006)
    rel = np.where(t > dur, np.exp(-(t - dur) * 3.5), 1.0)
    return vel * s * env * rel

def pad(f, dur, vel):
    t = np.arange(int(SR * (dur + 1.2))) / SR
    vib = 1 + 0.0035 * np.sin(2 * np.pi * 5.2 * t) * np.minimum(1, t / 1.0)
    s = np.zeros_like(t)
    for k in range(1, 9):
        s += (1.0 / k) * np.sin(2 * np.pi * f * k * np.cumsum(vib) / SR) * (0.9 ** k)
    env = np.minimum(1, t / 0.9) * np.where(t > dur, np.exp(-(t - dur) * 2.5), 1.0)
    return vel * s * env

out = np.zeros(int(SR * (LEN + 4)))
def put(sig, at):
    i = int(at * SR)
    if i >= len(out): return
    j = min(len(out), i + len(sig)); out[i:j] += sig[:j - i]

total_beats = sum(d for _, d in mel)
verse = total_beats * BEAT
t0 = 1.0; v = 0
while t0 < LEN:
    # melody
    tt = t0
    for n, d in mel:
        put(piano(hz(N[n]) * (2 if v == 2 else 1), d * BEAT, 0.20 if v != 1 else 0.17), tt)
        if v >= 1: put(pad(hz(N[n]), d * BEAT, 0.035), tt)
        tt += d * BEAT
    # left hand: gentle broken chords, one per bar
    tb = t0 + BEAT
    for c in bars:
        notes = CH[c]
        for b, idx in enumerate([0, 2, 3]):
            put(piano(hz(N[notes[idx]]), BEAT * 1.2, 0.085), tb + b * BEAT)
        put(pad(hz(N[notes[1]]), 3 * BEAT, 0.018 if v >= 1 else 0), tb)
        tb += 3 * BEAT
    t0 += verse + BEAT
    v += 1

# room: decaying noise impulse response (about 2.4 s), slightly different per channel
rng = np.random.default_rng(7)
def reverb(x, seed):
    r = np.random.default_rng(seed)
    n = int(SR * 2.4); t = np.arange(n) / SR
    ir = r.standard_normal(n) * np.exp(-t * 2.6); ir[0] = 0
    ir /= np.sqrt((ir ** 2).sum())
    L = 1 << int(np.ceil(np.log2(len(x) + n)))
    y = np.fft.irfft(np.fft.rfft(x, L) * np.fft.rfft(ir, L), L)[:len(x)]
    return y
dry = out[:int(SR * LEN)]
Lc = 0.72 * dry + 0.30 * reverb(dry, 1)
Rc = 0.72 * dry + 0.30 * reverb(dry, 2)
st = np.stack([Lc, Rc], 1)
# fades
fi = int(SR * 1.5); fo = int(SR * 4)
st[:fi] *= np.linspace(0, 1, fi)[:, None]
st[-fo:] *= np.linspace(1, 0, fo)[:, None]
st = st / np.abs(st).max() * 0.55
w = wave.open(OUT, 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((st * 32767).astype('<i2').tobytes()); w.close()
print('music', LEN, 'verse', round(verse, 1))
