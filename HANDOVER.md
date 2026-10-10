# Handover — Sijo Joseph · Interactive 3D Portfolio

| | |
|---|---|
| **Document** | Project handover & technical reference |
| **Version** | 1.4 — 3 October 2026 (load time, bug fixes, stale-cache fix, phone/UX pass, automated QA) |
| **Owner** | Sijo Joseph (GitHub: `sijojoseph7509-a11y`) |
| **Prepared by** | Claude (AI assistant), working with Sijo Joseph |
| **Live site** | https://sijojoseph7509-a11y.github.io |
| **Repository** | https://github.com/sijojoseph7509-a11y/sijojoseph7509-a11y.github.io (public, branch `main`) |
| **Mobile preview page** | https://sijojoseph7509-a11y.github.io/mobile-preview.html |
| **Status** | Live and working. Content (email, links, projects, experience, résumé) is still **placeholder** — see §13. |
| **Last commit at handover** | `4787a8c` — "Apple-style boot zoom, poster above the Mac, phone zoom-out fix" |
| **Asset version (cache-buster)** | `?v=61` — must match `BUILD` in index.html and `version.json` |

---

## Contents
1. [Summary](#1-summary)
2. [Access, accounts and hosting](#2-access-accounts-and-hosting)
3. [Quick start](#3-quick-start)
4. [Tech stack and dependencies](#4-tech-stack-and-dependencies)
5. [File structure](#5-file-structure)
6. [Architecture and runtime flow](#6-architecture-and-runtime-flow)
7. [World conventions (scale, axes, units)](#7-world-conventions-scale-axes-units)
8. [Scene inventory — every object](#8-scene-inventory--every-object)
9. [Camera and controls](#9-camera-and-controls)
10. [Lighting, materials and rendering](#10-lighting-materials-and-rendering)
11. [The Mac desktop (OS overlay)](#11-the-mac-desktop-os-overlay)
12. [Overlay UI on the 3D page (HUD, nav, hint, loader)](#12-overlay-ui-on-the-3d-page-hud-nav-hint-loader)
13. [Content — how to edit, and what is still placeholder](#13-content--how-to-edit-and-what-is-still-placeholder)
14. [3D models and assets — sources, processing, licences](#14-3d-models-and-assets--sources-processing-licences)
15. [Audio](#15-audio)
16. [Design tokens](#16-design-tokens)
17. [Responsive, mobile and accessibility](#17-responsive-mobile-and-accessibility)
18. [Performance](#18-performance)
19. [Deployment and cache-busting](#19-deployment-and-cache-busting)
20. [QA checklist](#20-qa-checklist)
21. [Known issues, limitations and tech debt](#21-known-issues-limitations-and-tech-debt)
22. [Decision log (what was tried, kept or reverted)](#22-decision-log-what-was-tried-kept-or-reverted)
23. [Change history](#23-change-history)
24. [Open items / recommended next steps](#24-open-items--recommended-next-steps)
25. [Legal, credits and IP notes](#25-legal-credits-and-ip-notes)

---

## 1. Summary

A single-page, no-build personal portfolio. The landing view is a **3D recreation of Sijo's real desk corner** (built with Three.js), viewed straight-on through a perspective camera:

- A black desk with a zebra-print fleece throw, a Midnight-coloured 13" laptop, a ginger Persian cat, an upright headset, a mango-yellow plant pot, a green bottle, a soundbar, black project folders, a phone, a sketchbook, a pen stand and a football on the marble floor.
- Sijo's own **A1 typographic poster** on the wall, his name and roles as wall lettering, and a **woven wire-cage pendant lamp**.
- Clicking the laptop flies the camera into the screen; the screen then **zooms out into a full macOS 27-style desktop** (menu bar with real menus, Spotlight, dock, window with sidebar + unified toolbar) containing **About, Work, Skills, Resume, Contact**.
- Original generative **lo-fi music** (synthesised live — no audio files) and small UI sounds.

Everything is static files served by GitHub Pages. There is **no build step, no package.json, no server code**.

---

## 2. Access, accounts and hosting

| Item | Detail |
|---|---|
| GitHub account | `sijojoseph7509-a11y` (also the git author name on Sijo's Mac) |
| Repository | `sijojoseph7509-a11y.github.io` — public. A "user site" repo, so Pages serves it at the root domain. |
| Hosting | GitHub Pages, **legacy build** from branch `main`, folder `/` (root). HTTPS enforced. Enabled automatically on repo creation. |
| Custom domain | None (`cname: null`). To add one: repo Settings → Pages → Custom domain. |
| Deploy trigger | Any push to `main`. Build takes **~40–95 s**. |
| CLI auth | GitHub CLI (`gh`) logged in on Sijo's Mac via browser (keyring). Scopes: `gist, read:org, repo, workflow`. |
| Third-party services | None. No analytics, no backend, no API keys, no cookies. `localStorage` keys used: `muted` (sound on/off). (`theme`/`lamp` keys exist from older versions and are no longer read.) |
| External CDNs | `cdn.jsdelivr.net` (Three.js), `fonts.googleapis.com` / `fonts.gstatic.com` (Inter, Caveat). |

> ⚠️ **Working-copy location:** the project was built in a temporary "scratch" folder that belongs to the Claude session and is **deleted when that session is deleted**. **GitHub is the source of truth.** To work on it elsewhere: `git clone https://github.com/sijojoseph7509-a11y/sijojoseph7509-a11y.github.io.git`.

---

## 3. Quick start

```bash
git clone https://github.com/sijojoseph7509-a11y/sijojoseph7509-a11y.github.io.git
cd sijojoseph7509-a11y.github.io
python3 -m http.server 4173        # any static server works
# open http://localhost:4173
```

- Must be served over **http(s)** — opening `index.html` as a `file://` breaks ES-module imports and model loading.
- Handy URL parameters:
  - `?open=about|work|skills|resume|contact` — boots straight into that window on load.
  - `?v=N` — harmless; used to defeat browser caching while testing.
- To edit text/links/projects: change **`content.js`** only (see §13).
- To publish: commit and push to `main` (see §19). **Bump `?v=` in `index.html` on every release.**

---

## 4. Tech stack and dependencies

| Layer | Choice | Version / source | Notes |
|---|---|---|---|
| 3D engine | Three.js | **0.165.0**, self-hosted in `vendor/three/` (v2.4; was jsDelivr CDN) | Pinned. Upgrading may change lighting/colour defaults — re-test. |
| Three addons | OrbitControls, RoundedBoxGeometry, RoomEnvironment, GLTFLoader + MeshoptDecoder, BufferGeometryUtils (`mergeGeometries`) | same CDN, `examples/jsm/` | All three models are meshopt-compressed GLBs. |
| UI | Hand-written HTML/CSS/JS | — | No framework. |
| Fonts | System font stack (SF Pro on Apple devices) → **Inter** fallback; **Caveat** (sticky note) | Google Fonts | Canvas text waits for fonts (max 3 s) before drawing. |
| Audio | Web Audio API | built-in | No audio files. |
| Hosting | GitHub Pages | — | Static. |
| Tooling used once (not needed to run) | `gltfpack` 0.22 via `npx` (headset mesh simplification), macOS `sips` (texture resize/convert), `bsdtar` (unpacking .rar/.zip) | — | See §14. |

Browser support: modern Chrome, Safari (macOS/iOS), Edge, Firefox with WebGL2. If WebGL fails, the page skips the 3D and opens the desktop directly.

---

## 5. File structure

```
/
├── index.html            7.3 KB  Page shell: import map, HUD, nav, loader, desktop markup
├── styles.css           26.1 KB  All styling (3D page overlays + macOS-style desktop)
├── main.js              ~70 KB   Three.js scene, camera, interactions, models, render loop (≈1,300 lines)
├── os.js                21.6 KB  The Mac desktop: windows, sidebar, dock, menus, Spotlight, shortcuts, zoom animation
├── music.js              6.2 KB  Original generative lo-fi track (Web Audio)
├── content.js            3.4 KB  ★ ALL editable text, links, projects, skills, experience
├── mobile-preview.html   2.7 KB  Phone-frame preview of the live site (3 sizes)
├── .gitignore                    ignores .claude/ and .DS_Store
├── HANDOVER.md                   this document
└── models/
    ├── cat/
    │   ├── cat.glb               343 KB  realistic cat mesh, meshopt-compressed + quantised (unpacked to float cm at load for the tail rig)
    │   ├── cat_diffuse.jpg       238 KB  recoloured to ginger at runtime (keep it RGB — a greyscale JPEG shifts the tone darker)
    │   └── cat_bump.jpg           83 KB  (512 px)
    ├── football/
    │   ├── football.glb           89 KB  (from the FBX, simplified to 15k triangles)
    │   ├── BaseColor.jpg (512 px) / Normal.jpg / Roughness.jpg (256 px)
    └── headphones/headphones.glb  166 KB  (simplified from a 97 MB OBJ, meshopt-compressed)
```

Script load order in `index.html` (classic scripts first, module last):
`content.js` → `os.js` → `music.js` → `main.js` (type=module). `os.js` exposes `window.OS`; `music.js` exposes `window.Music`; `main.js` exposes `window.Sound`.

---

## 6. Architecture and runtime flow

### 6.1 Start-up sequence (`main.js`)
0. `index.html` modulepreloads three.js, its addons and `main.js` (**after** the import map, which must come first). The very first thing `main.js` does is start downloading all model files (`fetchAsset`) — deliberately *not* from `index.html`, because on slow connections they would starve the three.js download (measured: three.js arrived last, at 14.7 s on 3G).
1. Loader visible (black, SJ ring, progress bar, "Good things take time").
2. Wait for web fonts (`document.fonts.load`, capped at 3 s) so canvas textures draw with the right type.
3. Create renderer (WebGL, antialias, pixel ratio ≤ 2, ACES tone mapping, PCF soft shadows), scene, perspective camera, OrbitControls.
4. Build all procedural geometry synchronously (desk, throw, mat, walls, floor, poster, lamp, laptop, objects, wall lettering, desk labels).
5. Load the cat, football and headset through a `LoadingManager` that drives the progress bar (50→95 %). Each model retries once; a model that still fails is simply left out (warning in console) — there are **no built-in stand-ins** any more. The loader waits **at most 5 s from script start**; anything still downloading pops in when it arrives.
6. Draw the laptop screen canvas, `renderer.compileAsync` (capped at 4 s), start the `requestAnimationFrame` loop, fade the loader.
7. **Welcome screen** (inside `#loader`, `.ready` state): three tips + **Enter** / "Enter without sound". That tap is the user gesture browsers require for audio, so music starts on it; it also stops a first "wake-up" tap from landing on the laptop. Wording switches to "Tap" on touch devices (`TOUCH` = `pointer: coarse`).
8. After Enter, first-time visitors see a bobbing **"Tap the laptop" pointer** (`#coach`, positioned over the laptop every frame) until they open the laptop once (`localStorage.openedLaptop`).
9. If `?open=` is present, the welcome screen is skipped and it boots into that section after 0.9 s.

### 6.2 Render loop (`loop(now)`)
Per frame (skipped entirely while the Mac desktop fully covers the scene — `OS.isCovering()`; animation steps are scaled by frame time so 120 Hz screens don't run double speed): camera tween (if any) → `controls.update()` → hover lift/scale for interactive objects → power-key pulse → cat tail swish → hearts → football roll → wiggle → laptop screen redraw (every 33 ms, ~30 fps) → render.

### 6.3 Interactivity registry
`interactive(object, label, onClick)` registers an object in `hoverables`. A raycaster on `pointermove` finds the nearest registered ancestor → tooltip + pointer cursor + 5 % hover scale. A `pointerup` within 6 px of `pointerdown` counts as a click (drags never click).

### 6.4 Boot / un-boot (camera ↔ desktop hand-off)
1. `boot(app)` lifts the zoom minimum (`controls.minDistance = 0`), computes the distance that frames the laptop screen (`SCREEN_W × SCREEN_H` × 1.15), and flies the camera along the screen's normal over **1250 ms** with `EASE_IN_OUT = cubic-bezier(0.42, 0, 0.2, 1)`.
2. On arrival it projects the screen's 4 corners to get its on-page rectangle (`screenRect()`), then calls `OS.open(app, onClose, rect)`.
3. `os.js` sets the desktop's transform so it exactly covers that rectangle, then transitions to full size over **620 ms** with `cubic-bezier(0.32, 0.72, 0, 1)` while the backdrop fades in. The window pops in after a 0.18 s delay.
4. Closing (dock "Back to desk", Esc, menu "Back to Desk", ⌘Q item) reverses: desktop shrinks back into the stored rectangle (540 ms), then the camera flies home over **1150 ms** with `EASE_APPLE`, and zoom limits are restored.
5. `prefers-reduced-motion`: the zoom is skipped (instant open/close).
6. **History:** opening the desktop pushes a history entry, so the browser back button / phone back-swipe closes it (`popstate`) instead of leaving the site; closing from the UI pops that entry. Reopening the tab (bfcache `pageshow`, or after > 10 min hidden) closes the desktop so visitors start at the desk.

### 6.5 Global objects
| Global | Defined in | API |
|---|---|---|
| `window.SITE` | content.js | data only |
| `window.OS` | os.js | `open(key, onClose?, fromRect?)`, `close()`, `setDark(bool)`, `isOpen()`, `isCovering()` |
| `window.Music` | music.js | `start(audioCtx)`, `stop()`, `playing` |
| `window.Sound` | main.js | `hover()`, `click()`, `boot()`, `purr()`, `audio()`, `toggle()`, `muted` |

---

## 7. World conventions (scale, axes, units)

- **Y is up.** The **desk top surface is y = 0**. The floor is **y = −14.8** (desk height ≈ 74 cm).
- **1 world unit ≈ 5 cm.** Reference: the 13" laptop is 6.0 units wide (≈ 30 cm).
- +Z points toward the viewer; the back wall is at **`WALL_Z = TABLE.z − TABLE.d/2 − 0.35 = −3.75`**.
- Desk footprint (`TABLE`): centre x 0.2, z 1.6; width 19 (≈ 95 cm), depth 10 (≈ 50 cm), top thickness 0.5.
- Derived edges: `X0 = −9.3`, `X1 = 9.7`, `Z0 = −3.4`, `Z1 = 6.6`. Right cubby spans `CX0 = 2.9` → `CX1 = 9.5`.

---

## 8. Scene inventory — every object

Positions are world units (x, y, z); rotation is about Y unless stated.

### 8.1 Room
| Object | Detail |
|---|---|
| Back wall | Plane 400 × 220 at (0.2, 60, −3.75). Procedural plaster noise texture tinted **#45403b warm graphite** (v1.8 — sage green #87a081 was tried in v1.7 and reverted; near-black #2c2b2a before v1.5). Skirting #2e2a27. Name lettering light (#f5f5f7 / #d1d1d6 / #aeaeb2). Receives shadows. |
| Side walls | Two planes 400 × 220 at x = 0.2 ± **44** (v1.5; were ± 24 and boxed the desk in), y 60, centred z = WALL_Z + 200 (span z −3.75 → 396). Same material as back wall. Added so orbiting never shows the void. |
| Skirting | 400 × 0.5 × 0.12 at y = −14.55, tinted #232221. |
| Floor | Plane 600 × 600 at y = −14.8. Procedural **cream-white marble** (veins, clouding, grout every 2 units), clearcoat 0.8. |
| Background / fog | Scene background #1d1d1f. Fog colour = background; near = camera distance + 30, far = + 130. |

### 8.2 Desk (built from Sijo's photo)
| Part | Detail |
|---|---|
| Top | 19 × 0.5 × 10, dark laminate **#221e1c** (roughness 0.5, clearcoat 0.25). |
| Left side panel | 0.6 thick, full height/depth, at x ≈ −8.8. |
| Right cubby | Outer + inner panels (0.5 thick), shelf at y −5.2, bottom at y −13.9, back panel; open front. Contains a dark keyboard (canvas key grid) and a white charger cube. |
| Back rail | 18 × 1.8 × 0.25 under the back edge. |
| Zebra fleece throw | **Removed in v69** at Sijo's request; the desk top is bare dark laminate. |
| Desk mat | 11.4 × 3.8 at (−3.1, 0.04, 4.6). **Original** deep navy → violet → blue gradient with light streaks, sparkles and a dashed stitched edge. (Sijo's real mat shows a copyrighted anime character — deliberately not reproduced.) |

### 8.3 Wall items
| Object | Detail | Interaction |
|---|---|---|
| **Poster** (Sijo's own work) | **A1: 11.88 × 16.82 units** (594 × 841 mm) at (−7.8, 13.1, WALL_Z + 0.03) — bottom edge just above the MacBook screen line. Canvas 2048 × 2896 (drawn on a 1240-wide layout at 2×). Red #c7262e scattered "SOMETHING" letters; black (#0a0a0a, Inter 900, 84 px, −5 px tracking) lines: "TO CREATE A SOLUTION / FOR SOMETHING / SOMETHING THAT HAS / EVEN BIGGER CAUSE / THAN ME / SOMETHING THAT I AM / SUPPOSED TO MAKE / TO BEGIN AN ERA"; vertical "SIJO JOSEPH" (left) and "GIVE ME THE WISDOM THAT SITS BY YOUR THRONE" (right). Paper curl + 4 clear tape pieces. | **None** (decoration only, by request). |
| **Name lettering** | Plane 8.4 wide at (6.6, 9.4) — "Sijo Joseph." (Inter 700, 210 px) + "Multidisciplinary Designer" (112 px, #d1d1d6). | Click → About. |
| **Roles lettering** | Plane 8.4 wide at (6.6, 7.2) — two lines of roles joined with " · " (92 px, #aeaeb2). | — |
| **Pendant lamp** | Woven wire cage (38 random tube strands + 2 rings, merged, #2b2522 metal), urn profile 4.2 tall; cap, 30-unit cord; bulb #ffd39a + additive glow sprite. Hangs at (0.4, **15.4**, −0.8) (v1.6: raised so the cage sits at about half the poster's height); sways ±0.025 rad. Point light #ffb468, intensity **55**, distance 34, decay 2; casts 512 px shadows on screens wider than 760 px only. | None (the light/dark toggle was removed). |

### 8.4 Laptop (13", Midnight)
| Item | Detail |
|---|---|
| Group | at (0, 0, 0.4), rotated −0.08 rad. Dimensions `LAP_W 6.0`, `LAP_D 4.25`, base 0.2, lid 0.11 × 4.15. Lid opened −0.26 rad (~105°). |
| Finish | **Midnight** `#2a303c` (metalness 0.7, roughness 0.34); scoop #222833; trackpad #343b48. |
| Details | Black keys (function row + 5 rows, instanced), speaker grilles (2 × 60 holes), notch + camera dot, hinge, rubber feet, **SJ monogram** on lid back (no Apple logo), stickers on lid back (pixel heart, "3D" star), sticky note on palm rest ("make it simple, then make it fun ✶", Caveat). |
| Screen | 5.62 × 3.6 plane with a live 800 × 512 canvas (unlit, no tone mapping): original gradient wallpaper with drifting blobs, transparent menu bar ("SJ Portfolio File Edit View Go Window Help" + clock), glass window "Hi, I'm Sijo." with pulsing **Click to open** button, glass dock. Typing mode shows a Terminal. |
| Power key | Top-right key with an orange glowing ring (pulses). Click → boot About. |
| Interactions | Screen → boot About · Power key → boot About · Keys/trackpad → types "hello, world! I'm Sijo :)" in the screen Terminal. |

### 8.5 Desk objects
| Object | Position | Detail | Interaction |
|---|---|---|---|
| **Cat** (model) | (7.0, 0, 1.0), facing −0.55 rad, height **5.0** | Realistic OBJ, fur recoloured to ginger at runtime (`gingerize`), bump map kept. Tail vertices (|x| < 1.8, y > 19.5, z > 17 in model cm) bent per frame: idle amp 0.14 @ 1.8 rad/s; hover 0.4 @ 6; petting 0.75 @ 9 + tip lift. | Hover: "pet me? 🥺". Click: purr (1.8 s), 5 floating hearts, big tail swish for 2.6 s. |
| **Headset** (model) | (6.3, 0, −2.0), upright, rotated −0.25, 4.2 tall | Simplified GLB on its stand; untextured parts restyled: graphite leather #2c2c2e, brushed metal #8e8e93, black plastic #161618; brand-green accents → #48484a. | Click: sound on/off. |
| Football (model) | (−3.2, floor + 1.5, 0.8), radius **1.5** | FBX + matte PBR textures (BaseColor/Normal/Roughness). | Hover "Kick me ⚽"; click rolls it (vx 0.4, friction 0.985, spins). Hard-stops at the inside faces of the left panel (x = X0 + 0.8 + R + 0.05) and cubby (x = CX0 − R − 0.05), bouncing back at 75 %. |
| Plant | (−3.9, 0, −2.7) | **Mango-yellow** pot #ffb21a (clearcoat), 9 rubber-plant leaves. | Hover "My desk plant 🌱", click wiggles. |
| Green bottle | (−8.5, 0, −2.9) | Ribbed translucent green (plain transparency + clearcoat; **not** `transmission`, which re-rendered the scene every frame). | — |
| Soundbar | (−0.1, 0, −3.0) | 5.2 × 0.9 × 1.0 black, grille front. | Click: music/sound on/off. |
| Pen stand | (3.6, 0, −2.6) | Glossy black cup; 3 pencils (white, silver, blue) kept inside. | — |
| Sketchbook (hobby book) | (−5.4, 0.01, 1.2) | Graphite book + "Weekend — sketches · hobbies · notes" sketchbook (original illustrated cover), elastic band, yellow pencil. Placeholder hobby. | Hover "My weekend sketchbook"; click → About. |
| Project folders | Spots (−2.4, 4.8), (0.9, 5.5), (5.4, 5.7), (−7.9, 1.5), (8.1, 5.3); projects 6+ stack on top of earlier folders | One per project in `content.js`; **black** (#1c1c1e family) with white paper label (title, tag, number). | Click → Work. |
| Phone | (3.4, 0, 4.4), rotated 0.5 | Generic silver phone, lock screen (date, time, "New message — Let's work together →"). No logos. | Click → Contact. |
| "Let's connect." label + 3 tiles | Label (−6.9, 0.03, −2.0) on a dark pill; tiles @ / in / Bē at x −8.0, −6.85, −5.7, z −1.0 | Glossy white tiles. | Open email / LinkedIn / Behance. |
| Desk labels | "Work ›, Skills ›, Resume ›, Contact ›" on the mat at x −7.2…−6.45, z 3.4…5.8 | White Inter 600. | Open that section. |

**No built-in fallbacks.** The procedural cartoon cat and flat headphones were removed in v1.1 — when the cat model failed on a visitor's laptop, the cartoon cat appeared in the wrong place, clipping the headset stand.

---

## 9. Camera and controls

| Setting | Value |
|---|---|
| Camera (v1.7) | Two solved views (`solveDesk`, `solveRoom`): **HOME** (v2.0) = a desk-setup-photo angle: from the front-left (`HOME_AZ` −0.45 rad ≈ 26°), low (`HOME_EL` 0.22 rad ≈ 13° above the desk), aimed a little left of the laptop (`HOME_AIM_X` −2) so the laptop sits right of centre; closest distance at which `HOME_SEE` (bottle, plant, laptop, cat, headset, mat front edge, lamp bulb) fits — desk ends and the poster top may crop. **ROOM** (zoom button "step back") = centred on the desk (`VIEW_X` 0.2), seated eye level of a 6 ft person (`EYE_Y` = 10 units ≈ 124 cm above the floor) fitting poster, name, desk and the football (`ROOM_SEE`). Vertical FOV 56° (62° portrait). Scroll/pinch zooms toward the cursor. Re-solved on resize; orbit limits cover both views. |
| Camera (before v1.5) | `PerspectiveCamera`, FOV 30°, high and looking down ~20° — felt "odd" / top-down |
| Home target | `(−0.6, 8.6, 0.0)` |
| Home direction | `normalize(0, 0.34, 0.94)` — ~20° above the desk, straight on |
| Home distance | `max( 31 / tan(vFOV/2) × 0.62 , 12.5 / tan(hFOV/2) )` — first term fits the wall + desk vertically; second fits ~25 units of width on tall/phone screens. Recomputed on resize. |
| Zoom limits | min = home × 0.4, max = home × **1.2** (re-applied after boot/resize). Lifted to 0 during the boot fly-in. |
| Orbit limits | Azimuth ±0.6 rad around home; polar 0.55–1.2 rad; **pan disabled**; damping 0.08. |
| Zoom button (HUD) | Toggles `camera.zoom` 1 ↔ 1.7 over 600 ms. |
| Easing | Fly-in `cubic-bezier(0.42,0,0.2,1)` 1250 ms; fly-out `cubic-bezier(0.32,0.72,0,1)` 1150 ms. |

---

## 10. Lighting, materials and rendering

| Item | Value |
|---|---|
| Renderer | antialias on, pixel ratio ≤ 2, `ACESFilmicToneMapping`, exposure **1.05**, `PCFSoftShadowMap` |
| Environment | `RoomEnvironment` via PMREM (soft reflections on metal/glass) |
| Hemisphere | sky #ffffff, ground #2a2a2e, intensity 0.45 (dark mode values applied at start) |
| Sun (directional) | #9fb4ff, intensity 1.1, position (−7, 16, 9), shadow map 2048², bounds ±20, bias −0.0004, normalBias 0.02 |
| Rim (directional) | #c8d4ff, intensity 0.5, position (10, 6, −8) |
| Lamp (point) | #ffb468, intensity 55, distance 34, decay 2 (see §8.3) |
| Laptop screen glow | Point light #dcd6ff, intensity 1.2, distance 6 |
| Look | Fixed **dark room with the lamp always on**. The old light/dark `MODES`/`applyMode` code was removed in v1.1; the values are set directly. |

---

## 11. The Mac desktop (OS overlay)

Markup in `index.html` (`#os`), logic in `os.js`, styles in `styles.css` ("Desktop — macOS 27-style").

### 11.1 Layout
- **Screen** (`.os-screen`): max 1180 × 760, radius 20, laptop bezel shadow, original multi-blob gradient wallpaper (#7d6cff, #ff8fb1, #ffb36b, #3fc6ff over #4b3fd1 → #e46aa0).
- **Menu bar** (transparent, macOS 27 style): `SJ` (logo) · **Portfolio** (bold) · File · Edit · View · Go · Window · Help — right side: Wi-Fi, battery, **Spotlight icon**, Control Center glyph, clock ("Sat 3 Oct  3:02 AM", updates every 15 s).
- **Widget** (top right, glass): "Designer / Sijo Joseph / roles / ● Available for new work".
- **Window**: top 46 px, bottom 100 px (**always ends above the dock**), width min(880, 100% − 48), max-height 600, radius 26, Liquid Glass (blur 40, specular top edge, dark outer edge, deep shadow).
  - **Sidebar** runs the full height (212 px), traffic lights sit on top of it, sections with line icons, profile card at the bottom.
  - **Unified toolbar**: section title + glass capsule with **Search** and **Share**.
  - **Body** scrolls (`min-height: 0` on the flex chain is what makes it scroll — don't remove it).
- **Dock** (glass, radius 26): About, Work, Skills, Resume, Contact | LinkedIn, Behance, Back to desk. Magnification on hover (desktop only), bounce on click, running dot.

### 11.2 Sections (`apps` in os.js)
| Key | Title | Content |
|---|---|---|
| about | About | Name, title · location, role chips (all neutral), about paragraphs, "See my work" / "Get in touch" |
| work | Work | Project cards. If `url` is `"#"` the card is **not a link** and says "Case study coming soon". |
| skills | Skills | Groups → chips (all neutral) |
| resume | Resume | Experience list; "Download résumé" if `resumeUrl` is real, otherwise "Ask for my résumé" → Contact |
| contact | Contact | Big email link + Email / LinkedIn / Behance / GitHub buttons |

### 11.3 Menus (click to open, hover to slide between open menus, click outside to close)
| Menu | Items |
|---|---|
| SJ / Portfolio | About This Portfolio · — · Back to Desk (Esc) |
| File | New Window (disabled) · Open Work… ⌘O · — · Close Window ⌘W |
| Edit | Undo / Redo (disabled) · — · Copy Link to Portfolio · Find… ⌘K |
| View | Enter Full Screen (zoom) · — · Show Sidebar (disabled) |
| Go | About ⌘1 · Work ⌘2 · Skills ⌘3 · Resume ⌘4 · Contact ⌘5 |
| Window | Minimize ⌘M · Zoom · — · Bring All to Front |
| Help | Search the Portfolio ⌘K · — · Contact Sijo… |

Shortcut labels show "⌘" on Apple devices and "Ctrl+" elsewhere.

### 11.4 Keyboard shortcuts (active only while the desktop is open)
⌘/Ctrl + **1–5** sections · **K** Spotlight · **W** close window · **M** minimise · **Esc** closes Spotlight → menu → desktop (in that order).
On the 3D page: **Enter / Space** boots the laptop (when nothing is focused).

### 11.5 Spotlight
Opens from the menu-bar icon, toolbar search or ⌘K. Indexes sections, project titles, every skill, "Email Sijo", "Back to desk". Live filter, ↑/↓ to move, Enter to open, click outside to close. Results show app-style icons.

### 11.6 Other behaviour
- **Share** copies `origin + pathname` to the clipboard and shows a "Link copied" toast (falls back to showing the URL).
- **Traffic lights**: red = close window (desktop stays), yellow = minimise animation, green / double-click toolbar = zoom (fills above the dock).
- **Drag** the window by its toolbar (desktop widths only); size is locked while dragging; position resets each time a section opens.
- **Icons**: original macOS-style squircle app icons (CSS mask), layered gradients + sheen + inner highlights, solid white glyphs. LinkedIn/Behance use simple "in" / "Bē" letterforms as links to Sijo's profiles.
- `OS.setDark(true)` switches the desktop to dark glass tokens (`.os.dark`) — currently always light.

---

## 12. Overlay UI on the 3D page (HUD, nav, hint, loader)

| Element | Detail |
|---|---|
| Loader | Black; SJ ring (84 px), 180 px white progress bar, **"Good things take time"** (15 px, #a1a1a6, fades in). Fades out when ready. |
| Zoom button (top-left) / Sound button (top-right) | 44 px dark frosted glass circles. Sound state persists (`localStorage.muted`). |
| **Top nav** (top centre) | Glass pill (same as hint) with **Work · Resume · Contact** in `--blue` #0a84ff, system font 13 px / 500. Hover = soft highlight, **no underline**. Click boots the laptop into that section. |
| Hint (bottom centre) | "drag to look around · click the laptop to boot" glass pill; fades during boot. |
| Skip link (bottom right) | "open portfolio without 3D →" — opens the desktop without the 3D fly-in. |
| Tooltip | Dark pill following the cursor over interactive objects. |
| Short screens (`max-height: 620px`) | Nav/HUD/hint/skip shrink and hug the edges so the poster stays visible. |

---

## 13. Content — how to edit, and what is still placeholder

**v2.5 status:** About text, location (Bangalore), email, cat name (Shea), weekend hobbies (sketchbook) are **real**, from Sijo's interview. Projects are **Tidewell, Ledgerly and Backwater Line** (concept case studies, labelled as such). Still to add: LinkedIn, Behance, résumé PDF, work history (`experience: []` hides the list until filled), and Ekmaati (Sijo's real Semester 2 project). Interview answers not yet used: what he made as a teen, and the meaning of "the process for the outcome" (About assumes "never skip the process").

### 13.1 Case studies (Work window)
- Source (v68): Tidewell `s6WXmDrd36Frlkg1kVsvUg` page **"Tidewell v3"** (frame `30:3`, 39 sections) · Backwater Line `6iuhjuMILOUIsgbqNKq8OG` page **"Backwater Line v3"** (frame `36:3`, 38 sections) · Ekmaati `tkze0DYw6HIb4LdZGvdsht` "ekmaati final", frame **"Desktop - 1"** `1:694` (27 sections, absolutely positioned and slightly overlapping, so slices are cut at each next section's y). Ledgerly removed from the site in v68.
- **Export at 2× (Figma quality — never ship 1× only):** on a temporary page, clone the frame into a clipping frame, `rescale(2)` the clone (2880 px wide), and move the clone up so each window < 32,768 px tall shows one chunk (cut at section boundaries); `get_screenshot` the clip with `maxDimension: 32768` (it never upscales, so the 2× rescale is required); delete the temp page afterwards. Slice per section in headless Chrome into `work/<slug>/NN@2x.webp` (2880 w) and `NN.webp` (1440 w), WebP q90. `content.js → projects[].case.sections` = `[file, height, description]`; the description is the image's alt text.
- Sections are fixed 1440-px compositions (no auto layout inside), so they cannot reflow for phones; phones get the full-width image + pinch-zoom. A true phone layout would need mobile frames designed in Figma.
- Screen sizes: `.case` stops at 1920 px (1512 px on Retina laptops, the width the 2880-px files fill sharply), centred; the Mac display scales up on big monitors with stepped CSS `zoom` (1.15 / 1.55 / 2 / 2.3), reset to 1 in full-screen case view. `sweep.mjs` now covers 18 devices (phones → 4K/ultrawide) and opens every case study on each.
- Viewer: `openCase(slug)` in os.js (Work card, desk folder, Spotlight, deep link `?open=case:tidewell`); images lazy-load; pinch-zoom on phones.
- **Full screen (v2.6):** a case study opens like a full-screen Mac app (`.os-screen.case-fs`): the window fills the Mac screen; menu bar, widget, sidebar and dock are hidden; a sticky `.fs-bar` has window buttons (red/green = back to Work), "‹ All work", title + discipline + status, ‹ n / N › project switching and share. Esc, the back gesture (history entry `{sjCase}`) and ⌘1–5 leave full screen; prev/next replace the history entry.
- To update a case study: edit the Web page in Figma → run the copy-check skill on its text → re-export and re-slice → bump `?v=`.

**Edit only `content.js`.** Everything (wall lettering, folders, desktop, Spotlight) reads from `window.SITE`. Then bump `?v=` and push.

| Field | Current value | Status |
|---|---|---|
| `name`, `first`, `title`, `roles`, `location` | Sijo Joseph · SIJO · Multidisciplinary Designer · [Product Designer, Brand Strategist, Experience Designer, 3D Designer] · India | ✅ real |
| `email` | `your@email.com` | ✏️ **placeholder** |
| `resumeUrl` | `#` | ✏️ **placeholder** (Resume shows "Ask for my résumé" until set) |
| `links.mail` | `mailto:your@email.com` | ✏️ placeholder |
| `links.linkedin` | `https://www.linkedin.com/` | ✏️ placeholder (needs profile URL) |
| `links.behance` | `https://www.behance.net/` | ✏️ placeholder |
| `links.github` | `https://github.com/sijojoseph7509-a11y` | ✅ real |
| `about` (3 paragraphs) | Drafted copy | ⚠️ review |
| `projects` (4) | Product redesign / Brand from scratch / Immersive exhibit / 3D product visuals, all `url: "#"` | ✏️ **placeholder** — cards show "Case study coming soon" |
| `skills` (5 groups) | Product, Brand, Experience, 3D & Motion, Tools | ⚠️ review |
| `experience` (3) | Company Name / Studio Name / First Job | ✏️ **placeholder** |

Project fields: `{ title, tag, color (hex), summary, url }`. Up to 6 projects get desk folder spots; more will overlap (add spots in `main.js` → `spots`).

Hard-coded copy outside `content.js` (edit in `main.js` if needed): sticky note text, phone lock-screen message, sketchbook cover ("Weekend — sketches · hobbies · notes"), poster text, terminal message, cat bubble text ("pet me? 🥺").

---

## 14. 3D models and assets — sources, processing, licences

All downloaded by Sijo into `~/Downloads`. **Licences have not been verified** — check each source page before relying on the public site (see §25).

| Model | Source file | Processing done | In repo |
|---|---|---|---|
| Cat | `Cat_v1_L3.123cb1b1943a-2f48-4e44-8f71-6bbe19a3ab64.zip` (OBJ, 3ds Max export, Z-up, cm) | v1.2: `gltfpack -i cat.obj -o cat.glb -cc -kv -vtf`, then image references stripped from the GLB (textures are loaded separately). Positions are quantised; `loadCat` unpacks them to float cm through the node matrix so the tail-rig thresholds still work. **`-vtf` (float UVs) is required**: quantised UVs rely on a texture transform in the glTF material, which is lost because we replace the material. Rotated to Y-up, scaled to 5.0 units tall at runtime; diffuse **recoloured to ginger at runtime**; bump kept. Textures use `flipY = false` (glTF UVs). | yes (0.66 MB incl. textures) |
| Headset | `headphone.rar` → "Razer kraken.obj" (97 MB, ~896k triangles, C4D) | Simplified with `gltfpack -si 0.03` → 29.5k triangles; v1.1 re-packed with `-cc` → 166 KB; untextured materials restyled; green brand accents greyed. Model of a branded product — see §25. | yes |
| Football | `73-soccer_ball.zip` → `football.fbx` + PBR PNGs | v1.1: FBX → OBJ with three.js `FBXLoader` + `OBJExporter` in Node, then `gltfpack -si 0.4 -sv -kv -vtf -cc` → 89 KB GLB (float UVs, see cat note); textures 512/256 px JPEG. | yes (0.4 MB) |
| Table (retired) | `15-table_dae.rar` | Used for a while, then replaced by the procedural desk from Sijo's photo; files removed from repo. | no |
| Ball (retired) | `xh0avas9ej9c-Ball.zip` | Replaced by the matte football. | no |
| Not used | `34-cat3d.rar` (SketchUp only), `9182knlssry8-Mac201512.rar` (Blender only; contains Apple wallpaper), `plant 1.zip`, `plants 2.rar`, `sshpy95hl0qo-table.wood.rar` (3ds Max only) | — | no |

Everything else (desk, throw, mat, walls, floor, poster, lamp, laptop, phone, plant, bottle, soundbar, pen stand, sketchbook, folders, labels, wallpapers, icons) is **procedural** — drawn in code or on canvases at load time.

Reference photos provided by Sijo (not in repo): IMG_5837 (desk), IMG_5838 (wall/camera hook), IMG_5839 (poster), IMG_5840 (pendant lamp), IMG_5843 (wall paint colour), plus cat photo.

---

## 15. Audio

**Phones (v1.4):** the audio context is created only inside a gesture; *every* tap/click/key retries until `ctx.state === "running"` (iOS refuses the first touch-down and suspends audio on app switches); `navigator.audioSession.type = "playback"` (or a silent looping `<audio>` on older iOS) so the iPhone **silent switch doesn't mute the music**. Hover/click blips are skipped until audio is running.

- **Music (`music.js`)** — original lo-fi loop synthesised live: **76 BPM**, eighth-note grid with 0.12 swing; 4-bar progression Fmaj7 · Em7 · Dm9 · Cmaj7(add9); triangle/sine pads (lowpass 900 Hz), sine bass, soft keys melody chosen per bar from 5 motifs, kick / noise snare / hats, vinyl-crackle bed; master → lowpass 5.2 kHz → compressor; 2.5 s fade-in, 0.8 s fade-out. **No samples or recordings → no copyright issues.**
- Starts on the first pointer/keyboard gesture (browser autoplay rules) unless muted.
- **UI sounds (`Sound` in main.js)**: hover blip (880 Hz sine), click (520 Hz square), boot arpeggio (C-E-G-C), purr (55 Hz saw + 24 Hz tremolo, 1.8 s).
- Mute/unmute: HUD sound button, headset, or soundbar. State saved in `localStorage.muted`.

---

## 16. Design tokens

| Token | Value |
|---|---|
| Page background | `#1d1d1f` |
| Ink / muted | `#f5f5f7` / `#a1a1a6` |
| Accent blue | `#0a84ff` (pressed `#0071e3`) |
| Labels | `#1d1d1f`, `#6e6e73`, `#86868b` |
| Glass (dark pills) | `rgba(40,40,44,.55)` + blur 20 + saturate 180 % + 0.5 px inner white edge |
| Desktop glass (light) | window `rgba(250,250,252,.86)`, sidebar `rgba(236,236,242,.62)`, highlight `rgba(255,255,255,.9)`, edge `rgba(0,0,0,.14)` |
| Fonts | `--font` system → SF Pro Text → Inter; `--display` system → SF Pro Display → Inter; Caveat (sticky note) |
| Radii | window 26, sidebar 18, cards 22, dock 26, pills 999 |
| Easing | `--ease cubic-bezier(.25,.8,.25,1)`, `--spring cubic-bezier(.34,1.4,.5,1)`, Apple out `cubic-bezier(.32,.72,0,1)` |
| 3D colours | Laminate #221e1c · Midnight #2a303c · Mango #ffb21a · Poster red #c7262e · Wall #2c2b2a · Lamp #ffb468 |

---

## 17. Responsive, mobile and accessibility

- **Breakpoints**: `max-width: 760px` (phone desktop layout: sidebar becomes a pill tab bar, window fills between menu bar and dock, widget hidden, smaller dock); `max-height: 620px` (compact HUD/nav/hint).
- **3D framing** adapts to aspect ratio (§9); phones get a wider camera distance; lamp shadows disabled on narrow screens.
- **Touch**: drag to orbit, pinch to zoom, tap to click; window body has `touch-action: pan-y` and momentum scrolling.
- **Mobile preview page**: phone frame at 390×844 / 430×932 / 360×780.
- **Accessibility**: buttons/links are real elements with labels; menus use `role=menu/menuitem`; Spotlight is `role=dialog` with a labelled input; focus-visible outlines; `prefers-reduced-motion` disables CSS animations, the camera tween and the desktop zoom. The 3D scene itself is not screen-reader navigable — "open portfolio without 3D" is the accessible path.

---

## 18. Performance

- v1.2: models + textures ≈ **1.06 MB**, whole first visit ≈ 1.5 MB (was ≈ 9.6 MB of models; the 5.4 MB cat OBJ was served uncompressed as `application/x-tgif`). Everything downloads in parallel from the first moment, and the loader never waits more than 5 s (from script start) + 4 s shader warm-up; models arriving later fade in (`reveal()`).
- **Adaptive quality** (`adaptQuality` in main.js): if the median frame time over 90 frames is > 28 ms, pixel ratio drops to 1; if still slow, lamp shadows go off and the sun shadow map drops to 1024².
- The desk is rendered only while visible — not while the Mac desktop covers it.
- Shadow maps: sun 2048², lamp 512² ×6 (desktop only).
- Laptop screen canvas redraws at ~30 fps; cat tail updates ~6,200 vertices per frame.
- Pixel ratio capped at 2.
- Further ideas: KTX2 textures; simplify the cat (`-si 0.5`) if needed.

---

## 19. Deployment and cache-busting

1. Edit files.
2. **Bump the version — in two places, the same number:** every `?v=N` in `index.html` (update.js, styles, content/os/music/main.js + the main.js modulepreload) and `version.json`. (v2.4: the self-update script moved to `update.js` and reads its version from its own `?v=`; main.js and os.js append the same number to every image/model URL, so replaced assets are never stale.)
   - *Why:* phones often reopen a saved copy of the page. The inline script fetches `version.json` (never cached) on load, on back/forward restore, and when the tab returns after > 60 s away; if it's newer than `BUILD`, the page reloads itself at `?v=N` (a fresh URL, so it can't come from cache). It never loops (URL + sessionStorage guards) and never reloads while the Mac desktop is open.
   - **Never delete a model file an older version used** without leaving it in place for a few weeks: a phone showing an old cached page will request it, and old code falls back to broken stand-ins (this is what produced the cartoon cat on Sijo's phone on 3 Oct 2026). The pre-v39 cat OBJ and football FBX are kept at their old paths for this reason — see the README in that folder.
3. **Run the QA skill, the bug sweep and the security audit** (`.claude/skills/site-security/`) (`.claude/skills/site-qa/SKILL.md`) against the local server; fix every ❌. in `index.html` (`styles.css?v=N`, `content.js?v=N`, `os.js?v=N`, `music.js?v=N`, `main.js?v=N`). Browsers cache these aggressively; without a bump, visitors can see a mix of old and new files.
4. `git add -A && git commit -m "…" && git push origin main`
5. Wait ~1 minute; confirm with `curl -s https://sijojoseph7509-a11y.github.io/version.json`, then run the QA skill against the live URL.

Commit messages in this repo end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` for commits made with the assistant.

---

## 20. QA checklist

**Automated:** `.claude/skills/site-qa/qa.mjs` — 15 headless-Chrome checks (loads, models, deep links, boot/Esc, menus, Spotlight, scrolling, resize, model-failure path, stale-cache path, self-update, legacy paths). See its SKILL.md. `window.Desk.state()` in the browser console shows what's loaded. The manual list below covers what the script can't see (looks, feel, real devices).

**3D page**
- [ ] Loader shows SJ + progress + "Good things take time", then fades.
- [ ] Whole A1 poster visible above the MacBook; name + roles readable; nav pill doesn't cover the poster.
- [ ] Drag left/right: side walls visible, no black void. Pinch/scroll out to the limit on a phone: still inside the room.
- [ ] Hover tooltips on cat, laptop, plant, folders, phone, tiles, headset, soundbar, ball, labels.
- [ ] Cat: tail sways; hover → faster; click → purr, hearts, big swish.
- [ ] Ball: click rolls; never enters the left panel or cubby.
- [ ] Sound button / headset / soundbar toggle music; state survives reload.
- [ ] Top nav Work / Resume / Contact → boots into the right window. No underline on hover.

**Boot / desktop**
- [ ] Camera glides right up to the screen; desktop grows out of the laptop screen; window pops in after.
- [ ] Every menu opens; hover-slides between menus; disabled items grey.
- [ ] ⌘1–5, ⌘K, ⌘W, ⌘M, Esc work.
- [ ] Spotlight: type "blend" → Blender → Enter opens Skills.
- [ ] Share → "Link copied".
- [ ] All windows scroll (mouse, trackpad, touch); window never hidden behind the dock.
- [ ] Placeholder project cards do **not** open new tabs.
- [ ] Back to desk → desktop shrinks into the laptop → camera returns.

**Devices**: iPhone Safari (portrait + landscape), Android Chrome, Mac Safari/Chrome, Windows Chrome/Edge.

---

## 21. Known issues, limitations and tech debt

1. **Content is placeholder** (§13) — the biggest blocker for real use.
2. **Model licences unverified** (§14, §25).
3. **Phone pinch zoom-out** fix (bigger room + 1.2× cap) was verified by reasoning and desktop testing; the preview tool could not simulate a pinch. Confirm on a real phone.
4. ~~Stale code comments / leftovers~~ — cleaned up in v1.1 (unused loaders, light/dark mode code, fallback cat/headphones, stale comments).
5. **Single large `main.js`** (~1,460 lines). Candidates to split: `scene/room.js`, `scene/desk.js`, `scene/objects.js`, `screen.js`, `camera.js`.
6. Automated QA exists (§20) but isn't wired to CI — run it before each push.
7. **SEO/social**: no Open Graph image or description tags beyond `<meta name="description">`; no favicon; no `404.html`.
8. **Accessibility**: 3D objects aren't keyboard-focusable; rely on the skip link / nav.
9. **Browser cache**: forgetting to bump `?v=` causes stale mixes.
10. The "Show Sidebar", "New Window", "Undo/Redo" menu items are intentionally disabled placeholders.

---

## 22. Decision log (what was tried, kept or reverted)

| Topic | History → final |
|---|---|
| Overall concept | Started from a reference portfolio (ishantp.com, desk-diorama idea). Built **original** designs only — no copying of his assets, text or stickers (Pokéball, Dragon Ball, Capsule Corp, anime car were deliberately excluded). |
| Background/floor | Dark dots → light Apple studio → dark dots → **cream marble tiles**. |
| Computer | Retro CRT → silver 13" laptop → **Midnight** laptop. No Apple logo (SJ monogram instead). |
| Cat | Procedural ginger cat → removed → re-added modelled on Sijo's cat → **downloaded realistic cat tinted ginger** at real scale. Sitting + licking was built, then **reverted** (didn't look good). Tail swish kept. |
| Desk | Procedural wood → downloaded `table_dae` (black-stained) → **procedural recreation of Sijo's actual desk** (side panel, cubby, zebra throw). |
| Headphones | Procedural (flat) → downloaded Kraken model flat → **upright on its stand**, behind the cat. |
| Poster/art | Original "Horizon" print → **Sijo's own poster**; A2 → **A1**; click-to-open-in-Mac added then **removed**; raised above the MacBook line. |
| Lamp | Picture light → **Sijo's wire-cage pendant**. Light/dark mode toggle via the lamp built, then **removed** (fixed dark room, lamp always on). |
| Wall colour | Charcoal; a cream/yellow "light mode" wall was built to match Sijo's paint, then dropped with the toggle. |
| Camera | Orthographic iso → perspective straight-on; distance retuned several times for A1 poster vs. "too zoomed out" feedback. |
| Desktop UI | Retro OS → Apple-style → **macOS 27 Liquid Glass** (verified macOS 27 "Golden Gate", released 14 Sep 2026) with real menus, Spotlight, shortcuts, squircle icons, Apple-style zoom transition. |
| Butterfly / paper plane | Both added at some point, **both removed**. |
| Plugins | Liquid Glass plugins in the Claude directory were evaluated and **not installed** (SwiftUI/AppKit only, not web). |

---

## 23. Change history

| Commit | Summary |
|---|---|
| `8d20a1e` | Initial interactive 3D desk portfolio |
| `288822c` | Headphones behind the cat, bigger wall name, zoom-out fix |
| `d5ac89b` | Upright headphones, pen stand restored, tall-screen framing |
| `4e8fcb9` | Original background music, moving cat tail |
| `91c22eb` | Sijo's real desk, poster, pendant lamp; cat sit/lick (later reverted) |
| `9deba5b` | Lamp light/dark toggle; macOS 27 desktop; cat restored |
| `a389dcf` | Room paint colour; poster opens on the Mac (later reverted) |
| `fc16275` | Yellow wall, scrollable windows, poster decoration-only |
| `9964d6e` | Toggle removed; Midnight MacBook; mango pot; side walls |
| `60bde33` | Glass top nav, A1 poster, wider room |
| `383baf0` | Nav: no hover underline |
| `e32d7f1` | Mac experience overhaul, closer camera, loading quote |
| `4787a8c` | Apple-style boot zoom, poster above the Mac, phone zoom-out fix |
| (v3.1) | Floor = flake epoxy from Sijo's photo (`assets/floor.jpg`, 9-unit tiles, mirrored repeat, clearcoat). Clothes rail and shirts removed; the rod spans only the curtain. |
| (v3.2) | Walls = tone-on-tone chocolate-brown panelling from Sijo's reference (`panelTex`, mouldings same colour as the wall). Curtains half open; clicking the window toggles day ↔ night (`setNight`, `LOOK.day/night`: sun, sky, light shaft + floor patch, lamp). Start state follows the visitor's local hour. Keyboard moved to the left wall; plants grouped in the back-right corner. QA check "Window: day ↔ night". |
| (v3.3) | Room 40% narrower (`ROOM_HALF` 44 → 26.4). `keepInsideRoom()` slides the camera in rather than through a side wall when you look around. Sun steeper (`SUN_DIR`) so the beam lands beside the desk. |
| (v3.4) | Walls = textured plaster from Sijo's photo (`assets/wall.jpg`), flattened + made seamless on load (`flatten`, `seamless`), used as map + bump; panel mouldings and dado rail removed, trim/ceiling retoned taupe. Wall lettering now dark. Sunlight subtler (`LOOK.day` shaft/patch). Day sky = deep blue with cumulus clouds (1024 px). Soundbar removed; headphones moved to its spot behind the laptop. |
| (v4.4) | v74: **every visit starts at night** (`setNight(true, true)`); clicking the curtains switches to morning and back. Cap + camera hook and macramé shelf removed. Switch board socket fixed (earth pin on top). Sketchbook ×1.3 at the front-left, clear of the MacBook; folders labelled **My Projects**, 20% smaller (×0.576). Desk plant stems lean into the room (no longer through the wall). Window = **NID Bengaluru gate** from Sijo's photos (granite-block gate walls, white tri-lingual sign, steel gate, tree-lined drive with potted plants, white campus building with round balcony behind; street lamp; day + night). Realism: lamp shadows 1024 px, screen glow lights the desk at night, MacBook charging cable along the skirting up to a charger in the socket. |
| (v4.3) | v73: left wall now shows **Sijo's own photo of his One Piece prints** (`assets/wall-prints.webp`, wall keyed out; third-party art shown at his request); cap rebuilt (six-panel corduroy crown, seams, eyelets, button, curved brim, strap), hung face-out; astro light: full oval visor, head tilts ≈35° up to the ceiling while projecting (`stepAstro`); folders ×0.72, sketchbook ×0.75 and renamed **Personal explorations**; speaker shortened so it clears the laptop; football 17 cm; 1 L bottle (10 cm); rubber plant with real pointed leaves; bottle/astro/plant re-spaced; switch board moved to the right; `Desk.debugView` now a true fixed camera for screenshots. |
| (v4.2) | v72: **real-world scale pass** with the MacBook Pro 14" M5 as ruler (laptop scaled ×1.042, Space Black; cat 29 cm; pencils 17 cm in an 8×10 cm cup; 25 cm bottle; A5 sketchbook; size-5 football; 76 mm sticky note); desk recomposed (A4 project folders with index tabs front-right, Shea side-on in front of the new **soundbar** (click = music), **astronaut galaxy light** by the bottle (night nebula projection, click to toggle)); left wall: **original 5×2 pop-art prints** (not One Piece — copyright) + **camera and red cap on a hook**; right wall far right: **macramé shelf** with succulents and a toy bus; modular switch board; keyboard rebuilt with real keys and a 9° lean; curtains with irregular pleats + daylight glow; stronger wall shading + faint marks; **contact shadows** everywhere; window = **NID Bengaluru** across the road (day/night, auto-rickshaw); night now really dim (`scene.environmentIntensity` 0.32). New skill: `.claude/skills/room-scene/`. |
| (v4.1) | v71: Oat walls given real-wall character, all procedural (`paintTextures`): roller-stipple + plaster relief bump map (80 cm repeat, bumpScale 0.7), broad ±4% tonal drift and faint roller laps in the colour map (2.4 m repeat), and soft ambient-shadow strips above the skirting, under the cornice and in every inside corner (`aoStrip`; `trimWall(..., corners)`). Rendered colour still measures ≈ #CDBEA5. |
| (v4.0) | v70: walls plain matte **Oat #CDBEA5** (plaster photo + `flatten`/`seamless` removed, `assets/wall.jpg` deleted); floor = procedural glazed **Mulberry #664139** ceramic tiles, 60 cm (12 units), 9 mm light grout, bump-mapped joints, aligned to the back wall (`tileTextures`, `assets/floor.jpg` deleted); Mulberry skirting; wall lettering in Mulberry tones. Base colours `WALL_PAINT`/`FLOOR_TINT` are pre-darkened so the *rendered* daylight colour matches the swatches (measured: wall #D2C1A3, floor #6D4C46). |
| (v3.9) | v69: walls tinted warm gingerbread (`WALL_TINT` 0xd08a52, Sijo's paint '324-3 Warm Gingerbread'; brand unknown, so matched by eye); zebra throw and its drapes removed. |
| (v3.8) | v68: Work = Tidewell v3, Backwater Line v3, Ekmaati (new; Ledgerly removed), all re-exported at 2× with new alt text. Big-monitor scaling for the Mac display and case column; sweep extended to 18 devices incl. case studies. |
| (v3.7) | v67: football → Poly Haven CC0 model (`color/normal/arm.jpg`, AO+roughness from ARM); desk mat → original lightning artwork (no Naruto). Free3D cat still pending replacement (CC-BY 'Orange Tabby Cat' by Chenchanchong on Sketchfab, needs credit line). |
| (v3.6) | Live on **https://sijo.work** (GoDaddy DNS → GitHub Pages, `CNAME` file, HTTPS enforced; github.io and www redirect). Fonts self-hosted (`fonts/`), CSP `font-src 'self'`; raw cat/football source files removed; QA legacy-cat check replaced by a self-hosted-font check. Repo must stay named `sijojoseph7509-a11y.github.io`. |
| (v3.5) | Headphones removed (model folder deleted, `loadHeadphones` gone; QA no longer waits for a headset; sound stays on the top-right button). Plaster tinted darker brown (0x9c7a60), trim/ceiling darkened; wall lettering back to light cream. |
| (v3.0) | Room restyled from Sijo's reference: oxblood red walls (#5e1510) over black panelled wainscot (`trimWall()`: panel texture, dado rail at 90 cm, skirting, crown moulding), dark ceiling at 2.75 m (`CEIL_Y`), diagonal black/cream checkerboard floor. Right wall (`rightWall` group, `onRight(z)`): window corner from Sijo's photo — window + cream curtain with maroon ogee rose medallions on a black grommet rod, shirts on the same rod, keyboard leaning under the curtain, fluted white pedestal with peace lily, terracotta spider plant and white aloe pot. Visible when looking right in the room view. |
| (v2.9) | Desk laptop = MacBook Air display (SCREEN 5.8 × 3.77, 2560×1664 aspect, thin bezels, chin); the notch is drawn on the screen canvas from the shared `NOTCH` proportions (7.4 % wide, menu-bar tall), identical to the desktop `.notch`. Motion: real spring curves via CSS `linear()` (`--spring`, `--smooth`), camera fly-ins swing on an arc with log-distance dolly, full-screen enter/exit is a FLIP zoom (`morphWindow`), macOS-style dock launch bounce and minimise-into-dock, frame-rate-independent hover. |
| (v2.8) | Case studies re-exported at 2× (Figma resolution) as WebP with 1×/2× srcset; the area around the Mac display is a clean dark surround (no 3D laptop lid showing above it). |
| (v2.7) | MacBook display look: thin black bezel + aluminium edge, 18 px corners, camera **notch** (`.notch`, desktop/tablet only; menus behind it hidden below 1100/900 px like macOS). Full screen now fills the whole browser (`.os.case-fs`), with a 30 px notch strip above the case bar; the dock slides up when the mouse reaches the bottom edge (`.dock-zone` → `.dock-peek`). "Designer" widget hidden while a window is open. "Click the laptop" pinned to the middle of the lid's top edge. |
| (v2.6) | Case studies open full screen inside the Mac with their own navigation bar; Esc/back return to Work. QA 33 checks. |
| (v2.5) | Interview answers in About/desk (Kerala → Bangalore, smart/lazy/adventurous, poster meaning, Shea the cat, games/football/bike rides, phonk/Malayalam/Hindi, email). Placeholder projects and experience removed. Three Figma case studies (cleaned "Web" copies) in a new case-study viewer. New `copy-check` skill (notes, placeholders, AI-style tells, symbols). QA 31 checks incl. case studies. |
| (v2.4) | Bug sweep tool (11 devices, layout + wallpaper + errors, screenshots) found: hint pill wider than narrow windows; Mac wallpaper cropped away from Sijo's face on portrait screens; images/models had no version so updates could show stale ones; phone tab row cut off with no scroll cue — all fixed. **Security:** three.js self-hosted under `vendor/three/` (no CDN), Content-Security-Policy + referrer policy meta tags, self-update moved to `update.js` (no inline scripts), `safeUrl()` for content links, all template content escaped; new `site-security` skill with an audit script (15 checks). |
| (v2.3) | **Desk mat = Sijo's real mat** (photo IMG_5856, cropped 3:1: `assets/deskmat.jpg` 3072×1024 desktop, `assets/deskmat-phone.jpg` 2048×683 phone; anisotropic filtering). Clarity: poster texture full 2048 px on phones too; laptop screen canvas rendered at 2× (1600×1024, layout still 800×512 via `SCREEN_PX`); phone lock screen at 2×; adaptive quality now waits 4 s after start, ignores camera moves/fade-ins, triggers only below 25 fps, and steps to 1.5× (never 1×). Note: the mat artwork is a third-party anime illustration (see §25). |
| (v2.2) | Dock shows each app's name under its icon, always (About, Work, Skills, Resume, Contact, LinkedIn, Behance, Desk); labels scale down on narrow phones so whole names fit at 320 px; windows/toast moved up to clear the taller dock. QA: dock names visible + inside the dock, window never behind the dock. |
| (v2.1) | Zooming in (scroll/pinch) from anywhere glides the orbit centre onto the laptop (`focusLaptop`); only a real zoom-out gesture switches to the room view. Removed the desk-mat text links and the "Let's connect" + @/in/Bē tiles. Phone resized to a real iPhone 15 (147.6 × 71.6 × 7.8 mm). **New wallpaper** (`assets/wallpaper.jpg`, 1232×770): Sijo's selfie cropped to exclude the two other people, a third person's hand clone-patched out, then extended to landscape with Adobe generative expand (seed 90210) and cropped above an AI-invented hand; the hillside on the right is AI-generated. QA: zoom-in-to-laptop check (30 checks). |
| (v2.0) | Opening view matches Sijo's reference desk photo: low, front-left, close, laptop right of centre. Zooming out still lands on the centred room view. |
| (v1.9) | Zooming out always ends centred: scrolling/pinching out past the start view glides into the centred room view; zoom-to-cursor applies only when zooming in (zooming out was pulling the view sideways). QA: scroll-out check (laptop within 3% of screen centre). |
| (v1.8) | Start view stepped back to poster + lamp + name + whole desk from slight right/above; room view centred on the desk; wall back to warm graphite; **Sijo's photo is the wallpaper** (`assets/wallpaper.jpg`, 768×1024) on the 3D laptop screen (cover-crop, `WALL_FOCUS`) and the Mac desktop (`.os-screen`); the laptop screen's "Hi, I'm Sijo" window moved right so the photo's subject stays visible. |
| (v1.7) | Start view = desk close-up from slight right + above; zoom button steps back to the eye-level room (football in play). "Click the laptop" pointer pinned on the laptop screen and fades out while the view moves. "Open portfolio without 3D" on a frosted pill. Sage green wall + dark name lettering. QA: pointer-fade check; aborted requests ignored. |
| (v1.6) | Room view at eye level includes the floor + football (ball moved to the desk front, rolls between the panels); zoom button = "lean in" over the desk; zoom-to-cursor; lamp raised to mid-poster; "Click the laptop" pointer shows on every visit until the laptop is opened. QA: every clickable thing on screen at home + leaning in (`Desk.offscreen()`), pointer returns after refresh, tap test finds the cat wherever it is (`Desk.screenPos()`). |
| (v1.5) | Seated eye-level camera (6 ft person) with an automatic framing solver; room widened (side walls ± 44) and wall lightened to warm graphite; softer vignette; nav/skip link contrast ≥ 4.5:1; larger name lettering. Reviewed with the design-critique skill. |
| (v1.4) | Phone/UX pass: welcome screen (fixes music not starting, accidental first-tap boot, learning curve), first-visit laptop pointer, back-swipe closes the Mac (history entry), reopening returns to the desk, hint restored after the Mac, touch tap labels no longer stuck or invisible, "tap/click" wording, no "boot" jargon, iOS audio unlock + silent switch, safe-area insets, narrow-phone nav/dock/clock fixes, half-size poster texture on phones, GPU context-loss recovery, honest no-WebGL message. QA skill extended to ~25 checks. |
| (v1.3) | Old cached copies on phones showed the cartoon cat (old code + deleted model files): legacy model paths restored, self-update via `version.json`. Code review fixes: no crash with a stale cached os.js, no reload loop, repaint on resize behind the desktop, honest progress bar, one MODEL manifest. Added `window.Desk.state()` and the site-qa skill. |
| (v1.2) | Cat mesh quantised (343 KB) + smaller textures → 1.06 MB of models; football UVs fixed (was plain white in v1.1); late models fade in; adaptive quality for slow GPUs; favicon (no more 404). |
| (v1.1) | Load time: compressed GLB models (9.6 → 2.1 MB), parallel preloading, 7 s loader cap, async shader compile, no `transmission`, 2048 shadows, render paused behind the desktop. Bugs: cartoon fallback cat removed (it clipped the headset), folder spots no longer overlap, Enter/Space boots, frame-rate-independent animation, ⌘Q label → Esc, drag `pointercancel`. |

(Earlier non-git iterations — the first flat site, the retro CRT, the paper plane, the butterfly, the procedural cats — predate the repository.)

---

## 24. Open items / recommended next steps

1. **Fill real content** in `content.js`: email, LinkedIn, Behance, résumé PDF (add to repo, e.g. `/resume.pdf`, and set `resumeUrl`), real projects with case-study links and cover colours, real experience.
2. **Verify licences** for the cat, headset and football models; add a credits line (e.g. in About or a small footer) if required — or replace with self-made/CC0 models.
3. Real hobby on the sketchbook cover.
4. Confirm the **phone pinch zoom-out** on a real device.
5. Optionally split `main.js`.
6. Add Open Graph tags + share image, favicon, `404.html`.
7. Optional: custom domain.

---

## 25. Legal, credits and IP notes

- **Desk mat artwork:** since v67 an original generated artwork (navy storm, blue lightning, red embers; no characters or symbols). The earlier photo of Sijo's real mat showed a third-party anime character and was removed for copyright reasons.
- **Football (v67):** Poly Haven "Football" by Amal Kumar, **CC0** (polyhaven.com/a/football) — inflated variant only, textures 512/256 px.

- **Original work** (by Sijo / produced for this project): all procedural geometry, textures, wallpapers, icons, desk mat design, zebra pattern, music and sounds.
- **Sijo's own artwork**: the typographic poster ("To begin an era") — reproduced with his permission as the owner.
- **Third-party models** (§14): sourced from free model sites; **licence terms not yet checked**. The headset is a model of a commercial product (Razer Kraken); brand colour removed, no logo textures used.
- **Not used on purpose**: Apple logo, Apple wallpapers, Apple app icons (all copyrighted/trademarked) — replaced with an SJ monogram, original wallpaper and original icons; the anime character from Sijo's real desk mat; the reference portfolio's assets.
- **Trademarks** (Apple, MacBook, macOS, LinkedIn, Behance, Razer) are referenced descriptively only.
- Fonts: Inter (SIL OFL), Caveat (SIL OFL), **self-hosted** in `fonts/` (latin + latin-ext) with their OFL licence files since v66 — no Google servers, works on networks that block them and avoids the EU Google-Fonts privacy issue. Three.js: MIT licence.
- Raw third-party model sources (cat OBJ folder, football.fbx) removed from the public repo in v66; only the converted GLBs + textures remain.
