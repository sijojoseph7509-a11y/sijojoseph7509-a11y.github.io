---
name: room-lab
description: Prototype lab for Sijo's top-view room (/lab/): the top-down bedroom scene with Sijo's walking character, the long intro glide from the whole room to the desk, and the art direction rules. Use when changing anything in lab/, building or refining the 3D character of Sijo, matching the room to a reference photo, or when promoting the lab into the main site.
---

# Room lab (top-view prototype)

`lab/` is a standalone prototype of the next version of the site. It is deployed at `/lab/` but **not linked** from the main site and
carries `noindex`. Nothing in `lab/` is loaded by `index.html`/`main.js`, so it can change freely. Promote ideas to the main site only
after Sijo approves them in the lab.

Files: `lab/index.html` (own CSP; import map hash must be updated when the import map changes), `lab/lab.css`, `lab/lab.js`
(everything: room, props, character, path-finding, camera). Shared assets are read from `../assets`, `../models`, `../vendor`.

## Check it (every change)
1. Serve the repo: preview server "site" (http://localhost:4321) or `python3 -m http.server 4321` in the repo.
2. `QA_DEPS=<dir with puppeteer-core> node .claude/skills/room-lab/lab-shot.mjs http://localhost:4321/lab/ <out-dir> [tag]`
   - Saves: room (desktop/phone, day/night), desk view, two intro frames, Sijo close-ups (front/side/top/head). `ONLY=a,b` limits shots.
   - Exits 1 on any console error, failed request, or if the cat/football didn't load.
3. **Look at every screenshot.** Judge it the way a design hiring manager would (see memory: hiring-quality-projects).
   Test hooks: `Lab.state()`, `Lab.toggleDay()`, `Lab.fly("desk"|"room")`, `Lab.pose(x, z, heading)`, `Lab.cam([x,y,z],[tx,ty,tz])`, `Lab.walkTo(x, z)`.
   URL: `?view=room` (stay on the overview), `?view=desk` (start at the desk).

## Layout (metres; −z = window wall = top of a portrait screen)
Room 2.7 × 4.5 × 2.5 m. Window with blinds over the bed (top-left) · desk + hutch + pegboard (top-right) · office chair · rug down the
middle · black leather sofa (bottom-left) + oak/steel coffee table with a film camera · long black cubby shelf on the right wall with
plant, books, globe lamp, record player crate at its end · framed art on the right wall (Sijo's poster is the hero frame) · door at the
bottom with a light entry. Kept from the main site: poster, MacBook with his wallpaper, Shea the cat (on the bed), football, plants,
day ↔ night window (follows the visitor's clock).

## Art direction
- Palette from the reference: grey walls #cfd0d2 with bright wall caps, dark grey oak planks, black furniture, white bedding, one warm
  wood accent (coffee table). Colour comes only from Sijo's things: the poster's red, the yellow pot, plants, his red sneakers.
- Light: sun through the blinds (real slat shadows), warm globe lamp + LED strip under the hutch, soft contact shadows under furniture.
- Camera: portrait = window at the top; landscape = room turned across the screen. Intro: whole room → long glide (≈5.6 s, smootherstep
  on a curve, look-target and up-vector blended so it never rolls) to the desk. "Room / Desk" pill flies between them.

## Sijo (the character) — from his photos
Medium-brown skin, big black wavy-curly hair (sculpted noise mass + small curls), full short beard and moustache, big smile; open
pale lavender-white plaid overshirt (sleeves rolled to the forearm) over a white tee; black sling bag across the chest; light acid-wash
baggy jeans; red sneakers with white soles; silver bracelet and a watch. Height ≈ 1.78 m. He walks in through the door at the start,
goes to the record player, wanders when left alone, walks where you tap (A* on a 6 cm grid around furniture), nudges the football,
waves when clicked, and steps up to the desk when the laptop is clicked.

## Promoting to the main site
Bump `?v=N` + `version.json`, keep the Mac desktop (`os.js`) as the laptop's destination, run copy-check, site-qa (update its checks
for the new scene: `window.Desk` hooks), site-security (CSP hash), then push.
