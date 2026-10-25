// Ekmaati case study: the real packaging (loaded by os.js openCase because content.js gives case.fx: "ekmaati-fx.js").
// Adds two sections after "The temple box" (section 19):
//   1. "Peel the arch": the final box in 3D, built from photographs of the real prototype. Drag to turn it;
//      grab a tab by the half-moon notch at its foot and pull up: it tears along the perforation and falls
//      away, revealing the temple. Front, left and right are tabs; the back panel (care + unboxing text) stays.
//   2. "Made, not rendered": the unboxing film (recorded from the 3D box) and nine photographs of the prototype, backgrounds removed (Apple Vision,
//      on device; tools/ekmaati/cut.swift + vcut.swift), on the case study's own paper colour.
import * as THREE from "./vendor/three/build/three.module.min.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const PAPER = "#F4F0E8", EARTH = "#5A3A1E", GOLD = "#E3A53A";

export default function ekmaatiFx(caseEl, { slug, v }) {
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const A = (f) => `work/${slug}/fx/${f}?v=${v}`;
  const cleanups = [];
  const css = injectCss(v);   // v195: overlays stay hidden until their stylesheet has loaded
  caseEl.classList.add("fx-wait"); { const done = () => caseEl.classList.remove("fx-wait"); if (css.sheet) done(); else { css.addEventListener("load", done, { once: true }); css.addEventListener("error", done, { once: true }); } }

  const imgs = [...caseEl.querySelectorAll(":scope > img")];
  const after = imgs[18] || imgs[imgs.length - 1];   // 19.webp, "The temple box"
  if (!after) return;

  // ---------- self-drawing layers (tools/ekmaati/slides.mjs): the research journey and the map's feeling curve ----------
  // [section index, layer, x, y, w, h in the slide's 1440-wide units, seconds]
  for (const [k, f, x, y, w, h, sec] of [[6, "research-journey", 0, 400, 1440, 820, 4.2], [20, "map-curve", 120, 560, 1200, 230, 2.6]]) {
    const im = imgs[k]; if (!im) continue;
    const H = +im.getAttribute("height") || 1000;
    const wrap = document.createElement("div"); wrap.className = "ekx-mapw"; im.replaceWith(wrap); wrap.appendChild(im);
    const c = document.createElement("img"); c.className = "ekx-curve"; c.alt = ""; c.setAttribute("aria-hidden", "true"); c.decoding = "async";
    c.src = A(f + ".webp"); c.srcset = `${A(f + ".webp")} 1x, ${A(f + "@2x.webp")} 2x`;
    Object.assign(c.style, { left: x / 1440 * 100 + "%", top: y / H * 100 + "%", width: w / 1440 * 100 + "%", transitionDuration: sec + "s" });
    wrap.appendChild(c);
    if (reduce) c.classList.add("on");
    else { const io = new IntersectionObserver((es) => { if (es[0].isIntersecting) { c.classList.add("on"); io.disconnect(); } }, { threshold: 0.35 }); io.observe(wrap); cleanups.push(() => io.disconnect()); }
  }

  // ---------- section 1: the box you can peel ----------
  const s1 = document.createElement("section");
  s1.className = "ekx ekx-peel";
  s1.setAttribute("aria-label", "Interactive model of the Ekmaati temple box");
  s1.innerHTML = `
    <div class="ekx-copy">
      <p class="ekx-eye">Start here · The final box</p>
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
  (imgs[0] || after).after(s1);

  // ---------- section 2: the real thing ----------
  const films = [   // recorded from the 3D box above by tools/ekmaati/film.mjs
    ["film-unbox", "The temple opening: the three tabs peel away one by one and the idol is revealed."],
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
    <div class="ekx-head"><p class="ekx-eye">19b · The real box</p><h2 class="ekx-h"><span class="ekx-serif">Made, not</span> <b>RENDERED</b></h2>
      <p class="ekx-p">Printed, cut, scored and folded by hand: 350 GSM board, sleeve over temple. Every image here is the prototype itself, with the room taken out.</p></div>
    <div class="ekx-films">${films.map(([f, c], i) => `<figure class="ekx-film${i === 0 ? " big" : ""}"><div class="ekx-vid"><video muted loop playsinline preload="none" poster="${A(f + ".webp")}" aria-label="${c}"></video><button type="button" class="ekx-vb" aria-label="Pause the film">❚❚</button></div><figcaption>${c}</figcaption></figure>`).join("")}</div>
    <div class="ekx-grid">${photos.map(([f, c]) => `<figure class="ekx-ph"><img src="${A("real/" + f + ".webp")}" srcset="${A("real/" + f + ".webp")} 1x, ${A("real/" + f + "@2x.webp")} 2x" alt="${c}" loading="lazy" decoding="async"><figcaption>${c}</figcaption></figure>`).join("")}</div>`;
  after.after(s2);

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
  renderer.toneMapping = THREE.NeutralToneMapping || THREE.NoToneMapping;
  const scene = new THREE.Scene();
  const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  cam.position.set(0, 1.3, 5.7); cam.lookAt(0, 0.86, 0);

  // soft studio light: an environment for even, paper-like shading plus one key light for form
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
  const key = new THREE.DirectionalLight(0xfff4e6, 1.1); key.position.set(2.2, 3.5, 2.8); scene.add(key);

  const loader = new THREE.TextureLoader();
  const tex = (f) => { const t = loader.load(A("tex/" + f + ".webp"), () => { renderer.initTexture(t); dirty = true; });   /* upload now, so no face is ever drawn black while it decodes */ t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = false; return t; };
  const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.88, metalness: 0, envMapIntensity: 0.9, ...o });
  // materials by the names given in tools/ekmaati/build_box.py
  const M = {
    m_face: std({ map: tex("t_face"), alphaTest: 0.5 }),
    m_plinth: std({ map: tex("t_plinth") }), m_roof: std({ map: tex("t_plinth") })   /* same printed border as the plinth; the roof photo was in shadow */,
    m_paper: std({ color: 0xf5f0e6 }), m_edge: std({ color: 0xe6dccb }), m_inside: std({ color: 0xebe3d4 }),
    m_sun: std({ map: sunburst() }),
    m_idol: std({ map: tex("idol"), alphaTest: 0.35, side: THREE.DoubleSide, roughness: 0.95 }),
    m_s_front: std({ map: tex("s_front") }), m_s_left: std({ map: tex("s_left") }), m_s_right: std({ map: tex("s_right") }), m_s_back: std({ map: tex("s_back") }),
  };
  const H = 1.49;   // sleeve height in model units (box.glb)
  const box = new THREE.Group(); scene.add(box);
  let idol = new THREE.Object3D();
  const tabs = [];

  // soft contact shadow
  const sh = document.createElement("canvas"); sh.width = sh.height = 128;
  const sg = sh.getContext("2d"), gr = sg.createRadialGradient(64, 64, 4, 64, 64, 64);
  gr.addColorStop(0, "rgba(60,40,20,.45)"); gr.addColorStop(1, "rgba(60,40,20,0)"); sg.fillStyle = gr; sg.fillRect(0, 0, 128, 128);
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.2), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sh), transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.001; scene.add(shadow);

  new GLTFLoader().load(A("box.glb"), (g) => {
    g.scene.traverse((o) => {
      if (!o.isMesh) return;
      o.material = Array.isArray(o.material) ? o.material.map((m) => M[m.name] || M.m_paper) : (M[o.material.name] || M.m_paper);
    });
    box.add(g.scene);
    // the idol: a solid built from the real photo (idolRelief), in place of box.glb's flat two-sided card, whose mirrored
    // back showed through the cut-out and read as a second head
    const card = g.scene.getObjectByName("idol");
    if (card) {
      card.visible = false;
      const img = new Image(); img.decoding = "async";
      img.onload = () => {
        const r = idolRelief(img); r.position.copy(card.position);
        r.position.y = 0.17 + r.userData.h / 2 + 0.002;   // seated on the plinth floor (box.glb's card hovered 3 cm above it)
        card.parent.add(r); idol = r;
        // a soft contact shadow where the base meets the floor
        const c = document.createElement("canvas"); c.width = 256; c.height = 128; const x = c.getContext("2d");
        const gr = x.createRadialGradient(128, 64, 4, 128, 64, 120); gr.addColorStop(0, "rgba(40,28,16,.55)"); gr.addColorStop(1, "rgba(40,28,16,0)");
        x.setTransform(1, 0, 0, 0.5, 0, 32); x.fillStyle = gr; x.fillRect(0, 0, 256, 256);
        const sh = new THREE.Mesh(new THREE.PlaneGeometry(0.78, 0.39), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
        sh.rotation.x = -Math.PI / 2; sh.position.set(card.position.x, 0.172, card.position.z); card.parent.add(sh);
        dirty = true;
      };
      img.src = A("tex/idol.webp");
    }
    // the roof tier and peak, rebuilt here with their own print (box.glb's were a plain block and an oversized white pyramid)
    for (const n of ["roof", "peak"]) { const o = g.scene.getObjectByName(n); if (o) o.visible = false; }
    box.add(temple_top());
    for (const name of ["tab_front", "tab_right", "tab_left"]) {
      const m = g.scene.getObjectByName(name); if (!m) continue;
      // a hinge that carries the tab's place on the box; the tab itself only turns about its own top edge
      const hinge = new THREE.Group(); hinge.position.copy(m.position); hinge.quaternion.copy(m.quaternion);
      m.parent.add(hinge); hinge.add(m); m.position.set(0, 0, 0); m.quaternion.identity();
      const own = [];   // each tab fades on its own (a multi-material mesh arrives as a group of meshes)
      m.traverse((o) => { if (o.isMesh) { o.material = [].concat(o.material).map((x) => x.clone()); if (o.material.length === 1) o.material = o.material[0]; own.push(...[].concat(o.material)); } });
      const ry = new THREE.Euler().setFromQuaternion(hinge.quaternion, "YXZ").y;
      // the half-moon notch at the foot, and a pulsing ring until the first peel
      const notch = new THREE.Mesh(new THREE.CircleGeometry(0.07, 24, 0, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a2614 }));
      notch.position.set(0, -H + 0.001, 0.0035); m.add(notch);
      const ring = new THREE.Mesh(new THREE.RingGeometry(0.095, 0.115, 40), new THREE.MeshBasicMaterial({ color: GOLD, transparent: true, opacity: 0.8, depthTest: false }));
      ring.position.set(0, -H + 0.06, 0.006); ring.renderOrder = 2; m.add(ring);
      const t = { mesh: m, pivot: m, ry, home: new THREE.Vector3(), holder: { rotation: { y: ry } }, ring, mats: [...own, notch.material], ang: 0, vel: 0, state: "on", fall: null };
      m.userData.tab = t; notch.userData.tab = t;
      tabs.push(t);
    }
    status(); dirty = true;
  }, undefined, (err) => { console.error("ekmaati box", err); stage.classList.add("ekx-nogl"); stage.innerHTML = `<img src="${A("real/temple-34.webp")}" alt="The Ekmaati temple box.">`; });

  // ---------- interaction ----------
  let rotY = -0.55, rotX = 0.06, vY = 0, idle = 0, dirty = true, turnTo = null;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = (e) => {
    const r = canvas.getBoundingClientRect();
    ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, cam);
    const live = tabs.filter((t) => t.state === "on").map((t) => t.mesh);
    const i = ray.intersectObjects(live, true)[0];
    if (!i) return null;
    let o = i.object; while (o && !o.userData.tab) o = o.parent;
    if (!o) return null;
    const p = o.userData.tab.mesh.worldToLocal(i.point.clone());
    return p.y < -H * 0.58 ? o.userData.tab : null;   // the lower part of a tab, around the notch, is the grip
  };
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => {
    const t = hit(e);
    canvas.setPointerCapture(e.pointerId);
    drag = t ? { kind: "peel", t, y0: e.clientY, a0: t.ang } : { kind: "turn", x: e.clientX, y: e.clientY, t: performance.now() };
    if (t) { t.state = "held"; t.ring.visible = false; stage.classList.add("peeling"); }
    turnTo = null; tabs.forEach((q) => { if (q.state === "queued") q.state = "on"; });   // a visitor's drag wins over "Peel the next tab"
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
    const out = new THREE.Vector3(0, 0, 1);   // in the hinge's own space: straight out from the box
    t.fall = { v: out.multiplyScalar(0.022).add(new THREE.Vector3(0, 0.012, 0)), spin: (Math.random() - 0.5) * 0.05, life: 0 };
    t.mats.forEach((m) => { m.transparent = true; });
    status();
  }
  function status() {
    const n = tabs.filter((t) => t.state === "torn" || t.state === "gone").length;
    countEl.textContent = n; tip.hidden = n > 0;
    nextB.hidden = n === 3; resetB.hidden = n === 0;
    if (n === 3 && !s1.classList.contains("ekx-open")) { turnTo = Math.round(rotY / (Math.PI * 2)) * Math.PI * 2 - 0.35; vY = 0; }   // all open: turn to face the idol
    s1.classList.toggle("ekx-open", n === 3);
  }
  nextB.addEventListener("click", () => {
    const t = tabs.find((t) => t.state === "on"); if (!t) return;
    // turn the box so the tab faces the visitor, then peel it
    const want = -t.holder.rotation.y;
    turnTo = want + Math.round((rotY - want) / (Math.PI * 2)) * Math.PI * 2 - 0.35;   // eased in the loop, then peeled
    t.ring.visible = false; t.state = "queued"; idle = 0; vY = 0; dirty = true;
  });
  resetB.addEventListener("click", () => {
    turnTo = null;
    tabs.forEach((t) => { t.state = "on"; t.ang = 0; t.vel = 0; t.fall = null; t.pivot.position.copy(t.home); t.pivot.rotation.set(0, 0, 0); t.pivot.visible = true; t.mats.forEach((m) => { m.opacity = 1; m.transparent = false; }); });
    status(); dirty = true;
  });

  // ---------- loop ----------
  let on = false, raf = 0, last = performance.now();
  const resize = () => {
    const w = stage.clientWidth, hh = stage.clientHeight; if (!w || !hh) return;   // layout size: the window's open animation scales it
    renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
    renderer.setSize(w, hh, false);
    cam.aspect = w / hh;
    cam.position.z = cam.aspect < 0.8 ? 7.6 : 5.7;
    cam.updateProjectionMatrix(); dirty = true;
  };
  const ro = new ResizeObserver(resize); ro.observe(stage); resize();
  const tick = (now) => {
    raf = on ? requestAnimationFrame(tick) : 0;
    const dt = Math.min(50, now - last) / 16.67; last = now;
    let moving = false;
    if (turnTo != null && !drag) {   // "Peel the next tab": turn to the tab, then peel it
      const d = turnTo - rotY; rotY += d * Math.min(1, 0.16 * dt); moving = true;
      if (Math.abs(d) < 0.01) { rotY = turnTo; turnTo = null; tabs.forEach((q) => { if (q.state === "queued") q.state = "auto"; }); }
    } else if (!drag) {
      if (Math.abs(vY) > 0.0004) { rotY += vY * dt; vY *= Math.pow(0.93, dt); moving = true; }
      else if (!reduce && (idle += dt) > 150) { rotY += 0.0032 * dt; moving = true; }   // after a few still seconds it turns slowly by itself
    }
    box.rotation.set(rotX, rotY, 0);
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
  cleanups.push(() => { vio.disconnect(); ro.disconnect(); cancelAnimationFrame(raf); on = false; scene.traverse((o) => { o.geometry?.dispose?.(); [].concat(o.material || []).forEach((m) => { m.map?.dispose?.(); m.dispose?.(); }); }); renderer.dispose(); renderer.forceContextLoss(); });   // v158: release the WebGL context at once
  status();
  finish();

  function finish() {
    const mo = new MutationObserver(() => { if (!caseEl.isConnected) { cleanups.forEach((f) => { try { f(); } catch (_) {} }); mo.disconnect(); } });
    mo.observe(document.body, { childList: true, subtree: true });
    caseEl.classList.add("fx-ready");
  }
}

// The idol as a solid: the photo's outline is inflated into a rounded body (depth grows with the square root of the
// distance from the edge, as a clay figure rounds off), darker folds sit a little deeper, the photo wraps the front and
// the back is river clay (the same cut-out, tinted). 0.62 wide, like the card it replaces; the box turns it toward the visitor, so its back is rarely seen.
function idolRelief(img) {
  const GW = 170, GH = Math.round(GW * img.height / img.width), IW = 0.62, IH = IW * img.height / img.width;
  const c = document.createElement("canvas"); c.width = GW; c.height = GH; const x = c.getContext("2d");
  x.drawImage(img, 0, 0, GW, GH); const px = x.getImageData(0, 0, GW, GH).data;
  const inside = new Uint8Array(GW * GH), lum = new Float32Array(GW * GH);
  for (let i = 0; i < GW * GH; i++) { inside[i] = px[i * 4 + 3] > 210 ? 1 : 0;   /* a little inside the cut-out edge, where the photo has a dark fringe */ lum[i] = (px[i * 4] * 0.3 + px[i * 4 + 1] * 0.59 + px[i * 4 + 2] * 0.11) / 255; }
  // distance to the outline (two-pass chamfer), then a soft blur so the body has no terraces
  const d = new Float32Array(GW * GH).fill(1e9);
  for (let i = 0; i < GW * GH; i++) if (!inside[i]) d[i] = 0;
  const at = (gx, gy) => (gx < 0 || gy < 0 || gx >= GW || gy >= GH ? 0 : d[gy * GW + gx]);
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { const i = gy * GW + gx; if (d[i]) d[i] = Math.min(d[i], at(gx - 1, gy) + 1, at(gx, gy - 1) + 1, at(gx - 1, gy - 1) + 1.414, at(gx + 1, gy - 1) + 1.414); }
  for (let gy = GH - 1; gy >= 0; gy--) for (let gx = GW - 1; gx >= 0; gx--) { const i = gy * GW + gx; if (d[i]) d[i] = Math.min(d[i], at(gx + 1, gy) + 1, at(gx, gy + 1) + 1, at(gx + 1, gy + 1) + 1.414, at(gx - 1, gy + 1) + 1.414); }
  const blur = (a) => { const o = new Float32Array(a.length); for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) { let t = 0, n = 0; for (let k = -2; k <= 2; k++) for (let l = -2; l <= 2; l++) { const X = gx + l, Y = gy + k; if (X >= 0 && Y >= 0 && X < GW && Y < GH) { t += a[Y * GW + X]; n++; } } o[gy * GW + gx] = t / n; } return o; };
  const dm = blur(d), lm = blur(lum); let max = 0; for (let i = 0; i < dm.length; i++) if (inside[i]) max = Math.max(max, dm[i]);
  const FRONT = 0.2, BACK = 0.14, cell = IW / (GW - 1);
  // rounder than a square root (a seated figure, not a cushion), eased to flat in a thin band at the outline so the edge
  // triangles don't stand on end and catch the light as bristles
  const depth = (i) => { if (!inside[i]) return 0; const t = dm[i] / max, e = Math.min(1, t / 0.12); return Math.pow(t, 0.42) * e * e * (3 - 2 * e); };
  const pos = [], uv = [], idx = [], bpos = [], bidx = [];
  for (let gy = 0; gy < GH; gy++) for (let gx = 0; gx < GW; gx++) {
    const i = gy * GW + gx, X = gx * cell - IW / 2, Y = IH - gy * cell, k = depth(i);
    pos.push(X, Y, k * FRONT + (inside[i] ? (lm[i] - 0.5) * 0.02 * k : 0)); uv.push(gx / (GW - 1), 1 - gy / (GH - 1));
    bpos.push(X, Y, -k * BACK);
  }
  for (let gy = 0; gy < GH - 1; gy++) for (let gx = 0; gx < GW - 1; gx++) {
    const a = gy * GW + gx, b = a + 1, cc = a + GW, dd = cc + 1;
    if (inside[a] + inside[b] + inside[cc] + inside[dd] < 3) continue;   // only cells on the figure
    idx.push(a, cc, b, b, cc, dd); bidx.push(a, b, cc, b, dd, cc);
  }
  const mk = (p, i, u) => { const g = new THREE.BufferGeometry(); g.setAttribute("position", new THREE.Float32BufferAttribute(p, 3)); if (u) g.setAttribute("uv", new THREE.Float32BufferAttribute(u, 2)); g.setIndex(i); g.computeVertexNormals(); return g; };
  const map = new THREE.Texture(img); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 8; map.needsUpdate = true;
  const grp = new THREE.Group();
  grp.add(new THREE.Mesh(mk(pos, idx, uv), new THREE.MeshStandardMaterial({ map, bumpMap: map, bumpScale: 2.2, roughness: 0.9, alphaTest: 0.5 })));   // the photo's own light and dark carve the folds
  grp.add(new THREE.Mesh(mk(bpos, bidx, uv), new THREE.MeshStandardMaterial({ map, color: 0x9c9382, roughness: 0.95, alphaTest: 0.5 })));   // the photo's own cut-out, tinted to clay, so both halves share one clean outline
  grp.children.forEach((m) => (m.position.y = -IH / 2));   // centred on its own origin
  grp.userData.h = IH;
  return grp;
}

// The roof tier and peak, as on the real box: a block about half the temple's width with an orange outline, a square at
// each end and a zigzag band on every side, and a small pyramid with an outlined triangle and a zigzag strip on each face.
const RW = 0.52, RH = 0.13, PS = 0.15, PH = 0.12;   // roof width and height, peak base side and height (sleeve = 1.0 wide)
function temple_top() {
  const H = 1.49, g = new THREE.Group();
  const paper = new THREE.MeshStandardMaterial({ color: 0xece2d0, roughness: 0.9 });
  const side = new THREE.MeshStandardMaterial({ map: printed(1024, 256, roofSide), roughness: 0.88 });
  const roof = new THREE.Mesh(new THREE.BoxGeometry(RW, RH, RW), [side, side, paper, paper, side, side]);
  roof.position.y = H + RH / 2; g.add(roof);
  // pyramid: four triangles, each with the whole face print (u across the base, v up to the apex)
  const h = PS / 2, y0 = H + RH, apex = [0, y0 + PH, 0], base = [[-h, y0, h], [h, y0, h], [h, y0, -h], [-h, y0, -h]];
  const pos = [], uv = [];
  for (let i = 0; i < 4; i++) { const a = base[i], c = base[(i + 1) % 4]; pos.push(...a, ...c, ...apex); uv.push(0, 0, 1, 0, 0.5, 1); }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute("uv", new THREE.Float32BufferAttribute(uv, 2)); geo.computeVertexNormals();
  g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: printed(512, 512, peakFace), roughness: 0.88, side: THREE.DoubleSide })));
  return g;
}
const INK = "#CF7A2C";
function printed(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const x = c.getContext("2d"); x.fillStyle = "#F1E8D8"; x.fillRect(0, 0, w, h); x.strokeStyle = INK; x.lineJoin = "round"; draw(x, w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function zigzag(x, x0, x1, y0, y1, n) {
  x.beginPath(); x.moveTo(x0, y1);
  for (let i = 0; i < n; i++) { const a = x0 + (x1 - x0) * i / n, b = x0 + (x1 - x0) * (i + 1) / n; x.lineTo((a + b) / 2, y0); x.lineTo(b, y1); }
  x.stroke();
}
function roofSide(x, w, h) {
  const m = 14; x.lineWidth = 7; x.strokeRect(m, m, w - 2 * m, h - 2 * m);
  const s = h - 2 * m - 24;   // the end squares
  for (const x0 of [m + 12, w - m - 12 - s]) { x.lineWidth = 6; x.strokeRect(x0, m + 12, s, s); x.lineWidth = 5; x.strokeRect(x0 + 18, m + 30, s - 36, s - 36); }
  const l = m + s + 34, r = w - m - s - 34; x.lineWidth = 5;
  [[0.2, 0.3], [0.5, 0.6], [0.72, 0.8]].forEach(([a, b]) => { x.beginPath(); x.moveTo(l, h * a); x.lineTo(r, h * a); x.moveTo(l, h * b); x.lineTo(r, h * b); x.stroke(); });
  x.lineWidth = 6; zigzag(x, l, r, h * 0.33, h * 0.47, 22);
}
function peakFace(x, w, h) {
  const pt = (u, v) => [u * w, (1 - v) * h];   // face uv: base along the bottom, apex at the top centre
  const tri = (k) => { x.beginPath(); x.moveTo(...pt(0.5 - 0.5 * k, 0.02)); x.lineTo(...pt(0.5 + 0.5 * k, 0.02)); x.lineTo(...pt(0.5, 0.02 + 0.96 * k)); x.closePath(); x.stroke(); };
  x.lineWidth = 16; tri(0.96); x.lineWidth = 11; tri(0.62);
  x.lineWidth = 11; x.beginPath(); x.moveTo(...pt(0.14, 0.27)); x.lineTo(...pt(0.86, 0.27)); x.stroke();
  x.lineWidth = 10; zigzag(x, 0.2 * w, 0.8 * w, (1 - 0.24) * h, (1 - 0.09) * h, 6);
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
  const had = document.querySelector("link[data-ekx]"); if (had) return had;
  const l = document.createElement("link"); l.rel = "stylesheet"; l.href = `ekmaati-fx.css?v=${v}`; l.dataset.ekx = ""; document.head.appendChild(l); return l;
}
