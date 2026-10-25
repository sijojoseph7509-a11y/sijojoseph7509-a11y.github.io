// Records the 15-second reels (tools/reels/reel.html?p=<slug>) into work/<slug>/fx/reel.mp4 (1600 × 900), reel-540.mp4 (960 × 540)
// and reel-poster.webp. Chrome's screencast (2x) gives timestamped frames; tools/handovo/frames2mp4.swift encodes them (no ffmpeg).
//   QA_DEPS=<dir with puppeteer-core> node tools/reels/record.mjs http://localhost:4321/ handovo carekin ekmaati syntra
import { createRequire } from "module"; import fs from "fs"; import os from "os"; import { execFileSync } from "child_process";
const require = createRequire(process.env.QA_DEPS + "/"); const pp = require("puppeteer-core");
const [base, ...slugs] = process.argv.slice(2), tmp = fs.mkdtempSync(os.tmpdir() + "/reel-");
const F2M = `${tmp}/frames2mp4`; execFileSync("swiftc", ["-O", "tools/handovo/frames2mp4.swift", "-o", F2M], { stdio: "ignore" });
const b = await pp.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--autoplay-policy=no-user-gesture-required"] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const slug of slugs) {
  const p = await b.newPage(); await p.setViewport({ width: 1440, height: 810, deviceScaleFactor: 2 });
  await p.goto(`${base}tools/reels/reel.html?p=${slug}`, { waitUntil: "networkidle0", timeout: 90000 });
  await p.evaluate(() => window.ready); await wait(400);
  const dur = await p.evaluate(() => window.DURATION) / 1000;
  const frames = [], cdp = await p.createCDPSession();
  cdp.on("Page.screencastFrame", async (f) => { frames.push({ t: f.metadata.timestamp, data: f.data }); try { await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }); } catch (_) {} });
  await cdp.send("Page.startScreencast", { format: "jpeg", quality: 92, maxWidth: 2880, maxHeight: 1620 });
  await wait(400); const t0 = Date.now() / 1000; await p.evaluate(() => window.start()); await wait(dur * 1000 + 300);
  await cdp.send("Page.stopScreencast"); await p.close();
  const dir = `${tmp}/${slug}`; fs.mkdirSync(dir); let list = "";
  const fr = frames.sort((a, c) => a.t - c.t), k0 = Math.max(0, fr.findLastIndex((f) => f.t <= t0)), use = fr.slice(k0);
  use.forEach((f, k) => { const fn = `${dir}/${String(k).padStart(5, "0")}.jpg`; fs.writeFileSync(fn, Buffer.from(f.data, "base64")); list += `${fn}\t${(Math.max(f.t, t0) - t0).toFixed(4)}\n`; });
  fs.writeFileSync(`${dir}.tsv`, list);
  const out = `work/${slug}/fx`;
  execFileSync(F2M, [`${dir}.tsv`, `${out}/reel.mp4`, "0", dur.toFixed(2), "1600", "900"]);
  execFileSync(F2M, [`${dir}.tsv`, `${out}/reel-540.mp4`, "0", dur.toFixed(2), "960", "540"]);
  const at = use.find((f) => f.t - t0 >= 1.6) || use[0];   // poster: the first beat with its caption in
  fs.writeFileSync(`${tmp}/poster.jpg`, Buffer.from(at.data, "base64"));
  execFileSync("python3", ["-c", `from PIL import Image\nim=Image.open("${tmp}/poster.jpg").convert("RGB").resize((1600,900),Image.LANCZOS)\nim.save("${out}/reel-poster.webp",quality=80)`]);
  console.log(slug, use.length, "frames,", ["reel.mp4", "reel-540.mp4"].map((f) => f + " " + Math.round(fs.statSync(`${out}/${f}`).size / 1024) + " KB").join(", "));
}
await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
