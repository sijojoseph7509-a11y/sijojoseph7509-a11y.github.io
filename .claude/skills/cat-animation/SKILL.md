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
  - sit (`act.sit/stand`, `SIT`): pivots the trunk about the hips (chest up, rump down), hind metatarsals flat, front paws step back under the chest, tail wraps round.
  - meow (`act.meow`, `cat.meow()`): neck stretch + chin lift; main.js plays `Sound.meow()` (synthesised, original). The mesh's mouth is sculpted closed with no inside, so a jaw bone was tried and dropped (opening it only stretched skin).
  - smoothness: speeds/turns are acceleration-limited (`speedT/omegaT`), soft IK past 88 % reach, a paw left too far behind re-steps, stride rate rises with speed, paws always land on the surface she stands on (never past an edge), head angles are smoothed and look ahead when the target is behind her, and every joint is eased each frame (`prevQ`).
  - jump (kept, not used since v79): look → crouch (hindquarters down, wiggle) → push (hind legs drive, front tuck) → ballistic flight with real
    gravity (`G` = 9.81 m/s²) → land front paws first and absorb. Poses in `POSE` are rotations about the body's side axis (+ = swing back).
  - head look-at spread over neck/neck2/head (clamped); tail = damped springs (up while walking, lazy at rest, upright when petted); breathing.
  - actions: `walk`, `arrive(to, face)`, `turn`, `wait`, `sniff`, `jump(land, up)`; `cat.go([...factories], onDone)`.
- `main.js`: `CAT_SPOT` (desk, via, mat), `levelAt` (desk top vs floor, for her body), `groundAt` (adds folder/mat thickness, for paws),
  `catWanderPlan()` (stand → round the laptop over the folders → sit on the mat facing the room → meow → back → sit at her spot,
  or every third round just sit and meow), first round 10 s after Enter, then every 25–45 s. Sijo wants her to stay on the desk.
  Hover never scales her (her paws are IK-pinned).

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
Good cameras: sitting on the mat `-6,5,18,0.8,2,4.4` and side `13,3,10,0.8,2,4.4`; her spot `14,4,12,6.4,2,0`; walk `3,4,16,3,1.5,3.5`.
`QA_DEPS=<dir> node .claude/skills/cat-animation/jitter.mjs` measures every joint's rotation per frame over a whole round
(deterministic random seed); healthy walking peaks ≈ 12–15°/frame with smooth ramps, a spike far above that is a glitch.
Judge against real cat video: paws must not slide while planted, no floating, no clipping through the desk, head steady, tail lagging.
site-qa checks a full round: never leaves the desk, sits, meows, comes back within 0.6, no joint jumps > 25°/frame.
