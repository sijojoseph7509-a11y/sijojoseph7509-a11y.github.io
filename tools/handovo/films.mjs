// Films for the Handovo case study (played in place of the stills by case-fx.js, positions in tools/handovo/fx.json from render.mjs).
//   node tools/handovo/films.mjs <demo url> <case url>
//   e.g. node tools/handovo/films.mjs http://127.0.0.1:4394/demo.html http://127.0.0.1:4393/tools/handovo/case.html
// 1. Records the Play the day tour (floor-pilot public/demo.html) in dark mode at 1440x900, the same view as the stills, and cuts one
//    clip per step. The linen-shirt stock is set to 12 so the count step matches the still (8 counted, 12 in system).
// 2. Records the routing diagram with its recording-only motion (case.html?anim), cropped to the diagram, as an 8-second loop.
// Frames come from Chrome's own screencast, each stamped with the wall clock, so cuts land exactly on the clicks.
// Cloud: global puppeteer + ffmpeg. Mac: QA_DEPS=<dir with puppeteer-core> uses Google Chrome.
import { createRequire } from "module"; import fs from "fs"; import os from "os"; import { execFileSync } from "child_process";
const mac = !!process.env.QA_DEPS;
const require = createRequire((mac ? process.env.QA_DEPS : execFileSync("npm", ["root", "-g"]).toString().trim()) + "/");
const puppeteer = require(mac ? "puppeteer-core" : "puppeteer");
const [demo, cas] = process.argv.slice(2), out = "work/handovo/fx", tmp = fs.mkdtempSync(os.tmpdir() + "/hof-");
const fx = JSON.parse(fs.readFileSync("tools/handovo/fx.json", "utf8")); const at = (n) => fx.find((f) => f.name === n);
const b = await puppeteer.launch(mac ? { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" } : { headless: true, args: ["--no-sandbox", "--hide-scrollbars"] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Record a page while act() runs. Frames only arrive when the screen changes, so each one is held until the next.
async function film(p, name, size, act) {
  const frames = [], cdp = await p.createCDPSession();
  cdp.on("Page.screencastFrame", async (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch (_) {} });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: size[0], maxHeight: size[1] });
  await wait(500); const t0 = Date.now() / 1000;
  await act(t0);
  const t1 = Date.now() / 1000; await cdp.send("Page.stopScreencast");
  const dir = `${tmp}/${name}`; fs.mkdirSync(dir); let list = "";
  const fr = frames.sort((a, c) => a.t - c.t), k0 = Math.max(0, fr.findLastIndex((f) => f.t <= t0)), use = fr.slice(k0);   // from the frame on screen at t0
  use.forEach((f, k) => {
    const fn = `${dir}/${String(k).padStart(5, "0")}.jpg`; fs.writeFileSync(fn, Buffer.from(f.data, "base64"));
    const from = Math.max(f.t, t0), to = use[k + 1] ? use[k + 1].t : t1;
    list += `file '${fn}'\nduration ${Math.max(0.001, to - from).toFixed(4)}\n`;
  });
  list += `file '${dir}/${String(use.length - 1).padStart(5, "0")}.jpg'\n`;
  fs.writeFileSync(`${dir}.txt`, list);
  execFileSync("ffmpeg", ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", `${dir}.txt`, "-vf", "fps=25,format=yuv420p", "-c:v", "libx264", "-crf", "12", `${dir}.mp4`]);
  return `${dir}.mp4`;
}
const enc = (src, dst, from, to, vf) => execFileSync("ffmpeg", ["-v", "error", "-y", "-ss", from.toFixed(2), "-to", to.toFixed(2), "-i", src,
  "-vf", `${vf},fps=25`, "-an", "-c:v", "libx264", "-preset", "slow", "-crf", "27", "-pix_fmt", "yuv420p", "-movflags", "+faststart", dst]);

// 1. the tour
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 1 });
await p.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
await p.goto(demo, { waitUntil: "networkidle0", timeout: 60000 });
await p.evaluate(() => localStorage.setItem("floorTourSeen", "1")); await p.reload({ waitUntil: "networkidle0" }); await p.evaluate(() => document.fonts.ready);
await p.evaluate(() => { startTour(); const it = S.stock[S.T.countItem]; let d = Object.values(it.variants).reduce((a, b) => a + b, 0) - 12; for (const v of Object.keys(it.variants)) { const c = Math.min(d, it.variants[v]); it.variants[v] -= c; d -= c; } render(); });
await wait(600);
const HOLD = [3200, 3000, 3600, 3600, 3400, 3600, 3400, 3600, 3400, 3200, 3400, 3600], v = [];   // v[i] = when step i starts in the video
const tourSrc = await film(p, "tour", [1440, 900], async (t0) => {
  for (let i = 0; i < HOLD.length; i++) {
    v.push(Date.now() / 1000 - t0); await wait(HOLD[i]);
    if (i < HOLD.length - 1) {
      const bt = await p.$("#tourNextBtn"); await bt.hover(); await wait(450); await bt.click(); await wait(150);
      if (await p.evaluate((n) => tour === n, i)) await p.evaluate(() => tourNext());   // a click the coach card swallowed
    }
  }
  v.push(Date.now() / 1000 - t0);
});
await p.close();
const CLIPS = { tour: [0, 12], goal: [1, 3], plan: [2, 4], discount: [4, 6], count: [6, 7.3], soldout: [7, 8], urgent: [8, 9], handover: [10, 11], digest: [11, 12] };
const tm = (k) => { const i = Math.floor(k), f = k - i; return v[i] + f * ((v[i + 1] ?? v[i]) - v[i]); };
for (const [name, [a, z]] of Object.entries(CLIPS)) {
  const f = at(name); if (!f) continue;
  const w = f.w > 600 ? 1440 : 1136;   // about 2x the size it shows at
  enc(tourSrc, `${out}/${name}.mp4`, tm(a), tm(z), `scale=${w}:${w * 900 / 1440}:flags=lanczos`);
}

// 2. the routing diagram, an 8-second loop
if (at("routing")) {
  // screencast frames come at 1 device pixel per CSS pixel, so draw the page twice as big for a sharp 2x film
  const q = await b.newPage(); await q.setViewport({ width: 2880, height: 1800, deviceScaleFactor: 1 });
  await q.goto(cas + "?anim", { waitUntil: "networkidle0" }); await q.addStyleTag({ content: "html { zoom: 2 }" }); await q.evaluate(() => document.fonts.ready);
  const box = await q.evaluate(() => { const e = document.querySelector('[data-fx-video="routing"]'); e.scrollIntoView({ block: "center" }); const b = e.getBoundingClientRect(), k = innerWidth / document.documentElement.getBoundingClientRect().width > 1.5 ? 2 : 1;
    return { x: b.left * k / 2, y: b.top * k / 2, w: b.width * k / 2, h: b.height * k / 2 }; });   // in 1440 units
  const pad = 16;   // room for the lifted boxes' shadows; content.js places this film 16 px outside the diagram on every side
  const src = await film(q, "routing", [2880, 1800], () => wait(9000));
  await q.close();
  const fw = +execFileSync("ffprobe", ["-v", "error", "-show_entries", "stream=width", "-of", "csv=p=0", src]).toString(), k = fw / 1440;
  const c = [box.x - pad, box.y - pad, box.w + pad * 2, box.h + pad * 2].map((n) => Math.round(n * k / 2) * 2);   // frame pixels, even sizes
  console.log("routing frame", fw, "crop", c.join(" "));
  enc(src, `${out}/routing.mp4`, 0.5, 8.5, `crop=${c[2]}:${c[3]}:${c[0]}:${c[1]}`);
}
await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log("steps", v.map((x) => x.toFixed(1)).join(" "));
for (const f of fs.readdirSync(out).filter((f) => f.endsWith(".mp4"))) console.log(f, Math.round(fs.statSync(`${out}/${f}`).size / 1024) + " KB");
