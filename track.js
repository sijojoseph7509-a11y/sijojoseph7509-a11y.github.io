// Visit counting with GoatCounter (goatcounter.com): no cookies, no personal data, no third-party script.
// Each count is a tiny image request to https://<code>.goatcounter.com/count, so the strict CSP stays as it is
// (only img-src allows *.goatcounter.com).
//
// What it records (see the GoatCounter dashboard):
//   pages   "/"                    someone opened sijo.work
//           "/about", "/work", …   which Mac apps they opened
//           "/case/<slug>"         which case studies they opened
//   events  case-<slug>-half / -end     scrolled 50% / to the end of a case study
//           case-<slug>-1min / -3min    still reading it after 1 and 3 minutes
//           enter-desk, click-linkedin, click-behance, click-github, click-email, copy-email, copy-link
//
// Tracked links: send a recruiter sijo.work/?ref=ather and that visit shows up under the campaign "ather".
// Not counted: localhost, headless browsers (QA), and any browser that once opened sijo.work/?notrack
// (Sijo's own devices; sijo.work/?notrack=0 turns counting back on).
// Testing: localStorage.sjTrackDebug = 1 logs every count to the console instead of sending it.
(() => {
  const S = window.SITE || {};
  const code = /^[a-z0-9-]{2,50}$/.test(S.analytics || "") ? S.analytics : "";
  const store = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); if (v) localStorage.setItem(k, v); else localStorage.removeItem(k); } catch (_) {} return null; };
  let ref = "";
  try {
    const q = new URLSearchParams(location.search);
    if (q.has("notrack")) store("sjNoTrack", q.get("notrack") === "0" ? "" : "1");
    const r = (q.get("ref") || q.get("utm_source") || "").replace(/[^\w.-]/g, "").slice(0, 40);
    if (r) sessionStorage.setItem("sjRef", r);
    ref = sessionStorage.getItem("sjRef") || "";
  } catch (_) {}
  const debug = !!store("sjTrackDebug");
  const off = !debug && (!code || store("sjNoTrack") || navigator.webdriver || /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname));
  const outside = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : "";

  function send(path, title, event) {
    if (off) return;
    const p = new URLSearchParams({ p: path, t: title || "", r: outside, s: [screen.width, screen.height, window.devicePixelRatio || 1].join(","), rnd: Math.random().toString(36).slice(2) });
    if (event) p.set("e", "true");
    if (ref) p.set("q", "?ref=" + ref);
    if (debug) { console.debug("[count]", Object.fromEntries(p)); return; }
    const img = new Image(); img.src = `https://${code}.goatcounter.com/count?${p}`;
  }
  const done = new Set();
  const SJT = {
    view: (path, title) => send(path, title, false),
    event: (name) => send(name, name, true),
    once: (name) => { if (!done.has(name)) { done.add(name); send(name, name, true); } }
  };
  window.SJT = SJT;

  SJT.view("/", document.title);
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("a, button");
    if (!t) return;
    const href = t.getAttribute("href") || "";
    if (t.id === "introGo" || t.id === "introSound") SJT.once("enter-desk");   // v158: introQuiet was renamed introSound
    else if (/linkedin\.com/.test(href)) SJT.event("click-linkedin");
    else if (/behance\.net/.test(href)) SJT.event("click-behance");
    else if (/github\.com/.test(href)) SJT.event("click-github");
    else if (/^mailto:/.test(href)) SJT.event("click-email");
    else if (t.matches("[data-copy-email]")) SJT.event("copy-email");
    else if (t.matches("[data-share]")) SJT.event("copy-link");
  }, true);
})();
