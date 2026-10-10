// Shea, the cat: a rigged model (models/cat/shea.glb: 32-bone quadruped skeleton, skinned in Blender) brought to life
// with procedural animation built on cat biomechanics, so nothing slides or floats:
//  · walk = lateral-sequence gait (hind-left, fore-left, hind-right, fore-right), paws planted on the ground by IK while
//    in stance and lifted on an arc while in swing; the body bobs twice per stride and the spine bends into turns
//  · jumps are ballistic (real gravity, 9.81 m/s²): look, crouch, push off with the hind legs, front legs tuck then
//    reach for the landing, land front paws first, absorb
//  · the head aims at things (laptop, visitor, window, ball), the tail is a chain of damped springs, she breathes.
// Units: the room's (1 unit = 5 cm). The holder's origin is the ground point under the cat; +z is where she faces.
import * as THREE from "three";

const V3 = THREE.Vector3, Q = THREE.Quaternion;
const G = 9.81 * 20;   // gravity in units/s² (1 unit = 5 cm)
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const smooth = (k) => { k = clamp(k, 0, 1); return k * k * (3 - 2 * k); };
const mix = (a, b, k) => a + (b - a) * k;
const damp = (cur, target, lambda, dt) => cur + (target - cur) * (1 - Math.exp(-lambda * dt));
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
const frac = (x) => x - Math.floor(x);
const _q = new Q(), _q2 = new Q(), _v = new V3(), _v2 = new V3();
const X = new V3(1, 0, 0), Y = new V3(0, 1, 0);

// rotate a bone by a world-space rotation (its children follow)
function rotateWorld(bone, q) {
  const pw = bone.parent.getWorldQuaternion(_q2).invert();
  const bw = bone.getWorldQuaternion(_q).premultiply(q);
  bone.quaternion.copy(pw.multiply(bw));
  bone.updateMatrixWorld(true);
}
const aa = (axis, ang) => new Q().setFromAxisAngle(axis, ang);
const wpos = (b) => b.getWorldPosition(new V3());

// analytic two-bone IK (D. Holden's formulation): bones a → b, chain end = head of bone c, reach target t
function ik2(a, b, c, t) {
  const pa = wpos(a), pb = wpos(b), pc = wpos(c);
  const lab = pa.distanceTo(pb), lcb = pb.distanceTo(pc), max = lab + lcb, soft = max * 0.88;
  // soft IK: past 88 % of full reach the leg eases toward straight instead of snapping (the classic IK flicker)
  let dt0 = t.distanceTo(pa); if (dt0 > soft) { dt0 = soft + (max * 0.995 - soft) * (1 - Math.exp(-(dt0 - soft) / (max * 0.995 - soft))); t = pa.clone().add(t.clone().sub(pa).setLength(dt0)); }
  const lat = clamp(dt0, 1e-4, max * 0.999);
  const ac = pc.clone().sub(pa).normalize(), ab = pb.clone().sub(pa).normalize(), ba = pa.clone().sub(pb).normalize();
  const bc = pc.clone().sub(pb).normalize(), at = t.clone().sub(pa).normalize();
  const ac_ab0 = Math.acos(clamp(ac.dot(ab), -1, 1)), ba_bc0 = Math.acos(clamp(ba.dot(bc), -1, 1)), ac_at0 = Math.acos(clamp(ac.dot(at), -1, 1));
  const ac_ab1 = Math.acos(clamp((lcb * lcb - lab * lab - lat * lat) / (-2 * lab * lat), -1, 1));
  const ba_bc1 = Math.acos(clamp((lat * lat - lab * lab - lcb * lcb) / (-2 * lab * lcb), -1, 1));
  const axis0 = new V3().crossVectors(ac, ab).normalize(), axis1 = new V3().crossVectors(ac, at);
  if (axis1.lengthSq() < 1e-12) axis1.copy(axis0); axis1.normalize();
  const ag = a.getWorldQuaternion(new Q()), bg = b.getWorldQuaternion(new Q());
  const agi = ag.clone().invert(), bgi = bg.clone().invert();
  const r0 = aa(axis0.clone().applyQuaternion(agi), ac_ab1 - ac_ab0), r1 = aa(axis0.clone().applyQuaternion(bgi), ba_bc1 - ba_bc0), r2 = aa(axis1.clone().applyQuaternion(agi), ac_at0);
  a.quaternion.multiply(r0.multiply(r2)); b.quaternion.multiply(r1);
  a.updateMatrixWorld(true);
}
// where a bone ends: its child joint, or (leaf bones) a point along its own axis (glTF bones from Blender point along local +Y)
const LEAF = { fingersL: 1.7, fingersR: 1.7, toesL: 2.5, toesR: 2.5, head: 8.6, tail5: 4.2 };
const tipOf = (b) => { const c = b.children.find((x) => x.isBone); return c ? wpos(c) : b.localToWorld(new V3(0, LEAF[b.name] || 2, 0)); };
// turn a bone so the direction from its head to its end points at `target`
function aimBone(bone, target) {
  const h = wpos(bone), cur = tipOf(bone).sub(h).normalize(), want = target.clone().sub(h).normalize();
  rotateWorld(bone, new Q().setFromUnitVectors(cur, want));
}

// legs: IK chain (upper, lower, end), the paw bone and the paw ball (end of the paw), gait phase (lateral sequence)
const LEGS = [
  { id: "HL", up: "thighL", mid: "shinL", end: "footL", paw: "toesL", front: false, phase: 0.0 },
  { id: "FL", up: "humerusL", mid: "forearmL", end: "handL", paw: "fingersL", front: true, phase: 0.28 },
  { id: "HR", up: "thighR", mid: "shinR", end: "footR", paw: "toesR", front: false, phase: 0.5 },
  { id: "FR", up: "humerusR", mid: "forearmR", end: "handR", paw: "fingersR", front: true, phase: 0.78 }
];
// flexed leg poses (rotations about the body's side axis, + = swing back) for jumps: [upper, lower, end, paw]
const POSE = {
  frontTuck: [-0.75, 1.9, 0.9, 0.4], frontReach: [-0.95, 0.15, -0.25, -0.2], frontDown: [-0.35, 0.05, -0.1, 0],
  hindPush: [0.75, -0.55, 0.95, 0.5], hindTuck: [-0.9, 1.25, -1.0, -0.3], hindTrail: [0.45, -0.2, 0.6, 0.3]
};

export function createCat({ gltf, height, groundAt, levelAt = groundAt }) {
  const holder = new THREE.Group(), body = new THREE.Group(), model = gltf.scene;
  holder.add(body); body.add(model);
  const box0 = new THREE.Box3().setFromObject(model), s = height / (box0.max.y - box0.min.y);
  model.scale.setScalar(s);
  const B = {}; model.traverse((o) => { if (o.isBone) B[o.name] = o; if (o.isMesh) { o.frustumCulled = false; o.castShadow = o.receiveShadow = true; } });
  const bones = Object.values(B), rest = new Map(bones.map((b) => [b, b.quaternion.clone()])), restP = new Map(bones.map((b) => [b, b.position.clone()]));
  // the "sit" clip authored in Blender (sit.py): frame 0 = standing, last frame = sitting; we scrub it by st.sit
  // (sampled directly every frame: three's AnimationMixer skips writing a bone whose value didn't change since the last
  // frame, which fights the per-frame reset below and made held poses snap)
  const sitClip = (gltf.animations || []).find((a) => a.name === "sit");
  const sitTracks = sitClip ? sitClip.tracks.map((tr) => { const [node, prop] = tr.name.split("."); const o = model.getObjectByName(node); return o && (prop === "quaternion" || prop === "position") ? { o, prop, it: tr.createInterpolant() } : null; }).filter(Boolean) : [];
  const sampleSit = (t) => { for (const s of sitTracks) { const v = s.it.evaluate(t); if (s.prop === "quaternion") s.o.quaternion.fromArray(v).normalize(); else s.o.position.fromArray(v); } };
  holder.updateMatrixWorld(true);
  const local = (b) => holder.worldToLocal(wpos(b));
  // rest measurements in the holder's frame
  const legs = LEGS.map((L) => {
    const ball = local(B[L.paw]), wrist = local(B[L.end]);
    return { ...L, home: new V3(ball.x, 0, ball.z), ballH: ball.y, wristOff: wrist.clone().sub(ball),
      pos: new V3(), from: new V3(), to: new V3(), swinging: false, planted: true, w: 1, fk: [0, 0, 0, 0] };
  });
  const legLen = local(B.thighL).y;   // hip height
  const PIVOT = new V3(0, legLen * 0.95, 0);   // body pitches about the middle of the trunk
  const HIP = local(B.thighL).setX(0);   // sitting pivots about the hip joints
  const prevQ = new Map(), LEGB = new Set(LEGS.flatMap((L) => [L.up, L.mid, L.end, L.paw]).map((n) => B[n]));
  const headRestDir = holder.worldToLocal(tipOf(B.head)).sub(local(B.head)).normalize();

  const MID = new V3(0, 0, (legs[1].home.z + legs[0].home.z) / 2);   // trunk middle, between fore and hind paws
  function yawBy(da) {   // turn about the trunk middle so the front and back both step round it
    const before = MID.clone().applyAxisAngle(Y, holder.rotation.y);
    holder.rotation.y += da;
    holder.position.add(before.sub(MID.clone().applyAxisAngle(Y, holder.rotation.y)));
  }
  const st = {
    speed: 0, omega: 0, speedT: 0, omegaT: 0, cycle: 0, yaw: 0, pit: 0, settle: 0, moving: false,
    drop: 0, lift: 0, pitch: 0, roll: 0, look: new V3(0, 2, 10), lookCur: new V3(0, 2, 10), lookW: 1,
    tail: Array.from({ length: 6 }, () => ({ l: 0, s: 0, vl: 0, vs: 0 })), tailMode: "idle",
    action: null, plan: [], busy: false, t: 0, pet: 0, air: 0, sit: 0, sitTarget: 0, meow: -1
  };
  const restAll = () => { for (const b of bones) { b.quaternion.copy(rest.get(b)); b.position.copy(restP.get(b)); } };
  const groundY = (p) => groundAt(p.x, p.z);
  const homeWorld = (L, pos = holder.position, heading = holder.rotation.y) => {
    const h = L.home.clone().applyAxisAngle(Y, heading).add(pos), lv = levelAt(pos.x, pos.z);
    let g = groundAt(h.x, h.z); if (Math.abs(g - lv) > 1) g = lv;   // a paw always lands on the surface she stands on, never past an edge
    h.y = g + L.ballH; return h;
  };
  function plantAll() { for (const L of legs) { L.pos.copy(homeWorld(L)); L.swinging = false; L.planted = true; } }

  // ── locomotion: gait cycle, paw planner ──
  function stepGait(dt) {
    const v = st.speed, w = st.omega, active = Math.abs(v) > 0.05 || Math.abs(w) > 0.15;
    if (active) st.settle = 1; // keep stepping one full cycle after stopping, so every paw ends under the body
    if (!active && st.settle <= 0) { st.moving = false; return; }
    st.moving = true;
    const freq = active ? clamp(0.95 + Math.abs(v) * 0.24 + Math.abs(w) * 0.35, 0.95, 1.9) : 1.4, duty = 0.62;   // quicker, shorter steps as she speeds up (a cat stride stays within its leg reach)
    const dc = dt * freq; st.cycle += dc; if (!active) st.settle -= dc;
    const fwd = new V3(Math.sin(holder.rotation.y), 0, Math.cos(holder.rotation.y));
    for (const L of legs) {
      const ph = frac(st.cycle - L.phase), swingF = 1 - duty, beat = Math.floor(st.cycle - L.phase);
      // a step starts on the leg's beat of the gait, or straight away if the planted paw has been left too far behind (as a real cat re-steps)
      if (!L.swinging && ((ph < swingF && beat !== L.beat) || (L.reach || 0) > 1.08)) {
        const dur = Math.max(0.21, swingF / freq), ahead = dur + duty / freq / 2;
        L.from.copy(L.pos); L.to.copy(homeWorld(L, holder.position.clone().addScaledVector(fwd, v * ahead), holder.rotation.y + w * ahead));
        L.swinging = true; L.planted = false; L.st = 0; L.dur = dur; L.beat = beat;
      }
      if (L.swinging) {
        L.st += dt; const k = clamp(L.st / L.dur, 0, 1), e = smooth(k);
        L.pos.lerpVectors(L.from, L.to, e); L.pos.y += Math.sin(Math.PI * k) * (L.front ? 0.4 : 0.34) * clamp(0.6 + Math.abs(v) * 0.1, 0.6, 1);
        L.lift = Math.sin(Math.PI * k);
        if (k >= 1) { L.pos.copy(L.to); L.swinging = false; L.planted = true; L.lift = 0; }
      }
    }
  }

  // ── pose solve ──
  function solve(dt) {
    restAll();
    // trunk: crouch/raise, pitch about the trunk's middle, a little roll; walk bob twice per stride
    st.walkLow = damp(st.walkLow || 0, st.moving ? 0.16 + Math.min(0.12, st.speed * 0.03) : 0, 4, dt);   // cats walk a little lower than they stand
    const bob = (st.moving ? -0.06 * (0.5 - 0.5 * Math.cos(st.cycle * Math.PI * 4)) : 0) - st.walkLow;
    const sway = st.moving ? 0.035 * Math.sin(st.cycle * Math.PI * 2) : 0;
    const sk = st.sit;
    const qb = new Q().setFromEuler(new THREE.Euler(st.pitch, 0, st.roll + sway, "YXZ"));
    body.quaternion.copy(qb);
    body.position.copy(PIVOT).sub(PIVOT.clone().applyQuaternion(qb)).add(new V3(0, st.lift - st.drop + bob, 0));
    // base pose: the Blender clip (standing at 0, sitting at 1)
    if (sitClip) sampleSit(sitClip.duration * clamp(st.sit, 0, 1));
    holder.updateMatrixWorld(true);
    const side = new V3(1, 0, 0).applyQuaternion(holder.getWorldQuaternion(new Q())), up = Y;
    // breathing and spine bend into turns
    const breath = Math.sin(st.t * 2 * Math.PI / 1.7) * 0.012;
    rotateWorld(B.spine, aa(side, breath)); rotateWorld(B.chest, aa(side, -breath));
    const bend = clamp(st.omega * 0.12, -0.25, 0.25);
    rotateWorld(B.spine, aa(up, bend * 0.5)); rotateWorld(B.chest, aa(up, bend * 0.6));
    if (st.arch) { rotateWorld(B.spine, aa(side, -st.arch)); rotateWorld(B.chest, aa(side, st.arch * 0.6)); }
    // legs: IK to planted/swinging paws, blended with flexed poses for jumps (w = 1 → IK, 0 → pose)
    const legsIK = st.moving || st.air || legs.some((L) => L.w < 1); st.legsIK = legsIK;
    for (const L of legsIK ? legs : []) {
      const chain = [B[L.up], B[L.mid], B[L.end], B[L.paw]];
      let fkQ = null;
      if (L.w < 1) {   // pose
        chain.forEach((b, i) => { if (L.fk[i]) rotateWorld(b, aa(side, L.fk[i])); });
        fkQ = chain.map((b) => b.quaternion.clone());
        chain.forEach((b) => b.quaternion.copy(rest.get(b))); B[L.up].updateMatrixWorld(true);
      }
      if (L.w > 0) {
        const off = L.wristOff, paw = L.pos;
        const wrist = paw.clone().add(off.clone().applyAxisAngle(Y, holder.rotation.y));
        if (L.lift) wrist.addScaledVector(Y, -0.12 * L.lift);   // paw curls under as it swings
        { const pa = wpos(chain[0]), pb = wpos(chain[1]), pc = wpos(chain[2]); L.reach = wrist.distanceTo(pa) / (pa.distanceTo(pb) + pb.distanceTo(pc));
          if (cat.debug) cat.debug[L.id] = { reach: +L.reach.toFixed(3), swing: L.swinging, lift: +(L.lift || 0).toFixed(2) }; }
        ik2(chain[0], chain[1], chain[2], wrist);
        aimBone(chain[2], paw);
        // paw: flat on the ground in stance, toes curled while swinging
        const toe = paw.clone().add(new V3(0, -L.ballH * 0.55, 0.7).applyAxisAngle(Y, holder.rotation.y)); if (L.lift) toe.y -= 0.45 * L.lift;
        aimBone(chain[3], toe);
      }
      if (fkQ) { chain.forEach((b, i) => b.quaternion.slerp(fkQ[i], 1 - L.w)); B[L.up].updateMatrixWorld(true); }
    }
    // head: look at a point, shared across the neck and head, clamped to what a cat can turn
    st.lookCur.x = damp(st.lookCur.x, st.look.x, 2.4, dt); st.lookCur.y = damp(st.lookCur.y, st.look.y, 2.4, dt); st.lookCur.z = damp(st.lookCur.z, st.look.z, 2.4, dt);
    const hp = wpos(B.head), d = holder.worldToLocal(st.lookCur.clone()).sub(holder.worldToLocal(hp.clone())).normalize();
    const restD = holder.worldToLocal(tipOf(B.head)).sub(holder.worldToLocal(wpos(B.head))).normalize();   // where the head points in the base pose
    let yaw = Math.atan2(d.x, d.z) - Math.atan2(restD.x, restD.z), pit = Math.atan2(d.y, Math.hypot(d.x, d.z)) - Math.atan2(restD.y, Math.hypot(restD.x, restD.z));
    yaw = wrap(yaw); if (Math.abs(yaw) > 1.5) { yaw = 0; pit = 0; }   // behind her: just look ahead
    yaw = clamp(yaw, -0.95, 0.95) * st.lookW; pit = clamp(pit, -0.5, 0.45) * st.lookW;   // a comfortable range for a cat's neck
    st.yaw = damp(st.yaw, yaw, 3.5, dt); st.pit = damp(st.pit, pit, 3.5, dt); yaw = st.yaw; pit = st.pit;
    const hq = holder.getWorldQuaternion(new Q());
    for (const [b, k] of [[B.neck, 0.36], [B.neck2, 0.34], [B.head, 0.3]]) {   // spread along the neck, so no one joint bends hard
      rotateWorld(b, aa(up, yaw * k));
      rotateWorld(b, aa(new V3(1, 0, 0).applyAxisAngle(Y, yaw).applyQuaternion(hq), -pit * k));
    }
    // meow: neck stretches and the chin lifts as she calls
    if (st.meow >= 0) { const e = Math.sin(Math.PI * clamp(st.meow / 0.95, 0, 1)); rotateWorld(B.neck, aa(side, -0.1 * e)); rotateWorld(B.head, aa(side, -0.22 * e)); }
    // tail: damped springs toward a target curve (up while walking, low and lazy at rest, upright when petted)
    const n = st.tail.length, mode = st.pet > 0 ? "pet" : st.sit > 0.5 && st.tailMode !== "walk" ? "sit" : st.tailMode;
    for (let i = 0; i < n; i++) {
      const T = st.tail[i], u = i / (n - 1);
      let tl, ts;
      if (mode === "walk") { tl = i === 0 ? 0.85 : i < 3 ? -0.08 : -0.22; ts = 0.12 * Math.sin(st.cycle * Math.PI * 2 - u * 2); }
      else if (mode === "air") { tl = i === 0 ? 0.1 : -0.05; ts = 0; }
      else if (mode === "sit") { tl = 0; ts = (u > 0.5 ? 0.25 * Math.max(0, Math.sin(st.t * 0.9)) : 0) * u + (st.hover ? 0.3 * Math.sin(st.t * 5 - u * 3) * u : 0); }   // the tip twitches
      else if (mode === "pet") { tl = i === 0 ? 1.25 : i < 4 ? -0.05 : -0.35; ts = 0.06 * Math.sin(st.t * 22 - u * 3) * u; }
      else { tl = i === 0 ? -0.12 : i < 3 ? -0.08 : 0.05 + 0.25 * Math.max(0, Math.sin(st.t * 0.9)) * (u > 0.6 ? 1 : 0);
        ts = (0.16 * Math.sin(st.t * 1.3 - u * 2.4) + (st.hover ? 0.35 * Math.sin(st.t * 6 - u * 3) : 0)) * (0.3 + u); }
      ts -= st.omega * 0.18 * (1 - u * 0.5);   // swings out of turns
      const k = 60 - u * 32, c = 2 * Math.sqrt(k) * 0.55;   // tip lags more than the base
      T.vl += (k * (tl - T.l) - c * T.vl) * dt; T.l += T.vl * dt;
      T.vs += (k * (ts - T.s) - c * T.vs) * dt; T.s += T.vs * dt;
      const tw = 1 - 0.8 * sk, tb = B["tail" + i]; rotateWorld(tb, aa(up, T.s * tw)); rotateWorld(tb, aa(side, T.l * tw));
    }
    // temporal smoothing: every joint eases toward its new pose, so nothing can pop between frames
    const kb = 1 - Math.exp(-dt * 22), kl = 1 - Math.exp(-dt * 45);
    for (const b of bones) {
      const p = prevQ.get(b);
      if (p) b.quaternion.copy(p.slerp(b.quaternion, LEGB.has(b) ? kl : kb));
      prevQ.set(b, b.quaternion.clone());
    }
    model.updateMatrixWorld(true);
  }

  // ── actions ──
  const fwdOf = (h) => new V3(Math.sin(h), 0, Math.cos(h));
  const act = {
    walk(to, maxV = 5.5, face) {   // steer her trunk middle to a point: turn toward it first, never orbit it, never walk off a ledge
      // with `face`, the end point is chosen so that after turning to `face` (about the trunk middle) she stands exactly at `to`
      const goal = face === undefined ? to.clone() : to.clone().add(MID.clone().applyAxisAngle(Y, face));   // where the trunk middle should end
      return { run(dt) {
        const mid = holder.position.clone().add(MID.clone().applyAxisAngle(Y, holder.rotation.y));
        const d = goal.clone().sub(mid); d.y = 0; const dist = d.length();
        if (dist < 0.2) { st.speedT = 0; st.omegaT = 0; return true; }
        const want = Math.atan2(d.x, d.z), err = wrap(want - holder.rotation.y);
        st.omegaT = clamp(err * 2.4, -1.15, 1.15);
        // speed: crawl while the target is off to the side, ease in on arrival, and keep the turning circle well inside the distance left
        const facing = clamp((Math.cos(err) - 0.35) / 0.65, 0, 1);
        const vT = Math.min(maxV * facing * clamp(dist / 2.2, 0.12, 1), Math.abs(err) > 0.05 ? 2.2 * dist / (2 * Math.abs(Math.sin(err)) + 1e-3) : maxV);
        st.speedT = vT;
        const g0 = levelAt(holder.position.x, holder.position.z);
        const prev = holder.position.clone(), prevH = holder.rotation.y;
        yawBy(st.omega * dt); holder.position.addScaledVector(fwdOf(holder.rotation.y), st.speed * dt);
        if (levelAt(holder.position.x, holder.position.z) !== g0) { holder.position.copy(prev); holder.rotation.y = prevH; st.speed = st.speedT = 0; return true; }   // ledge: stop
        holder.position.y = g0;
        st.look.copy(to).add(new V3(0, 1.5, 0)); if (dist < 3) st.look.copy(holder.position).addScaledVector(fwdOf(holder.rotation.y), 8).add(new V3(0, 2, 0));
        st.tailMode = "walk";
      } };
    },
    arrive(to, face, maxV) { return act.walk(to, maxV, face); },   // walk there, ready to turn to `face` on the spot
    turn(heading) {
      return { run(dt) {
        const err = wrap(heading - holder.rotation.y); st.omegaT = clamp(err * 2.6, -1.4, 1.4); st.speedT = 0;
        yawBy(st.omega * dt); st.tailMode = "walk";
        st.look.copy(holder.position).addScaledVector(fwdOf(heading), 8).add(new V3(0, 2, 0));
        if (Math.abs(err) < 0.03 && Math.abs(st.omega) < 0.25) { st.omegaT = 0; return true; }
      } };
    },
    sit(dur = 1.1) { return { run(dt) { st.speedT = st.omegaT = 0; st.sitTarget = 1; st.tailMode = "idle"; return st.sit > 0.99; } }; },
    stand(dur = 0.8) { return { run(dt) { st.sitTarget = 0; return st.sit < 0.01; } }; },
    meow(look) { let t = 0; return { run(dt) { if (t === 0) cat.meow(); t += dt; if (look) st.look.copy(typeof look === "function" ? look() : look); return t > 1.1; } }; },
    wait(dur, look) { let t = 0; return { run(dt) { t += dt; st.speedT = st.omegaT = 0; st.tailMode = "idle"; if (look) st.look.copy(typeof look === "function" ? look() : look); return t >= dur; } }; },
    sniff(point, dur) { let t = 0; return { run(dt) { t += dt; st.tailMode = "idle"; st.look.copy(point).add(new V3(0, Math.sin(t * 9) * 0.15, 0)); st.drop = damp(st.drop, 0.35, 5, dt); st.pitch = damp(st.pitch, 0.12, 5, dt); if (t >= dur) { st.drop = 0; st.pitch = 0; return true; } } }; },
    jump(land, up) {   // ballistic jump from where she stands to `land` (a ground point), up onto or down off the desk
      let ph = "look", t = 0, P0, v0, T, flightT = 0;
      const crouchD = up ? 0.85 : 0.35, extend = up ? 0.55 : 0.1;
      return { run(dt) {
        t += dt; st.speed = st.omega = 0; st.phase = "jump:" + ph;
        if (ph === "look") {   // measure the jump: eyes on the landing spot, front lifts a touch (going up) / leans over (going down)
          st.look.copy(land).add(new V3(0, 0.6, 0)); st.tailMode = "idle";
          st.pitch = damp(st.pitch, up ? -0.06 : 0.16, 4, dt);
          if (t > (up ? 0.9 : 0.75)) { ph = "crouch"; t = 0; }
        } else if (ph === "crouch") {   // gather: hindquarters down, a little wiggle
          const k = smooth(t / 0.42); st.drop = crouchD * k; st.pitch = mix(up ? -0.06 : 0.16, up ? -0.16 : 0.22, k);
          st.roll = up ? Math.sin(t * 28) * 0.03 * k : 0; st.arch = -0.1 * k;
          if (t > 0.42) { ph = "push"; t = 0; st.roll = 0; }
        } else if (ph === "push") {     // hind legs drive, front paws leave the ground and tuck
          const k = smooth(t / 0.13); st.drop = crouchD * (1 - k); st.lift = extend * k; st.pitch = mix(up ? -0.16 : 0.22, up ? -0.78 : 0.3, k);
          for (const L of legs) if (L.front) { L.w = 1 - k; L.fk = POSE.frontTuck; } else { L.fk = POSE.hindPush; }
          st.tailMode = "air";
          if (t > 0.13) {   // take off
            ph = "fly"; t = 0; P0 = holder.position.clone();
            const apex = up ? 0.8 : 0.5, H = Math.max(0.3, land.y + apex - P0.y), vy = Math.sqrt(2 * G * H);
            T = vy / G + Math.sqrt(2 * Math.max(0.05, P0.y + H - land.y) / G);
            v0 = new V3((land.x - P0.x) / T, vy, (land.z - P0.z) / T); flightT = T;
          }
        } else if (ph === "fly") {
          const k = clamp(t / flightT, 0, 1);
          holder.position.set(P0.x + v0.x * t, P0.y + v0.y * t - 0.5 * G * t * t, P0.z + v0.z * t);
          st.air = 1; st.lift = extend * (1 - k); st.drop = 0;
          // body: steep and stretched going up, rotating level for the landing; going down, nose dips toward the floor
          st.pitch = up ? mix(-0.78, -0.05, smooth(k * 1.1)) : mix(0.3, 0.55, smooth(k));
          for (const L of legs) {
            L.w = 0;
            if (L.front) L.fk = k < 0.45 ? POSE.frontTuck : lerpPose(POSE.frontTuck, up ? POSE.frontReach : POSE.frontDown, smooth((k - 0.45) / 0.4));
            else L.fk = k < 0.3 ? lerpPose(POSE.hindPush, POSE.hindTrail, k / 0.3) : lerpPose(POSE.hindTrail, POSE.hindTuck, smooth((k - 0.3) / 0.6));
          }
          if (t >= flightT) { holder.position.copy(land); ph = "land"; t = 0; st.air = 0; plantAll(); for (const L of legs) L.w = L.front ? 1 : 0.3; }
        } else if (ph === "land") {     // front paws take the impact, hind legs come down, then she settles
          const k = clamp(t / 0.4, 0, 1);
          st.drop = (up ? 0.45 : 0.75) * Math.sin(Math.PI * Math.min(1, k * 1.3)); st.lift = 0;
          st.pitch = mix(up ? -0.05 : 0.45, 0, smooth(k));
          for (const L of legs) if (!L.front) { L.w = mix(0.3, 1, smooth(k * 2)); L.fk = POSE.hindTuck; }
          st.tailMode = "walk";
          if (k >= 1) { st.drop = 0; st.pitch = 0; st.arch = 0; for (const L of legs) L.w = 1; return true; }
        }
      } };
    }
  };
  function lerpPose(a, b, k) { k = clamp(k, 0, 1); return a.map((x, i) => mix(x, b[i], k)); }

  const cat = {
    holder, bones: B, state: st, clip: sitClip,
    get busy() { return st.busy; },
    place(pos, heading, sitting = false) { holder.position.copy(pos); holder.rotation.y = heading; st.sit = st.sitTarget = sitting ? 1 : 0; holder.updateMatrixWorld(true); plantAll(); prevQ.clear(); },
    meow() { if (st.meow < 0) { st.meow = 0; cat.onMeow && cat.onMeow(); } },
    get sitting() { return st.sit > 0.5; },
    go(steps, onDone) { st.plan = steps.slice(); st.action = null; st.busy = true; st.onDone = onDone; },
    act, idleLook: null, onMeow: null,
    pet(sec = 2.6) { st.pet = sec; },
    update(dt, { hover = false } = {}) {
      dt = Math.min(dt, 1 / 30); st.t += dt; if (st.pet > 0) st.pet -= dt;
      // attention holds for a moment after the pointer leaves her (hover flickers at her outline, which made the head twitch)
      if (hover) st.attUntil = st.t + 2.5; st.hover = st.t < (st.attUntil || 0);
      // speeds change with limited acceleration (no instant starts, stops or turns)
      st.speed += clamp(st.speedT - st.speed, -14 * dt, 10 * dt);
      st.omega += clamp(st.omegaT - st.omega, -5 * dt, 5 * dt);
      st.sit = clamp(st.sit + Math.sign(st.sitTarget - st.sit) * dt / (sitClip ? sitClip.duration : 1.2), 0, 1);   // plays the clip at its own speed
      if (st.meow >= 0) { st.meow += dt; if (st.meow > 1.1) st.meow = -1; }
      if (st.busy) {
        if (!st.action && st.plan.length) { st.action = st.plan.shift()(); st.phase = ""; }
        if (st.action && st.action.run(dt)) { st.action = null; if (!st.plan.length) { st.busy = false; st.speedT = st.omegaT = 0; st.onDone && st.onDone(); } }
      } else {
        st.tailMode = "idle"; st.speedT = st.omegaT = 0;
        if (Math.abs(st.omega) > 1e-3 || st.speed > 1e-3) yawBy(st.omega * dt);
        if (cat.idleLook) st.look.copy(cat.idleLook(st.t, st.hover || st.pet > 0));
      }
      if (!st.air) stepGait(dt);
      solve(dt);
    }
  };
  plantAll();
  return cat;
}
