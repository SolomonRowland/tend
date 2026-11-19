# Narration for the quick tour: one line per scene in a calm male voice (Kokoro TTS, voice am_puck, 1.12x speed).
# Writes narration.wav (voice plus faint room tone) and durations.json (seconds per scene, the line plus a breath).
import sys, json, numpy as np, wave, os
from kokoro_onnx import Kokoro
D = os.path.dirname(os.path.abspath(__file__))
M = sys.argv[1] if len(sys.argv) > 1 else os.path.join(D, 'tts')
VOICE = sys.argv[2] if len(sys.argv) > 2 else 'am_puck'
SPEED = float(sys.argv[3]) if len(sys.argv) > 3 else 1.12
LINES = [
  "Welcome to Tent and Table.",
  "Ministry events take more than a calendar. Volunteers, vendors, meals and money end up scattered across texts and spreadsheets. Tent and Table brings it all into one calm place.",
  "Home shows what's coming up, what needs attention, and this week's tasks.",
  "Here's what it does well. Plan each event, step by step. Keep one list of contacts. Share sign-ups by link or QR code. And track volunteers, RSVPs and money as they come in.",
  "To start, tap New Event. A short walkthrough asks for the name, the dates, and the place.",
  "Then answer a few yes or no questions, so the event only shows the parts you need.",
  "Every event gets its own workspace: Overview, Plan, Contacts, and Money.",
  "Tasks run from prep to teardown, sorted by segment, or by area, like food or sound.",
  "Your contacts live in one place. Team, volunteers, guests, vendors, and everyone else.",
  "Pull them into any event, without retyping a thing.",
  "When you're ready to invite people, the Share page holds every link and printable sheet.",
  "Each list has its own QR code. Copy the invite, text it, or print a poster.",
  "Guests and volunteers sign up right from their phone. No account needed.",
  "Then watch your volunteer goal fill up, and see exactly who's coming.",
  "Print any list, or save it as a PDF, like just the food team's tasks.",
  "And on event day, the schedule, check-in, and phone list are one tap away.",
  "Plan it once, and share it everywhere. You can find this tour anytime, in Settings.",
]
k = Kokoro(os.path.join(M, 'kokoro-v1.0.onnx'), os.path.join(M, 'voices-v1.0.bin'))
SR = 24000; LEAD = 0.45; TAIL = 0.55
clips, durs = [], []
for i, line in enumerate(LINES):
    a, sr = k.create(line, voice=VOICE, speed=SPEED, lang='en-us'); SR = sr
    a = np.asarray(a, dtype=np.float32)
    nz = np.where(np.abs(a) > 0.004)[0]
    if len(nz): a = a[max(0, nz[0] - 200): nz[-1] + 1200]
    d = max(3.8 if i else 3.0, LEAD + len(a) / sr + TAIL)
    durs.append(round(d, 2)); clips.append(a)
total = sum(durs)
out = np.zeros(int(SR * (total + 1)), np.float32); t = 0.0
for a, d in zip(clips, durs):
    i = int((t + LEAD) * SR); out[i:i + len(a)] += a; t += d
out = out[:int(SR * total)]
out = out / max(1e-6, np.abs(out).max()) * 0.85
w = wave.open(os.path.join(D, 'voice.wav'), 'wb'); w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
w.writeframes((out * 32767).astype('<i2').tobytes()); w.close()
json.dump(durs, open(os.path.join(D, 'durations.json'), 'w'))
print('voice', VOICE, 'total', round(total, 1), 's', durs)

# Final audio track: the voice over a very faint, warm room tone (about -44 dB) so it is never dead silent.
# One extra second at the end matches the longer last scene in tourvideo.py.
v = np.concatenate([out, np.zeros(SR, np.float32)])
v = np.interp(np.arange(len(v) * 2) / 2, np.arange(len(v)), v); R = 48000; n = len(v)
def warm(seed):
    x = np.cumsum(np.random.default_rng(seed).standard_normal(n)); x -= np.convolve(x, np.ones(4801) / 4801, 'same')
    X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / R); X *= 1 / (1 + (f / 900) ** 4); x = np.fft.irfft(X, n)
    return x / np.sqrt((x ** 2).mean())
t = np.arange(n) / R; env = np.minimum(1, t / 2) * np.minimum(1, (t[-1] - t) / 2.5)
st = np.stack([warm(1), warm(2)], 1) * 10 ** (-44 / 20) * env[:, None] + v[:, None] * 0.9
w = wave.open(os.path.join(D, 'narration.wav'), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(R)
w.writeframes((np.clip(st, -1, 1) * 32767).astype('<i2').tobytes()); w.close()
