// The desktop that opens when the 3D laptop boots — a macOS-style experience:
// menu bar with real menus, a window with sidebar + unified toolbar, Spotlight search, dock, shortcuts.
(() => {
  const S = window.SITE;
  const $ = (s) => document.querySelector(s);
  // Security: links from content.js may only be web or email links — never "javascript:" or other schemes
  const safeUrl = (u) => (/^(https?:\/\/|mailto:)/i.test(String(u || "").trim()) ? String(u).trim() : "#");
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const isMac = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
  const MOD = isMac ? "⌘" : "Ctrl+";

  // Sidebar line icons (original), 24px grid
  const LINE = {
    about:   '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c.8-3.6 4-6 8-6s7.2 2.4 8 6" />',
    work:    '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
    skills:  '<path d="M12 3l2.4 5.4L20 9l-4.3 3.9L17 19l-5-3-5 3 1.3-6.1L4 9l5.6-.6z"/>',
    resume:  '<path d="M7 3h7l5 5v11.5A1.5 1.5 0 0 1 17.5 21h-10A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7.5 3zM14 3v5h5M9 13h6M9 17h6"/>',
    contact: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>'
  };
  const line = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${LINE[k]}</svg>`;

  // App icons in the macOS style (original designs): solid white glyph on a layered gradient squircle
  // v93: calmer, Apple-like glyphs: one clear shape per app, white on a softly lit tile (no gloss)
  const GLYPH = {
    about:   '<circle cx="12" cy="8.6" r="3.9" fill="#fff"/><path d="M4.6 19.6c.8-3.7 3.8-5.9 7.4-5.9s6.6 2.2 7.4 5.9c.1.5-.3.9-.8.9H5.4c-.5 0-.9-.4-.8-.9z" fill="#fff"/>',
    work:    '<path d="M9 6.6V5.4c0-.9.7-1.6 1.6-1.6h2.8c.9 0 1.6.7 1.6 1.6v1.2" fill="none" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/><rect x="3.2" y="6.6" width="17.6" height="12.8" rx="2.4" fill="#fff"/><path d="M3.2 11.6h17.6" stroke="rgba(214,120,0,.35)" stroke-width="1.1"/>',
    skills:  '<path d="M10.2 3.6l1.7 4.9 4.9 1.7-4.9 1.7-1.7 4.9-1.7-4.9-4.9-1.7 4.9-1.7z" fill="#fff"/><path d="M17.4 13.6l.85 2.35 2.35.85-2.35.85-.85 2.35-.85-2.35-2.35-.85 2.35-.85z" fill="#fff" opacity=".9"/>',
    resume:  '<path d="M7 3h6.6L18 7.4v12.2c0 .8-.6 1.4-1.4 1.4H7c-.8 0-1.4-.6-1.4-1.4V4.4C5.6 3.6 6.2 3 7 3z" fill="#fff" stroke="#c7c7cc" stroke-width=".8"/><path d="M13.6 3v3.6c0 .5.4.8.8.8H18" fill="none" stroke="#c7c7cc" stroke-width=".8"/><path d="M8.4 11.2h7.2M8.4 14h7.2M8.4 16.8h4.6" stroke="#0a84ff" stroke-width="1.3" stroke-linecap="round"/>',
    contact: '<rect x="3.2" y="5.6" width="17.6" height="12.8" rx="2.2" fill="#fff"/><path d="M4.4 7.2l7.6 5.6 7.6-5.6" fill="none" stroke="#1f8cf9" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>',
    linkedin:'<path d="M6.3 9.5h2.8V18H6.3zM7.7 5.3a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zM10.8 9.5h2.7v1.2c.4-.7 1.4-1.4 2.8-1.4 3 0 3.5 1.9 3.5 4.4V18H17v-3.8c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2V18h-3.4z" fill="#fff"/>',
    behance: '<path d="M3.5 7h5c2.3 0 3.4 1 3.4 2.6 0 1.1-.6 1.8-1.4 2.1 1.1.3 1.9 1.2 1.9 2.5 0 2-1.6 2.8-3.7 2.8H3.5zm2.6 4h2.2c.8 0 1.2-.4 1.2-1s-.4-1-1.2-1H6.1zm0 4.1h2.4c.9 0 1.4-.4 1.4-1.1s-.5-1.1-1.4-1.1H6.1zM14.6 8h4.6v1.2h-4.6zM13.8 13.4c0-2.4 1.6-3.8 3.6-3.8 2.3 0 3.5 1.7 3.4 4.4h-4.6c.1 1.1.7 1.6 1.6 1.6.6 0 1.1-.3 1.3-.8h1.6c-.4 1.5-1.6 2.3-3 2.3-2.2 0-3.9-1.3-3.9-3.7zm4.7-.6c0-.8-.5-1.4-1.2-1.4-.8 0-1.3.6-1.4 1.4z" fill="#fff"/>',
    desk:    '<rect x="4.6" y="5.4" width="14.8" height="10" rx="1.4" fill="none" stroke="#fff" stroke-width="1.6"/><path d="M2.6 18.2h18.8" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>'
  };
  // one light source for every tile: a touch brighter at the top, the colour settling below
  const GRAD = {
    about:   "linear-gradient(180deg,#54a8ff,#0a7cf5)",
    work:    "linear-gradient(180deg,#ffbf47,#ff9a0a)",
    skills:  "linear-gradient(180deg,#c784ff,#9b4dff)",
    resume:  "linear-gradient(180deg,#ffffff,#eceef2)",
    contact: "linear-gradient(180deg,#5cc8ff,#1a8cff)",
    linkedin:"linear-gradient(180deg,#1f7fd6,#0a66c2)",
    behance: "linear-gradient(180deg,#2f7bff,#1361f0)",
    desk:    "linear-gradient(180deg,#5c5c61,#2c2c2e)"
  };
  const appIcon = (k, cls = "app") => `<span class="${cls}" style="background:${GRAD[k]}"><svg viewBox="0 0 24 24" aria-hidden="true">${GLYPH[k]}</svg></span>`;

  // discipline glyphs (original line icons) and tool logos (icons.js: Simple Icons, CC0 data)
  const DISC = {
    product: '<rect x="7" y="2.5" width="10" height="19" rx="2.6"/><path d="M10.5 18.5h3"/>',
    brand: '<path d="M12 3l7 7-7 11L5 10z"/><path d="M5 10h14M12 3v18"/>',
    experience: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h6a3 3 0 0 0 0-6h-4a3 3 0 0 1 0-6h6"/>',
    threed: '<path d="M12 2.8l8 4.6v9.2l-8 4.6-8-4.6V7.4z"/><path d="M4 7.4l8 4.6 8-4.6M12 12v9.2"/>',
    ai: '<path d="M10 3.5l1.6 4.6 4.6 1.6-4.6 1.6L10 15.9l-1.6-4.6-4.6-1.6 4.6-1.6z"/><path d="M17.5 13.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'
  };
  const discIcon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${DISC[k] || DISC.product}</svg>`;
  const toolIcon = (t) => {
    const ic = t.icon && window.TOOL_ICONS && window.TOOL_ICONS[t.icon];
    if (ic) return `<span class="tool-ico" style="--b:#${esc(ic.hex)}"><svg viewBox="0 0 24 24" role="img" aria-label="${esc(ic.name)} logo"><path d="${esc(ic.path)}"/></svg></span>`;
    return `<span class="tool-ico letter l-${esc(t.name.charAt(0))}" aria-hidden="true">${esc(t.name.charAt(0))}</span>`;
  };
  const apps = {
    about: {
      title: "About", key: "1",
      html: () => {
        const first = esc(S.name.split(" ")[0]), cases = S.projects.filter((x) => x.case);
        return `
        <section class="ab-hero">
          <div class="ab-photo"><img src="${esc(`assets/profile.jpg?v=${BUILD}`)}" alt="Portrait of ${esc(S.name)}" width="1200" height="1200" decoding="async"></div>
          <div class="ab-intro">
            <p class="eyebrow">${esc(S.focus)}${S.also ? " · " + esc(S.also) : ""}</p>
            <h1>Hi, I'm ${first}.</h1>
            <p class="lead">${esc(S.education)}. ${esc(S.seeking)}</p>
            <dl class="ab-facts">
              <div><dt>Role</dt><dd>${esc(S.focus)}${S.also ? "<br>" + esc(S.also) : ""}</dd></div>
              <div><dt>Studying</dt><dd>${esc(S.education)}</dd></div>
              <div><dt>Based in</dt><dd>${esc(S.location)}</dd></div>
            </dl>
            <div class="btn-row">
              <button class="btn" data-open="work">See my work</button>
              <button class="btn alt" data-open="contact">Get in touch</button>
              ${S.resumeUrl && S.resumeUrl !== "#" ? `<a class="btn alt" href="${esc(safeUrl(S.resumeUrl))}" target="_blank" rel="noopener">Resume</a>` : `<button class="btn alt" data-open="resume">Resume</button>`}
            </div>
          </div>
        </section>
        <h2 class="sec">Selected work</h2>
        <div class="ab-work">${cases.map((x) => `
          <button class="ab-proj" data-case="${esc(x.case.slug)}" aria-label="Open the ${esc(x.title)} case study">
            <img src="${caseImg(x.case.slug, (x.case.coverSlide || x.case.sections[0])[0])}" srcset="${caseImg(x.case.slug, (x.case.coverSlide || x.case.sections[0])[0])} 1440w, ${caseImg(x.case.slug, (x.case.coverSlide || x.case.sections[0])[0], 2)} 2880w" sizes="(max-width: 760px) 90vw, 360px" alt="" decoding="async">
            <span><b>${esc(x.title)}</b><small>${esc(x.tag)}</small></span>
          </button>`).join("")}
        </div>
        <div class="bento">
          <div class="tile story"><small>About me</small>${S.about.slice(0, 2).map((t) => `<p>${esc(t)}</p>`).join("")}</div>
          <div class="tile photo" style="background-image:url('${esc(`assets/wallpaper.jpg?v=${BUILD}`)}')"><div class="cap"><small>Away from the desk</small><p>${esc(S.about[3] || "")}</p></div></div>
          <div class="tile quote"><small>On my wall</small><p>${esc(S.about[2] || "")}</p></div>
          <button class="tile skills-tile" data-open="skills"><small>What I do</small>
            <span class="mini-disc">${S.skills.map((g) => `<span>${discIcon(g.icon)}${esc(g.group)}</span>`).join("")}</span>
            <span class="more">See skills and tools ›</span></button>
        </div>`;
      }
    },
    work: {
      title: "Work", key: "2",
      html: () => `
        <h1>Selected work</h1>
        <p class="sub">${S.projects.length} case studies across interaction, product, information design and branding.</p>
        <div class="works">${S.projects.map((p) => {
          const info = `<div class="wc-info"><small>${esc(p.tag)}${p.status ? " · " + esc(p.status) : ""}</small><b>${esc(p.title)}</b><p>${esc(p.summary)}</p><span class="more">${p.case ? "View case study ›" : "Case study coming soon"}</span></div>`;
          if (!p.case) return `<div class="work-card soon" style="--c:${esc(p.color)}">${info}</div>`;
          const [f, h] = p.case.coverSlide || p.case.sections[0];   // a project can give its own cover slide (Syntra)
          return `<button class="work-card" data-case="${esc(p.case.slug)}" style="--c:${esc(p.color)}" aria-label="Open the ${esc(p.title)} case study">
            <span class="wc-img"><img src="${caseImg(p.case.slug, f)}" srcset="${caseImg(p.case.slug, f)} 1440w, ${caseImg(p.case.slug, f, 2)} 2880w" sizes="(max-width: 760px) 92vw, 980px" width="1440" height="${+h}" alt="${esc(p.title)}: cover" decoding="async"></span>
            ${info}</button>`;
        }).join("")}
        </div>`
    },
    skills: {
      title: "Skills", key: "3",
      html: () => `
        <h1>What I do</h1>
        <p class="sub">${esc(S.focus)} and ${esc((S.also || "").toLowerCase())}, with a multidisciplinary toolkit behind it.</p>
        <div class="disc-grid">${S.skills.map((g, i) => `
          <div class="disc${i === 0 ? " primary" : ""}">
            <span class="disc-ico ${esc(g.icon || "")}">${discIcon(g.icon)}</span>
            <h4>${esc(g.group)}</h4>
            <p>${esc(g.desc || "")}</p>
            <ul class="chips">${g.items.map((it) => `<li class="chip">${esc(it)}</li>`).join("")}</ul>
          </div>`).join("")}
        </div>
        <h2 class="sec">Tools I use</h2>
        <ul class="tool-grid">${(S.tools || []).map((t) => `<li>${toolIcon(t)}<span>${esc(t.name)}</span></li>`).join("")}</ul>`
    },
    resume: {
      title: "Resume", key: "4",
      html: () => `
        <h1>Experience</h1>
        <p class="sub">${S.experience.length ? "Where I've worked and what I did there." : "My full work history is on my résumé. Ask and I'll send it over."}</p>
        ${S.experience.length ? `<ul class="list">${S.experience.map((e) => `
          <li><div><b>${esc(e.company)}</b><span>${esc(e.role)}</span></div><span class="yr">${esc(e.from)} – ${esc(e.to)}</span></li>`).join("")}
        </ul>` : ""}
        ${S.resumeUrl && S.resumeUrl !== "#" ? `<a class="btn" href="${esc(safeUrl(S.resumeUrl))}" target="_blank" rel="noopener">Download résumé</a>` : `<button class="btn alt" data-open="contact">Ask for my résumé</button>`}`
    },
    contact: {
      title: "Contact", key: "5",
      html: () => {
        const gh = window.TOOL_ICONS && window.TOOL_ICONS.github;
        const ghIcon = gh ? `<span class="app" style="background:linear-gradient(180deg,#3a3a3e,#1c1c1e)"><svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#fff" d="${esc(gh.path)}"/></svg></span>` : appIcon("desk");
        const tile = (href, icon, name, sub, ext) => `<a class="ct-tile" href="${esc(safeUrl(href))}"${ext ? ' target="_blank" rel="noopener"' : ""}><span class="ct-ico">${icon}</span><span class="ct-txt"><b>${esc(name)}</b><small>${esc(sub)}</small></span><span class="ct-go" aria-hidden="true">›</span></a>`;
        return `
        <div class="ct">
          <div class="ct-hero">
            <p class="eyebrow">Contact</p>
            <h1>Let's make something together.</h1>
            <p class="sub">${esc(S.seeking)} Brand, experience and vibe-coded projects are welcome too.</p>
            <p class="ct-status"><i></i>${esc(S.location)} · <span data-ist>${esc(istNow())}</span> IST</p>
          </div>
          <div class="ct-mail">
            <small>Email</small>
            <a class="big-link" href="${esc(safeUrl("mailto:" + S.email))}">${esc(S.email)}</a>
            <div class="btn-row">
              <a class="btn" href="${esc(safeUrl(S.links.mail))}">Send an email</a>
              <button class="btn alt" type="button" data-copy-email>Copy address</button>
            </div>
          </div>
          <div class="ct-grid">
            ${tile(S.links.linkedin, appIcon("linkedin"), "LinkedIn", "Work history and recommendations", true)}
            ${tile(S.links.behance, appIcon("behance"), "Behance", "More projects and visual work", true)}
            ${tile(S.links.github, ghIcon, "GitHub", "Code, including this website", true)}
            ${S.resumeUrl && S.resumeUrl !== "#" ? tile(S.resumeUrl, appIcon("resume"), "Résumé", "Download the PDF", true) : `<button class="ct-tile" type="button" data-open="resume"><span class="ct-ico">${appIcon("resume")}</span><span class="ct-txt"><b>Résumé</b><small>Experience and education</small></span><span class="ct-go" aria-hidden="true">›</span></button>`}
          </div>
        </div>`;
      }
    }
  };

  const os = $("#os"), win = $("#win"), body = $("#winBody"), screen = $("#osScreen");
  // wallpaper URL carries the release number (os.js?v=N) so a replaced photo is never served stale from cache
  const BUILD = (document.currentScript && new URL(document.currentScript.src).searchParams.get("v")) || "dev";
  screen.style.setProperty("--wallpaper", `url("assets/wallpaper.jpg?v=${BUILD}")`);
  let onClose = () => {}, current = "about";
  const sound = () => window.Sound && window.Sound.click();

  // Sidebar
  $("#sidebar").innerHTML = `<span class="side-hl" aria-hidden="true"></span><h4>Portfolio</h4>` +
    Object.entries(apps).map(([k, a]) => `<button class="side-item" data-open="${k}">${line(k)}${esc(a.title)}</button>`).join("") +
    `<div class="side-profile"><span class="avatar">SJ</span><div><b>${esc(S.name)}</b><span>${esc(S.location)}</span></div></div>`;

  // Dock
  $("#dock").innerHTML = Object.entries(apps).map(([k, a]) =>
      `<button class="dock-item" data-open="${k}" aria-label="${esc(a.title)}">${appIcon(k)}<span class="name">${esc(a.title)}</span></button>`).join("") +
    `<span class="dock-sep"></span>` +
    `<a class="dock-item" href="${esc(safeUrl(S.links.linkedin))}" target="_blank" rel="noopener" aria-label="LinkedIn">${appIcon("linkedin")}<span class="name">LinkedIn</span></a>` +
    `<a class="dock-item" href="${esc(safeUrl(S.links.behance))}" target="_blank" rel="noopener" aria-label="Behance">${appIcon("behance")}<span class="name">Behance</span></a>` +
    `<button class="dock-item" data-desk aria-label="Back to desk">${appIcon("desk")}<span class="name">Desk</span></button>`;

  // Full screen: the dock slides up when the mouse reaches the bottom edge, and hides again when it leaves
  $(".dock-zone").addEventListener("mouseenter", () => screen.classList.add("dock-peek"));
  $("#dock").addEventListener("mouseleave", () => screen.classList.remove("dock-peek"));
  screen.addEventListener("mousemove", (e) => { if (screen.classList.contains("dock-peek") && e.clientY < screen.getBoundingClientRect().bottom - 120) screen.classList.remove("dock-peek"); });

  // Dock magnification, the macOS way: icons grow from the bottom with a cosine fall-off around the pointer (measured from
  // their resting positions, so nothing jitters), neighbours glide aside, and every icon eases on a spring each frame
  const dock = $("#dock"), DOCK_W = 56, DOCK_ICON = 52, MAG = 0.62, REACH = 150;
  let dockX = null, dockRaf = 0, dockLast = 0, dockRest = [];
  const dockItems = () => [...dock.querySelectorAll(".dock-item")];
  const canMagnify = () => innerWidth >= 760 && !matchMedia("(pointer: coarse)").matches && !reducedMotion;
  function dockFrame(now) {
    const dt = Math.min(0.05, (now - (dockLast || now)) / 1000) || 1 / 60; dockLast = now;
    let busy = false;
    dockItems().forEach((it, i) => {
      const cx = dockRest[i];
      const d = dockX === null || cx === undefined ? Infinity : Math.abs(dockX - cx);
      const target = 1 + (d < REACH ? MAG * (Math.cos(Math.PI * d / REACH) + 1) / 2 : 0);
      const cur = it._s || 1, next = cur + (target - cur) * (1 - Math.exp(-dt * 16));
      it._s = Math.abs(next - target) < 0.002 ? target : next;
      if (it._s !== target) busy = true;
      if (it._s === 1) { it.style.width = ""; it.style.removeProperty("--s"); }   // at rest: back to the stylesheet (phone layouts size the dock themselves)
      else { it.style.width = DOCK_W + DOCK_ICON * (it._s - 1) + "px"; it.style.setProperty("--s", it._s.toFixed(4)); }
    });
    dockRaf = busy || dockX !== null ? requestAnimationFrame(dockFrame) : 0;
    if (!dockRaf) dockLast = 0;
  }
  const dockKick = () => { if (!dockRaf) dockRaf = requestAnimationFrame(dockFrame); };
  dock.addEventListener("mouseenter", () => {
    if (!canMagnify()) return;
    if (!dockItems().some((it) => (it._s || 1) > 1.001)) dockRest = dockItems().map((it) => { const r = it.getBoundingClientRect(); return r.left + r.width / 2; });
  });
  dock.addEventListener("mousemove", (e) => { if (!canMagnify()) return; dockX = e.clientX; dockKick(); });
  dock.addEventListener("mouseleave", () => { dockX = null; dockKick(); });

  // Widget
  $("#widget").innerHTML = `<small>${esc(S.focus)}</small><b>${esc(S.name)}</b><span>${esc(S.education)}</span><div class="status"><i></i>${esc(S.seeking.replace(/\.$/, ""))}</div>`;

  /* ── Window ── */
  function resetWindowPlacement() {
    win.style.left = win.style.top = win.style.bottom = win.style.height = win.style.transform = "";
  }
  // A case study opens like a full-screen Mac app: the window fills the screen (no wallpaper, sidebar or dock)
  // and one top bar handles navigation. Esc / the back gesture return to the Work list.
  let caseSlug = null;
  // Full-screen zoom, the macOS way: measure the window, switch layout, then animate from the old frame to the new one (FLIP)
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  function morphWindow(change) {
    if (reducedMotion || win.hidden || !win.animate) return change();
    const a = win.getBoundingClientRect(); change(); const b = win.getBoundingClientRect();
    if (!b.width || !b.height) return;
    const base = getComputedStyle(win).transform, t = base === "none" ? "" : base + " ";
    win.animate([
      { transform: `translate(${a.left - b.left}px, ${a.top - b.top}px) scale(${a.width / b.width}, ${a.height / b.height}) ${t}`.trim(), transformOrigin: "0 0", borderRadius: "26px" },
      { transform: t.trim() || "none", transformOrigin: "0 0", borderRadius: getComputedStyle(win).borderRadius }
    ], { duration: 560, easing: getComputedStyle(document.documentElement).getPropertyValue("--smooth").trim() || "cubic-bezier(.32,.72,0,1)" });
  }
  // case-study images: 1× and 2× (Figma resolution) — the browser picks the sharp one for the screen
  const caseImg = (slug, f, x = 1) => esc(`work/${slug}/${x === 2 ? f.replace(/\.(\w+)$/, "@2x.$1") : f}?v=${BUILD}`);
  const SHARE_ICON = '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V4M8 8l4-4 4 4M5 13v5a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-5"/></svg>';
  function openCase(slug) {
    const list = S.projects.filter((x) => x.case);
    const k = list.findIndex((x) => x.case.slug === slug);
    if (k < 0) return show("work");
    const p = list[k], prev = list[(k - 1 + list.length) % list.length], next = list[(k + 1) % list.length];
    if (p.case.page) { location.href = p.case.page; return; }   // a case study with its own long-scroll web page (Syntra)
    try { const st = history.state || {}; if (st.sjCase) history.replaceState({ sjDesktop: 1, sjCase: slug }, ""); else history.pushState({ sjDesktop: 1, sjCase: slug }, ""); } catch (_) {}
    const entering = !caseSlug;
    caseSlug = slug; current = "work";
    const goFull = () => { win.hidden = false; win.classList.remove("min", "max"); resetWindowPlacement(); screen.classList.add("case-fs"); os.classList.add("case-fs"); };
    if (entering) morphWindow(goFull); else goFull();
    $("#winTitle").textContent = p.title;
    body.classList.add("case-mode");
    body.innerHTML = `<header class="fs-bar">
        <div class="lights"><button class="red" data-exit-case aria-label="Close case study"></button><button class="yellow" disabled aria-hidden="true" tabindex="-1"></button><button class="green" data-exit-case aria-label="Exit full screen"></button></div>
        <button class="fs-btn" data-exit-case>‹ All work</button>
        <div class="fs-title"><b>${esc(p.title)}</b><small>${esc(p.tag)}${p.status ? " · " + esc(p.status) : ""}</small></div>
        ${list.length > 1 ? `<nav class="fs-nav" aria-label="Case studies">
          <button class="fs-btn" data-case="${esc(prev.case.slug)}" aria-label="Previous: ${esc(prev.title)}">‹</button>
          <span>${k + 1} / ${list.length}</span>
          <button class="fs-btn" data-case="${esc(next.case.slug)}" aria-label="Next: ${esc(next.title)}">›</button></nav>` : ""}
        <button class="fs-btn fs-share" data-share aria-label="Copy link to this portfolio">${SHARE_ICON}</button>
        <i class="fs-progress" aria-hidden="true"></i>
      </header>
      <div class="case">
      <p class="case-hint">Pinch to zoom in on the details.</p>
      ${p.case.sections.map(([f, h, alt], i) => `<img src="${caseImg(slug, f)}" srcset="${caseImg(slug, f)} 1440w, ${caseImg(slug, f, 2)} 2880w" sizes="(pointer: coarse) 200vw, (min-width: 1920px) 1920px, 100vw" width="1440" height="${+h}" alt="${esc(alt)}" ${i < 2 ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`).join("")}
      <div class="case-end"><span>Next case study</span><button class="case-next" data-case="${esc(next.case.slug)}">${esc(next.title)} ›</button>
        <button class="btn alt" data-exit-case>All work</button></div>
    </div>`;
    body.scrollTop = 0;
    // a hairline under the bar shows how far into the case study you are
    const prog = body.querySelector(".fs-progress");
    if (body._prog) body.removeEventListener("scroll", body._prog);
    body._prog = () => { if (!prog.isConnected) return; const max = body.scrollHeight - body.clientHeight; prog.style.transform = `scaleX(${max > 0 ? Math.min(1, body.scrollTop / max) : 0})`; };
    body.addEventListener("scroll", body._prog, { passive: true });
    // images fade in as they arrive (no pop), over the project's own colour instead of a grey block
    const imgs = [...body.querySelectorAll(".case img")];
    $(".case").style.setProperty("--case-bg", p.color || "#1c1c1e");
    imgs.forEach((im) => { if (im.complete && im.naturalWidth) im.classList.add("in"); else im.addEventListener("load", () => im.classList.add("in"), { once: true }); });
    // then fetch the rest in order, two at a time, so fast scrolling never lands on blank sections
    let next_ = 2, active = 0;
    const pump = () => {
      while (active < 2 && next_ < imgs.length && caseSlug === slug) {
        const im = imgs[next_++]; if (im.complete) continue;
        active++; im.loading = "eager";
        const done = () => { active--; pump(); }; im.addEventListener("load", done, { once: true }); im.addEventListener("error", done, { once: true });
      }
    };
    setTimeout(pump, 700);
    // a case study can bring its own motion layer (Syntra): an ES module loaded only when it opens
    const fxFile = /^[\w-]+\.js$/.test(p.case.fx || "") ? p.case.fx : "";   // only a plain local module name
    if (fxFile) import(`./${fxFile}?v=${BUILD}`).then((m) => { if (caseSlug === slug) m.default($(".case"), { slug, v: BUILD, sections: p.case.sections, opts: p.case.fxOpts || {} }); }).catch(() => {});
  }
  // hovering a project (Work card, Spotlight result, desk folder) starts downloading its first sections
  const warmed = new Set();
  function warmCase(slug) {
    if (warmed.has(slug)) return; warmed.add(slug);
    const pr = S.projects.find((x) => x.case && x.case.slug === slug); if (!pr) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    pr.case.sections.slice(0, 2).forEach(([f]) => { const im = new Image(); im.src = caseImg(slug, f, dpr > 1.2 ? 2 : 1).replace(/&amp;/g, "&"); });
  }
  os.addEventListener("pointerover", (e) => { const c = e.target.closest("[data-case]"); if (c) warmCase(c.dataset.case); });
  function exitCase(fromHistory) {
    if (!caseSlug) return;
    caseSlug = null;
    morphWindow(() => { screen.classList.remove("case-fs", "dock-peek"); os.classList.remove("case-fs"); });
    if (!fromHistory) { try { if (history.state && history.state.sjCase) { skipPop = true; history.back(); } } catch (_) {} }
  }
  let opening = false;
  function placeHighlight(instant) {   // the sidebar selection glides between items, like Finder
    const hl = $(".side-hl"), on = $(".side-item.active");
    if (!hl || !on || innerWidth < 761) return;
    if (instant) hl.style.transition = "none";
    hl.style.transform = `translateY(${on.offsetTop}px)`; hl.style.height = on.offsetHeight + "px"; hl.style.opacity = "1";
    if (instant) { void hl.offsetWidth; hl.style.transition = ""; }
  }
  function show(key, fromHistory) {
    if (String(key).startsWith("case:")) return openCase(String(key).slice(5));
    exitCase(fromHistory);
    body.classList.remove("case-mode");
    const app = apps[key] || apps.about;
    current = key in apps ? key : "about";
    const switching = !win.hidden && !os.hidden && body.childElementCount > 0 && !opening;
    $("#winTitle").textContent = app.title;
    body.innerHTML = app.html();
    body.scrollTop = 0;
    win.hidden = false;
    win.classList.remove("min");
    if (switching) {   // switching tabs: the window stays put, the new page settles in (no window pop)
      for (const el of [body, $("#winTitle")]) { el.classList.remove("swap-in"); void el.offsetWidth; el.classList.add("swap-in"); }
    } else {
      resetWindowPlacement();
      win.style.animation = "none"; void win.offsetWidth; win.style.animation = "";
    }
    document.querySelectorAll("[data-open]").forEach((b) => {
      const on = b.dataset.open === current;
      if (b.classList.contains("side-item")) { b.classList.toggle("active", on); if (on) b.scrollIntoView({ block: "nearest", inline: "nearest" }); }   // phones: the tab row scrolls
      if (b.classList.contains("dock-item")) b.classList.toggle("running", on);
    });
    placeHighlight(opening);
  }
  const closeWindow = () => { win.hidden = true; document.querySelectorAll(".running").forEach((b) => b.classList.remove("running")); };
  const minimize = () => { if (win.hidden) return; win.classList.add("min"); setTimeout(() => { win.hidden = true; win.classList.remove("min"); }, 340); };
  const zoom = () => { resetWindowPlacement(); win.classList.toggle("max"); };

  os.addEventListener("click", (e) => {
    if (e.target.closest("[data-exit-case]")) { e.preventDefault(); show("work"); sound(); return; }
    if (e.target.closest("[data-share]")) { copyLink(); return; }
    if (e.target.closest("[data-copy-email]")) { copyEmail(); sound(); return; }
    const c = e.target.closest("[data-case]");
    if (c) { e.preventDefault(); closeMenu(); closeSpotlight(); openCase(c.dataset.case); sound(); return; }
    const t = e.target.closest("[data-open]");
    if (t) {
      e.preventDefault();
      if (t.classList.contains("dock-item")) { t.classList.remove("bounce"); void t.offsetWidth; t.classList.add("bounce"); }
      closeMenu(); closeSpotlight();
      show(t.dataset.open); sound();
      return;
    }
    if (e.target.closest("[data-desk]")) close();
  });
  $("#winClose").addEventListener("click", closeWindow);
  $("#winMin").addEventListener("click", minimize);
  $("#winMax").addEventListener("click", zoom);
  $("#winBar").addEventListener("dblclick", (e) => { if (!e.target.closest("button, .tb-btn")) zoom(); });

  // Unified toolbar: search opens Spotlight, share copies the portfolio link
  const [tbSearch, tbShare] = document.querySelectorAll(".tb-btn");
  $(".tb-tools").removeAttribute("aria-hidden");
  tbSearch.setAttribute("role", "button"); tbSearch.setAttribute("aria-label", "Search"); tbSearch.tabIndex = 0;
  tbShare.setAttribute("role", "button"); tbShare.setAttribute("aria-label", "Copy link to this portfolio"); tbShare.tabIndex = 0;
  tbSearch.addEventListener("click", () => openSpotlight());
  tbShare.addEventListener("click", () => copyLink());

  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.hidden = false;
    t.style.animation = "none"; void t.offsetWidth; t.style.animation = "";
    clearTimeout(toast.timer); toast.timer = setTimeout(() => (t.hidden = true), 1800);
  }
  // Bangalore time for the Contact window
  function istNow() { return new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date()).toUpperCase(); }
  setInterval(() => { const el = document.querySelector("[data-ist]"); if (el) el.textContent = istNow(); }, 30000);
  async function copyEmail() {
    try { await navigator.clipboard.writeText(S.email); toast("Email address copied"); }
    catch (_) { toast(S.email); }
  }
  async function copyLink() {
    const url = location.origin + location.pathname;
    try { await navigator.clipboard.writeText(url); toast("Link copied"); }
    catch (_) { toast(url); }
  }

  // Drag the window by its toolbar (keeps its size while dragging)
  let drag = null;
  $("#winBar").addEventListener("pointerdown", (e) => {
    if (e.target.closest("button, .tb-btn") || innerWidth < 760 || win.classList.contains("max")) return;
    const r = win.getBoundingClientRect(), p = screen.getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, p };
    win.style.transform = "none"; win.style.bottom = "auto"; win.style.height = r.height + "px";
    win.style.left = r.left - p.left + "px"; win.style.top = r.top - p.top + "px";
    e.currentTarget.setPointerCapture(e.pointerId);
  });
  $("#winBar").addEventListener("pointermove", (e) => {
    if (!drag) return;
    const x = Math.max(-200, Math.min(e.clientX - drag.p.left - drag.dx, drag.p.width - 160));
    const y = Math.max(30, Math.min(e.clientY - drag.p.top - drag.dy, drag.p.height - 140));
    win.style.left = x + "px"; win.style.top = y + "px";
  });
  $("#winBar").addEventListener("pointerup", () => (drag = null));
  $("#winBar").addEventListener("pointercancel", () => (drag = null));

  /* ── Menu bar menus (like a Mac app) ── */
  const MENUS = {
    portfolio: [["About This Portfolio", () => show("about")], null, ["Back to Desk", () => close(), "Esc"]],
    file: [["New Window", null, "N"], ["Open Work…", () => show("work"), "O"], null, ["Close Window", closeWindow, "W"]],
    edit: [["Undo", null, "Z"], ["Redo", null, "⇧Z"], null, ["Copy Link to Portfolio", copyLink], ["Find…", () => openSpotlight(), "K"]],
    view: [["Enter Full Screen", zoom, "⌃F"], null, ["Show Sidebar", null]],
    go: Object.entries(apps).map(([k, a]) => [a.title, () => show(k), a.key]),
    window: [["Minimize", minimize, "M"], ["Zoom", zoom], null, ["Bring All to Front", () => { if (win.hidden) show(current); }]],
    help: [["Search the Portfolio", () => openSpotlight(), "K"], null, ["Contact Sijo…", () => show("contact")]]
  };
  const menu = $("#mbMenu");
  let openMenuKey = null;
  function openMenu(key, btn) {
    openMenuKey = key;
    menu.innerHTML = MENUS[key].map((it) => it === null ? "<hr>"
      : `<button role="menuitem" ${it[1] ? "" : "disabled"} data-i="${MENUS[key].indexOf(it)}"><span>${it[0]}</span>${it[2] ? `<kbd>${it[2] === "Esc" ? "Esc" : it[2].length === 1 ? MOD + it[2] : it[2].replace("⌃", isMac ? "⌃⌘" : "Ctrl+Shift+")}</kbd>` : ""}</button>`).join("");
    const r = btn.getBoundingClientRect(), p = screen.getBoundingClientRect();
    menu.style.left = Math.min(r.left - p.left, p.width - 250) + "px";
    menu.style.top = r.bottom - p.top + 4 + "px";
    menu.hidden = false;
    document.querySelectorAll("#menubar [data-menu]").forEach((b) => b.classList.toggle("on", b === btn));
  }
  function closeMenu() {
    menu.hidden = true; openMenuKey = null;
    document.querySelectorAll("#menubar [data-menu]").forEach((b) => b.classList.remove("on"));
  }
  document.querySelectorAll("#menubar [data-menu]").forEach((btn) => {
    btn.addEventListener("click", (e) => { e.stopPropagation(); openMenuKey === btn.dataset.menu ? closeMenu() : openMenu(btn.dataset.menu, btn); });
    btn.addEventListener("mouseenter", () => { if (openMenuKey && openMenuKey !== btn.dataset.menu) openMenu(btn.dataset.menu, btn); });
  });
  menu.addEventListener("click", (e) => {
    const b = e.target.closest("button[data-i]"); if (!b || b.disabled) return;
    const fn = MENUS[openMenuKey][+b.dataset.i][1];
    closeMenu(); fn(); sound();
  });
  document.addEventListener("pointerdown", (e) => { if (!menu.hidden && !e.target.closest("#mbMenu, #menubar")) closeMenu(); });

  /* ── Spotlight ── */
  const sp = $("#spotlight"), spInput = $("#spInput"), spResults = $("#spResults");
  const index = [
    ...Object.entries(apps).map(([k, a]) => ({ label: a.title, hint: "Section", icon: k, run: () => show(k) })),
    ...S.projects.map((p) => ({ label: p.title, hint: p.tag, icon: "work", run: () => (p.case ? openCase(p.case.slug) : show("work")) })),
    ...S.skills.flatMap((g) => g.items.map((i) => ({ label: i, hint: g.group, icon: "skills", run: () => show("skills") }))),
    { label: "Email " + S.name.split(" ")[0], hint: S.email, icon: "contact", run: () => (location.href = safeUrl(S.links.mail)) },
    { label: "Back to desk", hint: "Close the Mac", icon: "desk", run: () => close() }
  ];
  let spSel = 0, spItems = [];
  function renderSpotlight() {
    const q = spInput.value.trim().toLowerCase();
    spItems = (q ? index.filter((it) => (it.label + " " + it.hint).toLowerCase().includes(q)) : index.slice(0, 5)).slice(0, 8);
    spSel = Math.min(spSel, Math.max(0, spItems.length - 1));
    spResults.innerHTML = spItems.map((it, i) =>
      `<li role="option" data-i="${i}" class="${i === spSel ? "sel" : ""}">${appIcon(it.icon, "sp-ico")}<span>${esc(it.label)}</span><small>${esc(it.hint)}</small></li>`).join("");
  }
  function openSpotlight() {
    closeMenu(); sp.hidden = false; spInput.value = ""; spSel = 0; renderSpotlight();
    setTimeout(() => spInput.focus(), 0);
  }
  function closeSpotlight() { sp.hidden = true; }
  const runSel = () => { const it = spItems[spSel]; if (it) { closeSpotlight(); it.run(); sound(); } };
  spInput.addEventListener("input", () => { spSel = 0; renderSpotlight(); });
  spInput.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); spSel = Math.min(spSel + 1, spItems.length - 1); renderSpotlight(); }
    else if (e.key === "ArrowUp") { e.preventDefault(); spSel = Math.max(spSel - 1, 0); renderSpotlight(); }
    else if (e.key === "Enter") { e.preventDefault(); runSel(); }
  });
  spResults.addEventListener("click", (e) => { const li = e.target.closest("li"); if (li) { spSel = +li.dataset.i; runSel(); } });
  sp.addEventListener("pointerdown", (e) => { if (e.target === sp) closeSpotlight(); });
  $("#mbSearch").addEventListener("click", openSpotlight);

  /* ── Keyboard shortcuts ── */
  document.addEventListener("keydown", (e) => {
    if (os.hidden) return;
    if (e.key === "Escape") {
      if (!sp.hidden) return closeSpotlight();
      if (!menu.hidden) return closeMenu();
      if (caseSlug) return show("work");   // leave full screen first, like macOS
      return close();
    }
    const mod = isMac ? e.metaKey : e.ctrlKey;
    if (!mod) return;
    const k = e.key.toLowerCase();
    const go = Object.entries(apps).find(([, a]) => a.key === k);
    if (go) { e.preventDefault(); show(go[0]); }
    else if (k === "k") { e.preventDefault(); openSpotlight(); }
    else if (k === "w") { e.preventDefault(); closeWindow(); }
    else if (k === "m") { e.preventDefault(); minimize(); }
  });

  // Menu-bar clock, macOS style: "Sat 3 Oct  3:02 AM"
  const tick = () => {
    const d = new Date();
    const time = d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    $("#clock").textContent = innerWidth < 500 ? time : d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + "  " + time;
  };
  tick(); setInterval(tick, 15000);

  // Apple-style zoom: the desktop scales out of (and back into) the laptop screen's rectangle
  // the Mac grows out of the laptop screen on a real spring curve (styles.css --smooth), like a macOS window zoom
  const ZOOM_MS = 700, ZOOM_EASE = getComputedStyle(document.documentElement).getPropertyValue("--smooth").trim() || "cubic-bezier(0.32, 0.72, 0, 1)";
  const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let zoomRect = null, closing = false, settled = false;
  const toRect = (r) => {
    const to = screen.getBoundingClientRect();
    return `translate(${r.left - to.left}px, ${r.top - to.top}px) scale(${r.width / to.width}, ${r.height / to.height})`;
  };
  // Back button / phone back-swipe: opening the desktop adds a history step, so "back" closes it
  // (returning to the desk) instead of leaving the site.
  let skipPop = false;
  addEventListener("popstate", () => {
    if (skipPop) { skipPop = false; return; }
    if (caseSlug) return show("work", true);   // back gesture inside a case study: return to the Work list
    if (!os.hidden) close(true);
  });
  try { if (history.state && history.state.sjDesktop) history.replaceState(null, ""); } catch (_) {}   // reloaded while open

  function open(key = "about", closeCb, fromRect) {
    onClose = closeCb || (() => {});
    try { if (!(history.state && history.state.sjDesktop)) history.pushState({ sjDesktop: 1 }, ""); } catch (_) {}
    closing = false; settled = false;
    os.hidden = false;
    win.classList.remove("max");
    closeMenu(); closeSpotlight();
    opening = true; show(key); opening = false;
    zoomRect = fromRect && !reduced ? fromRect : null;
    if (zoomRect) {
      os.style.animation = screen.style.animation = "none";
      screen.style.transition = os.style.transition = "none";
      screen.style.transformOrigin = "0 0";
      screen.style.transform = toRect(zoomRect);
      os.style.backgroundColor = "rgba(0,0,0,0)";
      win.style.animationDelay = "0.18s";                       // the window pops in just after the screen settles
      void screen.offsetWidth;
      screen.style.transition = `transform ${ZOOM_MS}ms ${ZOOM_EASE}, border-radius ${ZOOM_MS}ms ${ZOOM_EASE}`;
      os.style.transition = `background-color ${ZOOM_MS}ms ${ZOOM_EASE}`;
      screen.style.transform = "none";
      os.style.backgroundColor = "";
    } else {
      os.style.animation = ""; screen.style.transform = ""; win.style.animationDelay = "";
      screen.style.animation = "none"; void os.offsetWidth; screen.style.animation = "";
    }
  }
  function close(fromHistory) {
    if (closing || os.hidden) return;
    if (!fromHistory) { try { if (history.state && history.state.sjDesktop) { skipPop = true; history.go(history.state.sjCase ? -2 : -1); } } catch (_) {} }
    caseSlug = null; screen.classList.remove("case-fs", "dock-peek"); os.classList.remove("case-fs");
    closeMenu(); closeSpotlight();
    const finish = () => {
      os.hidden = true; closing = false;
      screen.style.transition = os.style.transition = "none";
      screen.style.transform = ""; os.style.backgroundColor = ""; win.style.animationDelay = "";
      onClose();
    };
    if (!zoomRect) return finish();
    closing = true; settled = false;
    screen.style.transition = `transform ${ZOOM_MS - 80}ms cubic-bezier(0.4, 0, 0.2, 1)`;   // back into the laptop: ease in, soft landing
    os.style.transition = `background-color ${ZOOM_MS - 80}ms ease`;
    screen.style.transform = toRect(zoomRect);
    os.style.backgroundColor = "rgba(0,0,0,0)";
    setTimeout(finish, ZOOM_MS - 60);
  }

  const setDark = (dark) => os.classList.toggle("dark", !!dark);
  // true while the desktop fully covers the 3D scene (the zoom-out/zoom-in animations still need it rendered)
  screen.addEventListener("transitionend", (e) => { if (e.target === screen && e.propertyName === "transform" && !closing) settled = true; });
  const isCovering = () => !os.hidden && !closing && (settled || !zoomRect);
  window.OS = { open, close: () => close(), setDark, isOpen: () => !os.hidden, isCovering, toast, warmCase };
})();
