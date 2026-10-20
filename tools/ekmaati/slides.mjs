// Render tools/ekmaati/slides.html: each <section data-slide="NN"> to work/ekmaati/NN.webp (1440 w) + NN@2x.webp, and each
// [data-fx-draw] alone on transparent to work/ekmaati/fx/<name>.webp (+ @2x), left out of its slide. Prints heights and
// draw positions for content.js / ekmaati-fx.js.
//   node tools/ekmaati/slides.mjs http://127.0.0.1:4393/tools/ekmaati/slides.html     (QA_DEPS=<puppeteer-core dir> on the Mac)
import { createRequire } from "module"; import fs from "fs"; import os from "os"; import { execFileSync } from "child_process";
const mac = !!process.env.QA_DEPS;
const require = createRequire((mac ? process.env.QA_DEPS : execFileSync("npm", ["root", "-g"]).toString().trim()) + "/");
const puppeteer = require(mac ? "puppeteer-core" : "puppeteer");
const out = "work/ekmaati", tmp = fs.mkdtempSync(os.tmpdir() + "/eks-");
const b = await puppeteer.launch(mac ? { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" } : { headless: true, args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await p.goto(process.argv[2], { waitUntil: "networkidle0" }); await p.evaluate(() => document.fonts.ready);
const py = (code) => execFileSync("python3", ["-c", "from PIL import Image\n" + code]);
const draws = await p.evaluate(() => [...document.querySelectorAll("[data-fx-draw]")].map((e) => { const s = e.closest("section"), r = e.getBoundingClientRect(), q = s.getBoundingClientRect();
  return { name: e.dataset.fxDraw, slide: s.dataset.slide, x: Math.round(r.left - q.left), y: Math.round(r.top - q.top), w: Math.round(r.width), h: Math.round(r.height) }; }));
await p.addStyleTag({ content: "[data-fx-draw] { visibility: hidden }" });
const res = {};
for (const s of await p.$$("section[data-slide]")) {
  const n = await s.evaluate((e) => e.dataset.slide), png = `${tmp}/${n}.png`;
  await s.screenshot({ path: png }); res[n] = await s.evaluate((e) => Math.round(e.getBoundingClientRect().height));
  py(`im=Image.open("${png}").convert("RGB")\nim.save("${out}/${n}@2x.webp",quality=88)\nim.resize((1440,round(im.height/2)),Image.LANCZOS).save("${out}/${n}.webp",quality=88)`);
}
for (const d of draws) {
  await p.addStyleTag({ content: `html, body, section { background: transparent !important } body { visibility: hidden } [data-fx-draw="${d.name}"], [data-fx-draw="${d.name}"] * { visibility: visible !important }` });
  const el = await p.$(`[data-fx-draw="${d.name}"]`), png = `${tmp}/d.png`; await el.screenshot({ path: png, omitBackground: true });
  py(`im=Image.open("${png}").convert("RGBA")\nim.save("${out}/fx/${d.name}@2x.webp",lossless=True)\nim.resize((${d.w},${d.h}),Image.LANCZOS).save("${out}/fx/${d.name}.webp",lossless=True)`);
}
await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify({ heights: res, draws }));
