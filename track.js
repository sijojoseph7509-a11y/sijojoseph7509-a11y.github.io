// Visitor stats with Umami Cloud (free Hobby plan; dashboard at cloud.umami.is, EU region). No cookies, nothing personal,
// and no third-party script: this file sends the counts itself, so the strict CSP only gains connect-src https://gateway.umami.is.
// The website ID is SITE.analytics in content.js (or data-id on this script tag on the standalone case pages).
//
// What it records (see the Umami dashboard):
//   pages   "/"                    someone opened sijo.work (country, city, device, browser, where they came from)
//           "/about", "/work", …   which Mac apps they opened
//           "/case/<slug>"         which case studies they opened
//           "/work/<slug>/"        the standalone case-study pages (shared links)
//   events  stayed-30s / -1min / -3min / -10min   time on the site with the tab visible (also gives Umami's visit time)
//           unlock, wrong-password, enter-desk, desk-<object>, play-mumbai-local, filter-*, view-*
//           case-<slug>-half / -end / -1min / -3min    how far and how long people read each case study
//           download-resume, click-linkedin, click-behance, click-github, click-email, copy-email, copy-link
//
// Tracked links: send a recruiter sijo.work/?ref=ather and that visit shows up under UTM source "ather".
// Not counted: localhost, headless browsers (QA), and any browser that once opened sijo.work/?notrack
// (Sijo's own devices; sijo.work/?notrack=0 turns counting back on).
// Testing: localStorage.sjTrackDebug = 1 logs every count to the console instead of sending it.
(() => {
  const API = "https://gateway.umami.is/api/send";
  const S = window.SITE || {};
  const raw = S.analytics || (document.currentScript && document.currentScript.dataset.id) || "";
  const id = /^[0-9a-f-]{36}$/.test(raw) ? raw : "";
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
  const off = !debug && (!id || store("sjNoTrack") || navigator.webdriver || /^(localhost|127\.|\[::1\]|0\.0\.0\.0)/.test(location.hostname));
  let outside = document.referrer && !document.referrer.startsWith(location.origin) ? document.referrer : "";
  let cache, path = location.pathname;

  function send(p, title, name, data) {
    if (off) return;
    const payload = { website: id, hostname: location.hostname, screen: screen.width + "x" + screen.height, language: navigator.language,
      title: title || document.title, url: location.origin + p + (ref ? "?utm_source=" + encodeURIComponent(ref) : ""), referrer: outside };
    if (name) { payload.name = name.slice(0, 50); if (data) payload.data = data; }
    if (debug) { console.debug("[count]", payload); return; }
    try {
      fetch(API, { method: "POST", keepalive: true, credentials: "omit", body: JSON.stringify({ type: "event", payload }),
        headers: { "Content-Type": "application/json", "x-umami-website-id": id, "x-umami-hostname": location.hostname, ...(cache ? { "x-umami-cache": cache } : {}) } })
        .then((r) => r.json()).then((j) => { if (j && j.cache) cache = j.cache; }).catch(() => {});
    } catch (_) {}
  }
  const done = new Set();
  const SJT = {
    view: (p, title) => { path = p; send(p, title); outside = ""; },        // the outside referrer counts once, on the first page
    event: (name, data) => send(path, "", name, data),
    once: (name) => { if (!done.has(name)) { done.add(name); SJT.event(name); } }
  };
  window.SJT = SJT;

  SJT.view(location.pathname, document.title);
  // time on the site, counted only while the tab is visible
  let seen = 0;
  const marks = [[30, "stayed-30s"], [60, "stayed-1min"], [180, "stayed-3min"], [600, "stayed-10min"]];
  const tick = setInterval(() => {
    if (document.visibilityState !== "visible") return;
    seen += 5; marks.forEach(([s, n]) => { if (seen >= s) SJT.once(n); });
    if (seen >= 600) clearInterval(tick);
  }, 5000);
  document.addEventListener("click", (e) => {
    const t = e.target.closest && e.target.closest("a, button");
    if (!t) return;
    const href = t.getAttribute("href") || "";
    if (t.id === "introGo" || t.id === "introSound" || t.id === "introWork") SJT.once("enter-desk");
    else if (/\.pdf($|\?)/i.test(href)) SJT.event("download-resume");
    else if (/linkedin\.com/.test(href)) SJT.event("click-linkedin");
    else if (/behance\.net/.test(href)) SJT.event("click-behance");
    else if (/github\.com/.test(href)) SJT.event("click-github");
    else if (/^mailto:/.test(href)) SJT.event("click-email");
    else if (t.matches("[data-copy-email]")) SJT.event("copy-email");
    else if (t.matches("[data-share]")) SJT.event("copy-link");
  }, true);
})();
