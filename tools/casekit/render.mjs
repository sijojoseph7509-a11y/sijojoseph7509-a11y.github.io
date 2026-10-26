// Renders tools/casekit/<slug>.html (from build.py) to work/<slug>/<id>.webp (1440 w) + <id>@2x.webp (2880 w), and the
// whiteboard / hook pictures for the text version to work/<slug>/kit/<id>-board.webp. Heights go to tools/casekit/heights.json.
//   QA_DEPS=<dir with puppeteer-core> node tools/casekit/render.mjs http://localhost:4321/ [slug …]
import { createRequire } from "module"; import fs from "fs"; import os from "os"; import { execFileSync } from "child_process";
const require = createRequire(process.env.QA_DEPS + "/"); const pp = require("puppeteer-core");
const [base, ...only] = process.argv.slice(2), slugs = only.length ? only : ["carekin", "syntra"];
const hp = "tools/casekit/heights.json", heights = fs.existsSync(hp) ? JSON.parse(fs.readFileSync(hp)) : {};
const tmp = fs.mkdtempSync(os.tmpdir() + "/kit-");
const webp = (src, out, q = 90) => execFileSync("python3", ["-c", `from PIL import Image\nImage.open("${src}").convert("RGB").save("${out}", quality=${q}, method=6)`]);
const b = await pp.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
for (const slug of slugs) {
  heights[slug] = {}; fs.mkdirSync(`work/${slug}/kit`, { recursive: true });
  for (const dpr of [1, 2]) {
    const p = await b.newPage(); await p.setViewport({ width: 1440, height: 1000, deviceScaleFactor: dpr });
    await p.goto(`${base}tools/casekit/${slug}.html?t=${Date.now()}`, { waitUntil: "networkidle0" }); await p.evaluate(() => document.fonts.ready);
    for (const id of await p.$$eval("section", (s) => s.map((e) => e.id))) {
      const el = await p.$("#" + id); await el.screenshot({ path: `${tmp}/${id}.png` });
      webp(`${tmp}/${id}.png`, `work/${slug}/${id}${dpr === 2 ? "@2x" : ""}.webp`, dpr === 2 ? 88 : 90);
      if (dpr === 1) heights[slug][id] = Math.round(await el.evaluate((e) => e.getBoundingClientRect().height));
      if (dpr === 2) {   // pictures for the text version: the whiteboard itself, or the hook's two tiles
        const pic = await p.$(`#${id} .wb`) || (id === "k-hook" ? await p.$(`#${id} > div:nth-of-type(2)`) : null);
        if (pic) { await pic.screenshot({ path: `${tmp}/${id}-b.png` }); webp(`${tmp}/${id}-b.png`, `work/${slug}/kit/${id}-board.webp`, 86); }
      }
    }
    await p.close();
  }
  console.log(slug, JSON.stringify(heights[slug]));
}
fs.writeFileSync(hp, JSON.stringify(heights, null, 1)); await b.close();
