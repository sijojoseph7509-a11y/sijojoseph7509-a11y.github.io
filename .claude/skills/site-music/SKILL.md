---
name: site-music
description: Change, tune or check the site's generative music (music.js) and UI sounds (sound.js) for sijo.work. Use when the user says the music sounds bad, wants a new mood, different instruments, louder/quieter music, or new sounds for the desk, the game or the Mac desktop. Renders every mood offline to WAV/M4A and measures level, peaks and clipping, so changes are checked without speakers.
---

# Site music

Everything is synthesised live with the Web Audio API: no samples, no audio files, no copyright issues, nothing to download.

## How it is built (music.js, v149)
- `createEngine(ctx, out)` builds the whole mix on any AudioContext: instruments → per-mood bus (keys, lead, pad,
  drums, bass, bed groups; the kick ducks keys/pads/leads) → shared chain: high-pass 30 Hz → low-pass 9 kHz → tape
  wobble (modulated delay) → glue compressor → limiter → master. A generated 2.4 s room reverb is fed by per-group sends.
- Instruments: FM electric piano (`ep`), glockenspiel `bell`, saw `pad`, `bass`, saturated `b808`, `kick`, `snare`,
  `rim`, `hat`, `clap`, 808 `cowbell`, bansuri `flute` (vibrato, glides, breath), `harmonium`, `tanpura`,
  tuned `tabla` / `mridangam` strokes, beds (`vinylBed`, `rainBed`) and one-shots (`cricket`, `drop`, `thunder`, `templeBell`).
- Moods (names are shown on the desk phone and colour the speaker light via `MOOD_LED` in main.js; keep them in sync):
  `Desk lo-fi` (78 BPM, Dm9–G13–Cmaj9–A7), `Night-drive phonk` (140 half-time, C# Phrygian), `Kerala evening`
  (72 BPM, raga Mohanam on D), `Monsoon chai` (84 BPM, G minor, keherwa).
- A mood is `{ name, bpm, swing, level, init(B, S), step(B, s, bar, t, sp, S) }`: `step` runs every sixteenth note
  (`s` 0–15 in the bar). `level` balances loudness between moods: keep every mood within ~1 dB of the others.
- Melodies: `phrase(pools)` makes a 2-bar phrase moving mostly by step; `answer()` repeats it with a resolving ending.
- `window.Music` API used by the site: `start(ctx)`, `stop()`, `next()`, `mood`, `moods`, `onChange(f)`, `playing`, `_engine`.

## Check a change (no speakers needed)
```bash
# from the repo root, with puppeteer-core installed in <scratch>/qa (see site-qa)
QA_DEPS=<scratch>/qa node .claude/skills/site-music/render.mjs music.js <out-dir> 45
for f in <out-dir>/*.wav; do afconvert -f m4af -d aac -b 160000 "$f" "${f%.wav}.m4a"; done   # small previews to send
```
It prints, per mood: peak dBFS, RMS dBFS, clipped samples, DC offset and the level of every second (spot dropouts).
Targets: every mood within ~1 dB of the others, 0 clipped samples, 0 errors. v159 halved the master (0.45, about -6 dB:
RMS about -22 to -24 dBFS) because visitors found the music distracting, and `Music.duck(level)` fades it while the Mac is
open (0.45) and lower in a case study (0.25); back to 1 at the desk (os.js). The welcome card's main Enter is silent.
Send the .m4a previews to Sijo: only a listener can judge taste.

## UI sounds (sound.js)
`hover`, `click` (a soft glassy tap), `boot` (a rolled F# major chord), `kick(n)` / `land()` / `ding()` for keepy-ups,
`purr`, `meow`. Keep them quiet next to the music (peaks around 0.03–0.3 gain) and rounded (sine partials, quick attack).
