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
  // v149: soft, rounded UI sounds (sine partials with a quick attack, through a gentle filter) instead of square-wave beeps
  let ui = null;
  const uiOut = () => { if (!ui) { ui = ctx.createGain(); const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 7000; ui.connect(lp).connect(ctx.destination); } return ui; };
  const ok = () => !muted && running();
  // v150: Shea's voice is a real cat. Four short meows and a purr, recorded by Kerzoven (OpenGameArt, CC0) and Joseph
  // Sardin (BigSoundBank "Small mewing of a cat", CC0): trimmed, cleaned of hum, level-matched; two meows raised 3 semitones
  // so every clip sits in a female cat's range. They load on the first tap that turns sound on (68 KB); until then, or in a
  // browser that can't decode them, the synthesised voice below stands in.
  const BUILD = (() => { try { return new URL(import.meta.url).searchParams.get("v") || "dev"; } catch (_) { return "dev"; } })();
  const MEOWS = ["meow-2", "meow-1", "meow-2", "meow-1", "meow-4", "meow-3"];   // the two highest come up most often
  const clips = {}; let clipsLoading = null, lastMeow = "";
  function loadClips() {
    if (clipsLoading || !ctx) return;
    clipsLoading = Promise.all(["meow-1", "meow-2", "meow-3", "meow-4", "purr"].map((n) =>
      fetch(`assets/sound/${n}.m4a?v=${BUILD}`).then((r) => { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then((a) => new Promise((res, rej) => ctx.decodeAudioData(a, res, rej))).then((b) => { clips[n] = b; }).catch(() => {})));
  }
  function playClip(name, vol, rate = 1, fadeIn = 0, fadeOut = 0) {
    const b = clips[name]; if (!b) return false;
    const t = ctx.currentTime, s = ctx.createBufferSource(), g = ctx.createGain(); s.buffer = b; s.playbackRate.value = rate;
    const d = b.duration / rate;
    g.gain.setValueAtTime(fadeIn ? 0 : vol, t); if (fadeIn) g.gain.linearRampToValueAtTime(vol, t + fadeIn);
    if (fadeOut) { g.gain.setValueAtTime(vol, t + Math.max(fadeIn, d - fadeOut)); g.gain.linearRampToValueAtTime(0, t + d); }
    s.connect(g).connect(uiOut()); s.start(t); return true;
  }
  const ping = (freq, dur, vol, t = ctx.currentTime, type = "sine", attack = 0.003) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(uiOut()); o.start(t); o.stop(t + dur + 0.02);
  };
  const thud = (f0, f1, dur, vol, t = ctx.currentTime) => {
    const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(uiOut()); o.start(t); o.stop(t + dur + 0.02);
  };
  const slap = (freq, vol, dur = 0.05, t = ctx.currentTime) => {   // a short filtered noise burst: leather, a tap
    const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = ctx.createBufferSource(), bp = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; bp.type = "bandpass"; bp.frequency.value = freq; bp.Q.value = 0.9; g.gain.value = vol;
    s.connect(bp).connect(g).connect(uiOut()); s.start(t);
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
    loadClips();
    const go = () => { if (running() && !muted) window.Music.start(ctx); };
    if (running()) go(); else ctx.resume().then(go).catch(() => {});
  }
  return {
    unlock,
    hover: () => { if (ok()) ping(2200, 0.03, 0.01); },
    click: () => { if (ok()) { ping(1300, 0.06, 0.045); ping(2600, 0.025, 0.012); slap(4200, 0.05, 0.012); } },   // a soft, glassy tap
    // a warm startup chord, softly rolled (F# major, like a Mac waking up)
    boot: () => { if (!ok()) return; const t = ctx.currentTime; [92.5, 185, 277.2, 370, 466.2, 554.4].forEach((f, i) => { ping(f, 2.8, 0.03, t + i * 0.012, "sine", 0.02); ping(f * 2, 1.2, 0.006, t + i * 0.012, "triangle", 0.03); }); },
    // keepy-ups: a leather thump that climbs a little with the streak; a softer bump when it lands; a ding at milestones
    kick: (n = 0) => { if (!ok()) return; const k = Math.pow(2, Math.min(n, 16) / 28); thud(190 * k, 85 * k, 0.16, 0.32); slap(1100 * k, 0.28); },
    land: () => { if (ok()) { thud(120, 60, 0.18, 0.18); slap(700, 0.12, 0.04); } },
    ding: () => { if (!ok()) return; const t = ctx.currentTime; ping(1318.5, 0.9, 0.035, t); ping(1975.5, 0.9, 0.025, t + 0.09); },
    purr() {
      if (muted || !running()) return;
      if (playClip("purr", 0.5, 0.98 + Math.random() * 0.06, 0.25, 0.7)) return;   // the real purr
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
      { let n = MEOWS[Math.floor(Math.random() * MEOWS.length)]; if (n === lastMeow) n = MEOWS[(MEOWS.indexOf(n) + 1) % MEOWS.length]; lastMeow = n;
        if (playClip(n, 0.42, 0.96 + Math.random() * 0.1)) return; }   // a real meow, a touch different each time
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
