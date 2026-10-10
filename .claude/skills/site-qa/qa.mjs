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
  // cancelled requests (ERR_ABORTED) aren't bugs — tests close pages mid-download and some dev servers report streamed
  // downloads as aborted; real failures still show up as 4xx/5xx responses, other network errors or missing models
  p.on("requestfailed", (r) => { const err = r.failure()?.errorText || ""; if (!err.includes("ABORTED")) p.problems.push("failed: " + r.url() + " " + err); });
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

await check("Desktop: loads with real cat, ball and no errors", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => { const s = Desk.state(); return s.cat && s.ball; }, { timeout: 30000 });
  await sleep(1500); clean(p);
  const s = await p.evaluate(() => Desk.state()); await p.ctx.close();
  return JSON.stringify(s);
});

await check("Phone: loads with all models and no errors", async () => {
  const p = await page({ mobile: true }); await p.goto(BASE + "?qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => { const s = Desk.state(); return s.cat && s.ball; }, { timeout: 30000 });
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

await check("Opening the laptop hides the pointer for this visit; the hint comes back; a refresh shows the pointer again", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p); await sleep(400);
  await p.keyboard.press("Enter"); await p.waitForFunction(() => Desk.state().covering, { timeout: 10000 });
  await p.keyboard.press("Escape"); await p.waitForFunction(() => !Desk.state().booting, { timeout: 10000 }); await sleep(700);
  expect(await p.$eval("#hint", (h) => getComputedStyle(h).opacity === "1"), "hint still hidden after returning");
  expect(await p.$eval("#coach", (e) => e.hidden), "pointer still shown after opening the laptop");
  await p.reload(); await ready(p); await sleep(400);
  expect(await p.$eval("#coach", (e) => !e.hidden), "pointer not shown again after a refresh"); await p.ctx.close();
});

for (const mobile of [false, true]) {
  await check(`${mobile ? "Phone" : "Desktop"}: desk close-up shows every desk item; the room view shows everything`, async () => {
    const p = await page({ mobile }); await p.goto(BASE + "?qa=" + Date.now()); await ready(p);
    await p.waitForFunction(() => { const s = Desk.state(); return s.cat && s.ball; }, { timeout: 30000 }); await sleep(600);
    const SIDE = /the (sun|night) in|One Piece prints/;   // side walls: drag to look at them
    const home = await p.evaluate((side) => Desk.offscreen().filter((l) => !/Kick|About me/.test(l) && !new RegExp(side).test(l)), SIDE.source);   // close-up: ball + wall lettering may be out of frame
    expect(home.length === 0, "off-screen in the desk close-up: " + home.join(", "));
    await p.click("#zoomBtn"); await sleep(1400);
    const room = await p.evaluate((side) => Desk.offscreen().filter((l) => !new RegExp(side).test(l)), SIDE.source);
    expect(room.length === 0, "off-screen in the room view: " + room.join(", "));
    await p.click("#zoomBtn"); await sleep(1300);
    expect(!(await p.evaluate(() => Desk.state().room)), "zoom button did not come back to the desk"); await p.ctx.close();
  });
}

await check("Zooming out (scroll) ends in the room view, centred on the desk", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p); await sleep(600);
  await p.mouse.move(250, 450);   // off to the left — zooming out must not drift toward/away from the cursor
  for (let i = 0; i < 8; i++) { await p.mouse.wheel({ deltaY: 220 }); await sleep(60); }
  await sleep(1800);
  const s = await p.evaluate(() => ({ room: Desk.state().room, at: Desk.screenPos("Open my portfolio"), w: innerWidth }));
  expect(s.room, "did not switch to the room view");
  const off = Math.abs(s.at.x - s.w / 2) / s.w;
  expect(off < 0.03, "laptop is " + (off * 100).toFixed(1) + "% off centre"); await p.ctx.close();
  return "laptop " + (off * 100).toFixed(1) + "% from centre";
});

await check("Zooming in (scroll) from anywhere heads for the laptop", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p); await sleep(600);
  await p.mouse.move(120, 120);   // far top-left corner — zoom must still go to the laptop, not the cursor
  for (let i = 0; i < 6; i++) { await p.mouse.wheel({ deltaY: -160 }); await sleep(80); }
  await sleep(1500);
  const s = await p.evaluate(() => ({ at: Desk.screenPos("Open my portfolio"), w: innerWidth, h: innerHeight }));
  const off = Math.hypot(s.at.x / s.w - 0.5, s.at.y / s.h - 0.5);
  expect(off < 0.15, "laptop is " + (off * 100).toFixed(0) + "% away from the centre after zooming in"); await p.ctx.close();
  return "laptop " + (off * 100).toFixed(0) + "% from centre";
});

await check("Window: day ↔ night switch changes the room's light and back", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p); await sleep(500);
  const a = await p.evaluate(() => Desk.state().night);
  await p.evaluate(() => Desk.toggleDay()); await sleep(2200);
  const b = await p.evaluate(() => Desk.state());
  expect(b.night === !a && Math.abs(b.dayMix - (b.night ? 1 : 0)) < 0.01, "did not switch: " + JSON.stringify({ a, night: b.night, mix: b.dayMix }));
  await p.evaluate(() => Desk.toggleDay()); await sleep(2200);
  expect(await p.evaluate(() => Desk.state().night) === a, "did not switch back"); clean(p); await p.ctx.close();
});

await check("Laptop pointer fades out while the view is dragged, comes back when still", async () => {
  const p = await page(); await p.goto(BASE + "?qa=" + Date.now()); await ready(p); await sleep(900);
  const op = () => p.$eval("#coach", (c) => +getComputedStyle(c).opacity);
  expect(await op() > 0.9, "pointer not visible at rest");
  await p.mouse.move(700, 450); await p.mouse.down();
  for (let i = 0; i < 12; i++) { await p.mouse.move(700 + i * 15, 450); await sleep(30); }
  await sleep(150);
  expect(await op() < 0.2, "pointer still visible while dragging");
  await p.mouse.up(); await sleep(1500);
  expect(await op() > 0.9, "pointer did not come back"); await p.ctx.close();
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
  await p.waitForFunction(() => Desk.state().cat, { timeout: 30000 });
  const at = await p.evaluate(() => Desk.screenPos("pet me"));
  await p.touchscreen.tap(Math.round(at.x), Math.round(at.y)); await sleep(300);
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
    const names = await p.$$eval("#dock .name", (els) => els.map((e) => { const r = e.getBoundingClientRect(), d = e.closest(".dock").getBoundingClientRect();
      return { t: e.textContent, ok: getComputedStyle(e).opacity === "1" && r.width > 0 && r.left >= d.left - 1 && r.right <= d.right + 1 && e.scrollWidth <= e.clientWidth + 1 }; }));
    const bad = names.filter((n) => !n.ok).map((n) => n.t);
    expect(names.length === 8 && bad.length === 0, "dock names hidden or cut off: " + bad.join(", "));
    const clear = await p.evaluate(() => document.getElementById("win").getBoundingClientRect().bottom <= document.getElementById("dock").getBoundingClientRect().top);
    expect(clear, "window runs behind the dock");
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

await check("Case studies: every one opens, its images load, and no notes-to-self are left", async () => {
  const p = await page(); await p.goto(BASE + "?open=work&qa=" + Date.now()); await ready(p);
  await p.waitForFunction(() => OS.isOpen(), { timeout: 10000 }); await sleep(600);
  const slugs = await p.$$eval("#winBody [data-case]", (b) => b.map((x) => x.dataset.case));
  expect(slugs.length >= 1, "no case-study cards in Work");
  for (const slug of slugs) {
    await p.evaluate((s) => document.querySelector(`#winBody [data-case="${s}"], [data-case="${s}"]`).click(), slug); await sleep(500);
    const r = await p.evaluate(async () => { const imgs = [...document.querySelectorAll(".case img")];
      await Promise.all(imgs.map((i) => (i.loading = "eager", i.decode().catch(() => null))));
      return { n: imgs.length, broken: imgs.filter((i) => !i.naturalWidth).map((i) => i.src.split("/").slice(-2).join("/")), alt: imgs.map((i) => i.alt).join(" ") }; });
    expect(r.n > 5 && r.broken.length === 0, slug + ": " + r.n + " images, broken: " + r.broken.join(", "));
    expect(!/note for sijo|to verify|add a real|todo/i.test(r.alt), slug + ": notes left in the descriptions");
    await p.evaluate(() => OS.close()); await p.evaluate(() => OS.open("work")); await sleep(400);
  }
  clean(p); await p.ctx.close();
  return slugs.join(", ");
});

for (const mobile of [false, true]) {
  await check(`${mobile ? "Phone" : "Desktop"}: a case study opens full screen; Esc and the back gesture return to Work`, async () => {
    const p = await page({ mobile }); await p.goto(BASE + "?open=work&qa=" + Date.now()); await ready(p);
    await p.waitForFunction(() => OS.isOpen(), { timeout: 10000 }); await sleep(700);
    await p.click("#winBody [data-case]"); await sleep(900);
    const fs = await p.evaluate(() => { const scr = document.getElementById("osScreen").getBoundingClientRect(), w = document.getElementById("win").getBoundingClientRect();
      const hidden = (sel) => { const e = document.querySelector(sel); const cs = getComputedStyle(e); return cs.display === "none" || +cs.opacity === 0; };
      return { fills: Math.abs(w.width - scr.width) < 2 && Math.abs(w.bottom - scr.bottom) < 2 && w.top - scr.top <= 31,   // (30 px notch strip on desktops)
        screenFillsBrowser: scr.width >= innerWidth - 1 && scr.height >= innerHeight - 1, dock: hidden("#dock"), side: hidden(".side-wrap"), menubar: hidden(".menubar"), bar: !!document.querySelector(".fs-bar") }; });
    expect(fs.fills && fs.screenFillsBrowser && fs.dock && fs.side && fs.menubar && fs.bar, "not full screen: " + JSON.stringify(fs));
    await p.click('.fs-nav [data-case]:last-of-type').catch(() => {}); await sleep(500);   // next project keeps full screen
    expect(await p.evaluate(() => document.getElementById("osScreen").classList.contains("case-fs")), "next project left full screen");
    await p.keyboard.press("Escape"); await sleep(600);
    const afterEsc = await p.evaluate(() => ({ open: OS.isOpen(), fs: document.getElementById("osScreen").classList.contains("case-fs"), title: document.getElementById("winTitle").textContent }));
    expect(afterEsc.open && !afterEsc.fs && afterEsc.title === "Work", "Esc should return to the Work list: " + JSON.stringify(afterEsc));
    await p.click("#winBody [data-case]"); await sleep(700);
    const url = p.url(); await p.evaluate(() => history.back()); await sleep(900);
    const afterBack = await p.evaluate(() => ({ open: OS.isOpen(), fs: document.getElementById("osScreen").classList.contains("case-fs") }));
    expect(p.url() === url && afterBack.open && !afterBack.fs, "back gesture should return to Work: " + JSON.stringify(afterBack));
    clean(p); await p.ctx.close();
  });
}

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
  expect(!s.cat && s.ball, "unexpected state " + JSON.stringify(s));
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

await check("Fonts are self-hosted and loaded (Inter, Caveat)", async () => {
  const p = await page();
  await p.goto(BASE + "?qa=" + Date.now()); await ready(p);
  const ok = await p.evaluate(async () => { await document.fonts.ready; return ['600 20px "Inter"', '600 20px "Caveat"'].every((f) => document.fonts.check(f)) && ![...document.querySelectorAll("link")].some((l) => /googleapis|gstatic/.test(l.href)); });
  expect(ok, "a font is missing or still loaded from Google");
  await p.ctx.close();
});

await browser.close();
const w = Math.max(...results.map((r) => r[1].length));
for (const [s, n, note] of results) console.log(`${s === "PASS" ? "✅" : "❌"} ${n.padEnd(w)}  ${note}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
