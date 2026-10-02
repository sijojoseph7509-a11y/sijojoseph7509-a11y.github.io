// Original generative lo-fi loop, synthesised live with the Web Audio API.
// No samples or recordings are used — every note is generated here, so there are no copyright issues.
(() => {
  const BPM = 76;
  const BEAT = 60 / BPM, BAR = BEAT * 4, STEP = BEAT / 2;   // eighth-note grid
  const SWING = 0.12;                                       // lazy lo-fi swing on off-beats
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

  // Chord loop (MIDI notes): Fmaj7 · Em7 · Dm9 · Cmaj7(add9) — four bars, voiced warm and low
  const CHORDS = [
    { bass: 41, notes: [53, 57, 60, 64] },
    { bass: 40, notes: [52, 55, 59, 62] },
    { bass: 38, notes: [53, 57, 60, 64, 62] },
    { bass: 36, notes: [52, 55, 59, 62] }
  ];
  // Melody motifs (scale degrees in C major, in MIDI), one picked per bar so the loop keeps evolving
  const MOTIFS = [
    [72, null, 69, null, 67, 69, null, null],
    [76, null, 74, 72, null, 69, null, null],
    [69, 72, null, 74, null, null, 72, null],
    [null, 67, 69, null, 72, null, 69, 67],
    [74, null, null, 72, 69, null, 67, null]
  ];

  let ctx = null, master = null, timer = null, nextTime = 0, step = 0, bar = 0, motif = MOTIFS[0], noise = null, crackle = null;

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
  function tone(type, freq, t, dur, peak, attack, cutoff, dest = master, detune = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    o.type = type; o.frequency.value = freq; o.detune.value = detune;
    f.type = "lowpass"; f.frequency.value = cutoff;
    env(g, t, attack, peak, dur);
    o.connect(f).connect(g).connect(dest);
    o.start(t); o.stop(t + attack + dur + 0.05);
  }
  function pad(chord, t) {
    chord.notes.forEach((n, i) => {
      tone("triangle", midi(n), t, BAR * 0.95, 0.022, 0.6, 900, master, (i % 2 ? 6 : -6));
      tone("sine", midi(n + 12), t, BAR * 0.8, 0.008, 0.8, 1400);
    });
  }
  function keys(n, t, vel = 1) {   // soft electric-piano-ish pluck
    tone("sine", midi(n), t, 1.1, 0.05 * vel, 0.006, 2600);
    tone("triangle", midi(n) * 2, t, 0.35, 0.008 * vel, 0.004, 3200);
  }
  function bass(n, t, len) { tone("sine", midi(n), t, len, 0.11, 0.015, 300); }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.18);
    env(g, t, 0.004, 0.22, 0.3);
    o.connect(g).connect(master); o.start(t); o.stop(t + 0.4);
  }
  function hit(t, freq, q, peak, dur, type = "bandpass") {
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    env(g, t, 0.002, peak, dur);
    s.connect(f).connect(g).connect(master);
    s.start(t, Math.random()); s.stop(t + dur + 0.05);
  }
  const snare = (t) => { hit(t, 1800, 0.8, 0.05, 0.18); tone("triangle", 190, t, 0.08, 0.02, 0.002, 800); };
  const hat = (t, open) => hit(t, 8000, 1.2, open ? 0.016 : 0.011, open ? 0.12 : 0.035, "highpass");

  function startCrackle() {   // warm vinyl texture
    const len = ctx.sampleRate * 4, b = ctx.createBuffer(1, len, ctx.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.02 + (Math.random() < 0.0006 ? (Math.random() * 2 - 1) * 0.5 : 0);
    crackle = ctx.createBufferSource(); crackle.buffer = b; crackle.loop = true;
    const f = ctx.createBiquadFilter(); f.type = "bandpass"; f.frequency.value = 2500; f.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0.12;
    crackle.connect(f).connect(g).connect(master); crackle.start();
  }

  function schedule(t) {
    const s = step % 8, chord = CHORDS[bar % CHORDS.length];
    const tt = t + (s % 2 ? SWING * STEP : 0);
    if (s === 0) {
      pad(chord, t);
      motif = MOTIFS[Math.floor(Math.random() * MOTIFS.length)];
      bass(chord.bass, t, BEAT * 1.6);
    }
    if (s === 5) bass(chord.bass + (Math.random() < 0.5 ? 7 : 12), tt, BEAT * 0.9);
    // drums: kick 1 & the "and" of 3, snare 2 & 4, swung hats
    if (s === 0 || (s === 5 && Math.random() < 0.7)) kick(tt);
    if (s === 2 || s === 6) snare(tt);
    if (Math.random() < 0.9) hat(tt, s === 7 && Math.random() < 0.4);
    // melody (skips the occasional bar to breathe) + a soft chord stab
    const n = motif[s];
    if (n && bar % 8 !== 7 && Math.random() < 0.85) keys(n, tt, 0.7 + Math.random() * 0.3);
    if (s === 3 && Math.random() < 0.5) chord.notes.slice(1, 3).forEach((m) => keys(m, tt, 0.35));
    if (++step % 8 === 0) bar++;
  }
  function tick() {
    while (nextTime < ctx.currentTime + 0.25) { schedule(nextTime); nextTime += STEP; }
  }

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
      startCrackle();
      nextTime = ctx.currentTime + 0.1; step = 0; bar = 0;
      timer = setInterval(tick, 40);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer); timer = null;
      const m = master, c = crackle;
      m.gain.cancelScheduledValues(ctx.currentTime);
      m.gain.setValueAtTime(m.gain.value, ctx.currentTime);
      m.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.8);
      setTimeout(() => { try { c.stop(); m.disconnect(); } catch (_) {} }, 900);
    },
    get playing() { return !!timer; }
  };
})();
