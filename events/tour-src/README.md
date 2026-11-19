# Quick tour video

Builds `events/tour.mp4`, the under-two-minute tour shown in Settings > Help.

1. Serve the repo root: `python3 -m http.server 8765` (from the repo root).
2. Capture the screens from the demo: `mkdir -p shots && node tourcap.js` (needs Playwright).
3. Make the music, a soft piano and strings arrangement of "Amazing Grace" (public-domain tune NEW BRITAIN): `python3 tourmusic.py 116.5 music.wav`
4. Render: `python3 tourvideo.py ../tour.mp4 music.wav` (needs Pillow, numpy and ffmpeg).

Scene text and timing live in the `SCENES` list in `tourvideo.py`. The music length must match the total of the scene durations.
