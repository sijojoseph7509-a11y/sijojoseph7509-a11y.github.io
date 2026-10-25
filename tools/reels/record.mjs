// Renders the 15-second reels frame by frame (v191): tools/reels/reel.html?p=<slug> is seeked to every 40 ms (25 fps) and each
// frame is captured losslessly-ish (JPEG 96) at 1920 × 1080, then tools/handovo/frames2mp4.swift encodes (no ffmpeg):
// work/<slug>/fx/reel.mp4 (1920 × 1080), reel-540.mp4 (phones, 1280 × 720), reel-poster.webp.
//   QA_DEPS=<dir with puppeteer-core> node tools/reels/record.mjs http://localhost:4321/ handovo carekin ekmaati syntra
import { createRequire } from "module"; import fs from "fs"; import os from "os"; import { execFileSync } from "child_process";
const require = createRequire(process.env.QA_DEPS + "/"); const pp = require("puppeteer-core");
const [base, ...slugs] = process.argv.slice(2), tmp = fs.mkdtempSync(os.tmpdir() + "/reel-"), FPS = 25;
const F2M = `${tmp}/frames2mp4`; execFileSync("swiftc", ["-O", "tools/handovo/frames2mp4.swift", "-o", F2M], { stdio: "ignore" });
const b = await pp.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new" });
for (const slug of slugs) {
  const p = await b.newPage(); await p.setViewport({ width: 1920, height: 1080, deviceScaleFactor: 1 });
  await p.goto(`${base}tools/reels/reel.html?p=${slug}`, { waitUntil: "networkidle0", timeout: 90000 }); await p.evaluate(() => window.ready);
  const D = await p.evaluate(() => window.D), n = Math.round(D / 1000 * FPS), cdp = await p.createCDPSession(), dir = `${tmp}/${slug}`; fs.mkdirSync(dir); let list = "";
  for (let f = 0; f < n; f++) {
    await p.evaluate((t) => window.seek(t), f * 1000 / FPS);
    const { data } = await cdp.send("Page.captureScreenshot", { format: "jpeg", quality: 96 });
    const fn = `${dir}/${String(f).padStart(5, "0")}.jpg`; fs.writeFileSync(fn, Buffer.from(data, "base64")); list += `${fn}\t${(f / FPS).toFixed(4)}\n`;
  }
  await p.close(); fs.writeFileSync(`${dir}.tsv`, list);
  const out = `work/${slug}/fx`, dur = (n / FPS).toFixed(2);
  execFileSync(F2M, [`${dir}.tsv`, `${out}/reel.mp4`, "0", dur, "1920", "1080"], { env: { ...process.env, BPP: "0.045" } });
  execFileSync(F2M, [`${dir}.tsv`, `${out}/reel-540.mp4`, "0", dur, "1280", "720"], { env: { ...process.env, BPP: "0.05" } });
  const poster = `${dir}/${String(Math.round(2.2 * FPS)).padStart(5, "0")}.jpg`;   // the title scene, fully in
  execFileSync("python3", ["-c", `from PIL import Image\nImage.open("${poster}").convert("RGB").save("${out}/reel-poster.webp",quality=84)`]);
  if (process.env.SHEET) fs.cpSync(dir, `${process.env.SHEET}/${slug}`, { recursive: true });   // keep frames for review
  console.log(slug, n, "frames,", ["reel.mp4", "reel-540.mp4"].map((f) => f + " " + Math.round(fs.statSync(`${out}/${f}`).size / 1024) + " KB").join(", "));
}
await b.close(); fs.rmSync(tmp, { recursive: true, force: true });
