// Security audit for the portfolio site.
//   node .claude/skills/site-security/audit.mjs [baseURL] [--fix]
// Static checks (repo files) + runtime checks (headless Chrome, needs QA_DEPS with puppeteer-core).
// --fix: recompute the import-map hash in the CSP and the vendor integrity manifest after a deliberate change.
import fs from "fs"; import crypto from "crypto"; import path from "path"; import { createRequire } from "module";
const ROOT = process.cwd(), FIX = process.argv.includes("--fix");
const BASE = (process.argv.slice(2).find((a) => /^https?:/.test(a)) || "").replace(/\/?$/, "/");
// password gate (gate.js): tests start unlocked, as a visitor who already entered the password. Keep in sync with gate.js HASH.
const GATE_HASH = "1242c393c539cf38364f807ab0a916199da4fb071ee17fe9349ddfe853e39f89";
const results = []; const ok = (n, note = "") => results.push(["PASS", n, note]); const bad = (n, note) => results.push(["FAIL", n, note]);
const sha = (s) => crypto.createHash("sha256").update(s).digest("base64");
const read = (f) => fs.readFileSync(path.join(ROOT, f), "utf8");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.name.startsWith(".git") || e.name === "node_modules" ? [] : e.isDirectory() ? walk(path.join(d, e.name)) : [path.join(d, e.name)]);
let html = read("index.html");

// 1. Content Security Policy present, strict, and the import-map hash matches
const csp = (html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/) || [])[1];
if (!csp) bad("Content-Security-Policy meta tag", "missing");
else {
  const im = html.match(/<script type="importmap">([\s\S]*?)<\/script>/);
  const want = `'sha256-${sha(im[1])}'`;
  if (csp.includes(want)) ok("CSP: import-map hash matches");
  else if (FIX) { html = html.replace(/'sha256-[^']+'/, want); fs.writeFileSync(path.join(ROOT, "index.html"), html); ok("CSP: import-map hash updated (--fix)"); }
  else bad("CSP: import-map hash", "out of date — run with --fix after editing the import map");
  const scriptSrc = (csp.match(/script-src ([^;]+)/) || [])[1] || "";
  if (/unsafe-inline|unsafe-eval'|\*|https?:/.test(scriptSrc.replace("'wasm-unsafe-eval'", ""))) bad("CSP: script-src is strict", scriptSrc); else ok("CSP: script-src allows only this site", scriptSrc);
  for (const d of ["object-src 'none'", "base-uri 'self'", "form-action 'none'"]) csp.includes(d) ? ok("CSP: " + d) : bad("CSP: " + d, "missing");
}
// 2. No inline scripts other than the import map; no third-party script hosts
const inline = [...html.matchAll(/<script(?![^>]*\bsrc=)([^>]*)>/g)].filter((m) => !/importmap/.test(m[1]));
inline.length ? bad("no inline scripts", inline.length + " found — move them to a .js file") : ok("no inline scripts (besides the import map)");
const ext = [...html.matchAll(/(?:src|href)="(https?:\/\/[^"]+)"/g)].map((m) => new URL(m[1]).host);
ext.length ? bad("only first-party code + Google Fonts", "external: " + [...new Set(ext)].join(", ")) : ok("only first-party code + Google Fonts");
// 3. Vendored three.js matches the recorded hashes (detects tampering / accidental edits)
const MAN = ".claude/skills/site-security/vendor-hashes.json";
const vend = walk(path.join(ROOT, "vendor")).map((f) => path.relative(ROOT, f)).sort();
const now = Object.fromEntries(vend.map((f) => [f, sha(fs.readFileSync(path.join(ROOT, f)))]));
if (!fs.existsSync(path.join(ROOT, MAN)) || FIX) { fs.writeFileSync(path.join(ROOT, MAN), JSON.stringify(now, null, 1)); ok("vendor hashes recorded", vend.length + " files"); }
else { const was = JSON.parse(read(MAN)); const diff = [...new Set([...Object.keys(was), ...Object.keys(now)])].filter((f) => was[f] !== now[f]);
  diff.length ? bad("vendored three.js unchanged", "changed: " + diff.join(", ") + " (if you upgraded deliberately, run --fix)") : ok("vendored three.js unchanged", vend.length + " files"); }
// 4. No secrets committed
const SECRET = /(AKIA[0-9A-Z]{16}|AIza[0-9A-Za-z_\-]{35}|ghp_[0-9A-Za-z]{36}|github_pat_\w{40,}|sk-[A-Za-z0-9]{32,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[baprs]-[0-9A-Za-z-]{10,})/;
const text = walk(ROOT).filter((f) => /\.(js|mjs|html|css|json|md|txt|yml|yaml|env)$/.test(f) && !f.includes("/vendor/"));
const leaks = text.filter((f) => SECRET.test(fs.readFileSync(f, "utf8"))).map((f) => path.relative(ROOT, f));
leaks.length ? bad("no secrets / API keys in the repo", leaks.join(", ")) : ok("no secrets / API keys in the repo", text.length + " files scanned");
// 5. Links: new-tab links use rel=noopener; content links pass through safeUrl()
const src = ["os.js", "main.js", "index.html"].map((f) => [f, read(f)]);
const blank = src.flatMap(([f, s]) => [...s.matchAll(/<a [^>]*target="_blank"[^>]*>/g)].filter((m) => !/noopener/.test(m[0])).map(() => f));
blank.length ? bad('target="_blank" links use rel="noopener"', blank.join(", ")) : ok('target="_blank" links use rel="noopener"');
const os = read("os.js");
const raw = [...os.matchAll(/href="\$\{([^}]+)\}"/g)].map((m) => m[1]).filter((e) => !/safeUrl\(/.test(e));
raw.length ? bad("content links are scheme-checked (safeUrl)", raw.join(" | ")) : ok("content links are scheme-checked (safeUrl)");
// 6. innerHTML templates escape content (every ${…} inside an HTML template should go through esc()/safeUrl()/a known helper)
const unescaped = [...os.matchAll(/\$\{((?:S|p|g|e|it|a)\.[\w.]+)\}/g)].map((m) => m[1]).filter((x) => !/\.(length|key)$/.test(x));   // a bare \${S.name} etc. (not wrapped in esc())
unescaped.length ? bad("site content is HTML-escaped", unescaped.join(", ")) : ok("site content is HTML-escaped");

// 7. Runtime: policy enforced, injected scripts blocked, no unexpected hosts, HTTPS
if (BASE) {
  const require = createRequire(import.meta.url);
  const puppeteer = require(require.resolve("puppeteer-core", { paths: [process.env.QA_DEPS || ROOT, ROOT] }));
  const b = await puppeteer.launch({ executablePath: process.env.CHROME || "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--use-angle=metal"] });
  const p = await b.newPage(); const hosts = new Set(); const viol = []; await p.evaluateOnNewDocument((h) => { try { localStorage.setItem("gate", h); } catch (_) {} }, GATE_HASH);
  p.on("request", (r) => { const u = new URL(r.url()); if (/^https?:$/.test(u.protocol)) hosts.add(u.host); });
  await p.exposeFunction("__viol", (v) => viol.push(v));
  await p.evaluateOnNewDocument(() => document.addEventListener("securitypolicyviolation", (e) => window.__viol(e.violatedDirective + " " + e.blockedURI)));
  await p.goto(BASE + "?sec=" + Date.now()); await p.waitForFunction(() => window.Desk && Desk.state().started, { timeout: 60000 });
  if (await p.$("#introGo")) await p.click("#introGo").catch(() => {});
  await new Promise((r) => setTimeout(r, 2500));
  viol.length ? bad("site runs with no policy violations", viol.join(" | ")) : ok("site runs with no policy violations");
  const site = new URL(BASE).host, extra = [...hosts].filter((h) => h !== site);
  extra.length ? bad("only talks to its own server + Google Fonts", extra.join(", ")) : ok("only talks to its own server + Google Fonts", [...hosts].join(", "));
  const blocked = await p.evaluate(async () => { window.__x = 0; const s = document.createElement("script"); s.textContent = "window.__x=1"; document.head.appendChild(s);
    const e = document.createElement("script"); e.src = "https://example.com/x.js"; document.head.appendChild(e); await new Promise((r) => setTimeout(r, 600)); return window.__x === 0; });
  blocked ? ok("injected scripts are blocked") : bad("injected scripts are blocked", "an injected inline script ran");
  if (BASE.startsWith("https://")) { const r = await fetch(BASE.replace("https://", "http://"), { redirect: "manual" }); [301, 302, 307, 308].includes(r.status) ? ok("HTTP redirects to HTTPS") : bad("HTTP redirects to HTTPS", "status " + r.status); }
  await b.close();
}
const w = Math.max(...results.map((r) => r[1].length));
for (const [s, n, note] of results) console.log(`${s === "PASS" ? "✅" : "❌"} ${n.padEnd(w)}  ${note}`);
const failed = results.filter((r) => r[0] === "FAIL").length;
console.log(`\n${results.length - failed}/${results.length} security checks passed`);
process.exit(failed ? 1 : 0);
