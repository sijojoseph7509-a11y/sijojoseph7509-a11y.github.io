// The desktop that opens when the 3D laptop boots — a macOS-style experience:
// menu bar with real menus, a window with sidebar + unified toolbar, Spotlight search, dock, shortcuts.
(() => {
  const S = window.SITE;
  const $ = (s) => document.querySelector(s);
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
  const GLYPH = {
    about:   '<circle cx="12" cy="8.2" r="4.2" fill="#fff"/><path d="M3.8 20.5c.9-4.3 4.2-6.8 8.2-6.8s7.3 2.5 8.2 6.8z" fill="#fff"/>',
    work:    '<path d="M8.6 6.4V5.2c0-1 .8-1.8 1.8-1.8h3.2c1 0 1.8.8 1.8 1.8v1.2" fill="none" stroke="#fff" stroke-width="1.8"/><rect x="2.6" y="6.4" width="18.8" height="13.4" rx="2.6" fill="#fff"/><path d="M2.6 12.2h18.8" stroke="#e08400" stroke-width="1.4"/><rect x="10.4" y="10.8" width="3.2" height="2.8" rx=".8" fill="#e08400"/>',
    skills:  '<path d="M12 2.6l2.8 6 6.5.7-4.9 4.4 1.4 6.5L12 16.9l-5.8 3.3 1.4-6.5-4.9-4.4 6.5-.7z" fill="#fff"/>',
    resume:  '<path d="M6.5 2.5h8l4.5 4.5v13a1.6 1.6 0 0 1-1.6 1.6H6.5a1.6 1.6 0 0 1-1.6-1.6V4.1c0-.9.7-1.6 1.6-1.6z" fill="#fff"/><path d="M14.5 2.5V7H19" fill="#d8dbe2"/><path d="M8 11h8M8 14h8M8 17h5" stroke="#2f7cf6" stroke-width="1.5" stroke-linecap="round"/>',
    contact: '<rect x="2.6" y="5" width="18.8" height="14" rx="2.4" fill="#fff"/><path d="M3.4 6.4l8.6 6.6 8.6-6.6" fill="none" stroke="#1a8cff" stroke-width="1.6" stroke-linejoin="round"/>',
    linkedin:'<path d="M6.3 9.5h2.8V18H6.3zM7.7 5.3a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2zM10.8 9.5h2.7v1.2c.4-.7 1.4-1.4 2.8-1.4 3 0 3.5 1.9 3.5 4.4V18H17v-3.8c0-.9 0-2.1-1.3-2.1s-1.5 1-1.5 2V18h-3.4z" fill="#fff"/>',
    behance: '<path d="M3.5 7h5c2.3 0 3.4 1 3.4 2.6 0 1.1-.6 1.8-1.4 2.1 1.1.3 1.9 1.2 1.9 2.5 0 2-1.6 2.8-3.7 2.8H3.5zm2.6 4h2.2c.8 0 1.2-.4 1.2-1s-.4-1-1.2-1H6.1zm0 4.1h2.4c.9 0 1.4-.4 1.4-1.1s-.5-1.1-1.4-1.1H6.1zM14.6 8h4.6v1.2h-4.6zM13.8 13.4c0-2.4 1.6-3.8 3.6-3.8 2.3 0 3.5 1.7 3.4 4.4h-4.6c.1 1.1.7 1.6 1.6 1.6.6 0 1.1-.3 1.3-.8h1.6c-.4 1.5-1.6 2.3-3 2.3-2.2 0-3.9-1.3-3.9-3.7zm4.7-.6c0-.8-.5-1.4-1.2-1.4-.8 0-1.3.6-1.4 1.4z" fill="#fff"/>',
    desk:    '<rect x="4.2" y="5" width="15.6" height="10.6" rx="1.6" fill="#fff"/><rect x="5.6" y="6.4" width="12.8" height="7.8" rx=".6" fill="url(#deskScr)"/><path d="M2 17.4h20l-1.2 1.6H3.2z" fill="#fff"/><defs><linearGradient id="deskScr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7d6cff"/><stop offset="1" stop-color="#ff8fb1"/></linearGradient></defs>'
  };
  const GRAD = {
    about:   "linear-gradient(170deg,#6fd0ff,#1a8cff 55%,#0a64e6)",
    work:    "linear-gradient(170deg,#ffd84a,#ffae1a 55%,#f08c00)",
    skills:  "linear-gradient(170deg,#d68bff,#9b5cff 55%,#6e3cf0)",
    resume:  "linear-gradient(170deg,#f4f5f7,#d9dde4)",
    contact: "linear-gradient(170deg,#5fd3ff,#1a8cff 60%,#0a6ae6)",
    linkedin:"linear-gradient(170deg,#2f8be0,#0a66c2)",
    behance: "linear-gradient(170deg,#3d8bff,#1769ff)",
    desk:    "linear-gradient(170deg,#5a5a60,#2c2c30)"
  };
  const appIcon = (k, cls = "app") => `<span class="${cls}" style="background:${GRAD[k]}"><svg viewBox="0 0 24 24" aria-hidden="true">${GLYPH[k]}</svg></span>`;

  const apps = {
    about: {
      title: "About", key: "1",
      html: () => `
        <h1>${esc(S.name)}</h1>
        <p class="sub">${esc(S.title)} · ${esc(S.location)}</p>
        <ul class="chips">${S.roles.map((r) => `<li class="chip">${esc(r)}</li>`).join("")}</ul>
        <p class="lead">${esc(S.about[0])}</p>
        ${S.about.slice(1).map((p) => `<p>${esc(p)}</p>`).join("")}
        <div class="btn-row">
          <button class="btn" data-open="work">See my work</button>
          <button class="btn alt" data-open="contact">Get in touch</button>
        </div>`
    },
    work: {
      title: "Work", key: "2",
      html: () => `
        <h1>Selected work</h1>
        <p class="sub">${S.projects.length} projects across product, brand, experience and 3D.</p>
        <div class="cards">${S.projects.map((p) => {
          const live = p.url && p.url !== "#";
          const inner = `
            <div class="cover" style="background:linear-gradient(135deg, ${esc(p.color)}, ${esc(p.color)}cc)"></div>
            <div class="meta"><small>${esc(p.tag)}</small><b>${esc(p.title)}</b><p>${esc(p.summary)}</p>
              <span class="more${live ? "" : " muted"}">${live ? "View case study ›" : "Case study coming soon"}</span></div>`;
          return live ? `<a class="card" href="${esc(p.url)}" target="_blank" rel="noopener">${inner}</a>` : `<div class="card soon">${inner}</div>`;
        }).join("")}
        </div>`
    },
    skills: {
      title: "Skills", key: "3",
      html: () => `
        <h1>What I do</h1>
        <p class="sub">A multidisciplinary toolkit — from research to pixels to polygons.</p>
        ${S.skills.map((g) => `
          <h3>${esc(g.group)}</h3>
          <ul class="chips">${g.items.map((i) => `<li class="chip">${esc(i)}</li>`).join("")}</ul>`).join("")}`
    },
    resume: {
      title: "Resume", key: "4",
      html: () => `
        <h1>Experience</h1>
        <p class="sub">Where I've worked and what I did there.</p>
        <ul class="list">${S.experience.map((e) => `
          <li><div><b>${esc(e.company)}</b><span>${esc(e.role)}</span></div><span class="yr">${esc(e.from)} – ${esc(e.to)}</span></li>`).join("")}
        </ul>
        ${S.resumeUrl && S.resumeUrl !== "#" ? `<a class="btn" href="${esc(S.resumeUrl)}" target="_blank" rel="noopener">Download résumé</a>` : `<button class="btn alt" data-open="contact">Ask for my résumé</button>`}`
    },
    contact: {
      title: "Contact", key: "5",
      html: () => `
        <h1>Let's make something together.</h1>
        <p class="sub">Open to product, brand, experience and 3D projects — full-time roles and collaborations.</p>
        <a class="big-link" href="mailto:${esc(S.email)}">${esc(S.email)}</a>
        <div class="btn-row">
          <a class="btn" href="${esc(S.links.mail)}">Send an email</a>
          <a class="btn alt" href="${esc(S.links.linkedin)}" target="_blank" rel="noopener">LinkedIn</a>
          <a class="btn alt" href="${esc(S.links.behance)}" target="_blank" rel="noopener">Behance</a>
          <a class="btn alt" href="${esc(S.links.github)}" target="_blank" rel="noopener">GitHub</a>
        </div>`
    }
  };

  const os = $("#os"), win = $("#win"), body = $("#winBody"), screen = $("#osScreen");
  let onClose = () => {}, current = "about";
  const sound = () => window.Sound && window.Sound.click();

  // Sidebar
  $("#sidebar").innerHTML = `<h4>Portfolio</h4>` +
    Object.entries(apps).map(([k, a]) => `<button class="side-item" data-open="${k}">${line(k)}${a.title}</button>`).join("") +
    `<div class="side-profile"><span class="avatar">SJ</span><div><b>${esc(S.name)}</b><span>${esc(S.location)}</span></div></div>`;

  // Dock
  $("#dock").innerHTML = Object.entries(apps).map(([k, a]) =>
      `<button class="dock-item" data-open="${k}" aria-label="${a.title}">${appIcon(k)}<span class="name">${a.title}</span></button>`).join("") +
    `<span class="dock-sep"></span>` +
    `<a class="dock-item" href="${esc(S.links.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn">${appIcon("linkedin")}<span class="name">LinkedIn</span></a>` +
    `<a class="dock-item" href="${esc(S.links.behance)}" target="_blank" rel="noopener" aria-label="Behance">${appIcon("behance")}<span class="name">Behance</span></a>` +
    `<button class="dock-item" data-desk aria-label="Back to desk">${appIcon("desk")}<span class="name">Desk</span></button>`;

  // Dock magnification
  const dock = $("#dock");
  dock.addEventListener("mousemove", (e) => {
    if (innerWidth < 760) return;
    dock.querySelectorAll(".dock-item").forEach((it) => {
      const r = it.getBoundingClientRect();
      const d = Math.abs(e.clientX - (r.left + r.width / 2));
      const s = 1 + Math.max(0, 1 - d / 140) * 0.55;
      it.style.transform = `scale(${s})`;
      it.style.margin = `0 ${(s - 1) * 14}px`;
    });
  });
  dock.addEventListener("mouseleave", () => dock.querySelectorAll(".dock-item").forEach((it) => { it.style.transform = ""; it.style.margin = ""; }));

  // Widget
  $("#widget").innerHTML = `<small>Designer</small><b>${esc(S.name)}</b><span>${esc(S.roles.join(" · "))}</span><div class="status"><i></i>Available for new work</div>`;

  /* ── Window ── */
  function resetWindowPlacement() {
    win.style.left = win.style.top = win.style.bottom = win.style.height = win.style.transform = "";
  }
  function show(key) {
    const app = apps[key] || apps.about;
    current = key in apps ? key : "about";
    $("#winTitle").textContent = app.title;
    body.innerHTML = app.html();
    body.scrollTop = 0;
    win.hidden = false;
    win.classList.remove("min");
    resetWindowPlacement();
    win.style.animation = "none"; void win.offsetWidth; win.style.animation = "";
    document.querySelectorAll("[data-open]").forEach((b) => {
      const on = b.dataset.open === current;
      if (b.classList.contains("side-item")) { b.classList.toggle("active", on); if (on) b.scrollIntoView({ block: "nearest", inline: "nearest" }); }   // phones: the tab row scrolls
      if (b.classList.contains("dock-item")) b.classList.toggle("running", on);
    });
  }
  const closeWindow = () => { win.hidden = true; document.querySelectorAll(".running").forEach((b) => b.classList.remove("running")); };
  const minimize = () => { if (win.hidden) return; win.classList.add("min"); setTimeout(() => { win.hidden = true; win.classList.remove("min"); }, 340); };
  const zoom = () => { resetWindowPlacement(); win.classList.toggle("max"); };

  os.addEventListener("click", (e) => {
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
    ...S.projects.map((p) => ({ label: p.title, hint: p.tag, icon: "work", run: () => show("work") })),
    ...S.skills.flatMap((g) => g.items.map((i) => ({ label: i, hint: g.group, icon: "skills", run: () => show("skills") }))),
    { label: "Email " + S.name.split(" ")[0], hint: S.email, icon: "contact", run: () => (location.href = S.links.mail) },
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
  const ZOOM_MS = 620, ZOOM_EASE = "cubic-bezier(0.32, 0.72, 0, 1)";
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
    show(key);
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
    if (!fromHistory) { try { if (history.state && history.state.sjDesktop) { skipPop = true; history.back(); } } catch (_) {} }
    closeMenu(); closeSpotlight();
    const finish = () => {
      os.hidden = true; closing = false;
      screen.style.transition = os.style.transition = "none";
      screen.style.transform = ""; os.style.backgroundColor = ""; win.style.animationDelay = "";
      onClose();
    };
    if (!zoomRect) return finish();
    closing = true; settled = false;
    screen.style.transition = `transform ${ZOOM_MS - 80}ms cubic-bezier(0.4, 0, 0.6, 1)`;
    os.style.transition = `background-color ${ZOOM_MS - 80}ms ease`;
    screen.style.transform = toRect(zoomRect);
    os.style.backgroundColor = "rgba(0,0,0,0)";
    setTimeout(finish, ZOOM_MS - 60);
  }

  const setDark = (dark) => os.classList.toggle("dark", !!dark);
  // true while the desktop fully covers the 3D scene (the zoom-out/zoom-in animations still need it rendered)
  screen.addEventListener("transitionend", (e) => { if (e.target === screen && e.propertyName === "transform" && !closing) settled = true; });
  const isCovering = () => !os.hidden && !closing && (settled || !zoomRect);
  window.OS = { open, close: () => close(), setDark, isOpen: () => !os.hidden, isCovering, toast };
})();
