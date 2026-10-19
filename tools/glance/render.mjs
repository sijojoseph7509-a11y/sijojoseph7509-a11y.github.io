// Render tools/glance/glance.html: each <section data-slug> to work/<slug>/glance.webp (1440 w) + glance@2x.webp. Prints the heights for content.js.
//   node tools/glance/render.mjs http://127.0.0.1:4393/tools/glance/glance.html      (QA_DEPS=<puppeteer-core dir> on the Mac)
import { createRequire } from "module"; import fs from "fs"; import os from "os"; import { execFileSync } from "child_process";
const mac = !!process.env.QA_DEPS;
const require = createRequire((mac ? process.env.QA_DEPS : execFileSync("npm", ["root", "-g"]).toString().trim()) + "/");
const puppeteer = require(mac ? "puppeteer-core" : "puppeteer");
const tmp = fs.mkdtempSync(os.tmpdir() + "/gl-");
const b = await puppeteer.launch(mac ? { executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" } : { headless: true, args: ["--no-sandbox"] });
const p = await b.newPage(); await p.setViewport({ width: 1440, height: 900, deviceScaleFactor: 2 });
await p.goto(process.argv[2], { waitUntil: "networkidle0" }); await p.evaluate(() => document.fonts.ready);
const out = {};
for (const s of await p.$$("section[data-slug]")) {
  const slug = await s.evaluate((e) => e.dataset.slug), png = `${tmp}/${slug}.png`;
  await s.screenshot({ path: png });
  out[slug] = await s.evaluate((e) => Math.round(e.getBoundingClientRect().height));
  execFileSync("python3", ["-c", `from PIL import Image\nim=Image.open("${png}").convert("RGB")\nim.save("work/${slug}/glance@2x.webp",quality=88)\nim.resize((1440,round(im.height/2)),Image.LANCZOS).save("work/${slug}/glance.webp",quality=88)`]);
}
await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
console.log(JSON.stringify(out));
