// frame-exact captures of Shea's wander: node catstep.mjs <cam px,py,pz,tx,ty,tz | home> <out> <stepSec> <frames> [skipSec] [w,h]
import { createRequire } from "module"; const require = createRequire(import.meta.url);
const puppeteer = require(process.env.QA_DEPS + "/node_modules/puppeteer-core");
const [cam, out, step = "0.1", n = "30", skip = "0", size = "960,600"] = process.argv.slice(2);
const [w, h] = size.split(",").map(Number);
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal"] });
const p = await b.newPage(); await p.setViewport({ width: w, height: h });
const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => m.type() === "error" && errs.push(m.text()));
await p.goto("http://localhost:4321/?x=" + Date.now()); await p.waitForFunction(() => window.Desk && Desk.state().started && Desk.state().cat, { timeout: 60000 });
await p.click("#introQuiet"); await new Promise((r) => setTimeout(r, 1500)); await p.evaluate(() => document.getElementById("coach")?.remove());
if (cam !== "home") { const v = cam.split(",").map(Number); await p.evaluate((v) => Desk.debugView(v.slice(0, 3), v.slice(3)), v); }
await p.evaluate(() => { Desk.catStep(0); Desk.catWander(); });
if (+skip) await p.evaluate((s) => Desk.catStep(s), +skip);
for (let i = 0; i < +n; i++) { await p.evaluate((s) => Desk.catStep(s), +step); await p.screenshot({ path: `${out}_${String(i).padStart(2, "0")}.png` }); }
console.log(errs.join(" | ") || "no errors"); await b.close();
