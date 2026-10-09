// Screenshots of the 3D room for a visual check.
//   QA_DEPS=<dir with puppeteer-core> node .claude/skills/room-scene/render.mjs <url> <out-prefix> [day|night] [views…]
// views: "home" (start view), "room" (zoomed-out room view), or a debug camera "name:px,py,pz,tx,ty,tz"
// e.g. "win:5,19,20,30,18,20" (the window)   "leftwall:10,16,8,-30,18,8"   "top:0.2,30,3.5,0.2,0,1.6" (the desk)
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const puppeteer = require(require.resolve("puppeteer-core", { paths: [process.env.QA_DEPS || process.cwd(), process.cwd()] }));
const [url = "http://localhost:4321/", out = "room", mode = "day", ...views] = process.argv.slice(2);
const b = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal"] });
const pg = await b.newPage(); await pg.setViewport({ width: 1440, height: 900 });
const errs = []; pg.on("pageerror", (e) => errs.push(e.message)); pg.on("console", (m) => m.type() === "error" && errs.push(m.text()));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
await pg.goto(url + "?x=" + Date.now()); await pg.waitForFunction(() => window.Desk && Desk.state().started && Desk.state().cat, { timeout: 60000 });
await pg.click("#introGo").catch(() => {}); await sleep(2500); await pg.evaluate(() => document.getElementById("coach")?.remove());
if ((mode === "night") !== (await pg.evaluate(() => Desk.state().night))) { await pg.evaluate(() => Desk.toggleDay()); await sleep(2300); }
for (const v of views.length ? views : ["home", "room"]) {
  if (v === "home") { await pg.screenshot({ path: `${out}_home.png` }); continue; }
  if (v === "room") { await pg.click("#zoomBtn"); await sleep(2000); await pg.screenshot({ path: `${out}_room.png` }); await pg.click("#zoomBtn"); await sleep(2000); continue; }
  const [name, nums] = v.split(":"); const n = nums.split(",").map(Number);
  await pg.evaluate((n) => Desk.debugView(n.slice(0, 3), n.slice(3, 6)), n); await sleep(700); await pg.screenshot({ path: `${out}_${name}.png` });
}
console.log(JSON.stringify(await pg.evaluate(() => Desk.boxes())));
console.log(errs.length ? "❌ " + errs.join(" | ") : "✅ no errors");
await b.close();
