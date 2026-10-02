import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { ColladaLoader } from "three/addons/loaders/ColladaLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/addons/loaders/FBXLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";

const S = window.SITE;
const $ = (s) => document.querySelector(s);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const setProgress = (p, msg) => {
  $("#loaderBar").style.width = p + "%";
  $("#loaderPct").textContent = `${msg} ${Math.round(p)}%`;
};

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

/* ───────────────────────── Sound (tiny synth blips) ───────────────────────── */
const Sound = (() => {
  let ctx, muted = false;
  try { muted = localStorage.getItem("muted") === "1"; } catch (_) {}
  const blip = (freq, dur = 0.06, type = "square", vol = 0.04) => {
    if (muted) return;
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur);
    o.connect(g).connect(ctx.destination); o.start(); o.stop(ctx.currentTime + dur);
  };
  return {
    hover: () => blip(880, 0.03, "sine", 0.02),
    click: () => blip(520, 0.07),
    boot: () => [262, 330, 392, 523].forEach((f, i) => setTimeout(() => blip(f, 0.14, "triangle", 0.05), i * 110)),
    purr() {
      if (muted) return;
      ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(), t = ctx.currentTime;
      o.type = "sawtooth"; o.frequency.value = 55;
      lfo.frequency.value = 24; lg.gain.value = 0.03;
      lfo.connect(lg).connect(g.gain);
      g.gain.setValueAtTime(0.035, t); g.gain.linearRampToValueAtTime(0.0001, t + 1.8);
      const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 300;
      o.connect(f).connect(g).connect(ctx.destination);
      o.start(t); lfo.start(t); o.stop(t + 1.8); lfo.stop(t + 1.8);
    },
    audio() { return (ctx = ctx || new (window.AudioContext || window.webkitAudioContext)()); },
    toggle() {
      muted = !muted;
      try { localStorage.setItem("muted", muted ? "1" : "0"); } catch (_) {}
      if (muted) window.Music.stop(); else window.Music.start(this.audio());
      return muted;
    },
    get muted() { return muted; }
  };
})();
window.Sound = Sound;
$("#soundBtn").classList.toggle("muted", Sound.muted);
// Background music starts on the first tap/click (browsers block audio before a user gesture)
const startMusic = () => { if (!Sound.muted) window.Music.start(Sound.audio()); };
addEventListener("pointerdown", startMusic, { once: true });
addEventListener("keydown", startMusic, { once: true });
$("#soundBtn").addEventListener("click", () => {
  const m = Sound.toggle();
  $("#soundBtn").classList.toggle("muted", m);
  $("#soundBtn").setAttribute("aria-label", m ? "Turn sound on" : "Mute sound");
  if (!m) Sound.click();
});

/* Open the portfolio without 3D */
$("#skipLink").addEventListener("click", (e) => { e.preventDefault(); window.OS.open("about"); });

/* ───────────────────────── Renderer / scene ───────────────────────── */
let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
} catch (err) {
  // No WebGL — go straight to the 2D portfolio
  $("#loader").classList.add("done");
  window.OS.open("about");
  throw err;
}
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
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

// Perspective camera with a longish lens (30° FOV): natural depth without wide-angle distortion.
// Scale reference: the 13" laptop is 6 units wide (≈30 cm), so 1 unit ≈ 5 cm.
const FOV = 30;
const camera = new THREE.PerspectiveCamera(FOV, innerWidth / innerHeight, 0.5, 400);
const HOME_TARGET = new THREE.Vector3(0.2, 0.6, 1.0);
const HOME_DIR = new THREE.Vector3(0, 0.52, 0.86).normalize();   // ~31° above the desk, straight on
const HOME = { pos: new THREE.Vector3(), target: HOME_TARGET.clone(), zoom: 1 };
function fitCamera() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  const v = THREE.MathUtils.degToRad(FOV), h = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
  // far enough to fit the wall art + desk vertically, and the artwork-to-name width (~21 units) horizontally on tall screens
  const dist = Math.max(19 / Math.tan(v / 2) * 0.62, 10.5 / Math.tan(h / 2));
  HOME.pos.copy(HOME_TARGET).addScaledVector(HOME_DIR, dist);
  HOME.dist = dist;
  scene.fog.near = dist + 30; scene.fog.far = dist + 130;   // fog always starts behind the room
}
fitCamera();
camera.position.copy(HOME.pos);

const controls = new OrbitControls(camera, renderer.domElement);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.enablePan = false;
const setZoomLimits = () => { controls.minDistance = HOME.dist * 0.4; controls.maxDistance = HOME.dist * 1.35; }; // zoom out only as far as the room still fills the view
setZoomLimits();
controls.minPolarAngle = 0.55; controls.maxPolarAngle = 1.2;
const homeAz = Math.atan2(HOME.pos.x - HOME.target.x, HOME.pos.z - HOME.target.z);
controls.minAzimuthAngle = homeAz - 0.6; controls.maxAzimuthAngle = homeAz + 0.6;
controls.update();

// Lights
const hemi = new THREE.HemisphereLight(0xffffff, 0x2a2a2e, 0.6);
scene.add(hemi);
const sun = new THREE.DirectionalLight(0xffffff, 2.4);
sun.position.set(-7, 16, 9);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.mapSize.set(4096, 4096);
Object.assign(sun.shadow.camera, { left: -20, right: 20, top: 20, bottom: -20, near: 1, far: 70 });
sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.02; sun.shadow.radius = 6;
scene.add(sun);
const rim = new THREE.DirectionalLight(0xc8d4ff, 0.6);
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
grid.tex.repeat.set(240 / 4, 240 / 4);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(240, 240), new THREE.MeshPhysicalMaterial({ map: grid.tex, roughness: 0.3, clearcoat: 0.8, clearcoatRoughness: 0.2 }));
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

// Desk mat — original design in deep blue-violet tones, stitched edge
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

/* ───────────────────────── Wall + poster ───────────────────────── */
const WALL_Z = TABLE.z - TABLE.d / 2 - 0.35;
const wallTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);   // neutral plaster; the wall colour is a tint set by the light/dark mode
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},${Math.random() > 0.5 ? 255 : 0},0.025)`; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
});
wallTex.tex.wrapS = wallTex.tex.wrapT = THREE.RepeatWrapping;
wallTex.tex.repeat.set(11, 10);
const wall = new THREE.Mesh(new THREE.PlaneGeometry(160, 90), new THREE.MeshStandardMaterial({ map: wallTex.tex, roughness: 0.95 }));
wall.position.set(TABLE.x, 2, WALL_Z);
wall.receiveShadow = true;
scene.add(wall);
const skirting = rbox(160, 0.5, 0.12, 0.03, mat(0xffffff, { roughness: 0.7 }), 1);
skirting.position.set(TABLE.x, -14.8 + 0.25, WALL_Z + 0.06);
scene.add(skirting);

// Sijo's own typographic poster ("To create a solution for something…"), taped to the wall, no frame
const poster = canvasTex(1240, 1754, (g, w, h) => {
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
    g.fillStyle = "#111"; g.font = `800 82px ${UI}`; g.textBaseline = "alphabetic";
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
const POSTER = { w: 5.6, h: 7.92 };   // A-series proportions
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
posterGroup.position.set(-4.6, 6.5, WALL_Z + 0.03);
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
lamp.position.set(0.4, 11.6, -0.8);
scene.add(lamp);



/* ───────────────────────── The laptop (13" silver) ───────────────────────── */
// Proportions follow a 13" ultrabook: ~30.4 × 21.5 cm, ~1.1 cm thick (1 unit ≈ 5 cm).
const SILVER = mat(0xd6d8db, { metalness: 0.75, roughness: 0.32 });
const SILVER_DARK = mat(0xbfc2c6, { metalness: 0.7, roughness: 0.38 });
const KEY_BLACK = mat(0x161618, { roughness: 0.55 });
const LAP_W = 6.0, LAP_D = 4.25, BASE_T = 0.2, LID_T = 0.11, LID_H = 4.15;

const laptop = new THREE.Group();
laptop.position.set(0, 0, 0.4);
laptop.rotation.y = -0.08;
scene.add(laptop);

// Base (bottom case) + rubber feet
const lapBase = rbox(LAP_W, BASE_T, LAP_D, 0.09, SILVER, 5);
lapBase.position.y = BASE_T / 2 + 0.04;
laptop.add(lapBase);
[[-2.6, -1.8], [2.6, -1.8], [-2.6, 1.8], [2.6, 1.8]].forEach(([x, z]) => {
  const f = mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.05, 16), DARK);
  f.position.set(x, 0.025, z);
  laptop.add(f);
});
const TOP = BASE_T + 0.04; // top surface of the deck

// Front thumb scoop
const scoop = rbox(1.3, 0.04, 0.14, 0.02, SILVER_DARK);
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
const trackpad = rbox(2.9, 0.012, 1.75, 0.08, mat(0xc9ccd0, { metalness: 0.5, roughness: 0.25 }));
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
const lidShell = rbox(LAP_W, LID_H, LID_T, 0.09, SILVER, 5);
lidShell.position.set(0, LID_H / 2, 0);
lid.add(lidShell);
// Glass bezel + display
const glassBezel = rbox(LAP_W - 0.1, LID_H - 0.1, 0.015, 0.07, mat(0x0b0b0c, { roughness: 0.15, metalness: 0.2 }), 2);
glassBezel.position.set(0, LID_H / 2, LID_T / 2 + 0.002);
lid.add(glassBezel);
const SCREEN_W = 5.62, SCREEN_H = 3.6;
const screenCanvas = canvasTex(800, 512, () => {});
const screen = new THREE.Mesh(new THREE.PlaneGeometry(SCREEN_W, SCREEN_H), new THREE.MeshBasicMaterial({ map: screenCanvas.tex, toneMapped: false }));
screen.position.set(0, LID_H / 2 - 0.08, LID_T / 2 + 0.012);
lid.add(screen);
interactive(screen, "Click to boot", () => boot("about"));
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
// 1. Ginger Persian cat (modelled on Sijo's cat) — right back, where the plant used to be
const fur = (color) => new THREE.MeshPhysicalMaterial({ color, roughness: 1, sheen: 0.35, sheenRoughness: 0.7, sheenColor: new THREE.Color(0xffcf9e) });
const FUR = fur(0xd4823f), FUR_LIGHT = fur(0xe39d5c), FUR_DEEP = fur(0xbd6e33), CREAM = fur(0xeec08e);
const PINK = mat(0xe9a39a, { roughness: 0.6 });
const blob = (r, m, x, y, z, sx = 1, sy = 1, sz = 1, segs = 28) => {
  const b = mesh(new THREE.SphereGeometry(r, segs, Math.round(segs * 0.7)), m);
  b.position.set(x, y, z); b.scale.set(sx, sy, sz);
  return b;
};
let seed = 7;
const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
let cat = new THREE.Group(); // replaced by the downloaded cat model once it loads
const catBody = blob(0.8, FUR, 0, 1.08, 0, 1.0, 1.38, 0.92);
cat.add(
  catBody,
  blob(0.9, FUR, 0, 0.6, 0.02, 1.08, 0.68, 1.0),
  blob(0.6, FUR_LIGHT, 0, 1.55, 0.34, 1.12, 1.0, 0.66),   // chest mane
  blob(0.56, FUR_LIGHT, 0, 0.98, 0.46, 1.0, 1.3, 0.6),    // belly fluff
  blob(0.21, CREAM, -0.24, 0.1, 0.78, 1, 0.68, 1.25),     // front paws
  blob(0.21, CREAM, 0.24, 0.1, 0.78, 1, 0.68, 1.25),
  blob(0.22, FUR_LIGHT, -0.68, 0.1, 0.42, 1.1, 0.65, 1.2),
  blob(0.22, FUR_LIGHT, 0.68, 0.1, 0.42, 1.1, 0.65, 1.2)
);
const furMats = [FUR, FUR, FUR_LIGHT, FUR_DEEP];
for (let i = 0; i < 34; i++) {
  const u = rand() * Math.PI * 2, v = 0.15 + rand() * 0.75;
  const y = 0.3 + v * 1.6;
  const rad = (y < 0.75 ? 0.86 : 0.76 - (y - 0.75) * 0.25) * (0.95 + rand() * 0.06);
  const x = Math.cos(u) * rad, z = Math.sin(u) * rad * 0.95;
  const front = z > 0.35 && Math.abs(x) < 0.5;
  cat.add(blob(0.16 + rand() * 0.07, front ? FUR_LIGHT : furMats[Math.floor(rand() * 4)], x * 0.97, y, z * 0.97, 1, 1.4, 0.8, 14));
}
const head = new THREE.Group();
head.position.set(0, 2.3, 0.2);
cat.add(head);
head.add(
  blob(0.47, FUR, 0, 0, 0, 1.12, 0.98, 0.95),
  blob(0.15, FUR_DEEP, 0, 0.3, 0.3, 1.8, 0.55, 0.6),
  blob(0.21, CREAM, 0, -0.15, 0.36, 1.35, 0.82, 0.7)
);
for (let i = 0; i < 11; i++) {
  const a = Math.PI * (0.05 + (i / 10) * 0.9) + Math.PI;
  head.add(blob(0.17 + rand() * 0.05, i % 3 ? FUR : FUR_LIGHT, Math.cos(a) * 0.5, Math.sin(a) * 0.32 - 0.12, 0.12, 1, 1.1, 0.9, 14));
}
for (const sx of [-1, 1]) head.add(blob(0.24, FUR_LIGHT, sx * 0.44, -0.08, 0.06, 1, 0.95, 0.9));
head.add(blob(0.045, PINK, 0, -0.06, 0.47, 1.3, 0.8, 0.6));
const eyesOpen = new THREE.Group(), eyesHappy = new THREE.Group();
for (const sx of [-1, 1]) {
  const ex = sx * 0.19;
  eyesOpen.add(
    blob(0.09, mat(0xc9781e, { roughness: 0.12 }), ex, 0.05, 0.39, 1.1, 0.9, 0.5),
    blob(0.055, mat(0x140d08, { roughness: 0.1 }), ex + 0.035, 0.04, 0.43, 0.8, 1, 0.3),
    blob(0.018, mat(0xffffff, { emissive: 0xffffff, emissiveIntensity: 0.6 }), ex + 0.05, 0.075, 0.45)
  );
  const lid = mesh(new THREE.SphereGeometry(0.105, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2), FUR);
  lid.position.set(ex, 0.045, 0.385); lid.scale.set(1.12, 0.95, 0.62); lid.rotation.x = 0.5;
  eyesOpen.add(lid);
  const arc = mesh(new THREE.TorusGeometry(0.075, 0.014, 8, 16, Math.PI), mat(0x3a2414));
  arc.position.set(ex, 0.03, 0.44);
  eyesHappy.add(arc);
}
eyesHappy.visible = false;
head.add(eyesOpen, eyesHappy);
const ears = [];
for (const sx of [-1, 1]) {
  const ear = new THREE.Group();
  const outer = mesh(new THREE.ConeGeometry(0.15, 0.22, 18), FUR);
  const inner = mesh(new THREE.ConeGeometry(0.09, 0.15, 12), PINK);
  inner.position.set(0, -0.02, 0.05);
  ear.add(outer, inner, blob(0.06, CREAM, 0, -0.06, 0.08, 1, 1.4, 0.8, 10));
  ear.position.set(sx * 0.36, 0.36, -0.02);
  ear.rotation.z = -sx * 0.75;
  head.add(ear); ears.push(ear);
}
const whiskerMat = new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9 });
for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
  head.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(sx * 0.16, -0.13, 0.46), new THREE.Vector3(sx * 0.6, -0.1 - k * 0.06, 0.5), new THREE.Vector3(sx * 0.92, -0.2 - k * 0.1, 0.36)]), whiskerMat));
}
const tailRoot = new THREE.Group();
tailRoot.position.set(0.45, 0.22, -0.6);
tailRoot.rotation.y = -1.3;
cat.add(tailRoot);
const tailSegs = [];
let tailParent = tailRoot;
for (let i = 0; i < 9; i++) {
  const seg = new THREE.Group();
  seg.position.set(0, 0, i === 0 ? 0 : -0.21);
  seg.add(blob(0.25 - i * 0.008, i % 2 ? FUR : FUR_LIGHT, 0, 0, -0.1, 1.05, 1, 1.3, 16));
  tailParent.add(seg); tailSegs.push(seg); tailParent = seg;
}
cat.position.set(5.4, 0, -1.6);
cat.rotation.y = -0.35;
cat.scale.setScalar(0.92);
scene.add(cat);
// Petting: happy eyes, purr, floating hearts
const heartTex = canvasTex(128, 128, (g) => { g.fillStyle = "#ff5c8a"; g.font = "100px serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("♥", 64, 70); }).tex;
const hearts = [];
let catPetUntil = 0, catMood = 0;
interactive(cat, "pet me? 🥺", () => {
  catPetUntil = performance.now() + 2600;
  Sound.purr();
  for (let i = 0; i < 5; i++) {
    const h = new THREE.Sprite(new THREE.SpriteMaterial({ map: heartTex, transparent: true, depthWrite: false }));
    h.scale.setScalar(0.45);
    h.position.copy(cat.position).add(new THREE.Vector3((Math.random() - 0.5) * 1.6, CAT_HEIGHT + 0.4, (Math.random() - 0.5) * 0.6));
    h.userData = { life: 0, delay: i * 0.12, vx: (Math.random() - 0.5) * 0.01 };
    scene.add(h); hearts.push(h);
  }
});

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
  const spots = [[-2.4, 4.8, 0.3], [0.9, 5.5, -0.18], [5.4, 5.7, 0.15], [-6.6, 0.6, -0.3], [-0.6, -2.9, 0.1], [-6.4, 0.6, -0.2]];
  const [fx, fz, fr] = spots[i % spots.length];
  f.position.set(fx, 0, fz);
  f.rotation.y = fr;
  projectFiles.add(f);
  interactive(f, `📁 ${p.title}`, () => { Sound.click(); boot("work"); });
});
projectFiles.position.set(0, 0.08, 0);

scene.add(projectFiles);

// 2c. Smartphone face-up on the desk
const phone = new THREE.Group();
const phoneBody = rbox(1.05, 0.1, 2.15, 0.16, SILVER, 6);
phoneBody.position.y = 0.05;
const phoneGlass = rbox(1.0, 0.012, 2.1, 0.15, mat(0x0b0b0c, { roughness: 0.08, clearcoat: 1 }), 4);
phoneGlass.position.y = 0.105;
const phoneScreenTex = canvasTex(256, 540, (g, w, h) => {
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
const phoneScreen = new THREE.Mesh(new THREE.PlaneGeometry(0.94, 2.02), new THREE.MeshBasicMaterial({ map: phoneScreenTex.tex, toneMapped: false }));
phoneScreen.rotation.x = -Math.PI / 2; phoneScreen.position.y = 0.113;
phone.add(phoneBody, phoneGlass, phoneScreen);
phone.position.set(3.4, 0, 4.4);
phone.rotation.y = 0.5;
scene.add(phone);
interactive(phone, "New message — say hello", () => { Sound.click(); boot("contact"); });

// 2d. Things from Sijo's real desk: plant in a white pot, green water bottle, black soundbar
const plant = new THREE.Group();
const pot2 = mesh(new THREE.CylinderGeometry(0.75, 0.6, 1.2, 32), mat(0xf4f4f2, { roughness: 0.5, clearcoat: 0.3 }));
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
const bottleMat = new THREE.MeshPhysicalMaterial({ color: 0x3e9a62, roughness: 0.1, transmission: 0.55, thickness: 0.4, transparent: true, opacity: 0.85 });
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

// 3. Headphones — left back (sound toggle)
const phones = new THREE.Group();
// Lying flat: the headband rests on the desk and the ear cups sit face-down on their cushions
const band = mesh(new THREE.TorusGeometry(0.78, 0.08, 12, 40, Math.PI), SILVER);
band.rotation.x = -Math.PI / 2; band.position.y = 0.2;
const bandPad = mesh(new THREE.TorusGeometry(0.78, 0.065, 10, 30, Math.PI * 0.5), mat(0xf2f2f2, { roughness: 0.95 }));
bandPad.rotation.set(-Math.PI / 2, 0, Math.PI * 0.25); bandPad.position.y = 0.2;
const padMat = mat(0xf2f2f2, { roughness: 0.95 });
const cupMat = SILVER;
const cups = [-1, 1].map((sx) => {
  const g = new THREE.Group();
  const pad = mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 28), padMat);
  pad.position.y = 0.06;
  const cup = rbox(0.62, 0.22, 0.78, 0.2, cupMat, 5);
  cup.position.y = 0.23;
  g.add(pad, cup);
  g.position.set(sx * 0.82, 0, 0.12);
  g.rotation.y = sx * 0.15;
  return g;
});
phones.add(band, bandPad, ...cups);
phones.position.set(6.3, 0, -2.0); // back-right: between the pen stand and the cat
phones.rotation.y = 0.35;
scene.add(phones);
interactive(phones, "Sound on / off", () => $("#soundBtn").click());

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
  g.fillStyle = "#1d1d1f"; g.font = `700 40px ${UI}`; g.fillText("Weekend", 40, h * 0.86); g.font = `400 26px ${UI}`; g.fillText("sketches · hobbies · notes", 40, h * 0.95);
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
interactive(books, "My weekend sketchbook", () => { Sound.click(); boot("about"); });

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



/* ───────────────────────── Floor typography ───────────────────────── */
// Name block — right
const nameLines = (dark) => [
  { text: S.name + ".", size: 210, weight: 700, spacing: -0.03, color: dark ? "#f5f5f7" : "#1d1d1f" },
  { text: S.title, size: 112, weight: 500, color: dark ? "#d1d1d6" : "#48484a", spacing: -0.01 },
];
const nameBlock = floorText(nameLines(true), { width: 8.4, gap: 1.2 });
nameBlock.position.set(6.6, 9.4, WALL_Z + 0.03);
nameBlock.rotation.x = 0; // hung on the wall like studio lettering
nameBlock.rotation.z = 0;
scene.add(nameBlock);
interactive(nameBlock, "About me", () => boot("about"));

// Roles strip — under the name
const half = Math.ceil(S.roles.length / 2);
const roleLines = (dark) => [
  { text: S.roles.slice(0, half).join("  ·  "), size: 92, weight: 500, color: dark ? "#aeaeb2" : "#636366", spacing: 0 },
  { text: S.roles.slice(half).join("  ·  "), size: 92, weight: 500, color: dark ? "#aeaeb2" : "#636366", spacing: 0 }
];
const rolesBlock = floorText(roleLines(true), { width: 8.4, gap: 1.4 });
rolesBlock.position.set(6.6, 7.2, WALL_Z + 0.03);
rolesBlock.rotation.x = 0;
scene.add(rolesBlock);

/* ───────────────────────── Light / dark mode (the pendant lamp is the switch) ─────────────────────────
   Lamp on  → light appearance: warm cream walls, lamp glowing, light glass UI.
   Lamp off → dark appearance: charcoal walls, cool moonlight, dark glass UI.   */
const MODES = {
  // wall = Sijo's room paint: warm buttery yellow-beige (sampled from his wall photo ≈ #E4D3AB on screen)
  light: { bg: 0xd9c690, wall: 0xe8cf8c, skirt: 0xc9b37a, hemi: 0.85, hemiG: 0xbfa978, sun: 2.0, sunC: 0xfff1d8, rim: 0.35, lamp: 60, bulb: 1, exposure: 0.95 },
  dark:  { bg: 0x1d1d1f, wall: 0x2c2b2a, skirt: 0x232221, hemi: 0.45, hemiG: 0x2a2a2e, sun: 1.1, sunC: 0x9fb4ff, rim: 0.5, lamp: 0, bulb: 0, exposure: 1.05 }
};
const nameMaps = {
  light: floorText(nameLines(false), { width: 8.4, gap: 1.2 }).material.map, dark: nameBlock.material.map
};
const roleMaps = {
  light: floorText(roleLines(false), { width: 8.4, gap: 1.4 }).material.map, dark: rolesBlock.material.map
};
let lightsOn;
try { lightsOn = localStorage.getItem("lamp") ? localStorage.getItem("lamp") === "on" : !matchMedia("(prefers-color-scheme: dark)").matches; } catch (_) { lightsOn = true; }
let modeMix = lightsOn ? 1 : 0;     // 1 = light, 0 = dark (animated)
const _ca = new THREE.Color(), _cb = new THREE.Color();
const lerpC = (target, a, b, k) => target.copy(_ca.setHex(a)).lerp(_cb.setHex(b), k);
function applyMode(k, flicker = 1) {
  const D = MODES.dark, L = MODES.light, f = (a, b) => a + (b - a) * k;
  lerpC(scene.background, D.bg, L.bg, k);
  scene.fog.color.copy(scene.background);
  lerpC(wall.material.color, D.wall, L.wall, k);
  lerpC(skirting.material.color, D.skirt, L.skirt, k);
  hemi.intensity = f(D.hemi, L.hemi); lerpC(hemi.groundColor, D.hemiG, L.hemiG, k);
  sun.intensity = f(D.sun, L.sun); lerpC(sun.color, D.sunC, L.sunC, k);
  rim.intensity = f(D.rim, L.rim);
  lampLight.intensity = f(D.lamp, L.lamp) * flicker;
  bulb.material.color.setRGB(1, 0.83, 0.6).multiplyScalar(0.25 + 0.75 * k * flicker);
  glowSprite.material.opacity = k * flicker;
  renderer.toneMappingExposure = f(D.exposure, L.exposure);
  const light = k > 0.5;
  nameBlock.material.map = light ? nameMaps.light : nameMaps.dark;
  rolesBlock.material.map = light ? roleMaps.light : roleMaps.dark;
}
function setLights(on, animate = true) {
  lightsOn = on;
  try { localStorage.setItem("lamp", on ? "on" : "off"); } catch (_) {}
  document.body.classList.toggle("appearance-light", on);
  document.body.classList.toggle("appearance-dark", !on);
  window.OS.setDark(!on);
  if (lamp.userData.hover) lamp.userData.hover.label = on ? "Turn the light off 🌙" : "Turn the light on 💡";
  modeAnim = animate ? { from: modeMix, to: on ? 1 : 0, start: performance.now() } : null;
  if (!animate) { modeMix = on ? 1 : 0; applyMode(modeMix); }
}
let modeAnim = null;
function stepMode(now) {
  if (!modeAnim) return;
  const k = Math.min(1, (now - modeAnim.start) / 700), e = k * k * (3 - 2 * k);
  modeMix = modeAnim.from + (modeAnim.to - modeAnim.from) * e;
  // a short filament flicker when the lamp switches on
  const flick = modeAnim.to === 1 && k < 0.5 ? (Math.sin(now * 0.09) > 0.2 ? 1 : 0.35) : 1;
  applyMode(modeMix, flick);
  if (k === 1) modeAnim = null;
}
interactive(lamp, "", () => { Sound.click(); setLights(!lightsOn); });
setLights(lightsOn, false);


// Menu — left front (each word is its own clickable label)
const menu = [["Work", "work"], ["Skills", "skills"], ["Resume", "resume"], ["Contact", "contact"]];
menu.forEach(([label, key], i) => {
  const m = floorText([{ text: label + " ›", size: 160, weight: 600, spacing: -0.02 }], { width: 2.6 });
  m.position.set(-7.2 + i * 0.25, 0.08, 3.4 + i * 0.8);   // on the desk mat
  scene.add(m);
  interactive(m, `Open ${label.toLowerCase()}`, () => boot(key));
});

// "Let's connect" — left back, with three tiles
const connect = floorText([{ text: "Let's connect.", size: 130, weight: 600, spacing: -0.02, color: "#f5f5f7" }], { width: 4.4, bg: "rgba(18,18,20,.82)" });
connect.position.set(-6.9, 0.03, -2.0);
scene.add(connect);
const tileDefs = [["@", "Email", S.links.mail], ["in", "LinkedIn", S.links.linkedin], ["Bē", "Behance", S.links.behance]];
tileDefs.forEach(([glyph, label, url], i) => {
  const { tex } = canvasTex(256, 256, (g) => {
    g.fillStyle = "#1d1d1f"; g.font = `700 112px ${UI}`; g.textAlign = "center"; g.textBaseline = "middle";
    g.fillText(glyph, 128, 136);
  });
  const tile = new THREE.Group();
  const block = rbox(0.9, 0.18, 0.9, 0.08, PLASTIC);
  block.position.y = 0.09;
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7), new THREE.MeshStandardMaterial({ map: tex, transparent: true }));
  face.rotation.x = -Math.PI / 2; face.position.y = 0.185;
  tile.add(block, face);
  tile.position.set(-8.0 + i * 1.15, 0, -1.0);
  scene.add(tile);
  interactive(tile, label, () => { Sound.click(); window.open(url, url.startsWith("mailto:") ? "_self" : "_blank", "noopener"); });
});

/* ───────────────────────── Live screen (macOS-style desktop) ───────────────────────── */
let screenMode = "idle", typed = "", typeTimer = 0;
const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
const DOCK_COLORS = [["#64d2ff", "#0a84ff"], ["#ffd60a", "#ff9f0a"], ["#bf5af2", "#5e5ce6"], ["#8e8e93", "#48484a"], ["#30d158", "#00a86b"]];
function drawScreen(t) {
  const g = screenCanvas.g, W = screenCanvas.canvas.width, H = screenCanvas.canvas.height;
  // Wallpaper: soft, slowly drifting colour blobs (original)
  g.fillStyle = "#4b3fd1"; g.fillRect(0, 0, W, H);
  const blobs = [[0.15, 0.25, "#7d6cff"], [0.85, 0.15, "#ff8fb1"], [0.8, 0.9, "#ffb36b"], [0.2, 0.95, "#3fc6ff"], [0.5, 0.5, "#e46aa0"]];
  blobs.forEach(([bx, by, c], i) => {
    const x = (bx + Math.sin(t * 0.25 + i) * 0.04) * W, y = (by + Math.cos(t * 0.2 + i * 2) * 0.04) * H;
    const rg = g.createRadialGradient(x, y, 0, x, y, W * 0.55);
    rg.addColorStop(0, c); rg.addColorStop(1, c + "00");
    g.fillStyle = rg; g.fillRect(0, 0, W, H);
  });
  const dark = !lightsOn;
  if (dark) { g.fillStyle = "rgba(0,0,0,0.28)"; g.fillRect(0, 0, W, H); }
  // Menu bar — transparent, text straight on the wallpaper (macOS 27)
  g.save(); g.shadowColor = "rgba(0,0,0,0.35)"; g.shadowBlur = 6;
  g.fillStyle = "#fff"; g.textBaseline = "middle"; g.textAlign = "left";
  g.font = `800 13px ${UI}`; g.fillText("SJ", 14, 14);
  g.font = `700 13px ${UI}`; g.fillText("Portfolio", 42, 14);
  g.font = `400 13px ${UI}`;
  ["About", "Work", "Skills", "Contact"].forEach((m, i) => g.fillText(m, 114 + i * 60, 14));
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
    const bw = 420, bh = 210, bx = (W - bw) / 2, by = 116;
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
    g.fillStyle = "#fff"; g.font = `600 14px ${UI}`; g.fillText("Click to open", cx, by + 156);
  } else if (screenMode === "typing") {
    const bw = 460, bh = 170, bx = (W - bw) / 2, by = 130;
    glass(bx, by, bw, bh, 22, "rgba(28,28,30,0.92)");
    ["#ff5f57", "#febc2e", "#28c840"].forEach((c, i) => { g.fillStyle = c; g.beginPath(); g.arc(bx + 22 + i * 17, by + 22, 5.5, 0, 7); g.fill(); });
    g.fillStyle = "#a1a1a6"; g.textAlign = "center"; g.font = `600 12px ${UI}`; g.fillText("Terminal", W / 2, by + 22);
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
function moveCamera(toPos, toTarget, toZoom, dur = 1100, done) {
  const from = { pos: camera.position.clone(), target: controls.target.clone(), zoom: camera.zoom };
  const start = performance.now();
  controls.enabled = false;
  tween = (now) => {
    let k = Math.min(1, (now - start) / (reduced ? 1 : dur));
    const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
    camera.position.lerpVectors(from.pos, toPos, e);
    controls.target.lerpVectors(from.target, toTarget, e);
    camera.zoom = THREE.MathUtils.lerp(from.zoom, toZoom, e);
    camera.updateProjectionMatrix();
    if (k === 1) { tween = null; controls.enabled = true; done && done(); }
  };
}
let booting = false;
function boot(app) {
  if (booting) return;
  booting = true;
  Sound.boot();
  hideTooltip();
  $("#hint").style.opacity = 0;
  const screenWorld = new THREE.Vector3();
  screen.getWorldPosition(screenWorld);
  const v = THREE.MathUtils.degToRad(FOV), hf = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
  const d = Math.max((SCREEN_H * 1.15) / 2 / Math.tan(v / 2), (SCREEN_W * 1.15) / 2 / Math.tan(hf / 2));
  const normal = new THREE.Vector3();
  screen.getWorldDirection(normal);
  moveCamera(screenWorld.clone().addScaledVector(normal, d), screenWorld, 1, 1200, () => {
    window.OS.open(app, () => {
      moveCamera(HOME.pos, HOME.target, HOME.zoom, 1100, () => { booting = false; });
    });
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
  if (booting || tween) return;
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
  if (moved > 6) return; // that was a drag, not a click
  const o = pick(e);
  if (o) o.userData.hover.onClick();
});
renderer.domElement.addEventListener("pointerleave", () => { hovered = null; hideTooltip(); });

// Zoom button
let zoomedIn = false;
$("#zoomBtn").addEventListener("click", () => {
  zoomedIn = !zoomedIn;
  Sound.click();
  moveCamera(camera.position.clone(), controls.target.clone(), zoomedIn ? 1.7 : 1, 600);
  $("#zoomIcon").setAttribute("d", zoomedIn ? "M20 20l-3.5-3.5M8 11h6" : "M20 20l-3.5-3.5M8 11h6M11 8v6");
  $("#zoomBtn").setAttribute("aria-label", zoomedIn ? "Zoom out" : "Zoom in");
});

let wiggleT = -1, wiggleObj = null;
function wiggle(o) { wiggleObj = o; wiggleT = 0; }

/* ───────────────────────── Loop ───────────────────────── */
const clock = new THREE.Clock();
let lastScreen = 0;
function loop(now) {
  const t = clock.getElapsedTime();
  if (tween) tween(now);
  stepMode(now);
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

  if (!reduced) {
    // cat: tail sways; on hover it swishes faster, head tilts, ears flick; petting = happy eyes
    const catHover = hovered === cat && !booting, petting = now < catPetUntil;
    if (catRig) {   // tail: gentle sway, quicker on hover, big happy swish while petted
      const amp = petting ? 0.75 : catHover ? 0.4 : 0.14, speed = petting ? 9 : catHover ? 6 : 1.8;
      swishTail(catRig, amp, speed, petting ? 5 : 1.5, t);
    }
    catMood += ((catHover ? 1 : 0) - catMood) * 0.08;
    const tSpeed = 1.6 + catMood * 5.5, tAmp = 0.1 + catMood * 0.22;
    tailSegs.forEach((seg, i) => {
      seg.rotation.y = -0.3 + Math.sin(t * tSpeed - i * 0.55) * tAmp;
      seg.rotation.x = i > 5 ? -0.12 - Math.max(0, Math.sin(t * tSpeed - i * 0.5)) * tAmp * 0.8 : 0;
    });
    head.rotation.z = Math.sin(t * 1.2) * 0.04 + catMood * 0.18;
    head.rotation.x = petting ? 0.18 : -catMood * 0.08;
    ears.forEach((ear, i) => { ear.rotation.x = Math.max(0, Math.sin(t * 7 + i * 2)) * 0.25 * catMood; });
    eyesOpen.visible = !petting; eyesHappy.visible = petting;
    catBody.scale.y = 1.38 * (1 + Math.sin(t * (petting ? 6 : 2)) * 0.015);
    // swatch fan
  }
  for (let i = hearts.length - 1; i >= 0; i--) {
    const h = hearts[i], d = h.userData;
    if ((d.delay -= 1 / 60) > 0) { h.material.opacity = 0; continue; }
    d.life += 1 / 60;
    h.position.y += 0.025; h.position.x += d.vx + Math.sin(d.life * 6) * 0.006;
    h.material.opacity = Math.max(0, 1 - d.life / 1.4);
    if (d.life > 1.4) { scene.remove(h); h.material.dispose(); hearts.splice(i, 1); }
  }
  if (ball && Math.abs(ballVX) > 0.001) {
    ball.position.x += ballVX;
    ball.children[0].rotation.z -= ballVX / BALL_R;
    ballVX *= 0.985;
    if ((ball.position.x < -7.6 && ballVX < 0) || (ball.position.x > 1.2 && ballVX > 0)) ballVX *= -0.8; // bounce off the side panel / cubby
  }
  if (wiggleT >= 0) {
    wiggleT += 0.06;
    wiggleObj.rotation.z = Math.sin(wiggleT * 9) * 0.08 * Math.max(0, 1 - wiggleT);
    if (wiggleT > 1) { wiggleObj.rotation.z = 0; wiggleT = -1; }
  }
  if (now - lastScreen > 33) { drawScreen(t); lastScreen = now; }
  renderer.render(scene, camera);
  requestAnimationFrame(loop);
}

addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight);
  fitCamera();
  setZoomLimits();
  if (!booting && !tween) { camera.position.copy(HOME.pos); controls.target.copy(HOME.target); }
});

/* ───────────────────────── Downloaded models (table, cat, ball) ───────────────────────── */
const manager = new THREE.LoadingManager();
manager.onProgress = (url, loaded, total) => setProgress(50 + (loaded / total) * 45, "loading models…");
const shadowsOn = (o) => o.traverse((m) => { if (m.isMesh) { m.castShadow = m.receiveShadow = true; } });

// Table: scaled to the desk footprint, top surface at y = 0; floor + skirting follow its legs

// Fur texture recoloured to ginger: keep the light/dark detail, remap it onto a ginger ramp
function gingerize(img) { return recolor(img, [96, 44, 14], [210, 122, 56], [250, 222, 184]); }
function recolor(img, dark, mid, light) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d"); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    let l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255;
    l = Math.min(1, Math.max(0, (l - 0.06) * 1.4));
    const [a, b, k] = l < 0.6 ? [dark, mid, l / 0.6] : [mid, light, (l - 0.6) / 0.4];
    px[i] = a[0] + (b[0] - a[0]) * k; px[i + 1] = a[1] + (b[1] - a[1]) * k; px[i + 2] = a[2] + (b[2] - a[2]) * k;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c);
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
  const dir = "models/cat/Cat_v1_L3.123cb1b1943a-2f48-4e44-8f71-6bbe19a3ab64/";
  const tl = new THREE.TextureLoader(manager);
  const [obj, diffuse, bump] = await Promise.all([
    new OBJLoader(manager).loadAsync(dir + "12221_Cat_v1_l3.obj"),
    tl.loadAsync(dir + "Cat_diffuse.jpg"),
    tl.loadAsync(dir + "Cat_bump.jpg")
  ]);
  const fur = new THREE.MeshStandardMaterial({ map: gingerize(diffuse.image), bumpMap: bump, bumpScale: 2, roughness: 0.9 });
  obj.traverse((m) => { if (m.isMesh) m.material = fur; });
  // The model has no skeleton, so we pose it by bending its vertices (model space: cm, Z-up, head at −y, tail at +y).
  //  · tail (thin strip behind the rump) → swishes
  obj.traverse((m) => {
    if (!m.isMesh) return;
    m.frustumCulled = false;
    const pos = m.geometry.attributes.position, tail = [], wt = [];
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
  scene.add(holder);
  // swap the procedural cat out, keep the same hover / pet behaviour
  scene.remove(cat);
  const i = hoverables.indexOf(cat);
  holder.userData.hover = { ...cat.userData.hover, base: holder.scale.clone(), lift: 0 };
  hoverables[i] = holder;
  cat = holder;
}
const CAT_FACING = -0.55; // mostly facing the viewer, turned slightly towards the laptop

// Ball on the marble floor — click to kick it
let ball = null, ballVX = 0;
const BALL_R = 1.5; // ≈15 cm across — reads in proportion with the desk
async function loadBall() {
  const dir = "models/football/";
  const tl = new THREE.TextureLoader(manager);
  const [fbx, base, normal, rough] = await Promise.all([
    new FBXLoader(manager).loadAsync(dir + "football.fbx"),
    tl.loadAsync(dir + "BaseColor.jpg"), tl.loadAsync(dir + "Normal.jpg"), tl.loadAsync(dir + "Roughness.jpg")
  ]);
  base.colorSpace = THREE.SRGBColorSpace;
  const leather = new THREE.MeshStandardMaterial({ map: base, normalMap: normal, roughnessMap: rough, roughness: 1, metalness: 0 });
  fbx.traverse((m) => { if (m.isMesh) m.material = leather; });
  const inner = new THREE.Group();
  inner.add(fbx);
  shadowsOn(inner);
  const r = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3()).y / 2;
  inner.scale.setScalar(BALL_R / r);
  const c = new THREE.Box3().setFromObject(inner).getCenter(new THREE.Vector3());
  inner.position.sub(c);
  const spin = new THREE.Group();   // rolling rotation lives here
  spin.add(inner);
  ball = new THREE.Group();
  ball.add(spin);
  ball.position.set(-3.2, floor.position.y + BALL_R, 0.8); // on the floor, tucked under the desk
  scene.add(ball);
  interactive(ball, "Kick me ⚽", () => { Sound.click(); ballVX = (ball.position.x > 0 ? -1 : 1) * 0.4; });
}

async function loadHeadphones() {
  const gltf = await new GLTFLoader(manager).loadAsync("models/headphones/headphones.glb");
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
  holder.position.copy(phones.position);
  holder.rotation.y = -0.25;   // turned slightly towards the viewer
  scene.add(holder);
  scene.remove(phones);
  const i = hoverables.indexOf(phones);
  holder.userData.hover = { ...phones.userData.hover, base: holder.scale.clone(), lift: 0 };
  hoverables[i] = holder;
}

await Promise.allSettled([loadCat(), loadBall(), loadHeadphones()]).then((r) => r.forEach((x) => x.status === "rejected" && console.warn("Model failed to load, using the built-in version:", x.reason)));
if (ball) ball.position.y = floor.position.y + BALL_R; // the table may have moved the floor

/* ───────────────────────── Start ───────────────────────── */
drawScreen(0);
renderer.compile(scene, camera);
setProgress(100, "ready");
requestAnimationFrame(loop);
setTimeout(() => $("#loader").classList.add("done"), 300);
const deep = new URLSearchParams(location.search).get("open");
if (deep) setTimeout(() => boot(deep), 900);
