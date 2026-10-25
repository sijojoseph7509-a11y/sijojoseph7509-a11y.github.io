// Render tools/handovo/case.html to work/handovo/NN.webp (1440 w) + NN@2x.webp (2880 w), one per <section>,
// plus fx/cover-slide(.webp|@2x) for the Work card. Prints the content.js sections list (heights at 1440).
//   QA_DEPS=<dir with puppeteer-core> node tools/handovo/render.mjs http://127.0.0.1:4392/tools/handovo/case.html   (Mac, Google Chrome)
//   node tools/handovo/render.mjs http://127.0.0.1:4392/tools/handovo/case.html                                   (cloud, global puppeteer + its Chrome)
import { createRequire } from "module"; import fs from "fs"; import os from "os"; import { execFileSync } from "child_process";
const mac = !!process.env.QA_DEPS;
const require = createRequire((mac ? process.env.QA_DEPS : execFileSync("npm", ["root", "-g"]).toString().trim()) + "/");
const puppeteer = require(mac ? "puppeteer-core" : "puppeteer");
const url = process.argv[2], out = "work/handovo", tmp = fs.mkdtempSync(os.tmpdir() + "/ho-"); fs.mkdirSync(out + "/fx", { recursive: true });
const b = await puppeteer.launch(mac ? { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" } : { headless: true, args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: "networkidle0" }); await p.evaluate(() => document.fonts.ready);
// fx layers: [data-fx-draw] is left out of the section still and rendered alone (transparent) to fx/<name>.webp;
// [data-fx-video] positions go to tools/handovo/fx.json for the films (tools/handovo/films.mjs)
const fx = await p.evaluate(() => [...document.querySelectorAll("[data-fx-video],[data-fx-draw],[data-fx-pop]")].map((e) => {
  const sec = e.closest("section"), i = [...document.querySelectorAll("section")].indexOf(sec), r = e.getBoundingClientRect(), q = sec.getBoundingClientRect();
  return { kind: e.dataset.fxVideo ? "video" : e.dataset.fxPop ? "pop" : "draw", name: e.dataset.fxVideo || e.dataset.fxPop || e.dataset.fxDraw, i, x: Math.round(r.left - q.left), y: Math.round(r.top - q.top), w: Math.round(r.width), h: Math.round(r.height),
    radius: parseFloat(getComputedStyle(e).borderTopLeftRadius) || 0, bg: getComputedStyle(sec).backgroundColor };
}));
fs.writeFileSync("tools/handovo/fx.json", JSON.stringify(fx, null, 1));
await p.addStyleTag({ content: "[data-fx-draw] { visibility: hidden }" });
const secs = await p.$$("section"); const list = [];
for (let i = 0; i < secs.length; i++) {
  const n = String(i + 1).padStart(2, "0"); const png = `${tmp}/ho_${n}.png`;
  await secs[i].screenshot({ path: png });
  const h = await secs[i].evaluate((e) => Math.round(e.getBoundingClientRect().height));
  execFileSync("python3", ["-c", `from PIL import Image\nim=Image.open("${png}").convert("RGB")\nim.save("${out}/${n}@2x.webp",quality=88)\nim.resize((1440,round(im.height/2)),Image.LANCZOS).save("${out}/${n}.webp",quality=88)`]);
  list.push([n, h]);
}
for (const f of fx.filter((f) => f.kind !== "video")) {   // draw and pop layers alone, on transparent (v182: pops also stay in the still)
  await p.addStyleTag({ content: `html, body, section { background: transparent !important } body { visibility: hidden } [data-fx-${f.kind}="${f.name}"], [data-fx-${f.kind}="${f.name}"] * { visibility: visible !important }` });
  const el = await p.$(`[data-fx-${f.kind}="${f.name}"]`); const png = `${tmp}/draw.png`;
  await el.screenshot({ path: png, omitBackground: true });
  execFileSync("python3", ["-c", `from PIL import Image\nim=Image.open("${png}").convert("RGBA")\nim.save("${out}/fx/${f.name}@2x.webp",lossless=True)\nim.resize((${f.w},${f.h}),Image.LANCZOS).save("${out}/fx/${f.name}.webp",lossless=True)`]);
}
await p.reload({ waitUntil: "networkidle0" }); await p.evaluate(() => document.fonts.ready);
await p.screenshot({ path: `${tmp}/ho_cover.png`, clip: { x: 0, y: 0, width: 1440, height: 900 } });
execFileSync("python3", ["-c", `from PIL import Image\nim=Image.open("${tmp}/ho_cover.png").convert("RGB")\nim.save("${out}/fx/cover-slide@2x.webp",quality=86)\nim.resize((1440,900),Image.LANCZOS).save("${out}/fx/cover-slide.webp",quality=86)`]);
await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify(list));
