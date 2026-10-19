// Ekmaati case study: the real packaging (loaded by os.js openCase because content.js gives case.fx: "ekmaati-fx.js").
// Adds two sections after "The temple box" (section 19):
//   1. "Peel the arch": the final box in 3D, built from photographs of the real prototype. Drag to turn it;
//      grab a tab by the half-moon notch at its foot and pull up: it tears along the perforation and falls
//      away, revealing the temple. Front, left and right are tabs; the back panel (care + unboxing text) stays.
//   2. "Made, not rendered": three films and nine photographs of the prototype, backgrounds removed (Apple Vision,
//      on device; tools/ekmaati/cut.swift + vcut.swift), on the case study's own paper colour.
import * as THREE from "./vendor/three/build/three.module.min.js";

const PAPER = "#F4F0E8", EARTH = "#5A3A1E", GOLD = "#E3A53A";

export default function ekmaatiFx(caseEl, { slug, v }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const A = (f) => `work/${slug}/fx/${f}?v=${v}`;
  const cleanups = [];
  injectCss(v);

  const imgs = [...caseEl.querySelectorAll(":scope > img")];
  const after = imgs[18] || imgs[imgs.length - 1];   // 19.webp, "The temple box"
  if (!after) return;

  // ---------- section 1: the box you can peel ----------
  const s1 = document.createElement("section");
  s1.className = "ekx ekx-peel";
  s1.setAttribute("aria-label", "Interactive model of the Ekmaati temple box");
  s1.innerHTML = `
    <div class="ekx-copy">
      <p class="ekx-eye">19b · Hold it</p>
      <h2 class="ekx-h"><span class="ekx-serif">Peel the</span><br><b>ARCH</b></h2>
      <p class="ekx-p">The sleeve is one printed sheet with three perforated tabs: front, left and right. Each tab has a half-moon notch at its foot. Hook a finger in, pull up, and the tab tears away along its perforation. Behind it the temple is already standing. The back panel stays on, carrying the care and unboxing steps.</p>
      <ul class="ekx-how">
        <li><b>Drag</b> the box to turn it.</li>
        <li><b>Grab a notch</b> and pull up to peel a tab.</li>
      </ul>
      <p class="ekx-count" aria-live="polite"><span>0</span> of 3 tabs peeled</p>
      <div class="ekx-btns"><button type="button" class="ekx-b ekx-next">Peel the next tab</button><button type="button" class="ekx-b ekx-reset" hidden>Close the sleeve again</button></div>
      <p class="ekx-note">Built from photographs of the real cardboard prototype.</p>
    </div>
    <div class="ekx-stage"><canvas aria-label="The temple box in 3D. Drag to turn it, pull a tab up by its notch to peel it." role="img"></canvas><p class="ekx-tip">Pull here ↑</p></div>`;
  after.after(s1);

  // ---------- section 2: the real thing ----------
  const films = [
    ["film-peel", "Unboxing: one hand on the base, the three tabs come away one by one."],
    ["film-sleeve", "The closed sleeve, all four sides: two illustrated tabs, the front and the back panel."],
    ["film-temple", "The temple left behind, all the way round."],
  ];
  const photos = [
    ["sleeve-front", "Front tab: Miniature Ganesh Idols, 6-inch unbaked clay figurine."],
    ["sleeve-left", "Left tab: a family at the home shrine."],
    ["sleeve-right", "Right tab: the procession to the water, and the back panel with the barcode."],
    ["sleeve-back", "Back panel: care and unboxing instructions. It stays on the temple."],
    ["sleeve-34", "The sleeve closed, from the corner."],
    ["temple-front", "The temple, front on: the arch frames the idol."],
    ["temple-34", "Roof tier and peak sit on top of the body; the plinth lifts the idol."],
    ["temple-side", "Through the side arch: the sunburst on the back wall."],
    ["temple-34b", "No tape and no plastic: the box holds itself together."],
  ];
  const s2 = document.createElement("section");
  s2.className = "ekx ekx-real";
  s2.setAttribute("aria-label", "Photographs and films of the real Ekmaati box");
  s2.innerHTML = `
    <div class="ekx-head"><p class="ekx-eye">19c · The real box</p><h2 class="ekx-h"><span class="ekx-serif">Made, not</span> <b>RENDERED</b></h2>
      <p class="ekx-p">Printed, cut, scored and folded by hand: 350 GSM board, sleeve over temple. Every image here is the prototype itself, with the room taken out.</p></div>
    <div class="ekx-films">${films.map(([f, c], i) => `<figure class="ekx-film${i === 0 ? " big" : ""}"><div class="ekx-vid"><video muted loop playsinline preload="none" poster="${A(f + ".webp")}" aria-label="${c}"></video><button type="button" class="ekx-vb" aria-label="Pause the film">❚❚</button></div><figcaption>${c}</figcaption></figure>`).join("")}</div>
    <div class="ekx-grid">${photos.map(([f, c]) => `<figure class="ekx-ph"><img src="${A("real/" + f + ".webp")}" srcset="${A("real/" + f + ".webp")} 1x, ${A("real/" + f + "@2x.webp")} 2x" alt="${c}" loading="lazy" decoding="async"><figcaption>${c}</figcaption></figure>`).join("")}</div>`;
  s1.after(s2);

  // films play only while on screen; a visitor's pause wins
  s2.querySelectorAll(".ekx-film").forEach((fig, i) => {
    const vid = fig.querySelector("video"), btn = fig.querySelector("button");
    vid.src = A(films[i][0] + ".mp4");
    let user = false;
    const set = (p) => { if (p) vid.play().catch(() => {}); else vid.pause(); };
    vid.addEventListener("play", () => { btn.textContent = "❚❚"; btn.setAttribute("aria-label", "Pause the film"); });
    vid.addEventListener("pause", () => { btn.textContent = "▶"; btn.setAttribute("aria-label", "Play the film"); });
    btn.addEventListener("click", () => { user = !vid.paused; set(vid.paused); });
    if (reduce) { vid.controls = true; btn.hidden = true; vid.preload = "metadata"; return; }
    const io = new IntersectionObserver((es) => { const on = es[0].isIntersecting; if (on && !user) { vid.preload = "auto"; set(true); } if (!on) set(false); }, { threshold: 0.4 });
    io.observe(fig);
    cleanups.push(() => { io.disconnect(); vid.pause(); vid.removeAttribute("src"); vid.load(); });
  });

  // ---------- the 3D box ----------
  const canvas = s1.querySelector("canvas"), stage = s1.querySelector(".ekx-stage"), tip = s1.querySelector(".ekx-tip");
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" }); }
  catch (_) { stage.classList.add("ekx-nogl"); stage.innerHTML = `<img src="${A("real/temple-34.webp")}" alt="The Ekmaati temple box, sleeve peeled away.">`; s1.querySelector(".ekx-how").hidden = true; s1.querySelector(".ekx-btns").hidden = true; s1.querySelector(".ekx-count").hidden = true; finish(); return; }
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  cam.position.set(0, 1.2, 4.8); cam.lookAt(0, 0.82, 0);

  scene.add(new THREE.HemisphereLight(0xfffaf0, 0xcbbfae, 2.1));
  const sun = new THREE.DirectionalLight(0xffffff, 1.5); sun.position.set(2.5, 4, 3); scene.add(sun);

  const loader = new THREE.TextureLoader();
  const tex = (f) => { const t = loader.load(A("tex/" + f + ".webp"), () => (dirty = true)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; };
  const mat = (map, o = {}) => new THREE.MeshStandardMaterial({ map, roughness: 0.92, metalness: 0, ...o });
  const paper = mat(null, { color: 0xf6f2ea });

  // proportions measured from the photographs (sleeve face 975 × 1449 px, square footprint)
  const Wd = 1.0, H = 1.49, PL = 0.17, BODY = H - PL, h = Wd / 2;
  const box = new THREE.Group(); scene.add(box);

  // soft contact shadow
  const sh = document.createElement("canvas"); sh.width = sh.height = 128;
  const sg = sh.getContext("2d"), gr = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, "rgba(60,40,20,.42)"); gr.addColorStop(1, "rgba(60,40,20,0)"); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.3, 2.3), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.001; scene.add(shadow);

  // temple: plinth, four arched faces, ceiling, sunburst back wall, the idol, roof tier and peak
  const plinthT = tex("t_plinth"), faceT = tex("t_face"), roofT = tex("t_roof");
  const plinth = new THREE.Mesh(new THREE.BoxGeometry(Wd * 0.985, PL, Wd * 0.985), [mat(plinthT), mat(plinthT), paper, paper, mat(plinthT), mat(plinthT)]);
  plinth.position.y = PL / 2; box.add(plinth);
  const faceM = mat(faceT, { alphaTest: 0.5, side: THREE.DoubleSide });
  const ti = h * 0.97;
  for (let k = 0; k < 4; k++) {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(Wd * 0.97, BODY), faceM);
    const a = k * Math.PI / 2; f.position.set(Math.sin(a) * ti, PL + BODY / 2, Math.cos(a) * ti); f.rotation.y = a; box.add(f);
  }
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(Wd * 0.97, Wd * 0.97), paper); ceil.rotation.x = Math.PI / 2; ceil.position.y = H - 0.005; box.add(ceil);
  const lid = new THREE.Mesh(new THREE.PlaneGeometry(Wd * 0.99, Wd * 0.99), paper); lid.rotation.x = -Math.PI / 2; lid.position.y = H + 0.002; box.add(lid);
  const back = new THREE.Mesh(new THREE.PlaneGeometry(Wd * 0.9, BODY * 0.92), new THREE.MeshStandardMaterial({ map: sunburst(), roughness: 1 }));
  back.position.set(0, PL + BODY * 0.48, -ti + 0.12); box.add(back);
  const idolT = tex("idol");
  const idol = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.62 * 909 / 570), new THREE.MeshStandardMaterial({ map: idolT, transparent: true, alphaTest: 0.35, roughness: 0.95 }));
  idol.position.set(0, PL + 0.03 + 0.62 * 909 / 570 / 2, 0); box.add(idol);
  const RW = 0.52, RH = 0.1;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RW), [mat(roofT), mat(roofT), paper, paper, mat(roofT), mat(roofT)]);
  roof.position.y = H + RH / 2; box.add(roof);
  const peak = new THREE.Mesh(new THREE.ConeGeometry(0.17, 0.13, 4, 1), mat(null, { color: 0xf3ede2 }));
  peak.rotation.y = Math.PI / 4; peak.position.y = H + RH + 0.065; box.add(peak);
  const tilak = new THREE.Mesh(new THREE.SphereGeometry(0.014, 12, 8), new THREE.MeshBasicMaterial({ color: 0xc0392b })); tilak.position.y = H + RH + 0.135; box.add(tilak);

  // sleeve: back panel fixed, three tabs hinged along their top edge
  const so = h + 0.012;
  const sleeveFace = (t) => mat(t, { side: THREE.FrontSide });
  const inside = mat(null, { color: 0xe9e1d2, side: THREE.BackSide });
  const tabs = [];
  [["s_front", 0], ["s_right", Math.PI / 2], ["s_back", Math.PI], ["s_left", -Math.PI / 2]].forEach(([f, ry]) => {
    const holder = new THREE.Group(); holder.rotation.y = ry; box.add(holder);
    const pivot = new THREE.Group(); pivot.position.set(0, H, so); holder.add(pivot);
    const geo = new THREE.PlaneGeometry(Wd + 0.024, H);
    const panel = new THREE.Group(); panel.position.y = -H / 2; pivot.add(panel);
    const m1 = new THREE.Mesh(geo, sleeveFace(tex(f))), m2 = new THREE.Mesh(geo, inside);
    panel.add(m1, m2);
    if (f === "s_back") return;
    // the half-moon notch at the foot, and a pulsing ring until the first peel
    const notch = new THREE.Mesh(new THREE.CircleGeometry(0.075, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a2614 }));
    notch.position.set(0, -H / 2 + 0.002, 0.003); panel.add(notch);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.1, 0.12, 32), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.8, depthTest: false }));
    ring.position.set(0, -H / 2 + 0.05, 0.006); panel.add(ring);
    const t = { holder, pivot, panel, face: m1, ring, mats: [m1.material, m2.material, notch.material], ang: 0, vel: 0, state: "on", fall: null };
    m1.userData.tab = t; m2.userData.tab = t; notch.userData.tab = t;
    tabs.push(t);
  });

  // ---------- interaction ----------
  let rotY = -0.55, rotX = 0.06, vY = 0, idle = 0, dirty = true;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const live = tabs.filter((t) => t.state === "on").flatMap((t) => t.panel.children);
    const i = ray.intersectObjects(live, false)[0];
    if (!i) return null;
    const t = i.object.userData.tab; const uvY = i.uv ? i.uv.y : 0;
    return uvY < 0.42 ? t : null;   // the lower part of a tab, around the notch, is the grip
  };
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    const t = hit(e);
    canvas.setPointerCapture(e.pointerId);
    drag = t ? { kind: "peel", t, y0: e.clientY, a0: t.ang } : { kind: "turn", x: e.clientX, y: e.clientY, t: performance.now() };
    if (t) { t.state = "held"; t.ring.visible = false; stage.classList.add("peeling"); }
    idle = 0; e.preventDefault();
  });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) { canvas.style.cursor = hit(e) ? "grab" : "ew-resize"; return; }
    if (drag.kind === "turn") {
      const dx = e.clientX - drag.x, dy = e.clientY - drag.y, now = performance.now();
      rotY += dx * 0.009; rotX = Math.max(-0.25, Math.min(0.45, rotX + dy * 0.004));
      vY = (dx * 0.009) / Math.max(8, now - drag.t) * 16;
      drag.x = e.clientX; drag.y = e.clientY; drag.t = now;
    } else {
      const r = canvas.getBoundingClientRect();
      drag.t.ang = Math.max(0, Math.min(2.2, drag.a0 + (drag.y0 - e.clientY) / (r.height * 0.42) * 2.2));
      canvas.style.cursor = "grabbing";
    }
    dirty = true;
  });
  const up = () => {
    if (drag && drag.kind === "peel") {
      const t = drag.t; stage.classList.remove("peeling");
      if (t.ang > 1.0) tear(t); else t.state = "on";
    }
    drag = null;
  };
  canvas.addEventListener("pointerup", up); canvas.addEventListener("pointercancel", up);

  const countEl = s1.querySelector(".ekx-count span"), nextB = s1.querySelector(".ekx-next"), resetB = s1.querySelector(".ekx-reset");
  function tear(t) {
    t.state = "torn";
    // it tears free along the perforation and drops away from the temple
    const out = new THREE.Vector3(0, 0, 1).applyQuaternion(t.holder.quaternion);
    t.fall = { v: out.multiplyScalar(0.022).add(new THREE.Vector3(0, 0.012, 0)), spin: (Math.random() - 0.5) * 0.05, life: 0 };
    t.mats.forEach((m) => { m.transparent = true; });
    status();
  }
  function status() {
    const n = tabs.filter((t) => t.state === "torn" || t.state === "gone").length;
    countEl.textContent = n; tip.hidden = n > 0;
    nextB.hidden = n === 3; resetB.hidden = n === 0;
    s1.classList.toggle("ekx-open", n === 3);
  }
  nextB.addEventListener("click", () => {
    const t = tabs.find((t) => t.state === "on"); if (!t) return;
    // turn the box so the tab faces the visitor, then peel it
    const want = -t.holder.rotation.y;
    rotY = want + Math.round((rotY - want) / (Math.PI * 2)) * Math.PI * 2 - 0.35;
    t.ring.visible = false; t.state = "auto"; idle = 0; dirty = true;
  });
  resetB.addEventListener("click", () => {
    tabs.forEach((t) => { t.state = "on"; t.ang = 0; t.vel = 0; t.fall = null; t.pivot.position.set(0, H, so); t.pivot.rotation.set(0, 0, 0); t.pivot.visible = true; t.mats.forEach((m) => { m.opacity = 1; m.transparent = false; }); });
    status(); dirty = true;
  });

  // ---------- loop ----------
  let on = false, raf = 0, last = performance.now();
  const resize = () => {
    const w = stage.clientWidth, hh = stage.clientHeight; if (!w || !hh) return;   // layout size: the window's open animation scales it
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(w, hh, false);
    cam.aspect = w / hh;
    cam.position.z = cam.aspect < 0.8 ? 6.6 : 4.8;
    cam.updateProjectionMatrix(); dirty = true;
  };
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();
  const tick = (now) => {
    raf = on ? requestAnimationFrame(tick) : 0;
    const dt = Math.min(50, now - last) / 16.67; last = now;
    let moving = false;
    if (!drag) {
      if (Math.abs(vY) > 0.0004) { rotY += vY * dt; vY *= Math.pow(0.93, dt); moving = true; }
      else if (!reduce && (idle += dt) > 150) { rotY += 0.0032 * dt; moving = true; }   // after a few still seconds it turns slowly by itself
    }
    box.rotation.set(rotX, rotY, 0);
    // the idol turns a little toward you, so it never shows its edge
    idol.rotation.y = Math.max(-1.25, Math.min(1.25, -Math.atan2(Math.sin(rotY), Math.cos(rotY))));
    for (const t of tabs) {
      if (t.state === "on" && t.ang > 0) { t.vel += (-t.ang) * 0.12 * dt; t.vel *= 0.72; t.ang = Math.max(0, t.ang + t.vel * dt); if (t.ang < 0.002) t.ang = 0; moving = true; }
      if (t.state === "auto") { t.ang += 0.035 * dt; if (t.ang > 1.25) tear(t); moving = true; }
      if (t.state === "torn") {
        const f = t.fall; f.life += dt;
        t.ang = Math.min(2.6, t.ang + 0.03 * dt);
        f.v.y -= 0.0016 * dt; t.pivot.position.addScaledVector(f.v, dt); t.pivot.rotation.z += f.spin * dt;
        const o = Math.max(0, 1 - f.life / 70); t.mats.forEach((m) => (m.opacity = o));
        if (o <= 0) { t.state = "gone"; t.pivot.visible = false; }
        moving = true;
      }
      t.pivot.rotation.x = -t.ang;
      if (t.ring.visible) { const p = reduce ? 1 : 1 + 0.18 * Math.sin(now / 320); t.ring.scale.setScalar(p); t.ring.material.opacity = 0.85 - (p - 1) * 2.5; moving = true; }
    }
    if (moving || dirty || drag) { renderer.render(scene, cam); dirty = false; }
  };
  const vio = new IntersectionObserver((es) => { on = es[0].isIntersecting; if (on && !raf) { last = performance.now(); raf = requestAnimationFrame(tick); } }, { rootMargin: "100px" });
  vio.observe(stage);
  cleanups.push(() => { vio.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); on = false; scene.traverse((o) => { o.geometry?.dispose?.(); [].concat(o.material || []).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); }); }); renderer.dispose(); });
  status();
  finish();

  function finish() {
    const mo = new MutationObserver(() => { if (!caseEl.isConnected) { cleanups.forEach((f) => { try { f(); } catch (_) {} }); mo.disconnect(); } });
    mo.observe(document.body, { childList: true, subtree: true });
    caseEl.classList.add("fx-ready");
  }
}

// the temple's back wall: a gold sunburst behind the idol, as printed on the real box
function sunburst() {
  const c = document.createElement("canvas"); c.width = 512; c.height = 720;
  const g = c.getContext("2d");
  g.fillStyle = "#F6F1E8"; g.fillRect(0, 0, 512, 720);
  g.strokeStyle = "rgba(214,150,60,.55)"; g.lineWidth = 2;
  const cx = 256, cy = 300;
  for (let i = 0; i < 72; i++) { const a = i / 72 * Math.PI * 2, r0 = 70, r1 = i % 2 ? 190 : 235; g.beginPath(); g.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); g.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); g.stroke(); }
  g.lineWidth = 2.5; [60, 52].forEach((r) => { g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.stroke(); });
  g.strokeStyle = "rgba(214,150,60,.45)"; g.lineWidth = 3;
  [[40, 690], [472, 690]].forEach(([x]) => { g.beginPath(); g.moveTo(x, 690); g.lineTo(x, 120); g.stroke(); g.beginPath(); g.moveTo(x + 14, 690); g.lineTo(x + 14, 120); g.stroke(); });
  g.beginPath(); g.moveTo(40, 120); g.quadraticCurveTo(256, -20, 486, 120); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function injectCss(v) {
  if (document.querySelector("link[data-ekx]")) return;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `ekmaati-fx.css?v=${v}`; l.dataset.ekx = ""; document.head.appendChild(l);
}
