// Sound: tiny synth blips, purr, meow, and the gate for the music (split out of main.js in v103)
const $ = (s) => document.querySelector(s);

/* ───────────────────────── Sound (tiny synth blips + the music) ─────────────────────────
   Browsers only let a page make sound after a real tap/click/key, and phones are stricter:
   iOS counts the *end* of a tap (not the touch-down), mutes Web Audio when the silent switch is on,
   and suspends audio when you switch apps. So: the audio context is only created inside a gesture,
   every gesture re-tries until audio is really running, and the session is marked as "playback". */
export const Sound = (() => {
  let ctx = null, muted = false, silentLoop = null;
  try { muted = localStorage.getItem("muted") === "1"; } catch (_) {}
  const running = () => ctx && ctx.state === "running";
  const blip = (freq, dur = 0.06, type = "square", vol = 0.04) => {
    if (muted || !running()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  };
  // iPhone silent switch: ask for "playback" audio (Safari 17+); older iOS gets the same effect from a silent looping <audio>
  function playbackSession() {
    try { if (navigator.audioSession) { navigator.audioSession.type = "playback"; return; } } catch (_) {}
    if (silentLoop || !/iPhone|iPad|iPod/.test(navigator.userAgent)) return;
    const rate = 8000, n = rate / 2, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 2, true);
    silentLoop = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
    silentLoop.loop = true; silentLoop.setAttribute("playsinline", ""); silentLoop.play().catch(() => {});
  }
  // call from inside a user gesture: creates/resumes audio and starts the music (unless muted)
  function unlock() {
    if (muted) return;
    playbackSession();
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const go = () => { if (running() && !muted) window.Music.start(ctx); };
    if (running()) go(); else ctx.resume().then(go).catch(() => {});
  }
  return {
    unlock,
    hover: () => blip(880, 0.03, "sine", 0.02),
    click: () => blip(520, 0.07),
    boot: () => [262, 330, 392, 523].forEach((f, i) => setTimeout(() => blip(f, 0.14, "triangle", 0.05), i * 110)),
    purr() {
      if (muted || !running()) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), t = ctx.currentTime;
      o.type = "sawtooth"; o.frequency.value = 55;
      lfo.frequency.value = 24; lg.gain.value = 0.03;
      lfo.connect(lg).connect(g.gain);
      g.gain.setValueAtTime(0.035, t); g.gain.linearRampToValueAtTime(0.0001, t + 1.8);
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 300;
      o.connect(f).connect(g).connect(ctx.destination);
      o.start(t); lfo.start(t); o.stop(t + 1.8); lfo.stop(t + 1.8);
    },
    // an original, synthesised meow (no recording): a voiced buzz with pitch rising then falling ("mi-aow"), shaped
    // by two vocal-tract formants that glide from an "ee" to an "ow", soft attack, a little vibrato
    meow() {
      if (muted || !running()) return;
      const t = ctx.currentTime, d = 0.62 + Math.random() * 0.25, f0 = 520 + Math.random() * 120;
      const o = ctx.createOscillator(), vib = ctx.createOscillator(), vg = ctx.createGain(), g = ctx.createGain(), out = ctx.createGain();
      o.type = "sawtooth";
      o.frequency.setValueAtTime(f0 * 0.82, t); o.frequency.linearRampToValueAtTime(f0 * 1.18, t + d * 0.3); o.frequency.exponentialRampToValueAtTime(f0 * 0.66, t + d);
      vib.frequency.value = 6.5; vg.gain.value = 9; vib.connect(vg).connect(o.frequency);
      const f1 = ctx.createBiquadFilter(), f2 = ctx.createBiquadFilter(); f1.type = f2.type = "bandpass"; f1.Q.value = 6; f2.Q.value = 8;
      f1.frequency.setValueAtTime(900, t); f1.frequency.linearRampToValueAtTime(1300, t + d * 0.35); f1.frequency.linearRampToValueAtTime(700, t + d);
      f2.frequency.setValueAtTime(2600, t); f2.frequency.linearRampToValueAtTime(2000, t + d * 0.4); f2.frequency.linearRampToValueAtTime(1100, t + d);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.16, t + 0.06); g.gain.setValueAtTime(0.16, t + d * 0.55); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
      out.gain.value = 0.9;
      o.connect(f1).connect(g); o.connect(f2).connect(g); g.connect(out).connect(ctx.destination);
      o.start(t); vib.start(t); o.stop(t + d + 0.05); vib.stop(t + d + 0.05);
    },
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem("muted", muted ? "1" : "0"); } catch (_) {}
      if (muted) { window.Music.stop(); if (silentLoop) silentLoop.pause(); } else unlock();
      $("#soundBtn").classList.toggle("muted", muted);
      $("#soundBtn").setAttribute("aria-label", muted ? "Turn sound on" : "Mute sound");
      return muted;
    },
    toggle() { return this.setMuted(!muted); },
    get muted() { return muted; },
    get state() { return ctx ? ctx.state : "none"; }
  };
})();
