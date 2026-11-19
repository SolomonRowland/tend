# Renders the Tent & Table quick tour: 1920x1080, 30 fps, piped to ffmpeg.
# Scene lengths come from durations.json (written by tournarrate.py) so each slide lasts as long as its line.
import subprocess, sys, os, numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
D = os.path.dirname(os.path.abspath(__file__))
W, H, FPS = 1920, 1080, 30
SANS = '/usr/share/fonts/truetype/inter/Inter-Regular.ttf'
def font(path_hint, size):
    import glob
    for p in glob.glob('/usr/share/fonts/**/*.tt[fc]', recursive=True) + glob.glob('/usr/share/fonts/**/*.otf', recursive=True):
        if path_hint.lower() in os.path.basename(p).lower(): return ImageFont.truetype(p, size)
    raise SystemExit('font ' + path_hint)
IB='/usr/share/fonts/opentype/inter/Inter-Bold.otf'; IR='/usr/share/fonts/opentype/inter/Inter-Regular.otf'; IM='/usr/share/fonts/opentype/inter/Inter-Medium.otf'; CB='/usr/share/fonts/X11/Type1/c0632bt_.pfb'
F_EYE = ImageFont.truetype(IB, 26); F_H = ImageFont.truetype(CB, 78); F_B = ImageFont.truetype(IR, 38); F_BUL = ImageFont.truetype(IM, 38); F_TITLE = ImageFont.truetype(CB, 112); F_SUB = ImageFont.truetype(IR, 44)
RED = (200, 22, 32); INK = (20, 22, 26); MUTED = (92, 98, 108); BG = (245, 243, 240)

SCENES = [
  ('title', 6.5, None, '', 'Tent & Table', 'Ministry events, planned in one calm place.'),
  ('text', 7.5, None, 'WHY IT EXISTS', 'Events take more than a calendar.', 'Volunteers, vendors, meals, tasks and money usually live in group texts, spreadsheets and sticky notes. Tent & Table brings them together.'),
  ('shot', 7, 's01-home', 'HOME', 'Your ministry at a glance.', 'See what’s next, what needs attention and this week’s tasks the moment you open it.'),
  ('list', 9, None, 'WHAT IT DOES WELL', 'Built for ministry events.', ['Plan every event step by step', 'One contact list for everyone', 'Share sign-ups by link or QR code', 'Track volunteers, RSVPs and money', 'Print or text any list']),
  ('shot', 6.5, 's03-wiz-name', 'STEP 1 · CREATE', 'Start with a short walkthrough.', 'Name, dates, place and the details people will see.'),
  ('shot', 7, 's04-wiz-needs', 'STEP 1 · CREATE', 'Answer yes or no.', 'Guests, volunteers, speakers, meals, money. The event only shows the parts you need.'),
  ('shot', 7, 's05-overview', 'STEP 2 · ORGANIZE', 'Every event gets its own workspace.', 'Overview, Plan, Contacts and Money, with a countdown and what needs attention.'),
  ('shot', 7, 's06-tasks-area', 'STEP 2 · ORGANIZE', 'Tasks from prep to teardown.', 'Group them by segment or by area, like Food, Stage or AV.'),
  ('shot', 6.5, 's16-directory', 'STEP 2 · ORGANIZE', 'One list of contacts.', 'Team, volunteers, guests, vendors and everyone else, added once.'),
  ('shot', 6.5, 's09-picker', 'STEP 2 · ORGANIZE', 'Pull people into the event.', 'Pick who’s serving straight from your contacts. No retyping.'),
  ('shot', 6.5, 's12-share', 'STEP 3 · INVITE', 'Share it everywhere.', 'One Share page for every link, QR code and printable sheet.'),
  ('shot', 6.5, 's13-qr', 'STEP 3 · INVITE', 'A QR code for every list.', 'Copy the invite, send it from your phone, or print a poster for the tables.'),
  ('shot', 6.5, 's14-public', 'STEP 3 · INVITE', 'No account needed.', 'People sign up to serve or RSVP right from their phone.'),
  ('shot', 6.5, 's10-volunteers', 'STEP 4 · TRACK', 'Watch the goal fill up.', 'See who signed up and how many more volunteers you need.'),
  ('shot', 6.5, 's07-tasks-print', 'STEP 4 · TRACK', 'Print any list.', 'Hand the food team just their tasks, or save it as a PDF.'),
  ('shot', 6.5, 's17-today', 'STEP 5 · EVENT DAY', 'Today, one tap away.', 'The schedule, check-in and phone list, right on the Overview.'),
  ('title', 7, None, '', 'Plan it once. Share it everywhere.', 'You can find this tour anytime in Settings.'),
]

def wrap(d, text, f, width):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=f) <= width: cur = t
        else: lines.append(cur); cur = w
    if cur: lines.append(cur)
    return lines

def background():
    im = Image.new('RGB', (W, H), BG)
    y, x = np.mgrid[0:H, 0:W]
    g = np.exp(-(((x - 1650) / 900.0) ** 2 + ((y - 120) / 700.0) ** 2))
    arr = np.array(im).astype(float)
    tint = np.array([238, 214, 212], float)
    arr = arr * (1 - 0.55 * g[..., None]) + tint * (0.55 * g[..., None])
    return Image.fromarray(arr.astype('uint8'))
BGIM = background()

def phone(name):
    sc = Image.open(os.path.join(D, 'shots', name + '.png')).convert('RGB')
    ph_h = 900; ph_w = int(sc.width * ph_h / sc.height)
    sc = sc.resize((ph_w, ph_h), Image.LANCZOS)
    bez = 16; r = 54
    fw, fh = ph_w + 2 * bez, ph_h + 2 * bez
    frame = Image.new('RGBA', (fw, fh), (0, 0, 0, 0))
    dd = ImageDraw.Draw(frame); dd.rounded_rectangle((0, 0, fw - 1, fh - 1), r, fill=(26, 28, 32, 255))
    m = Image.new('L', (ph_w, ph_h), 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, ph_w - 1, ph_h - 1), r - bez, fill=255)
    frame.paste(sc, (bez, bez), m)
    sh = Image.new('RGBA', (fw + 160, fh + 160), (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle((80, 100, fw + 80, fh + 100), r, fill=(40, 20, 20, 90))
    sh = sh.filter(ImageFilter.GaussianBlur(34))
    sh.paste(frame, (80, 80), frame)
    return sh

def text_layer(sc):
    kind, dur, shot, eye, head, body = sc
    lay = Image.new('RGBA', (W, H), (0, 0, 0, 0)); d = ImageDraw.Draw(lay)
    if kind == 'title':
        icon = Image.open('/home/user/tend/events/icon-512.png').convert('RGBA').resize((150, 150), Image.LANCZOS)
        mk = Image.new('L', (150, 150), 0); ImageDraw.Draw(mk).rounded_rectangle((0, 0, 149, 149), 34, fill=255)
        lay.paste(icon, ((W - 150) // 2, 250), mk)
        lines = wrap(d, head, F_TITLE, 1500)
        y = 450
        for ln in lines:
            d.text(((W - d.textlength(ln, font=F_TITLE)) / 2, y), ln, font=F_TITLE, fill=INK); y += 132
        d.text(((W - d.textlength(body, font=F_SUB)) / 2, y + 26), body, font=F_SUB, fill=MUTED)
        return lay
    left, width = 170, 880 if kind == 'shot' else 1300
    y = 300 if kind == 'shot' else 290
    if eye:
        d.text((left, y), ' '.join(eye), font=F_EYE, fill=RED); y += 64
    for ln in wrap(d, head, F_H, width):
        d.text((left, y), ln, font=F_H, fill=INK); y += 92
    y += 28
    d.rectangle((left, y, left + 64, y + 5), fill=RED); y += 44
    if kind == 'list':
        for b in body:
            d.ellipse((left, y + 14, left + 16, y + 30), fill=RED)
            d.text((left + 40, y), b, font=F_BUL, fill=INK); y += 66
    else:
        for ln in wrap(d, body, F_B, width):
            d.text((left, y), ln, font=F_B, fill=MUTED); y += 56
    return lay

PRE = []
for sc in SCENES:
    PRE.append((text_layer(sc), phone(sc[2]) if sc[2] else None))

def ease(x): x = max(0.0, min(1.0, x)); return 1 - (1 - x) ** 3
def render(i, lt):
    sc = SCENES[i]; tl, ph = PRE[i]
    im = BGIM.copy().convert('RGBA')
    a = ease(lt / 0.7)
    t2 = tl.copy(); t2.putalpha(t2.getchannel('A').point(lambda v: int(v * a)))
    im.alpha_composite(t2, (0, int(18 * (1 - a))))
    if ph is not None:
        b = ease((lt - 0.15) / 0.8)
        float_y = int(6 * np.sin(lt * 0.9))
        p2 = ph.copy(); p2.putalpha(p2.getchannel('A').point(lambda v: int(v * b)))
        x = 1420 - p2.width // 2
        im.alpha_composite(p2, (x, (H - p2.height) // 2 + int(40 * (1 - b)) + float_y))
    return im.convert('RGB')

import json
_d = json.load(open(os.path.join(D, 'durations.json'))); _d[-1] += 1.0
SCENES = [(sc[0], dd) + tuple(sc[2:]) for sc, dd in zip(SCENES, _d)]
total = sum(s[1] for s in SCENES)
out = sys.argv[1]; audio = sys.argv[2]
ff = subprocess.Popen(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', f'{W}x{H}', '-r', str(FPS), '-i', '-', '-i', audio,
                       '-c:v', 'libx264', '-preset', 'medium', '-crf', '22', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', out], stdin=subprocess.PIPE)
prev_last = None; XF = 0.5
for i, sc in enumerate(SCENES):
    n = int(round(sc[1] * FPS))
    for f in range(n):
        lt = f / FPS
        fr = render(i, lt)
        if prev_last is not None and lt < XF:
            fr = Image.blend(prev_last, fr, lt / XF)
        if i == len(SCENES) - 1 and lt > sc[1] - 1.2:
            fr = Image.blend(fr, Image.new('RGB', (W, H), BG), (lt - (sc[1] - 1.2)) / 1.2)
        ff.stdin.write(fr.tobytes())
        if f == n - 1: prev_last = fr
ff.stdin.close(); ff.wait()
print('video', round(total, 1), 's')
