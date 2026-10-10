import { createRequire } from "module"; const require = createRequire(import.meta.url);
const puppeteer = require(process.env.QA_DEPS + "/node_modules/puppeteer-core");
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
const p = await b.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
await p.goto("http://localhost:4321/?x=" + Date.now()); await p.waitForFunction(() => window.Desk && Desk.state().started && Desk.state().cat, { timeout: 60000 });
await p.click("#introQuiet");
await p.evaluate(() => { Desk.catStep(0); Desk.catWander(); });
for (let i = 0; i < +(process.argv[2] || 60); i++) console.log((i * 0.1).toFixed(1), await p.evaluate(() => { Desk.catStep(0.1); const h = Desk.cat.holder, s = Desk.cat.state; return [h.position.x, h.position.y, h.position.z, h.rotation.y, s.speed, s.omega, s.sit].map((v) => v.toFixed(2)).join(" ") + " " + (s.phase || "") ; }));
console.log(errs.join(" | ") || "no errors"); await b.close();
