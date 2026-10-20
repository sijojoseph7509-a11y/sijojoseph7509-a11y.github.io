// The unboxing film for the Ekmaati case study (work/ekmaati/fx/film-unbox.mp4 + poster film-unbox.webp), recorded from
// the 3D box in ekmaati-fx.js itself: closed sleeve, "Peel the next tab" three times, the temple and idol revealed.
// The page runs on a stepped clock (performance.now and requestAnimationFrame are replaced), so every frame is rendered
// in full however slow the machine is, and the film plays smoothly at 30 fps.
//   node tools/ekmaati/film.mjs http://127.0.0.1:4393/        (QA_DEPS=<puppeteer-core dir> on the Mac uses Google Chrome)
import { createRequire } from "module"; import fs from "fs"; import os from "os"; import { execFileSync } from "child_process";
const mac = !!process.env.QA_DEPS;
const require = createRequire((mac ? process.env.QA_DEPS : execFileSync("npm", ["root", "-g"]).toString().trim()) + "/");
const puppeteer = require(mac ? "puppeteer-core" : "puppeteer");
const base = process.argv[2] || "http://127.0.0.1:4393/", out = "work/ekmaati/fx", tmp = fs.mkdtempSync(os.tmpdir() + "/ekf-");
const FPS = 30, STEP = 1000 / FPS * 1.35;   // each film frame moves the box on by 1.35 frames: brisk, not hurried
const b = await puppeteer.launch(mac ? { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" } : { headless: true, args: ["--no-sandbox", "--use-angle=swiftshader", "--enable-unsafe-swiftshader"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
p.on("pageerror", (e) => console.error("page:", e.message)); p.on("console", (m) => m.type() === "error" && console.error("console:", m.text()));
await p.evaluateOnNewDocument(() => {
  let T = 0; const q = [];
  performance.now = () => T;
  window.requestAnimationFrame = (cb) => { q.push(cb); return q.length; }; window.cancelAnimationFrame = () => {};
  window.__step = (ms) => { T += ms; q.splice(0).forEach((cb) => cb(T)); };
  matchMedia = ((m) => (s) => (/reduced-motion/.test(s) ? { matches: false, addEventListener() {}, removeEventListener() {} } : m(s)))(matchMedia.bind(window));
});
// the case study's own page frame: the Ekmaati sections, then ekmaati-fx.js adds the 3D box after the cover
const map = fs.readFileSync("index.html", "utf8").match(/<script type="importmap">[\s\S]*?<\/script>/)[0];
const page = "film-tmp.html";   // a page of its own (written next to index.html, removed after), so no other page's CSP applies
fs.writeFileSync(page, `<!doctype html><html><head><meta charset="utf-8">${map}<style>body{margin:0;width:1440px;background:#F2EFE6}.case img{display:block;width:100%;height:auto}.ekx-tip,.ekx-copy{visibility:hidden}</style></head><body><div class="case"></div>
<script src="content.js"></script><script type="module">
import fx from "./ekmaati-fx.js";
const pr = window.SITE.projects.find((x) => x.case && x.case.slug === "ekmaati"), box = document.querySelector(".case");
box.innerHTML = pr.case.sections.map(([f, h]) => '<img src="work/ekmaati/' + f + '" width="1440" height="' + h + '">').join("");
fx(box, { slug: "ekmaati", v: "film", sections: pr.case.sections, opts: {} }); window.ready = true;
</script></body></html>`);
try { await p.goto(base + page, { waitUntil: "networkidle0" }); } finally { fs.rmSync(page, { force: true }); }
await p.waitForFunction("window.ready", { polling: 200, timeout: 60000 });   // timed polling: requestAnimationFrame is stepped by hand
await p.evaluate(() => document.querySelector(".ekx-stage").scrollIntoView({ block: "center" }));
await new Promise((r) => setTimeout(r, 4000));   // textures and the idol photo load on the real clock
for (let i = 0; i < 10; i++) await p.evaluate(() => window.__step(16));
const cv = await p.$(".ekx-stage canvas");
let n = 0; const frame = async () => { await cv.screenshot({ path: `${tmp}/${String(n++).padStart(4, "0")}.png` }); };
const run = async (frames, each) => { for (let i = 0; i < frames; i++) { await p.evaluate((ms) => window.__step(ms), STEP); if (each) await each(i); await frame(); } };
const peeled = () => p.evaluate(() => +document.querySelector(".ekx-count span").textContent);
await run(14);                                                   // the closed box
for (let k = 1; k <= 3; k++) {
  await p.evaluate(() => document.querySelector(".ekx-next").click());
  let guard = 0; while ((await peeled()) < k && guard++ < 200) await run(1);
  await run(k < 3 ? 6 : 0);
}
let guard = 0; while (guard++ < 200 && !(await p.evaluate(() => { const c = document.querySelector(".ekx-peel"); return c.classList.contains("ekx-open"); }))) await run(1);
await run(46);                                                   // the last tab falls away and the box turns to face the idol
await b.close();
const W = 1200, H = 900;   // 4:3, cropped to the box
execFileSync("ffmpeg", ["-v", "error", "-y", "-framerate", String(FPS), "-i", `${tmp}/%04d.png`,
  "-vf", `crop=iw:iw*3/4:0:(ih-iw*3/4)/2,scale=${W}:${H}:flags=lanczos,format=yuv420p`, "-c:v", "libx264", "-preset", "slow", "-crf", "24", "-movflags", "+faststart", `${out}/film-unbox.mp4`]);
execFileSync("ffmpeg", ["-v", "error", "-y", "-i", `${tmp}/0000.png`, "-vf", `crop=iw:iw*3/4:0:(ih-iw*3/4)/2,scale=${W}:${H}:flags=lanczos`, "-frames:v", "1", "-quality", "85", `${out}/film-unbox.webp`]);
fs.rmSync(tmp, { recursive: true, force: true });
console.log("frames", n, "seconds", (n / FPS).toFixed(1), Math.round(fs.statSync(`${out}/film-unbox.mp4`).size / 1024) + " KB");
