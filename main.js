import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const S = window.SITE;
const TOUCH = matchMedia("(pointer: coarse)").matches;   // phones & tablets: say "tap", no hover effects
const $ = (s) => document.querySelector(s);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
let shownProgress = 0;
const setProgress = (p, msg) => {
  p = shownProgress = Math.max(shownProgress, p);   // never runs backwards (models report progress while fonts load)
  $("#loaderBar").style.width = p + "%";
  $("#loaderPct").textContent = `${msg} ${Math.round(p)}%`;
};

// Start the model downloads right away (the 3D engine has arrived — this module only runs after it).
// They run in the background while fonts load and the desk is built; the loaders below pick them up.
const T0 = performance.now();
let started = false;            // true once the desk is on screen and the render loop runs
const fading = [];              // models currently fading in (see reveal)
const manager = new THREE.LoadingManager();
let modelFrac = 0, deskBuilt = false;   // model progress only drives the bar once the desk itself is built
manager.onProgress = (url, loaded, total) => { modelFrac = loaded / total; if (deskBuilt) setProgress(50 + modelFrac * 45, "loading models…"); };
const fetched = new Map();
function fetchAsset(url) {   // one download per file; a failed download is forgotten so a retry fetches it again
  if (!fetched.has(url)) {
    const loader = /\.(jpe?g|png)(\?|$)/.test(url) ? new THREE.ImageLoader(manager) : new THREE.FileLoader(manager).setResponseType("arraybuffer");
    fetched.set(url, loader.loadAsync(url).catch((err) => { fetched.delete(url); throw err; }));
  }
  return fetched.get(url);
}
// every model file, in one place: prefetched here, used by loadCat / loadBall / loadHeadphones below
// Release number (main.js is loaded as main.js?v=N): appended to every asset URL so a new release never shows
// stale cached images/models (files keep their names when replaced).
const BUILD = new URL(import.meta.url).searchParams.get("v") || "dev";
const asset = (u) => `${u}?v=${BUILD}`;
const MODEL = {
  cat: asset("models/cat/cat.glb"), catDiffuse: asset("models/cat/cat_diffuse.jpg"), catBump: asset("models/cat/cat_bump.jpg"),
  headset: asset("models/headphones/headphones.glb"),
  ball: asset("models/football/football.glb"), ballColor: asset("models/football/BaseColor.jpg"), ballNormal: asset("models/football/Normal.jpg"), ballRough: asset("models/football/Roughness.jpg")
};
Object.values(MODEL).forEach((u) => fetchAsset(u).catch(() => {}));

// Apple-style type: the system font where available (San Francisco on Apple devices), Inter elsewhere
const UI = '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif';

// Wait for webfonts first so every canvas texture is drawn with the right type
setProgress(15, "loading fonts…");
try {
  await Promise.race([
    Promise.all(['800 40px "Inter"', '700 40px "Inter"', '600 40px "Inter"', '500 40px "Inter"', '400 40px "Inter"', '600 40px "Caveat"'].map((f) => document.fonts.load(f))),
    new Promise((r) => setTimeout(r, 3000))
  ]);
} catch (_) {}
setProgress(45, "assembling desk…");

/* ───────────────────────── Sound (tiny synth blips + the music) ─────────────────────────
   Browsers only let a page make sound after a real tap/click/key, and phones are stricter:
   iOS counts the *end* of a tap (not the touch-down), mutes Web Audio when the silent switch is on,
   and suspends audio when you switch apps. So: the audio context is only created inside a gesture,
   every gesture re-tries until audio is really running, and the session is marked as "playback". */
const Sound = (() => {
  let ctx = null, muted = false, silentLoop = null;
  try { muted = localStorage.getItem("muted") === "1"; } catch (_) {}
  const running = () => ctx && ctx.state === "running";
  const blip = (freq, dur = 0.06, type = "square", vol = 0.04) => {
    if (muted || !running()) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  };
  // iPhone silent switch: ask for "playback" audio (Safari 17+); older iOS gets the same effect from a silent looping <audio>
  function playbackSession() {
    try { if (navigator.audioSession) { navigator.audioSession.type = "playback"; return; } } catch (_) {}
    if (silentLoop || !/iPhone|iPad|iPod/.test(navigator.userAgent)) return;
    const rate = 8000, n = rate / 2, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf);
    const str = (o, t) => [...t].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    str(0, "RIFF"); v.setUint32(4, 36 + n * 2, true); str(8, "WAVEfmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); str(36, "data"); v.setUint32(40, n * 2, true);
    silentLoop = new Audio(URL.createObjectURL(new Blob([buf], { type: "audio/wav" })));
    silentLoop.loop = true; silentLoop.setAttribute("playsinline", ""); silentLoop.play().catch(() => {});
  }
  // call from inside a user gesture: creates/resumes audio and starts the music (unless muted)
  function unlock() {
    if (muted) return;
    playbackSession();
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const go = () => { if (running() && !muted) window.Music.start(ctx); };
    if (running()) go(); else ctx.resume().then(go).catch(() => {});
  }
  return {
    unlock,
    hover: () => blip(880, 0.03, "sine", 0.02),
    click: () => blip(520, 0.07),
    boot: () => [262, 330, 392, 523].forEach((f, i) => setTimeout(() => blip(f, 0.14, "triangle", 0.05), i * 110)),
    purr() {
      if (muted || !running()) return;
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), t = ctx.currentTime;
      o.type = "sawtooth"; o.frequency.value = 55;
      lfo.frequency.value = 24; lg.gain.value = 0.03;
      lfo.connect(lg).connect(g.gain);
      g.gain.setValueAtTime(0.035, t); g.gain.linearRampToValueAtTime(0.0001, t + 1.8);
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 300;
      o.connect(f).connect(g).connect(ctx.destination);
      o.start(t); lfo.start(t); o.stop(t + 1.8); lfo.stop(t + 1.8);
    },
    setMuted(m) {
      muted = !!m;
      try { localStorage.setItem("muted", muted ? "1" : "0"); } catch (_) {}
      if (muted) { window.Music.stop(); if (silentLoop) silentLoop.pause(); } else unlock();
      $("#soundBtn").classList.toggle("muted", muted);
      $("#soundBtn").setAttribute("aria-label", muted ? "Turn sound on" : "Mute sound");
      return muted;
    },
    toggle() { return this.setMuted(!muted); },
    get muted() { return muted; },
    get state() { return ctx ? ctx.state : "none"; }
  };
})();
window.Sound = Sound;
$("#soundBtn").classList.toggle("muted", Sound.muted);
// Every real gesture re-tries until audio is actually running (phones may refuse the first one,
// and iOS suspends audio when you switch apps — the next tap brings it back)
const gestureUnlock = () => { if (Sound.state !== "running") Sound.unlock(); };
for (const ev of ["pointerup", "touchend", "click", "keydown"]) addEventListener(ev, gestureUnlock, true);
$("#soundBtn").addEventListener("click", () => { if (!Sound.toggle()) setTimeout(() => Sound.click(), 60); });

/* Open the portfolio without 3D */
$("#skipLink").addEventListener("click", (e) => { e.preventDefault(); window.OS.open("about"); });
// Top nav: Work · Resume · Contact boot the laptop straight into that window
document.querySelectorAll("[data-boot]").forEach((a) => a.addEventListener("click", (e) => { e.preventDefault(); boot(a.dataset.boot); }));

/* ───────────────────────── Renderer / scene ───────────────────────── */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
} catch (err) {
  // No WebGL — open the simple portfolio and say why
  $("#loader").classList.add("done");
  window.OS.open("about");
  window.OS.toast("3D isn't available in this browser — here's the simple version");
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
// Some phones drop the GPU context under memory pressure: offer a clean reload instead of a frozen/black desk
renderer.domElement.addEventListener("webglcontextlost", (e) => { e.preventDefault(); $("#glitch").hidden = false; });
$("#glitchReload").addEventListener("click", () => location.reload());
$("#glitchSimple").addEventListener("click", (e) => { e.preventDefault(); $("#glitch").hidden = true; window.OS.open("about"); });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
$("#stage").appendChild(renderer.domElement);

const BG = 0x1d1d1f;
const scene = new THREE.Scene();
scene.background = new THREE.Color(BG);
scene.fog = new THREE.Fog(BG, 70, 170);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

// Scale reference: the 13" laptop is 6 units wide (≈30 cm), so 1 unit ≈ 5 cm.
// Two camera views, each found by a small solver: the nearest distance at which a list of points fits on
// screen (clear of the top menu pill and the hint pill).
//  · HOME — like a desk-setup photo: from the front-left, low (just above the desk), fairly close. The desk runs
//    across the frame, the laptop sits right of centre, the poster and lamp rise above it (top of the poster may crop).
//  · ROOM (zoom button) — seated eye level of a 6 ft person (eyes ≈124 cm above the floor = 10 units above the
//    desk top), taking in the whole room: poster, name, desk and the football on the floor to play with.
const EYE_Y = 10, VIEW_X = 0.2, WALL_FACE = -3.7;   // VIEW_X = the desk's centre line, so the room view is centred on the desk
const fovFor = (aspect) => (aspect < 1 ? 62 : 56);
const camera = new THREE.PerspectiveCamera(fovFor(innerWidth / innerHeight), innerWidth / innerHeight, 0.5, 400);
const V = (list) => list.map(([x, y, z]) => new THREE.Vector3(x, y, z));
const ROOM_SEE = V([
  [-13.75, 21.4, WALL_FACE], [-1.9, 21.4, WALL_FACE], [-13.75, 4.8, WALL_FACE],   // poster
  [12.6, 10.9, WALL_FACE], [12.6, 6.2, WALL_FACE],                                  // name + roles
  [-3.1, 0, 2.6], [3.1, 0, 2.6], [8.3, 5.2, 0.4], [8.3, 0, 2.8],                    // laptop, cat
  [-8.6, 0, 5.4], [9.2, 0, 6.0],                                                     // front corners of the desk (mat labels, folders)
  [-4.5, -14.8, 7.7], [-4.5, -11.8, 6.2]                                             // the football on the floor at the front of the desk
]);
const DESK_SEE = V([
  [-9.0, 0, 6.2], [9.4, 0, 6.2], [-9.0, 0, -1.0], [9.4, 0, -3.0],                   // desk corners (front + back right), connect tiles
  [-8.5, 3.3, -2.9], [-3.9, 3.4, -2.7], [0, 4.4, -1.6], [8.3, 5.2, 0.4], [6.3, 4.6, -2.0]   // bottle, plant, laptop lid, cat, headset
]);
const HOME_SEE = V([   // what the opening shot frames (desk ends and the poster's top are allowed to crop, like a photo)
  [-8.5, 3.3, -2.9], [-3.9, 3.4, -2.7],                 // bottle, plant
  [-3.1, 0, 2.6], [3.1, 0, 2.6], [0, 4.4, -1.6],        // laptop
  [8.3, 5.2, 0.4], [8.3, 0, 2.8], [6.3, 4.6, -2.0],     // cat, headset
  [-6.5, 0, 6.3], [2.0, 0, 6.3],                         // front edge of the mat (Work › Skills › … labels)
  [0.4, 13.6, -0.8]                                      // the lamp's bulb
]);
const HOME_AZ = -0.45, HOME_EL = 0.22;   // ≈26° to the left, ≈13° above the desk (a low, photographic angle)
const DESK_DIR = new THREE.Vector3(Math.sin(HOME_AZ) * Math.cos(HOME_EL), Math.sin(HOME_EL), Math.cos(HOME_AZ) * Math.cos(HOME_EL));
const _p = new THREE.Vector3(), _look = new THREE.Vector3();
function fitScore(points) {   // 0…1 = how much of the safe screen area the points use; -1 = something doesn't fit
  camera.updateMatrixWorld();
  let worst = 0;
  for (const v of points) { _p.copy(v).project(camera); if (_p.z > 1) return -1; worst = Math.max(worst, Math.abs(_p.x) / 0.94, _p.y / 0.8, -_p.y / 0.8); }
  return worst <= 1 ? worst : -1;
}
function solveRoom(out) {   // eye height fixed; find the chair distance + up/down look
  let best = null;
  for (let z = 12; z <= 160 && !best; z += 0.25) {
    for (let ty = -12; ty <= 13; ty += 0.25) {
      camera.position.set(VIEW_X, EYE_Y, z); camera.lookAt(_look.set(VIEW_X, ty, WALL_FACE));
      const w = fitScore(ROOM_SEE);
      if (w >= 0 && (!best || w < best.w)) best = { z, ty, w };
    }
  }
  best = best || { z: 45, ty: 4 };
  out.pos.set(VIEW_X, EYE_Y, best.z);
  // orbit around a point on the desk's centre line (not the far wall), so dragging feels like turning your head
  const dir = new THREE.Vector3(0, best.ty - EYE_Y, WALL_FACE - best.z).normalize();
  out.target.copy(out.pos).addScaledVector(dir, best.z / -dir.z);
  out.dist = out.pos.distanceTo(out.target);
  return out;
}
const HOME_AIM_X = -2.0;   // aim a little left of the laptop, so (as in the reference photo) the laptop sits right of centre
function solveDesk(out, points) {   // fixed viewing direction; find the closest distance + the best aim point
  let best = null;
  for (let d = 8; d <= 120 && !best; d += 0.25) {
    for (let ty = -2; ty <= 10; ty += 0.5) for (let tz = -1; tz <= 3; tz += 1) {
      _look.set(HOME_AIM_X, ty, tz);
      camera.position.copy(_look).addScaledVector(DESK_DIR, d); camera.lookAt(_look);
      const w = fitScore(points);
      if (w >= 0 && (!best || w < best.w)) best = { d, ty, tz, w };
    }
  }
  best = best || { d: 30, ty: 1, tz: 1 };
  out.target.set(HOME_AIM_X, best.ty, best.tz);
  out.pos.copy(out.target).addScaledVector(DESK_DIR, best.d);
  out.dist = best.d;
  return out;
}
const HOME = { pos: new THREE.Vector3(), target: new THREE.Vector3(), zoom: 1, dist: 20 };   // desk close-up (start)
const ROOM = { pos: new THREE.Vector3(), target: new THREE.Vector3(), zoom: 1, dist: 30 };   // the whole room
function fitCamera() {
  camera.aspect = innerWidth / innerHeight;
  camera.fov = fovFor(camera.aspect);
  const zoom = camera.zoom, savedPos = camera.position.clone(), savedQ = camera.quaternion.clone();
  camera.zoom = 1; camera.updateProjectionMatrix();   // solve for the un-zoomed view
  solveDesk(HOME, HOME_SEE); solveRoom(ROOM);
  camera.position.copy(savedPos); camera.quaternion.copy(savedQ); camera.zoom = zoom; camera.updateProjectionMatrix();   // the solver only measured
  scene.fog.near = ROOM.dist + 40; scene.fog.far = ROOM.dist + 150;   // fog always starts behind the room
}
fitCamera();
camera.position.copy(HOME.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
controls.zoomToCursor = true;   // scroll / pinch zooms toward what you point at, so nothing slides out of reach
// zoom / look-around limits cover both views (recomputed on resize)
function setZoomLimits() {
  controls.minDistance = HOME.dist * 0.55; controls.maxDistance = Math.max(ROOM.dist, HOME.dist) * 1.2;
  const angles = (v) => { const o = new THREE.Vector3().subVectors(v.pos, v.target); return [Math.acos(o.y / o.length()), Math.atan2(o.x, o.z)]; };
  const [ph, ah] = angles(HOME), [pr, ar] = angles(ROOM);
  controls.minPolarAngle = Math.max(0.3, Math.min(ph, pr) - 0.35); controls.maxPolarAngle = Math.min(1.62, Math.max(ph, pr) + 0.12);
  controls.minAzimuthAngle = Math.min(ah, ar) - 0.5; controls.maxAzimuthAngle = Math.max(ah, ar) + 0.5;
}
setZoomLimits();
controls.update();

// Lights — a dark room lit by cool moonlight, with the pendant lamp always on
const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2a2e, 0.45);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0x9fb4ff, 1.1);
sun.position.set(-7, 16, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 6;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xc8d4ff, 0.5);
rim.position.set(10, 6, -8);
scene.add(rim);

/* ───────────────────────── Helpers ───────────────────────── */
const mat = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.55, metalness: 0, ...o });
const PLASTIC = mat(0xfbfbfd, { roughness: 0.35, clearcoat: 0.4 });
const DARK = mat(0x2a2a2c, { roughness: 0.5 });
function rbox(w, h, d, r, material, segs = 4) {
  const m = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, segs, r), material);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function mesh(geo, material) {
  const m = new THREE.Mesh(geo, material);
  m.castShadow = m.receiveShadow = true;
  return m;
}
function canvasTex(w, h, draw) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  const g = c.getContext("2d");
  draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return { tex: t, canvas: c, g };
}
// Flat text that lies on the floor
function floorText(lines, { size = 120, font = UI, weight = 700, color = "#f5f5f7", width = 6, italic = false, gap = 1.15, align = "left", bg = null } = {}) {
  const pad = 20;
  const W = 2048;
  const H = Math.ceil(lines.reduce((s, l) => s + (l.size || size) * gap, 0) + pad * 2);
  const { tex } = canvasTex(W, H, (g) => {
    if (bg) {
      g.font = `${weight} ${lines[0].size || size}px ${font}`;
      const tw = Math.max(...lines.map((l) => g.measureText(l.text).width)) * 1.02 + pad * 3;
      g.fillStyle = bg; g.beginPath(); g.roundRect(0, 0, Math.min(W, tw), H, H / 2.2); g.fill();
    }
    let y = pad;
    for (const l of lines) {
      const sz = l.size || size;
      g.font = `${italic ? "italic " : ""}${l.weight || weight} ${sz}px ${l.font || font}`;
      g.fillStyle = l.color || color;
      g.textBaseline = "top";
      g.textAlign = align;
      if ("letterSpacing" in g) g.letterSpacing = (l.spacing ?? -0.02) * sz + "px";
      g.fillText(l.text, align === "left" ? pad : align === "center" ? W / 2 : W - pad, y);
      y += sz * gap;
    }
  });
  const h = (width * H) / W;
  const m = new THREE.Mesh(new THREE.PlaneGeometry(width, h), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: 1, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.receiveShadow = true;
  return m;
}

const dummy = new THREE.Object3D();

/* ───────────────────────── Interactivity registry ───────────────────────── */
const hoverables = []; // { obj, label, onClick }
function interactive(obj, label, onClick) {
  obj.userData.hover = { label, onClick, base: obj.scale.clone(), lift: 0 };
  hoverables.push(obj);
  return obj;
}

/* ───────────────────────── Floor ───────────────────────── */
// Cream-white marble tiles (2 × 2 units each; one texture = 2 × 2 tiles)
const grid = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = "#efe8dc"; g.fillRect(0, 0, w, h);
  // soft clouding
  for (let i = 0; i < 260; i++) {
    const x = Math.random() * w, y = Math.random() * h, r = 30 + Math.random() * 120;
    const rg = g.createRadialGradient(x, y, 0, x, y, r);
    const c = Math.random() > 0.5 ? "255,252,246" : "214,202,184";
    rg.addColorStop(0, `rgba(${c},0.18)`); rg.addColorStop(1, `rgba(${c},0)`);
    g.fillStyle = rg; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // veins: wandering lines, a few strong, many faint
  for (let v = 0; v < 22; v++) {
    let x = Math.random() * w, y = Math.random() * h, a = Math.random() * Math.PI * 2;
    const strong = v < 5;
    g.strokeStyle = strong ? "rgba(150,132,108,0.38)" : "rgba(170,155,135,0.16)";
    g.lineWidth = strong ? 1.6 + Math.random() * 1.6 : 0.8;
    g.shadowColor = "rgba(150,132,108,0.35)"; g.shadowBlur = strong ? 6 : 2;
    g.beginPath(); g.moveTo(x, y);
    for (let k = 0; k < 120; k++) {
      a += (Math.random() - 0.5) * 0.45;
      x += Math.cos(a) * 9; y += Math.sin(a) * 9;
      g.lineTo(x, y);
    }
    g.stroke();
  }
  g.shadowBlur = 0;
  // grout lines between the four tiles
  g.fillStyle = "rgba(170,158,140,0.75)";
  g.fillRect(0, 0, w, 3); g.fillRect(0, h / 2 - 1.5, w, 3);
  g.fillRect(0, 0, 3, h); g.fillRect(w / 2 - 1.5, 0, 3, h);
});
grid.tex.wrapS = grid.tex.wrapT = THREE.RepeatWrapping;
grid.tex.repeat.set(600 / 4, 600 / 4);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshPhysicalMaterial({ map: grid.tex, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.position.y = -14.8; // desk height ≈ 74 cm
scene.add(floor);


/* ───────────────────────── Sijo's desk (from the photo) ─────────────────────────
   Dark laminate desk: solid side panel on the left, open cubby shelf on the right,
   a zebra-print fleece throw over the top and a desk mat. Top surface at y = 0.   */
const TABLE = { x: 0.2, z: 1.6, w: 19, d: 10, t: 0.5 };
const DESK_H = 14.8;                                   // ≈ 74 cm
const X0 = TABLE.x - TABLE.w / 2, X1 = TABLE.x + TABLE.w / 2, Z0 = TABLE.z - TABLE.d / 2, Z1 = TABLE.z + TABLE.d / 2;
const laminate = mat(0x221e1c, { roughness: 0.5, clearcoat: 0.25 });
const deskPart = (w, h, d, x, y, z, m = laminate) => { const p = rbox(w, h, d, 0.04, m, 2); p.position.set(x, y, z); scene.add(p); return p; };
const LEG_Y = -(DESK_H + TABLE.t) / 2, LEG_H = DESK_H - TABLE.t;
deskPart(TABLE.w, TABLE.t, TABLE.d, TABLE.x, -TABLE.t / 2, TABLE.z);            // top
deskPart(0.6, LEG_H, TABLE.d - 0.3, X0 + 0.5, LEG_Y, TABLE.z - 0.1);             // left side panel
const CX0 = 2.9, CX1 = X1 - 0.2, CXM = (CX0 + CX1) / 2, CW = CX1 - CX0;          // right cubby unit
deskPart(0.5, LEG_H, TABLE.d - 0.3, CX1 - 0.25, LEG_Y, TABLE.z - 0.1);
deskPart(0.5, LEG_H, TABLE.d - 0.3, CX0 + 0.25, LEG_Y, TABLE.z - 0.1);
deskPart(CW - 1, 0.4, TABLE.d - 0.6, CXM, -5.2, TABLE.z - 0.2);                  // shelf
deskPart(CW - 1, 0.4, TABLE.d - 0.6, CXM, -DESK_H + 0.9, TABLE.z - 0.2);         // bottom
deskPart(CW, LEG_H, 0.2, CXM, LEG_Y, Z0 + 0.25);                                  // back of the cubby
deskPart(TABLE.w - 1.2, 1.8, 0.25, TABLE.x, -1.4, Z0 + 0.35);                    // back rail
// on the shelf: a keyboard and a small white charger, like in the photo
const shelfTop = -5.0;
const shelfKb = canvasTex(512, 160, (g, w, h) => {
  g.fillStyle = "#2a2a2c"; g.fillRect(0, 0, w, h);
  g.fillStyle = "#4a4a4e";
  for (let r = 0; r < 5; r++) for (let c = 0; c < 15; c++) g.fillRect(10 + c * 33, 10 + r * 29, 28, 24);
});
const kb2 = rbox(4.6, 0.3, 1.6, 0.08, mat(0x2a2a2c), 2);
kb2.position.set(CXM - 0.6, shelfTop + 0.15, TABLE.z + 1.4); kb2.rotation.y = 0.05;
const kb2Face = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.4), new THREE.MeshStandardMaterial({ map: shelfKb.tex, roughness: 0.7 }));
kb2Face.rotation.x = -Math.PI / 2; kb2Face.position.y = 0.16; kb2.add(kb2Face);
const charger = rbox(0.8, 0.8, 0.8, 0.12, mat(0xf5f5f7, { roughness: 0.4 }), 3);
charger.position.set(CXM + 2.4, shelfTop + 0.4, TABLE.z + 1.8);
scene.add(kb2, charger);

// Zebra-print fleece throw (original pattern) — top, front drape and side drapes
function zebraTex(w, h, seed = 1) {
  return canvasTex(w, h, (g) => {
    g.fillStyle = "#eee8dd"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#0e0e0e";
    const n = Math.round(h / 44);
    for (let i = 0; i < n; i++) {                       // each stripe: a wavy band that swells and tapers
      const y0 = (i / n) * (h + w * 0.35) - w * 0.35 + Math.sin(i * 3.1 + seed) * 10;
      const top = [], bot = [];
      for (let x = -60; x <= w + 60; x += 20) {
        const y = y0 + x * 0.35 + Math.sin(x * 0.009 + i * 0.8 + seed) * 22 + Math.sin(x * 0.031 + i * 2.1) * 7;
        const thick = Math.max(0, 9 + 15 * Math.sin(x * 0.006 + i * 1.9 + seed) + 6 * Math.sin(x * 0.021 + i));
        top.push([x, y - thick]); bot.push([x, y + thick]);
      }
      g.beginPath(); g.moveTo(top[0][0], top[0][1]);
      top.forEach(([x, y]) => g.lineTo(x, y));
      bot.reverse().forEach(([x, y]) => g.lineTo(x, y));
      g.closePath(); g.fill();
    }
  }).tex;
}
const fleece = (map) => new THREE.MeshPhysicalMaterial({ map, roughness: 1, sheen: 0.2, sheenRoughness: 0.9, sheenColor: new THREE.Color(0xffffff), side: THREE.DoubleSide });
const throwTop = new THREE.Mesh(new THREE.PlaneGeometry(TABLE.w + 0.3, TABLE.d + 0.3), fleece(zebraTex(2048, 1080, 1)));
throwTop.rotation.x = -Math.PI / 2; throwTop.position.set(TABLE.x, 0.012, TABLE.z);
throwTop.receiveShadow = true;
scene.add(throwTop);
function drape(width, height, seed) {   // a hanging fleece edge with soft folds and an uneven hem
  const geo = new THREE.PlaneGeometry(width, height, 80, 8);
  const p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), down = (height / 2 - y) / height;          // 0 at top, 1 at hem
    p.setZ(i, (Math.sin(x * 1.6 + seed) * 0.09 + Math.sin(x * 0.55 + seed * 2) * 0.06) * down);
    if (down > 0.98) p.setY(i, y - Math.abs(Math.sin(x * 0.9 + seed)) * 0.35);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, fleece(zebraTex(2048, Math.round(2048 * height / width), seed + 3)));
  m.castShadow = m.receiveShadow = true;
  return m;
}
const frontDrape = drape(TABLE.w + 0.3, 3.2, 1);
frontDrape.position.set(TABLE.x, -1.6 + 0.01, Z1 + 0.16);
const leftDrape = drape(TABLE.d + 0.3, 2.4, 2);
leftDrape.rotation.y = -Math.PI / 2; leftDrape.position.set(X0 - 0.16, -1.2 + 0.01, TABLE.z);
const rightDrape = drape(TABLE.d + 0.3, 2.4, 3);
rightDrape.rotation.y = Math.PI / 2; rightDrape.position.set(X1 + 0.16, -1.2 + 0.01, TABLE.z);
scene.add(frontDrape, leftDrape, rightDrape);

// Desk mat — Sijo's real mat (assets/deskmat.jpg, photographed and cropped to 3:1). The procedural blue-violet
// design below is only a placeholder while the photo loads.
const deskMatTex = canvasTex(2048, 680, (g, w, h) => {
  const lg = g.createLinearGradient(0, 0, w, h);
  lg.addColorStop(0, "#0d1030"); lg.addColorStop(0.45, "#2a1f6b"); lg.addColorStop(0.75, "#3657c9"); lg.addColorStop(1, "#7fb6ff");
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 6; i++) {   // soft light streaks
    g.strokeStyle = `rgba(190,210,255,${0.05 + i * 0.015})`; g.lineWidth = 2 + i * 1.5;
    g.beginPath(); g.moveTo(w * (0.3 + i * 0.08), h); g.bezierCurveTo(w * (0.45 + i * 0.07), h * 0.5, w * (0.55 + i * 0.06), h * 0.35, w, h * (0.1 + i * 0.05)); g.stroke();
  }
  for (let i = 0; i < 160; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.35})`; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, Math.random() * 1.8, 0, 7); g.fill(); }
  g.strokeStyle = "rgba(255,255,255,.35)"; g.lineWidth = 3; g.setLineDash([10, 8]);
  g.strokeRect(14, 14, w - 28, h - 28);
});
const MAT = { x: -3.1, z: 4.6, w: 11.4, d: 3.8 };
const deskMat = rbox(MAT.w, 0.06, MAT.d, 0.03, mat(0x0d1030, { roughness: 0.8 }), 2);
deskMat.position.set(MAT.x, 0.04, MAT.z);
const deskMatFace = new THREE.Mesh(new THREE.PlaneGeometry(MAT.w - 0.06, MAT.d - 0.06), new THREE.MeshStandardMaterial({ map: deskMatTex.tex, roughness: 0.85 }));
deskMatFace.rotation.x = -Math.PI / 2; deskMatFace.position.y = 0.031; deskMatFace.receiveShadow = true;
deskMat.add(deskMatFace);
scene.add(deskMat);
new THREE.TextureLoader().load(asset(TOUCH ? "assets/deskmat-phone.jpg" : "assets/deskmat.jpg"), (t) => {
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();   // stays crisp at the low, grazing camera angle
  deskMatFace.material.map = t; deskMatFace.material.needsUpdate = true;
  deskMatTex.tex.dispose();
});

/* ───────────────────────── Wall + poster ───────────────────────── */
const WALL_Z = TABLE.z - TABLE.d / 2 - 0.35;
const wallTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);   // neutral plaster; the charcoal wall colour is a material tint
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.025)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});
wallTex.tex.wrapS = wallTex.tex.wrapT = THREE.RepeatWrapping;
wallTex.tex.repeat.set(28, 24);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(400, 220), new THREE.MeshStandardMaterial({ map: wallTex.tex, color: 0x45403b, roughness: 0.95 }));
wall.position.set(TABLE.x, 60, WALL_Z);   // reaches well above and below anything the camera can see
wall.receiveShadow = true;
scene.add(wall);
for (const side of [-1, 1]) {   // side walls: far enough out that they frame the room instead of boxing in the desk
  const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(400, 220), wall.material);
  sideWall.rotation.y = -side * Math.PI / 2;
  sideWall.position.set(TABLE.x + side * 44, 60, WALL_Z + 200);   // a roomy space (≈4.4 m wide), not a box around the desk
  sideWall.receiveShadow = true;
  scene.add(sideWall);
}
const skirting = rbox(400, 0.5, 0.12, 0.03, mat(0x2e2a27, { roughness: 0.7 }), 1);
skirting.position.set(TABLE.x, -14.8 + 0.25, WALL_Z + 0.06);
scene.add(skirting);

// Sijo's own typographic poster ("To create a solution for something…"), taped to the wall, no frame
const POSTER_PX = 2048;   // full resolution on phones too (half-size looked soft on high-density phone screens)
const poster = canvasTex(POSTER_PX, Math.round(POSTER_PX * 1754 / 1240), (g, w, h) => {
  g.scale(w / 1240, h / 1754); w = 1240; h = 1754;   // draw on the 1240-wide layout, rendered at up to 2× sharpness
  g.fillStyle = "#f6f4ef"; g.fillRect(0, 0, w, h);
  const red = "#c7262e";
  const big = (ch, x, y, size, rot = 0) => {
    g.save(); g.translate(x, y); g.rotate(rot);
    g.fillStyle = red; g.font = `800 ${size}px ${UI}`; g.textAlign = "center"; g.textBaseline = "middle";
    if ("letterSpacing" in g) g.letterSpacing = "0px";
    g.fillText(ch, 0, 0); g.restore();
  };
  // the red SOMETHING letters, scattered and rotated
  big("S", 250, 230, 470); big("T", 1010, 200, 470); big("O", 560, 560, 470);
  big("H", 1060, 820, 470); big("I", 760, 860, 470, -0.62); big("M", 270, 1000, 470, -Math.PI / 2);
  big("N", 680, 1350, 470); big("E", 230, 1560, 430, Math.PI / 2); big("G", 1060, 1630, 470, Math.PI);
  // black statement text, tight and heavy
  const line = (t, y, align = "left") => {
    g.fillStyle = "#0a0a0a"; g.font = `900 84px ${UI}`; g.textBaseline = "alphabetic";
    if ("letterSpacing" in g) g.letterSpacing = "-5px";
    g.textAlign = align; g.fillText(t, align === "left" ? 46 : w - 40, y);
  };
  line("TO CREATE A SOLUTION", 150); line("FOR SOMETHING", 252);
  line("SOMETHING THAT HAS", 560, "right"); line("EVEN BIGGER CAUSE", 662, "right"); line("THAN ME", 764, "right");
  line("SOMETHING THAT I AM", 1080); line("SUPPOSED TO MAKE", 1182);
  line("TO BEGIN AN ERA", 1500, "right");
  // small vertical credits
  const vert = (t, x, y, rot) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = "#111"; g.font = `700 22px ${UI}`; if ("letterSpacing" in g) g.letterSpacing = "1px"; g.textAlign = "center"; g.fillText(t, 0, 0); g.restore(); };
  vert("SIJO JOSEPH", 40, 620, Math.PI / 2);
  vert("GIVE ME THE WISDOM THAT SITS BY YOUR THRONE", w - 32, 1180, Math.PI / 2);
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 1.5); } // paper grain
});
const posterGroup = new THREE.Group();
const POSTER = { w: 11.88, h: 16.82 };   // A1: 594 × 841 mm (1 unit ≈ 5 cm)
const paperGeo = new THREE.PlaneGeometry(POSTER.w, POSTER.h, 12, 16);
{ const p = paperGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setZ(i, 0.04 * Math.pow(Math.abs(x) / (POSTER.w / 2), 3) + 0.03 * Math.pow(Math.max(0, -y) / (POSTER.h / 2), 4)); } paperGeo.computeVertexNormals(); }
const paper = new THREE.Mesh(paperGeo, new THREE.MeshStandardMaterial({ map: poster.tex, roughness: 0.8 }));
paper.castShadow = paper.receiveShadow = true;
posterGroup.add(paper);
for (const [tx, ty] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {   // bits of clear tape at the corners
  const tape = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.22), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, roughness: 0.3 }));
  tape.position.set(tx * (POSTER.w / 2 - 0.1), ty * (POSTER.h / 2 - 0.08), 0.06); tape.rotation.z = tx * ty * 0.6;
  posterGroup.add(tape);
}
posterGroup.position.set(-7.8, 13.1, WALL_Z + 0.03);   // bottom edge sits just above the MacBook screen line
scene.add(posterGroup);
// (the poster is decoration only — not clickable)

// Woven wire-cage pendant lamp (like the one in Sijo's room), warm bulb inside
const lamp = new THREE.Group();
const CAGE_H = 4.2;
const cageR = (t) => 0.7 + Math.sin(Math.min(1, t * 1.12) * Math.PI) * 0.95 - t * 0.25;   // urn-shaped profile
const strands = [];
for (let k = 0; k < 38; k++) {
  const a0 = (k / 38) * Math.PI * 2, turns = (Math.random() - 0.5) * 3.2, pts = [];
  for (let j = 0; j <= 26; j++) {
    const t = j / 26, a = a0 + turns * t + Math.sin(t * 8 + k) * 0.18, r = cageR(t) * (0.97 + Math.random() * 0.06);
    pts.push(new THREE.Vector3(Math.cos(a) * r, -t * CAGE_H, Math.sin(a) * r));
  }
  strands.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 52, 0.024, 4, false));
}
for (const t of [0, 1]) { const ring = new THREE.TorusGeometry(cageR(t), 0.035, 6, 48); ring.rotateX(Math.PI / 2); ring.translate(0, -t * CAGE_H, 0); strands.push(ring); }
const cage = new THREE.Mesh(mergeGeometries(strands), mat(0x2b2522, { metalness: 0.55, roughness: 0.45 }));
cage.castShadow = true;
const capTop = mesh(new THREE.CylinderGeometry(0.45, 0.75, 0.3, 24), mat(0x1c1a19, { roughness: 0.5 }));
capTop.position.y = 0.1;
const cord = mesh(new THREE.CylinderGeometry(0.035, 0.035, 30, 6), mat(0x1c1a19));
cord.position.y = 15;
const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.34, 20, 14), new THREE.MeshBasicMaterial({ color: 0xffd39a }));
bulb.position.y = -1.5;
const glowTex = canvasTex(128, 128, (g) => { const rg = g.createRadialGradient(64, 64, 0, 64, 64, 64); rg.addColorStop(0, "rgba(255,200,130,.9)"); rg.addColorStop(1, "rgba(255,170,90,0)"); g.fillStyle = rg; g.fillRect(0, 0, 128, 128); }).tex;
const glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending }));
glowSprite.scale.setScalar(3.4); glowSprite.position.y = -1.5;
const lampLight = new THREE.PointLight(0xffb468, 55, 34, 2);
lampLight.position.y = -1.5;
if (innerWidth > 760) { lampLight.castShadow = true; lampLight.shadow.mapSize.set(512, 512); lampLight.shadow.bias = -0.003; lampLight.shadow.radius = 3; }
lamp.add(cage, capTop, cord, bulb, glowSprite, lampLight);
lamp.position.set(0.4, 15.4, -0.8);   // cage centred at about half the poster's height
scene.add(lamp);



/* ───────────────────────── The laptop (13", Midnight) ───────────────────────── */
// Proportions follow a 13" ultrabook: ~30.4 × 21.5 cm, ~1.1 cm thick (1 unit ≈ 5 cm).
const SILVER = mat(0xd6d8db, { metalness: 0.75, roughness: 0.32 });
const KEY_BLACK = mat(0x161618, { roughness: 0.55 });
const LAP_W = 6.0, LAP_D = 4.25, BASE_T = 0.2, LID_T = 0.11, LID_H = 4.15;

const laptop = new THREE.Group();
laptop.position.set(0, 0, 0.4);
laptop.rotation.y = -0.08;
scene.add(laptop);

// Base (bottom case) + rubber feet
const MIDNIGHT = mat(0x2a303c, { metalness: 0.7, roughness: 0.34 }), MIDNIGHT_DARK = mat(0x222833, { metalness: 0.65, roughness: 0.4 });
const lapBase = rbox(LAP_W, BASE_T, LAP_D, 0.09, MIDNIGHT, 5);
lapBase.position.y = BASE_T / 2 + 0.04;
laptop.add(lapBase);
[[-2.6, -1.8], [2.6, -1.8], [-2.6, 1.8], [2.6, 1.8]].forEach(([x, z]) => {
  const f = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), DARK);
  f.position.set(x, 0.025, z);
  laptop.add(f);
});
const TOP = BASE_T + 0.04; // top surface of the deck

// Front thumb scoop
const scoop = rbox(1.3, 0.04, 0.14, 0.02, MIDNIGHT_DARK);
scoop.position.set(0, TOP - 0.03, LAP_D / 2 - 0.02);
laptop.add(scoop);

// Keyboard well
const well = rbox(5.2, 0.02, 2.05, 0.06, mat(0x2a2b2e, { roughness: 0.7 }));
well.position.set(0, TOP, -0.72);
laptop.add(well);

// Keys: function row (short) + 5 rows; touch-ID / power key at top-right
const lapKeys = new THREE.Group();
const fnKeyGeo = new RoundedBoxGeometry(0.34, 0.04, 0.18, 2, 0.015);
const keyGeoL = new RoundedBoxGeometry(0.34, 0.04, 0.33, 2, 0.02);
const fnKeys = new THREE.InstancedMesh(fnKeyGeo, KEY_BLACK, 13);
for (let c = 0; c < 13; c++) { dummy.position.set(-2.4 + c * 0.384, TOP + 0.03, -1.6); dummy.updateMatrix(); fnKeys.setMatrixAt(c, dummy.matrix); }
const mainSlots = [];
for (let r = 0; r < 5; r++) for (let c = 0; c < 13; c++) {
  if (r === 4 && c >= 4 && c <= 8) continue; // spacebar area
  mainSlots.push([c, r]);
}
const mainKeys = new THREE.InstancedMesh(keyGeoL, KEY_BLACK, mainSlots.length);
mainSlots.forEach(([c, r], i) => {
  dummy.position.set(-2.4 + c * 0.384 + (r % 2) * 0.06, TOP + 0.03, -1.27 + r * 0.37);
  dummy.updateMatrix(); mainKeys.setMatrixAt(i, dummy.matrix);
});
fnKeys.receiveShadow = mainKeys.receiveShadow = true;
const spacebar = rbox(1.86, 0.04, 0.33, 0.02, KEY_BLACK, 2);
spacebar.position.set(-2.4 + 6 * 0.384, TOP + 0.03, -1.27 + 4 * 0.37);
lapKeys.add(fnKeys, mainKeys, spacebar);
laptop.add(lapKeys);

// Power key with a glowing accent ring (the main "boot" interaction)
const powerKey = new THREE.Group();
const pkCap = rbox(0.34, 0.05, 0.18, 0.015, KEY_BLACK, 2);
const pkRing = mesh(new THREE.TorusGeometry(0.075, 0.016, 8, 24), mat(0xff6a2b, { emissive: 0xff4a10, emissiveIntensity: 0.6, roughness: 0.3 }));
pkRing.rotation.x = Math.PI / 2; pkRing.position.y = 0.03;
powerKey.add(pkCap, pkRing);
powerKey.position.set(-2.4 + 13 * 0.384, TOP + 0.03, -1.6);
laptop.add(powerKey);
interactive(powerKey, "⏻ Power on", () => boot("about"));
const btnCap = pkRing; // pulses in the render loop

// Speaker grilles either side of the keyboard
for (const side of [-1, 1]) {
  const holes = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.018, 0.01, 6), DARK, 60);
  let n = 0;
  for (let r = 0; r < 30; r++) for (let c = 0; c < 2; c++) {
    dummy.position.set(side * (2.78 + c * 0.06), TOP + 0.002, -1.7 + r * 0.068);
    dummy.updateMatrix(); holes.setMatrixAt(n++, dummy.matrix);
  }
  laptop.add(holes);
}

// Trackpad (types a hello on screen)
const trackpad = rbox(2.9, 0.012, 1.75, 0.08, mat(0x343b48, { metalness: 0.45, roughness: 0.22 }));
trackpad.position.set(0, TOP + 0.002, 1.05);
laptop.add(trackpad);
interactive(trackpad, "Type hello", () => { Sound.click(); typeOnScreen(); });
interactive(lapKeys, "Type hello", () => { Sound.click(); typeOnScreen(); });

// Hinge
const hinge = mesh(new THREE.CylinderGeometry(0.1, 0.1, LAP_W - 1.4, 20), mat(0x3a3b3e, { metalness: 0.6, roughness: 0.4 }));
hinge.rotation.z = Math.PI / 2;
hinge.position.set(0, TOP + 0.04, -LAP_D / 2 + 0.06);
laptop.add(hinge);

// Lid — pivots at the hinge, opened ~105°
const lid = new THREE.Group();
lid.position.set(0, TOP + 0.04, -LAP_D / 2 + 0.06);
lid.rotation.x = -0.26;
laptop.add(lid);
const lidShell = rbox(LAP_W, LID_H, LID_T, 0.09, MIDNIGHT, 5);
lidShell.position.set(0, LID_H / 2, 0);
lid.add(lidShell);
// Glass bezel + display
const glassBezel = rbox(LAP_W - 0.1, LID_H - 0.1, 0.015, 0.07, mat(0x0b0b0c, { roughness: 0.15, metalness: 0.2 }), 2);
glassBezel.position.set(0, LID_H / 2, LID_T / 2 + 0.002);
lid.add(glassBezel);
const SCREEN_W = 5.62, SCREEN_H = 3.6;
const SCREEN_PX = 2;   // the laptop screen is laid out at 800×512 and rendered at 2× (1600×1024) so it stays sharp up close
const screenCanvas = canvasTex(800 * SCREEN_PX, 512 * SCREEN_PX, () => {});
const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), new THREE.MeshBasicMaterial({ map: screenCanvas.tex, toneMapped: false }));
screen.position.set(0, LID_H / 2 - 0.08, LID_T / 2 + 0.012);
lid.add(screen);
interactive(screen, "Open my portfolio", () => boot("about"));
// Camera notch
const notch = rbox(0.62, 0.17, 0.01, 0.05, mat(0x0b0b0c), 2);
notch.position.set(0, LID_H - 0.13, LID_T / 2 + 0.014);
lid.add(notch);
const camDot = mesh(new THREE.CircleGeometry(0.025, 12), mat(0x22324a, { roughness: 0.1 }));
camDot.position.set(0, LID_H - 0.11, LID_T / 2 + 0.02);
lid.add(camDot);

// Screen glow onto the desk
const glow = new THREE.PointLight(0xdcd6ff, 1.2, 6, 2);
glow.position.set(0, 2.2, 1.8);
scene.add(glow);

// Back of the lid: SJ monogram + a few original stickers (visible when you orbit around)
function lidSticker(draw, size, x, y, rotZ = 0, glossy = false) {
  const { tex } = canvasTex(256, 256, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshStandardMaterial({ map: tex, transparent: true, roughness: glossy ? 0.15 : 0.45, metalness: glossy ? 0.6 : 0, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.position.set(x, y, -LID_T / 2 - 0.003);
  m.rotation.set(0, Math.PI, rotZ);
  lid.add(m);
}
lidSticker((g) => {
  g.strokeStyle = "#9da1a7"; g.lineWidth = 8; g.beginPath(); g.arc(128, 128, 96, 0, 7); g.stroke();
  g.fillStyle = "#9da1a7"; g.font = `700 92px ${UI}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SJ", 128, 134);
}, 1.0, 0, LID_H / 2, 0, true);
lidSticker((g) => {
  const px = ["01100110", "11111111", "11111111", "11111111", "01111110", "00111100", "00011000"];
  g.fillStyle = "#fff"; g.fillRect(14, 30, 228, 196);
  px.forEach((row, y) => [...row].forEach((c, x) => { if (c === "1") { g.fillStyle = "#ff4d6d"; g.fillRect(32 + x * 24, 46 + y * 24, 24, 24); } }));
}, 0.7, -1.9, 3.0, 0.15);
lidSticker((g) => {
  g.translate(128, 128); g.fillStyle = "#5b7cfa"; g.beginPath();
  for (let i = 0; i < 16; i++) { const r = i % 2 ? 60 : 118, a = (i / 16) * Math.PI * 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); }
  g.fill(); g.fillStyle = "#fff"; g.font = `800 48px ${UI}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("3D", 0, 4);
}, 0.75, 1.9, 1.1, 0.3);

// Sticky note on the palm rest
const note = canvasTex(256, 256, (g) => {
  g.fillStyle = "#ffe066"; g.fillRect(10, 10, 236, 236);
  g.fillStyle = "#00000014"; g.fillRect(10, 10, 236, 30);
  g.fillStyle = "#3b3b3b"; g.font = '600 40px "Caveat"';
  ["make it", "simple,", "then make", "it fun ✶"].forEach((t, i) => g.fillText(t, 26, 82 + i * 46));
});
const noteMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 0.85), new THREE.MeshStandardMaterial({ map: note.tex, roughness: 0.8 }));
noteMesh.rotation.set(-Math.PI / 2, 0, 0.12);
noteMesh.position.set(2.15, TOP + 0.006, 1.25);
noteMesh.receiveShadow = true;
laptop.add(noteMesh);

/* ───────────────────────── Desk objects (original set) ───────────────────────── */
// 1. Ginger cat (the downloaded model, loaded below) — petting makes it purr and float hearts
const heartTex = canvasTex(128, 128, (g) => { g.fillStyle = "#ff5c8a"; g.font = "100px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("♥", 64, 70); }).tex;
const hearts = [];
let cat = null, catPetUntil = 0;
function petCat() {
  catPetUntil = performance.now() + 2600;
  Sound.purr();
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    h.scale.setScalar(0.45);
    h.position.copy(cat.position).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, CAT_HEIGHT + 0.4, (Math.random() - 0.5) * 0.6));
    h.userData = { life: 0, delay: i * 0.12, vx: (Math.random() - 0.5) * 0.01 };
    scene.add(h); hearts.push(h);
  }
}

// 2b. Project files — a fanned stack of folders on the desk; each opens the Work window
const folderColors = [0x1c1c1e, 0x111113, 0x2c2c2e, 0x18181a, 0x232325, 0x1a1a1c]; // black folders — stand out on the zebra throw
const projectFiles = new THREE.Group();
S.projects.forEach((p, i) => {
  const f = new THREE.Group();
  const c = folderColors[i % folderColors.length];
  const back = rbox(2.0, 0.035, 1.42, 0.03, mat(c, { roughness: 0.85 }), 2);
  const tab = rbox(0.7, 0.035, 0.24, 0.03, mat(c, { roughness: 0.85 }), 2);
  tab.position.set(-0.55, 0, -0.78);
  const paper = rbox(1.8, 0.02, 1.3, 0.01, mat(0xfbf8f2, { roughness: 0.95 }), 1);
  paper.position.set(0.1, 0.025, -0.12); paper.rotation.y = 0.05;
  const front = rbox(2.0, 0.035, 1.3, 0.03, mat(c, { roughness: 0.8 }), 2);
  front.position.set(0, 0.05, 0.06);
  const label = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = "#fbf8f2"; g.fillRect(20, 40, 340, 120);
    g.strokeStyle = "#1b1a17"; g.lineWidth = 4; g.strokeRect(20, 40, 340, 120);
    g.fillStyle = "#1b1a17"; g.font = `600 34px ${UI}`; g.textBaseline = "top";
    g.fillText(p.title.length > 18 ? p.title.slice(0, 17) + "…" : p.title, 36, 56);
    g.font = `500 24px ${UI}`; g.fillStyle = "#6b665d";
    g.fillText(p.tag.toUpperCase(), 36, 106);
    g.font = `700 40px ${UI}`; g.fillStyle = "#1b1a1766"; g.fillText(String(i + 1).padStart(2, "0"), 400, 180);
  });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 1.0), new THREE.MeshStandardMaterial({ map: label.tex, transparent: true, roughness: 0.9 }));
  lab.rotation.x = -Math.PI / 2; lab.position.set(0, 0.07, 0.15);
  f.add(back, tab, paper, front, lab);
  // free spots on the desk (clear of the mat labels, sketchbook, phone, soundbar and cat); extra projects stack on top
  const spots = [[-2.4, 4.8, 0.3], [0.9, 5.5, -0.18], [5.4, 5.7, 0.15], [-7.9, 1.5, -0.12], [8.1, 5.3, -0.2]];
  const [fx, fz, fr] = spots[i % spots.length], layer = Math.floor(i / spots.length);
  f.position.set(fx + layer * 0.15, layer * 0.13, fz - layer * 0.1);
  f.rotation.y = fr + layer * 0.12;
  projectFiles.add(f);
  interactive(f, `${p.title} case study`, () => { Sound.click(); boot(p.case ? "case:" + p.case.slug : "work"); });
});
projectFiles.position.set(0, 0.08, 0);

scene.add(projectFiles);

// 2c. Smartphone face-up on the desk — real iPhone 15 size: 147.6 × 71.6 × 7.8 mm ≈ 2.95 × 1.43 × 0.16 units
const PH = { w: 1.43, l: 2.95, t: 0.16 };
const phone = new THREE.Group();
const phoneBody = rbox(PH.w, PH.t, PH.l, 0.2, SILVER, 6);
phoneBody.position.y = PH.t / 2;
const phoneGlass = rbox(PH.w - 0.05, 0.012, PH.l - 0.05, 0.19, mat(0x0b0b0c, { roughness: 0.08, clearcoat: 1 }), 4);
phoneGlass.position.y = PH.t + 0.002;
const phoneScreenTex = canvasTex(512, 1080, (g, w, h) => {
  g.scale(2, 2); w = 256; h = 540;   // laid out at 256×540, rendered at 2× for sharpness
  const lg = g.createLinearGradient(0, 0, w, h);
  lg.addColorStop(0, "#5e5ce6"); lg.addColorStop(0.55, "#bf5af2"); lg.addColorStop(1, "#ff9f0a");
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  g.fillStyle = "#fff"; g.textAlign = "center";
  g.font = `600 22px ${UI}`; g.fillText(new Date().toLocaleDateString([], { weekday: "long", day: "numeric", month: "long" }), w / 2, 92);
  g.font = `700 92px ${UI}`; g.fillText(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }).replace(/\s?[AP]M/i, ""), w / 2, 190);
  g.fillStyle = "rgba(255,255,255,.28)"; g.beginPath(); g.roundRect(22, 380, w - 44, 70, 18); g.fill();
  g.fillStyle = "#fff"; g.textAlign = "left"; g.font = `600 20px ${UI}`; g.fillText("New message", 40, 410);
  g.font = `400 18px ${UI}`; g.fillText("Let's work together →", 40, 436);
  g.fillStyle = "#000"; g.beginPath(); g.roundRect(w / 2 - 42, 14, 84, 24, 12); g.fill();
});
const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(PH.w - 0.1, PH.l - 0.1), new THREE.MeshBasicMaterial({ map: phoneScreenTex.tex, toneMapped: false }));
phoneScreen.rotation.x = -Math.PI / 2; phoneScreen.position.y = PH.t + 0.01;
phone.add(phoneBody, phoneGlass, phoneScreen);
phone.position.set(3.9, 0, 4.1);
phone.rotation.y = 0.5;
scene.add(phone);
interactive(phone, "New message — say hello", () => { Sound.click(); boot("contact"); });

// 2d. Things from Sijo's real desk: plant in a mango-yellow pot, green water bottle, black soundbar
const plant = new THREE.Group();
const pot2 = mesh(new THREE.CylinderGeometry(0.75, 0.6, 1.2, 32), mat(0xffb21a, { roughness: 0.45, clearcoat: 0.4 }));   // mango yellow
pot2.position.y = 0.6;
const soil2 = mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.05, 24), mat(0x3b2a20, { roughness: 1 }));
soil2.position.y = 1.15;
plant.add(pot2, soil2);
const leafGeo = new THREE.SphereGeometry(0.5, 16, 10);
leafGeo.scale(1, 0.18, 0.62);
const leafMat = mat(0x4f8a4a, { roughness: 0.55 }), stemMat = mat(0x3d6b38, { roughness: 0.7 });
for (let i = 0; i < 9; i++) {      // a small rubber-plant style cluster
  const a = (i / 9) * Math.PI * 2 + (i % 2) * 0.3, h = 1.6 + (i % 3) * 0.55, r = 0.35 + (i % 3) * 0.15;
  const stem = mesh(new THREE.CylinderGeometry(0.03, 0.04, h - 1.0, 6), stemMat);
  stem.position.set(Math.cos(a) * r * 0.4, 1.15 + (h - 1.0) / 2, Math.sin(a) * r * 0.4);
  stem.rotation.set(Math.sin(a) * 0.25, 0, -Math.cos(a) * 0.25);
  const leaf = mesh(leafGeo, leafMat);
  leaf.position.set(Math.cos(a) * (r + 0.35), h, Math.sin(a) * (r + 0.35));
  leaf.rotation.set(0.35 * Math.sin(a), -a, 0.5);
  plant.add(stem, leaf);
}
plant.position.set(-3.9, 0, -2.7);
scene.add(plant);
interactive(plant, "My desk plant 🌱", () => { Sound.click(); wiggle(plant); });

const bottle = new THREE.Group();
// plain transparency instead of `transmission`: transmission re-renders the whole scene every frame, which made laptops crawl
const bottleMat = new THREE.MeshPhysicalMaterial({ color: 0x3e9a62, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.72, depthWrite: false });
const bBody = mesh(new THREE.CylinderGeometry(0.45, 0.45, 2.4, 28), bottleMat);
bBody.position.y = 1.2;
for (let i = 0; i < 6; i++) { const ring = mesh(new THREE.TorusGeometry(0.46, 0.03, 6, 28), bottleMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.2 + i * 0.16; bottle.add(ring); }
const bShoulder = mesh(new THREE.CylinderGeometry(0.28, 0.45, 0.35, 28), bottleMat);
bShoulder.position.y = 2.57;
const bCap = mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.32, 24), mat(0x2f7a4c, { roughness: 0.4 }));
bCap.position.y = 2.9;
bottle.add(bBody, bShoulder, bCap);
bottle.position.set(-8.5, 0, -2.9);
scene.add(bottle);

const soundbar = new THREE.Group();
const sbBody = rbox(5.2, 0.9, 1.0, 0.42, mat(0x18181a, { roughness: 0.6 }), 6);
sbBody.position.y = 0.45;
const sbGrille = rbox(4.6, 0.62, 0.02, 0.08, mat(0x101012, { roughness: 0.95 }), 2);
sbGrille.position.set(0, 0.47, 0.5);
soundbar.add(sbBody, sbGrille);
soundbar.position.set(-0.1, 0, -3.0);
scene.add(soundbar);
interactive(soundbar, "Music on / off ♪", () => $("#soundBtn").click());

// 3. Headphones on their stand (the downloaded model, loaded below) — click toggles sound
const HEADSET_POS = new THREE.Vector3(6.3, 0, -2.0);   // back-right: between the pen stand and the cat

// 4. Hobby book — a sketchbook with an elastic band, a pencil, and a book underneath
const books = new THREE.Group();
const under = rbox(1.9, 0.3, 1.4, 0.04, mat(0x3a3a3c, { roughness: 0.7 }));
under.position.y = 0.15; under.rotation.y = 0.06;
const underPages = rbox(1.82, 0.24, 1.3, 0.02, mat(0xfaf7f0, { roughness: 0.9 }));
underPages.position.set(0.05, 0.15, 0); underPages.rotation.y = 0.06;
const hobbyCover = canvasTex(512, 384, (g, w, h) => {
  g.fillStyle = "#e9e2d2"; g.fillRect(0, 0, w, h);
  // little illustrated scene: mountains, sun, a winding path
  g.fillStyle = "#f2b45a"; g.beginPath(); g.arc(w * 0.72, h * 0.34, 34, 0, 7); g.fill();
  g.fillStyle = "#6f8f7a"; g.beginPath(); g.moveTo(40, h * 0.7); g.lineTo(170, h * 0.3); g.lineTo(300, h * 0.7); g.fill();
  g.fillStyle = "#3f5f7a"; g.beginPath(); g.moveTo(190, h * 0.7); g.lineTo(320, h * 0.38); g.lineTo(470, h * 0.7); g.fill();
  g.strokeStyle = "#1d1d1f"; g.lineWidth = 2.5; g.beginPath(); g.moveTo(80, h * 0.72); g.bezierCurveTo(200, h * 0.78, 260, h * 0.64, 430, h * 0.74); g.stroke();
  g.fillStyle = "#1d1d1f"; g.font = `700 40px ${UI}`; g.fillText("Weekends", 40, h * 0.86); g.font = `400 26px ${UI}`; g.fillText("games · football · bike rides", 40, h * 0.95);
});
const hobby = new THREE.Group();
const hobbyBoard = rbox(1.75, 0.08, 1.3, 0.03, new THREE.MeshStandardMaterial({ color: 0xe9e2d2, roughness: 0.85 }));
const hobbyPages = rbox(1.68, 0.14, 1.24, 0.02, mat(0xfbf8f2, { roughness: 0.95 }));
hobbyPages.position.y = -0.1;
const hobbyFace = new THREE.Mesh(new THREE.PlaneGeometry(1.7, 1.25), new THREE.MeshStandardMaterial({ map: hobbyCover.tex, roughness: 0.85 }));
hobbyFace.rotation.x = -Math.PI / 2; hobbyFace.position.y = 0.045;
const elastic = rbox(0.06, 0.26, 1.34, 0.02, mat(0x1d1d1f, { roughness: 0.6 }));
elastic.position.set(0.68, -0.06, 0);
const sketchPencil = new THREE.Group();
const sp1 = mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6), mat(0xffd60a));
const sp2 = mesh(new THREE.ConeGeometry(0.04, 0.13, 6), mat(0xf1d3a8));
sp2.position.y = 0.66;
sketchPencil.add(sp1, sp2);
sketchPencil.rotation.set(0, 0, Math.PI / 2); sketchPencil.rotation.y = 0.5;
sketchPencil.position.set(-0.2, 0.1, 0.25);
hobby.add(hobbyBoard, hobbyPages, hobbyFace, elastic, sketchPencil);
hobby.position.y = 0.48; hobby.rotation.y = -0.12;
books.add(under, underPages, hobby);
books.position.set(-5.4, 0.01, 1.2);
books.rotation.y = 0.35;
scene.add(books);
interactive(books, "Weekends: games, football, bike rides", () => { Sound.click(); boot("about"); });

// 5. Pencil cup — behind the computer, left
const cup = new THREE.Group();
const cupBody = mesh(new THREE.CylinderGeometry(0.36, 0.32, 0.85, 28, 1, true), mat(0x161618, { roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }));
cupBody.position.y = 0.425;
const cupBottom = mesh(new THREE.CircleGeometry(0.32, 24), mat(0x161618, { roughness: 0.4 }));
cupBottom.rotation.x = -Math.PI / 2; cupBottom.position.y = 0.02;
cup.add(cupBody, cupBottom);
[[0xfbfbfd, 0.1, -0.09, 0.07, 0.06], [0xd6d8db, -0.11, 0.08, -0.05, -0.07], [0x0a84ff, 0.02, 0.0, 0.0, -0.02]].forEach(([c, tilt, px, pz, lean], i) => {
  const p = new THREE.Group();
  const stick = mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.3, 6), mat(c));
  stick.position.y = 0.65;
  const tip = mesh(new THREE.ConeGeometry(0.05, 0.16, 6), mat(0xf1d3a8));
  tip.position.y = 1.38;
  p.add(stick, tip);
  p.position.set(px, 0.06, pz);          // bases stay well inside the cup
  p.rotation.z = tilt; p.rotation.x = lean;
  cup.add(p);
});
cup.position.set(3.6, 0, -2.6);
scene.add(cup);



/* ───────────────────────── Wall lettering ───────────────────────── */
// Name block — hung on the wall like studio lettering, right of the poster
const nameBlock = floorText([
  { text: S.name + ".", size: 210, weight: 700, spacing: -0.03, color: "#f5f5f7" },
  { text: S.title, size: 112, weight: 500, color: "#d1d1d6", spacing: -0.01 }
], { width: 9.6, gap: 1.2 });   // sized to stay readable from the seated eye-level view
nameBlock.rotation.x = 0;
nameBlock.position.set(7.8, 9.6, WALL_Z + 0.03);
scene.add(nameBlock);
interactive(nameBlock, "About me", () => boot("about"));

// Roles strip — under the name
const half = Math.ceil(S.roles.length / 2);
const rolesBlock = floorText([
  { text: S.roles.slice(0, half).join("  ·  "), size: 92, weight: 500, color: "#aeaeb2", spacing: 0 },
  { text: S.roles.slice(half).join("  ·  "), size: 92, weight: 500, color: "#aeaeb2", spacing: 0 }
], { width: 9.6, gap: 1.4 });
rolesBlock.rotation.x = 0;
rolesBlock.position.set(7.8, 7.0, WALL_Z + 0.03);
scene.add(rolesBlock);

window.OS.setDark(false);   // the desktop uses the light glass look


// (the desk-mat text links and the "Let's connect" tiles were removed — the top menu and the Mac's dock cover them)

/* ───────────────────────── Live screen (macOS-style desktop) ───────────────────────── */
let screenMode = "idle", typed = "", typeTimer = 0;
// laptop wallpaper: Sijo's photo. WALL_FOCUS = which part of the photo to keep when cropping (0–1 across, 0–1 down)
const WALL_FOCUS = [0, 0.4];   // landscape photo, Sijo on the left — keep the left edge
const wallImg = new Image();
wallImg.src = asset("assets/wallpaper.jpg");
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const DOCK_COLORS = [["#64d2ff", "#0a84ff"], ["#ffd60a", "#ff9f0a"], ["#bf5af2", "#5e5ce6"], ["#8e8e93", "#48484a"], ["#30d158", "#00a86b"]];
function drawScreen(t) {
  const g = screenCanvas.g, W = 800, H = 512;
  g.setTransform(SCREEN_PX, 0, 0, SCREEN_PX, 0, 0);
  // Wallpaper: Sijo's photo (cover-cropped, keeping him in frame); the original colour blobs until it has loaded
  if (wallImg.complete && wallImg.naturalWidth) {
    const iw = wallImg.naturalWidth, ih = wallImg.naturalHeight, k = Math.max(W / iw, H / ih);
    const sw = W / k, sh = H / k, sx = (iw - sw) * WALL_FOCUS[0], sy = (ih - sh) * WALL_FOCUS[1];
    g.drawImage(wallImg, sx, sy, sw, sh, 0, 0, W, H);
  } else {
    g.fillStyle = "#4b3fd1"; g.fillRect(0, 0, W, H);
    const blobs = [[0.15, 0.25, "#7d6cff"], [0.85, 0.15, "#ff8fb1"], [0.8, 0.9, "#ffb36b"], [0.2, 0.95, "#3fc6ff"], [0.5, 0.5, "#e46aa0"]];
    blobs.forEach(([bx, by, c], i) => {
      const x = (bx + Math.sin(t * 0.25 + i) * 0.04) * W, y = (by + Math.cos(t * 0.2 + i * 2) * 0.04) * H;
      const rg = g.createRadialGradient(x, y, 0, x, y, W * 0.55);
      rg.addColorStop(0, c); rg.addColorStop(1, c + "00");
      g.fillStyle = rg; g.fillRect(0, 0, W, H);
    });
  }
  const dark = false;   // the screen uses the light glass look
  if (dark) { g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(0, 0, W, H); }
  // Menu bar — transparent, text straight on the wallpaper (macOS 27)
  g.save(); g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 6;
  g.fillStyle = "#fff"; g.textBaseline = "middle"; g.textAlign = "left";
  g.font = `800 13px ${UI}`; g.fillText("SJ", 14, 14);
  g.font = `700 13px ${UI}`; g.fillText("Portfolio", 42, 14);
  g.font = `400 13px ${UI}`;
  ["File", "Edit", "View", "Go", "Window", "Help"].forEach((m, i) => g.fillText(m, 112 + [0, 38, 76, 118, 148, 208][i], 14));
  g.textAlign = "right";
  g.fillText(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), W - 14, 14);
  g.restore();
  // glass helper: tinted fill + bright top highlight + darker edge
  const glass = (x, y, w, h, r, fill) => {
    g.save(); g.shadowColor = "rgba(0,0,0,0.32)"; g.shadowBlur = 34; g.shadowOffsetY = 12;
    g.fillStyle = fill; rr(g, x, y, w, h, r); g.fill(); g.restore();
    g.strokeStyle = dark ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.12)"; g.lineWidth = 1; rr(g, x + 0.5, y + 0.5, w - 1, h - 1, r); g.stroke();
    const hl = g.createLinearGradient(0, y, 0, y + 14); hl.addColorStop(0, dark ? "rgba(255,255,255,0.28)" : "rgba(255,255,255,0.95)"); hl.addColorStop(1, "rgba(255,255,255,0)");
    g.strokeStyle = hl; g.lineWidth = 1.5; rr(g, x + 1, y + 1, w - 2, h - 2, r - 1); g.stroke();
  };
  // Dock — glass shelf, layered glass icons
  const n = DOCK_COLORS.length, ds = 38, dg = 8, dw = n * ds + (n - 1) * dg + 22, dx = (W - dw) / 2, dy = H - 58;
  glass(dx, dy, dw, 52, 18, dark ? "rgba(40,40,46,0.55)" : "rgba(255,255,255,0.32)");
  DOCK_COLORS.forEach(([a, b], i) => {
    const x = dx + 11 + i * (ds + dg), y = dy + 7;
    const lg = g.createLinearGradient(x, y, x, y + ds); lg.addColorStop(0, a); lg.addColorStop(1, b);
    g.fillStyle = lg; rr(g, x, y, ds, ds, 10); g.fill();
    const sh = g.createLinearGradient(x, y, x + ds, y + ds); sh.addColorStop(0, "rgba(255,255,255,0.45)"); sh.addColorStop(0.45, "rgba(255,255,255,0)");
    g.fillStyle = sh; rr(g, x, y, ds, ds, 10); g.fill();
  });
  const ink = dark ? "#f5f5f7" : "#1d1d1f", ink2 = dark ? "#aeaeb2" : "#6e6e73";
  // Centre window — glass, larger corners, sidebar to the edge, controls on the sidebar
  if (screenMode === "idle") {
    const bw = 400, bh = 210, bx = W - bw - 44, by = 116;   // right of centre, so Sijo in the wallpaper photo stays visible
    glass(bx, by, bw, bh, 22, dark ? "rgba(34,34,38,0.88)" : "rgba(250,250,252,0.9)");
    g.fillStyle = dark ? "rgba(70,70,78,0.55)" : "rgba(228,228,236,0.75)"; rr(g, bx + 6, by + 6, 92, bh - 12, 16); g.fill();
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(bx + 22 + i * 17, by + 24, 5.5, 0, 7); g.fill(); });
    g.fillStyle = ink2; [52, 76, 100, 124].forEach((yy) => { rr(g, bx + 18, by + yy, 60, 9, 4.5); g.fill(); });
    const cx = bx + 98 + (bw - 98) / 2;
    g.textAlign = "center"; g.fillStyle = ink;
    g.font = `700 32px ${UI}`; g.fillText(`Hi, I'm ${S.name.split(" ")[0]}.`, cx, by + 84);
    g.font = `400 14px ${UI}`; g.fillStyle = ink2; g.fillText(S.title, cx, by + 114);
    const pulse = 0.85 + Math.sin(t * 3) * 0.15;
    g.globalAlpha = pulse; g.fillStyle = "#0a84ff"; rr(g, cx - 70, by + 138, 140, 34, 17); g.fill(); g.globalAlpha = 1;
    g.fillStyle = "#fff"; g.font = `600 14px ${UI}`; g.fillText(TOUCH ? "Tap to open" : "Click to open", cx, by + 156);
  } else if (screenMode === "typing") {
    const bw = 440, bh = 170, bx = W - bw - 44, by = 130;
    glass(bx, by, bw, bh, 22, "rgba(28,28,30,0.92)");
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(bx + 22 + i * 17, by + 22, 5.5, 0, 7); g.fill(); });
    g.fillStyle = "#a1a1a6"; g.textAlign = "center"; g.font = `600 12px ${UI}`; g.fillText("Terminal", bx + bw / 2, by + 22);
    g.fillStyle = "#f5f5f7"; g.textAlign = "left"; g.font = `500 20px "SF Mono", Menlo, monospace`;
    g.fillText("sijo@desk ~ % " + typed + (Math.floor(t * 3) % 2 ? "▍" : ""), bx + 24, by + 74);
  }
  screenCanvas.tex.needsUpdate = true;
}
function typeOnScreen() {
  const msg = "hello, world! I'm " + S.name.split(" ")[0] + " :)";
  screenMode = "typing"; typed = "";
  clearInterval(typeTimer);
  typeTimer = setInterval(() => {
    typed = msg.slice(0, typed.length + 1);
    if (typed.length % 2) Sound.hover();
    if (typed === msg) { clearInterval(typeTimer); setTimeout(() => (screenMode = "idle"), 1800); }
  }, 70);
}

/* ───────────────────────── Camera moves ───────────────────────── */
let tween = null;
// cubic-bezier easing (same curves CSS uses) — Apple-style motion
function bezier(x1, y1, x2, y2) {
  const B = (t, a, b) => 3 * a * t * (1 - t) * (1 - t) + 3 * b * t * t * (1 - t) + t * t * t;
  return (x) => {
    let lo = 0, hi = 1, t = x;
    for (let i = 0; i < 22; i++) { t = (lo + hi) / 2; B(t, x1, x2) < x ? (lo = t) : (hi = t); }
    return B(t, y1, y2);
  };
}
const EASE_IN_OUT = bezier(0.42, 0, 0.2, 1);   // gentle start, long soft landing
const EASE_APPLE = bezier(0.32, 0.72, 0, 1);    // Apple's standard "out" curve
function moveCamera(toPos, toTarget, toZoom, dur = 1100, done, ease = EASE_IN_OUT) {
  const from = { pos: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom };
  const start = performance.now();
  controls.enabled = false;
  tween = (now) => {
    let k = Math.min(1, (now - start) / (reduced ? 1 : dur));
    const e = ease(k);
    camera.position.lerpVectors(from.pos, toPos, e);
    controls.target.lerpVectors(from.target, toTarget, e);
    camera.zoom = THREE.MathUtils.lerp(from.zoom, toZoom, e);
    camera.updateProjectionMatrix();
    if (k === 1) { tween = null; controls.enabled = true; done && done(); }
  };
}
let booting = false;
// the laptop screen's rectangle on the page, in CSS pixels
function screenRect() {
  const xs = [], ys = [];
  for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const p = new THREE.Vector3(sx * SCREEN_W / 2, sy * SCREEN_H / 2, 0).applyMatrix4(screen.matrixWorld).project(camera);
    xs.push((p.x + 1) / 2 * innerWidth); ys.push((1 - p.y) / 2 * innerHeight);
  }
  const l = Math.min(...xs), t = Math.min(...ys);
  return { left: l, top: t, width: Math.max(...xs) - l, height: Math.max(...ys) - t };
}
function boot(app) {
  if (booting) return;
  booting = true;
  Sound.boot();
  hideTooltip();
  $("#hint").style.opacity = 0;
  coachDone();
  const screenWorld = new THREE.Vector3();
  screen.getWorldPosition(screenWorld);
  const v = THREE.MathUtils.degToRad(camera.fov), hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
  const d = Math.max((SCREEN_H * 1.15) / 2 / Math.tan(v / 2), (SCREEN_W * 1.15) / 2 / Math.tan(hf / 2));
  const normal = new THREE.Vector3();
  screen.getWorldDirection(normal);
  controls.minDistance = 0;   // let the camera fly right up to the screen (zoom limits would stop it short)
  moveCamera(screenWorld.clone().addScaledVector(normal, d), screenWorld, 1, 1250, () => {
    // hand-off: the desktop grows out of exactly where the laptop screen is on your display
    window.OS.open(app, () => {
      setRoomView(false);
      moveCamera(HOME.pos, HOME.target, HOME.zoom, 1150, () => { booting = false; setZoomLimits(); $("#hint").style.opacity = ""; }, EASE_APPLE);
    }, screenRect());
  });
}

/* ───────────────────────── Hover + click ───────────────────────── */
const ray = new THREE.Raycaster();
const ptr = new THREE.Vector2();
let hovered = null, downAt = null;
const tip = $("#tooltip");
function hideTooltip() { tip.classList.remove("show"); $("#stage").classList.remove("pointer"); }
function pick(e) {
  ptr.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
  ray.setFromCamera(ptr, camera);
  const hits = ray.intersectObjects(hoverables, true);
  for (const h of hits) {
    let o = h.object;
    while (o && !o.userData.hover) o = o.parent;
    if (o) return o;
  }
  return null;
}
renderer.domElement.addEventListener("pointermove", (e) => {
  if (booting || tween || e.pointerType === "touch") return;   // a moving finger is a drag — no hover states on touch
  const o = pick(e);
  if (o !== hovered) {
    hovered = o;
    if (o) Sound.hover();
  }
  if (o) {
    tip.textContent = o.userData.hover.label;
    tip.style.left = e.clientX + "px"; tip.style.top = e.clientY + "px";
    tip.classList.add("show");
    $("#stage").classList.add("pointer");
  } else hideTooltip();
});
renderer.domElement.addEventListener("pointerdown", (e) => (downAt = [e.clientX, e.clientY]));
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!downAt || booting) return;
  const moved = Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]);
  downAt = null;
  if (moved > (e.pointerType === "touch" ? 12 : 6)) return; // that was a drag, not a click
  const o = pick(e);
  if (!o) return;
  if (e.pointerType === "touch") {   // touch has no hover: show the label and lift briefly, then let them go
    hovered = o;
    tip.textContent = o.userData.hover.label;
    tip.style.left = e.clientX + "px"; tip.style.top = e.clientY + "px";
    tip.classList.add("show");
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { hovered = null; hideTooltip(); }, 1200);
  }
  o.userData.hover.onClick();
});
let tapTimer = 0;
renderer.domElement.addEventListener("pointerleave", (e) => { if (e.pointerType !== "touch") { hovered = null; hideTooltip(); } });   // a lifted finger "leaves" too — tap labels clear on their own timer

// Zoom button
// Zoom button: step back to see the whole room (and play with the ball) / come back to the desk close-up
let roomView = false;
function setRoomView(on) {
  roomView = on;
  $("#zoomIcon").setAttribute("d", on ? "M20 20l-3.5-3.5M8 11h6M11 8v6" : "M20 20l-3.5-3.5M8 11h6");
  $("#zoomBtn").setAttribute("aria-label", on ? "Back to the desk close-up" : "Step back to see the room");
}
// Zooming OUT always ends centred: pulling back past the start view glides into the centred room view
// (the start view looks from the right, so a plain dolly-out drifted left). Zoom-to-cursor only applies when
// zooming in — zooming out toward/away from the cursor also pushed the view sideways.
// Zooming IN — from anywhere on the screen — always heads for the laptop: the orbit centre glides onto the
// laptop screen while the camera dollies in (instead of zooming toward the cursor).
controls.zoomToCursor = false;
const laptopFocus = new THREE.Vector3();
let focusUntil = 0;
function focusLaptop() { screen.getWorldPosition(laptopFocus); focusUntil = performance.now() + 900; }
let zoomOutUntil = 0;   // set only by a real zoom-out gesture (scroll down / pinch together)
renderer.domElement.addEventListener("wheel", (e) => { if (e.deltaY < 0) focusLaptop(); else if (e.deltaY > 0) zoomOutUntil = performance.now() + 600; }, { capture: true, passive: true });
let pinchStart = 0;
renderer.domElement.addEventListener("touchstart", (e) => { if (e.touches.length === 2) pinchStart = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY); }, { capture: true, passive: true });
renderer.domElement.addEventListener("touchmove", (e) => {
  if (e.touches.length !== 2 || !pinchStart) return;
  const d = Math.hypot(e.touches[0].clientX - e.touches[1].clientX, e.touches[0].clientY - e.touches[1].clientY);
  if (d > pinchStart + 4) focusLaptop(); else if (d < pinchStart - 4) zoomOutUntil = performance.now() + 600;
}, { capture: true, passive: true });
controls.addEventListener("change", () => {
  if (tween || booting || roomView || performance.now() > zoomOutUntil) return;   // only a real zoom-out gesture switches views
  if (camera.position.distanceTo(controls.target) > HOME.dist * 1.12) { setRoomView(true); moveCamera(ROOM.pos, ROOM.target, 1, 900); }
});
$("#zoomBtn").addEventListener("click", () => {
  if (booting) return;
  setRoomView(!roomView);
  Sound.click();
  const v = roomView ? ROOM : HOME;
  moveCamera(v.pos, v.target, 1, 900);
});

let wiggleT = -1, wiggleObj = null;
function wiggle(o) { wiggleObj = o; wiggleT = 0; }

/* ───────────────────────── "Click the laptop" pointer (until it's opened this visit) ───────────────────────── */
const coach = $("#coach"), coachAnchor = new THREE.Vector3();
let coachOn = true;   // shown on every visit/refresh until the laptop is opened in this visit
function coachShow() { if (coachOn) coach.hidden = false; }
function coachDone() { coachOn = false; coach.hidden = true; }
// While the view is being dragged/rotated (or easing to a stop) the pointer fades out instead of sliding
// around with the laptop; it fades back in once the camera has been still for a moment.
const lastCamPos = new THREE.Vector3(), lastCamQ = new THREE.Quaternion();
let camStillSince = 0;
function placeCoach() {
  if (coach.hidden) return;
  const now = performance.now();
  if (camera.position.distanceToSquared(lastCamPos) > 1e-6 || 1 - Math.abs(camera.quaternion.dot(lastCamQ)) > 1e-7) camStillSince = now;
  lastCamPos.copy(camera.position); lastCamQ.copy(camera.quaternion);
  const settling = now - camStillSince < 350;
  // Pin the arrow tip to the middle of the lid's top edge (centred on the laptop, pointing down at the screen);
  // if that would sit under the top menu pill, drop it onto the upper part of the screen instead.
  const at = (ly) => { screen.localToWorld(coachAnchor.set(0, ly, 0)).project(camera); return [(coachAnchor.x + 1) / 2 * innerWidth, (1 - coachAnchor.y) / 2 * innerHeight - 4]; };
  let [x, y] = at(SCREEN_H / 2 + 0.3);
  if (y < 120) [x, y] = at(SCREEN_H * 0.3);
  coach.style.opacity = booting || tween || settling || coachAnchor.z > 1 || y < 110 ? 0 : 1;   // never while moving, never under the top menu pill
  if (settling) return;   // keep it parked where it was while it fades out
  coach.style.transform = `translate(${x}px, ${y}px) translate(-50%, -100%)`;
}

/* ───────────────────────── Loop ───────────────────────── */
// Weak GPUs (budget phones, old laptops): if the desk renders below ~35 fps, step quality down —
// first render at 1× pixel density, then drop the lamp's shadows and halve the sun's shadow map.
// Only judged once things have settled (≥4 s after the desk appears, not while the camera is flying or models are
// fading in) — the first seconds include shader compiles and made phones look slow, dropping them to 1× (blurry).
const perf = { dts: [], step: 0, from: 0 };
function adaptQuality(dt) {
  if (perf.step >= 2 || document.hidden || dt > 500 || tween || fading.length) return;   // ignore pauses + busy moments
  const now = performance.now();
  if (!perf.from) perf.from = now + 4000;
  if (now < perf.from) return;
  perf.dts.push(dt);
  if (perf.dts.length < 120) return;
  const median = perf.dts.sort((a, b) => a - b)[60];
  perf.dts = [];
  if (median < 40) { perf.step = 2; return; }   // 25 fps or better — keep full quality, stop measuring
  perf.step++;
  if (perf.step === 1 && renderer.getPixelRatio() > 1.5) { renderer.setPixelRatio(1.5); renderer.setSize(innerWidth, innerHeight); }   // gentle step: 1.5×, never 1×
  else { perf.step = 2; lampLight.castShadow = false; sun.shadow.mapSize.set(1024, 1024); sun.shadow.map?.dispose(); sun.shadow.map = null; }
  console.info("Lowered 3D quality for smoother performance (step " + perf.step + ")");
}

const clock = new THREE.Clock();
let lastScreen = 0, lastNow = 0;
function loop(now) {
  requestAnimationFrame(loop);
  // the Mac desktop covers the scene: skip rendering it (saves battery; the last frame stays on screen)
  if (window.OS.isCovering?.()) { lastNow = now; return; }   // ?. — a stale cached os.js may not have it
  const t = clock.getElapsedTime();
  const dt = lastNow ? now - lastNow : 1000 / 60;
  const f = Math.min(3, dt / (1000 / 60)) || 1;   // frame-rate independence: 1 at 60 fps
  lastNow = now;
  if (now < focusUntil && !tween && !booting) controls.target.lerp(laptopFocus, Math.min(1, 0.12 * f));   // zoom-in heads for the laptop
  adaptQuality(dt);
  if (fading.length) stepFades(now);
  if (tween) tween(now);
  controls.update();

  // hover lift / scale
  for (const o of hoverables) {
    const h = o.userData.hover;
    const target = o === hovered && !booting ? 1 : 0;
    h.lift += (target - h.lift) * 0.18;
    const s = 1 + h.lift * 0.05;
    o.scale.set(h.base.x * s, h.base.y * s, h.base.z * s);
  }
  btnCap.material.emissiveIntensity = 0.25 + (Math.sin(t * 3) * 0.5 + 0.5) * 0.6;

  {
    // cat: gentle tail sway, quicker on hover, big happy swish while petted (reduced motion: only when petted)
    const petting = now < catPetUntil;
    if (catRig && (!reduced || petting)) {
      const catHover = hovered === cat && !booting;
      const amp = petting ? 0.75 : catHover ? 0.4 : 0.14, speed = petting ? 9 : catHover ? 6 : 1.8;
      swishTail(catRig, amp, speed, petting ? 5 : 1.5, t);
    }
  }
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i], d = h.userData;
    if ((d.delay -= f / 60) > 0) { h.material.opacity = 0; continue; }
    d.life += f / 60;
    h.position.y += 0.025 * f; h.position.x += (d.vx + Math.sin(d.life * 6) * 0.006) * f;
    h.material.opacity = Math.max(0, 1 - d.life / 1.4);
    if (d.life > 1.4) { scene.remove(h); h.material.dispose(); hearts.splice(i, 1); }
  }
  if (ball && Math.abs(ballVX) > 0.001) {
    ball.position.x += ballVX * f;
    ball.children[0].rotation.z -= ballVX * f / BALL_R;
    ballVX *= Math.pow(0.985, f);
    const BX0 = X0 + 0.8 + BALL_R + 0.05, BX1 = CX0 - BALL_R - 0.05;   // rolls under the desk front, between the left panel and the cubby
    if (ball.position.x < BX0) { ball.position.x = BX0; ballVX = Math.abs(ballVX) * 0.75; }
    if (ball.position.x > BX1) { ball.position.x = BX1; ballVX = -Math.abs(ballVX) * 0.75; }
  }
  if (wiggleT >= 0) {
    wiggleT += 0.06 * f;
    wiggleObj.rotation.z = Math.sin(wiggleT * 9) * 0.08 * Math.max(0, 1 - wiggleT);
    if (wiggleT > 1) { wiggleObj.rotation.z = 0; wiggleT = -1; }
  }
  if (now - lastScreen > 33) { drawScreen(t); lastScreen = now; }
  placeCoach();
  renderer.render(scene, camera);
}

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  fitCamera();
  setZoomLimits();
  if (!booting && !tween) { const v = roomView ? ROOM : HOME; camera.position.copy(v.pos); controls.target.copy(v.target); camera.zoom = 1; camera.updateProjectionMatrix(); }
  if (started) renderer.render(scene, camera);   // setSize clears the canvas; repaint even if the loop is paused behind the desktop
});

/* ───────────────────────── Downloaded models (cat, football, headset) ─────────────────────────
   All three are small meshopt-compressed GLBs (see HANDOVER §14). Their downloads were started at
   the top of this file (fetchAsset); here they're parsed and placed.                            */
const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const loadGLB = async (url) => gltfLoader.parseAsync(await fetchAsset(url), "");
// Models that arrive after the desk is already showing fade in instead of popping
function reveal(obj) {
  scene.add(obj);
  if (!started || reduced) return;
  const mats = new Set();
  obj.traverse((m) => { if (m.isMesh) mats.add(m.material); });
  const list = [...mats].map((m) => ({ m, transparent: m.transparent, opacity: m.opacity }));
  list.forEach(({ m }) => { m.transparent = true; m.opacity = 0; m.needsUpdate = true; });
  fading.push({ list, start: performance.now() });
}
function stepFades(now) {
  for (let i = fading.length - 1; i >= 0; i--) {
    const k = Math.min(1, (now - fading[i].start) / 600);
    fading[i].list.forEach((x) => { x.m.opacity = x.opacity * k; });
    if (k === 1) { fading[i].list.forEach((x) => { x.m.transparent = x.transparent; x.m.needsUpdate = true; }); fading.splice(i, 1); }
  }
}
const shadowsOn = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });
// glTF UVs are top-down, so textures loaded separately must not be flipped
const loadTex = (url, srgb = false) => fetchAsset(url).then((img) => {
  const t = new THREE.Texture(img);
  t.flipY = false; t.needsUpdate = true;
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
});

// Fur texture recoloured to ginger: keep the light/dark detail, remap it onto a ginger ramp
function gingerize(img) { return recolor(img, [96, 44, 14], [210, 122, 56], [250, 222, 184]); }
function recolor(img, dark, mid, light) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    let l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    l = Math.min(1, Math.max(0, (l - 0.06) * 1.4));
    const [a, b, k] = l < 0.6 ? [dark, mid, l / 0.6] : [mid, light, (l - 0.6) / 0.4];
    px[i] = a[0] + (b[0] - a[0]) * k; px[i + 1] = a[1] + (b[1] - a[1]) * k; px[i + 2] = a[2] + (b[2] - a[2]) * k;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.flipY = false;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
let catRig = null;
const TAIL_BASE = new THREE.Vector3(0, 19.5, 22), TAIL_LEN = 19.5;
function swishTail(r, amp, speed, lift, t) {
  const { posed, tail, wt, tailBase: b } = r, P = r.pos.array;
  for (let k = 0; k < tail.length; k++) {
    const i = tail[k] * 3, wk = wt[k], wc = Math.pow(wk, 1.4);
    const ang = amp * wc * Math.sin(t * speed - wk * 2.2), c = Math.cos(ang), s = Math.sin(ang);
    const dx = posed[i] - b.x, dy = posed[i + 1] - b.y;
    P[i] = b.x + dx * c - dy * s; P[i + 1] = b.y + dx * s + dy * c;
    P[i + 2] = posed[i + 2] + lift * wc * (0.5 + 0.5 * Math.sin(t * speed * 0.5 - wk * 1.5));
  }
  r.pos.needsUpdate = true;
}
const CAT_HEIGHT = 5.0; // ≈ 25 cm — real-cat size next to the 13" laptop
async function loadCat() {
  const [gltf, diffuse, bump] = await Promise.all([
    loadGLB(MODEL.cat),
    loadTex(MODEL.catDiffuse),
    loadTex(MODEL.catBump)
  ]);
  const obj = gltf.scene;
  const fur = new THREE.MeshStandardMaterial({ map: gingerize(diffuse.image), bumpMap: bump, bumpScale: 2, roughness: 0.9 });
  diffuse.dispose();
  // The model has no skeleton, so we pose it by bending its vertices (model space: cm, Z-up, head at −y, tail at +y).
  //  · tail (thin strip behind the rump) → swishes
  obj.traverse((m) => {
    if (!m.isMesh) return;
    m.material = fur;
    m.frustumCulled = false;
    // the GLB stores quantised positions (small download); unpack them to plain floats in model space (cm)
    // so the tail rig can bend them: float = stored value × the node's dequantisation transform
    const src = m.geometry.attributes.position, v = new THREE.Vector3(), arr = new Float32Array(src.count * 3);
    m.updateMatrix();
    for (let i = 0; i < src.count; i++) { v.fromBufferAttribute(src, i).applyMatrix4(m.matrix).toArray(arr, i * 3); }
    const pos = new THREE.BufferAttribute(arr, 3);
    m.geometry.setAttribute("position", pos);
    m.position.set(0, 0, 0); m.quaternion.identity(); m.scale.set(1, 1, 1);
    m.geometry.computeBoundingBox(); m.geometry.computeBoundingSphere();
    const tail = [], wt = [];
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
      if (y > TAIL_BASE.y && Math.abs(x) < 1.8 && z > 17) { tail.push(i); wt.push(Math.min(1, (y - TAIL_BASE.y) / TAIL_LEN)); }
    }
    catRig = { pos, posed: Float32Array.from(pos.array), tail: Int32Array.from(tail), wt: Float32Array.from(wt), tailBase: TAIL_BASE.clone() };
  });
  obj.rotation.x = -Math.PI / 2;            // model is Z-up
  const holder = new THREE.Group();
  holder.add(obj);
  shadowsOn(holder);
  let box = new THREE.Box3().setFromObject(holder);
  const s = CAT_HEIGHT / box.getSize(new THREE.Vector3()).y;
  obj.scale.setScalar(s);
  box.setFromObject(holder);
  const c = box.getCenter(new THREE.Vector3());
  obj.position.set(-c.x, -box.min.y, -c.z);  // centre the cat on its holder, feet on the desk
  holder.position.set(7.0, 0, 1.0);
  holder.rotation.y = CAT_FACING;
  reveal(holder);
  cat = interactive(holder, "Shea says: pet me?", petCat);
}
const CAT_FACING = -0.55; // mostly facing the viewer, turned slightly towards the laptop

// Ball on the marble floor — click to kick it
let ball = null, ballVX = 0;
const BALL_R = 1.5; // ≈15 cm across — reads in proportion with the desk
async function loadBall() {
  const [gltf, base, normal, rough] = await Promise.all([
    loadGLB(MODEL.ball), loadTex(MODEL.ballColor, true), loadTex(MODEL.ballNormal), loadTex(MODEL.ballRough)
  ]);
  const leather = new THREE.MeshStandardMaterial({ map: base, normalMap: normal, roughnessMap: rough, roughness: 1, metalness: 0 });
  gltf.scene.traverse((m) => { if (m.isMesh) m.material = leather; });
  const inner = new THREE.Group();
  inner.add(gltf.scene);
  shadowsOn(inner);
  const r = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3()).y / 2;
  inner.scale.setScalar(BALL_R / r);
  const c = new THREE.Box3().setFromObject(inner).getCenter(new THREE.Vector3());
  inner.position.sub(c);
  const spin = new THREE.Group();   // rolling rotation lives here
  spin.add(inner);
  ball = new THREE.Group();
  ball.add(spin);
  ball.position.set(-4.5, floor.position.y + BALL_R, 6.2); // on the floor at the front of the desk (under the throw's hem), in view
  reveal(ball);
  interactive(ball, "Kick me ⚽", () => { Sound.click(); ballVX = (ball.position.x > 0 ? -1 : 1) * 0.4; });
}

async function loadHeadphones() {
  const gltf = await loadGLB(MODEL.headset);
  const model = gltf.scene;
  model.traverse((m) => {
    if (!m.isMesh) return;
    const old = m.material, c = old.color ? old.color.clone() : new THREE.Color(0x222222);
    const clear = old.transparent || old.opacity < 1;
    const l = c.getHSL({}).l;
    let mtl;
    if (clear) mtl = { color: 0xffffff, roughness: 0.08, transparent: true, opacity: 0.2 };
    else if (c.g > c.r + 0.2 && c.g > c.b + 0.2) mtl = { color: 0x48484a, roughness: 0.4, metalness: 0.3 };   // brand-green accents → graphite
    else if (l > 0.5) mtl = { color: 0x2c2c2e, roughness: 0.75, sheen: 0.4, sheenColor: new THREE.Color(0x555555) }; // untextured leather / foam → graphite leather
    else if (l > 0.08) mtl = { color: 0x8e8e93, roughness: 0.3, metalness: 0.85 };   // chrome sliders → brushed metal
    else mtl = { color: 0x161618, roughness: 0.45, metalness: 0.1, clearcoat: 0.4 };  // black plastic
    m.material = new THREE.MeshPhysicalMaterial(mtl);
  });
  const holder = new THREE.Group();
  const inner = new THREE.Group();
  inner.add(model);
  holder.add(inner);
  shadowsOn(holder);
  // standing upright, as modelled: headband on top, ear cups left and right (cups run along z, so turn 90°)
  inner.rotation.y = Math.PI / 2;
  let box = new THREE.Box3().setFromObject(inner);
  const size = box.getSize(new THREE.Vector3());
  inner.scale.setScalar(4.2 / size.y);                                    // ≈ 21 cm tall, real size
  box = new THREE.Box3().setFromObject(inner);
  const c = box.getCenter(new THREE.Vector3());
  inner.position.set(-c.x, -box.min.y, -c.z);
  holder.position.copy(HEADSET_POS);
  holder.rotation.y = -0.25;   // turned slightly towards the viewer
  reveal(holder);
  interactive(holder, "Sound on / off", () => $("#soundBtn").click());
}

deskBuilt = true;
setProgress(50 + modelFrac * 45, "loading models…");
// Each model retries once (flaky networks), then is simply left out — never a broken stand-in.
const attempt = (load) => load().catch((err) => { console.warn("Model failed, retrying:", err); return load(); });
const models = Promise.allSettled([attempt(loadCat), attempt(loadBall), attempt(loadHeadphones)])
  .then((r) => r.forEach((x) => x.status === "rejected" && console.warn("Model could not be loaded:", x.reason)));
// Don't hold the page hostage on a slow connection: after a few seconds the desk opens anyway
// and any model still downloading appears as soon as it arrives.
// (counted from when this script started, so a slow font download doesn't add to it)
await Promise.race([models, new Promise((r) => setTimeout(r, Math.max(0, 5000 - (performance.now() - T0))))]);

/* ───────────────────────── Start ───────────────────────── */
drawScreen(0);
setProgress(98, "warming up…");
// compile shaders without freezing the page (uses parallel compilation where the GPU driver supports it)
try { await Promise.race([renderer.compileAsync(scene, camera), new Promise((r) => setTimeout(r, 4000))]); } catch (_) {}
setProgress(100, "ready");
started = true;
requestAnimationFrame(loop);
// read-only status for automated checks (.claude/skills/site-qa) and debugging in the console: Desk.state()
window.Desk = { state: () => ({ started, cat: !!cat, ball: !!ball, headset: hoverables.some((o) => o.userData.hover.label === "Sound on / off"),
  covering: !!window.OS.isCovering?.(), quality: perf.step, pixelRatio: renderer.getPixelRatio(), fading: fading.length,
  booting, tailX: catRig && catRig.tail.length ? catRig.pos.array[catRig.tail[catRig.tail.length - 1] * 3] : null,
  ballX: ball ? ball.position.x : null, audio: Sound.state, music: window.Music.playing, room: roomView, homeDist: HOME.dist, roomDist: ROOM.dist }),
  // clickable things whose centre is outside the current view (should be none at home and when leaned in)
  // where a clickable thing (by its label) is on screen, in CSS pixels — lets tests tap it wherever the camera puts it
  screenPos: (label) => { const o = hoverables.find((h) => h.userData.hover.label.includes(label)); if (!o) return null;
    const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).project(camera); return { x: (c.x + 1) / 2 * innerWidth, y: (1 - c.y) / 2 * innerHeight }; },
  offscreen: () => hoverables.filter((o) => { const c = new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3()).project(camera); return Math.abs(c.x) > 0.98 || Math.abs(c.y) > 0.98 || c.z > 1; }).map((o) => o.userData.hover.label) };
const setHint = () => { $("#hint").textContent = TOUCH ? "Drag to look around · Tap the laptop to open" : innerWidth < 700 ? "Drag to look around · Click the laptop to open" : "Drag to look around · Click the laptop to open my portfolio"; };
setHint(); addEventListener("resize", setHint);
$("#coachText").textContent = TOUCH ? "Tap the laptop" : "Click the laptop";
const deep = new URLSearchParams(location.search).get("open");
let entered = false;
function enter(withSound) {
  if (entered) return;
  entered = true;
  Sound.setMuted(!withSound);          // this click is the gesture that lets the browser start the music
  $("#loader").classList.add("done");
  document.activeElement?.blur?.();
  coachShow();
}
if (deep) { enter(!Sound.muted); setTimeout(() => boot(deep), 900); }   // a shared link straight to a section
else {
  document.querySelectorAll("#intro [data-touch]").forEach((b) => (b.textContent = TOUCH ? b.dataset.touch : b.dataset.mouse));
  $("#loader").classList.add("ready");
  $("#intro").hidden = false;
  $("#introGo").addEventListener("click", () => enter(true));
  $("#introQuiet").addEventListener("click", () => enter(false));
  $("#introGo").focus({ preventScroll: true });
}

// Coming back to the site later (reopened tab, back/forward cache, or after 10+ min away) starts at the desk,
// not inside the Mac
let hiddenAt = 0;
const backToDesk = () => { if (window.OS.isOpen()) window.OS.close(); };
addEventListener("pageshow", (e) => { if (e.persisted) backToDesk(); });
document.addEventListener("visibilitychange", () => {
  if (document.hidden) hiddenAt = Date.now();
  else if (hiddenAt && Date.now() - hiddenAt > 10 * 60 * 1000) backToDesk();
});
// Enter / Space boots the laptop (when nothing else on the page has focus)
addEventListener("keydown", (e) => {
  if (entered && (e.key === "Enter" || e.key === " ") && !window.OS.isOpen() && (document.activeElement === document.body || !document.activeElement)) {
    e.preventDefault(); boot("about");
  }
});
