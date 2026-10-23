// Original generative music, synthesised live with the Web Audio API (v149 rebuild).
// No samples or recordings: every note and drum is generated here, so there are no copyright issues and nothing to download.
// Four moods from Sijo's own playlist taste (lo-fi, phonk, Malayalam and Hindi songs). The soundbar on the desk switches
// between them; window.Music.mood / .moods expose the current one (the phone and the speaker light show it).
//
// How it sounds good: real chord progressions and ragas, voiced like a player would; instruments built the way the real
// ones make sound (FM electric piano, 808 with saturation, tuned tabla and mridangam, breathy flute with vibrato, tanpura);
// swing and small timing/velocity variations; phrases that answer each other; a 16 to 32-bar arrangement with intros,
// drops and breakdowns; a shared mix (room reverb, tape wobble, glue compression, limiter) and the kick ducking the keys.
// window.Music._engine(ctx, out) builds the same engine on any context (the site-music skill renders it offline to check it).
(() => {
  const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const chance = (p) => Math.random() < p;
  const vary = (v, amt = 0.12) => v * (1 - amt / 2 + Math.random() * amt);

  function createEngine(ctx, out) {
    const SR = ctx.sampleRate, live = typeof OfflineAudioContext === "undefined" || !(ctx instanceof OfflineAudioContext);
    const G = (v = 1) => { const g = ctx.createGain(); g.gain.value = v; return g; };
    const F = (type, freq, q = 0.7) => { const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; return f; };
    const O = (type, freq) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; return o; };
    const noiseBuf = (() => { const b = ctx.createBuffer(1, SR * 2, SR), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b; })();
    const noise = (t, dur, offset = Math.random()) => { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.start(t, offset); s.stop(t + dur); return s; };
    // a gain envelope: silence → peak in `a` → exponential decay to nothing over `d` seconds
    const env = (g, t, a, peak, d) => { g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + a); g.gain.setTargetAtTime(0, t + a, d / 4); };
    const shaper = (drive) => { const w = ctx.createWaveShaper(), n = 1024, c = new Float32Array(n); for (let i = 0; i < n; i++) { const x = i / (n - 1) * 2 - 1; c[i] = Math.tanh(x * drive) / Math.tanh(drive); } w.curve = c; return w; };

    /* ── The mix: every mood plays into fxIn ── */
    const fxIn = G(1), hp = F("highpass", 30), tone = F("lowpass", 9000, 0.3);
    const wow = ctx.createDelay(0.05); wow.delayTime.value = 0.012;   // tape wobble: the delay time drifts a hair
    const wowLfo = O("sine", 0.5), wowAmt = G(0.00028); wowLfo.connect(wowAmt).connect(wow.delayTime); wowLfo.start();
    const glue = ctx.createDynamicsCompressor(); glue.threshold.value = -20; glue.knee.value = 12; glue.ratio.value = 2.5; glue.attack.value = 0.02; glue.release.value = 0.25;
    const limit = ctx.createDynamicsCompressor(); limit.threshold.value = -4; limit.knee.value = 0; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.12;
    const master = G(0.45);   // v159: half the level it was (visitors found it too loud)
    fxIn.connect(hp).connect(tone).connect(wow).connect(glue).connect(limit).connect(master).connect(out);
    // a small, warm room: decaying noise that gets darker as it fades
    const rev = ctx.createConvolver();
    rev.buffer = (() => { const len = Math.floor(SR * 2.4), b = ctx.createBuffer(2, len, SR);
      for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); let lp = 0;
        for (let i = 0; i < len; i++) { const k = i / len; lp += ((Math.random() * 2 - 1) - lp) * (0.5 - 0.42 * k); d[i] = i < SR * 0.014 ? 0 : lp * Math.pow(1 - k, 2.4); } }
      return b; })();
    const revOut = G(0.3); rev.connect(revOut).connect(hp);

    /* ── A mood's bus: instrument groups, reverb sends and the kick ducking ── */
    function makeBus() {
      const bus = G(0), send = G(1), duck = G(1), stops = [];
      bus.connect(fxIn); send.connect(rev); duck.connect(bus);
      const group = (dest, revAmt, extra) => { const g = G(1); let x = g; if (extra) x = x.connect(extra); x.connect(dest); if (revAmt) g.connect(G(revAmt)).connect(send); return g; };
      // electric piano: a little stereo tremolo, like a Rhodes suitcase amp
      const trem = ctx.createStereoPanner(), tl = O("sine", 4.2), tg = G(0.32); tl.connect(tg).connect(trem.pan); tl.start(); stops.push(tl); trem.connect(duck);
      const keys = group(trem, 0.28, F("lowpass", 3800));
      const lead = group(duck, 0.45), pad = group(duck, 0.6), drums = group(bus, 0.1), bass = group(bus, 0), bed = group(bus, 0.15);
      return { bus, send, duck, keys, lead, pad, drums, bass, bed, stops };
    }
    const pump = (B, t, depth = 0.32) => { const g = B.duck.gain; g.setValueAtTime(1, t); g.linearRampToValueAtTime(1 - depth, t + 0.01); g.setTargetAtTime(1, t + 0.03, 0.09); };

    /* ── Instruments ── */
    function ep(B, n, t, dur, vel = 0.8) {   // electric piano: 1:1 FM gives the bark when struck, mellowing as it rings; plus a tine ping
      const f = midi(n), car = O("sine", f), mod = O("sine", f), mg = G(0), g = G(0), tine = O("sine", Math.min(f * 7, 9000)), tg = G(0);
      const idx = f * (0.7 + 1.5 * vel);
      mg.gain.setValueAtTime(idx, t); mg.gain.setTargetAtTime(idx * 0.12, t, 0.3);
      mod.connect(mg).connect(car.frequency);
      const peak = 0.1 * vel * (n > 76 ? 0.7 : 1);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(peak, t + 0.005); g.gain.setTargetAtTime(peak * 0.3, t + 0.005, 0.35); g.gain.setTargetAtTime(0, t + dur, 0.15);
      env(tg, t, 0.002, 0.018 * vel, 0.07);
      car.connect(g).connect(B.keys); tine.connect(tg).connect(B.keys);
      const end = t + dur + 1; car.start(t); mod.start(t); car.stop(end); mod.stop(end); tine.start(t); tine.stop(t + 0.15);
    }
    function bell(B, n, t, vel = 0.7, decay = 1.6) {   // glockenspiel-like: inharmonic partials of a struck bar
      const f = midi(n);
      [[1, 1], [2.76, 0.32], [5.4, 0.1]].forEach(([r, a]) => { const o = O("sine", f * r), g = G(0); env(g, t, 0.002, 0.05 * vel * a, decay / r); o.connect(g).connect(B.lead); o.start(t); o.stop(t + decay * 1.5); });
    }
    function pad(B, notes, t, dur, lvl = 0.022, cutoff = 1100) {   // warm pad: two detuned saws per note, slow swell
      notes.forEach((n) => { const f = F("lowpass", cutoff, 0.5), g = G(0);
        g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + Math.min(0.8, dur * 0.4)); g.gain.setTargetAtTime(0, t + dur, 0.35);
        [-7, 7].forEach((det) => { const o = O("sawtooth", midi(n)); o.detune.value = det + (Math.random() * 4 - 2); o.connect(f); o.start(t); o.stop(t + dur + 1.6); });
        f.connect(g).connect(B.pad); });
    }
    function bass(B, n, t, dur, vel = 0.8) {   // round finger bass: sine with a little triangle bite
      const f = midi(n), o = O("sine", f), o2 = O("triangle", f), g2 = G(0.25), lp = F("lowpass", 700), g = G(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.32 * vel, t + 0.01); g.gain.setTargetAtTime(0.22 * vel, t + 0.01, 0.2); g.gain.setTargetAtTime(0, t + dur, 0.05);
      o.connect(g); o2.connect(g2).connect(g); g.connect(lp).connect(B.bass);
      [o, o2].forEach((x) => { x.start(t); x.stop(t + dur + 0.4); });
    }
    function b808(B, n, t, dur, glideTo = 0, vel = 0.9) {   // 808: a pitched-down punch, a long sine tail, saturated so it reads on laptop speakers
      const f = midi(n), o = O("sine", f * 2), sh = shaper(2.2), lp = F("lowpass", 1600), g = G(0);
      o.frequency.setValueAtTime(f * 2, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.03);
      if (glideTo) o.frequency.exponentialRampToValueAtTime(midi(glideTo), t + dur * 0.9);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.42 * vel, t + 0.004); g.gain.setTargetAtTime(0.26 * vel, t + 0.004, 0.25); g.gain.setTargetAtTime(0, t + dur, 0.06);
      o.connect(g).connect(sh).connect(lp).connect(B.bass); o.start(t); o.stop(t + dur + 0.5);
    }
    function kick(B, t, vel = 0.9, duck = 0.32) {
      const o = O("sine", 150), g = G(0), c = F("highpass", 3500), cg = G(0);
      o.frequency.setValueAtTime(155, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.12);
      env(g, t, 0.002, 0.95 * vel, 0.38); env(cg, t, 0.001, 0.12 * vel, 0.012);
      o.connect(g).connect(B.drums); noise(t, 0.03).connect(c).connect(cg).connect(B.drums);
      o.start(t); o.stop(t + 0.5); if (duck) pump(B, t, duck);
    }
    function snare(B, t, vel = 0.8, bright = 1) {   // brushed boom-bap snare: noise crack + a short tuned body
      const bp = F("bandpass", 1800 * bright, 0.7), g = G(0), body = O("triangle", 185), bg = G(0);
      body.frequency.setValueAtTime(190, t); body.frequency.exponentialRampToValueAtTime(150, t + 0.08);
      env(g, t, 0.002, 0.34 * vel, 0.2); env(bg, t, 0.002, 0.2 * vel, 0.1);
      noise(t, 0.35).connect(bp).connect(g).connect(B.drums); body.connect(bg).connect(B.drums); body.start(t); body.stop(t + 0.2);
    }
    function rim(B, t, vel = 0.6) { const o = O("square", 820), bp = F("bandpass", 1700, 3), g = G(0); env(g, t, 0.001, 0.12 * vel, 0.03); o.connect(bp).connect(g).connect(B.drums); o.start(t); o.stop(t + 0.08); }
    function hat(B, t, vel = 0.5, open = false) {
      const hpf = F("highpass", 7200), g = G(0); env(g, t, 0.001, 0.13 * vel, open ? 0.32 : 0.04);
      noise(t, open ? 0.6 : 0.1).connect(hpf).connect(g).connect(B.drums);
    }
    function clap(B, t, vel = 0.9) {   // three quick bursts then a tail, like hands
      const bp = F("bandpass", 1350, 1.1), g = G(0);
      g.gain.setValueAtTime(0, t); [0, 0.011, 0.022].forEach((d) => { g.gain.setValueAtTime(0.42 * vel, t + d); g.gain.setTargetAtTime(0.05, t + d + 0.001, 0.003); });
      g.gain.setValueAtTime(0.3 * vel, t + 0.03); g.gain.setTargetAtTime(0, t + 0.03, 0.05);
      noise(t, 0.4).connect(bp).connect(g).connect(B.drums);
    }
    function cowbell(B, n, t, vel = 0.8) {   // the 808 cowbell: two square waves a fifth-and-a-bit apart through a bandpass
      const f = midi(n), bp = F("bandpass", Math.max(1400, f * 1.6), 1.2), g = G(0);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.16 * vel, t + 0.001); g.gain.setTargetAtTime(0.05 * vel, t + 0.001, 0.02); g.gain.setTargetAtTime(0, t + 0.04, 0.08);
      [1, 1.482].forEach((r) => { const o = O("square", f * r); o.connect(bp); o.start(t); o.stop(t + 0.5); });
      bp.connect(g).connect(B.lead);
    }
    function flute(B, n, t, dur, prev = 0, vel = 0.8) {   // bansuri: soft tone, breath, vibrato that blooms on long notes, glides between notes
      const f = midi(n), o = O("sine", f), o2 = O("triangle", f), g2 = G(0.12), lp = F("lowpass", 2600), g = G(0);
      if (prev) { o.frequency.setValueAtTime(midi(prev), t); o.frequency.exponentialRampToValueAtTime(f, t + 0.08); o2.frequency.setValueAtTime(midi(prev), t); o2.frequency.exponentialRampToValueAtTime(f, t + 0.08); }
      const vib = O("sine", 5.2), vg = G(0); vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(dur > 0.4 ? 14 : 4, t + Math.min(0.6, dur)); vib.connect(vg); vg.connect(o.detune); vg.connect(o2.detune);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.07 * vel, t + 0.07); g.gain.setTargetAtTime(0.055 * vel, t + 0.07, 0.3); g.gain.setTargetAtTime(0, t + dur, 0.08);
      const br = F("bandpass", f * 2, 1.5), bg = G(0); env(bg, t, 0.03, 0.012 * vel, 0.25); noise(t, dur + 0.3).connect(br).connect(bg).connect(B.lead);
      o.connect(lp); o2.connect(g2).connect(lp); lp.connect(g).connect(B.lead);
      const end = t + dur + 0.5; [o, o2, vib].forEach((x) => { x.start(t); x.stop(end); });
    }
    function harmonium(B, notes, t, dur, lvl = 0.03) {   // reeds: saw + square through a soft filter, the bellows breathing slowly
      const lp = F("lowpass", 1500, 0.6), g = G(0), bel = O("sine", 2.6), bg = G(lvl * 0.12);
      g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(lvl, t + 0.1); g.gain.setTargetAtTime(0, t + dur, 0.12);
      bel.connect(bg).connect(g.gain); bel.start(t); bel.stop(t + dur + 0.8);
      notes.forEach((n) => { const a = O("sawtooth", midi(n)), b = O("square", midi(n) * 1.003), bgn = G(0.45); a.connect(lp); b.connect(bgn).connect(lp); [a, b].forEach((x) => { x.start(t); x.stop(t + dur + 0.8); }); });
      lp.connect(g).connect(B.pad);
    }
    function tanpura(B, n, t, lvl = 0.03) {   // a plucked drone string with the buzzing jawari shimmer
      const f = midi(n), o = O("sawtooth", f), bp = F("bandpass", 1200, 3), lp = F("lowpass", 2400), g = G(0);
      bp.frequency.setValueAtTime(900, t); bp.frequency.exponentialRampToValueAtTime(2600, t + 2.2);
      env(g, t, 0.02, lvl, 3.4); o.connect(bp).connect(lp).connect(g).connect(B.pad); o.start(t); o.stop(t + 4);
    }
    // tuned drums: tabla (dayan rings, bayan bends up), mridangam
    function membrane(B, f, t, dur, lvl, partials = [[1, 1]], bend = 1) {
      partials.forEach(([r, a]) => { const o = O("sine", f * r), g = G(0); o.frequency.setValueAtTime(f * r, t); o.frequency.exponentialRampToValueAtTime(f * r * bend, t + dur * 0.6); env(g, t, 0.002, lvl * a, dur / r); o.connect(g).connect(B.drums); o.start(t); o.stop(t + dur * 1.5); });
      const c = F("bandpass", 3000, 1), cg = G(0); env(cg, t, 0.001, lvl * 0.25, 0.012); noise(t, 0.03).connect(c).connect(cg).connect(B.drums);
    }
    const tabla = {
      na: (B, t, v = 0.8) => membrane(B, 392, t, 0.45, 0.14 * v, [[1, 1], [2, 0.45], [3, 0.2]], 0.985),
      tin: (B, t, v = 0.6) => membrane(B, 392, t, 0.09, 0.1 * v, [[1, 1], [2, 0.3]]),
      ge: (B, t, v = 0.8) => membrane(B, 82, t, 0.55, 0.3 * v, [[1, 1]], 1.35),
      ka: (B, t, v = 0.6) => membrane(B, 150, t, 0.05, 0.14 * v, [[1, 1]]),
    };
    const mridangam = {
      tham: (B, t, v = 0.8) => membrane(B, 104, t, 0.7, 0.3 * v, [[1, 1], [2, 0.2]], 0.97),
      nam: (B, t, v = 0.7) => membrane(B, 440, t, 0.38, 0.11 * v, [[1, 1], [2, 0.5], [3, 0.3]], 0.99),
      dhi: (B, t, v = 0.7) => membrane(B, 293, t, 0.3, 0.12 * v, [[1, 1], [2, 0.35]], 0.98),
      ki: (B, t, v = 0.5) => membrane(B, 520, t, 0.06, 0.08 * v),
    };
    function templeBell(B, t) { [[1, 1], [2.01, 0.5], [2.76, 0.35], [4.07, 0.18], [5.4, 0.1]].forEach(([r, a]) => { const o = O("sine", 587 * r), g = G(0); env(g, t, 0.003, 0.03 * a, 5 / Math.sqrt(r)); o.connect(g).connect(B.bed); o.start(t); o.stop(t + 7); }); }
    function cricket(B, t) {   // a burst of quick chirps, somewhere to the side
      const o = O("sine", 4300 + Math.random() * 500), g = G(0), p = ctx.createStereoPanner(); p.pan.value = Math.random() * 1.6 - 0.8;
      const k = 5 + Math.floor(Math.random() * 6); for (let i = 0; i < k; i++) { g.gain.setValueAtTime(0.006, t + i * 0.034); g.gain.setValueAtTime(0, t + i * 0.034 + 0.016); }
      o.connect(g).connect(p).connect(B.bed); o.start(t); o.stop(t + k * 0.034 + 0.05);
    }
    function drop(B, t) { const o = O("sine", 1800 + Math.random() * 2600), g = G(0), p = ctx.createStereoPanner(); p.pan.value = Math.random() * 2 - 1; o.frequency.exponentialRampToValueAtTime(o.frequency.value * 0.6, t + 0.02); env(g, t, 0.001, 0.008, 0.025); o.connect(g).connect(p).connect(B.bed); o.start(t); o.stop(t + 0.06); }
    function thunder(B, t) { const lp = F("lowpass", 140), g = G(0); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.35, t + 1.4); g.gain.setTargetAtTime(0, t + 1.6, 1.2); noise(t, 7).connect(lp).connect(g).connect(B.bed); }
    // looping beds that sit under a whole mood
    function vinylBed(B) {
      const len = SR * 4, b = ctx.createBuffer(1, len, SR), d = b.getChannelData(0); let lp = 0;
      for (let i = 0; i < len; i++) { lp += ((Math.random() * 2 - 1) - lp) * 0.08; d[i] = lp * 0.25 + (Math.random() < 0.0005 ? (Math.random() * 2 - 1) * 0.6 : 0); }
      const s = ctx.createBufferSource(); s.buffer = b; s.loop = true; s.connect(F("bandpass", 2400, 0.5)).connect(G(0.07)).connect(B.bed); s.start(); return s;
    }
    function rainBed(B) { const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true; s.connect(F("highpass", 500)).connect(F("lowpass", 3800, 0.4)).connect(G(0.045)).connect(B.bed); s.start(); return s; }

    /* ── Melody: two-bar phrases that move mostly by step, land on chord tones, and get answered ── */
    const RHYTHMS = [[0, 3, 6, 10, 12], [0, 4, 7, 10], [2, 4, 8, 11, 14], [0, 6, 8, 12, 14], [0, 2, 4, 10], [0, 3, 8, 12], [4, 6, 10, 12, 15]];
    function phrase(pools, density = 0.8) {   // pools: the notes allowed in each of the two bars
      const ev = []; let i = Math.floor(pools[0].length / 2);
      for (let b = 0; b < 2; b++) {
        const pool = pools[b], r = pick(RHYTHMS).filter((s, k) => k === 0 || chance(density));
        r.forEach((s) => { i = Math.max(0, Math.min(pool.length - 1, i + pick([-2, -1, -1, 0, 1, 1, 2]))); ev.push({ s: b * 16 + s, n: pool[i], i, pool }); });
      }
      ev.forEach((e, k) => { const nx = ev[k + 1] ? ev[k + 1].s : 32; e.d = Math.max(1, Math.min(8, nx - e.s)); });
      return ev;
    }
    // the answer: same shape, but the last note steps down to a lower note of the same chord, so it resolves in key
    const answer = (p) => p.map((e, k) => (k === p.length - 1 ? { ...e, n: e.pool[Math.max(0, e.i - pick([1, 2]))] } : e));

    /* ── The moods ── */
    const LOFI = {   // 78 BPM, ii–V–I–VI in C with rootless jazz voicings, boom-bap drums, Rhodes, a glockenspiel melody, vinyl
      name: "Desk lo-fi", bpm: 78, swing: 0.17, level: 0.5,
      chords: [{ r: 38, v: [53, 57, 60, 64], m: [69, 72, 74, 76, 77, 81] },   // Dm9
               { r: 43, v: [53, 59, 64, 69], m: [67, 71, 74, 76, 77, 79] },   // G13
               { r: 36, v: [52, 55, 59, 62], m: [67, 71, 72, 74, 76, 79] },   // Cmaj9
               { r: 33, v: [55, 61, 65, 70], m: [69, 70, 73, 76, 77, 79] }],  // A7(b9 b13)
      init(B, S) { S.beds = [vinylBed(B)]; },
      step(B, s, bar, t, sp, S) {
        const c = this.chords[bar % 4], sec = bar % 32, full = sec >= 4 && sec < 28, brk = sec >= 28;
        if (s === 0 && bar % 8 === 0) { const a = phrase([this.chords[0].m, this.chords[1].m], 0.75), b = phrase([this.chords[2].m, this.chords[3].m], 0.7); S.mel = [a, b, answer(a), answer(b)]; }
        // keys: the chord on one, a light push on the and-of-two, the chord again late in the bar
        if (s === 0) c.v.forEach((n) => ep(B, n, t + Math.random() * 0.012, sp * 7, vary(0.72)));
        if (s === 6 && chance(0.6)) c.v.slice(2).forEach((n) => ep(B, n, t, sp * 2, vary(0.42)));
        if (s === 10 && (sec < 4 || chance(0.75))) c.v.forEach((n) => ep(B, n, t + Math.random() * 0.01, sp * 4, vary(0.5)));
        if (sec >= 2) { if (s % 2 === 0) hat(B, t, s % 4 === 0 ? 0.55 : 0.36); else if (chance(0.25)) hat(B, t, 0.18); if (s === 14 && bar % 2 === 1) hat(B, t, 0.3, true); }
        if (full || brk) { if (s === 0) bass(B, c.r, t, sp * 6); if (s === 7 && chance(0.5)) bass(B, c.r, t, sp * 2, 0.6); if (s === 10) bass(B, c.r + 7, t, sp * 3, 0.7); if (s === 14 && chance(0.6)) bass(B, this.chords[(bar + 1) % 4].r + pick([-1, 2]), t, sp * 2, 0.6); }
        if (full) {
          if (s === 0 || s === 10 || (s === 7 && chance(0.4)) || (s === 15 && chance(0.15))) kick(B, t, s === 0 ? 0.95 : 0.75);
          if (s === 4 || s === 12) snare(B, t + 0.012, vary(0.8)); else if ((s === 15 || s === 9) && chance(0.15)) snare(B, t, 0.22);
          if (sec === 27 && s >= 12) snare(B, t, 0.3 + (s - 12) * 0.12);   // a little fill into the breakdown
        } else if (brk && (s === 4 || s === 12)) rim(B, t);
        if (sec >= 8 && sec < 28 && S.mel) { const p = S.mel[Math.floor((bar % 8) / 2)], ps = (bar % 2) * 16 + s; p.forEach((e) => { if (e.s === ps && chance(0.9)) bell(B, e.n, t, vary(0.75), 1.4); }); }
      }
    };
    const PHONK = {   // 140 BPM half-time, C# Phrygian: 808 cowbell riff, sliding saturated 808, clap on three, rolling hats
      name: "Night-drive phonk", bpm: 140, swing: 0, level: 0.15,
      bell: [[[0, 73], [3, 73], [6, 76], [8, 74], [10, 73], [12, 68], [14, 73]], [[0, 73], [3, 73], [6, 76], [8, 78], [10, 80], [12, 78], [14, 76]],
             [[0, 73], [3, 73], [6, 76], [8, 74], [10, 73], [12, 68], [14, 73]], [[0, 73], [3, 76], [6, 78], [8, 76], [10, 74], [12, 73], [14, 69]]],
      b808: [[[0, 37, 5], [6, 37, 2], [8, 37, 4, 35], [12, 37, 4]], [[0, 33, 6], [8, 35, 4], [12, 37, 4, 49]]],
      pads: [[61, 64, 68], [57, 61, 64], [59, 63, 66], [56, 60, 63]],
      init() {},
      step(B, s, bar, t, sp) {
        const sec = bar % 16, intro = sec < 2, gap = (sec === 7 || sec === 15) && s >= 12;
        if (s === 0 && bar % 2 === 0) pad(B, this.pads[(bar / 2) % 4], t, sp * 32, 0.014, 900);
        this.bell[bar % 4].forEach(([st, n]) => { if (st === s) cowbell(B, n, t, st === 0 ? 0.95 : 0.75); });
        if (intro || gap) return;
        this.b808[bar % 2].forEach(([st, n, len, g]) => { if (st === s) b808(B, n, t, sp * len, g || 0); });
        if ((bar % 2 === 0 && (s === 0 || s === 6)) || (bar % 2 === 1 && (s === 0 || s === 8 || s === 11))) kick(B, t, 0.9, 0.45);
        if (s === 8) { clap(B, t); snare(B, t, 0.5, 1.4); }
        const roll = bar % 2 === 1 && s >= 12;
        if (roll) { hat(B, t, 0.42); hat(B, t + sp / 2, 0.32); if (s === 15) hat(B, t + sp * 0.75, 0.28); }
        else hat(B, t, s % 4 === 0 ? 0.5 : s % 2 === 0 ? 0.38 : 0.24, s === 14 && bar % 4 === 3);
      }
    };
    const KERALA = {   // 72 BPM, raga Mohanam on D (D E F# A B): tanpura, bansuri, mridangam, soft strings, crickets, a far temple bell
      name: "Kerala evening", bpm: 72, swing: 0, level: 1.9,
      chords: [[62, 66, 69, 76], [59, 62, 66, 69], [55, 59, 62, 66], [57, 62, 64, 69]],
      scale: [62, 64, 66, 69, 71, 74, 76, 78, 81],
      init() {},
      step(B, s, bar, t, sp, S) {
        const sec = bar % 16;
        if (s % 4 === 0) tanpura(B, [57, 62, 62, 50][s / 4], t, 0.026);
        if (s === 0 && bar % 2 === 0) pad(B, this.chords[(bar / 2) % 4], t, sp * 32, 0.012, 1400);
        if (s % 4 === 2 && chance(0.35)) cricket(B, t);
        if (s === 0 && bar % 8 === 4) templeBell(B, t);
        if (s === 0 && bar % 4 === 0) { const a = phrase([this.scale, this.scale], 0.55); S.mel = [a, answer(a)]; S.prev = 0; }
        if (sec >= 4 && S.mel) {
          const p = S.mel[Math.floor((bar % 4) / 2)], ps = (bar % 2) * 16 + s;
          p.forEach((e) => { if (e.s === ps && chance(0.85)) { flute(B, e.n, t, sp * Math.max(2, e.d) * 1.1, chance(0.5) ? S.prev : 0, vary(0.8)); S.prev = e.n; } });
        }
        if (sec >= 4 && !(sec >= 12 && sec < 14)) {   // eight-beat cycle on the mridangam
          if (s === 0) mridangam.tham(B, t); if (s === 4 || s === 10) mridangam.nam(B, t); if (s === 6 || s === 12) mridangam.dhi(B, t);
          if (s === 8) mridangam.tham(B, t, 0.55); if (s === 14 || (s === 2 && chance(0.5)) || (s === 13 && chance(0.4))) mridangam.ki(B, t);
        }
      }
    };
    const CHAI = {   // 84 BPM, G minor (Kafi colour): harmonium, bansuri, tabla in keherwa, a soft kick and bass, monsoon rain
      name: "Monsoon chai", bpm: 84, swing: 0.14, level: 0.5,
      chords: [{ r: 43, v: [58, 62, 65, 69], m: [67, 70, 72, 74, 77, 79] },   // Gm9
               { r: 39, v: [55, 58, 62, 63], m: [67, 70, 74, 75, 79] },       // Ebmaj7
               { r: 36, v: [51, 55, 58, 62], m: [67, 70, 72, 74, 75, 79] },   // Cm9
               { r: 38, v: [54, 57, 60, 63], m: [66, 69, 72, 74, 75, 78] }],  // D7(b9)
      init(B, S) { S.beds = [rainBed(B)]; },
      step(B, s, bar, t, sp, S) {
        const c = this.chords[bar % 4], sec = bar % 16;
        if (s === 0) harmonium(B, c.v, t, sp * 15.5, 0.026);
        if (chance(0.22)) drop(B, t + Math.random() * sp);
        if (s === 0 && bar % 32 === 20 && chance(0.7)) thunder(B, t);
        if (s === 0 && bar % 8 === 0) { const a = phrase([this.chords[0].m, this.chords[1].m], 0.7), b = phrase([this.chords[2].m, this.chords[3].m], 0.65); S.mel = [a, b, answer(a), answer(b)]; S.prev = 0; }
        if (sec >= 8 && S.mel) { const p = S.mel[Math.floor((bar % 8) / 2)], ps = (bar % 2) * 16 + s; p.forEach((e) => { if (e.s === ps && chance(0.85)) { flute(B, e.n, t, sp * Math.max(2, e.d), chance(0.4) ? S.prev : 0, vary(0.75)); S.prev = e.n; } }); }
        if (sec < 4) return;
        if (s === 0) bass(B, c.r, t, sp * 7, 0.75); if (s === 10) bass(B, c.r + 7, t, sp * 4, 0.6);
        if (s === 0 || s === 10) kick(B, t, 0.6, 0.18);
        // keherwa: dha ge na ti | na ka dhi na
        if (s === 0 || s === 12) { tabla.na(B, t); tabla.ge(B, t, s === 0 ? 0.9 : 0.6); }
        if (s === 2) tabla.ge(B, t, 0.7); if (s === 4 || s === 8 || s === 14) tabla.na(B, t, 0.7); if (s === 6) tabla.tin(B, t); if (s === 10) tabla.ka(B, t);
        if (s % 2 === 1 && chance(0.18)) tabla.tin(B, t, 0.35);
      }
    };
    const MOODS = [LOFI, PHONK, KERALA, CHAI];

    /* ── Playing: one mood at a time; switching cross-fades ── */
    let cur = null;
    function startMood(i, at) {
      const m = MOODS[i], B = makeBus(), S = {};
      B.bus.gain.setValueAtTime(0, at); B.bus.gain.linearRampToValueAtTime(m.level || 1, at + 1.8);   // each mood's level keeps all four equally loud
      m.init(B, S);
      cur = { m, B, S, step: 0, bar: 0, next: at };
      return cur;
    }
    function endMood(c, at) {
      if (!c) return;
      c.B.bus.gain.cancelScheduledValues(at); c.B.bus.gain.setValueAtTime(c.B.bus.gain.value, at); c.B.bus.gain.setTargetAtTime(0, at, 0.3);
      c.B.send.gain.setTargetAtTime(0, at, 0.3);
      [...c.B.stops, ...(c.S.beds || [])].forEach((x) => { try { x.stop(at + 2.5); } catch (_) {} });
      if (live) setTimeout(() => { try { c.B.bus.disconnect(); c.B.send.disconnect(); } catch (_) {} }, (at - ctx.currentTime + 3) * 1000);
      if (cur === c) cur = null;
    }
    function schedule(until) {
      const c = cur; if (!c) return;
      const sp = 60 / c.m.bpm / 4;
      while (c.next < until) {
        const s = c.step % 16, t = c.next + (s % 2 ? c.m.swing * sp : 0);
        try { c.m.step(c.B, s, c.bar, t, sp, c.S); } catch (e) { if (!c.err) { c.err = 1; console.error("Music:", e); } }
        c.next += sp; if (++c.step % 16 === 0) c.bar++;
      }
    }
    return { startMood, endMood, schedule, master, moods: MOODS.map((m) => m.name), get current() { return cur; } };
  }

  /* ── window.Music: the same API the desk and the phone use ── */
  let ctx = null, eng = null, timer = null, current = 0, duck = 1;
  const VOL = 0.45;   // v159: base level; duck() lowers it while someone reads in the Mac
  const listeners = new Set();
  const notify = () => listeners.forEach((f) => { try { f(); } catch (_) {} });
  const tick = () => { if (eng) eng.schedule(ctx.currentTime + (document.hidden ? 1.5 : 0.2)); };   // background tabs tick rarely: look further ahead
  window.Music = {
    start(audioCtx) {
      if (timer) return;
      if (ctx !== audioCtx) { ctx = audioCtx; eng = createEngine(ctx, ctx.destination); }
      if (ctx.state === "suspended") ctx.resume();
      eng.master.gain.cancelScheduledValues(ctx.currentTime); eng.master.gain.setValueAtTime(VOL * duck, ctx.currentTime);
      eng.startMood(current, ctx.currentTime + 0.1);
      timer = setInterval(tick, 25); tick();
      notify();
    },
    stop() {
      if (!timer) return;
      clearInterval(timer); timer = null;
      eng.endMood(eng.current, ctx.currentTime);
      notify();
    },
    next() {   // the soundbar: the next mood, cross-fading the old one out
      current = (current + 1) % 4;
      if (timer) { eng.endMood(eng.current, ctx.currentTime); eng.startMood(current, ctx.currentTime + 0.15); tick(); }
      notify();
      return this.mood;
    },
    get mood() { return ["Desk lo-fi", "Night-drive phonk", "Kerala evening", "Monsoon chai"][current]; },
    get moods() { return ["Desk lo-fi", "Night-drive phonk", "Kerala evening", "Monsoon chai"]; },
    onChange(f) { listeners.add(f); return () => listeners.delete(f); },
    get playing() { return !!timer; },
    // v159: fade the music to a fraction of its level (1 = full) over about a second, e.g. while a case study is open
    duck(level) {
      duck = Math.max(0, Math.min(1, level));
      if (eng && ctx) { const g = eng.master.gain, t = ctx.currentTime; g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.setTargetAtTime(VOL * duck, t, 0.35); }
    },
    _engine: createEngine
  };
})();
