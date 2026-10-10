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
// every model file, in one place: prefetched here, used by loadCat / loadBall below
// Release number (main.js is loaded as main.js?v=N): appended to every asset URL so a new release never shows
// stale cached images/models (files keep their names when replaced).
const BUILD = new URL(import.meta.url).searchParams.get("v") || "dev";
const asset = (u) => `${u}?v=${BUILD}`;
const MODEL = {
  cat: asset("models/cat/cat.glb"), catDiffuse: asset("models/cat/cat_diffuse.jpg"), catBump: asset("models/cat/cat_bump.jpg"),
  ball: asset("models/football/football.glb"), ballColor: asset("models/football/color.jpg"), ballNormal: asset("models/football/normal.jpg"), ballARM: asset("models/football/arm.jpg")
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
  [-8.5, 3.3, -2.9], [-3.9, 3.4, -2.7], [0, 4.4, -1.6], [8.3, 5.2, 0.4]   // bottle, plant, laptop lid, cat
]);
const HOME_SEE = V([   // what the opening shot frames (desk ends and the poster's top are allowed to crop, like a photo)
  [-8.5, 3.3, -2.9], [-3.9, 3.4, -2.7],                 // bottle, plant
  [-3.1, 0, 2.6], [3.1, 0, 2.6], [0, 4.4, -1.6],        // laptop
  [8.3, 5.2, 0.4], [8.3, 0, 2.8],     // cat
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
// the room is snug, so looking around never swings the camera through a side wall: it slides in closer instead
const _off = new THREE.Vector3();
function keepInsideRoom() {
  const lim = ROOM_HALF - 2.5, x = camera.position.x - TABLE.x;
  if (Math.abs(x) <= lim) return;
  _off.subVectors(camera.position, controls.target);
  const s = (Math.sign(x) * lim + TABLE.x - controls.target.x) / _off.x;
  if (s > 0 && s < 1) camera.position.copy(controls.target).addScaledVector(_off, s);
}

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
// Glazed ceramic floor tiles in Mulberry (#664139), 60 cm square (12 units), with recessed grout lines.
// One texture holds 4 × 4 tiles; each tile varies a touch in tone and has a faint glaze mottle, like real ceramic.
const TILE = 12, TILES_PER_TEX = 4;
// The room's lights brighten and cool what you see, so base colours are pre-darkened until the rendered
// colour on screen matches the swatch (measured in daylight): Mulberry #664139 floor, Oat #CDBEA5 walls.
const FLOOR_TINT = 0x8a6357, WALL_PAINT = 0xab9271;
function tileTextures() {
  const S = 2048, T = S / TILES_PER_TEX, G = 8;   // px per tile; grout ≈ 9 mm
  const col = document.createElement("canvas"), bump = document.createElement("canvas");
  col.width = col.height = bump.width = bump.height = S;
  const g = col.getContext("2d"), b = bump.getContext("2d");
  g.fillStyle = "#a8988c"; g.fillRect(0, 0, S, S);           // grout: warm light grey, so every joint reads
  b.fillStyle = "#000"; b.fillRect(0, 0, S, S);              // grout sits low
  let seed = 11; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let ty = 0; ty < TILES_PER_TEX; ty++) for (let tx = 0; tx < TILES_PER_TEX; tx++) {
    const x = tx * T + G / 2, y = ty * T + G / 2, w = T - G, k = 0.94 + rnd() * 0.1;
    const c = [0x66, 0x41, 0x39].map((v) => Math.round(v * k));
    const lg = g.createLinearGradient(x, y, x + w, y + w);   // gentle glaze sheen across the tile
    lg.addColorStop(0, `rgb(${c.map((v) => v + 6)})`); lg.addColorStop(1, `rgb(${c.map((v) => v - 5)})`);
    g.fillStyle = lg; g.fillRect(x, y, w, w);
    for (let n = 0; n < 260; n++) {                          // glaze mottle
      g.fillStyle = `rgba(${rnd() > 0.5 ? "255,235,225" : "40,15,10"},${0.015 + rnd() * 0.025})`;
      g.beginPath(); g.arc(x + rnd() * w, y + rnd() * w, 6 + rnd() * 40, 0, 7); g.fill();
    }
    g.strokeStyle = "rgba(0,0,0,0.22)"; g.lineWidth = 2; g.strokeRect(x + 1, y + 1, w - 2, w - 2);       // soft bevel shadow
    g.strokeStyle = "rgba(255,230,220,0.07)"; g.lineWidth = 1; g.strokeRect(x + 3, y + 3, w - 6, w - 6);
    b.fillStyle = "#fff"; b.fillRect(x + 2, y + 2, w - 4, w - 4);   // tile face raised
    b.fillStyle = "#bbb"; b.fillRect(x, y, w, 2); b.fillRect(x, y, 2, w); b.fillRect(x, y + w - 2, w, 2); b.fillRect(x + w - 2, y, 2, w);
  }
  const mk = (c, srgb) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); return t; };
  return [mk(col, true), mk(bump, false)];
}
const [tileMap, tileBump] = tileTextures();
const floor = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshPhysicalMaterial({ map: tileMap, bumpMap: tileBump, bumpScale: 1.2, color: FLOOR_TINT, roughness: 0.42, clearcoat: 0.25, clearcoatRoughness: 0.25 }));   // glazed ceramic
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
floor.position.y = -14.8; // desk height ≈ 74 cm
scene.add(floor);


/* ───────────────────────── Sijo's desk (from the photo) ─────────────────────────
   Dark laminate desk: solid side panel on the left, open cubby shelf on the right,
   a desk mat on the bare top. Top surface at y = 0.   */
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


// Desk mat — original storm/lightning artwork made for this site (assets/deskmat.jpg, 3:1). The procedural blue-violet
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
const ROOM_HALF = 26.4;   // half the room's width (≈2.6 m wide: a snug bedroom, the side walls close to the desk)
const wall = new THREE.Mesh(new THREE.PlaneGeometry(400, 220), new THREE.MeshStandardMaterial({ color: WALL_PAINT, roughness: 0.94 }));   // Oat backing (hidden behind the painted panels)
wall.position.set(TABLE.x, 60, WALL_Z);   // reaches well above and below anything the camera can see
wall.receiveShadow = true;
scene.add(wall);
for (const side of [-1, 1]) {   // side walls (plain backing behind the panelling)
  const sideWall = new THREE.Mesh(new THREE.PlaneGeometry(400, 220), wall.material);
  sideWall.rotation.y = -side * Math.PI / 2;
  sideWall.position.set(TABLE.x + side * ROOM_HALF, 60, WALL_Z + 200);
  sideWall.receiveShadow = true;
  scene.add(sideWall);
}
// Painted walls: flat matte Oat (#CDBEA5), no texture. Skirting in Mulberry to match the floor tiles.
const FLOOR_Y = -14.8, DADO_Y = FLOOR_Y + 18, CEIL_Y = FLOOR_Y + 55;   // 2.75 m ceiling (DADO_Y = window-sill height)
const OAT = 0xcdbea5, MULBERRY = 0x664139;
// A real painted wall, not a flat colour: roller stipple (orange-peel emulsion) as relief, broad soft unevenness in
// the plaster and paint, faint roller laps, and ambient shadow where the walls meet the floor, ceiling and corners.
function tileNoise(size, period, rnd) {   // smooth value noise that wraps at the edges (period cells across)
  const grid = Array.from({ length: period * period }, rnd), out = new Float32Array(size * size);
  const at = (x, y) => grid[((y % period + period) % period) * period + ((x % period + period) % period)];
  const sm = (t) => t * t * (3 - 2 * t);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const fx = (x / size) * period, fy = (y / size) * period, ix = Math.floor(fx), iy = Math.floor(fy), tx = sm(fx - ix), ty = sm(fy - iy);
    const a = at(ix, iy) + (at(ix + 1, iy) - at(ix, iy)) * tx, b = at(ix, iy + 1) + (at(ix + 1, iy + 1) - at(ix, iy + 1)) * tx;
    out[y * size + x] = a + (b - a) * ty;
  }
  return out;
}
function paintTextures() {
  let seed = 23; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const mk = (c, srgb, rep) => { const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); t.userData.unit = rep; return t; };
  // colour: broad, gentle tonal drift (≈ ±3%), covering 2.4 m before it repeats
  const CS = 512, col = document.createElement("canvas"); col.width = col.height = CS;
  const cg = col.getContext("2d"), cd = cg.createImageData(CS, CS);
  const n1 = tileNoise(CS, 3, rnd), n2 = tileNoise(CS, 7, rnd), n3 = tileNoise(CS, 17, rnd);
  for (let i = 0; i < CS * CS; i++) {
    const x = i % CS, v = (n1[i] - 0.5) * 0.07 + (n2[i] - 0.5) * 0.04 + (n3[i] - 0.5) * 0.016 + Math.sin((x / CS) * Math.PI * 2 * 9) * 0.004;   // + roller laps
    const k = 244 * (1 + v);
    cd.data[i * 4] = k + 1.5; cd.data[i * 4 + 1] = k; cd.data[i * 4 + 2] = k - 1.5 * (n2[i] - 0.5); cd.data[i * 4 + 3] = 255;
  }
  cg.putImageData(cd, 0, 0);
  for (let i = 0; i < 7; i++) {   // the faint marks a lived-in wall picks up (very soft, low on the wall)
    const x = rnd() * CS, y = CS * (0.62 + rnd() * 0.33), r = 30 + rnd() * 70, sg = cg.createRadialGradient(x, y, 0, x, y, r);
    sg.addColorStop(0, `rgba(90,70,50,${0.035 + rnd() * 0.035})`); sg.addColorStop(1, "rgba(90,70,50,0)"); cg.fillStyle = sg; cg.fillRect(x - r, y - r, r * 2, r * 2);
  }
  // relief: orange-peel stipple from the roller over a slightly wavy plaster, 80 cm per repeat
  const BS = 1024, bmp = document.createElement("canvas"); bmp.width = bmp.height = BS;
  const bg = bmp.getContext("2d"), bd = bg.createImageData(BS, BS);
  const w1 = tileNoise(BS, 5, rnd), w2 = tileNoise(BS, 64, rnd), w3 = tileNoise(BS, 160, rnd);
  for (let i = 0; i < BS * BS; i++) { const v = 128 + (w1[i] - 0.5) * 40 + (w2[i] - 0.5) * 70 + (w3[i] - 0.5) * 60; bd.data[i * 4] = bd.data[i * 4 + 1] = bd.data[i * 4 + 2] = v; bd.data[i * 4 + 3] = 255; }
  bg.putImageData(bd, 0, 0);
  for (let i = 0; i < 2600; i++) {   // the odd larger pit or ridge in the plaster, wrapped so the tile stays seamless
    const x = rnd() * BS, y = rnd() * BS, r = 1.5 + rnd() * 4, light = rnd() > 0.5;
    for (const [dx, dy] of [[0, 0], [-BS, 0], [BS, 0], [0, -BS], [0, BS]]) {
      const gr = bg.createRadialGradient(x + dx, y + dy, 0, x + dx, y + dy, r);
      gr.addColorStop(0, light ? "rgba(255,255,255,.35)" : "rgba(0,0,0,.35)"); gr.addColorStop(1, "rgba(128,128,128,0)");
      bg.fillStyle = gr; bg.beginPath(); bg.arc(x + dx, y + dy, r, 0, 7); bg.fill();
    }
  }
  return { map: mk(col, true, 48), bump: mk(bmp, false, 16) };
}
const PAINT = paintTextures();
const wallPaintFor = (len) => {   // each wall gets its own repeat so the paint scale is the same everywhere
  const map = PAINT.map.clone(), bump = PAINT.bump.clone(), H = CEIL_Y - FLOOR_Y;
  map.repeat.set(len / 48, H / 48); bump.repeat.set(len / 16, H / 16); map.needsUpdate = bump.needsUpdate = true;
  return new THREE.MeshStandardMaterial({ color: WALL_PAINT, map, bumpMap: bump, bumpScale: 0.9, roughness: 0.88 });
};
// soft ambient shadow strips (a gradient from the junction outwards), laid just in front of the paint
const aoTex = (dir) => canvasTex(4, 256, (g, w, h) => { const lg = g.createLinearGradient(0, 0, 0, h); lg.addColorStop(0, "#fff"); lg.addColorStop(0.35, "#777"); lg.addColorStop(1, "#000"); g.fillStyle = lg; g.fillRect(0, 0, w, h); }).tex;
const AO_TEX = aoTex();
function aoStrip(w, h, strength) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: 0x2b1a12, alphaMap: AO_TEX, transparent: true, opacity: strength, depthWrite: false }));
  m.renderOrder = 1; return m;
}
{ // line the grout up with the back wall and centre a tile under the desk
  const r = 600 / (TILE * TILES_PER_TEX), frac = (v) => v - Math.floor(v);
  for (const t of [tileMap, tileBump]) { t.repeat.set(r, r); t.offset.set(frac(-((TABLE.x - TILE / 2 + 300) / 600) * r), frac(-((300 - WALL_Z) / 600) * r)); }
}
const TRIM = mat(0xc2b296, { roughness: 0.8 }), SKIRT = mat(MULBERRY, { roughness: 0.45, clearcoat: 0.3 });
const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(400, 500), mat(0xe3d8c6, { roughness: 0.95 }));
ceiling.rotation.x = Math.PI / 2; ceiling.position.set(TABLE.x, CEIL_Y, WALL_Z + 200); scene.add(ceiling);
function trimWall(len, x, z, rotY, corners = []) {   // local x runs along the wall, local +z points into the room; corners: ends (-1/+1) that meet another wall
  const grp = new THREE.Group(); grp.position.set(x, 0, z); grp.rotation.y = rotY;
  const panels = new THREE.Mesh(new THREE.PlaneGeometry(len, CEIL_Y - FLOOR_Y), wallPaintFor(len));
  panels.position.set(0, (FLOOR_Y + CEIL_Y) / 2, 0.02); panels.receiveShadow = true;
  const H = CEIL_Y - FLOOR_Y;
  const low = aoStrip(len, 11, 0.42); low.position.set(0, FLOOR_Y + 1.4 + 4.5, 0.04); low.rotation.z = Math.PI; grp.add(low);   // above the skirting
  const high = aoStrip(len, 9, 0.38); high.position.set(0, CEIL_Y - 2.6 - 3.5, 0.04); grp.add(high);                        // under the cornice
  for (const end of corners) {   // vertical shadow in each inside corner
    const c = aoStrip(H, 12, 0.34); c.rotation.z = end > 0 ? -Math.PI / 2 : Math.PI / 2; c.position.set(end * (len / 2 - 5), (FLOOR_Y + CEIL_Y) / 2, 0.045); grp.add(c);
  }
  const skirt = rbox(len, 1.4, 0.35, 0.08, SKIRT, 2); skirt.position.set(0, FLOOR_Y + 0.7, 0.18);
  const crown = rbox(len, 2.2, 1.1, 0.25, TRIM, 2); crown.position.set(0, CEIL_Y - 1.1, 0.55);
  const crownLip = rbox(len, 0.5, 1.6, 0.1, TRIM, 1); crownLip.position.set(0, CEIL_Y - 2.4, 0.8);
  grp.add(panels, skirt, crown, crownLip);
  scene.add(grp);
  return grp;
}
trimWall(ROOM_HALF * 2 + 0.4, TABLE.x, WALL_Z, 0, [-1, 1]);
const leftWall = trimWall(400, TABLE.x - ROOM_HALF, WALL_Z + 200, Math.PI / 2, [1]);
const onLeft = (z) => (WALL_Z + 200) - z;     // world z → local x on the left wall
const rightWall = trimWall(400, TABLE.x + ROOM_HALF, WALL_Z + 200, -Math.PI / 2, [-1]);   // window, curtain and the corner things live here
const onRight = (z) => z - (WALL_Z + 200);   // world z → local x on the right wall

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
if (innerWidth > 760) { lampLight.castShadow = true; lampLight.shadow.mapSize.set(1024, 1024); lampLight.shadow.bias = -0.002; lampLight.shadow.radius = 4; }
lamp.add(cage, capTop, cord, bulb, glowSprite, lampLight);
lamp.position.set(0.4, 15.4, -0.8);   // cage centred at about half the poster's height
scene.add(lamp);



/* ───────────────────────── The laptop (MacBook Pro 14", M5, Space Black) ───────────────────────── */
// Built at 13" proportions, then scaled by LAP_SCALE to the real MacBook Pro 14" (M5): 31.26 × 22.12 cm
// (1 unit ≈ 5 cm). Everything else on the desk is sized against it.
const SILVER = mat(0xd6d8db, { metalness: 0.75, roughness: 0.32 });
const KEY_BLACK = mat(0x161618, { roughness: 0.55 });
const LAP_W = 6.0, LAP_D = 4.25, BASE_T = 0.2, LID_T = 0.11, LID_H = 4.15;

const LAP_SCALE = 31.26 / 30;   // → 6.25 × 4.43 units
const laptop = new THREE.Group();
laptop.position.set(-1.0, 0, -0.25);
laptop.rotation.y = -0.08;
laptop.scale.setScalar(LAP_SCALE);
scene.add(laptop);

// Base (bottom case) + rubber feet
const MIDNIGHT = mat(0x2e2d30, { metalness: 0.7, roughness: 0.36 }), MIDNIGHT_DARK = mat(0x252427, { metalness: 0.65, roughness: 0.42 });   // Space Black
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
// MacBook Air 13" display: 2560 × 1664 (≈1.538 : 1), thin even bezels, a slightly deeper chin, notch drawn on the screen
const SCREEN_W = 5.8, SCREEN_H = 3.77;
// one notch definition shared with the Mac desktop (styles.css .notch): fraction of display width / height
const NOTCH = { w: 0.074, h: 0.0395, r: 0.38 };   // r = bottom corner radius as a fraction of the notch height
const SCREEN_PX = 2;   // the laptop screen is laid out at 800×512 and rendered at 2× (1600×1024) so it stays sharp up close
const SCREEN_CW = 800, SCREEN_CH = Math.round(800 * SCREEN_H / SCREEN_W);   // canvas layout size, same aspect as the display
const screenCanvas = canvasTex(SCREEN_CW * SCREEN_PX, SCREEN_CH * SCREEN_PX, () => {});
const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), new THREE.MeshBasicMaterial({ map: screenCanvas.tex, toneMapped: false }));
screen.position.set(0, LID_H - 0.1 - SCREEN_H / 2, LID_T / 2 + 0.012);   // 0.1 top bezel; the rest is the chin
lid.add(screen);
interactive(screen, "Open my portfolio", () => boot("about"));
// Camera notch
// (the camera notch is part of the screen image — drawn in drawScreen, identical to the Mac desktop's notch)

// Screen glow onto the desk
const glow = new THREE.PointLight(0xdcd6ff, 1.2, 9, 2);   // the screen lights the desk (much more noticeable at night)
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
const noteMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 1.45), new THREE.MeshStandardMaterial({ map: note.tex, roughness: 0.8 }));
noteMesh.rotation.set(-Math.PI / 2, 0, 0.12);
noteMesh.position.set(2.05, TOP + 0.006, 1.2);
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

// 2b. Project files — real A4 document folders (31 × 24 cm) in a loose stack at the front-right of the desk.
// Each has a coloured index tab sticking out of the front edge at a different place, with the project's name on it,
// so every project can be read and clicked; the top folder also carries a cover label.
const FOLDER = { w: 6.2, d: 4.7, t: 0.06 };
const folderColors = [0x9fb3a0, 0xd8c3a0, 0x8e9db3, 0xc9a28c, 0xb7b0c9];   // sage, kraft, slate, clay, lilac card
const tabColors = ["#ffb21a", "#5ac8fa", "#ff6b5a", "#a3d977", "#c9a7ff"];
const projectFiles = new THREE.Group();
const NF = S.projects.length;
S.projects.forEach((p, i) => {
  const f = new THREE.Group(), c = folderColors[i % folderColors.length], card = mat(c, { roughness: 0.82 });
  const back = rbox(FOLDER.w, 0.035, FOLDER.d, 0.06, card, 2);
  const papers = rbox(FOLDER.w - 0.25, 0.05, FOLDER.d - 0.3, 0.02, mat(0xf7f3ea, { roughness: 0.95 }), 1);
  papers.position.set(0.12, 0.045, -0.05); papers.rotation.y = 0.02;
  const front = rbox(FOLDER.w, 0.035, FOLDER.d - 0.15, 0.06, card, 2);
  front.position.set(0, 0.09, 0.07);
  // index tab on the front edge
  const tabX = -FOLDER.w / 2 + 1.1 + i * ((FOLDER.w - 2.2) / Math.max(1, NF - 1));
  const tabTex = canvasTex(512, 160, (g, w, h) => {
    g.fillStyle = tabColors[i % tabColors.length]; g.beginPath(); g.roundRect(0, 0, w, h, 26); g.fill();
    g.fillStyle = "#1b1a17"; g.font = `700 64px ${UI}`; g.textBaseline = "middle"; g.textAlign = "center";
    g.fillText(p.title.length > 14 ? p.title.slice(0, 13) + "…" : p.title, w / 2, h / 2 + 4);
  });
  const tab = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 0.6), new THREE.MeshStandardMaterial({ map: tabTex.tex, roughness: 0.7 }));
  tab.rotation.x = -Math.PI / 2; tab.position.set(tabX, 0.11, FOLDER.d / 2 + 0.22);
  // cover label (shows on the top folder)
  const label = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = "#fbf8f2"; g.fillRect(40, 60, 760, 330);
    g.fillStyle = "#1b1a17"; g.font = `800 104px ${UI}`; g.textBaseline = "top"; g.fillText("My Projects", 80, 110);
    g.font = `500 44px ${UI}`; g.fillStyle = "#6b665d"; g.fillText(S.projects.map((x) => x.title).join(" · ").slice(0, 34), 80, 250);
  });
  const lab = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 1.7), new THREE.MeshStandardMaterial({ map: label.tex, transparent: true, roughness: 0.9 }));
  lab.rotation.x = -Math.PI / 2; lab.position.set(-0.9, 0.111, -0.4);
  f.add(back, papers, front, tab, lab);
  f.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
  const layer = NF - 1 - i;   // first project on top
  f.position.set(4.6 + Math.sin(i * 2.1) * 0.25, layer * 0.13, 4.55 - layer * 0.05);
  f.rotation.y = -0.1 + Math.sin(i * 1.7) * 0.06;
  projectFiles.add(f);
  interactive(f, `My Projects · ${p.title}`, () => { Sound.click(); boot(p.case ? "case:" + p.case.slug : "work"); });
});
projectFiles.scale.setScalar(0.576);   // ≈18 × 13.5 cm "My Projects" folders
projectFiles.position.set(2.2, 0.02, 2.0);
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
phone.position.set(-4.3, 0.06, 4.5);
phone.rotation.y = -0.5;
scene.add(phone);
interactive(phone, "New message — say hello", () => { Sound.click(); boot("contact"); });

// 2d. Things from Sijo's real desk: plant in a mango-yellow pot, green water bottle
const plant = new THREE.Group();
const pot2 = mesh(new THREE.CylinderGeometry(0.95, 0.75, 2.0, 32), mat(0xffb21a, { roughness: 0.45, clearcoat: 0.4 }));   // mango yellow, ≈11 cm
pot2.position.y = 1.0;
const soil2 = mesh(new THREE.CylinderGeometry(0.89, 0.89, 0.05, 24), mat(0x3b2a20, { roughness: 1 }));
soil2.position.y = 1.9;
plant.add(pot2, soil2);
const leafGeo = (() => {   // pointed oval leaf with a curved midrib and a slight V fold, ≈1 unit long
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.34, 0.12, 0.36, 0.72, 0, 1); sh.bezierCurveTo(-0.36, 0.72, -0.34, 0.12, 0, 0);
  const g = new THREE.ShapeGeometry(sh, 14), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x, y, Math.abs(x) * 0.28 - 0.18 * y * y); }
  g.computeVertexNormals(); return g;
})();
const leafMat = new THREE.MeshPhysicalMaterial({ color: 0x2f6b34, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.3, side: THREE.DoubleSide }), stemMat = mat(0x5b6b3a, { roughness: 0.7 });
const leafNew = new THREE.MeshPhysicalMaterial({ color: 0x5a9a48, roughness: 0.4, clearcoat: 0.4, side: THREE.DoubleSide });
for (let k = 0; k < 3; k++) {   // three stems, leaves alternating up each stem, newest (lighter, smaller) at the top
  const stemH = 2.6 + k * 0.7, lean = 0.12 + k * 0.05, a0 = [0.5, 1.6, 2.7][k];   // all lean towards the room
  const stem = mesh(new THREE.CylinderGeometry(0.045, 0.06, stemH, 6), stemMat);
  stem.position.set(Math.cos(a0) * 0.25, 1.9 + stemH / 2, Math.sin(a0) * 0.25); stem.rotation.set(Math.sin(a0) * lean, 0, -Math.cos(a0) * lean);
  plant.add(stem);
  const n = 4 + k;
  for (let i = 0; i < n; i++) {
    const t = (i + 1) / (n + 0.5), a = Math.PI / 2 - a0 + Math.PI + (i % 2 ? 0.9 : -0.9) + Math.sin(i * 2.3) * 0.35, top = i === n - 1;
    const leaf = mesh(leafGeo, top ? leafNew : leafMat);
    const sc = (top ? 0.8 : 1.15 + 0.35 * Math.sin(i * 1.7)) * (1.1 - t * 0.25);
    leaf.scale.set(sc * 1.25, sc * 1.6, sc);
    leaf.position.set(Math.cos(a0) * (0.25 + lean * stemH * t) , 1.9 + stemH * t, Math.sin(a0) * (0.25 + lean * stemH * t));
    leaf.rotation.set(-(top ? 0.35 : 0.9 + 0.25 * Math.sin(i)), a, 0, "YXZ");
    plant.add(leaf);
  }
}
plant.position.set(-4.95, 0, -1.95); plant.scale.setScalar(0.9);
scene.add(plant);
interactive(plant, "My desk plant 🌱", () => { Sound.click(); wiggle(plant); });

const bottle = new THREE.Group();
// plain transparency instead of `transmission`: transmission re-renders the whole scene every frame, which made laptops crawl
const bottleMat = new THREE.MeshPhysicalMaterial({ color: 0x3e9a62, roughness: 0.15, clearcoat: 1, clearcoatRoughness: 0.1, transparent: true, opacity: 0.72, depthWrite: false });
const bBody = mesh(new THREE.CylinderGeometry(0.52, 0.52, 4.0, 32), bottleMat);   // ≈10.4 cm × 26 cm with the cap (1 L)
bBody.position.y = 2.0;
for (let i = 0; i < 8; i++) { const ring = mesh(new THREE.TorusGeometry(0.53, 0.028, 6, 32), bottleMat); ring.rotation.x = Math.PI / 2; ring.position.y = 0.35 + i * 0.2; bottle.add(ring); }
const bShoulder = mesh(new THREE.CylinderGeometry(0.34, 0.52, 0.45, 32), bottleMat);
bShoulder.position.y = 4.2;
const bCap = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.55, 24), mat(0x2f7a4c, { roughness: 0.4 }));
bCap.position.y = 4.67;
const bLoop = mesh(new THREE.TorusGeometry(0.2, 0.05, 6, 16), mat(0x2f7a4c, { roughness: 0.4 })); bLoop.position.set(0, 5.0, 0); bottle.add(bLoop);
bottle.add(bBody, bShoulder, bCap);
bottle.position.set(-8.6, 0, -0.35);
scene.add(bottle);



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
  g.fillStyle = "#1d1d1f"; g.font = `700 40px ${UI}`; g.font = `700 36px ${UI}`; g.fillText("Personal explorations", 40, h * 0.86); g.font = `400 24px ${UI}`; g.fillText("sketches · side projects · ideas", 40, h * 0.95);
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
books.scale.setScalar(1.3);
books.position.set(-6.9, 0.01, 2.1);
books.rotation.y = 0.25;
scene.add(books);
interactive(books, "Personal explorations", () => { Sound.click(); boot("about"); });

// 5. Pencil cup — behind the computer, left
const cup = new THREE.Group();
const cupBody = mesh(new THREE.CylinderGeometry(0.42, 0.38, 2.0, 28, 1, true), mat(0x161618, { roughness: 0.35, clearcoat: 0.6, side: THREE.DoubleSide }));   // ≈8 × 10 cm
cupBody.position.y = 1.0;
const cupBottom = mesh(new THREE.CircleGeometry(0.38, 24), mat(0x161618, { roughness: 0.4 }));
cupBottom.rotation.x = -Math.PI / 2; cupBottom.position.y = 0.02;
cup.add(cupBody, cupBottom);
[[0xfbfbfd, 0.13, -0.12, 0.08, 0.08, 3.5], [0xd6d8db, -0.15, 0.1, -0.06, -0.09, 3.5], [0x0a84ff, 0.03, 0.0, -0.1, -0.03, 3.3], [0xffd60a, -0.06, -0.08, -0.12, 0.12, 3.5], [0x1c1c1e, 0.2, 0.14, 0.1, 0.02, 2.9]].forEach(([c, tilt, px, pz, lean, len]) => {
  const p = new THREE.Group();
  const stick = mesh(new THREE.CylinderGeometry(0.04, 0.04, len, 6), mat(c));   // pencils and pens, ≈17 cm
  stick.position.y = len / 2;
  const tip = mesh(new THREE.ConeGeometry(0.04, 0.3, 6), mat(0xf1d3a8));
  tip.position.y = len + 0.15;
  p.add(stick, tip);
  p.position.set(px, 0.08, pz);          // bases stay well inside the cup
  p.rotation.z = tilt; p.rotation.x = lean;
  cup.add(p);
});
cup.position.set(-8.4, 0, 5.2);
scene.add(cup);

// 6. Soundbar behind Shea (Sijo's black bar speaker, ≈40 × 7 × 7 cm): mesh front, four buttons on top, curved feet.
//    Click it to turn the music on or off.
const speaker = new THREE.Group();
const spkBlack = mat(0x1a1a1b, { roughness: 0.55 });
const spkBody = rbox(6.8, 1.25, 1.35, 0.32, spkBlack, 4); spkBody.position.y = 0.95; speaker.add(spkBody);
const grilleTex = canvasTex(1024, 160, (g, w, h) => {
  g.fillStyle = "#151516"; g.fillRect(0, 0, w, h);
  for (let y = 4; y < h; y += 7) for (let x = (y / 7) % 2 ? 4 : 7.5; x < w; x += 7) { g.fillStyle = "#050505"; g.beginPath(); g.arc(x, y, 2.1, 0, 7); g.fill(); }
  g.fillStyle = "rgba(255,255,255,.05)"; g.fillRect(0, 0, w, 18);
});
const grille = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.0), new THREE.MeshStandardMaterial({ map: grilleTex.tex, roughness: 0.75 }));
grille.position.set(0, 0.95, 0.68); speaker.add(grille);
const badge = rbox(0.5, 0.12, 0.01, 0.02, mat(0x9a9a9e, { metalness: 0.8, roughness: 0.3 }), 1); badge.position.set(0, 0.97, 0.69); speaker.add(badge);   // (a plain badge, no brand)
for (let k = 0; k < 4; k++) { const b = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.04, 16), mat(0x2a2a2c, { roughness: 0.4 })); b.position.set(-0.6 + k * 0.4, 1.58, 0); speaker.add(b); }
for (const sx of [-1, 1]) { const foot = rbox(1.3, 0.32, 1.1, 0.15, spkBlack, 2); foot.position.set(sx * 2.6, 0.16, 0); speaker.add(foot); }
speaker.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
speaker.position.set(6.15, 0, -2.75); speaker.rotation.y = 0;
scene.add(speaker);
interactive(speaker, "Music on / off ♪", () => { if (!Sound.toggle()) setTimeout(() => Sound.click(), 60); });

// 7. Astronaut galaxy projector by the water bottle (≈26 cm tall on its moon-rock base). At night it throws a
//    nebula and stars onto the ceiling and the back wall; click it to switch the projection on or off.
const astro = new THREE.Group();
const suit = mat(0xf2efe6, { roughness: 0.42, clearcoat: 0.3 }), suitShade = mat(0xe3ddd0, { roughness: 0.5 }), patch = mat(0xd9814a, { roughness: 0.5 });
const moonGeo = new THREE.CylinderGeometry(1.15, 1.3, 0.55, 28, 2);
{ const p = moonGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x); const k = 1 + 0.07 * Math.sin(a * 5) + 0.04 * Math.sin(a * 11); p.setX(i, x * k); p.setZ(i, z * k); } moonGeo.computeVertexNormals(); }
const moon = mesh(moonGeo, mat(0x8f8f8c, { roughness: 0.95 })); moon.position.y = 0.27; astro.add(moon);
for (let k = 0; k < 6; k++) { const cr = mesh(new THREE.TorusGeometry(0.12 + (k % 3) * 0.05, 0.03, 6, 14), mat(0x7a7a77, { roughness: 1 })); cr.rotation.x = Math.PI / 2; cr.position.set(Math.cos(k * 1.9) * 0.75, 0.56, Math.sin(k * 1.9) * 0.6); astro.add(cr); }
for (const sx of [-1, 1]) {
  const leg = rbox(0.42, 1.1, 0.48, 0.18, suit, 3); leg.position.set(sx * 0.26, 1.15, 0); astro.add(leg);
  const boot = rbox(0.48, 0.32, 0.62, 0.14, suit, 3); boot.position.set(sx * 0.27, 0.72, 0.06); astro.add(boot);
  const knee = rbox(0.3, 0.22, 0.05, 0.05, patch, 2); knee.position.set(sx * 0.26, 1.2, 0.25); astro.add(knee);
  const arm = rbox(0.34, 1.0, 0.38, 0.16, suit, 3); arm.position.set(sx * 0.72, 2.15, 0.02); arm.rotation.z = sx * 0.12; astro.add(arm);
  const glove = mesh(new THREE.SphereGeometry(0.2, 14, 10), suit); glove.position.set(sx * 0.8, 1.6, 0.04); astro.add(glove);
  const sh = rbox(0.18, 0.22, 0.05, 0.04, patch, 2); sh.position.set(sx * 0.78, 2.45, 0.2); astro.add(sh);
}
const torso = rbox(1.15, 1.25, 0.8, 0.3, suit, 4); torso.position.y = 2.25; astro.add(torso);
const chest = rbox(0.6, 0.45, 0.06, 0.06, suitShade, 2); chest.position.set(0, 2.35, 0.42); astro.add(chest);
const pack = rbox(0.95, 1.0, 0.45, 0.12, suit, 3); pack.position.set(0, 2.3, -0.58); astro.add(pack);
const astroHead = new THREE.Group(); astroHead.position.set(0, 2.85, 0); astro.add(astroHead);   // pivot at the neck
const helmet = mesh(new THREE.SphereGeometry(1.08, 40, 28), suit); helmet.position.y = 0.9; helmet.scale.set(1, 0.95, 0.98); astroHead.add(helmet);
const visor = mesh(new THREE.SphereGeometry(1, 40, 28), new THREE.MeshPhysicalMaterial({ color: 0x08080b, roughness: 0.05, clearcoat: 1, clearcoatRoughness: 0.05, metalness: 0.25 }));
visor.scale.set(0.8, 0.68, 0.5); visor.position.set(0, 0.88, 0.62); astroHead.add(visor);   // a full oval face-plate, bulging out of the helmet
const rimV = mesh(new THREE.TorusGeometry(1, 0.05, 8, 48), suitShade); rimV.scale.set(0.8, 0.68, 1); rimV.position.set(0, 0.88, 0.66); astroHead.add(rimV);
const lens = mesh(new THREE.CircleGeometry(0.17, 24), new THREE.MeshBasicMaterial({ color: 0x9ec9ff })); lens.position.set(0.1, 0.84, 1.13); astroHead.add(lens);
for (const sx of [-1, 1]) { const ear = rbox(0.45, 0.62, 0.62, 0.1, suit, 2); ear.position.set(sx * 1.05, 1.3, -0.05); ear.rotation.z = sx * 0.25; astroHead.add(ear);
  const vent = rbox(0.05, 0.3, 0.35, 0.02, suitShade, 1); vent.position.set(sx * 1.29, 1.25, -0.05); astroHead.add(vent); }
const cablePts = [new THREE.Vector3(0, 2.4, -0.82), new THREE.Vector3(0.1, 1.6, -1.3), new THREE.Vector3(0.6, 0.08, -1.7), new THREE.Vector3(2.4, 0.06, -1.9), new THREE.Vector3(3.6, 0.06, -1.2)];
const cable = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cablePts), 40, 0.06, 6), mat(0xeeeae4, { roughness: 0.8 })); astro.add(cable);
astro.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
astro.position.set(-7.4, 0, -2.2); astro.rotation.y = 0.3;
scene.add(astro);
// the projection: soft nebula clouds + stars, cast onto the ceiling and the upper back wall
const nebulaTex = canvasTex(1024, 1024, (g, w, h) => {
  g.fillStyle = "#000"; g.fillRect(0, 0, w, h);
  let sd = 5; const r = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  for (const [col, n] of [["40,80,255", 26], ["170,60,255", 22], ["20,200,190", 14], ["255,60,150", 10]]) for (let i = 0; i < n; i++) {
    const x = w * (0.15 + r() * 0.7), y = h * (0.15 + r() * 0.7), rad = 60 + r() * 180, rg = g.createRadialGradient(x, y, 0, x, y, rad);
    rg.addColorStop(0, `rgba(${col},${0.12 + r() * 0.12})`); rg.addColorStop(1, `rgba(${col},0)`); g.fillStyle = rg; g.fillRect(0, 0, w, h); }
  for (let i = 0; i < 900; i++) { const x = r() * w, y = r() * h, d = Math.hypot(x - w / 2, y - h / 2) / (w / 2); if (d > 0.95) continue; g.fillStyle = `rgba(255,255,255,${(0.4 + r() * 0.6) * (1 - d * 0.7)})`; g.fillRect(x, y, r() > 0.92 ? 3 : 1.6, r() > 0.92 ? 3 : 1.6); }
  const v = g.createRadialGradient(w / 2, h / 2, w * 0.25, w / 2, h / 2, w / 2); v.addColorStop(0, "rgba(0,0,0,0)"); v.addColorStop(1, "rgba(0,0,0,1)"); g.fillStyle = v; g.fillRect(0, 0, w, h);
}).tex;
const projMat = new THREE.MeshBasicMaterial({ map: nebulaTex, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
const projCeil = new THREE.Mesh(new THREE.PlaneGeometry(52, 52), projMat); projCeil.rotation.x = Math.PI / 2; projCeil.position.set(-4, CEIL_Y - 0.06, 8); projCeil.renderOrder = 3; scene.add(projCeil);
const projWall = new THREE.Mesh(new THREE.PlaneGeometry(ROOM_HALF * 2, 30), projMat); projWall.position.set(TABLE.x, CEIL_Y - 13, WALL_Z + 0.08); projWall.renderOrder = 3; scene.add(projWall);
projWall.material = projMat.clone(); projWall.material.map = nebulaTex.clone(); projWall.material.map.needsUpdate = true; projWall.material.map.repeat.set(1.6, 0.9); projWall.material.map.offset.set(-0.3, 0.05);
let astroOn = true, astroTilt = 0;
function stepAstro(dt) {   // while it projects, the head tips back to aim at the ceiling (like the real one)
  const want = astroOn && dayMix > 0.5 ? -0.62 : 0;
  astroTilt += (want - astroTilt) * Math.min(1, dt * 2.5); astroHead.rotation.x = astroTilt;
}
interactive(astro, "Galaxy light ✦", () => { Sound.click(); astroOn = !astroOn; applyDay(dayMix); });

/* ───────────────────────── Window corner on the right wall (from Sijo's photo) ─────────────────────────
   A window with the curtain drawn half open (sun by day, moon by night — click it), plants in the back-right corner;
   the keyboard leans on the opposite (left) wall. */
const WIN_Z0 = 9, WIN_Z1 = 31, ROD_Y = CEIL_Y - 5, ROD_OUT = 4.6;   // window span (world z), rod height, rod distance from the wall
const corner = new THREE.Group(); rightWall.add(corner);
// window frame + daylight glass behind the curtain
const winW = WIN_Z1 - WIN_Z0, winC = onRight((WIN_Z0 + WIN_Z1) / 2);
const WIN_Y0 = DADO_Y + 1, WIN_Y1 = ROD_Y - 1.5, winH = WIN_Y1 - WIN_Y0, winY = (WIN_Y0 + WIN_Y1) / 2;
const frameMat = mat(0xe9e3d6, { roughness: 0.6 });
for (const [w, h, x, y] of [[winW + 1.2, 0.7, winC, WIN_Y1], [winW + 1.2, 0.9, winC, WIN_Y0], [0.7, winH, winC - winW / 2, winY], [0.7, winH, winC + winW / 2, winY],
  [0.35, winH, winC, winY], [winW, 0.35, winC, WIN_Y0 + winH * 0.62]]) { const b = rbox(w, h, 0.6, 0.06, frameMat, 1); b.position.set(x, y, 0.3); corner.add(b); }   // frame + mullions
// the view outside: the NID Bengaluru campus gate across the road (from Sijo's photos): granite-block gate walls with
// capped tops, the white sign board, the steel sliding gate, a tree-lined driveway with potted plants, and the white
// campus building (round balconies, railings) glowing behind the trees. Night is the default; morning on a click.
const skyTex = (night) => canvasTex(1024, 1384, (g, w, h) => {
  let sd = 42; const R = () => ((sd = (sd * 16807) % 2147483647) / 2147483647);
  const HZ = h * 0.46, ROAD = h * 0.8, BASE = h * 0.74;   // tree-line, front of the road, foot of the gate walls
  // sky (mostly hidden by the canopy)
  const sky = g.createLinearGradient(0, 0, 0, HZ);
  if (night) { sky.addColorStop(0, "#070b1a"); sky.addColorStop(1, "#1d2741"); } else { sky.addColorStop(0, "#9fc1df"); sky.addColorStop(1, "#d9e2dc"); }
  g.fillStyle = sky; g.fillRect(0, 0, w, h);
  if (night) { for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(255,255,255,${0.2 + R() * 0.5})`; g.fillRect(R() * w, R() * HZ * 0.5, 2, 2); } }
  // the white campus building far back, seen between the trees: round balcony, stacked railings, a stair
  const white = night ? "#4a4f5c" : "#d9d6cf", whiteShade = night ? "#343843" : "#b6b3ab";
  g.fillStyle = white; g.fillRect(560, HZ - 150, 360, 210);
  g.fillStyle = whiteShade; for (let x = 570; x < 920; x += 60) g.fillRect(x, HZ - 150, 14, 210);   // columns
  g.strokeStyle = night ? "#6d7380" : "#a9a7a0"; g.lineWidth = 2;
  for (const y of [HZ - 100, HZ - 40]) { g.beginPath(); g.moveTo(560, y); g.lineTo(920, y); g.stroke(); for (let x = 560; x < 920; x += 10) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 18); g.stroke(); } }
  g.fillStyle = white; g.beginPath(); g.ellipse(600, HZ - 60, 110, 38, 0, 0, Math.PI); g.fill();   // the round balcony
  g.fillStyle = night ? "#c58a3a" : "#e9a64a"; g.fillRect(800, HZ - 175, 120, 22);   // the orange canopy
  if (night) for (let k = 0; k < 14; k++) { const x = 570 + R() * 340, y = HZ - 140 + R() * 170; const lg = g.createRadialGradient(x, y, 0, x, y, 26); lg.addColorStop(0, "rgba(255,214,150,.9)"); lg.addColorStop(1, "rgba(255,214,150,0)"); g.fillStyle = lg; g.fillRect(x - 26, y - 26, 52, 52); }
  // tree canopy over everything (rain trees and gulmohars), with hanging leaves
  const leaf = (x, y, r, c) => { g.fillStyle = c; g.beginPath(); g.ellipse(x, y, r, r * 0.7, R() * 3, 0, 7); g.fill(); };
  const dk = night ? ["#07100a", "#0b170e", "#112014"] : ["#2d4a27", "#3f6533", "#5f8a45"];
  for (let i = 0; i < 1500; i++) { const x = R() * w, y = R() * (HZ + 60) * (0.4 + 0.6 * Math.abs(x / w - 0.62) * 1.6); if (x > 580 && x < 900 && y > HZ - 170) continue; leaf(x, y, 8 + R() * 22, dk[(R() * 3) | 0]); }
  if (!night) for (let i = 0; i < 260; i++) leaf(R() * w, R() * HZ * 0.7, 6 + R() * 10, "rgba(200,230,150,.5)");   // sun through the leaves
  for (const [x, wd] of [[200, 26], [380, 18], [940, 26]]) { g.fillStyle = night ? "#0d0a08" : "#4b3a2c"; g.fillRect(x - wd / 2, HZ - 120, wd, BASE - HZ + 120); g.lineWidth = wd * 0.4; g.strokeStyle = g.fillStyle; g.beginPath(); g.moveTo(x, HZ - 60); g.lineTo(x + (x > 500 ? 70 : -70), HZ - 220); g.stroke(); }
  // driveway receding through the gate, lined with potted plants
  const vx = 740, vy = HZ + 30;   // vanishing point
  g.fillStyle = night ? "#2a2a2c" : "#a9a395"; g.beginPath(); g.moveTo(vx - 30, vy); g.lineTo(vx + 30, vy); g.lineTo(880, BASE); g.lineTo(600, BASE); g.fill();
  for (let k = 0; k < 16; k++) { const t = k / 16, s = 0.2 + t * 1.1;
    for (const side of [-1, 1]) { const x = vx + side * (40 + t * 120), y = vy + t * (BASE - vy - 20);
      g.fillStyle = night ? "#3a2a22" : "#a35b3a"; g.fillRect(x - 9 * s, y - 14 * s, 18 * s, 14 * s);
      g.fillStyle = night ? "#0f1d12" : "#4e7d3c"; g.beginPath(); g.ellipse(x, y - 22 * s, 16 * s, 13 * s, 0, 0, 7); g.fill(); } }
  if (night) { const pg = g.createRadialGradient(vx, vy + 60, 0, vx, vy + 60, 230); pg.addColorStop(0, "rgba(255,200,130,.35)"); pg.addColorStop(1, "rgba(255,200,130,0)"); g.fillStyle = pg; g.fillRect(0, 0, w, h); }   // lamps along the drive
  // granite-block gate walls with concrete caps (left, with the sign; right)
  const wall = (x0, x1, top) => {
    g.fillStyle = night ? "#3b3732" : "#8f8778"; g.fillRect(x0, top, x1 - x0, BASE - top);
    for (let y = top + 10; y < BASE; y += 28) for (let x = x0 + ((y / 28) % 2 ? 0 : 22); x < x1; x += 44) {   // irregular stone blocks
      const c = night ? 50 + R() * 16 : 120 + R() * 30; g.fillStyle = `rgb(${c + 6},${c + 2},${c - 6})`; g.fillRect(x + 2, y + 2, 40, 24);
      g.fillStyle = `rgba(0,0,0,${night ? 0.35 : 0.25})`; g.fillRect(x + 2, y + 24, 40, 2); }
    g.fillStyle = night ? "#55524c" : "#d8d4ca"; g.fillRect(x0 - 8, top - 16, x1 - x0 + 16, 18);   // cap
  };
  wall(0, 600, HZ + 10); wall(880, 1024, HZ + 10);
  g.fillStyle = night ? "#4a4741" : "#e3e0d8"; g.fillRect(150, HZ - 70, 450, 80);   // the overhang above the sign
  // sign board: white panel with a simple mark, the name in Hindi, English and Kannada
  const sx = 330, sy = HZ + 70, sw = 230, sh = 250;
  if (night) { const lg = g.createRadialGradient(sx + sw / 2, sy - 10, 0, sx + sw / 2, sy + 80, 260); lg.addColorStop(0, "rgba(255,240,215,.75)"); lg.addColorStop(1, "rgba(255,240,215,0)"); g.fillStyle = lg; g.fillRect(sx - 120, sy - 120, sw + 240, sh + 260); }
  g.fillStyle = night ? "#d9d6cf" : "#f4f3ef"; g.fillRect(sx, sy, sw, sh);
  g.fillStyle = "#8a8a8a"; g.beginPath(); g.arc(sx + sw / 2 - 18, sy + 40, 12, 0, 7); g.fill();
  g.beginPath(); g.moveTo(sx + sw / 2 - 60, sy + 58); g.lineTo(sx + sw / 2 - 4, sy + 58); g.lineTo(sx + sw / 2 - 4, sy + 116); g.closePath(); g.fill();
  g.beginPath(); g.arc(sx + sw / 2 + 22, sy + 87, 29, -Math.PI / 2, Math.PI / 2); g.lineTo(sx + sw / 2 + 8, sy + 116); g.lineTo(sx + sw / 2 + 8, sy + 58); g.fill();
  g.fillStyle = "#3a3a3a"; g.textAlign = "center"; g.textBaseline = "middle";
  g.font = `600 20px ${UI}`; g.fillText("राष्ट्रीय डिज़ाइन संस्थान", sx + sw / 2, sy + 160);
  g.font = `800 17px ${UI}`; g.fillText("NATIONAL INSTITUTE OF DESIGN", sx + sw / 2, sy + 186);
  g.fillStyle = night ? "#c9c6bf" : "#e6e5e1"; g.fillRect(sx + 25, sy + 198, sw - 50, 26); g.fillStyle = "#3a3a3a"; g.font = `500 20px ${UI}`; g.fillText("Bengaluru Campus", sx + sw / 2, sy + 211);
  g.font = `600 18px ${UI}`; g.fillText("ರಾಷ್ಟ್ರೀಯ ವಿನ್ಯಾಸ ಸಂಸ್ಥೆ", sx + sw / 2, sy + 238);
  // steel sliding gate, half open
  g.strokeStyle = night ? "#6b6b70" : "#a3a6aa"; g.lineWidth = 6;
  g.strokeRect(600, HZ + 120, 70, BASE - HZ - 130); for (let y = HZ + 150; y < BASE - 10; y += 30) { g.beginPath(); g.moveTo(600, y); g.lineTo(670, y); g.stroke(); }
  g.fillStyle = night ? "#55565b" : "#b9bcc0"; g.beginPath(); g.moveTo(600, HZ + 120); g.lineTo(670, HZ + 120); g.lineTo(670, HZ + 200); g.closePath(); g.fill();
  // footpath + bollards, then the road under our window
  g.fillStyle = night ? "#34342f" : "#9e998d"; g.fillRect(0, BASE, w, ROAD - BASE);
  for (const x of [300, 560]) { g.fillStyle = night ? "#121212" : "#2b2b2b"; g.fillRect(x, BASE - 50, 16, 56); }
  g.fillStyle = night ? "#17181b" : "#5a5a58"; g.fillRect(0, ROAD, w, h - ROAD);
  g.fillStyle = night ? "#3e3e40" : "#e8e8e2"; for (let x = 30; x < w; x += 150) g.fillRect(x, ROAD + 120, 80, 8);
  // street lamp on our side, throwing an orange pool at night
  g.fillStyle = night ? "#1d1d20" : "#3b3d42"; g.fillRect(250, HZ - 80, 10, ROAD - HZ + 120); g.fillRect(250, HZ - 80, 70, 8);
  if (night) { const lg = g.createRadialGradient(315, HZ - 70, 0, 315, HZ - 70, 120); lg.addColorStop(0, "rgba(255,180,100,.95)"); lg.addColorStop(1, "rgba(255,180,100,0)"); g.fillStyle = lg; g.fillRect(190, HZ - 190, 250, 250);
    const pool = g.createRadialGradient(330, ROAD + 60, 0, 330, ROAD + 60, 260); pool.addColorStop(0, "rgba(255,170,90,.35)"); pool.addColorStop(1, "rgba(255,170,90,0)"); g.fillStyle = pool; g.fillRect(0, ROAD - 150, 700, 420); }
  // glass: slight softness + reflection
  { const c2 = document.createElement("canvas"); c2.width = w; c2.height = h; const g2 = c2.getContext("2d"); g2.filter = "blur(1.2px)"; g2.drawImage(g.canvas, 0, 0); g.globalAlpha = 0.65; g.drawImage(c2, 0, 0); g.globalAlpha = 1; }
  { const refl = g.createLinearGradient(0, 0, w, h); refl.addColorStop(0, "rgba(255,255,255,.06)"); refl.addColorStop(0.45, "rgba(255,255,255,0)"); refl.addColorStop(0.55, "rgba(255,255,255,.04)"); refl.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = refl; g.fillRect(0, 0, w, h); }
}).tex;
const glassGeo = new THREE.PlaneGeometry(winW - 0.6, winH - 0.6);
const glassDay = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({ map: skyTex(false), toneMapped: false }));
const glassNight = new THREE.Mesh(glassGeo, new THREE.MeshBasicMaterial({ map: skyTex(true), transparent: true, opacity: 0, toneMapped: false }));
glassDay.position.set(winC, winY, 0.2); glassNight.position.set(winC, winY, 0.22);
corner.add(glassDay, glassNight);
// curtain: cream linen with maroon ogee medallions and roses, gathered in grommet pleats
const curtainTex = canvasTex(512, 832, (g, w, h) => {
  g.fillStyle = "#ebe2cf"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 7000; i++) { g.fillStyle = `rgba(150,120,80,${Math.random() * 0.06})`; g.fillRect(Math.random() * w, Math.random() * h, 1.5, 3); }   // linen weave
  const medallion = (cx, cy, mw, mh) => {
    const top = cy - mh / 2, bot = cy + mh / 2;
    const shape = (k) => { g.beginPath(); g.moveTo(cx, top + mh * (1 - k) / 2);
      for (const sx of [1, -1]) { g.bezierCurveTo(cx + sx * mw * 0.06 * k, top + mh * 0.16, cx + sx * mw * 0.5 * k, cy - mh * 0.28 * k, cx + sx * mw * 0.5 * k, cy);
        g.bezierCurveTo(cx + sx * mw * 0.5 * k, cy + mh * 0.3 * k, cx + sx * mw * 0.1 * k, bot - mh * 0.12, cx, bot - mh * (1 - k) / 2);
        if (sx === 1) g.moveTo(cx, top + mh * (1 - k) / 2); } };
    g.fillStyle = "#7a1c22"; shape(1); g.fill();
    g.strokeStyle = "#d9b77a"; g.lineWidth = 3; g.setLineDash([3, 6]); shape(0.88); g.stroke(); g.setLineDash([]);
    // one big rose with leaves and a bud, like the print in the photo
    const leaf = (x, y, rot, len) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = "#8a6239"; g.beginPath(); g.moveTo(0, 0);
      g.quadraticCurveTo(len * 0.5, -len * 0.32, len, 0); g.quadraticCurveTo(len * 0.5, len * 0.32, 0, 0); g.fill();
      g.strokeStyle = "#5e3f22"; g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, 0); g.lineTo(len * 0.9, 0); g.stroke(); g.restore(); };
    const R = mw * 0.17, rx = cx, ry = cy - mh * 0.05;
    leaf(rx - R * 0.6, ry + R * 0.9, Math.PI * 0.82, R * 1.5); leaf(rx + R * 0.6, ry + R * 0.9, Math.PI * 0.18, R * 1.5);
    leaf(rx - R * 0.8, ry - R * 0.2, Math.PI * 1.05, R * 1.2); leaf(rx + R * 0.8, ry - R * 0.2, -Math.PI * 0.05, R * 1.2);
    g.strokeStyle = "#7a5634"; g.lineWidth = 2; g.beginPath(); g.moveTo(rx, ry + R); g.quadraticCurveTo(rx + R * 0.2, ry + R * 2, rx, ry + R * 2.6); g.stroke();
    g.fillStyle = "#efe6d2"; g.beginPath(); g.ellipse(rx, ry + R * 2.7, R * 0.32, R * 0.42, 0, 0, 7); g.fill();   // bud
    for (let k = 0; k < 7; k++) { const a = k / 7 * Math.PI * 2; g.fillStyle = k % 2 ? "#f3ebd9" : "#e6d9bd";
      g.beginPath(); g.ellipse(rx + Math.cos(a) * R * 0.45, ry + Math.sin(a) * R * 0.45, R * 0.55, R * 0.4, a, 0, 7); g.fill(); }
    g.fillStyle = "#f6efe0"; g.beginPath(); g.arc(rx, ry, R * 0.55, 0, 7); g.fill();
    g.strokeStyle = "#b89d74"; g.lineWidth = 1.6;
    for (let k = 1; k <= 4; k++) { g.beginPath(); g.arc(rx, ry, R * 0.13 * k, k * 1.3, k * 1.3 + 4); g.stroke(); }   // petal swirl
  };
  medallion(w / 2, h / 2, w * 0.74, h * 0.9);
  for (const [x, y] of [[0, 0], [w, 0], [0, h], [w, h]]) medallion(x, y, w * 0.74, h * 0.9);   // staggered neighbours
});
curtainTex.tex.wrapS = curtainTex.tex.wrapT = THREE.RepeatWrapping;
const CUR_H = ROD_Y - (DADO_Y + 2.5), CUR_W = winW + 2;
// Half open: two panels gathered to the sides (deeper pleats), the middle of the window clear
const PANEL_W = CUR_W * 0.3;
const curtainPanel = (cx) => {
  const geo = new THREE.PlaneGeometry(PANEL_W, CUR_H, 80, 10), p = geo.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), down = (CUR_H / 2 - y) / CUR_H;
    const amp = 0.5 + 0.22 * Math.sin(x * 0.37 + cx) + 0.12 * Math.sin(x * 1.13);   // pleats are never all the same depth
    p.setZ(i, Math.sin(x * Math.PI / 0.75 + 0.3 * Math.sin(x * 0.5 + cx)) * amp * (1 - 0.18 * down) + Math.sin(x * 0.9 + cx) * 0.22 + down * down * 0.25 * Math.sin(x * 0.6));
    if (down > 0.985) p.setY(i, y - Math.abs(Math.sin(x * 1.7)) * 0.25); }
  geo.computeVertexNormals();
  const tex = curtainTex.tex.clone(); tex.needsUpdate = true; tex.repeat.set(PANEL_W * 1.6 / 5.6, CUR_H / 9.1);   // gathered fabric: pattern compressed
  const m = new THREE.Mesh(geo, new THREE.MeshPhysicalMaterial({ map: tex, roughness: 0.92, sheen: 0.5, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xfff1dc), emissive: 0xffe6c4, emissiveMap: tex, emissiveIntensity: 0, side: THREE.DoubleSide }));
  m.castShadow = true;
  m.position.set(cx, ROD_Y - CUR_H / 2 - 0.3, ROD_OUT); m.receiveShadow = true; corner.add(m); return m;
};
const curtainL = curtainPanel(winC - CUR_W / 2 + PANEL_W / 2), curtainR = curtainPanel(winC + CUR_W / 2 - PANEL_W / 2);
// black curtain rod with grommets and end caps
const RAIL_Z0 = WIN_Z0 - 1.5, railL = WIN_Z1 + 1 - RAIL_Z0;
const rod = mesh(new THREE.CylinderGeometry(0.16, 0.16, railL, 12), mat(0x161616, { metalness: 0.6, roughness: 0.35 }));
rod.rotation.z = Math.PI / 2; rod.position.set(onRight(RAIL_Z0 + railL / 2), ROD_Y, ROD_OUT); corner.add(rod);
for (const z of [RAIL_Z0, WIN_Z1 + 1]) { const cap = mesh(new THREE.SphereGeometry(0.32, 12, 8), mat(0xe9e3d6)); cap.position.set(onRight(z), ROD_Y, ROD_OUT); corner.add(cap); }
const grommetMat = mat(0x1a1a1a, { metalness: 0.7, roughness: 0.3 });
for (const c of [curtainL, curtainR]) for (let x = -PANEL_W / 2 + 0.4; x < PANEL_W / 2; x += 1.5) { const gr = mesh(new THREE.TorusGeometry(0.34, 0.07, 6, 16), grommetMat); gr.position.set(c.position.x + x, ROD_Y, ROD_OUT); corner.add(gr); }
// keyboard leaning against the wall under the curtain (silver-blue body, speakers, keys)
const kbTex = canvasTex(256, 760, (g, w, h) => {
  g.fillStyle = "#1d2a52"; g.fillRect(0, 0, w, h);
  const kx = w * 0.56;
  g.fillStyle = "#c9ced8"; g.fillRect(w * 0.16, h * 0.2, w * 0.3, h * 0.6);   // silver control panel
  for (const y of [0.1, 0.9]) { const rg = g.createRadialGradient(w * 0.3, h * y, 4, w * 0.3, h * y, w * 0.22); rg.addColorStop(0, "#3b5aa8"); rg.addColorStop(1, "#14203f"); g.fillStyle = rg; g.beginPath(); g.arc(w * 0.3, h * y, w * 0.22, 0, 7); g.fill(); }
  g.fillStyle = "#9fb9a6"; g.fillRect(w * 0.2, h * 0.42, w * 0.2, h * 0.08);   // LCD
  g.fillStyle = "#2f3f7a"; for (let i = 0; i < 18; i++) g.fillRect(w * (0.19 + (i % 3) * 0.08), h * (0.25 + Math.floor(i / 3) * 0.025), w * 0.05, h * 0.012);
  g.fillStyle = "#f4f2ec"; g.fillRect(kx, h * 0.04, w - kx - 8, h * 0.92);
  const n = 36, kh = h * 0.92 / n;
  g.strokeStyle = "#9a9a9a"; g.lineWidth = 1; for (let i = 0; i <= n; i++) { g.beginPath(); g.moveTo(kx, h * 0.04 + i * kh); g.lineTo(w - 8, h * 0.04 + i * kh); g.stroke(); }
  g.fillStyle = "#111"; for (let i = 0; i < n; i++) if ([0, 1, 3, 4, 5].includes(i % 7)) g.fillRect(kx, h * 0.04 + (i + 0.65) * kh, (w - kx - 8) * 0.6, kh * 0.7);
});
// a 61-key keyboard (≈94 × 32 × 9 cm) leaning on the wall, keys as real geometry
const keyboard = rbox(6.6, 19, 1.8, 0.5, mat(0x1d2a52, { roughness: 0.45, clearcoat: 0.3 }), 3);
const kbFace = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 18.8), new THREE.MeshStandardMaterial({ map: kbTex.tex, roughness: 0.4 }));
kbFace.position.z = 0.91; keyboard.add(kbFace);
{ const N = 36, span = 18.8 * 0.92, kw = span / N, y0 = -span / 2 + kw / 2, wGeo = new RoundedBoxGeometry(2.72, kw * 0.94, 0.42, 1, 0.05), bGeo = new RoundedBoxGeometry(1.62, kw * 0.58, 0.34, 1, 0.04);
  const whites = new THREE.InstancedMesh(wGeo, mat(0xf6f4ee, { roughness: 0.3, clearcoat: 0.4 }), N), blacks = new THREE.InstancedMesh(bGeo, mat(0x111113, { roughness: 0.25, clearcoat: 0.5 }), 25);
  let nb = 0;
  for (let i = 0; i < N; i++) { dummy.position.set(1.77, y0 + i * kw, 0.98); dummy.rotation.set(0, 0, 0); dummy.updateMatrix(); whites.setMatrixAt(i, dummy.matrix);
    if ([0, 1, 3, 4, 5].includes(i % 7) && i < N - 1 && nb < 25) { dummy.position.set(1.22, y0 + (i + 0.5) * kw, 1.32); dummy.updateMatrix(); blacks.setMatrixAt(nb++, dummy.matrix); } }
  blacks.count = nb; keyboard.add(whites, blacks); }
keyboard.position.set(onLeft(9), FLOOR_Y + 9.35, 2.45); keyboard.rotation.x = -0.16;   // leaning ≈9° on the opposite (left) wall
keyboard.traverse((o) => { if (o.isMesh) o.castShadow = false; });
leftWall.add(keyboard);
// fluted white pedestal with a peace lily, and two floor pots
const pedGeo = new THREE.CylinderGeometry(2.2, 2.3, 9, 64, 1);
{ const p = pedGeo.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r > 1) { const k = 1 + 0.035 * Math.cos(a * 28); p.setX(i, x * k); p.setZ(i, z * k); } } pedGeo.computeVertexNormals(); }
const pedestal = mesh(pedGeo, mat(0xf3f1ec, { roughness: 0.75 }));
pedestal.position.set(onRight(WALL_Z + 3.2), FLOOR_Y + 4.5, 3.4); corner.add(pedestal);   // plants gather in the back-right corner
const lilyMat = mat(0x2f5a2c, { roughness: 0.5 }), potWhite = mat(0xf5f5f2, { roughness: 0.4, clearcoat: 0.4 });
const lily = new THREE.Group();
const lPot = mesh(new THREE.CylinderGeometry(1.3, 1.0, 1.9, 24), potWhite); lPot.position.y = 0.95; lily.add(lPot);
const lilyLeaf = new THREE.SphereGeometry(0.5, 12, 8); lilyLeaf.scale(0.75, 0.08, 2.4);
for (let i = 0; i < 11; i++) { const a = (i / 11) * Math.PI * 2, h = 2.6 + (i % 3) * 0.9, lf = mesh(lilyLeaf, lilyMat);
  lf.position.set(Math.cos(a) * 1.2, h, Math.sin(a) * 1.2); lf.rotation.set(0.9 * Math.sin(a), -a + Math.PI / 2, 0.9 * Math.cos(a) - 0.3); lily.add(lf);
  const st = mesh(new THREE.CylinderGeometry(0.04, 0.05, h - 1.6, 5), lilyMat); st.position.set(Math.cos(a) * 0.5, 1.8 + (h - 1.6) / 2, Math.sin(a) * 0.5); st.rotation.set(0.25 * Math.sin(a), 0, -0.25 * Math.cos(a)); lily.add(st); }
lily.position.set(pedestal.position.x, FLOOR_Y + 9, pedestal.position.z); corner.add(lily);
const spiky = (n, len, col, spread) => { const grp = new THREE.Group(), m = mat(col, { roughness: 0.6 });
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + i, cone = mesh(new THREE.ConeGeometry(0.12, len * (0.7 + (i % 4) * 0.12), 5), m);
    cone.position.set(Math.cos(a) * 0.3, len * 0.35, Math.sin(a) * 0.3); cone.rotation.set(Math.sin(a) * spread, 0, -Math.cos(a) * spread); grp.add(cone); } return grp; };
const terra = new THREE.Group();
const tPot = mesh(new THREE.CylinderGeometry(1.5, 1.1, 2.6, 24), mat(0xb3613f, { roughness: 0.8 })); tPot.position.y = 1.3;
const spider = spiky(16, 4.2, 0x6f9a3e, 0.75); spider.position.y = 2.5; terra.add(tPot, spider);
terra.position.set(onRight(WALL_Z + 7.6), FLOOR_Y, 2.4); corner.add(terra);
const aloePot = new THREE.Group();
const aPot = mesh(new THREE.CylinderGeometry(1.25, 1.0, 2.4, 24), potWhite); aPot.position.y = 1.2;
const aloe = spiky(10, 5.2, 0x5f8f55, 0.45); aloe.position.y = 2.3; aloePot.add(aPot, aloe);
aloePot.position.set(onRight(WALL_Z + 3.4), FLOOR_Y, 7.4); corner.add(aloePot);
corner.traverse((o) => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = true; } });   // far from the lamp — skip shadow cost

/* ───────────────────────── Left wall: pop-art prints + camera and cap on a hook ───────────────────────── */
// Sijo's One Piece prints: his own photo of the ten prints on his wall, the wall keyed out (assets/wall-prints.webp).
// Note: third-party character art, shown at Sijo's request.
const popArt = new THREE.Group();
const PRINTS_W = 16, PRINTS_H = PRINTS_W * 1160 / 2048;   // ≈80 × 45 cm, ten ≈15 × 21 cm prints
{ const geo = new THREE.PlaneGeometry(PRINTS_W, PRINTS_H, 24, 12), pp = geo.attributes.position;
  for (let k = 0; k < pp.count; k++) { const x = pp.getX(k), y = pp.getY(k); const cx = ((x / PRINTS_W + 0.5) * 5) % 1, cy = ((y / PRINTS_H + 0.5) * 2) % 1;
    pp.setZ(k, 0.05 * (Math.pow(Math.abs(cx - 0.5) * 2, 4) + Math.pow(Math.abs(cy - 0.5) * 2, 6))); }   // each print lifts a little at its edges
  geo.computeVertexNormals();
  const mat_ = new THREE.MeshStandardMaterial({ color: 0xd8d8d8, transparent: true, alphaTest: 0.5, roughness: 0.6 });
  const prints = new THREE.Mesh(geo, mat_); prints.receiveShadow = true; prints.position.z = 0.05; popArt.add(prints);
  new THREE.TextureLoader().load(asset("assets/wall-prints.webp"), (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = renderer.capabilities.getMaxAnisotropy(); mat_.map = t; mat_.color.set(0xffffff); mat_.needsUpdate = true; }); }
popArt.position.set(onLeft(13), FLOOR_Y + 34, 0.02);
leftWall.add(popArt);
interactive(popArt, "One Piece prints on my wall", () => { Sound.click(); wiggle(popArt); });



/* ───────────────────────── The MacBook's charging cable: off the desk's back edge, along the skirting, up to a charger in the socket ───────────────────────── */
{
  const SW = TABLE.x + 19, SY = FLOOR_Y + 25, BZ = WALL_Z + 0.25;
  const pts = [[2.15, 0.12, -0.9], [2.6, 0.06, -2.2], [3.4, 0.04, -3.1], [3.7, -0.4, -3.35], [3.8, -6, BZ + 0.05], [4.6, FLOOR_Y + 0.3, BZ + 0.3],
    [9, FLOOR_Y + 0.12, BZ + 0.45], [SW - 0.6, FLOOR_Y + 0.15, BZ + 0.4], [SW - 0.55, FLOOR_Y + 1.6, BZ], [SW - 0.55, SY - 2.6, BZ - 0.1], [SW + 1.0, SY - 0.95, BZ + 0.2]].map((v) => new THREE.Vector3(...v));
  const cableC = mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35), 160, 0.07, 6), mat(0xf2f1ee, { roughness: 0.55 }));
  scene.add(cableC);
  const brick = rbox(0.95, 1.05, 0.62, 0.15, mat(0xf4f4f2, { roughness: 0.4 }), 2); brick.position.set(SW + 1.1, SY - 0.05, WALL_Z + 0.45); scene.add(brick);   // USB-C charger in the socket
  const magsafe = rbox(0.42, 0.1, 0.22, 0.05, mat(0x9a9ca0, { metalness: 0.8, roughness: 0.3 }), 2); magsafe.position.set(2.05, 0.12, -0.9); magsafe.rotation.y = -0.4; scene.add(magsafe);
}

/* ───────────────────────── Contact shadows: the soft dark rim real objects leave where they touch a surface ───────────────────────── */
const contactTex = canvasTex(128, 128, (g, w, h) => { const rg = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2); rg.addColorStop(0, "rgba(0,0,0,1)"); rg.addColorStop(0.55, "rgba(0,0,0,.6)"); rg.addColorStop(1, "rgba(0,0,0,0)"); g.fillStyle = rg; g.fillRect(0, 0, w, h); }).tex;
function contact(x, y, z, w, d, opacity, rot = 0) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: contactTex, color: 0x000000, transparent: true, opacity, depthWrite: false }));
  m.rotation.set(-Math.PI / 2, 0, rot); m.position.set(x, y, z); m.renderOrder = 1; scene.add(m); return m;
}
const DESK_Y = 0.015;
contact(-1.0, DESK_Y, -0.25, 7.6, 5.6, 0.42, 0.08);      // laptop
contact(6.15, DESK_Y, -2.75, 7.8, 2.5, 0.5);             // speaker
contact(-7.4, DESK_Y, -2.2, 3.2, 3.0, 0.45);             // galaxy light
contact(-8.6, DESK_Y, -0.35, 1.8, 1.8, 0.45);           // bottle
contact(-4.95, DESK_Y, -1.95, 2.4, 2.4, 0.4);             // plant
contact(-8.4, DESK_Y, 5.2, 1.4, 1.4, 0.45);              // pencil cup
contact(-6.9, DESK_Y, 2.1, 3.2, 2.4, 0.35, -0.25);       // sketchbook
contact(4.85, DESK_Y, 4.6, 4.4, 3.4, 0.28, 0.1);         // folders
contact(6.4, DESK_Y, 0.0, 5.0, 3.0, 0.3, 1.15);          // Shea
contact(TABLE.x, FLOOR_Y + 0.03, TABLE.z, TABLE.w + 3, TABLE.d + 3, 0.5);   // the desk on the floor
contact(TABLE.x + ROOM_HALF - 3.4, FLOOR_Y + 0.03, WALL_Z + 3.2, 6.5, 6.5, 0.5);   // pedestal
contact(TABLE.x + ROOM_HALF - 2.4, FLOOR_Y + 0.03, WALL_Z + 7.6, 4.2, 4.2, 0.4);   // terracotta pot
contact(TABLE.x + ROOM_HALF - 7.4, FLOOR_Y + 0.03, WALL_Z + 3.4, 3.6, 3.6, 0.4);   // aloe
contact(TABLE.x - ROOM_HALF + 3.4, FLOOR_Y + 0.03, 9, 4.5, 21, 0.4);              // keyboard foot against the left wall

/* ───────────────────────── Back wall: a modular switch board, like every Indian home ───────────────────────── */
const switchTex = canvasTex(512, 256, (g, w, h) => {
  g.fillStyle = "#f7f6f2"; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 4; k++) { g.fillStyle = "#ecebe6"; g.fillRect(36 + k * 68, 48, 52, 150); g.fillStyle = "#e2e1dc"; g.fillRect(36 + k * 68, 48, 52, 75); g.fillStyle = k === 1 ? "#ff5a3c" : "#c9c8c2"; g.fillRect(56 + k * 68, 60, 12, 6); }
  g.fillStyle = "#ecebe6"; g.beginPath(); g.arc(395, 123, 66, 0, 7); g.fill();
  g.fillStyle = "#333"; for (const [x, y] of [[372, 141], [418, 141], [395, 96]]) { g.beginPath(); g.arc(x, y, 9, 0, 7); g.fill(); }
});
const switchPlate = rbox(4.2, 2.1, 0.18, 0.08, new THREE.MeshStandardMaterial({ map: switchTex.tex, roughness: 0.45 }), 2);
switchPlate.position.set(TABLE.x + 19, FLOOR_Y + 25, WALL_Z + 0.12); switchPlate.castShadow = true; scene.add(switchPlate);

/* ───────────────────────── Day ↔ night through the window ─────────────────────────
   Sunlight streams in through the gap between the curtains (a soft light shaft + a warm patch on the floor, and the
   main light comes from the window side). Click the window to switch; it starts at the visitor's local time of day. */
const WX = TABLE.x + ROOM_HALF - 0.6;                                         // just inside the right wall
const GAP_Z0 = (WIN_Z0 + WIN_Z1) / 2 - CUR_W / 2 + PANEL_W, GAP_Z1 = (WIN_Z0 + WIN_Z1) / 2 + CUR_W / 2 - PANEL_W;
const SUN_DIR = new THREE.Vector3(-1, -2.2, -0.3).normalize();   // steep enough to land between the window and the desk
const toFloor = (y, z) => { const t = (y - (FLOOR_Y + 0.04)) / -SUN_DIR.y; return new THREE.Vector3(WX + SUN_DIR.x * t, FLOOR_Y + 0.04, z + SUN_DIR.z * t); };
const WQ = [[WIN_Y1, GAP_Z0], [WIN_Y1, GAP_Z1], [WIN_Y0, GAP_Z1], [WIN_Y0, GAP_Z0]].map(([y, z]) => new THREE.Vector3(WX, y, z));
const FQ = WQ.map((v) => toFloor(v.y, v.z));
// light shaft: the four sides of the beam, bright at the window, fading toward the floor (additive, no depth write)
const shaftGeo = new THREE.BufferGeometry(), sp = [], sc = [];
const warm = [0.5, 0.42, 0.3], faint = [0.05, 0.04, 0.03];
for (let i = 0; i < 4; i++) { const a = WQ[i], b = WQ[(i + 1) % 4], c = FQ[(i + 1) % 4], d = FQ[i];
  for (const [v, col] of [[a, warm], [b, warm], [c, faint], [a, warm], [c, faint], [d, faint]]) { sp.push(v.x, v.y, v.z); sc.push(...col); } }
shaftGeo.setAttribute("position", new THREE.Float32BufferAttribute(sp, 3)); shaftGeo.setAttribute("color", new THREE.Float32BufferAttribute(sc, 3));
const shaftMat = new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
const shaft = new THREE.Mesh(shaftGeo, shaftMat); shaft.renderOrder = 5; scene.add(shaft);
// the patch of sun on the floor (soft-edged)
const patchTex = canvasTex(256, 256, (g, w, h) => { g.filter = "blur(13px)"; g.fillStyle = "#fff"; g.fillRect(26, 26, w - 52, h - 52); }).tex;
const patchGeo = new THREE.BufferGeometry();
patchGeo.setAttribute("position", new THREE.Float32BufferAttribute([FQ[0], FQ[1], FQ[2], FQ[0], FQ[2], FQ[3]].flatMap((v) => [v.x, v.y, v.z]), 3));
patchGeo.setAttribute("uv", new THREE.Float32BufferAttribute([0, 1, 1, 1, 1, 0, 0, 1, 1, 0, 0, 0], 2));
const patchMat = new THREE.MeshBasicMaterial({ map: patchTex, color: 0xffd9a0, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
const sunPatch = new THREE.Mesh(patchGeo, patchMat); sunPatch.renderOrder = 4; scene.add(sunPatch);
// the look of each time of day
const LOOK = {
  day:   { sun: 1.5, sunC: 0xfff0d6, hemi: 0.62, hemiG: 0x4a3a33, rim: 0.3, lamp: 28, glow: 0.55, exp: 1.02, shaft: 0.14, shaftC: 0xfff4e0, patch: 0.2, patchC: 0xffe2b8 },
  night: { sun: 0.16, sunC: 0x7f96ff, hemi: 0.07, hemiG: 0x120f14, rim: 0.05, lamp: 70, glow: 1, exp: 0.98, shaft: 0.05, shaftC: 0x8fa8ff, patch: 0.1, patchC: 0x9db3ff }   // a real night: the warm pendant does the work, corners fall into shadow
};
sun.position.copy(SUN_DIR).multiplyScalar(-45);                           // the key light now comes from the window
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
const mixC = (out, a, b, k) => out.copy(_c1.setHex(a)).lerp(_c2.setHex(b), k);
let dayMix = 0, dayTarget = 0;   // 0 = day, 1 = night
function applyDay(k) {
  const D = LOOK.day, N = LOOK.night, f = (a, b) => a + (b - a) * k;
  sun.intensity = f(D.sun, N.sun); mixC(sun.color, D.sunC, N.sunC, k);
  hemi.intensity = f(D.hemi, N.hemi); mixC(hemi.groundColor, D.hemiG, N.hemiG, k);
  rim.intensity = f(D.rim, N.rim);
  lampLight.intensity = f(D.lamp, N.lamp); glowSprite.material.opacity = f(D.glow, N.glow);
  renderer.toneMappingExposure = f(D.exp, N.exp);
  scene.environmentIntensity = f(1, 0.32);
  glow.intensity = f(1.2, 3.2);   // the ambient light from the room itself dims at night too
  shaftMat.opacity = f(D.shaft, N.shaft); mixC(shaftMat.color, D.shaftC, N.shaftC, k);
  patchMat.opacity = f(D.patch, N.patch); mixC(patchMat.color, D.patchC, N.patchC, k);
  glassNight.material.opacity = k;
  for (const c of [curtainL, curtainR]) c.material.emissiveIntensity = (1 - k) * 0.22;   // sunlight glowing through the linen
  projMat.opacity = astroOn ? Math.max(0, k - 0.25) * 1.1 : 0; projWall.material.opacity = projMat.opacity * 0.8;
}
let dayAnim = null;
const smoothK = (k) => k * k * (3 - 2 * k);
function setNight(night, instant) {
  dayTarget = night ? 1 : 0;
  windowHit.userData.hover.label = night ? "Let the sun in ☀" : "Let the night in ☾";
  if (instant || reduced) { dayMix = dayTarget; applyDay(dayMix); dayAnim = null; return; }
  dayAnim = { from: dayMix, start: performance.now() };
}
function stepDay(now) {
  if (!dayAnim) return;
  const k = Math.min(1, (now - dayAnim.start) / 1800);
  dayMix = dayAnim.from + (dayTarget - dayAnim.from) * smoothK(k); applyDay(dayMix);
  if (k === 1) dayAnim = null;
}
// click target: the whole window and curtains
const windowHit = new THREE.Mesh(new THREE.BoxGeometry(CUR_W + 1, ROD_Y - WIN_Y0 + 1, ROD_OUT + 0.6), new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false }));
windowHit.position.set(winC, (ROD_Y + WIN_Y0) / 2, (ROD_OUT + 0.6) / 2); corner.add(windowHit);
interactive(windowHit, "Let the night in ☾", () => { Sound.click(); setNight(dayTarget === 0); });
setNight(true, true);   // every visit starts at night (Sijo's favourite look); click the curtains for morning



/* ───────────────────────── Wall lettering ───────────────────────── */
// Name block — hung on the wall like studio lettering, right of the poster
const nameBlock = floorText([
  { text: S.name + ".", size: 210, weight: 700, spacing: -0.03, color: "#5a382f" },
  { text: S.title, size: 112, weight: 500, color: "#6f4a40", spacing: -0.01 }
], { width: 9.6, gap: 1.2 });   // sized to stay readable from the seated eye-level view
nameBlock.rotation.x = 0;
nameBlock.position.set(7.8, 9.6, WALL_Z + 0.03);
scene.add(nameBlock);
interactive(nameBlock, "About me", () => boot("about"));

// Roles strip — under the name
const half = Math.ceil(S.roles.length / 2);
const rolesBlock = floorText([
  { text: S.roles.slice(0, half).join("  ·  "), size: 92, weight: 500, color: "#7d5a50", spacing: 0 },
  { text: S.roles.slice(half).join("  ·  "), size: 92, weight: 500, color: "#7d5a50", spacing: 0 }
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
  const g = screenCanvas.g, W = SCREEN_CW, H = SCREEN_CH;
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
  // Menu bar — transparent, text straight on the wallpaper; same proportions as the Mac desktop (menu bar = notch height)
  const mbH = H * NOTCH.h, mbY = mbH / 2, k = H / 760;   // k: the desktop's 760 px-tall screen → this canvas
  g.save(); g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 4;
  g.fillStyle = "#fff"; g.textBaseline = "middle"; g.textAlign = "left";
  g.font = `800 ${13 * k}px ${UI}`; g.fillText("SJ", 22 * k, mbY);
  g.font = `700 ${13 * k}px ${UI}`; g.fillText("Portfolio", 74 * k, mbY);
  g.font = `400 ${13 * k}px ${UI}`;
  ["File", "Edit", "View", "Go", "Window", "Help"].forEach((m, i) => g.fillText(m, (172 + [0, 50, 102, 158, 202, 262][i]) * k, mbY));
  g.textAlign = "right";
  g.fillText(new Date().toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }), W - 22 * k, mbY);
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
  // Notch (MacBook Air): flared top corners, rounded bottom, camera — the same shape as the Mac desktop's
  const nw = W * NOTCH.w, nh = mbH, nr = nh * NOTCH.r, fl = nh * 0.28, nx = (W - nw) / 2;
  g.fillStyle = "#050506"; g.beginPath();
  g.moveTo(nx - fl, 0); g.quadraticCurveTo(nx, 0, nx, fl);
  g.lineTo(nx, nh - nr); g.quadraticCurveTo(nx, nh, nx + nr, nh);
  g.lineTo(nx + nw - nr, nh); g.quadraticCurveTo(nx + nw, nh, nx + nw, nh - nr);
  g.lineTo(nx + nw, fl); g.quadraticCurveTo(nx + nw, 0, nx + nw + fl, 0); g.closePath(); g.fill();
  const cam = g.createRadialGradient(W / 2 - nh * 0.06, nh * 0.44, 0, W / 2, nh * 0.5, nh * 0.18);
  cam.addColorStop(0, "#2a3a5c"); cam.addColorStop(1, "#0b0f18"); g.fillStyle = cam;
  g.beginPath(); g.arc(W / 2, nh * 0.5, nh * 0.17, 0, 7); g.fill();
  // rounded top display corners (the glass bezel shows through)
  const cr = 18 * k; g.fillStyle = "#0b0b0c";
  for (const sx of [0, 1]) { g.beginPath(); const x0 = sx ? W : 0, dir = sx ? -1 : 1;
    g.moveTo(x0, 0); g.lineTo(x0 + dir * cr, 0); g.quadraticCurveTo(x0, 0, x0, cr); g.closePath(); g.fill(); }
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
const EASE_IN_OUT = bezier(0.45, 0, 0.15, 1);  // gentle start, long soft landing (camera fly-ins)
const EASE_APPLE = bezier(0.32, 0.72, 0, 1);    // Apple's standard "out" curve
// Camera moves glide like a real camera: the look-at point slides, the viewing direction swings along an arc
// (spherical interpolation) and the distance changes logarithmically, so a dolly-in feels even all the way.
const _qa = new THREE.Quaternion(), _qb = new THREE.Quaternion(), _ofs = new THREE.Vector3(), _z = new THREE.Vector3(0, 0, 1);
function moveCamera(toPos, toTarget, toZoom, dur = 1100, done, ease = EASE_IN_OUT) {
  const from = { pos: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom };
  const offA = from.pos.clone().sub(from.target), offB = toPos.clone().sub(toTarget);
  const lenA = Math.max(offA.length(), 1e-3), lenB = Math.max(offB.length(), 1e-3);
  _qa.setFromUnitVectors(_z, offA.clone().normalize()); _qb.setFromUnitVectors(_z, offB.clone().normalize());
  const qa = _qa.clone(), qb = _qb.clone();
  const start = performance.now();
  controls.enabled = false;
  tween = (now) => {
    let k = Math.min(1, (now - start) / (reduced ? 1 : dur));
    const e = ease(k);
    controls.target.lerpVectors(from.target, toTarget, e);
    _ofs.copy(_z).applyQuaternion(new THREE.Quaternion().slerpQuaternions(qa, qb, e)).multiplyScalar(Math.exp(Math.log(lenA) + (Math.log(lenB) - Math.log(lenA)) * e));
    camera.position.copy(controls.target).add(_ofs);
    if (k === 1) camera.position.copy(toPos);
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
let debugCam = null;   // test hook: a fixed camera for screenshots (Desk.debugView)
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
  stepDay(now);
  stepAstro(1 / 60);
  if (tween) tween(now);
  if (!debugCam) { controls.update(); keepInsideRoom(); }

  // hover lift / scale
  for (const o of hoverables) {
    const h = o.userData.hover;
    const target = o === hovered && !booting ? 1 : 0;
    h.lift += (target - h.lift) * (1 - Math.pow(0.82, f));   // same feel at 60 or 120 fps
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

/* ───────────────────────── Downloaded models (cat, football) ─────────────────────────
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
const CAT_HEIGHT = 5.8; // ≈29 cm to the top of the head — a real adult female cat next to the 14" MacBook Pro
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
  holder.position.set(6.4, 0, 0.0);
  holder.rotation.y = CAT_FACING;
  reveal(holder);
  cat = interactive(holder, "Shea says: pet me?", petCat);
}
const CAT_FACING = -1.15; // side-on in front of the speaker, looking towards the laptop (tail over the desk edge)

// Ball on the marble floor — click to kick it
let ball = null, ballVX = 0;
const BALL_R = 1.7; // ≈17 cm across (a size-3 kickabout ball)
async function loadBall() {
  const [gltf, base, normal, rough] = await Promise.all([
    loadGLB(MODEL.ball), loadTex(MODEL.ballColor, true), loadTex(MODEL.ballNormal), loadTex(MODEL.ballARM)
  ]);
  // Poly Haven "Football" by Amal Kumar, CC0. arm.jpg packs ambient occlusion (R) and roughness (G)
  const leather = new THREE.MeshStandardMaterial({ map: base, normalMap: normal, roughnessMap: rough, aoMap: rough, roughness: 1, metalness: 0 });
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
  ball.position.set(-4.5, floor.position.y + BALL_R, 6.2); // on the floor at the front of the desk (under the desk front), in view
  reveal(ball);
  interactive(ball, "Kick me ⚽", () => { Sound.click(); ballVX = (ball.position.x > 0 ? -1 : 1) * 0.4; });
}


deskBuilt = true;
setProgress(50 + modelFrac * 45, "loading models…");
// Each model retries once (flaky networks), then is simply left out — never a broken stand-in.
const attempt = (load) => load().catch((err) => { console.warn("Model failed, retrying:", err); return load(); });
const models = Promise.allSettled([attempt(loadCat), attempt(loadBall)])
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
window.Desk = { astro: () => [astroHead.rotation.x, astroTilt, astroOn, dayMix], debugView: (pos, target) => { debugCam = true; camera.position.set(...pos); camera.lookAt(...target); camera.zoom = 1; camera.updateProjectionMatrix(); },
  boxes: () => Object.fromEntries([["cat", cat], ["folders", projectFiles], ["speaker", speaker], ["laptop", laptop], ["cup", cup], ["astro", astro], ["bottle", bottle], ["books", books], ["plant", plant], ["phone", phone]].filter(([, o]) => o).map(([k, o]) => { const b = new THREE.Box3().setFromObject(o); return [k, [b.min.x, b.min.z, b.max.x, b.max.z, b.max.y].map((v) => +v.toFixed(2))]; })),
  state: () => ({ started, cat: !!cat, ball: !!ball,
  covering: !!window.OS.isCovering?.(), quality: perf.step, pixelRatio: renderer.getPixelRatio(), fading: fading.length,
  booting, tailX: catRig && catRig.tail.length ? catRig.pos.array[catRig.tail[catRig.tail.length - 1] * 3] : null,
  ballX: ball ? ball.position.x : null, audio: Sound.state, music: window.Music.playing, room: roomView, homeDist: HOME.dist, roomDist: ROOM.dist, night: dayTarget === 1, dayMix }),
  toggleDay: () => setNight(dayTarget === 0),
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
