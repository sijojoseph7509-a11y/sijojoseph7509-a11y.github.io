// Captures the five staff-app screens of app.html at 3× (1179 × 2556, the iPhone frame's ratio) into ../shots/staff01–05.webp.
//   QA_DEPS=<dir with puppeteer-core> node tools/handovo/staff/render.mjs http://localhost:4321/
import { createRequire } from "module"; import { execFileSync } from "child_process"; import fs from "fs"; import os from "os";
const require = createRequire(process.env.QA_DEPS + "/"); const pp = require("puppeteer-core");
const b = await pp.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
const p = await b.newPage(); await p.setViewport({ width: 2200, height: 1000, deviceScaleFactor: 3 });
await p.goto(process.argv[2] + "tools/handovo/staff/app.html", { waitUntil: "networkidle0" }); await p.evaluate(() => window.ready);
const tmp = fs.mkdtempSync(os.tmpdir() + "/staff-");
for (let k = 1; k <= 5; k++) {
  const el = await p.$("#s" + k); await el.screenshot({ path: `${tmp}/${k}.png` });
  execFileSync("python3", ["-c", `from PIL import Image\nImage.open("${tmp}/${k}.png").convert("RGB").save("tools/handovo/shots/staff0${k}.webp", quality=92)`]);
}
await b.close(); console.log("5 screens written to tools/handovo/shots/staff01–05.webp");
