// Screenshots + error check for the lab prototype (/lab/).
// QA_DEPS=<dir with puppeteer-core> node .claude/skills/room-lab/lab-shot.mjs http://localhost:4321/lab/ <out-dir> [tag]
import { createRequire } from "node:module";
const require = createRequire(process.env.QA_DEPS ? process.env.QA_DEPS + "/" : import.meta.url);
const puppeteer = require("puppeteer-core");
const [base = "http://localhost:4321/lab/", out = ".", tag = "lab"] = process.argv.slice(2);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const browser = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal"] });
const errors = [];
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
async function shot(name, vp, query, after) {
  if (only && !only.includes(name)) return;
  const p = await browser.newPage(); await p.setViewport(vp);
  p.on("pageerror", (e) => errors.push(`${name}: ${e.message}`));
  p.on("console", (m) => m.type() === "error" && errors.push(`${name}: ${m.text()}`));
  p.on("requestfailed", (r) => errors.push(`${name}: failed ${r.url()}`));
  await p.goto(base + query + (query.includes("?") ? "&" : "?") + "x=" + Date.now(), { waitUntil: "load" });
  await p.waitForFunction(() => window.Lab, { timeout: 20000 }).catch(() => { console.log("❌ lab did not start:\n" + errors.join("\n")); process.exit(1); });
  await p.waitForFunction(() => Lab.state().cat && Lab.state().ball, { timeout: 20000 }).catch(() => errors.push(`${name}: cat/ball missing`));
  if (after) await after(p); else await sleep(1500);
  await p.screenshot({ path: `${out}/${tag}_${name}.png` });
  await p.close();
}
const desk = { width: 1440, height: 900, deviceScaleFactor: 1 }, phone = { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
await shot("room_desktop", desk, "?view=room", async (p) => sleep(3500));
await shot("room_phone", phone, "?view=room", async (p) => sleep(3500));
await shot("desk_desktop", desk, "?view=desk", async (p) => sleep(2500));
await shot("desk_phone", phone, "?view=desk", async (p) => sleep(2500));
await shot("intro_mid", desk, "", async (p) => sleep(5600));
const day = async (p) => { await sleep(800); await p.evaluate(() => { if (Lab.state().night) Lab.toggleDay(); }); await sleep(2600); };
await shot("day_room_desktop", desk, "?view=room", day);
await shot("day_room_phone", phone, "?view=room", day);
await shot("day_desk_desktop", desk, "?view=desk", day);
await shot("intro_early", desk, "", async (p) => sleep(4000));
await shot("sijo_front", desk, "?view=room", async (p) => { await sleep(1200); await p.evaluate(() => { Lab.pose(0.1, 0.5, Math.PI * 0.85); Lab.cam([0.1 - 0.9, 1.5, 0.5 - 2.1], [0.1, 1.0, 0.5]); }); await sleep(700); });
await shot("sijo_side", desk, "?view=room", async (p) => { await sleep(1200); await p.evaluate(() => { Lab.pose(0.1, 0.5, Math.PI * 0.5); Lab.cam([0.1 - 1.2, 1.35, 0.5 + 1.2], [0.1, 0.9, 0.5]); }); await sleep(700); });
await shot("sijo_top", desk, "?view=room", async (p) => { await sleep(1200); await p.evaluate(() => { Lab.pose(0.1, 0.5, 2.5); Lab.cam([0.1 - 0.3, 3.4, 0.5 - 0.4], [0.1, 0.8, 0.5]); }); await sleep(700); });
await shot("sijo_head", desk, "?view=room", async (p) => { await sleep(800); await p.evaluate(() => { if (Lab.state().night) Lab.toggleDay(); Lab.pose(0.1, 0.5, Math.PI * 0.8); Lab.cam([0.1 - 0.28, 1.72, 0.5 - 0.5], [0.1, 1.6, 0.5]); }); await sleep(2600); });
await shot("sijo_head_top", desk, "?view=room", async (p) => { await sleep(800); await p.evaluate(() => { if (Lab.state().night) Lab.toggleDay(); Lab.pose(0.1, 0.5, Math.PI * 0.8); Lab.cam([0.1 - 0.15, 2.3, 0.5 - 0.35], [0.1, 1.6, 0.5]); }); await sleep(2600); });
await shot("night_room", desk, "?view=room", async (p) => { await sleep(1500); await p.evaluate(() => { if (!Lab.state().night) Lab.toggleDay(); }); await sleep(2500); });
await browser.close();
console.log(errors.length ? "❌ errors:\n" + errors.join("\n") : "✅ no errors");
process.exit(errors.length ? 1 : 0);
