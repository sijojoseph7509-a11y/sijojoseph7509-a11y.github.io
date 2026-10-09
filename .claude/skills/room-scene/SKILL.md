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
| Shea (cat) | ≈29 cm to head | `CAT_HEIGHT` 5.8 | (6.4, 0), side-on, tail over the edge |
| Soundbar (click = music) | 40 × 7 × 7 cm | 8 × 1.25 × 1.35 | (5.5, −2.75), behind Shea |
| Astronaut galaxy light (click = projection) | ≈26 cm | 5.2 tall | (−6.7, −2.3) by the bottle |
| Water bottle | 7.4 × 25 cm | r 0.37, h ≈5 | (−8.6, −2.6) |
| Plant pot (mango yellow) | 11 cm | r 1.1, h 2 | (−4.6, −2.4) |
| Pencil cup + pencils | 8 × 10 cm, pencils 17 cm | r 0.42, h 2; 3.5 | (−8.4, 5.2) front-left |
| A5 sketchbook | 21 × 14.8 cm | scale 2.35 | (−6.3, 0.9) |
| A4 project folders + index tabs | 31 × 24 cm | 6.2 × 4.7 | stack at (4.6, 4.55), tab per project |
| iPhone | 147.6 × 71.6 mm | 2.95 × 1.43 | on the mat (−4.3, 4.5) |
| Football (size 5) | 22 cm | `BALL_R` 2.2 | floor |
| 61-key keyboard | 94 × 32 × 9 cm | 19 × 6.6 × 1.8 | leaning ≈9° on the left wall |
| Pop-art prints (10, original art) | ≈21 × 26 cm each | 4.2 × 5.25 | left wall, 5 × 2 grid |
| Camera + red cap on a hook | camera 12 × 7.5 cm | 2.4 × 1.5 | left wall, near the back corner |
| Macramé shelf, succulents, toy bus | 40 cm wide | 6.2 | right wall, back corner (far right) |
| Modular switch board | 15 × 8 cm | 4.2 × 2.1 | back wall, left |

## Art direction
- Walls: matte Oat #CDBEA5 painted plaster (`paintTextures`: stipple bump + soft tonal drift + faint marks) with soft
  shadow strips at floor, cornice and inside corners (`aoStrip`). Floor: glazed Mulberry #664139 60 cm tiles with grout.
  `WALL_PAINT` / `FLOOR_TINT` are pre-darkened so the **rendered** daylight colour matches the swatch — after any
  lighting change re-measure with `pixel.mjs` (wall at 330,350 and 1000,200; floor at 600,820 in the room view).
- Every object that rests on a surface gets a `contact(...)` shadow.
- Window: NID Bengaluru across the road (brick + white bands, sign, rain tree, gulmohar, palm, auto-rickshaw), drawn in
  `skyTex(night)`; soft glass blur. No real logos anywhere; brand products (speaker, camera) are drawn without marks.
- No third-party characters or artwork (copyright): make an original piece in the same mood instead.
- Night = the pendant lamp does the work: `LOOK.night` + `scene.environmentIntensity` 0.32. Curtains glow by day.

## Check
```bash
QA_DEPS=<dir> node .claude/skills/room-scene/render.mjs http://localhost:4321/ /tmp/r day home room "win:5,19,20,30,18,20" "leftwall:10,16,8,-30,18,8"
QA_DEPS=<dir> node .claude/skills/room-scene/render.mjs http://localhost:4321/ /tmp/r night home room
QA_DEPS=<dir> node .claude/skills/room-scene/pixel.mjs /tmp/r_room.png 330,350 1000,200 600,820
```
`render.mjs` also prints `Desk.boxes()` (world footprints of desk props) — use it to keep things from overlapping.
Look at every screenshot, then run site-qa (qa + sweep) and site-security before pushing.
