---
name: cat-animation
description: Rig, animate and check Shea the cat (models/cat/shea.glb + cat.js) — re-skin the mesh in Blender, change how she walks, jumps, looks and wanders, and capture frame-exact sequences to judge realism. Use when Sijo says the cat looks fake/stiff, wants her to do something new (sit, lie down, play), when replacing the cat model, or after any change to cat.js.
---

# Cat animation (Shea)

**How she works**
- `models/cat/shea.glb`: the cat mesh with a 32-bone quadruped skeleton (root, hips → spine → chest → neck → neck2 → head,
  pelvisBack → tail0–5, scapula/humerus/forearm/hand/fingers L+R, thigh/shin/foot/toes L+R), skinned in Blender with bone-heat
  weights. The skull and ears are rigid to the head; loose parts (eyes, inner ears, chest bib) copy the nearest skin weights.
- `cat.js` (`createCat`): procedural animation from cat biomechanics, nothing keyframed:
  - walk: lateral-sequence gait (HL 0, FL .28, HR .5, FR .78), duty 0.62. Paws are planted by two-bone IK
    (Holden's analytic solver) and swing on an arc toward where the body will be. The body bobs twice per stride and
    the spine bends into turns. Turns pivot about the trunk middle (`MID`).
  - jump: look → crouch (hindquarters down, wiggle) → push (hind legs drive, front tuck) → ballistic flight with real
    gravity (`G` = 9.81 m/s²) → land front paws first and absorb. Poses in `POSE` are rotations about the body's side axis (+ = swing back).
  - head look-at spread over neck/neck2/head (clamped); tail = damped springs (up while walking, lazy at rest, upright when petted); breathing.
  - actions: `walk`, `arrive(to, face)`, `turn`, `wait`, `sniff`, `jump(land, up)`; `cat.go([...factories], onDone)`.
- `main.js`: `CAT_SPOT`, `groundAt` (desk top vs floor), `catWanderPlan()` (edge → hop down → window → sniff the
  football → jump up → back to her spot), first wander 10 s after Enter, then every 45–80 s. Walking never crosses a
  ledge; only jumps change level.

## Re-rig (after changing joints or the mesh)
```bash
brew install --cask blender                      # once
blender -b -P .claude/skills/cat-animation/views.py -- "$PWD/models/cat/cat.glb" /tmp/v       # ortho side/top/front views to read joints
blender -b -P .claude/skills/cat-animation/rig.py -- "$PWD/models/cat/cat.glb" /tmp/cat_rigged.glb /tmp/pose.png   # rig + pose test renders
npx -y gltfpack@0.22 -i /tmp/cat_rigged.glb -o models/cat/shea.glb -cc -kn -kv -vtf          # -kv keeps the UVs, -kn the bone names
```
Joint positions are in `J` in rig.py (cm; x side, −y forward, z up). Look at `pose.png` and `pose_3q.png`: legs should
bend at the elbows/knees with no tearing, and the eyes must stay in their sockets.

## Check the motion (frame-exact)
`Desk.catStep(sec)` advances her in fixed 1/60 s steps and renders. Screenshots never drop frames this way.
```bash
QA_DEPS=<dir> node .claude/skills/cat-animation/catstep.mjs "<cam px,py,pz,tx,ty,tz>" /tmp/f 0.1 30 <skipSec>   # frames of her wander
QA_DEPS=<dir> node .claude/skills/cat-animation/catlog.mjs 380      # position/heading/speed/phase every 0.1 s
```
Good cameras: hop-down `19,3,20,8,-3,5`; floor walk `6,-11,27,12.5,-13,13`; jump up `-1,-4,25,8,-6,7`; whole room `2,5,30,7,-6,7`.
Judge against real cat video: paws must not slide while planted, no floating, no clipping through the desk, head steady, tail lagging.
site-qa has a round-trip check (starts on the desk, reaches the floor, comes back within 0.6).
