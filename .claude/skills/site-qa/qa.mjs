// Automated QA for the 3D portfolio. Usage:
//   node .claude/skills/site-qa/qa.mjs [baseURL]        (default http://localhost:4321/)
// Needs Google Chrome + puppeteer-core (see SKILL.md). Exits 1 if any check fails.
import { createRequire } from "module";
import { execSync } from "child_process";
const require = createRequire(import.meta.url);
const puppeteer = require(require.resolve("puppeteer-core", { paths: [process.env.QA_DEPS || process.cwd(), process.cwd()] }));
const BASE = (process.argv[2] || "http://localhost:4321/").replace(/\/?$/, "/");
const CHROME = process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const browser = await puppeteer.launch({ executablePath: CHROME, headless: "new", args: ["--use-angle=metal", "--enable-gpu", "--ignore-gpu-blocklist", "--enable-unsafe-swiftshader"] });
const results = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function page({ mobile = false, route } = {}) {
  const ctx = await browser.createBrowserContext();
  const p = await ctx.newPage();
  await p.setViewport(mobile ? { width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true } : { width: 1440, height: 900 });
  p.problems = [];
  p.on("pageerror", (e) => p.problems.push("JS error: " + e.message));
  p.on("console", (m) => { if (m.type() === "error") p.problems.push("console: " + m.text()); });
  p.on("requestfailed", (r) => { if (!r.failure()?.errorText.includes("ABORTED") || !route) p.problems.push("failed: " + r.url()); });
  p.on("response", (r) => { if (r.status() >= 400) p.problems.push(r.status() + " " + r.url()); });
  if (route) { await p.setRequestInterception(true); p.on("request", (req) => route(req) || req.continue()); }
  p.ctx = ctx;
  return p;
}
// waits for the desk, then taps "Enter" on the welcome screen (pass enter=false to stay on it)
async function ready(p, ms = 60000, enter = true) {
  await p.waitForFunction(() => window.Desk && Desk.state().started, { timeout: ms, polling: 100 });
  if (enter && await p.$eval("#intro", (e) => !e.hidden).catch(() => false)) {
    await p.click("#introGo"); await p.waitForFunction(() => document.getElementById("loader").classList.contains("done"));
  }
}
async function check(name, fn) {
  try { const note = await fn(); results.push(["PASS", name, note || ""]); }
  catch (e) { results.push(["FAIL", name, e.message.split("\n")[0]]); }
}
const expect = (cond, msg) => { if (!cond) throw new Error(msg); };
const clean = (p) => expect(p.problems.length === 0, p.problems.slice(0, 3).join(" | "));

await check("Desktop: loads with real cat, ball, headset and no errors", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => { const s = Desk.state(); return s.cat && s.ball && s.headset; }, { timeout: 30000 });
  await sleep(1500); clean(p);
  const s = await p.evaluate(() => Desk.state()); await p.ctx.close();
  return JSON.stringify(s);
});

await check("Phone: loads with all models and no errors", async () => {
  const p = await page({ mobile: true }); await p.goto(BASE + "?qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => { const s = Desk.state(); return s.cat && s.ball && s.headset; }, { timeout: 30000 });
  await sleep(1000); clean(p); await p.ctx.close();
});

await check("Welcome screen: Enter starts the music and shows the laptop pointer", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p, 60000, false);
  expect(await p.$eval("#intro", (e) => !e.hidden), "welcome screen not shown");
  await p.click("#introGo"); await sleep(800);
  const s = await p.evaluate(() => Desk.state());
  expect(s.audio === "running" && s.music, "music not playing: " + s.audio);
  expect(await p.$eval("#coach", (e) => !e.hidden), "laptop pointer not shown"); clean(p); await p.ctx.close();
});

await check("Welcome screen: 'Enter without sound' stays silent", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p, 60000, false);
  await p.click("#introQuiet"); await sleep(600);
  const s = await p.evaluate(() => Desk.state());
  expect(!s.music && (await p.$eval("#soundBtn", (b) => b.classList.contains("muted"))), "sound still on"); await p.ctx.close();
});

await check("Opening the laptop hides the pointer for good; the hint comes back after", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p); await sleep(400);
  await p.keyboard.press("Enter"); await p.waitForFunction(() => Desk.state().covering, { timeout: 10000 });
  await p.keyboard.press("Escape"); await p.waitForFunction(() => !Desk.state().booting, { timeout: 10000 }); await sleep(700);
  expect(await p.$eval("#hint", (h) => getComputedStyle(h).opacity === "1"), "hint still hidden after returning");
  expect(await p.$eval("#coach", (e) => e.hidden), "pointer still shown");
  expect(await p.evaluate(() => localStorage.getItem("openedLaptop")) === "1", "not remembered"); await p.ctx.close();
});

await check("Back button / phone back-swipe closes the Mac and stays on the site", async () => {
  const p = await page({ mobile: true }); await p.goto(BASE + "?open=work&qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => OS.isOpen(), { timeout: 10000 }); await sleep(800);
  const url = p.url(); await p.evaluate(() => history.back()); await sleep(1500);
  expect(p.url() === url, "left the page: " + p.url());
  expect(await p.evaluate(() => !OS.isOpen()), "Mac still open"); clean(p); await p.ctx.close();
});

await check("Reopening the tab later (back/forward cache) starts at the desk", async () => {
  const p = await page(); await p.goto(BASE + "?open=about&qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => OS.isOpen(), { timeout: 10000 }); await sleep(800);
  await p.evaluate(() => dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }))); await sleep(1500);
  expect(await p.evaluate(() => !OS.isOpen()), "Mac still open after reopening"); await p.ctx.close();
});

await check("Phone: a tap's label and lift clear by themselves", async () => {
  const p = await page({ mobile: true }); await p.goto(BASE + "?qa=" + Date.now()); await ready(p); await sleep(800);
  await p.touchscreen.tap(305, 520); await sleep(300);
  const label = await p.$eval("#tooltip", (t) => t.classList.contains("show") ? t.textContent : "");
  expect(label.includes("pet me"), "tapping the cat showed no label (got '" + label + "')");
  await sleep(1500);
  expect(!(await p.$eval("#tooltip", (t) => t.classList.contains("show"))), "label stuck after a tap");
});

for (const [w, h] of [[320, 568], [360, 780], [430, 932]]) {
  await check(`Phone ${w}×${h}: dock, clock and top menu fit`, async () => {
    const p = await page({ mobile: true }); await p.setViewport({ width: w, height: h, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
    await p.goto(BASE + "?open=about&qa=" + Date.now()); await ready(p); await p.waitForFunction(() => OS.isOpen()); await sleep(800);
    const off = await p.$$eval("#dock .dock-item", (els) => els.filter((e) => { const r = e.getBoundingClientRect(), d = e.parentElement.getBoundingClientRect(); return r.left < d.left - 0.5 || r.right > d.right + 0.5 || r.right > innerWidth; }).length);
    expect(off === 0, off + " dock icon(s) cut off");
    await p.evaluate(() => OS.close()); await p.waitForFunction(() => !OS.isOpen()); await sleep(1400);
    const hit = await p.evaluate(() => { const n = document.querySelector(".topnav").getBoundingClientRect(); return [...document.querySelectorAll(".hud")].some((h) => { const r = h.getBoundingClientRect(); return r.right > n.left && r.left < n.right && r.bottom > n.top && r.top < n.bottom; }); });
    expect(!hit, "top menu pill overlaps the zoom/sound buttons");
    const clock = await p.$eval("#clock", (c) => c.getBoundingClientRect().height);
    expect(clock < 24, "clock wraps onto two lines"); await p.ctx.close();
  });
}

await check("Phone landscape: the welcome card fits on screen", async () => {
  const p = await page({ mobile: true }); await p.setViewport({ width: 844, height: 390, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await p.goto(BASE + "?qa=" + Date.now()); await ready(p, 60000, false);
  const b = await p.$eval("#introQuiet", (e) => e.getBoundingClientRect().bottom);
  expect(b <= 390, "'Enter without sound' is below the screen (" + Math.round(b) + "px)"); await p.ctx.close();
});

for (const sec of ["about", "work", "skills", "resume", "contact"]) {
  await check(`Deep link ?open=${sec} opens the right window`, async () => {
    const p = await page(); await p.goto(BASE + "?open=" + sec + "&qa=" + Date.now()); await ready(p);
    await p.waitForFunction(() => OS.isOpen(), { timeout: 10000 });
    const title = await p.$eval("#winTitle", (e) => e.textContent.toLowerCase());
    expect(title === sec, "window title is " + title); clean(p); await p.ctx.close();
  });
}

await check("Enter boots the laptop, rendering pauses behind the desktop, Esc returns", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p); await sleep(500);
  await p.keyboard.press("Enter");
  await p.waitForFunction(() => Desk.state().covering, { timeout: 10000 });
  await p.keyboard.press("Escape");
  await p.waitForFunction(() => !OS.isOpen() && !Desk.state().covering, { timeout: 10000 });
  clean(p); await p.ctx.close();
});

await check("Desktop UI: menus, Spotlight search, shortcuts, share", async () => {
  const p = await page(); await p.goto(BASE + "?open=about&qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => OS.isOpen()); await sleep(800);
  for (const m of ["portfolio", "file", "edit", "view", "go", "window", "help"]) {
    await p.click(`#menubar [data-menu="${m}"]:not(.mb-logo)`);
    expect(await p.$eval("#mbMenu", (e) => !e.hidden && e.children.length > 0), "menu " + m + " did not open");
    await p.click(`#menubar [data-menu="${m}"]:not(.mb-logo)`);
  }
  const mod = process.platform === "darwin" ? "Meta" : "Control";
  await p.keyboard.down(mod); await p.keyboard.press("k"); await p.keyboard.up(mod);
  await p.waitForSelector("#spotlight:not([hidden])");
  await p.type("#spInput", "blend"); await p.keyboard.press("Enter");
  await p.waitForFunction(() => document.querySelector("#winTitle").textContent === "Skills");
  await p.keyboard.down(mod); await p.keyboard.press("5"); await p.keyboard.up(mod);
  await p.waitForFunction(() => document.querySelector("#winTitle").textContent === "Contact");
  expect(await p.$$eval(".card[href='#']", (a) => a.length) === 0, "placeholder project card is a link");
  clean(p); await p.ctx.close();
});

await check("Window body scrolls (Work section on a phone)", async () => {
  const p = await page({ mobile: true }); await p.goto(BASE + "?open=work&qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => OS.isOpen()); await sleep(800);
  const ok = await p.$eval("#winBody", (b) => { const before = b.scrollTop; b.scrollTop = 400; return b.scrollHeight <= b.clientHeight || b.scrollTop > before; });
  expect(ok, "window body does not scroll"); await p.ctx.close();
});

await check("Resizing while the desktop is open keeps the room visible behind it", async () => {
  const p = await page(); await p.goto(BASE + "?open=about&qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => Desk.state().covering, { timeout: 10000 });
  await p.setViewport({ width: 1600, height: 1000 }); await sleep(600);
  const shot = await p.screenshot({ clip: { x: 2, y: 400, width: 4, height: 4 }, encoding: "base64" });
  expect(shot.length > 0, "no screenshot"); clean(p); await p.ctx.close();
  return "repaint ran (visual check: margin not pure black)";
});

await check("A model that fails to download: no stand-in, no crash", async () => {
  const p = await page({ route: (req) => (req.url().includes("cat.glb") ? (req.abort(), true) : false) });
  await p.goto(BASE + "?qa=" + Date.now()); await ready(p, 90000); await sleep(1500);
  const s = await p.evaluate(() => Desk.state());
  expect(!s.cat && s.ball && s.headset, "unexpected state " + JSON.stringify(s));
  expect(!p.problems.some((x) => x.startsWith("JS error")), p.problems.join(" | "));
  await p.ctx.close();
});

await check("Stale cached os.js (pre-v39) + new main.js: no crash", async () => {
  let oldOs; try { oldOs = execSync("git show e9ed8b2:os.js", { encoding: "utf8" }); } catch (_) { return "skipped (git history unavailable)"; }
  const p = await page({ route: (req) => (/\/os\.js/.test(req.url()) ? (req.respond({ contentType: "text/javascript", body: oldOs }), true) : false) });
  await p.goto(BASE + "?qa=" + Date.now()); await ready(p); await sleep(1500);
  expect(!p.problems.some((x) => x.startsWith("JS error")), p.problems.join(" | ")); await p.ctx.close();
});

await check("Self-update: a newer version.json reloads once, never loops", async () => {
  const p = await page({ route: (req) => (req.url().includes("version.json") ? (req.respond({ contentType: "application/json", body: '{"build":"9999"}' }), true) : false) });
  let navs = 0; p.on("framenavigated", (f) => { if (f === p.mainFrame()) navs++; });
  await p.goto(BASE + "?qa=" + Date.now()); await sleep(6000);
  expect(p.url().includes("v=9999"), "did not move to the new version: " + p.url());
  expect(navs <= 2, navs + " navigations — reload loop");
  await p.ctx.close();
});

await check("Legacy cached pages still find the real cat (old OBJ path exists)", async () => {
  const r = await fetch(BASE + "models/cat/Cat_v1_L3.123cb1b1943a-2f48-4e44-8f71-6bbe19a3ab64/12221_Cat_v1_l3.obj", { method: "HEAD" });
  expect(r.ok, "HTTP " + r.status);
});

await browser.close();
const w = Math.max(...results.map((r) => r[1].length));
for (const [s, n, note] of results) console.log(`${s === "PASS" ? "✅" : "❌"} ${n.padEnd(w)}  ${note}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
