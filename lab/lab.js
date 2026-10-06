/* Sijo's room, top view — LAB PROTOTYPE (not linked from the main site).
   Layout follows Sijo's reference photo of a compact bedroom seen from above:
   window with blinds (top-left) · bed under it · desk + pegboard (top-right) · rug · leather sofa + coffee table
   (bottom-left) · long black cubby shelf + record player (right) · framed art on the right wall · door (bottom).
   Kept from the current site: his poster, the MacBook, Shea the ginger cat, the football, the plants, day ↔ night.
   Sijo himself walks around (built from his photos: big black curls, beard, lavender plaid overshirt over a white tee,
   light acid-wash jeans, red sneakers, black sling bag). Units: metres. −z = window wall (top of the screen). */
import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/addons/libs/meshopt_decoder.module.js";

const $ = (s) => document.querySelector(s);
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const UI = '-apple-system, BlinkMacSystemFont, "Inter", system-ui, sans-serif';

/* ───────────── Renderer / scene ───────────── */
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
$("#stage").appendChild(renderer.domElement);
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x0c0c0d);
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environmentIntensity = 0.32;
const camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, 0.05, 60);
const maxAniso = renderer.capabilities.getMaxAnisotropy();

/* ───────────── Helpers ───────────── */
function canvasTex(w, h, draw, srgb = true) {
  const c = document.createElement("canvas"); c.width = w; c.height = h;
  draw(c.getContext("2d"), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = maxAniso;
  return t;
}
const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.7, ...o });
const phys = (color, o = {}) => new THREE.MeshPhysicalMaterial({ color, roughness: 0.6, ...o });
function mesh(geo, mtl, cast = true, receive = true) { const m = new THREE.Mesh(geo, mtl); m.castShadow = cast; m.receiveShadow = receive; return m; }
const rbox = (w, h, d, r, mtl, seg = 3) => mesh(new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2, h / 2, d / 2)), mtl);
function box(w, h, d, mtl) { return mesh(new THREE.BoxGeometry(w, h, d), mtl); }
function at(o, x, y, z, ry = 0) { o.position.set(x, y, z); o.rotation.y = ry; return o; }
const rand = (a, b) => a + Math.random() * (b - a);
let seed = 7; const srand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);   // repeatable randomness for textures

// soft contact shadow under furniture (cheap ambient occlusion)
const aoTex = canvasTex(128, 128, (g, w, h) => {
  const gr = g.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
  gr.addColorStop(0, "rgba(0,0,0,0.55)"); gr.addColorStop(0.55, "rgba(0,0,0,0.32)"); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr; g.fillRect(0, 0, w, h);
}, false);
function contact(x, z, w, d, strength = 1, y = 0.002) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: aoTex, transparent: true, opacity: strength, depthWrite: false }));
  m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.renderOrder = 1; scene.add(m); return m;
}

/* ───────────── Interactivity registry ───────────── */
const hoverables = [];
function interactive(obj, label, onClick) { obj.userData.hover = { label, onClick, lift: 0 }; hoverables.push(obj); return obj; }

/* ───────────── Room shell ───────────── */
const W = 2.7, L = 4.5, WH = 2.5, WT = 0.12;           // inner width / length, wall height, wall thickness
const X0 = -W / 2, X1 = W / 2, Z0 = -L / 2, Z1 = L / 2;
const WIN = { x0: -1.22, x1: 0.28, y0: 0.82, y1: 2.28 };  // window opening in the top wall (above the bed)
const DOOR = { x0: -0.46, x1: 0.46 };                     // doorway in the bottom wall

// dark grey oak planks running the length of the room
const floorTex = canvasTex(1536, 2560, (g, w, h) => {
  const planks = 16, pw = w / planks;
  for (let i = 0; i < planks; i++) {
    let y = -srand() * 900;
    while (y < h) {
      const len = 600 + srand() * 900, tone = 52 + srand() * 16;
      g.fillStyle = `rgb(${tone},${tone + 1},${tone + 3})`; g.fillRect(i * pw, y, pw, len);
      for (let k = 0; k < 26; k++) {   // grain
        const gx = i * pw + srand() * pw, a = 0.04 + srand() * 0.07;
        g.strokeStyle = srand() > 0.5 ? `rgba(0,0,0,${a})` : `rgba(255,255,255,${a * 0.6})`; g.lineWidth = 0.6 + srand() * 1.4;
        g.beginPath(); g.moveTo(gx, y);
        for (let s = 0; s <= len; s += 40) g.lineTo(gx + Math.sin((s + gx) * 0.012) * (2 + srand() * 3), y + s);
        g.stroke();
      }
      g.fillStyle = "rgba(0,0,0,0.55)"; g.fillRect(i * pw, y, pw, 2.5);   // butt joint
      y += len;
    }
    g.fillStyle = "rgba(0,0,0,0.6)"; g.fillRect(i * pw, 0, 2, h);          // seam
  }
});
const floorMat = phys(0xffffff, { map: floorTex, roughness: 0.62, clearcoat: 0.18, clearcoatRoughness: 0.5 });
const floor = mesh(new THREE.PlaneGeometry(W, L), floorMat, false, true);
floor.rotation.x = -Math.PI / 2; scene.add(floor);

// entry: light floor + black frame in the doorway and the hall beyond it (as in the reference)
const entry = new THREE.Group(); scene.add(entry);
{
  const hall = mesh(new THREE.PlaneGeometry(1.5, 0.9), std(0xe9e9ea, { roughness: 0.85 }), false, true);
  hall.rotation.x = -Math.PI / 2; hall.position.set(0, 0.001, Z1 + 0.42); entry.add(hall);
  const frameMat = std(0x111113, { roughness: 0.5 });
  for (const [w, d, x, z] of [[0.05, 0.75, DOOR.x0 - 0.02, Z1 + 0.3], [0.05, 0.75, DOOR.x1 + 0.02, Z1 + 0.3], [DOOR.x1 - DOOR.x0 + 0.09, 0.05, 0, Z1 + 0.66]]) {
    const b = box(w, 0.012, d, frameMat); b.position.set(x, 0.006, z); entry.add(b);
  }
  const lever = new THREE.Group();
  const rose = mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.01, 24), frameMat); rose.rotation.z = Math.PI / 2;
  const arm = rbox(0.012, 0.016, 0.12, 0.006, frameMat); arm.position.set(0.01, 0, 0.05);
  lever.add(rose, arm); lever.position.set(DOOR.x0 + 0.1, 0.012, Z1 + 0.05); lever.rotation.z = Math.PI / 2; entry.add(lever);
}

const wallTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 14000; i++) { g.fillStyle = `rgba(0,0,0,${srand() * 0.035})`; g.fillRect(srand() * w, srand() * h, 2, 2); }
});
wallTex.wrapS = wallTex.wrapT = THREE.RepeatWrapping; wallTex.repeat.set(3, 3);
const wallMat = std(0xcfd0d2, { map: wallTex, roughness: 0.95 });
const capMat = std(0xf4f4f5, { roughness: 0.8 });
const skirtMat = std(0xe2e3e5, { roughness: 0.6 });
// a wall segment from (ax,az) to (bx,bz) between heights y0..y1, thickness outward
function wallSeg(ax, az, bx, bz, y0 = 0, y1 = WH, cap = true) {
  const len = Math.hypot(bx - ax, bz - az), ang = Math.atan2(bz - az, bx - ax);
  const g = new THREE.Group(); g.position.set((ax + bx) / 2, 0, (az + bz) / 2); g.rotation.y = -ang;
  const m = box(len, y1 - y0, WT, wallMat); m.position.set(0, (y0 + y1) / 2, -WT / 2); g.add(m);   // local −z = outward (walls are built clockwise)
  if (cap) { const c = box(len + WT * 0.0, 0.004, WT, capMat); c.position.set(0, y1 + 0.002, -WT / 2); c.castShadow = false; g.add(c); }
  if (y0 === 0) { const s = box(len, 0.07, 0.012, skirtMat); s.position.set(0, 0.035, 0.006); g.add(s); }
  scene.add(g); return g;
}
// top wall (window wall) — around the window opening
wallSeg(X0 - WT, Z0, WIN.x0, Z0); wallSeg(WIN.x1, Z0, X1 + WT, Z0);
wallSeg(WIN.x0, Z0, WIN.x1, Z0, 0, WIN.y0, false); wallSeg(WIN.x0, Z0, WIN.x1, Z0, WIN.y1, WH);
// right, bottom (around the door), left
wallSeg(X1, Z0 - WT, X1, Z1 + WT);
wallSeg(X1 + WT, Z1, DOOR.x1, Z1); wallSeg(DOOR.x0, Z1, X0 - WT, Z1);
wallSeg(X0, Z1 + WT, X0, Z0 - WT);

/* ───────────── Window: blinds, sky, sill ───────────── */
const skyTex = (night) => canvasTex(1024, 1024, (g, w, h) => {
  const lg = g.createLinearGradient(0, 0, 0, h);
  if (night) { lg.addColorStop(0, "#04081a"); lg.addColorStop(1, "#1b2a4d"); } else { lg.addColorStop(0, "#2a78d4"); lg.addColorStop(0.6, "#64a8e8"); lg.addColorStop(1, "#b5daf6"); }
  g.fillStyle = lg; g.fillRect(0, 0, w, h);
  if (night) {
    for (let i = 0; i < 300; i++) { g.fillStyle = `rgba(255,255,255,${0.3 + Math.random() * 0.7})`; g.fillRect(Math.random() * w, Math.random() * h * 0.7, 2.4, 2.4); }
    g.fillStyle = "#f4f2e6"; g.beginPath(); g.arc(w * 0.72, h * 0.22, 42, 0, 7); g.fill();
  } else {
    const cloud = (cx, cy, s) => { for (const [dx, dy, r] of [[0, 0, 1], [-0.9, 0.25, 0.7], [0.95, 0.2, 0.75], [-0.4, -0.45, 0.75], [0.45, -0.4, 0.8]]) {
      const x = cx + dx * s, y = cy + dy * s, R = r * s, cg = g.createRadialGradient(x - R * 0.2, y - R * 0.35, R * 0.1, x, y, R);
      cg.addColorStop(0, "#fff"); cg.addColorStop(0.7, "rgba(246,249,253,.95)"); cg.addColorStop(1, "rgba(214,226,240,0)"); g.fillStyle = cg; g.beginPath(); g.arc(x, y, R, 0, 7); g.fill(); } };
    cloud(w * 0.25, h * 0.3, 80); cloud(w * 0.7, h * 0.5, 60); cloud(w * 0.5, h * 0.15, 36);
  }
});
const skyGeo = new THREE.PlaneGeometry(WIN.x1 - WIN.x0 + 0.1, WIN.y1 - WIN.y0 + 0.1);
const skyDay = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: skyTex(false), toneMapped: false }));
const skyNight = new THREE.Mesh(skyGeo, new THREE.MeshBasicMaterial({ map: skyTex(true), toneMapped: false, transparent: true, opacity: 0 }));
for (const s of [skyDay, skyNight]) { s.position.set((WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, Z0 - WT - 0.01); scene.add(s); }
skyNight.position.z += 0.01;
const sill = rbox(WIN.x1 - WIN.x0 + 0.08, 0.03, 0.2, 0.01, capMat); at(sill, (WIN.x0 + WIN.x1) / 2, WIN.y0, Z0 + 0.04); scene.add(sill);
const blindMat = std(0xf2f2f0, { roughness: 0.55 });
const blinds = new THREE.Group(); scene.add(blinds);
const SLATS = 52, slatGeo = new RoundedBoxGeometry(WIN.x1 - WIN.x0 - 0.04, 0.003, 0.03, 1, 0.0015);
const slatInst = new THREE.InstancedMesh(slatGeo, blindMat, SLATS); slatInst.castShadow = true; slatInst.receiveShadow = true;
const _d = new THREE.Object3D();
function setBlinds(tilt) {
  for (let i = 0; i < SLATS; i++) {
    _d.position.set((WIN.x0 + WIN.x1) / 2, WIN.y1 - 0.05 - i * ((WIN.y1 - WIN.y0 - 0.08) / SLATS), Z0 - 0.04);
    _d.rotation.set(tilt, 0, 0); _d.updateMatrix(); slatInst.setMatrixAt(i, _d.matrix);
  }
  slatInst.instanceMatrix.needsUpdate = true;
}
setBlinds(0.55);
blinds.add(slatInst);
const headrail = rbox(WIN.x1 - WIN.x0, 0.05, 0.06, 0.01, blindMat); at(headrail, (WIN.x0 + WIN.x1) / 2, WIN.y1 - 0.02, Z0 - 0.04); blinds.add(headrail);
const windowHit = new THREE.Mesh(new THREE.BoxGeometry(WIN.x1 - WIN.x0, WIN.y1 - WIN.y0, 0.1), new THREE.MeshBasicMaterial({ visible: false }));
at(windowHit, (WIN.x0 + WIN.x1) / 2, (WIN.y0 + WIN.y1) / 2, Z0 - 0.02); scene.add(windowHit);

/* ───────────── Bed (top-left, head under the window) ───────────── */
const BED = { x: X0 + 0.5, z: -0.95, w: 0.95, l: 2.0 };
const bed = new THREE.Group(); at(bed, BED.x, 0, BED.z); scene.add(bed);
{
  const metal = std(0x161618, { roughness: 0.45, metalness: 0.6 });
  const rail = (w, d, x, z) => { const r = box(w, 0.06, d, metal); r.position.set(x, 0.26, z); bed.add(r); };
  rail(BED.w + 0.04, 0.04, 0, -BED.l / 2); rail(BED.w + 0.04, 0.04, 0, BED.l / 2); rail(0.04, BED.l, -BED.w / 2, 0); rail(0.04, BED.l, BED.w / 2, 0);
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = box(0.04, 0.26, 0.04, metal); leg.position.set(x * BED.w / 2, 0.13, z * BED.l / 2); bed.add(leg); }
  const headboard = rbox(BED.w + 0.04, 0.5, 0.04, 0.01, metal); headboard.position.set(0, 0.55, -BED.l / 2 - 0.01); bed.add(headboard);
  const sheet = phys(0xeeeeec, { roughness: 0.92, sheen: 0.6, sheenColor: new THREE.Color(0xffffff) });
  const mattress = rbox(BED.w - 0.02, 0.2, BED.l - 0.04, 0.05, sheet, 4); mattress.position.set(0, 0.39, 0); bed.add(mattress);
  // duvet: a cloth sheet draped over the lower two-thirds, with wrinkles; a white fold at its top edge
  const drape = (w, l, color, z0, fold) => {
    const g = new THREE.PlaneGeometry(w + 0.36, l, 60, 70); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), over = Math.max(0, Math.abs(x) - w / 2);
      let y = 0.535 + 0.012 * Math.sin(x * 23 + z * 7) * Math.sin(z * 11 - x * 5) + 0.006 * Math.sin(x * 41 + z * 31);
      y += fold ? 0.02 * Math.cos(z * Math.PI / l) : 0;
      const nx = Math.sign(x) * (w / 2 + Math.sin(Math.min(over, 0.16) / 0.16 * Math.PI / 2) * 0.03);
      p.setXYZ(i, over > 0 ? nx : x, over > 0 ? y - over * 1.6 : y, z);
    }
    g.computeVertexNormals();
    const m = mesh(g, phys(color, { roughness: 0.95, sheen: 0.8, sheenColor: new THREE.Color(color).multiplyScalar(2.2) }));
    m.position.z = z0; bed.add(m); return m;
  };
  drape(BED.w, 1.15, 0x252527, 0.4, false);
  drape(BED.w, 0.26, 0xededeb, -0.27, true).position.y = 0.012;
  const pillow = (color, x, z, ry, rz, y = 0.58, w = 0.6, d = 0.4) => {
    const p = rbox(w, 0.12, d, 0.055, phys(color, { roughness: 0.95, sheen: 0.7, sheenColor: new THREE.Color(0x888888) }), 5);
    p.scale.set(1, 1, 1); p.position.set(x, y, z); p.rotation.set(0.1, ry, rz); bed.add(p);
  };
  pillow(0xf1f1ef, 0.06, -0.8, 0.0, 0.02, 0.56, 0.72, 0.36);
  pillow(0x202022, -0.2, -0.72, 0.28, 0.05, 0.64, 0.42, 0.3);
  pillow(0x2a2a2c, 0.06, -0.55, -0.5, -0.06, 0.66, 0.42, 0.3);
}
contact(BED.x, BED.z, BED.w + 0.35, BED.l + 0.3, 0.9);

/* ───────────── Desk (top-right) ───────────── */
const DESK = { x0: -0.18, x1: X1 - 0.02, z0: Z0 + 0.01, z1: Z0 + 0.66, h: 0.75 };
const DX = (DESK.x0 + DESK.x1) / 2, DZ = (DESK.z0 + DESK.z1) / 2, DW = DESK.x1 - DESK.x0, DD = DESK.z1 - DESK.z0;
const desk = new THREE.Group(); scene.add(desk);
const black = std(0x1a1a1c, { roughness: 0.55 }), blackSoft = std(0x232326, { roughness: 0.8 });
{
  const top = rbox(DW, 0.035, DD, 0.006, black); top.position.set(DX, DESK.h - 0.0175, DZ); desk.add(top);
  for (const x of [DESK.x0 + 0.03, DESK.x1 - 0.03]) { const side = box(0.03, DESK.h - 0.035, DD - 0.04, black); side.position.set(x, (DESK.h - 0.035) / 2, DZ); desk.add(side); }
  const drawers = rbox(0.36, 0.56, 0.5, 0.01, std(0xe8e8e8, { roughness: 0.5 })); drawers.position.set(DESK.x0 + 0.24, 0.3, DZ + 0.03); desk.add(drawers);
  for (let i = 0; i < 3; i++) { const line = box(0.34, 0.004, 0.004, std(0x9a9a9a)); line.position.set(DESK.x0 + 0.24, 0.13 + i * 0.17, DZ + 0.28); desk.add(line); }
  // hutch: a riser shelf along the back, LED strip under it
  const riser = rbox(DW - 0.06, 0.02, 0.18, 0.004, black); riser.position.set(DX, DESK.h + 0.17, DESK.z0 + 0.1); desk.add(riser);
  for (const x of [DESK.x0 + 0.06, DX - 0.05, DESK.x1 - 0.06]) { const post = box(0.02, 0.17, 0.16, black); post.position.set(x, DESK.h + 0.085, DESK.z0 + 0.1); desk.add(post); }
  const led = new THREE.Mesh(new THREE.BoxGeometry(DW - 0.12, 0.004, 0.01), new THREE.MeshBasicMaterial({ color: 0xffd9a8 })); led.position.set(DX, DESK.h + 0.158, DESK.z0 + 0.2); desk.add(led);
  const ledLight = new THREE.PointLight(0xffc98a, 0.35, 1.4, 1.6); ledLight.position.set(DX, DESK.h + 0.12, DESK.z0 + 0.28); desk.add(ledLight);
  const pad = rbox(0.24, 0.004, 0.2, 0.002, blackSoft); pad.position.set(DESK.x1 - 0.3, DESK.h + 0.002, DZ + 0.12); desk.add(pad);
  const mouse = rbox(0.06, 0.03, 0.1, 0.028, std(0x2c2c2e, { roughness: 0.35 }), 6); mouse.position.set(DESK.x1 - 0.3, DESK.h + 0.018, DZ + 0.13); desk.add(mouse);
  // pencil cup, a small desk clock, a figurine on the riser
  const cup = mesh(new THREE.CylinderGeometry(0.04, 0.036, 0.11, 24, 1, true), std(0x111113, { side: THREE.DoubleSide })); cup.position.set(DESK.x1 - 0.12, DESK.h + 0.055, DESK.z0 + 0.32); desk.add(cup);
  for (const [c, dx, dz, t] of [[0xd9a441, 0.01, 0.0, 0.15], [0xf2f2f2, -0.012, 0.01, -0.12], [0x0a84ff, 0.0, -0.012, 0.05]]) {
    const p = mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.17, 6), std(c)); p.position.set(DESK.x1 - 0.12 + dx, DESK.h + 0.1, DESK.z0 + 0.32 + dz); p.rotation.z = t; desk.add(p);
  }
  const clock = rbox(0.12, 0.07, 0.08, 0.015, std(0xdcdcdc, { roughness: 0.4 })); clock.position.set(DESK.x0 + 0.12, DESK.h + 0.035, DESK.z0 + 0.32); desk.add(clock);
  const fig = new THREE.Group(); const figMat = std(0x1c1c1e, { roughness: 0.3, metalness: 0.5 });
  const fb = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 20), figMat); const fbody = mesh(new THREE.CapsuleGeometry(0.012, 0.06, 4, 8), figMat); fbody.position.y = 0.05;
  const fh = mesh(new THREE.SphereGeometry(0.016, 12, 10), figMat); fh.position.y = 0.1; fig.add(fb, fbody, fh); fig.position.set(DESK.x0 + 0.35, DESK.h + 0.18, DESK.z0 + 0.12); desk.add(fig);
  // small plant in a mango-yellow pot (from Sijo's real desk)
  desk.add(at(plant(0.07, 0xf2b705, 0.16, 7), DESK.x0 + 0.62, DESK.h + 0.18, DESK.z0 + 0.1));
}
contact(DX, DZ + 0.05, DW + 0.2, DD + 0.25, 0.65);

/* the MacBook (Midnight), lid open toward the chair, showing Sijo's wallpaper */
const LAP = { x: DX + 0.02, z: DZ + 0.14 };
const laptop = new THREE.Group(); at(laptop, LAP.x, DESK.h, LAP.z); scene.add(laptop);
const screenCanvas = document.createElement("canvas"); screenCanvas.width = 1280; screenCanvas.height = 832;
const screenTex = new THREE.CanvasTexture(screenCanvas); screenTex.colorSpace = THREE.SRGBColorSpace; screenTex.anisotropy = maxAniso;
function drawScreen(img) {
  const g = screenCanvas.getContext("2d"), w = screenCanvas.width, h = screenCanvas.height;
  if (img) { const s = Math.max(w / img.width, h / img.height); g.drawImage(img, (w - img.width * s) / 2, (h - img.height * s) / 2, img.width * s, img.height * s); }
  else { const lg = g.createLinearGradient(0, 0, w, h); lg.addColorStop(0, "#2b3a55"); lg.addColorStop(1, "#7a5c8e"); g.fillStyle = lg; g.fillRect(0, 0, w, h); }
  g.fillStyle = "rgba(0,0,0,0.25)"; g.fillRect(0, 0, w, 30);
  g.fillStyle = "#fff"; g.font = `600 17px ${UI}`; g.textBaseline = "middle"; g.fillText("", 22, 15); g.font = `500 15px ${UI}`; g.fillText("Sijo Joseph", 52, 15);
  const nw = w * 0.13; g.fillStyle = "#000"; g.beginPath(); g.roundRect(w / 2 - nw / 2, -12, nw, 42, 12); g.fill();   // notch
  g.save(); g.shadowColor = "rgba(0,0,0,.35)"; g.shadowBlur = 30; g.fillStyle = "rgba(246,246,248,.92)"; g.beginPath(); g.roundRect(w * 0.56, h * 0.3, 380, 170, 22); g.fill(); g.restore();
  g.fillStyle = "#1d1d1f"; g.font = `700 34px ${UI}`; g.fillText("Hi, I'm Sijo.", w * 0.56 + 30, h * 0.3 + 56);
  g.fillStyle = "#6e6e73"; g.font = `500 18px ${UI}`; g.fillText("Multidisciplinary designer", w * 0.56 + 30, h * 0.3 + 92);
  g.fillStyle = "#0a84ff"; g.beginPath(); g.roundRect(w * 0.56 + 30, h * 0.3 + 116, 150, 36, 18); g.fill();
  g.fillStyle = "#fff"; g.font = `600 16px ${UI}`; g.fillText("Open my work", w * 0.56 + 48, h * 0.3 + 134);
  screenTex.needsUpdate = true;
}
drawScreen(null);
new THREE.ImageLoader().load("../assets/wallpaper.jpg", drawScreen);
{
  const alu = phys(0x2e3641, { roughness: 0.38, metalness: 0.75, clearcoat: 0.3 });
  const LW = 0.304, LD = 0.215;
  const base = rbox(LW, 0.011, LD, 0.005, alu, 4); base.position.y = 0.0055; laptop.add(base);
  const kb = box(LW * 0.86, 0.001, LD * 0.42, std(0x14161a, { roughness: 0.8 })); kb.position.set(0, 0.0115, -0.02); laptop.add(kb);
  const tp = box(LW * 0.4, 0.001, LD * 0.28, phys(0x39414d, { roughness: 0.3, metalness: 0.6 })); tp.position.set(0, 0.0115, 0.065); laptop.add(tp);
  const lid = new THREE.Group(); lid.position.set(0, 0.011, -LD / 2); lid.rotation.x = -0.32; laptop.add(lid);   // opened ≈ 108°
  const shell = rbox(LW, LD, 0.006, 0.005, alu, 4); shell.position.set(0, LD / 2, -0.003); lid.add(shell);
  const glass = box(LW - 0.004, LD - 0.004, 0.001, std(0x050506, { roughness: 0.15 })); glass.position.set(0, LD / 2, 0.0005); lid.add(glass);
  const scr = new THREE.Mesh(new THREE.PlaneGeometry(LW - 0.016, (LW - 0.016) / 1.538), new THREE.MeshBasicMaterial({ map: screenTex, toneMapped: false }));
  scr.position.set(0, LD - 0.006 - (LW - 0.016) / 1.538 / 2, 0.0012); lid.add(scr);
  const glow = new THREE.PointLight(0xbfd4ff, 0.18, 0.9, 2); glow.position.set(0, 0.15, 0.2); laptop.add(glow);
  laptop.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
}
const laptopHit = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.26, 0.28), new THREE.MeshBasicMaterial({ visible: false })); laptopHit.position.set(0, 0.12, -0.02); laptop.add(laptopHit);

/* office chair, pulled out, facing the desk */
const CHAIR = { x: LAP.x + 0.02, z: DESK.z1 + 0.42 };
const chair = new THREE.Group(); at(chair, CHAIR.x, 0, CHAIR.z, 0.18); scene.add(chair);
{
  const plastic = std(0x1b1b1d, { roughness: 0.5 }), mesh_ = std(0x232325, { roughness: 0.9 });
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2, leg = rbox(0.3, 0.03, 0.045, 0.012, plastic); leg.position.set(Math.cos(a) * 0.15, 0.07, Math.sin(a) * 0.15); leg.rotation.y = -a; chair.add(leg);
    const wheel = mesh(new THREE.SphereGeometry(0.03, 12, 10), plastic); wheel.position.set(Math.cos(a) * 0.29, 0.03, Math.sin(a) * 0.29); chair.add(wheel);
  }
  const post = mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.36, 16), phys(0x8e8e93, { metalness: 0.9, roughness: 0.3 })); post.position.y = 0.26; chair.add(post);
  const seat = rbox(0.5, 0.08, 0.48, 0.04, mesh_, 4); seat.position.y = 0.47; chair.add(seat);
  const back = rbox(0.46, 0.55, 0.06, 0.05, mesh_, 4); back.position.set(0, 0.8, 0.24); back.rotation.x = 0.12; chair.add(back);
  for (const s of [-1, 1]) { const armp = box(0.03, 0.18, 0.03, plastic); armp.position.set(s * 0.25, 0.58, 0.04); chair.add(armp); const armt = rbox(0.06, 0.03, 0.26, 0.012, plastic); armt.position.set(s * 0.25, 0.68, 0.02); chair.add(armt); }
}
contact(CHAIR.x, CHAIR.z, 0.75, 0.75, 0.6);

/* pegboard above the desk */
{
  const pegTex = canvasTex(1024, 512, (g, w, h) => {
    g.fillStyle = "#e9e9ea"; g.fillRect(0, 0, w, h);
    g.fillStyle = "#3a3a3c"; for (let y = 18; y < h; y += 26) for (let x = 18; x < w; x += 26) { g.beginPath(); g.arc(x, y, 4.2, 0, 7); g.fill(); }
  });
  const board = rbox(1.2, 0.6, 0.02, 0.008, std(0xffffff, { map: pegTex, roughness: 0.7 })); at(board, DX + 0.05, 1.42, Z0 + 0.012); scene.add(board);
  const shelfy = rbox(0.3, 0.012, 0.08, 0.004, black); at(shelfy, DX + 0.4, 1.35, Z0 + 0.06); scene.add(shelfy);
  const frame = rbox(0.14, 0.18, 0.012, 0.004, black); at(frame, DX - 0.25, 1.52, Z0 + 0.03); scene.add(frame);
  const frameArt = new THREE.Mesh(new THREE.PlaneGeometry(0.11, 0.15), std(0xf0f0f0)); at(frameArt, DX - 0.25, 1.52, Z0 + 0.037); scene.add(frameArt);
  const phoneHolder = rbox(0.09, 0.16, 0.03, 0.01, std(0x2c2c2e, { roughness: 0.3 })); at(phoneHolder, DX + 0.4, 1.44, Z0 + 0.045); scene.add(phoneHolder);
}

/* ───────────── Rug ───────────── */
const rugTex = canvasTex(512, 1024, (g, w, h) => {
  g.fillStyle = "#3b3c3f"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 26000; i++) { const v = srand(); g.fillStyle = v > 0.5 ? `rgba(255,255,255,${srand() * 0.07})` : `rgba(0,0,0,${srand() * 0.12})`; g.fillRect(srand() * w, srand() * h, 3 + srand() * 6, 2 + srand() * 4); }
  for (let i = 0; i < 60; i++) { g.fillStyle = `rgba(20,20,22,${0.08 + srand() * 0.12})`; g.beginPath(); g.ellipse(srand() * w, srand() * h, 20 + srand() * 70, 10 + srand() * 40, srand() * 3, 0, 7); g.fill(); }
});
const rug = mesh(new THREE.PlaneGeometry(0.85, 2.1), std(0xffffff, { map: rugTex, roughness: 1 }), false, true);
rug.rotation.x = -Math.PI / 2; rug.position.set(-0.03, 0.006, -0.05); scene.add(rug);

/* ───────────── Sofa (bottom-left, black leather) ───────────── */
const SOFA = { x: X0 + 0.38, z: 1.15, d: 0.76, l: 1.62 };
const sofa = new THREE.Group(); at(sofa, SOFA.x, 0, SOFA.z); scene.add(sofa);
{
  const leather = phys(0x141415, { roughness: 0.42, clearcoat: 0.35, clearcoatRoughness: 0.45, sheen: 0.3, sheenColor: new THREE.Color(0x555555) });
  const base = rbox(SOFA.d, 0.22, SOFA.l, 0.04, leather); base.position.set(0, 0.15, 0); sofa.add(base);
  const backrest = rbox(0.2, 0.5, SOFA.l - 0.02, 0.07, leather, 5); backrest.position.set(-SOFA.d / 2 + 0.1, 0.5, 0); sofa.add(backrest);
  for (const s of [-1, 1]) { const arm = rbox(SOFA.d, 0.36, 0.17, 0.07, leather, 5); arm.position.set(0, 0.42, s * (SOFA.l / 2 - 0.085)); sofa.add(arm); }
  for (const s of [-1, 1]) {
    const seat = rbox(0.56, 0.15, (SOFA.l - 0.34) / 2 - 0.01, 0.06, leather, 5); seat.position.set(0.08, 0.33, s * ((SOFA.l - 0.34) / 4 + 0.003)); sofa.add(seat);
    const bc = rbox(0.18, 0.38, (SOFA.l - 0.34) / 2 - 0.01, 0.08, leather, 5); bc.position.set(-SOFA.d / 2 + 0.24, 0.58, s * ((SOFA.l - 0.34) / 4 + 0.003)); bc.rotation.z = -0.12; sofa.add(bc);
  }
  // throw cushion with an "S" (for Sijo), as in the reference
  const sTex = canvasTex(256, 256, (g, w, h) => { g.fillStyle = "#18181a"; g.fillRect(0, 0, w, h); g.fillStyle = "#f2f2f2"; g.font = `800 170px Georgia, serif`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("S", w / 2, h / 2 + 8); });
  const cushion = rbox(0.12, 0.34, 0.34, 0.06, phys(0xffffff, { map: sTex, roughness: 0.9, sheen: 0.6 }), 5);
  cushion.position.set(-0.13, 0.55, -SOFA.l / 2 + 0.34); cushion.rotation.set(0.2, 0.5, -0.25); sofa.add(cushion);
}
contact(SOFA.x + 0.05, SOFA.z, SOFA.d + 0.3, SOFA.l + 0.3, 0.9);

/* ───────────── Coffee table (oak top, steel frame) + camera ───────────── */
const TABLE = { x: -0.24, z: 1.22, w: 0.42, l: 0.72, h: 0.42 };
const table = new THREE.Group(); at(table, TABLE.x, 0, TABLE.z); scene.add(table);
{
  const oakTex = canvasTex(256, 512, (g, w, h) => {
    g.fillStyle = "#b9895c"; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) { const x = srand() * w; g.strokeStyle = `rgba(${srand() > 0.5 ? "90,55,25" : "235,200,150"},${0.1 + srand() * 0.18})`; g.lineWidth = 0.6 + srand() * 2;
      g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + Math.sin(y * 0.02 + x) * 4, y); g.stroke(); }
  });
  const top = rbox(TABLE.w, 0.028, TABLE.l, 0.006, phys(0xffffff, { map: oakTex, roughness: 0.5, clearcoat: 0.25 })); top.position.y = TABLE.h; table.add(top);
  const steel = phys(0xd8d8da, { metalness: 0.9, roughness: 0.28 });
  for (const [x, z] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const leg = mesh(new THREE.CylinderGeometry(0.008, 0.008, TABLE.h, 8), steel); leg.position.set(x * (TABLE.w / 2 - 0.02), TABLE.h / 2, z * (TABLE.l / 2 - 0.02)); table.add(leg); }
  for (const z of [-1, 1]) { const r = box(TABLE.w - 0.04, 0.012, 0.012, steel); r.position.set(0, 0.06, z * (TABLE.l / 2 - 0.02)); table.add(r); }
  const shelf = box(TABLE.w - 0.05, 0.006, TABLE.l - 0.05, steel); shelf.position.y = 0.06; table.add(shelf);
  // a film camera (designer's desk prop)
  const cam = new THREE.Group();
  const body = rbox(0.13, 0.075, 0.055, 0.008, std(0xf2f2f2, { roughness: 0.4 })); body.position.y = 0.0375; cam.add(body);
  const lens = mesh(new THREE.CylinderGeometry(0.026, 0.028, 0.04, 28), std(0x141416, { roughness: 0.3 })); lens.rotation.x = Math.PI / 2; lens.position.set(0.012, 0.035, 0.045); cam.add(lens);
  const glassL = mesh(new THREE.CircleGeometry(0.019, 24), phys(0x1a2433, { roughness: 0.05, metalness: 0.4, clearcoat: 1 })); glassL.position.set(0.012, 0.035, 0.066); cam.add(glassL);
  const dial = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 16), std(0x1a1a1a)); dial.position.set(-0.04, 0.081, 0); cam.add(dial);
  cam.position.set(0.02, TABLE.h + 0.014, -0.05); cam.rotation.set(-Math.PI / 2, 0, 0.5); cam.position.y += 0.03;
  table.add(cam);
  table.traverse((m) => { if (m.isMesh) m.castShadow = m.receiveShadow = true; });
}
contact(TABLE.x, TABLE.z, TABLE.w + 0.2, TABLE.l + 0.2, 0.55);

/* ───────────── Long cubby shelf on the right wall + record player ───────────── */
const SHELF = { x: X1 - 0.2, z0: -0.05, z1: 1.72, d: 0.38, h: 0.95 };
const shelf = new THREE.Group(); scene.add(shelf);
const SZ = (SHELF.z0 + SHELF.z1) / 2, SL = SHELF.z1 - SHELF.z0;
{
  const cubbyTex = canvasTex(256, 1024, (g, w, h) => {
    g.fillStyle = "#1c1c1e"; g.fillRect(0, 0, w, h);
    const n = 5, ch = h / n;
    for (let i = 0; i < n; i++) { const gr = g.createLinearGradient(0, i * ch, 0, (i + 1) * ch); gr.addColorStop(0, "#0a0a0b"); gr.addColorStop(1, "#141416"); g.fillStyle = gr; g.fillRect(12, i * ch + 12, w - 24, ch - 24); }
  });
  const sideMat = std(0xffffff, { map: cubbyTex, roughness: 0.7 });
  const unit = mesh(new THREE.BoxGeometry(SHELF.d, SHELF.h, SL), [black, sideMat, black, black, black, black]);   // box faces: +x −x +y −y +z −z — the cubbies face into the room (−x)
  unit.position.set(SHELF.x, SHELF.h / 2, SZ); shelf.add(unit);
  const T = SHELF.h;
  shelf.add(at(plant(0.09, 0xeeeeee, 0.36, 11, true), SHELF.x, T, SHELF.z0 + 0.14));
  const candle = mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.09, 24), std(0x2a1d14, { roughness: 0.4 })); at(candle, SHELF.x - 0.02, T + 0.045, SHELF.z0 + 0.5); shelf.add(candle);
  const bookCols = [0xf2f2f2, 0xd8d8d8, 0xffffff, 0xbdbdbd, 0xeeeeee, 0x9e9e9e];
  bookCols.forEach((c, i) => { const b = rbox(0.17 + (i % 2) * 0.02, 0.025, 0.24, 0.003, std(c, { roughness: 0.8 })); at(b, SHELF.x - 0.01, T + 0.0125 + i * 0.026, SHELF.z0 + 0.86, (i % 3 - 1) * 0.06); shelf.add(b); });
  const sculpt = mesh(new THREE.TorusKnotGeometry(0.03, 0.011, 64, 8), phys(0xf0f0f0, { roughness: 0.3 })); at(sculpt, SHELF.x, T + 0.045, SHELF.z0 + 1.12); shelf.add(sculpt);
  // globe lamp (warm), glasses beside it
  const globe = mesh(new THREE.SphereGeometry(0.1, 32, 24), new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffe4bf, emissiveIntensity: 1.4, roughness: 0.4 }), false, false);
  at(globe, SHELF.x - 0.02, T + 0.11, SHELF.z0 + 1.45); shelf.add(globe);
  const glassesMat = std(0x111111, { roughness: 0.3 });
  for (const s of [-1, 1]) { const ring = mesh(new THREE.TorusGeometry(0.025, 0.003, 8, 24), glassesMat); ring.rotation.x = Math.PI / 2; at(ring, SHELF.x - 0.1, T + 0.004, SHELF.z0 + 1.3 + s * 0.03); shelf.add(ring); }
  const phone = rbox(0.072, 0.008, 0.147, 0.008, std(0x1c1c1e, { roughness: 0.25 })); at(phone, SHELF.x + 0.06, T + 0.004, SHELF.z0 + 1.28, 0.4); shelf.add(phone);
}
const lampLight = new THREE.PointLight(0xffc27a, 1.1, 3.2, 1.6); lampLight.position.set(SHELF.x - 0.05, SHELF.h + 0.18, SHELF.z0 + 1.45); lampLight.castShadow = true;
lampLight.shadow.mapSize.set(512, 512); lampLight.shadow.bias = -0.002; scene.add(lampLight);
contact(SHELF.x - 0.02, SZ, SHELF.d + 0.22, SL + 0.22, 0.75);

const CRATE = { x: X1 - 0.21, z: SHELF.z1 + 0.25, s: 0.4, h: 0.5 };
const crate = new THREE.Group(); at(crate, CRATE.x, 0, CRATE.z); scene.add(crate);
let platter;
{
  const wire = std(0x161618, { roughness: 0.4, metalness: 0.6 }), r = 0.006, s = CRATE.s / 2, h = CRATE.h;
  for (const [x, z] of [[-s, -s], [s, -s], [-s, s], [s, s]]) { const p = mesh(new THREE.CylinderGeometry(r, r, h, 6), wire); p.position.set(x, h / 2, z); crate.add(p); }
  for (const y of [0.02, h * 0.5, h]) for (const [a, b, rot] of [[0, -s, 0], [0, s, 0], [-s, 0, Math.PI / 2], [s, 0, Math.PI / 2]]) {
    const bar = mesh(new THREE.CylinderGeometry(r, r, CRATE.s, 6), wire); bar.rotation.set(0, rot, Math.PI / 2); bar.position.set(a, y, b); crate.add(bar);
  }
  const vinylSleeves = [0x222222, 0xe0e0e0, 0x8a2b2b, 0x333a44];
  vinylSleeves.forEach((c, i) => { const sl = box(0.31, 0.21, 0.006, std(c)); sl.position.set(0, 0.13, -0.12 + i * 0.07); sl.rotation.x = 0.1; crate.add(sl); });
  const tt = rbox(0.36, 0.09, 0.32, 0.01, std(0x1a1a1c, { roughness: 0.5 })); tt.position.y = h + 0.045; crate.add(tt);
  const vinylTex = canvasTex(512, 512, (g, w, h2) => {
    g.fillStyle = "#0b0b0b"; g.beginPath(); g.arc(w / 2, h2 / 2, w / 2, 0, 7); g.fill();
    for (let rr = 60; rr < w / 2; rr += 3) { g.strokeStyle = `rgba(255,255,255,${0.03 + (rr % 9 === 0 ? 0.04 : 0)})`; g.beginPath(); g.arc(w / 2, h2 / 2, rr, 0, 7); g.stroke(); }
    g.fillStyle = "#e4e4e4"; g.beginPath(); g.arc(w / 2, h2 / 2, 62, 0, 7); g.fill(); g.fillStyle = "#c7262e"; g.font = `800 30px ${UI}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText("SJ", w / 2, h2 / 2);
  });
  platter = mesh(new THREE.CylinderGeometry(0.135, 0.135, 0.006, 48), [std(0x111111), std(0xffffff, { map: vinylTex, roughness: 0.35 }), std(0x111111)]);
  platter.position.set(-0.02, h + 0.093, 0); crate.add(platter);
  const arm = rbox(0.008, 0.008, 0.2, 0.004, phys(0xcfcfcf, { metalness: 0.9, roughness: 0.3 })); arm.position.set(0.13, h + 0.1, 0.02); arm.rotation.y = 0.25; crate.add(arm);
}
contact(CRATE.x, CRATE.z, CRATE.s + 0.2, CRATE.s + 0.2, 0.6);

/* ───────────── Plants ───────────── */
// a pointed leaf with a curved midrib (bends down toward its tip), built once and shared

function makeLeaf() {
  const sh = new THREE.Shape(); sh.moveTo(0, 0); sh.bezierCurveTo(0.42, 0.25, 0.36, 1.35, 0, 2); sh.bezierCurveTo(-0.36, 1.35, -0.42, 0.25, 0, 0);
  const g = new THREE.ShapeGeometry(sh, 16); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i); p.setXYZ(i, x, -0.12 * y * y + Math.abs(x) * 0.25, y); }   // arch + a V fold along the midrib
  g.computeVertexNormals(); return g;
}
function plant(potR, potColor, h, leaves, tall = false) {
  const g = new THREE.Group();
  const pot = mesh(new THREE.CylinderGeometry(potR, potR * 0.8, potR * 1.6, 24), phys(potColor, { roughness: 0.4, clearcoat: 0.3 })); pot.position.y = potR * 0.8; g.add(pot);
  const soil = mesh(new THREE.CircleGeometry(potR * 0.92, 20), std(0x2b1d14, { roughness: 1 })); soil.rotation.x = -Math.PI / 2; soil.position.y = potR * 1.55; g.add(soil);
  const leafMat = phys(0x3f7a3a, { roughness: 0.55, sheen: 0.4, sheenColor: new THREE.Color(0x9fdc8c), side: THREE.DoubleSide });
  const leafGeo = makeLeaf.g || (makeLeaf.g = makeLeaf());
  for (let i = 0; i < leaves; i++) {
    const a = (i / leaves) * Math.PI * 2 + rand(-0.3, 0.3), len = h * rand(0.45, 0.75) * (tall ? 1.1 : 1);
    const stem = new THREE.Group(); stem.position.y = potR * 1.55; stem.rotation.y = a;
    const leaf = mesh(leafGeo, leafMat); leaf.scale.setScalar(len * 0.55); leaf.rotation.x = -rand(0.75, 1.25); stem.add(leaf); g.add(stem);
  }
  return g;
}
// peace lily on a white pedestal in the corner by the window (kept from the current room)
{
  const ped = mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.55, 28), std(0xf2f2f2, { roughness: 0.5 })); at(ped, X1 - 0.17, 0.275, DESK.z1 + 0.22); scene.add(ped);
  scene.add(at(plant(0.1, 0xffffff, 0.5, 13, true), X1 - 0.17, 0.55, DESK.z1 + 0.22));
  contact(X1 - 0.17, DESK.z1 + 0.22, 0.45, 0.45, 0.5);
}

/* ───────────── Art on the right wall: Sijo's poster is the hero ───────────── */
const posterTex = canvasTex(1240, 1754, (g, w, h) => {
  g.fillStyle = "#f6f4ef"; g.fillRect(0, 0, w, h);
  const red = "#c7262e";
  const big = (ch, x, y, size, rot = 0) => { g.save(); g.translate(x, y); g.rotate(rot); g.fillStyle = red; g.font = `800 ${size}px ${UI}`; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(ch, 0, 0); g.restore(); };
  big("S", 250, 230, 470); big("T", 1010, 200, 470); big("O", 560, 560, 470); big("H", 1060, 820, 470); big("I", 760, 860, 470, -0.62);
  big("M", 270, 1000, 470, -Math.PI / 2); big("N", 680, 1350, 470); big("E", 230, 1560, 430, Math.PI / 2); big("G", 1060, 1630, 470, Math.PI);
  const line = (t, y, align = "left") => { g.fillStyle = "#0a0a0a"; g.font = `900 84px ${UI}`; if ("letterSpacing" in g) g.letterSpacing = "-5px"; g.textAlign = align; g.fillText(t, align === "left" ? 46 : w - 40, y); };
  line("TO CREATE A SOLUTION", 150); line("FOR SOMETHING", 252); line("SOMETHING THAT HAS", 560, "right"); line("EVEN BIGGER CAUSE", 662, "right"); line("THAN ME", 764, "right");
  line("SOMETHING THAT I AM", 1080); line("SUPPOSED TO MAKE", 1182); line("TO BEGIN AN ERA", 1500, "right");
});
const artTex = {
  rings: canvasTex(600, 840, (g, w, h) => { g.fillStyle = "#e9e9e7"; g.fillRect(0, 0, w, h); g.strokeStyle = "#1c1c1c"; for (let r = 8; r < 250; r += 7) { g.lineWidth = 1.2 + (r % 21 === 1 ? 2 : 0); g.beginPath(); g.ellipse(w / 2 + Math.sin(r * 0.05) * 6, h / 2, r, r * 1.03, 0, 0, 7); g.stroke(); } }),
  figure: canvasTex(600, 840, (g, w, h) => { g.fillStyle = "#0e0e0e"; g.fillRect(0, 0, w, h); g.strokeStyle = "#f2f2f2"; g.lineWidth = 6; g.lineCap = "round";
    g.beginPath(); g.arc(300, 220, 60, 0, 7); g.moveTo(300, 280); g.lineTo(290, 520); g.moveTo(296, 340); g.lineTo(180, 450); g.moveTo(296, 340); g.lineTo(420, 300); g.moveTo(290, 520); g.lineTo(200, 700); g.moveTo(290, 520); g.lineTo(380, 690); g.stroke();
    g.font = `700 22px ${UI}`; g.fillStyle = "#bbb"; g.fillText("MOTION · 01", 40, 800); }),
  abstract: canvasTex(600, 840, (g, w, h) => { g.fillStyle = "#f1f1ef"; g.fillRect(0, 0, w, h); g.fillStyle = "#111";
    g.beginPath(); g.ellipse(230, 300, 150, 190, 0.3, 0, 7); g.fill(); g.fillStyle = "#f1f1ef"; g.beginPath(); g.ellipse(250, 290, 70, 90, 0.3, 0, 7); g.fill();
    g.fillStyle = "#111"; g.beginPath(); g.ellipse(390, 590, 120, 150, -0.4, 0, 7); g.fill(); g.fillStyle = "#c7262e"; g.beginPath(); g.arc(420, 200, 26, 0, 7); g.fill(); })
};
function frameArt(tex, w, h, z, y, label) {
  const g = new THREE.Group(); g.position.set(X1 - 0.022, y, z); g.rotation.y = -Math.PI / 2; scene.add(g);
  const fr = rbox(w + 0.05, h + 0.05, 0.03, 0.004, black); g.add(fr);
  const mat_ = box(w + 0.01, h + 0.01, 0.002, std(0xf6f6f4)); mat_.position.z = 0.016; g.add(mat_);
  const art = new THREE.Mesh(new THREE.PlaneGeometry(w - 0.05, h - 0.05), std(0xffffff, { map: tex, roughness: 0.6 })); art.position.z = 0.018; art.receiveShadow = true; g.add(art);
  if (label) interactive(g, label, () => {});
  return g;
}
frameArt(artTex.figure, 0.42, 0.58, -1.62, 1.55);
const posterFrame = frameArt(posterTex, 0.6, 0.84, -0.72, 1.48, "My poster · To create a solution for something");
frameArt(artTex.abstract, 0.42, 0.58, 0.32, 1.56);
frameArt(artTex.rings, 0.46, 0.64, 1.25, 1.52);

/* ───────────── Lights + day ↔ night ───────────── */
const hemi = new THREE.HemisphereLight(0xf2f4ff, 0x3a3a3d, 0.55); scene.add(hemi);
const sun = new THREE.DirectionalLight(0xfff1dc, 2.6);
sun.position.set(-0.55, 3.4, Z0 - 3.2); sun.target.position.set(-0.4, 0, -0.2); scene.add(sun, sun.target);
sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -2.6, right: 2.6, top: 3.2, bottom: -3.2, near: 0.5, far: 12 }); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.015; sun.shadow.radius = 4;
const fill = new THREE.DirectionalLight(0xdfe6ff, 0.35); fill.position.set(1.5, 6, 2); scene.add(fill);
const LOOK = {
  day: { sun: 2.6, sunC: 0xfff1dc, hemi: 0.55, fill: 0.35, lamp: 0.7, globe: 1.2, env: 0.32, exp: 1.05 },
  night: { sun: 0.35, sunC: 0x7f9bff, hemi: 0.14, fill: 0.06, lamp: 2.2, globe: 2.4, env: 0.1, exp: 1.0 }
};
let night = false, dayMix = 0, dayFrom = 0, dayTo = 0, dayT0 = 0;
const _c1 = new THREE.Color(), _c2 = new THREE.Color();
function applyDay(k) {
  const f = (a, b) => a + (b - a) * k, D = LOOK.day, N = LOOK.night;
  sun.intensity = f(D.sun, N.sun); sun.color.copy(_c1.set(D.sunC)).lerp(_c2.set(N.sunC), k);
  hemi.intensity = f(D.hemi, N.hemi); fill.intensity = f(D.fill, N.fill); lampLight.intensity = f(D.lamp, N.lamp);
  scene.environmentIntensity = f(D.env, N.env); renderer.toneMappingExposure = f(D.exp, N.exp);
  skyNight.material.opacity = k;
}
function setNight(n, instant = false) {
  night = n; dayFrom = dayMix; dayTo = n ? 1 : 0; dayT0 = performance.now();
  if (instant || reduced) { dayMix = dayTo; applyDay(dayMix); }
  windowHit.userData.hover.label = n ? "Let the sun in ☀" : "Let the night in ☾";
}
interactive(windowHit, "Let the night in ☾", () => setNight(!night));
const hr = new Date().getHours(); setNight(hr < 6 || hr >= 18, true);
function stepDay(now) { if (dayMix === dayTo) return; const t = Math.min(1, (now - dayT0) / 1800), s = t * t * (3 - 2 * t); dayMix = dayFrom + (dayTo - dayFrom) * s; applyDay(dayMix); }

/* ───────────── Walkable grid + A* (so Sijo walks around the furniture) ───────────── */
const CELL = 0.06, GX0 = X0 + 0.16, GZ0 = Z0 + 0.16, GX = Math.round((W - 0.32) / CELL), GZ = Math.round((L + 0.5 - 0.32) / CELL);
const blocked = new Uint8Array(GX * GZ);
const obstacles = [   // [x0, z0, x1, z1] footprints (inflated by the walker's radius below)
  [BED.x - BED.w / 2, BED.z - BED.l / 2, BED.x + BED.w / 2, BED.z + BED.l / 2],
  [DESK.x0, DESK.z0, DESK.x1, DESK.z1],
  [CHAIR.x - 0.28, CHAIR.z - 0.28, CHAIR.x + 0.28, CHAIR.z + 0.28],
  [SOFA.x - SOFA.d / 2, SOFA.z - SOFA.l / 2, SOFA.x + SOFA.d / 2, SOFA.z + SOFA.l / 2],
  [TABLE.x - TABLE.w / 2, TABLE.z - TABLE.l / 2, TABLE.x + TABLE.w / 2, TABLE.z + TABLE.l / 2],
  [SHELF.x - SHELF.d / 2, SHELF.z0, X1, SHELF.z1],
  [CRATE.x - CRATE.s / 2, CRATE.z - CRATE.s / 2, X1, CRATE.z + CRATE.s / 2],
  [X1 - 0.32, DESK.z1 + 0.06, X1, DESK.z1 + 0.38]   // plant pedestal
];
const R_WALK = 0.2;
const cellXZ = (i, j) => [GX0 + (i + 0.5) * CELL, GZ0 + (j + 0.5) * CELL];
for (let j = 0; j < GZ; j++) for (let i = 0; i < GX; i++) {
  const [x, z] = cellXZ(i, j);
  let b = obstacles.some(([a, c, bx, d]) => x > a - R_WALK && x < bx + R_WALK && z > c - R_WALK && z < d + R_WALK);
  if (z > Z1 - 0.1 && (x < DOOR.x0 + 0.22 || x > DOOR.x1 - 0.22)) b = true;   // only through the doorway
  if (z > Z1 + 0.55) b = true;
  blocked[j * GX + i] = b ? 1 : 0;
}
const toCell = (x, z) => [Math.max(0, Math.min(GX - 1, Math.floor((x - GX0) / CELL))), Math.max(0, Math.min(GZ - 1, Math.floor((z - GZ0) / CELL)))];
function nearestFree(i, j) {
  if (!blocked[j * GX + i]) return [i, j];
  for (let r = 1; r < 30; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
    const a = i + di, b = j + dj; if (a >= 0 && b >= 0 && a < GX && b < GZ && !blocked[b * GX + a]) return [a, b];
  }
  return [i, j];
}
function lineFree(ax, az, bx, bz) {
  const n = Math.ceil(Math.hypot(bx - ax, bz - az) / (CELL * 0.5));
  for (let k = 0; k <= n; k++) { const [i, j] = toCell(ax + (bx - ax) * k / n, az + (bz - az) * k / n); if (blocked[j * GX + i]) return false; }
  return true;
}
function findPath(fx, fz, tx, tz) {
  const [si, sj] = nearestFree(...toCell(fx, fz)), [ti, tj] = nearestFree(...toCell(tx, tz));
  const N = GX * GZ, gs = new Float32Array(N).fill(Infinity), from = new Int32Array(N).fill(-1), closed = new Uint8Array(N);
  const start = sj * GX + si, goal = tj * GX + ti, open = [start]; gs[start] = 0;
  const h = (k) => Math.hypot(k % GX - ti, Math.floor(k / GX) - tj);
  while (open.length) {
    let bi = 0; for (let k = 1; k < open.length; k++) if (gs[open[k]] + h(open[k]) < gs[open[bi]] + h(open[bi])) bi = k;
    const cur = open.splice(bi, 1)[0]; if (cur === goal) break; closed[cur] = 1;
    const ci = cur % GX, cj = Math.floor(cur / GX);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
      if (!di && !dj) continue; const ni = ci + di, nj = cj + dj; if (ni < 0 || nj < 0 || ni >= GX || nj >= GZ) continue;
      const nk = nj * GX + ni; if (blocked[nk] || closed[nk]) continue;
      if (di && dj && (blocked[cj * GX + ni] || blocked[nj * GX + ci])) continue;
      const ng = gs[cur] + (di && dj ? 1.414 : 1);
      if (ng < gs[nk]) { gs[nk] = ng; from[nk] = cur; if (!open.includes(nk)) open.push(nk); }
    }
  }
  if (from[goal] === -1 && goal !== start) return null;
  const cells = []; for (let k = goal; k !== -1; k = from[k]) cells.unshift(cellXZ(k % GX, Math.floor(k / GX)));
  cells[cells.length - 1] = blocked[toCell(tx, tz)[1] * GX + toCell(tx, tz)[0]] ? cells[cells.length - 1] : [tx, tz];
  const out = [[fx, fz]];   // string-pulling: keep only the corners
  let k = 0;
  while (k < cells.length - 1) { let far = cells.length - 1; while (far > k + 1 && !lineFree(out[out.length - 1][0], out[out.length - 1][1], cells[far][0], cells[far][1])) far--; out.push(cells[far]); k = far; }
  return out.slice(1);
}

/* ───────────── Sijo (built from his photos) ───────────── */
// Materials sampled from his photos
const skin = phys(0xb27a56, { roughness: 0.58, sheen: 0.25, sheenColor: new THREE.Color(0xe0a882) });
const hairMat = phys(0x0d0a09, { roughness: 0.62, sheen: 0.9, sheenRoughness: 0.4, sheenColor: new THREE.Color(0x5a4a40), clearcoat: 0.15, clearcoatRoughness: 0.6 });
// the overshirt: pale lavender-white plaid, drawn once around the body (u = 0/1 is the open front, where the white tee shows)
const shirtTex = canvasTex(1024, 512, (g, w, h) => {
  g.fillStyle = "#efecf1"; g.fillRect(0, 0, w, h);
  const cell = 88;
  const bandV = (x, wd, c, a) => { g.globalAlpha = a; g.fillStyle = c; for (let o = 0; o < w; o += cell) g.fillRect(o + x, 0, wd, h); g.globalAlpha = 1; };
  const bandH = (y, wd, c, a) => { g.globalAlpha = a; g.fillStyle = c; for (let o = 0; o < h; o += cell) g.fillRect(0, o + y, w, wd); g.globalAlpha = 1; };
  bandV(6, 26, "#cfc4d9", 0.55); bandH(6, 26, "#cfc4d9", 0.55);       // lavender
  bandV(52, 14, "#b8bec7", 0.55); bandH(52, 14, "#b8bec7", 0.55);     // grey
  bandV(40, 2, "#ffffff", 0.9); bandH(40, 2, "#ffffff", 0.9);         // fine white line
  bandV(74, 2, "#8e879a", 0.45); bandH(74, 2, "#8e879a", 0.45);       // fine dark line
  for (let i = 0; i < 9000; i++) { g.fillStyle = `rgba(0,0,0,${Math.random() * 0.03})`; g.fillRect(Math.random() * w, Math.random() * h, 2, 1); }   // weave
  // open front: white tee between the plackets
  const tee = 52;
  for (const x0 of [0, w - tee]) { g.fillStyle = "#f6f6f4"; g.fillRect(x0, 0, tee, h); }
  g.fillStyle = "rgba(0,0,0,0.18)"; g.fillRect(tee, 0, 3, h); g.fillRect(w - tee - 3, 0, 3, h);    // placket shadows
  g.fillStyle = "#f4f2f6"; for (let y = 70; y < h; y += 92) { g.beginPath(); g.arc(tee + 14, y, 4, 0, 7); g.fill(); }   // buttons
});
shirtTex.wrapS = THREE.RepeatWrapping;
const sleeveTex = canvasTex(256, 256, (g, w, h) => { const img = shirtTex.image; g.drawImage(img, 100, 0, 256, 256, 0, 0, w, h); });
sleeveTex.wrapS = sleeveTex.wrapT = THREE.RepeatWrapping;
const shirtMat = phys(0xffffff, { map: shirtTex, roughness: 0.82, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) });
const sleeveMat = phys(0xffffff, { map: sleeveTex, roughness: 0.82, sheen: 0.5, sheenColor: new THREE.Color(0xffffff) });
const denim = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = "#d4d8dd"; g.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(255,255,255,${0.15 + Math.random() * 0.25})`; g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 8 + Math.random() * 30, 3 + Math.random() * 8, Math.random(), 0, 7); g.fill(); }   // acid wash
  for (let i = 0; i < 6000; i++) { g.fillStyle = Math.random() > 0.5 ? "rgba(255,255,255,.3)" : "rgba(110,122,140,.16)"; g.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 4, 1); }
});
denim.wrapS = denim.wrapT = THREE.RepeatWrapping;
const jeansMat = phys(0xffffff, { map: denim, roughness: 0.92, sheen: 0.4, sheenColor: new THREE.Color(0xffffff) });
const shoeMat = phys(0xd63b2b, { roughness: 0.55, sheen: 0.5, sheenColor: new THREE.Color(0xff8a70) }), soleMat = std(0xf4f4f2, { roughness: 0.6 });
const bagMat = phys(0x111113, { roughness: 0.5, sheen: 0.4, clearcoat: 0.2 });

// smooth value noise for sculpting hair and cloth
const noise3 = (x, y, z) => Math.sin(x * 1.7 + Math.sin(y * 2.3 + z)) * Math.sin(y * 1.9 + Math.sin(z * 2.1 + x)) * Math.sin(z * 2.2 + Math.sin(x * 1.6 + y));
const lathe = (pts, seg = 40) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg);

function buildSijo() {
  const root = new THREE.Group();
  const HIP_Y = 0.9;
  const hips = new THREE.Group(); hips.position.y = HIP_Y; root.add(hips);

  // ── legs: wide, straight light acid-wash jeans that break over the red sneakers
  const legs = [];
  for (const s of [-1, 1]) {
    const hip = new THREE.Group(); hip.position.set(s * 0.092, 0, 0); hips.add(hip);
    const thigh = mesh(lathe([[0, 0.02], [0.085, 0.0], [0.088, -0.2], [0.08, -0.43], [0, -0.45]], 24), jeansMat); hip.add(thigh);
    const knee = new THREE.Group(); knee.position.y = -0.43; hip.add(knee);
    const shin = mesh(lathe([[0, 0.02], [0.08, 0.0], [0.078, -0.3], [0.086, -0.4], [0.075, -0.43], [0, -0.43]], 24), jeansMat); knee.add(shin);
    const hem = mesh(new THREE.TorusGeometry(0.078, 0.012, 8, 24), jeansMat); hem.rotation.x = Math.PI / 2; hem.position.y = -0.405; knee.add(hem);
    // sneaker: rounded toe, padded collar, white midsole
    const shoe = new THREE.Group(); shoe.position.set(0, -0.445, 0.03); knee.add(shoe);
    const upper = mesh(new THREE.CapsuleGeometry(0.048, 0.17, 6, 16), shoeMat); upper.rotation.x = Math.PI / 2; upper.scale.set(1.05, 1, 0.78); upper.position.set(0, 0.04, 0.02); shoe.add(upper);
    const sole = rbox(0.108, 0.026, 0.285, 0.013, soleMat, 3); sole.position.set(0, 0.008, 0.02); shoe.add(sole);
    const lace = box(0.05, 0.004, 0.09, std(0xf2f2f2)); lace.position.set(0, 0.078, 0.06); lace.rotation.x = -0.25; shoe.add(lace);
    legs.push({ hip, knee });
  }

  // ── torso: open oversized overshirt (A-line, dropped shoulders) over a white tee
  const torso = new THREE.Group(); torso.position.y = 0.0; hips.add(torso);
  const shirtGeo = lathe([[0.0, -0.13], [0.205, -0.13], [0.215, -0.02], [0.2, 0.12], [0.198, 0.28], [0.21, 0.4], [0.2, 0.47], [0.15, 0.53], [0.075, 0.555], [0.0, 0.56]], 56);
  shirtGeo.scale(1, 1, 0.64);
  { // soft vertical folds in the cloth
    const p = shirtGeo.attributes.position;
    for (let i = 0; i < p.count; i++) { const x = p.getX(i), y = p.getY(i), z = p.getZ(i), a = Math.atan2(x, z), f = 1 + 0.025 * Math.sin(a * 9 + y * 3) * Math.min(1, (0.4 - y) * 2); p.setXYZ(i, x * f, y, z * f); }
    shirtGeo.computeVertexNormals();
  }
  const shirt = mesh(shirtGeo, shirtMat); torso.add(shirt);
  const collar = mesh(new THREE.TorusGeometry(0.068, 0.02, 10, 28, Math.PI * 1.35), shirtMat); collar.rotation.set(Math.PI / 2 - 0.25, 0, Math.PI * 0.82); collar.position.set(0, 0.545, -0.008); torso.add(collar);
  // sling bag: strap over the right shoulder, pouch on the left hip at the front
  const strapCurve = new THREE.CatmullRomCurve3([[0.13, 0.54, -0.07], [0.17, 0.5, 0.06], [0.05, 0.3, 0.14], [-0.1, 0.12, 0.15], [-0.16, 0.0, 0.12], [-0.2, 0.06, -0.02], [-0.12, 0.3, -0.13], [0.06, 0.5, -0.12], [0.13, 0.54, -0.07]].map((v) => new THREE.Vector3(...v)), true);
  const strap = mesh(new THREE.TubeGeometry(strapCurve, 80, 0.011, 6, true), bagMat); strap.scale.set(1, 1, 1); torso.add(strap);
  const pouch = mesh(new THREE.CapsuleGeometry(0.05, 0.13, 6, 14), bagMat); pouch.rotation.set(0, 0.35, Math.PI / 2 - 0.25); pouch.scale.set(1, 1, 0.7); pouch.position.set(-0.14, 0.02, 0.135); torso.add(pouch);

  // ── arms: dropped shoulder, wide sleeve rolled to the forearm, bracelet + watch
  const arms = [];
  for (const s of [-1, 1]) {
    const sh = new THREE.Group(); sh.position.set(s * 0.2, 0.455, 0); torso.add(sh);
    const cap = mesh(new THREE.SphereGeometry(0.068, 20, 14), sleeveMat); sh.add(cap);
    const sleeve = mesh(lathe([[0, 0.0], [0.068, 0.0], [0.066, -0.14], [0.06, -0.27], [0, -0.27]], 20), sleeveMat); sh.add(sleeve);
    const elbow = new THREE.Group(); elbow.position.y = -0.27; sh.add(elbow);
    const cuff = mesh(new THREE.TorusGeometry(0.058, 0.024, 10, 22), sleeveMat); cuff.rotation.x = Math.PI / 2; elbow.add(cuff);
    const fore = mesh(lathe([[0, 0.0], [0.047, 0.0], [0.045, -0.1], [0.034, -0.22], [0, -0.235]], 18), skin); elbow.add(fore);
    const hand = new THREE.Group(); hand.position.y = -0.235; elbow.add(hand);
    const palm = rbox(0.052, 0.085, 0.03, 0.014, skin, 3); palm.position.y = -0.045; hand.add(palm);
    const fingers = rbox(0.048, 0.06, 0.026, 0.012, skin, 3); fingers.position.set(0, -0.1, 0.006); fingers.rotation.x = 0.35; hand.add(fingers);
    const thumb = mesh(new THREE.CapsuleGeometry(0.01, 0.035, 4, 8), skin); thumb.position.set(-s * 0.03, -0.04, 0.016); thumb.rotation.z = -s * 0.5; hand.add(thumb);
    const metal = phys(0xd9d9de, { metalness: 1, roughness: 0.22 });
    const br = mesh(new THREE.TorusGeometry(0.036, 0.004, 6, 24), metal); br.rotation.x = Math.PI / 2; br.position.y = -0.215; elbow.add(br);
    if (s > 0) { const watch = mesh(new THREE.TorusGeometry(0.035, 0.009, 6, 24), phys(0x8e8e93, { metalness: 0.9, roughness: 0.3 })); watch.rotation.x = Math.PI / 2; watch.position.y = -0.19; elbow.add(watch); }
    sh.rotation.z = s * 0.06;
    arms.push({ sh, elbow });
  }

  // ── head: neck, face, full beard, and the big wavy-curly black hair
  const neck = mesh(new THREE.CylinderGeometry(0.048, 0.054, 0.1, 16), skin); neck.position.y = 0.575; torso.add(neck);
  const head = new THREE.Group(); head.position.y = 0.7; torso.add(head);
  const skullGeo = new THREE.SphereGeometry(0.1, 40, 30);
  { const p = skullGeo.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); if (y < 0) { const k = -y / 0.1; x *= 1 - 0.18 * k; z *= 1 - 0.05 * k; y *= 1.18; } p.setXYZ(i, x * 0.9, y * 1.05, z); } skullGeo.computeVertexNormals(); }
  const skull = mesh(skullGeo, skin); head.add(skull);
  for (const s of [-1, 1]) { const ear = mesh(new THREE.SphereGeometry(0.022, 12, 10), skin); ear.scale.set(0.45, 1, 0.75); ear.position.set(s * 0.088, 0.0, -0.01); head.add(ear); }
  const nose = mesh(new THREE.SphereGeometry(0.018, 16, 12), skin); nose.scale.set(0.85, 1.25, 1.05); nose.position.set(0, -0.006, 0.096); head.add(nose);
  for (const s of [-1, 1]) {
    const eye = mesh(new THREE.SphereGeometry(0.009, 14, 10), phys(0x140c08, { roughness: 0.1, clearcoat: 1 })); eye.scale.set(1.25, 0.7, 0.5); eye.position.set(s * 0.033, 0.02, 0.091); head.add(eye);
    const brow = rbox(0.036, 0.009, 0.012, 0.004, hairMat, 2); brow.position.set(s * 0.034, 0.04, 0.09); brow.rotation.z = -s * 0.1; head.add(brow);
  }
  // beard: a sculpted shell around the jaw and chin, open at the mouth (his trademark smile)
  const beardGeo = new THREE.SphereGeometry(0.102, 48, 24, 0, Math.PI * 2, Math.PI * 0.6, Math.PI * 0.33);
  { const p = beardGeo.attributes.position; for (let i = 0; i < p.count; i++) { let x = p.getX(i), y = p.getY(i), z = p.getZ(i); const back = z < -0.02; const k = 1 + 0.025 * noise3(x * 120, y * 120, z * 120);
      if (back) { x *= 0.86; z *= 0.6; } p.setXYZ(i, x * 0.86 * k, y * 1.2 * k + 0.002, z * 0.98 * k + 0.004); } beardGeo.computeVertexNormals(); }
  const beard = mesh(beardGeo, hairMat); head.add(beard);
  const smile = mesh(new THREE.TorusGeometry(0.024, 0.006, 6, 16, Math.PI), std(0xfafafa, { roughness: 0.3 })); smile.rotation.z = Math.PI; smile.position.set(0, -0.046, 0.093); smile.scale.set(0.9, 0.7, 1); head.add(smile);
  const mous = mesh(new THREE.TorusGeometry(0.028, 0.008, 6, 16, Math.PI), hairMat); mous.position.set(0, -0.034, 0.096); mous.rotation.z = Math.PI; mous.scale.y = 0.6; head.add(mous);
  // hair: one sculpted mass (curly clumps from noise), fuller on top and at the back, fringe falling onto the forehead
  let hairGeo = new THREE.SphereGeometry(1, 128, 96);
  {
    const p = hairGeo.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const { x, y, z } = v;
      let r = 1 + 0.3 * Math.max(0, y) + 0.16 * Math.max(0, -z) + 0.1 * Math.max(0, Math.abs(x) - 0.4);
      const c1 = noise3(x * 7 + 1, y * 7 + 2, z * 7 + 3), c2 = noise3(x * 13 + 5, y * 13, z * 13 + 1);
      const clump = Math.pow(Math.abs(c1), 0.6), curl = Math.pow(Math.abs(c2), 0.7);    // ridged: rounded curl clumps with creases between
      r *= 1 + 0.13 * clump + 0.06 * curl;
      const face = z > 0.3 && y < 0.38 - (z - 0.3) * 0.25, low = y < -0.25 && z > -0.45, nape = y < -0.62;
      if (face || low || nape) r = 0.9;                                    // tucked inside the head: face and jaw stay clear
      if (z > 0.3 && y >= 0.18 && y < 0.5) r += 0.05 * clump;              // fringe curls
      p.setXYZ(i, x * r, y * r, z * r);
    }
    hairGeo.computeVertexNormals();
  }
  const hair = mesh(hairGeo, hairMat); hair.scale.set(0.103, 0.1, 0.108); hair.position.set(0, 0.022, -0.01); head.add(hair);
  // loose curls breaking the outline (round, glossy)
  const curls = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 12, 8), hairMat, 240); curls.castShadow = true;
  const d = new THREE.Object3D();
  for (let n = 0; n < 240; n++) {
    const u = -0.1 + Math.random() * 1.1, th = Math.random() * Math.PI * 2, s2 = Math.sqrt(Math.max(0, 1 - u * u));
    const v = new THREE.Vector3(s2 * Math.cos(th), u, s2 * Math.sin(th));
    if (v.z > 0.3 && v.y < 0.4) { n--; continue; }
    const r = 1.14 + 0.3 * Math.max(0, v.y) + 0.12 * Math.max(0, -v.z);
    d.position.set(v.x * 0.103 * r, v.y * 0.1 * r + 0.022, v.z * 0.108 * r - 0.01);
    d.scale.set(0.009 + Math.random() * 0.007, 0.007 + Math.random() * 0.005, 0.009 + Math.random() * 0.007); d.rotation.set(Math.random() * 6, Math.random() * 6, 0); d.updateMatrix(); curls.setMatrixAt(n, d.matrix);
  }
  head.add(curls);
  root.traverse((m) => { if (m.isMesh || m.isInstancedMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return { root, hips, torso, head, legs, arms, HIP_Y };
}
const sijo = buildSijo();
scene.add(sijo.root);
const sijoShadow = contact(0, 0, 0.7, 0.7, 0.7, 0.004);
const SJ = { x: 0, z: Z1 + 0.42, heading: Math.PI, path: [], speed: 0, phase: 0, idleUntil: 0, onArrive: null, wave: 0, lookT: 0, sit: 0, face: null };
sijo.root.position.set(SJ.x, 0, SJ.z);
const sijoHit = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 1.8, 12), new THREE.MeshBasicMaterial({ visible: false })); sijoHit.position.y = 0.9; sijo.root.add(sijoHit);
interactive(sijoHit, "That's me, Sijo 👋", () => { SJ.wave = 2.4; });
function walkTo(x, z, onArrive = null, face = null) {
  const p = findPath(SJ.x, SJ.z, x, z);
  if (!p || !p.length) return false;
  SJ.path = p; SJ.onArrive = onArrive; SJ.face = face; SJ.idleUntil = 0; return true;
}
let lastUserMove = -1e9;
const WANDER = [[0.05, 0.4], [0.62, SHELF.z1 - 0.1], [0.3, -0.75], [-0.35, -1.6], [0.0, 1.85], [0.55, 0.2], [-0.2, 0.55]];
function stepSijo(dt, now) {
  const tgt = SJ.path[0];
  let moving = false;
  if (tgt) {
    const dx = tgt[0] - SJ.x, dz = tgt[1] - SJ.z, dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let dh = ((want - SJ.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI; SJ.heading += dh * Math.min(1, dt * 9);
    SJ.speed += (1.15 - SJ.speed) * Math.min(1, dt * 4) * (Math.abs(dh) > 1.2 ? 0.3 : 1);
    const stepLen = Math.min(dist, SJ.speed * dt);
    SJ.x += (dx / (dist || 1)) * stepLen; SJ.z += (dz / (dist || 1)) * stepLen;
    if (dist < 0.03) { SJ.path.shift(); if (!SJ.path.length) { SJ.idleUntil = now + rand(5000, 11000); const f = SJ.onArrive; SJ.onArrive = null; f && f(); } }
    moving = true;
  } else {
    SJ.speed *= Math.max(0, 1 - dt * 7);
    if (SJ.face != null) { let dh = ((SJ.face - SJ.heading + Math.PI * 3) % (Math.PI * 2)) - Math.PI; SJ.heading += dh * Math.min(1, dt * 5); }
    if (!reduced && SJ.idleUntil && now > SJ.idleUntil && now - lastUserMove > 15000 && mode !== "flying") {   // wander when left alone
      const [wx, wz] = WANDER[Math.floor(Math.random() * WANDER.length)]; walkTo(wx, wz, null, null);
    }
  }
  // walk cycle (blended by speed) + idle breathing / looking around
  const k = Math.min(1, SJ.speed / 1.0);
  SJ.phase += dt * SJ.speed * 6.2;
  const sw = Math.sin(SJ.phase);
  sijo.legs[0].hip.rotation.x = sw * 0.5 * k; sijo.legs[1].hip.rotation.x = -sw * 0.5 * k;
  sijo.legs[0].knee.rotation.x = Math.max(0, -Math.cos(SJ.phase)) * 0.75 * k; sijo.legs[1].knee.rotation.x = Math.max(0, Math.cos(SJ.phase)) * 0.75 * k;
  sijo.arms[0].sh.rotation.x = -sw * 0.42 * k; sijo.arms[1].sh.rotation.x = sw * 0.42 * k;
  sijo.arms[0].elbow.rotation.x = -0.25 - 0.2 * k; sijo.arms[1].elbow.rotation.x = -0.25 - 0.2 * k;
  sijo.hips.position.y = sijo.HIP_Y + Math.abs(Math.cos(SJ.phase)) * 0.022 * k - 0.012 * k;
  sijo.torso.rotation.y = sw * 0.08 * k; sijo.torso.rotation.x = 0.05 * k + Math.sin(now * 0.0016) * 0.008;
  SJ.lookT += dt;
  sijo.head.rotation.y = (1 - k) * Math.sin(SJ.lookT * 0.45) * 0.45; sijo.head.rotation.x = (1 - k) * (Math.sin(SJ.lookT * 0.3) * 0.08 + 0.06);
  if (SJ.wave > 0) {   // wave hello with the right hand
    SJ.wave -= dt; const w = Math.min(1, SJ.wave, (2.4 - SJ.wave) * 3);
    sijo.arms[1].sh.rotation.z = 0.1 + w * 2.5; sijo.arms[1].sh.rotation.x = -w * 0.2; sijo.arms[1].elbow.rotation.z = w * Math.sin(now * 0.016) * 0.5; sijo.arms[1].elbow.rotation.x = -0.25 - w * 0.3;
  } else { sijo.arms[1].sh.rotation.z = 0.1; sijo.arms[1].elbow.rotation.z = 0; }
  sijo.arms[0].sh.rotation.z = -0.1;
  sijo.root.position.set(SJ.x, 0, SJ.z); sijo.root.rotation.y = SJ.heading;
  sijoShadow.position.set(SJ.x, 0.004, SJ.z);
  return moving;
}

/* ───────────── Downloaded models: Shea (cat) + football ───────────── */
const gltfLoader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
const imgLoader = new THREE.ImageLoader();
const loadImg = (u) => new Promise((res, rej) => imgLoader.load(u, res, undefined, rej));
function recolor(img, dark, mid, light) {
  const c = document.createElement("canvas"); c.width = img.width; c.height = img.height;
  const g = c.getContext("2d", { willReadFrequently: true }); g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height), px = d.data;
  for (let i = 0; i < px.length; i += 4) {
    let l = (0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2]) / 255; l = Math.min(1, Math.max(0, (l - 0.06) * 1.4));
    const [a, b, k] = l < 0.6 ? [dark, mid, l / 0.6] : [mid, light, (l - 0.6) / 0.4];
    px[i] = a[0] + (b[0] - a[0]) * k; px[i + 1] = a[1] + (b[1] - a[1]) * k; px[i + 2] = a[2] + (b[2] - a[2]) * k;
  }
  g.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(c); t.flipY = false; t.colorSpace = THREE.SRGBColorSpace; return t;
}
let cat = null, catHop = 0;
(async () => {
  const [gltf, diffuse, bump] = await Promise.all([gltfLoader.loadAsync("../models/cat/cat.glb"), loadImg("../models/cat/cat_diffuse.jpg"), loadImg("../models/cat/cat_bump.jpg")]);
  const bt = new THREE.Texture(bump); bt.flipY = false; bt.needsUpdate = true;
  const fur = new THREE.MeshStandardMaterial({ map: recolor(diffuse, [96, 44, 14], [210, 122, 56], [250, 222, 184]), bumpMap: bt, bumpScale: 2, roughness: 0.9 });
  const obj = gltf.scene; obj.traverse((m) => { if (m.isMesh) { m.material = fur; m.castShadow = m.receiveShadow = true; } });
  obj.rotation.x = -Math.PI / 2;
  const holder = new THREE.Group(); holder.add(obj);
  let b = new THREE.Box3().setFromObject(holder); obj.scale.setScalar(0.3 / b.getSize(new THREE.Vector3()).y);
  b.setFromObject(holder); const c = b.getCenter(new THREE.Vector3()); obj.position.set(-c.x, -b.min.y, -c.z);
  holder.position.set(BED.x + 0.15, 0.52, BED.z + 0.55); holder.rotation.y = 2.2;   // on the bed, by the foot, looking into the room
  scene.add(holder); cat = holder;
  interactive(holder, "Shea says: pet me?", () => { catHop = 1; });
})().catch((e) => console.warn("cat:", e));

const BALL_R = 0.11;
let ball = null; const ballV = new THREE.Vector2();
(async () => {
  const [gltf, base, normal, rough] = await Promise.all([gltfLoader.loadAsync("../models/football/football.glb"), loadImg("../models/football/BaseColor.jpg"), loadImg("../models/football/Normal.jpg"), loadImg("../models/football/Roughness.jpg")]);
  const tex = (im, srgb) => { const t = new THREE.Texture(im); t.flipY = false; t.needsUpdate = true; if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t; };
  const leather = new THREE.MeshStandardMaterial({ map: tex(base, true), normalMap: tex(normal), roughnessMap: tex(rough), roughness: 1 });
  gltf.scene.traverse((m) => { if (m.isMesh) { m.material = leather; m.castShadow = m.receiveShadow = true; } });
  const inner = new THREE.Group(); inner.add(gltf.scene);
  const r = new THREE.Box3().setFromObject(inner).getSize(new THREE.Vector3()).y / 2; inner.scale.setScalar(BALL_R / r);
  inner.position.sub(new THREE.Box3().setFromObject(inner).getCenter(new THREE.Vector3()));
  const spin = new THREE.Group(); spin.add(inner); ball = new THREE.Group(); ball.add(spin); ball.userData.spin = spin;
  ball.position.set(0.32, BALL_R, 0.75); scene.add(ball);
  interactive(ball, "Kick me ⚽", () => { const a = Math.random() * Math.PI * 2; ballV.set(Math.cos(a), Math.sin(a)).multiplyScalar(2.2); });
})().catch((e) => console.warn("ball:", e));
const ballShadow = contact(0, 0, 0.32, 0.32, 0.7, 0.003);
const _ax = new THREE.Vector3(), _q = new THREE.Quaternion();
function stepBall(dt) {
  if (!ball) { ballShadow.visible = false; return; }
  ballShadow.visible = true;
  const p = ball.position;
  const dxs = p.x - SJ.x, dzs = p.z - SJ.z, ds = Math.hypot(dxs, dzs);   // Sijo's feet nudge it along
  if (ds < 0.26 && SJ.speed > 0.2) ballV.set(dxs / ds, dzs / ds).multiplyScalar(1.4 + SJ.speed * 0.6);
  p.x += ballV.x * dt; p.z += ballV.y * dt;
  const lim = (v, a, b, i) => { if (v < a) { ballV.setComponent(i, Math.abs(ballV.getComponent(i)) * 0.6); return a; } if (v > b) { ballV.setComponent(i, -Math.abs(ballV.getComponent(i)) * 0.6); return b; } return v; };
  p.x = lim(p.x, X0 + BALL_R, X1 - BALL_R, 0); p.z = lim(p.z, Z0 + BALL_R, Z1 - BALL_R, 1);
  for (const [a, c, b, d] of obstacles.slice(0, 7)) {   // bounce off furniture footprints
    if (p.x > a - BALL_R && p.x < b + BALL_R && p.z > c - BALL_R && p.z < d + BALL_R) {
      const pen = [p.x - (a - BALL_R), b + BALL_R - p.x, p.z - (c - BALL_R), d + BALL_R - p.z], m = Math.min(...pen), i = pen.indexOf(m);
      if (i === 0) { p.x = a - BALL_R; ballV.x = -Math.abs(ballV.x) * 0.6; } else if (i === 1) { p.x = b + BALL_R; ballV.x = Math.abs(ballV.x) * 0.6; }
      else if (i === 2) { p.z = c - BALL_R; ballV.y = -Math.abs(ballV.y) * 0.6; } else { p.z = d + BALL_R; ballV.y = Math.abs(ballV.y) * 0.6; }
    }
  }
  const sp = ballV.length();
  if (sp > 0.001) { _ax.set(ballV.y, 0, -ballV.x).normalize(); _q.setFromAxisAngle(_ax, (sp * dt) / BALL_R); ball.userData.spin.quaternion.premultiply(_q); }
  ballV.multiplyScalar(Math.max(0, 1 - dt * 1.1));
  ballShadow.position.set(p.x, 0.003, p.z);
}

/* ───────────── Camera: whole room from above → long smooth glide to the desk ───────────── */
const OVER = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() }, DESKV = { pos: new THREE.Vector3(), quat: new THREE.Quaternion() };
const _m = new THREE.Matrix4(), _up = new THREE.Vector3();
function viewQuat(pos, target, up) { _m.lookAt(pos, target, up); return new THREE.Quaternion().setFromRotationMatrix(_m); }
function solveViews() {
  const aspect = innerWidth / innerHeight, portrait = aspect < 1;
  camera.aspect = aspect; camera.fov = portrait ? 40 : 32; camera.updateProjectionMatrix();
  const t = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2));
  const spanLong = L + 2 * WT + 0.75 + 0.25, spanShort = W + 2 * WT + 0.3;   // (+ the hall beyond the door, + a little air)
  const [vert, horiz] = portrait ? [spanLong, spanShort] : [spanShort, spanLong];
  const h = Math.max(vert / 2 / t, horiz / 2 / (t * aspect)) * 1.04 + WH;
  OVER.pos.set(0, h, 0.18);
  // portrait: window wall at the top of the screen; landscape: room turned so it runs across the screen (window on the right, door on the left)
  OVER.target = new THREE.Vector3(0, 0, 0.18); OVER.up = portrait ? new THREE.Vector3(0, 0, -1) : new THREE.Vector3(-1, 0, 0);
  OVER.quat.copy(viewQuat(OVER.pos, OVER.target, OVER.up));
  // desk: just behind and above the chair, looking down at the MacBook, the pegboard and the window light
  const dpos = portrait ? new THREE.Vector3(LAP.x - 0.12, 2.05, DESK.z1 + 1.75) : new THREE.Vector3(LAP.x - 0.28, 1.85, DESK.z1 + 1.42);
  DESKV.target = new THREE.Vector3(LAP.x - 0.08, DESK.h + 0.05, LAP.z + 0.12); DESKV.up = new THREE.Vector3(0, 1, 0);
  DESKV.pos.copy(dpos); DESKV.quat.copy(viewQuat(dpos, DESKV.target, DESKV.up));
}
solveViews();
let mode = "overview", fly = null;
const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const smoother = (t) => t * t * t * (t * (t * 6 - 15) + 10);
function flyTo(view, dur = 4200) {
  const cur = mode === "desk" ? DESKV : OVER;
  const from = { pos: camera.position.clone(), target: (fly ? fly.lastTarget : cur.target).clone(), up: (fly ? fly.lastUp : cur.up).clone() };
  // the curve swoops down over the room toward the chair, then settles behind it
  const ctrl = view === DESKV ? new THREE.Vector3(view.pos.x * 0.6, from.pos.y * 0.42 + view.pos.y * 0.58, view.pos.z + 1.1)
                              : new THREE.Vector3(from.pos.x * 0.5, view.pos.y * 0.7, from.pos.z + 0.6);
  mode = "flying";
  fly = { from, view, ctrl, t0: performance.now(), dur: reduced ? 1 : dur, end: view === DESKV ? "desk" : "overview", lastTarget: from.target.clone(), lastUp: from.up.clone() };
  document.querySelectorAll(".views button").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.view === fly.end)));
}
const _p = new THREE.Vector3(), _t = new THREE.Vector3(), _u = new THREE.Vector3();
function stepFly(now) {
  if (!fly) return;
  const t = Math.min(1, (now - fly.t0) / fly.dur), e = smoother(t), u = 1 - e;
  _p.copy(fly.from.pos).multiplyScalar(u * u).addScaledVector(fly.ctrl, 2 * u * e).addScaledVector(fly.view.pos, e * e);
  const k = easeIO(t);
  _t.lerpVectors(fly.from.target, fly.view.target, k);
  _u.lerpVectors(fly.from.up, fly.view.up, Math.min(1, k * 1.15)).normalize();
  camera.position.copy(_p); camera.up.copy(_u); camera.lookAt(_t);
  fly.lastTarget.copy(_t); fly.lastUp.copy(_u);
  if (t === 1) { mode = fly.end; fly = null; camera.quaternion.copy((mode === "desk" ? DESKV : OVER).quat); }
}
camera.position.copy(OVER.pos); camera.quaternion.copy(OVER.quat);

/* subtle parallax in the desk view (follows the pointer) */
const par = { x: 0, y: 0, tx: 0, ty: 0 };
addEventListener("pointermove", (e) => { par.tx = (e.clientX / innerWidth - 0.5) * 2; par.ty = (e.clientY / innerHeight - 0.5) * 2; });

/* ───────────── Pointer: hover labels, click to walk ───────────── */
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), tip = $("#tip");
let hovered = null;
function pick(e) {
  ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1); ray.setFromCamera(ndc, camera);
  const hits = ray.intersectObjects(hoverables, true);
  for (const h of hits) { let o = h.object; while (o && !o.userData.hover) o = o.parent; if (o) return o; }
  return null;
}
renderer.domElement.addEventListener("pointermove", (e) => {
  if (e.pointerType === "touch") return;
  const o = pick(e);
  hovered = o; renderer.domElement.style.cursor = o ? "pointer" : "default";
  if (o) { tip.textContent = o.userData.hover.label; tip.style.left = e.clientX + "px"; tip.style.top = e.clientY + "px"; tip.classList.add("on"); } else tip.classList.remove("on");
});
// click marker: a soft ring that expands where you tap the floor
const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, depthWrite: false });
const ring = new THREE.Mesh(new THREE.RingGeometry(0.08, 0.1, 40), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; scene.add(ring);
let ringT = 1;
let down = null;
renderer.domElement.addEventListener("pointerdown", (e) => { down = { x: e.clientX, y: e.clientY }; });
renderer.domElement.addEventListener("pointerup", (e) => {
  if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8) return;
  hideHint();
  const o = pick(e);
  if (o) { o.userData.hover.onClick(); o.userData.hover.lift = 1; return; }
  const hits = ray.intersectObject(floor);
  if (hits.length) {
    const q = hits[0].point; lastUserMove = performance.now();
    if (walkTo(q.x, q.z)) { ring.position.set(q.x, 0.01, q.z); ringT = 0; }
  }
});
interactive(laptopHit, "Open my work", openWork);
function openWork() {
  lastUserMove = performance.now();
  walkTo(CHAIR.x - 0.42, CHAIR.z + 0.05, () => { SJ.face = Math.PI * 0.85; }, Math.PI * 0.85);   // he steps up beside the chair
  if (mode !== "desk") flyTo(DESKV, 2600);
  setTimeout(() => $("#toast").classList.add("on"), mode === "desk" ? 400 : 2800);
}
$("#toastClose").addEventListener("click", () => $("#toast").classList.remove("on"));
let platterSpin = false;
interactive(crate, "Spin a record", () => { platterSpin = !platterSpin; });
document.querySelectorAll(".views button").forEach((b) => b.addEventListener("click", () => { hideHint(); flyTo(b.dataset.view === "desk" ? DESKV : OVER, b.dataset.view === "desk" ? 3600 : 3000); }));
function hideHint() { $("#hint").classList.add("hidden"); }

/* ───────────── Loop ───────────── */
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  stepFly(now); stepDay(now);
  stepSijo(dt, now); stepBall(dt);
  if (mode === "desk" && !fly) {   // gentle parallax
    par.x += (par.tx - par.x) * 0.05; par.y += (par.ty - par.y) * 0.05;
    camera.position.set(DESKV.pos.x + par.x * 0.05, DESKV.pos.y - par.y * 0.03, DESKV.pos.z);
  }
  if (ringT < 1) { ringT = Math.min(1, ringT + dt * 1.6); ring.scale.setScalar(1 + ringT * 1.6); ringMat.opacity = (1 - ringT) * 0.7; }
  if (platterSpin && platter) platter.rotation.y -= dt * 3.5;
  if (cat) { catHop = Math.max(0, catHop - dt * 1.6); cat.position.y = 0.52 + Math.sin(catHop * Math.PI) * 0.12; cat.scale.setScalar(1 + Math.sin(now * 0.002) * 0.008); }
  for (const o of hoverables) { const h = o.userData.hover; h.lift = Math.max(0, h.lift - dt * 3); }
  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
addEventListener("resize", () => {
  renderer.setSize(innerWidth, innerHeight); solveViews();
  if (!fly) { const v = mode === "desk" ? DESKV : OVER; camera.position.copy(v.pos); camera.quaternion.copy(v.quat); }
});

/* ───────────── Start: the whole room, Sijo walks in, then the long glide to the desk ───────────── */
requestAnimationFrame((t) => { last = t; frame(t); });
setTimeout(() => $("#loader").classList.add("done"), 250);
setTimeout(() => walkTo(0.62, SHELF.z1 - 0.12, () => { platterSpin = true; }, Math.PI / 2), 900);   // in through the door, to the record player
const params = new URLSearchParams(location.search);
if (params.get("view") === "desk") { mode = "desk"; camera.position.copy(DESKV.pos); camera.quaternion.copy(DESKV.quat); document.querySelector('[data-view="desk"]').setAttribute("aria-pressed", "true"); document.querySelector('[data-view="overview"]').setAttribute("aria-pressed", "false"); }
else if (params.get("view") !== "room") setTimeout(() => flyTo(DESKV, 5600), 2600);

// test hooks (used by the lab screenshot script)
window.Lab = { state: () => ({ mode, night, cat: !!cat, ball: !!ball, sijo: [SJ.x, SJ.z], walking: SJ.path.length > 0 }), toggleDay: () => setNight(!night), pose: (x, z, h) => { SJ.path = []; SJ.x = x; SJ.z = z; SJ.face = h; SJ.heading = h; SJ.idleUntil = 1e15; }, cam: (p, t) => { fly = null; mode = "debug"; camera.up.set(0, 1, 0); camera.position.set(...p); camera.lookAt(...t); }, fly: (v) => flyTo(v === "desk" ? DESKV : OVER, 10), walkTo };
