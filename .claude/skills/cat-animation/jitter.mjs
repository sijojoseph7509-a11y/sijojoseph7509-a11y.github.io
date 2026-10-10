// frame-to-frame joint rotation (deg) over a full routine at 60 fps; spikes = glitches
import { createRequire } from "module"; const require = createRequire(import.meta.url);
const puppeteer = require(process.env.QA_DEPS + "/node_modules/puppeteer-core");
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
const p = await b.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.evaluateOnNewDocument(() => { let s = 7; Math.random = () => ((s = (s * 16807) % 2147483647) / 2147483647); }); await p.goto("http://localhost:4321/?x=" + Date.now()); await p.waitForFunction(() => window.Desk && Desk.state().started && Desk.state().cat, { timeout: 60000 });
await p.click("#introQuiet");
const r = await p.evaluate(() => {
  const c = Desk.cat, bones = Object.entries(c.bones), prev = new Map(), out = [];
  Desk.catStep(0); Desk.catWander();
  let f = 0, hover = false;
  while (Desk.catStep(1 / 60) && f < 60 * 70) {
    f++;
    if (f % 600 === 300) { Desk.cat.pet(2.6); Desk.cat.meow(); }   // pet her now and then
    let worst = 0, wb = "";
    for (const [n, bn] of bones) { const q = bn.quaternion, p = prev.get(n); if (p) { const a = 2 * Math.acos(Math.min(1, Math.abs(p.dot(q)))) * 57.3; if (a > worst) { worst = a; wb = n; } } prev.set(n, q.clone()); }
    out.push([f / 60, worst, wb]);
  }
  const sorted = out.slice(2).sort((a, b) => b[1] - a[1]);
  const avg = out.reduce((s, x) => s + x[1], 0) / out.length;
  return { frames: f, avg, top: sorted.slice(0, 12).map(([t, a, n]) => `${t.toFixed(2)}s ${a.toFixed(2)}° ${n}`) };
});
console.log(JSON.stringify(r, null, 1), errs.join(" | ") || "no errors"); await b.close();
