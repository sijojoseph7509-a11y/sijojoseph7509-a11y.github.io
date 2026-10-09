// Average colour of 12×12 px patches in a screenshot (to match paint / tile colours to a swatch).
//   QA_DEPS=<dir with puppeteer-core> node .claude/skills/room-scene/pixel.mjs shot.png 330,350 1000,200 …
import { createRequire } from "module"; import fs from "fs";
const require = createRequire(import.meta.url);
const puppeteer = require(require.resolve("puppeteer-core", { paths: [process.env.QA_DEPS || process.cwd(), process.cwd()] }));
const [file, ...pts] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" }); const pg = await b.newPage();
const src = "data:image/png;base64," + fs.readFileSync(file).toString("base64");
console.log(await pg.evaluate(async (src, pts) => { const im = new Image(); im.src = src; await im.decode(); const c = document.createElement("canvas"); c.width = im.width; c.height = im.height; const g = c.getContext("2d"); g.drawImage(im, 0, 0);
  return pts.map((s) => { const [x, y] = s.split(",").map(Number); const d = g.getImageData(x - 6, y - 6, 12, 12).data; let r = 0, gg = 0, bb = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; } const n = d.length / 4; return s + " #" + [r, gg, bb].map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join(""); }); }, src, pts));
await b.close();
