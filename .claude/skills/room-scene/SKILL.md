---
name: room-scene
description: Build or change things in the 3D room of Sijo's portfolio (main.js) at real-world scale — desk props, wall pieces, window view, paint/floor colours, lighting and day/night — and check them visually. Use when adding or moving an object, when something "looks out of proportion", when matching a paint or tile colour to a swatch, or when making the room feel more real.
---

# Room scene

Everything is procedural in `main.js` (no photo textures for walls/floor). Scale: **1 unit = 5 cm**. The ruler is the
**MacBook Pro 14" (M5)**: 31.26 × 22.12 cm = 6.25 × 4.43 units (`LAP_SCALE`). Size every new thing from its real
dimensions, then check it next to the laptop.

## Real sizes in the scene (keep these)
| Thing | Real | Units | Where (world x, z; desk top y = 0) |
|---|---|---|---|
| Desk | 95 × 50 × 74 cm | 19 × 10, top at y 0, floor y −14.8 | `TABLE` |
| MacBook Pro 14 (Space Black) | 31.3 × 22.1 cm | 6.25 × 4.43 | (−0.6, −0.25) |
| Shea (cat): rigged, walks on the desk, sits, meows (cat-animation skill) | ≈29 cm to head | `CAT_HEIGHT` 5.8 | home (6.4, 0), side-on; sits on the mat at (0.7, 4.4) facing the room (`CAT_SPOT`) |
| Soundbar (click = music) | 40 × 7 × 7 cm | 8 × 1.25 × 1.35 | (5.5, −2.75), behind Shea |
| Astronaut galaxy light (click = projection; head tilts up when on) | ≈26 cm | 5.2 tall | (−7.4, −2.2) by the bottle |
| Water bottle (1 L) | 10.4 × 26 cm | r 0.52, h ≈5 | (−8.4, 5.2) front-left corner |
| Plant pot (mango yellow) | 11 cm | r 1.1, h 2 | (−4.6, −2.4) |
| "Personal explorations" sketchbook | ≈12 × 8 cm | scale 1.3 | (−6.9, 2.1), clear of the MacBook |
| "My Projects" folders + index tabs | ≈18 × 13.5 cm | group scale 0.576 | front-right stack, tab per project |
| iPhone | 147.6 × 71.6 mm | 2.95 × 1.43 | on the mat (−4.3, 4.5) |
| Football | 17 cm | `BALL_R` 1.7 | floor |
| 61-key keyboard | 94 × 32 × 9 cm | 19 × 6.6 × 1.8 | leaning ≈9° on the left wall |
| Sijo's One Piece prints (his photo, `assets/wall-prints.webp`) | ≈80 × 45 cm grid | 16 wide | left wall |
| Modular switch board + charger | 15 × 8 cm | 4.2 × 2.1 | back wall, right of the profile card |
| Profile card (floating UI card, `drawCard` + `stepCard`) | ≈31 × 52 cm, 6 cm off the wall | 6.27 × 10.34 | back wall (7.4, 11.05), right of the poster |

## Art direction
- Walls: matte Oat #CDBEA5 painted plaster (`paintTextures`: stipple bump + soft tonal drift + faint marks) with soft
  shadow strips at floor, cornice and inside corners (`aoStrip`). Floor: glazed Mulberry #664139 60 cm tiles with grout.
  `WALL_PAINT` / `FLOOR_TINT` are pre-darkened so the **rendered** daylight colour matches the swatch — after any
  lighting change re-measure with `pixel.mjs` (wall at 330,350 and 1000,200; floor at 600,820 in the room view).
- Every object that rests on a surface gets a `contact(...)` shadow.
- Window: the NID Bengaluru campus gate across the road (from Sijo's photos: granite gate walls, white sign, steel gate,
  tree-lined drive, white building behind), drawn in `skyTex(night)`; keep the sign/gate in the centre (the curtains hide the sides). No real logos anywhere; brand products (speaker, camera) are drawn without marks.
- Third-party artwork only when Sijo explicitly asks (the One Piece prints are his request); otherwise make original pieces.
- Every visit starts at NIGHT (Sijo's choice); the curtains switch to morning. Night = the pendant lamp does the work: `LOOK.night` + `scene.environmentIntensity` 0.32. Curtains glow by day.

## Check
```bash
QA_DEPS=<dir> node .claude/skills/room-scene/render.mjs http://localhost:4321/ /tmp/r day home room "win:5,19,20,30,18,20" "leftwall:10,16,8,-30,18,8"
QA_DEPS=<dir> node .claude/skills/room-scene/render.mjs http://localhost:4321/ /tmp/r night home room
QA_DEPS=<dir> node .claude/skills/room-scene/pixel.mjs /tmp/r_room.png 330,350 1000,200 600,820
```
`render.mjs` also prints `Desk.boxes()` (world footprints of desk props) — use it to keep things from overlapping.
Look at every screenshot, then run site-qa (qa + sweep) and site-security before pushing.
