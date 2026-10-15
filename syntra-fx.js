// Syntra case study: motion layer (loaded only when the Syntra case study opens, see os.js openCase → p.case.fx).
// The sections are 2× exports of Sijo's Figma documentation with the moving parts left out; this file puts those parts back
// as live layers, in the project's own language: amber mist, things coming into focus, a kiosk that is switched on.
// Everything is positioned in the documentation's own 1440-px coordinates (x, y, w, h), so it lines up at every width.
import * as THREE from "./vendor/three/build/three.module.min.js";   // same file the room loads (one copy in memory)

const W = 1440;
const AMBER = ["#F99C36", "#E39A1B", "#D37A19", "#BD680F", "#975C1C"];

export default function syntra(caseEl, { slug, v, sections, base = "" }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const touch = matchMedia("(pointer: coarse)").matches;
  const asset = (f) => `${base}work/${slug}/fx/${f}?v=${v}`;
  if (!document.querySelector("link[data-sx]")) { const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `${base}syntra-fx.css?v=${v}`; l.dataset.sx = ""; document.head.appendChild(l); }
  const srcset = (f) => `${asset(f)} 1x, ${asset(f.replace(/\.(\w+)$/, "@2x.$1"))} 2x`;
  const cleanups = [];
  caseEl.classList.add("case-syntra");

  // ── 1. wrap every section so layers can sit on it ──
  const imgs = [...caseEl.querySelectorAll(":scope > img")];
  const secs = imgs.map((im, i) => {
    const s = document.createElement("div");
    s.className = "sx-sec"; s.dataset.i = i;
    s.style.setProperty("--h", sections[i][1]);
    im.replaceWith(s); s.appendChild(im); im.classList.add("sx-base");
    return s;
  });
  const H = (i) => +sections[i][1];
  // a box in documentation coordinates → percentages of its section
  function box(i, el, x, y, w, h) {
    Object.assign(el.style, { left: (x / W) * 100 + "%", top: (y / H(i)) * 100 + "%", width: (w / W) * 100 + "%", height: (h / H(i)) * 100 + "%" });
    return el;
  }
  function layer(i, cls, x, y, w, h, html = "") {
    const d = document.createElement("div"); d.className = "sx-layer " + cls; d.innerHTML = html;
    box(i, d, x, y, w, h); secs[i].appendChild(d); return d;
  }
  function img(f, alt = "") { return `<img src="${asset(f)}" srcset="${srcset(f)}" alt="${alt}" decoding="async" loading="lazy">`; }
  // the section width in px, for type that scales with the page
  const ro = new ResizeObserver(() => { const w = caseEl.clientWidth || 1440; caseEl.style.setProperty("--u", w / W + "px"); });
  ro.observe(caseEl); cleanups.push(() => ro.disconnect());

  // ── 2. sections surface out of a mist as they scroll in ──
  const seen = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return;
    e.target.classList.add("sx-in"); seen.unobserve(e.target);
    const fn = onEnter[e.target.dataset.i]; if (fn) fn();
  }), { rootMargin: "0px 0px -12% 0px", threshold: 0.04 });
  const onEnter = {};
  secs.forEach((s, i) => { if (i === 0 || reduce) s.classList.add("sx-in"); else seen.observe(s); });
  cleanups.push(() => seen.disconnect());

  // ── 3. Cover: the bottle breathes behind the page, the headline drifts in and out of focus ──
  secs[0].classList.add("sx-stack");
  layer(0, "sx-under sx-breathe", 0, 0, 1440, 2024, img("cover-bg.webp"));
  layer(0, "sx-under sx-drift", -555, 1598, 1449, 1127, img("cover-bottles.webp"));
  layer(0, "sx-mul sx-focus", 150, 1250, 1140, 180, img("find-text.webp", "Let's find your perfume."));
  // Reflection closes on the same line
  layer(14, "sx-mul sx-focus", 150, 2141, 1140, 180, img("find-text.webp", "Let's find your perfume."));

  // ── 4. Meet Syntra: the kiosk photo, slowly breathing in its light ──
  layer(1, "sx-mul sx-kenburns", 70, 350, 1300, 1000, img("meet-hero.webp", "Syntra at our exhibit: a visitor in the VR headset in front of the lit backdrop and the screen."));

  // ── 5. How it works: the line draws itself, the controls move, the weights grow, 162 counts up ──
  const how = layer(7, "sx-svg", 0, 0, 1440, 3300, `
    <svg viewBox="0 0 1440 3300" aria-hidden="true">
      <defs>
        <linearGradient id="sxLine" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#F99C36"/><stop offset="1" stop-color="#593314"/></linearGradient>
        <linearGradient id="sxCap" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#3A3430"/><stop offset="1" stop-color="#141110"/></linearGradient>
        <radialGradient id="sxGlow"><stop offset="0" stop-color="#F99C36" stop-opacity=".55"/><stop offset="1" stop-color="#F99C36" stop-opacity="0"/></radialGradient>
      </defs>
      <g class="sx-flow" fill="none" stroke="url(#sxLine)" stroke-linecap="round">
        <path pathLength="1" stroke-width="4" d="M 220 560 C 350 460 420 660 550 560 C 680 460 750 660 880 560 C 1010 460 1080 660 1210 560"/>
        <path pathLength="1" stroke-width="3" style="--d:1.9s" d="M 1210 560 C 1210 680 900 700 880 840"/>
        <path pathLength="1" stroke-width="3" style="--d:1.9s" d="M 1210 560 C 1290 650 1290 760 1210 840"/>
        <path pathLength="1" stroke-width="3" style="--d:2.6s" d="M 1210 840 C 1130 920 1130 1000 1210 1080"/>
      </g>
      <g class="sx-dots">${[[220, 560, 0], [550, 560, .45], [880, 560, .9], [1210, 560, 1.35], [880, 840, 2.3], [1210, 840, 2.3], [1210, 1080, 3]].map(([x, y, d]) =>
        `<g style="--d:${d}s"><circle class="sx-ping" cx="${x}" cy="${y}" r="13" fill="none" stroke="#BD680F" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="13" fill="#fff" stroke="#BD680F" stroke-width="1.5"/><circle cx="${x}" cy="${y}" r="5" fill="#BD680F"/></g>`).join("")}</g>
      <g class="sx-knob"><circle class="sx-knobglow" r="16" fill="url(#sxGlow)"/></g>
      <g class="sx-tick" style="transform-origin:360px 1710px"><line x1="360" y1="1690" x2="360" y2="1655" stroke="#EADCCB" stroke-width="4" stroke-linecap="round"/></g>
      <g class="sx-caps">${[588, 778, 968].map((x) => `<g class="sx-cap" style="--x:${x}px"><rect x="0" y="0" width="30" height="40" rx="4" fill="url(#sxCap)"/><rect x="4" y="19" width="22" height="2" fill="#E8E1D8"/></g>`).join("")}</g>
      <g class="sx-bars">${[[36, "#E39A1B"], [26, "#D37A19"], [22, "#BD680F"], [16, "#975C1C"]].reduce((a, [v, c]) => {
        const w = 1072 * v / 100; a.s += `<rect x="${a.x}" y="2490" width="${w - 4}" height="14" rx="7" fill="${c}" style="--d:${a.k * .18}s"/>`; a.x += w; a.k++; return a; }, { s: "", x: 184, k: 0 }).s}</g>
    </svg>`);
  const n162 = layer(7, "sx-num", 184, 2140, 360, 220, `<span style="--fs:180">0</span>`);
  // knob: the six marks of the printed dial (0° = up, clockwise), sliders: three steps each
  const ANG = [-145, -90, -35, 35, 90, 145], KX = 360, KY = 1710;
  const tick = how.querySelector(".sx-tick"), glow = how.querySelector(".sx-knobglow"), caps = [...how.querySelectorAll(".sx-cap")];
  const capY = (s) => 1805 - 115 * s;   // cap top for step s (0 = bottom)
  let mood = 2, steps = [0, 1, 0], tickTimer = 0;
  function setControls() {
    tick.style.transform = `rotate(${ANG[mood]}deg)`;
    const a = ANG[mood] * Math.PI / 180; glow.setAttribute("cx", KX + Math.sin(a) * 96); glow.setAttribute("cy", KY - Math.cos(a) * 96);
    caps.forEach((c, k) => c.style.transform = `translate(var(--x), ${capY(steps[k])}px)`);
  }
  setControls();
  onEnter[7] = () => {
    how.classList.add("sx-go");
    count(n162.firstChild, 162, 1600, 600);
    if (reduce) return;
    tickTimer = setInterval(() => {
      mood = (mood + 1) % 6;
      const k = Math.floor(Math.random() * 3); steps[k] = (steps[k] + 1 + Math.floor(Math.random() * 2)) % 3;
      setControls();
    }, 1500);
  };
  cleanups.push(() => clearInterval(tickTimer));

  // ── 6. The screens: the kiosk plays its own sequence inside the hero screen ──
  const loop = layer(8, "sx-loop", 0, 360, 1440, 810,
    [0, 1, 2, 3, 4, 5, 6].map((k) => `<img src="${asset(`loop-${k}.webp`)}" srcset="${asset(`loop-${k}.webp`)} 960w, ${asset(`loop-${k}@2x.webp`)} 1920w" sizes="100vw" alt="" decoding="async" loading="lazy">`).join(""));
  let loopTimer = 0;
  onEnter[8] = () => {
    if (reduce) return;
    const frames = [...loop.children], hold = [2600, 2400, 2400, 1500, 1900, 1700, 5200];
    let k = 0;
    const next = () => { frames.forEach((f, j) => f.classList.toggle("on", j === k)); loopTimer = setTimeout(() => { k = (k + 1) % frames.length; next(); }, hold[k]); };
    loop.classList.add("sx-run"); next();
  };
  cleanups.push(() => clearTimeout(loopTimer));

  // ── 7. Step inside: the panorama strip is a live 360° view you can drag ──
  const WORLDS = [
    ["symmetrical_garden_02", "Flower garden"], ["bell_park_pier", "Lake pier"], ["autumn_forest_04", "Autumn forest"],
    ["rogland_clear_night", "Milky Way"], ["dry_orchard_meadow", "Orchard"], ["lago_disola", "Snowy Alps"],
    ["forest_slope", "Pine forest"], ["kiara_1_dawn", "Desert dawn"], ["lakeside_night", "Starry lake"], ["small_harbor_01", "Lobby"]];
  const vr = layer(9, "sx-vr", 0, 1480, 1440, 281, `
    <canvas aria-label="360 degree view of a Syntra VR world. Drag to look around."></canvas>
    <p class="sx-vr-hint">Drag to look around</p>
    <div class="sx-vr-chips" role="group" aria-label="Choose a world">${WORLDS.map(([f, n], k) => `<button type="button" data-w="${k}"${k ? "" : ' aria-pressed="true"'}>${n}</button>`).join("")}</div>`);
  let vrStop = () => {};
  const vrIO = new IntersectionObserver((es) => {
    if (!es[0].isIntersecting) return; vrIO.disconnect();
    try { vrStop = startVR(vr, WORLDS.map((w) => asset(`pano-${w[0]}.webp`)), reduce, touch); } catch (_) { vr.classList.add("sx-vr-off"); }
  }, { rootMargin: "600px 0px" });
  vrIO.observe(vr);
  cleanups.push(() => { vrIO.disconnect(); vrStop(); });

  // ── 8. Take it home: six tickets feed out of the printer, then 66 counts up ──
  const tickets = ["164936", "165536", "170525", "174335", "200951", "140032"].map((r, k) =>
    layer(10, "sx-ticket", 110 + k * 208, 400, 192, 562, `<img src="${asset(`receipt-${r}.webp`)}" alt="" decoding="async" loading="lazy">`));
  tickets.forEach((t, k) => t.style.setProperty("--d", k * 0.32 + "s"));
  const n66 = layer(10, "sx-num", 760, 1520, 300, 180, `<span style="--fs:140">0</span>`);
  onEnter[10] = () => { secs[10].classList.add("sx-go"); count(n66.firstChild, 66, 1400, 2300); };

  // ── 9. perfume motes drifting up through the page, and a warm lantern that follows the pointer ──
  const stopMotes = reduce ? () => {} : motes(caseEl, touch);
  cleanups.push(stopMotes);

  // counters
  function count(el, to, ms, delay) {
    if (reduce) { el.textContent = to; return; }
    setTimeout(() => {
      const t0 = performance.now();
      const step = (t) => { const p = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - p, 3); el.textContent = Math.round(to * e); if (p < 1 && caseEl.isConnected) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    }, delay);
  }

  // everything stops when the case study closes (its DOM is replaced)
  const mo = new MutationObserver(() => { if (!caseEl.isConnected) { cleanups.forEach((f) => { try { f(); } catch (_) {} }); mo.disconnect(); } });
  mo.observe(caseEl.ownerDocument.body, { childList: true, subtree: true });
  caseEl.classList.add("fx-ready");   // os.js keeps the complete stills if this never happens
}

// ── the 360° viewer (three.js, the same build the room uses) ──
function startVR(host, urls, reduce, touch) {
  const canvas = host.querySelector("canvas");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  const scene = new THREE.Scene(), camera = new THREE.PerspectiveCamera(40, 4, 0.1, 1100);
  const geo = new THREE.SphereGeometry(500, 96, 48); geo.scale(-1, 1, 1);
  const matl = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0 });
  scene.add(new THREE.Mesh(geo, matl));
  const loader = new THREE.TextureLoader(), cache = {};
  let lon = 90, lat = -4, vlon = 0, drag = false, px = 0, py = 0, last = 0, cur = -1, fade = 0, alive = true, visible = true;
  function size() { const r = host.getBoundingClientRect(); if (!r.width) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.fov = Math.min(70, 40 * Math.max(1, 3.6 / camera.aspect)); camera.updateProjectionMatrix(); }
  const ro = new ResizeObserver(size); ro.observe(host); size();
  function show(k) {
    if (k === cur) return; cur = k;
    host.querySelectorAll("[data-w]").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.w === k)));
    const go = (t) => { if (cur !== k) return; matl.map = t; matl.needsUpdate = true; fade = 0; };
    if (cache[k]) return go(cache[k]);
    loader.load(urls[k], (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); cache[k] = t; go(t); });
  }
  host.addEventListener("click", (e) => { const b = e.target.closest("[data-w]"); if (b) { show(+b.dataset.w); lon = 90; } });
  canvas.addEventListener("pointerdown", (e) => { drag = true; px = e.clientX; py = e.clientY; vlon = 0; canvas.setPointerCapture(e.pointerId); host.classList.add("sx-dragging"); });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return; const k = camera.fov / host.clientHeight;
    const dx = (px - e.clientX) * k, dy = (e.clientY - py) * k; lon += dx; lat += dy; vlon = dx; px = e.clientX; py = e.clientY; last = performance.now();
  });
  const up = () => { drag = false; host.classList.remove("sx-dragging"); };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);
  const io = new IntersectionObserver((es) => { visible = es[0].isIntersecting; }); io.observe(host);
  show(0);
  const target = new THREE.Vector3(); let prev = performance.now();
  function tick(now) {
    if (!alive) return;
    requestAnimationFrame(tick);
    if (!visible || !host.isConnected) return;
    const dt = Math.min(0.05, (now - prev) / 1000); prev = now;
    if (!drag) { lon += vlon; vlon *= 0.92; if (!reduce && now - last > 2500) lon += 2.4 * dt; }
    lat = Math.max(-35, Math.min(35, lat));
    fade = Math.min(1, fade + dt * 1.6); matl.opacity = fade;
    const phi = THREE.MathUtils.degToRad(90 - lat), th = THREE.MathUtils.degToRad(lon);
    target.set(500 * Math.sin(phi) * Math.cos(th), 500 * Math.cos(phi), 500 * Math.sin(phi) * Math.sin(th));
    camera.lookAt(target); renderer.render(scene, camera);
  }
  requestAnimationFrame(tick);
  return () => { alive = false; ro.disconnect(); io.disconnect(); Object.values(cache).forEach((t) => t.dispose()); geo.dispose(); matl.dispose(); renderer.dispose(); };
}

// ── perfume motes: a few warm specks rising slowly, like mist caught in light ──
function motes(caseEl, touch) {
  const cv = document.createElement("canvas"); cv.className = "sx-motes"; cv.setAttribute("aria-hidden", "true");
  const lamp = document.createElement("div"); lamp.className = "sx-lamp"; lamp.setAttribute("aria-hidden", "true");
  const host = caseEl.parentElement; document.body.appendChild(cv); if (!touch) document.body.appendChild(lamp);
  const g = cv.getContext("2d"); let w = 0, h = 0, dpr = Math.min(devicePixelRatio || 1, 2), alive = true;
  const sprite = document.createElement("canvas"); sprite.width = sprite.height = 64;
  const sg = sprite.getContext("2d"), rg = sg.createRadialGradient(32, 32, 0, 32, 32, 32);
  rg.addColorStop(0, "rgba(249,156,54,.9)"); rg.addColorStop(.35, "rgba(227,154,27,.35)"); rg.addColorStop(1, "rgba(218,179,118,0)");
  sg.fillStyle = rg; sg.fillRect(0, 0, 64, 64);
  const N = touch ? 26 : 46, P = [];
  const fit = () => { w = innerWidth; h = innerHeight; cv.width = w * dpr; cv.height = h * dpr; };
  fit(); addEventListener("resize", fit);
  for (let i = 0; i < N; i++) P.push(spawn(true));
  function spawn(any) { return { x: Math.random() * w, y: any ? Math.random() * h : h + 20, r: 3 + Math.random() * 9, s: 6 + Math.random() * 16, a: .12 + Math.random() * .35, ph: Math.random() * 6.28, sw: 8 + Math.random() * 22 }; }
  const scrollY_ = () => (host.scrollHeight > host.clientHeight + 1 && getComputedStyle(host).overflowY !== "visible" ? host.scrollTop : scrollY);
  let mx = -999, my = -999, lx = -999, ly = -999, lastY = scrollY_(), prev = performance.now();
  const move = (e) => { mx = e.clientX; my = e.clientY; };
  addEventListener("pointermove", move);
  function frame(t) {
    if (!alive) return;
    if (!caseEl.isConnected) return stop();
    requestAnimationFrame(frame);
    const dt = Math.min(.05, (t - prev) / 1000); prev = t;
    const sy = scrollY_(), ds = sy - lastY; lastY = sy;   // scrolling stirs the air a little
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    for (const p of P) {
      p.y -= (p.s * dt) + ds * 0.08 * (p.r / 12); p.ph += dt * .6;
      const x = p.x + Math.sin(p.ph) * p.sw;
      if (p.y < -30 || p.y > h + 40) Object.assign(p, spawn(false), ds < 0 ? { y: -20 } : {});
      g.globalAlpha = p.a * (.6 + .4 * Math.sin(p.ph * 1.7)); g.drawImage(sprite, x - p.r, p.y - p.r, p.r * 2, p.r * 2);
    }
    if (!touch && mx > -999) { lx += (mx - lx) * .08; ly += (my - ly) * .08; if (lx < -900) { lx = mx; ly = my; } lamp.style.transform = `translate(${lx}px, ${ly}px)`; lamp.classList.add("on"); }
  }
  requestAnimationFrame(frame);
  function stop() { alive = false; removeEventListener("resize", fit); removeEventListener("pointermove", move); cv.remove(); lamp.remove(); }
  return stop;
}
