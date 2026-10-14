// Original generative music, synthesised live with the Web Audio API.
// No samples or recordings are used — every note is generated here, so there are no copyright issues.
// Four moods from Sijo's own playlist taste (phonk, Malayalam and Hindi songs), plus the original desk lo-fi.
// The soundbar on the desk switches between them; window.Music.mood / .moods expose the current one (the phone shows it).
(() => {
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  let ctx = null, master = null, bus = null, timer = null, nextTime = 0, step = 0, bar = 0, noise = null, crackle = null, current = 0;
  const listeners = new Set();

  function makeNoise() {
    const b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return b;
  }
  function env(g, t, a, peak, dec, sus = 0.0001) {
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + a);
    g.gain.exponentialRampToValueAtTime(Math.max(sus, 0.0001), t + a + dec);
  }
  function tone(type, freq, t, dur, peak, attack, cutoff, detune = 0, glideTo = 0, q = 0.7) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (glideTo) o.frequency.exponentialRampToValueAtTime(glideTo, t + Math.min(dur, 0.25));
    f.type = "lowpass"; f.frequency.value = cutoff; f.Q.value = q;
    env(g, t, attack, peak, dur);
    o.connect(f).connect(g).connect(bus);
    o.start(t); o.stop(t + attack + dur + 0.05);
    return o;
  }
  function hit(t, freq, q, peak, dur, type = "bandpass") {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    env(g, t, 0.002, peak, dur);
    s.connect(f).connect(g).connect(bus);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  function drum(t, from, to, peak, dur) {   // a tuned drum: a sine that slides in pitch
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(from, t); o.frequency.exponentialRampToValueAtTime(to, t + dur * 0.6);
    env(g, t, 0.003, peak, dur);
    o.connect(g).connect(bus); o.start(t); o.stop(t + dur + 0.05);
  }
  const rnd = (a) => a[Math.floor(Math.random() * a.length)];

  // ── 1. Desk lo-fi (the original loop): 76 BPM, Fmaj7 · Em7 · Dm9 · Cmaj7(add9), swung eighths ──
  const LOFI = (() => {
    const BPM = 76, BEAT = 60 / BPM, BAR = BEAT * 4, STEP = BEAT / 2, SWING = 0.12;
    const CHORDS = [{ bass: 41, notes: [53, 57, 60, 64] }, { bass: 40, notes: [52, 55, 59, 62] }, { bass: 38, notes: [53, 57, 60, 64, 62] }, { bass: 36, notes: [52, 55, 59, 62] }];
    const MOTIFS = [[72, null, 69, null, 67, 69, null, null], [76, null, 74, 72, null, 69, null, null], [69, 72, null, 74, null, null, 72, null], [null, 67, 69, null, 72, null, 69, 67], [74, null, null, 72, 69, null, 67, null]];
    let motif = MOTIFS[0];
    const keys = (n, t, vel = 1) => { tone("sine", midi(n), t, 1.1, 0.05 * vel, 0.006, 2600); tone("triangle", midi(n) * 2, t, 0.35, 0.008 * vel, 0.004, 3200); };
    return {
      name: "Desk lo-fi", step: STEP, per: 8, crackle: true,
      play(t, s8, barN) {
        const chord = CHORDS[barN % 4], tt = t + (s8 % 2 ? SWING * STEP : 0);
        if (s8 === 0) {
          chord.notes.forEach((n, i) => { tone("triangle", midi(n), t, BAR * 0.95, 0.022, 0.6, 900, i % 2 ? 6 : -6); tone("sine", midi(n + 12), t, BAR * 0.8, 0.008, 0.8, 1400); });
          motif = rnd(MOTIFS); tone("sine", midi(chord.bass), t, BEAT * 1.6, 0.11, 0.015, 300);
        }
        if (s8 === 5) tone("sine", midi(chord.bass + (Math.random() < 0.5 ? 7 : 12)), tt, BEAT * 0.9, 0.11, 0.015, 300);
        if (s8 === 0 || (s8 === 5 && Math.random() < 0.7)) drum(tt, 110, 42, 0.22, 0.3);
        if (s8 === 2 || s8 === 6) { hit(tt, 1800, 0.8, 0.05, 0.18); tone("triangle", 190, tt, 0.08, 0.02, 0.002, 800); }
        if (Math.random() < 0.9) hit(tt, 8000, 1.2, s8 === 7 ? 0.016 : 0.011, s8 === 7 ? 0.12 : 0.035, "highpass");
        const n = motif[s8];
        if (n && barN % 8 !== 7 && Math.random() < 0.85) keys(n, tt, 0.7 + Math.random() * 0.3);
        if (s8 === 3 && Math.random() < 0.5) chord.notes.slice(1, 3).forEach((m) => keys(m, tt, 0.35));
      }
    };
  })();

  // ── 2. Night-drive phonk: 128 BPM, C# Phrygian, cowbell riff, sliding 808, rolling hats ──
  const PHONK = (() => {
    const BPM = 128, STEP = 60 / BPM / 4;   // sixteenths
    const ROOT = 37;                          // C#2
    const BELL = [[73, 0], [76, 2], [74, 4], [73, 6], [69, 8], [73, 10], [76, 11], [78, 12], [76, 14]];
    const BASS = [[0, 0, 4], [6, -2, 2], [8, 0, 3], [11, 3, 2], [14, -2, 2]];   // [step, semitones, length in steps]
    const bell = (n, t, v) => {   // cowbell: two square partials through a bandpass, very short
      for (const r of [1, 1.48]) { const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter(); o.type = "square"; o.frequency.value = midi(n) * r;
        f.type = "bandpass"; f.frequency.value = midi(n) * 1.6; f.Q.value = 3; env(g, t, 0.002, 0.03 * v, 0.22); o.connect(f).connect(g).connect(bus); o.start(t); o.stop(t + 0.3); }
    };
    return {
      name: "Night-drive phonk", step: STEP, per: 16,
      play(t, s, barN) {
        if (s === 0 || s === 10 || (s === 7 && barN % 2)) drum(t, 140, 38, 0.32, 0.35);                 // hard kick
        if (s === 8) { hit(t, 1500, 0.9, 0.09, 0.16); hit(t, 3200, 1.4, 0.04, 0.08); }                   // clap
        const roll = barN % 4 === 3 && s >= 12;
        if (roll || s % 2 === 0) hit(t, 9500, 1.5, roll ? 0.012 : 0.015, 0.03, "highpass");              // hats, rolling at the end of a phrase
        if (roll) hit(t + STEP / 2, 9500, 1.5, 0.01, 0.025, "highpass");
        for (const [st, semi, len] of BASS) if (st === s) {
          const f0 = midi(ROOT + semi + (barN % 4 === 2 && st === 8 ? 5 : 0));
          tone("sine", f0, t, len * STEP * 1.1, 0.2, 0.004, 500, 0, st === 14 ? f0 * 0.75 : 0);          // 808, the last note slides down
          tone("triangle", f0 * 2, t, len * STEP * 0.5, 0.03, 0.004, 900);
        }
        for (const [n, st] of BELL) if (st === s && barN % 8 !== 7) bell(n + (barN % 4 === 1 && st > 8 ? -2 : 0), t, 0.8 + Math.random() * 0.3);
        if (s === 0 && barN % 2 === 0) [61, 64, 68].forEach((n) => tone("sawtooth", midi(n), t, STEP * 30, 0.006, 0.5, 700, n % 2 ? 9 : -9));   // dark pad
      }
    };
  })();

  // ── 3. Kerala evening: raga Mohanam over a tanpura drone, veena-like plucks with a little slide,
  //       mridangam-style strokes in Adi talam (4 + 2 + 2) ──
  const KERALA = (() => {
    const BPM = 84, STEP = 60 / BPM / 2;     // eighths
    const SA = 50;                           // D3 as Sa
    const SCALE = [0, 2, 4, 7, 9, 12, 14, 16];
    const PHRASES = [[0, 2, 4, 3, 2, null, 4, 5], [5, null, 4, 3, 4, 2, null, 1], [2, 3, 4, null, 5, 6, 5, 4], [3, null, 2, 1, 0, null, null, 0]];
    let phrase = PHRASES[0];
    const pluck = (n, t, bend) => {
      const o = tone("sawtooth", midi(n), t, 0.9, 0.03, 0.004, 1800, 0, 0, 2);
      if (bend) { o.frequency.setValueAtTime(midi(n - 1), t); o.frequency.exponentialRampToValueAtTime(midi(n), t + 0.12); }
      tone("sine", midi(n + 12), t, 0.5, 0.008, 0.003, 4000);
    };
    const thom = (t) => drum(t, 95, 60, 0.18, 0.45);
    const ta = (t) => { drum(t, 520, 380, 0.05, 0.09); hit(t, 2600, 2, 0.03, 0.05); };
    return {
      name: "Kerala evening", step: STEP, per: 8,
      play(t, s8, barN) {
        if (s8 === 0) {   // tanpura: Pa, Sa', Sa', Sa
          [SA - 12 + 7, SA, SA, SA - 12].forEach((n, i) => tone("sawtooth", midi(n), t + i * STEP * 2, STEP * 9, 0.012, 0.25, 1100, 4));
          phrase = rnd(PHRASES);
        }
        const p = phrase[s8];
        if (p !== null && p !== undefined && barN % 4 !== 3 && Math.random() < 0.9) pluck(SA + 12 + SCALE[p], t, Math.random() < 0.35);
        if (s8 === 0 || s8 === 4 || s8 === 6) thom(t);
        if (s8 === 2 || s8 === 3 || s8 === 5 || s8 === 7) ta(t);
        if (Math.random() < 0.25) ta(t + STEP / 2);
      }
    };
  })();

  // ── 4. Monsoon chai: harmonium chords in D minor, a breathy flute, tabla-style keherwa ──
  const CHAI = (() => {
    const BPM = 90, STEP = 60 / BPM / 2;
    const CH = [[50, 53, 57], [48, 52, 55], [46, 50, 53], [48, 52, 55, 58]];   // Dm · C · Bb · C7
    const MEL = [[74, null, 72, 69, null, 72, 74, null], [77, null, 76, 74, 72, null, 69, null], [69, 72, null, 74, null, 72, 69, 67], [65, null, 67, 69, null, null, 72, null]];
    let mel = MEL[0];
    const harmonium = (notes, t, len) => notes.forEach((n, i) => { tone("sawtooth", midi(n), t, len, 0.009, 0.15, 1300, i % 2 ? 7 : -7); tone("square", midi(n + 12), t, len, 0.003, 0.2, 1600); });
    const flute = (n, t) => {
      const o = tone("sine", midi(n), t, STEP * 1.8, 0.04, 0.05, 3000);
      const lfo = ctx.createOscillator(), lg = ctx.createGain(); lfo.frequency.value = 5.5; lg.gain.value = 6; lfo.connect(lg).connect(o.detune); lfo.start(t); lfo.stop(t + STEP * 2);
      hit(t, 2200, 0.6, 0.006, STEP * 1.2);   // breath
    };
    const ge = (t) => drum(t, 70, 95, 0.16, 0.4);                                    // bayan, bends up
    const na = (t) => { drum(t, 880, 820, 0.05, 0.16); hit(t, 4000, 3, 0.012, 0.04); };
    const tin = (t) => drum(t, 660, 640, 0.03, 0.08);
    return {
      name: "Monsoon chai", step: STEP, per: 8,
      play(t, s8, barN) {
        const c = CH[barN % 4];
        if (s8 === 0) { harmonium(c, t, STEP * 7.5); mel = rnd(MEL); tone("sine", midi(c[0] - 12), t, STEP * 3, 0.08, 0.02, 300); }
        if (s8 === 4) tone("sine", midi(c[0] - 12 + 7), t, STEP * 3, 0.06, 0.02, 300);
        const m = mel[s8]; if (m && barN % 4 !== 3 && Math.random() < 0.85) flute(m, t);
        if (s8 === 0 || s8 === 6) { ge(t); na(t); }   // keherwa: dha ge na ti | na ka dhi na
        if (s8 === 1 || s8 === 4) ge(t);
        if (s8 === 2 || s8 === 5 || s8 === 7) na(t);
        if (s8 === 3) tin(t);
      }
    };
  })();

  const MOODS = [LOFI, PHONK, KERALA, CHAI];

  function startCrackle() {   // warm vinyl texture (lo-fi only)
    const len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.02 + (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.5 : 0);
    const src = ctx.createBufferSource(); src.buffer = b; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2500; f.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.12;
    src.connect(f).connect(g).connect(master); src.start();
    return src;
  }
  function tick() {
    const m = MOODS[current];
    while (nextTime < ctx.currentTime + 0.25) { m.play(nextTime, step % m.per, bar); nextTime += m.step; if (++step % m.per === 0) bar++; }
  }
  // each mood plays into its own bus, so switching cross-fades instead of cutting
  function newBus() {
    const g = ctx.createGain(); g.gain.value = 0.0001; g.connect(master);
    g.gain.exponentialRampToValueAtTime(1, ctx.currentTime + 1.2);
    return g;
  }
  const notify = () => listeners.forEach((f) => { try { f(); } catch (_) {} });

  window.Music = {
    start(audioCtx) {
      if (timer) return;
      ctx = audioCtx;
      if (ctx.state === "suspended") ctx.resume();
      noise = noise || makeNoise();
      master = ctx.createGain();
      master.gain.value = 0.0001;
      const comp = ctx.createDynamicsCompressor(), warm = ctx.createBiquadFilter();
      warm.type = "lowpass"; warm.frequency.value = 5200;
      master.connect(warm).connect(comp).connect(ctx.destination);
      master.gain.exponentialRampToValueAtTime(0.55, ctx.currentTime + 2.5);   // gentle fade-in
      bus = newBus();
      if (MOODS[current].crackle) crackle = startCrackle();
      nextTime = ctx.currentTime + 0.1; step = 0; bar = 0;
      timer = setInterval(tick, 40);
      notify();
    },
    stop() {
      if (!timer) return;
      clearInterval(timer); timer = null;
      const m = master, c = crackle; crackle = null;
      m.gain.cancelScheduledValues(ctx.currentTime);
      m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
      m.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      setTimeout(() => { try { c && c.stop(); m.disconnect(); } catch (_) {} }, 900);
      notify();
    },
    // the soundbar: next mood, cross-fading the old one out
    next() {
      current = (current + 1) % MOODS.length;
      if (timer) {
        const old = bus; old.gain.cancelScheduledValues(ctx.currentTime); old.gain.setValueAtTime(Math.max(old.gain.value, 0.0001), ctx.currentTime);
        old.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.9); setTimeout(() => { try { old.disconnect(); } catch (_) {} }, 1200);
        bus = newBus(); nextTime = ctx.currentTime + 0.12; step = 0; bar = 0;
        if (MOODS[current].crackle && !crackle) crackle = startCrackle();
        if (!MOODS[current].crackle && crackle) { const c = crackle; crackle = null; try { c.stop(ctx.currentTime + 0.6); } catch (_) {} }
      }
      notify();
      return MOODS[current].name;
    },
    get mood() { return MOODS[current].name; },
    get moods() { return MOODS.map((m) => m.name); },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    get playing() { return !!timer; }
  };
})();
