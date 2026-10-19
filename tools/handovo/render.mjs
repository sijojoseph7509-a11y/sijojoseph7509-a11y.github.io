// Render tools/handovo/case.html to work/handovo/NN.webp (1440 w) + NN@2x.webp (2880 w), one per <section>,
// plus fx/cover-slide(.webp|@2x) for the Work card. Prints the content.js sections list (heights at 1440).
//   QA_DEPS=<dir with puppeteer-core> node tools/handovo/render.mjs http://127.0.0.1:4392/tools/handovo/case.html
import { createRequire } from "module"; import fs from "fs"; import { execFileSync } from "child_process";
const require = createRequire(process.env.QA_DEPS + "/"); const puppeteer = require("puppeteer-core");
const url = process.argv[2], out = "work/handovo"; fs.mkdirSync(out + "/fx", { recursive: true });
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await p.goto(url, { waitUntil: "networkidle0" }); await p.evaluate(() => document.fonts.ready);
const secs = await p.$$("section"); const list = [];
for (let i = 0; i < secs.length; i++) {
  const n = String(i + 1).padStart(2, "0"); const png = `/tmp/ho_${n}.png`;
  await secs[i].screenshot({ path: png });
  const h = await secs[i].evaluate((e) => Math.round(e.getBoundingClientRect().height));
  execFileSync("python3", ["-c", `from PIL import Image\nim=Image.open("${png}").convert("RGB")\nim.save("${out}/${n}@2x.webp",quality=88)\nim.resize((1440,round(im.height/2)),Image.LANCZOS).save("${out}/${n}.webp",quality=88)`]);
  list.push([n, h]);
}
await p.screenshot({ path: "/tmp/ho_cover.png", clip: { x: 0, y: 0, width: 1440, height: 900 } });
execFileSync("python3", ["-c", `from PIL import Image\nim=Image.open("/tmp/ho_cover.png").convert("RGB")\nim.save("${out}/fx/cover-slide@2x.webp",quality=86)\nim.resize((1440,900),Image.LANCZOS).save("${out}/fx/cover-slide.webp",quality=86)`]);
await b.close();
console.log(JSON.stringify(list));
