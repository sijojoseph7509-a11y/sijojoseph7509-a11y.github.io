import { createRequire } from "module"; const require = createRequire(process.env.QA_DEPS + "/"); const pp = require("puppeteer-core"); const fs = require("fs");
const [musicJs, outDir, secs = "45"] = process.argv.slice(2);
const b = await pp.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
const p = await b.newPage(); const errs = []; p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); }); p.on("pageerror", (e) => errs.push(e.message));
await p.goto("about:blank"); await p.addScriptTag({ content: fs.readFileSync(musicJs, "utf8") });
for (let i = 0; i < 4; i++) {
  const r = await p.evaluate(async (i, secs) => {
    const SR = 44100, off = new OfflineAudioContext(2, SR * secs, SR), eng = Music._engine(off, off.destination);
    eng.startMood(i, 0.05); eng.schedule(secs);
    const buf = await off.startRendering(), L = buf.getChannelData(0), R = buf.getChannelData(1);
    let peak = 0, clip = 0, sum = 0, dc = 0; const win = SR, wins = [];
    for (let k = 0; k < L.length; k++) { const a = Math.max(Math.abs(L[k]), Math.abs(R[k])); peak = Math.max(peak, a); if (a > 0.995) clip++; sum += L[k] * L[k] + R[k] * R[k]; dc += L[k] + R[k]; }
    for (let w = 0; w + win <= L.length; w += win) { let s = 0; for (let k = w; k < w + win; k++) s += L[k] * L[k]; wins.push(Math.round(10 * Math.log10(s / win + 1e-12))); }
    const db = (x) => (20 * Math.log10(x + 1e-12)).toFixed(1);
    // 16-bit WAV
    const n = L.length, ab = new ArrayBuffer(44 + n * 4), v = new DataView(ab), str = (o, t) => [...t].forEach((c, j) => v.setUint8(o + j, c.charCodeAt(0)));
    str(0, "RIFF"); v.setUint32(4, 36 + n * 4, true); str(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 2, true); v.setUint32(24, SR, true); v.setUint32(28, SR * 4, true); v.setUint16(32, 4, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 4, true);
    for (let k = 0; k < n; k++) { v.setInt16(44 + k * 4, Math.max(-1, Math.min(1, L[k])) * 32767, true); v.setInt16(46 + k * 4, Math.max(-1, Math.min(1, R[k])) * 32767, true); }
    let bin = ""; const u8 = new Uint8Array(ab); for (let k = 0; k < u8.length; k += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(k, k + 0x8000));
    return { name: eng.moods[i], peak: db(peak), rms: db(Math.sqrt(sum / (2 * L.length))), clip, dc: (dc / (2 * L.length)).toFixed(5), perSecond: wins.join(" "), wav: btoa(bin) };
  }, i, +secs);
  const file = `${outDir}/${String(i + 1)}-${r.name.replace(/\W+/g, "-").toLowerCase()}.wav`; fs.writeFileSync(file, Buffer.from(r.wav, "base64"));
  console.log(`${r.name.padEnd(18)} peak ${r.peak} dBFS | RMS ${r.rms} dBFS | clipped samples ${r.clip} | DC ${r.dc}\n   level per second (dB): ${r.perSecond}`);
}
console.log("errors:", errs.length ? errs : 0); await b.close();
