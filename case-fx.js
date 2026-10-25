// Motion layer for the Carekin and Handovo case studies (loaded by os.js openCase when content.js gives case.fx).
// Each project brings its own tone through case.fxOpts:
//   reveal  "none" (default, used by both since v92: sections are simply there, so the story reads as one piece),
//           "rise" (soft settle) or "wipe" (left-to-right)
//   videos  [[section, x, y, w, h, file, radius?]]: the project film plays in place of its poster while it is on screen;
//           radius (same units) rounds its corners to match a rounded screenshot
//   compare [section, x, y, w, h, file, leftLabel, rightLabel]: drag to compare (day / night)
//   draw    [section, x, y, w, h, file, [[x, y], …]]: a line layer that draws itself left to right when seen, with rings on the marked points
// Coordinates are the Figma documentation's own 1440-px units, so everything lines up at every width.
const W = 1440;

export default function caseFx(caseEl, { slug, v, sections, opts = {}, base = "" }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const asset = (f) => `${base}work/${slug}/fx/${f}?v=${v}`;
  if (!document.querySelector("link[data-cfx]")) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `${base}case-fx.css?v=${v}`; l.dataset.cfx = ""; document.head.appendChild(l); }
  caseEl.classList.add("cfx", "cfx-" + (opts.reveal || "rise"));
  if (opts.accent) caseEl.style.setProperty("--cfx-accent", opts.accent);
  const cleanups = [];

  const secs = [...caseEl.querySelectorAll(":scope > img")].map((im, i) => {
    const s = document.createElement("div"); s.className = "cfx-sec"; s.dataset.i = i;
    im.replaceWith(s); s.appendChild(im); return s;
  });
  const H = (i) => +sections[i][1];
  const place = (i, el, x, y, w, h) => { Object.assign(el.style, { left: x / W * 100 + "%", top: y / H(i) * 100 + "%", width: w / W * 100 + "%", height: h / H(i) * 100 + "%" }); secs[i].appendChild(el); return el; };

  // sections arrive as you scroll
  const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("cfx-in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -10% 0px", threshold: 0.02 });
  secs.forEach((s, i) => { if (i < 1 || reduce || !opts.reveal || opts.reveal === "none") s.classList.add("cfx-in"); else io.observe(s); });
  cleanups.push(() => io.disconnect());

  // films play in place, only while on screen
  for (const [i, x, y, w, h, f, rad] of opts.videos || []) {
    if (!secs[i]) continue;
    const box = document.createElement("div"); box.className = "cfx-video";
    box.innerHTML = `<video muted loop playsinline preload="none" aria-label="Project film"></video><button type="button" class="cfx-vbtn" aria-label="Pause the film">❚❚</button>`;
    place(i, box, x, y, w, h);
    if (rad) box.style.borderRadius = `${rad / w * 100}% / ${rad / h * 100}%`;
    const vid = box.querySelector("video"), btn = box.querySelector("button");
    vid.src = asset(f);
    let user = false;   // a visitor's pause wins over autoplay
    const set = (play) => { if (play) vid.play().catch(() => {}); else vid.pause(); };
    vid.addEventListener("play", () => { box.classList.add("on"); btn.textContent = "❚❚"; btn.setAttribute("aria-label", "Pause the film"); });
    vid.addEventListener("pause", () => { btn.textContent = "▶"; btn.setAttribute("aria-label", "Play the film"); });
    btn.addEventListener("click", (e) => { e.stopPropagation(); user = !vid.paused; set(vid.paused); });
    const vio = new IntersectionObserver((es) => { const on = es[0].isIntersecting; if (on && !user && !reduce) { vid.preload = "auto"; set(true); } if (!on) set(false); }, { threshold: 0.35 });
    vio.observe(box);
    if (reduce) { vid.preload = "metadata"; box.classList.add("on"); vid.controls = true; btn.hidden = true; }
    cleanups.push(() => { vio.disconnect(); vid.pause(); vid.removeAttribute("src"); vid.load(); });
  }

  // drag to compare (two images of the same place, e.g. day and night)
  if (opts.compare && secs[opts.compare[0]]) {
    const [i, x, y, w, h, f, la, lb] = opts.compare;
    const box = document.createElement("div"); box.className = "cfx-compare"; box.tabIndex = 0;
    box.setAttribute("role", "slider"); box.setAttribute("aria-label", `${la} or ${lb}: drag to compare`); box.setAttribute("aria-valuemin", "0"); box.setAttribute("aria-valuemax", "100");
    box.innerHTML = `<img src="${asset(f)}" srcset="${asset(f)} 1x, ${asset(f.replace(/\.(\w+)$/, "@2x.$1"))} 2x" alt="${lb}" decoding="async" loading="lazy"><i class="cfx-handle"><b></b></i><span class="cfx-tag l">${la}</span><span class="cfx-tag r">${lb}</span>`;
    place(i, box, x, y, w, h);
    let p = 100;
    const setP = (v) => { p = Math.max(0, Math.min(100, v)); box.style.setProperty("--p", p + "%"); box.setAttribute("aria-valuenow", Math.round(100 - p)); };
    const at = (e) => { const r = box.getBoundingClientRect(); setP((e.clientX - r.left) / r.width * 100); };
    let drag = false;
    box.addEventListener("pointerdown", (e) => { drag = true; box.setPointerCapture(e.pointerId); box.classList.add("drag"); at(e); });
    box.addEventListener("pointermove", (e) => { if (drag) at(e); });
    const up = () => { drag = false; box.classList.remove("drag"); };
    box.addEventListener("pointerup", up); box.addEventListener("pointercancel", up);
    box.addEventListener("keydown", (e) => { if (e.key === "ArrowLeft") { setP(p - 5); e.preventDefault(); } if (e.key === "ArrowRight") { setP(p + 5); e.preventDefault(); } });
    setP(50);   // rests at the middle: day on the left, night on the right; drag to compare

  }

  // a line that draws itself (Carekin: the anxiety curve, with the two red hand-off moments pulsing)
  if (opts.draw && secs[opts.draw[0]]) {
    const [i, x, y, w, h, f, pts = []] = opts.draw;
    const box = document.createElement("div"); box.className = "cfx-draw"; box.setAttribute("aria-hidden", "true");
    box.innerHTML = `<img src="${asset(f)}" srcset="${asset(f)} 1x, ${asset(f.replace(/\.(\w+)$/, "@2x.$1"))} 2x" alt="" decoding="async">` +
      pts.map(([px, py], k) => `<i class="cfx-ring" style="left:${(px - x) / w * 100}%;top:${(py - y) / h * 100}%;--d:${k * 0.35}s"></i>`).join("");
    place(i, box, x, y, w, h);
    secs[i].classList.add("cfx-drawsec");
    if (reduce) box.classList.add("on");
    else { const dio = new IntersectionObserver((es) => { if (es[0].isIntersecting) { box.classList.add("on"); dio.disconnect(); } }, { threshold: 0.45 }); dio.observe(box); cleanups.push(() => dio.disconnect()); }
  }

  // v179: layers that rise into place when seen, one after another (Handovo: the four big numbers in the context section)
  // v182: the numbers stay in the still; each pop covers its own with the section colour and animates a copy in, so if this
  // script can't run the numbers still show, and a slow observer gets a 700 ms in-view check as a backstop
  if (opts.pops) opts.pops.forEach(([i, x, y, w, h, f, bg], k) => {
    if (!secs[i]) return;
    const box = document.createElement("div"); box.className = "cfx-pop"; box.setAttribute("aria-hidden", "true"); box.style.setProperty("--d", (k % 3) * 0.16 + "s"); if (bg) box.style.background = bg;
    box.innerHTML = `<img src="${asset(f)}" srcset="${asset(f)} 1x, ${asset(f.replace(/\.(\w+)$/, "@2x.$1"))} 2x" alt="" decoding="async">`;
    place(i, box, x, y, w, h);
    if (reduce) box.classList.add("on");
    else {
      const on = () => { box.classList.add("on"); o.disconnect(); clearInterval(t); };
      const o = new IntersectionObserver((es) => { if (es[0].isIntersecting) on(); }, { threshold: 0.3 }); o.observe(box);
      const t = setInterval(() => { const r = box.getBoundingClientRect(); if (r.height && r.top < innerHeight - r.height * 0.3 && r.bottom > r.height * 0.3) on(); }, 700);
      cleanups.push(() => { o.disconnect(); clearInterval(t); });
    }
  });

  const mo = new MutationObserver(() => { if (!caseEl.isConnected) { cleanups.forEach((f) => { try { f(); } catch (_) {} }); mo.disconnect(); } });
  mo.observe(caseEl.ownerDocument.body, { childList: true, subtree: true });
}
