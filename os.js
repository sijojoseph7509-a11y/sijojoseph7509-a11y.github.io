// The desktop that opens when the 3D laptop boots — dock, menu bar, one window with a sidebar.
(() => {
  const S = window.SITE;
  const $ = (s) => document.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // Simple line icons (original), drawn on a 24px grid
  const I = {
    about:   '<path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 20c.8-3.6 4-6 8-6s7.2 2.4 8 6" />',
    work:    '<rect x="3" y="7" width="18" height="13" rx="2.5"/><path d="M9 7V5.5A1.5 1.5 0 0 1 10.5 4h3A1.5 1.5 0 0 1 15 5.5V7M3 12.5h18"/>',
    skills:  '<path d="M12 3l2.4 5.4L20 9l-4.3 3.9L17 19l-5-3-5 3 1.3-6.1L4 9l5.6-.6z"/>',
    resume:  '<path d="M7 3h7l5 5v11.5A1.5 1.5 0 0 1 17.5 21h-10A1.5 1.5 0 0 1 6 19.5v-15A1.5 1.5 0 0 1 7.5 3zM14 3v5h5M9 13h6M9 17h6"/>',
    contact: '<rect x="3" y="5" width="18" height="14" rx="2.5"/><path d="M3.5 6.5l8.5 6.5 8.5-6.5"/>',
    linkedin:'<rect x="4" y="4" width="16" height="16" rx="3"/><path d="M8 10.5V16M8 7.8v.1M11.5 16v-3.2a2 2 0 0 1 4 0V16M11.5 10.5V16"/>',
    behance: '<path d="M4 7h4.5a2.2 2.2 0 0 1 0 4.4H4zM4 11.4h5a2.3 2.3 0 0 1 0 4.6H4zM4 7v9M14 13.5h6a3 3 0 1 0-1 2.3M15 8h4"/>',
    desk:    '<rect x="5" y="5" width="14" height="10" rx="1.5"/><path d="M3 18.5h18"/><path d="M12 8v3M10 9.2a2.6 2.6 0 1 0 4 0"/>'
  };
  const icon = (k) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[k]}</svg>`;

  const apps = {
    about: {
      title: "About", grad: "linear-gradient(160deg,#64d2ff,#0a84ff)",
      html: () => `
        <h1>${esc(S.name)}</h1>
        <p class="sub">${esc(S.title)} · ${esc(S.location)}</p>
        <ul class="chips">${S.roles.map((r) => `<li class="chip${/3d/i.test(r) ? " accent" : ""}">${esc(r)}</li>`).join("")}</ul>
        <p class="lead">${esc(S.about[0])}</p>
        ${S.about.slice(1).map((p) => `<p>${esc(p)}</p>`).join("")}
        <div class="btn-row">
          <button class="btn" data-open="work">See my work</button>
          <button class="btn alt" data-open="contact">Get in touch</button>
        </div>`
    },
    work: {
      title: "Work", grad: "linear-gradient(160deg,#ffd60a,#ff9f0a)",
      html: () => `
        <h1>Selected work</h1>
        <p class="sub">${S.projects.length} projects across product, brand, experience and 3D.</p>
        <div class="cards">${S.projects.map((p) => `
          <a class="card" href="${esc(p.url)}" target="_blank" rel="noopener">
            <div class="cover" style="background:linear-gradient(135deg, ${esc(p.color)}, ${esc(p.color)}cc)"></div>
            <div class="meta"><small>${esc(p.tag)}</small><b>${esc(p.title)}</b><p>${esc(p.summary)}</p><span class="more">View case study ›</span></div>
          </a>`).join("")}
        </div>`
    },
    skills: {
      title: "Skills", grad: "linear-gradient(160deg,#bf5af2,#5e5ce6)",
      html: () => `
        <h1>What I do</h1>
        <p class="sub">A multidisciplinary toolkit — from research to pixels to polygons.</p>
        ${S.skills.map((g) => `
          <h3>${esc(g.group)}</h3>
          <ul class="chips">${g.items.map((i) => `<li class="chip${/3d/i.test(g.group) ? " accent" : ""}">${esc(i)}</li>`).join("")}</ul>`).join("")}`
    },
    resume: {
      title: "Resume", grad: "linear-gradient(160deg,#8e8e93,#48484a)",
      html: () => `
        <h1>Experience</h1>
        <p class="sub">Where I've worked and what I did there.</p>
        <ul class="list">${S.experience.map((e) => `
          <li><div><b>${esc(e.company)}</b><span>${esc(e.role)}</span></div><span class="yr">${esc(e.from)} – ${esc(e.to)}</span></li>`).join("")}
        </ul>
        <a class="btn" href="${esc(S.resumeUrl)}" target="_blank" rel="noopener">Download résumé</a>`
    },
    contact: {
      title: "Contact", grad: "linear-gradient(160deg,#30d158,#00a86b)",
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

  const os = $("#os"), win = $("#win"), body = $("#winBody");
  let onClose = () => {}, current = "about";

  // Sidebar
  $("#sidebar").innerHTML = `<h4>Portfolio</h4>` +
    Object.entries(apps).map(([k, a]) => `<button class="side-item" data-open="${k}">${icon(k)}${a.title}</button>`).join("") +
    `<div class="side-profile"><span class="avatar">SJ</span><div><b>${esc(S.name)}</b><span>${esc(S.location)}</span></div></div>`;

  // Dock
  const dockApps = Object.entries(apps).map(([k, a]) =>
    `<button class="dock-item" data-open="${k}" aria-label="${a.title}"><span class="app" style="background:${a.grad}">${icon(k)}</span><span class="name">${a.title}</span></button>`).join("");
  $("#dock").innerHTML = dockApps + `<span class="dock-sep"></span>` +
    `<a class="dock-item" href="${esc(S.links.linkedin)}" target="_blank" rel="noopener" aria-label="LinkedIn"><span class="app" style="background:linear-gradient(160deg,#0a84ff,#0060df)">${icon("linkedin")}</span><span class="name">LinkedIn</span></a>` +
    `<a class="dock-item" href="${esc(S.links.behance)}" target="_blank" rel="noopener" aria-label="Behance"><span class="app" style="background:linear-gradient(160deg,#409cff,#1d4ed8)">${icon("behance")}</span><span class="name">Behance</span></a>` +
    `<button class="dock-item" data-desk aria-label="Back to desk"><span class="app" style="background:linear-gradient(160deg,#3a3a3c,#1c1c1e)">${icon("desk")}</span><span class="name">Back to desk</span></button>`;

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

  function show(key) {
    const app = apps[key] || apps.about;
    current = key in apps ? key : "about";
    $("#winTitle").textContent = app.title;
    $("#mbApp").textContent = app.title;
    body.innerHTML = app.html();
    body.scrollTop = 0;
    win.hidden = false;
    win.classList.remove("min");
    win.style.left = win.style.top = win.style.transform = "";
    win.style.animation = "none"; void win.offsetWidth; win.style.animation = "";
    document.querySelectorAll("[data-open]").forEach((b) => {
      const on = b.dataset.open === current;
      if (b.classList.contains("side-item")) b.classList.toggle("active", on);
      if (b.classList.contains("dock-item")) b.classList.toggle("running", on);
      if (b.closest(".mb-left")) b.classList.toggle("on", on);
    });
  }

  os.addEventListener("click", (e) => {
    const t = e.target.closest("[data-open]");
    if (t) {
      e.preventDefault();
      if (t.classList.contains("dock-item")) { t.classList.remove("bounce"); void t.offsetWidth; t.classList.add("bounce"); }
      show(t.dataset.open);
      window.Sound && window.Sound.click();
      return;
    }
    if (e.target.closest("[data-desk]")) close();
  });
  $("#winClose").addEventListener("click", () => { win.hidden = true; document.querySelectorAll(".running").forEach((b) => b.classList.remove("running")); });
  $("#winMin").addEventListener("click", () => {
    win.classList.add("min");
    setTimeout(() => { win.hidden = true; win.classList.remove("min"); }, 340);
  });
  $("#winMax").addEventListener("click", () => win.classList.toggle("max"));
  $("#winBar").addEventListener("dblclick", (e) => { if (!e.target.closest("button")) win.classList.toggle("max"); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && !os.hidden) close(); });

  // Drag the window by its title bar
  let drag = null;
  $("#winBar").addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || innerWidth < 760 || win.classList.contains("max")) return;
    const r = win.getBoundingClientRect(), p = $("#osScreen").getBoundingClientRect();
    drag = { dx: e.clientX - r.left, dy: e.clientY - r.top, p };
    win.style.transform = "none";
    win.style.left = r.left - p.left + "px"; win.style.top = r.top - p.top + "px";
    e.currentTarget.setPointerCapture(e.pointerId);
  });
  $("#winBar").addEventListener("pointermove", (e) => {
    if (!drag) return;
    const x = Math.max(-200, Math.min(e.clientX - drag.p.left - drag.dx, drag.p.width - 120));
    const y = Math.max(28, Math.min(e.clientY - drag.p.top - drag.dy, drag.p.height - 120));
    win.style.left = x + "px"; win.style.top = y + "px";
  });
  $("#winBar").addEventListener("pointerup", () => (drag = null));

  // Menu-bar clock, macOS style: "Wed 1 Oct  9:41 PM"
  const tick = () => {
    const d = new Date();
    $("#clock").textContent = d.toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" }) + "  " +
      d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  };
  tick(); setInterval(tick, 15000);

  function open(key = "about", closeCb) {
    onClose = closeCb || (() => {});
    os.hidden = false;
    win.classList.remove("max");
    show(key);
    $("#osScreen").style.animation = "none"; void os.offsetWidth; $("#osScreen").style.animation = "";
  }
  function close() {
    os.hidden = true;
    onClose();
  }

  window.OS = { open, close, isOpen: () => !os.hidden };
})();
