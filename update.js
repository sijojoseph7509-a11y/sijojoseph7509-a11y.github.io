// Self-update: phones often reopen a saved copy of this page. If a newer version has been
// published (version.json, never cached), load it. BUILD comes from this file's own ?v= (index.html).
(() => {
  const BUILD = (document.currentScript && new URL(document.currentScript.src).searchParams.get("v")) || "";
  const check = () => fetch("version.json?t=" + Date.now(), { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((v) => {
      if (!v || String(v.build) === BUILD || (window.OS && window.OS.isOpen())) return;
      const u = new URL(location.href);
      if (u.searchParams.get("v") === String(v.build)) return;              // already tried this exact version: never loop
      try { if (sessionStorage.getItem("updatedTo") === String(v.build)) return; sessionStorage.setItem("updatedTo", String(v.build)); } catch (_) {}
      u.searchParams.set("v", v.build);                                      // new URL → never served from cache
      location.replace(u.href);
    })
    .catch(() => {});
  check();
  addEventListener("pageshow", (e) => { if (e.persisted) check(); });                       // restored from back/forward cache
  // tab reopened after being away a while (not a quick app switch — never reload mid-interaction)
  let hiddenAt = 0;
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") hiddenAt = Date.now();
    else if (hiddenAt && Date.now() - hiddenAt > 60000) check();
  });
})();
