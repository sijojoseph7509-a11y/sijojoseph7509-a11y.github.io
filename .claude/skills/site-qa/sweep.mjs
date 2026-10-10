// Bug sweep: opens the site on many real device sizes and flags layout bugs the eye catches —
// controls off-screen, text cut off, overlapping controls, missing wallpaper/models, errors — and saves
// a screenshot of every screen for a visual pass.
//   QA_DEPS=<dir with puppeteer-core> node .claude/skills/site-qa/sweep.mjs [baseURL] [outDir]
import { createRequire } from "module";
import fs from "fs";
const require = createRequire(import.meta.url);
const puppeteer = require(require.resolve("puppeteer-core", { paths: [process.env.QA_DEPS || process.cwd(), process.cwd()] }));
const BASE = (process.argv[2] || "http://localhost:4321/").replace(/\/?$/, "/");
// password gate (gate.js): tests start unlocked, as a visitor who already entered the password. Keep in sync with gate.js HASH.
const GATE_HASH = "1242c393c539cf38364f807ab0a916199da4fb071ee17fe9349ddfe853e39f89";
const OUT = process.argv[3] || "sweep-shots";
fs.mkdirSync(OUT, { recursive: true });
const DEVICES = [
  ["iPhone SE", 375, 667, 2, true], ["iPhone 15", 393, 852, 3, true], ["iPhone 15 Pro Max", 430, 932, 3, true],
  ["Small Android", 360, 740, 3, true], ["iPhone landscape", 852, 393, 3, true], ["iPad", 820, 1180, 2, true],
  ["Very narrow window", 294, 602, 2, false], ["Narrow browser window", 600, 1000, 2, false], ["iPad landscape", 1180, 820, 2, true], ["iPad Pro portrait", 1024, 1366, 2, true],
  ["Small laptop", 1280, 720, 1, false], ["Windows laptop", 1366, 768, 1, false], ["MacBook", 1470, 956, 2, false], ["MacBook Pro 16", 1728, 1117, 2, false],
  ["Desktop", 1920, 1080, 1, false], ["QHD monitor", 2560, 1440, 1, false], ["Ultrawide monitor", 3440, 1440, 1, false], ["4K monitor", 3840, 2160, 1, false]
];
// fixed UI that must be fully on screen and must not overlap each other
const CHECKS = {
  desk: [".hud-left", ".hud-right", ".topnav", ".hint", ".skip", "#coach"],
  mac: [".menubar", "#win", "#dock", "#clock", ".win-bar", ".lights", "#menubar", ".mb-right", ".notch", ".widget", ".fs-bar .fs-title"]
};
const browser = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal"] });
const issues = [];
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function inspect(p, dev, view) {
  const res = await p.evaluate((sels) => {
    const vw = innerWidth, vh = innerHeight, out = [], rects = [];
    const visible = (e) => { if (!e || e.hidden) return false; const cs = getComputedStyle(e); if (cs.display === "none" || cs.visibility === "hidden") return false; for (let x = e; x; x = x.parentElement) if (+getComputedStyle(x).opacity < 0.05) return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
    for (const s of sels) {
      const e = document.querySelector(s); if (!visible(e)) continue;
      const r = e.getBoundingClientRect();
      if (r.left < -1 || r.top < -1 || r.right > vw + 1 || r.bottom > vh + 1) out.push(`${s} is partly off-screen (${Math.round(r.left)},${Math.round(r.top)} → ${Math.round(r.right)},${Math.round(r.bottom)} on ${vw}×${vh})`);
      rects.push([s, r]);
    }
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      const [a, ra] = rects[i], [b, rb] = rects[j];
      const nested = document.querySelector(a).contains(document.querySelector(b)) || document.querySelector(b).contains(document.querySelector(a));
      const ox = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left), oy = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      const by_design = [a, b].sort().join("|") === ".menubar|.notch";   // the notch sits in the menu bar, as on a MacBook
      if (!nested && !by_design && ox > 2 && oy > 2) out.push(`${a} overlaps ${b}`);
    }
    // text that is cut off (ellipsis / clipped) in visible buttons, labels and pills
    for (const e of document.querySelectorAll("button, a, .hint, .name, .chip, .side-item, #clock, .win-title, .coach span, .intro-tips span")) {
      if (!visible(e)) continue;
      const cs = getComputedStyle(e);
      if (e.scrollWidth > e.clientWidth + 2 && cs.overflowX !== "auto" && cs.overflowX !== "scroll" && !e.closest(".sidebar")) out.push(`text cut off: "${(e.textContent || "").trim().slice(0, 40)}"`);
    }
    if (document.documentElement.scrollWidth > vw + 1) out.push("page scrolls sideways (something is wider than the screen)");
    return out;
  }, CHECKS[view]);
  return res.map((m) => `${dev} · ${view}: ${m}`);
}
for (const [name, w, h, dpr, mobile] of DEVICES) {
  const ctx = await browser.createBrowserContext(); const p = await ctx.newPage(); await p.evaluateOnNewDocument((h) => { try { localStorage.setItem("gate", h); } catch (_) {} }, GATE_HASH);
  await p.setViewport({ width: w, height: h, deviceScaleFactor: dpr, isMobile: mobile, hasTouch: mobile });
  const errs = []; p.on("pageerror", (e) => errs.push(e.message)); p.on("console", (m) => { if (m.type() === "error") errs.push(m.text()); });
  p.on("response", (r) => { if (r.status() >= 400) errs.push(r.status() + " " + r.url()); });
  const slug = name.replace(/\W+/g, "-").toLowerCase();
  try {
    await p.goto(BASE + "?sweep=" + Date.now());
    await p.waitForFunction(() => window.Desk && Desk.state().started, { timeout: 60000 });
    await p.screenshot({ path: `${OUT}/${slug}-1-welcome.png` });
    issues.push(...(await p.evaluate(() => { const b = document.getElementById("introQuiet").getBoundingClientRect(); return b.bottom > innerHeight ? ["welcome card runs off the bottom"] : []; })).map((m) => `${name} · welcome: ${m}`));
    await p.click("#introGo");
    await p.waitForFunction(() => { const s = Desk.state(); return s.cat && s.ball && !s.catBusy; }, { timeout: 30000 }).catch(() => issues.push(`${name}: a 3D model didn't appear (or Shea never settled on the desk)`));
    await sleep(1800);
    await p.screenshot({ path: `${OUT}/${slug}-2-desk.png` });
    issues.push(...await inspect(p, name, "desk"));
    const off = await p.evaluate(() => Desk.offscreen().filter((l) => !/Kick|About me|the (sun|night) in|One Piece prints/.test(l)));
    if (off.length) issues.push(`${name} · desk: not on screen: ${off.join(", ")}`);
    await p.evaluate(() => window.OS.open("work")); await sleep(1400);
    await p.screenshot({ path: `${OUT}/${slug}-3-mac.png` });
    issues.push(...await inspect(p, name, "mac"));
    const wall = await p.evaluate(async () => { const bg = getComputedStyle(document.getElementById("osScreen")).backgroundImage; const m = bg.match(/url\("([^"]+)"\)/); if (!m) return "no wallpaper set"; const r = await fetch(m[1]); return r.ok ? "" : "wallpaper " + r.status; });
    if (wall) issues.push(`${name} · mac: ${wall}`);
    await p.evaluate(() => { document.getElementById("win").hidden = true; }); await sleep(300);
    await p.screenshot({ path: `${OUT}/${slug}-4-wallpaper.png` });
    for (const cs of await p.evaluate(() => window.SITE.projects.filter((x) => x.case).map((x) => x.case.slug))) {
      await p.goto(BASE + "?open=case:" + cs + "&sweep=" + Date.now());
      await p.waitForFunction(() => { const im = document.querySelector(".case img"); return im && im.complete && im.naturalWidth > 0; }, { timeout: 60000 }).catch(() => issues.push(`${name} · ${cs}: case study did not open`));
      await sleep(900);
      await p.screenshot({ path: `${OUT}/${slug}-5-case-${cs}.png` });
      issues.push(...(await inspect(p, name, "mac")).map((m) => m.replace("· mac:", `· case ${cs}:`)));
      const bad = await p.evaluate(() => { const c = document.querySelector(".case"), r = c.getBoundingClientRect(), out = [];
        if (r.width > 1921) out.push("case column wider than 1920 px"); if (r.width < innerWidth - 2 && Math.abs(r.left - (innerWidth - r.right)) > 2) out.push("case column not centred");
        const im = c.querySelector("img"); const px = /@2x/.test(im.currentSrc) ? 2880 : 1440; if (px < r.width * Math.min(devicePixelRatio, 2) * 0.95) out.push(`blurry: ${px} px file shown ${Math.round(r.width)} px wide at ${devicePixelRatio}×`);
        return out; });
      issues.push(...bad.map((m) => `${name} · case ${cs}: ${m}`));
    }
  } catch (e) { issues.push(`${name}: ${e.message.split("\n")[0]}`); }
  for (const e of errs) issues.push(`${name} · error: ${e}`);
  await ctx.close();
}
await browser.close();
console.log(issues.length ? issues.map((i) => "❌ " + i).join("\n") : "✅ no layout bugs found on " + DEVICES.length + " devices");
console.log(`screenshots: ${OUT}/`);
process.exit(issues.length ? 1 : 0);
