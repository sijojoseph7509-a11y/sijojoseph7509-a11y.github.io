# Handover — Sijo Joseph · Interactive 3D Portfolio (sijo.work)

| | |
|---|---|
| **Document** | Complete project handover & technical reference — everything needed to run, change, test, deploy and continue this site |
| **Version** | **6.1 — 14 October 2026** (site build **v94**) |
| **Owner** | Sijo Joseph · sijojoseph7509@gmail.com · GitHub `sijojoseph7509-a11y` |
| **Prepared by** | Claude (AI assistant, Claude Code in the Claude desktop app), working with Sijo |
| **Live site** | **https://sijo.work** (also `https://www.sijo.work` and `https://sijojoseph7509-a11y.github.io` → both redirect to sijo.work) |
| **Repository** | https://github.com/sijojoseph7509-a11y/sijojoseph7509-a11y.github.io — public, branch `main` (**the repo name must never change**, see §2) |
| **Phone preview page** | https://sijo.work/mobile-preview.html |
| **Status** | Live and **public (v154: the temporary password gate and gate.js were removed after a portfolio review)**. All automated checks green (site-qa 36/36, security 15/15, copy-check clean, sweep 18/18 devices). Open items in §23. |
| **Last commit at handover** | `3be1c63` — "v76: bottle in the pen stand's place, loose floor cable, bigger card with a light studio photo" (60 commits) |
| **Cache-buster** | `?v=N` everywhere in `index.html`, in the two `import` lines at the top of `main.js` (`sound.js`, `room-utils.js`) **and** `{"build": "N"}` in `version.json` — always the same number (§19) |

---

## Contents
1. Summary — what the site is
2. Access, accounts, hosting, domain & DNS
3. Quick start
4. Tech stack, dependencies and tools
5. File structure
6. Architecture and runtime flow
7. World conventions (scale, axes, units)
8. The room — every object, where it is, how it's made
9. Camera and controls
10. Lighting, materials, shadows, day ↔ night
11. Overlay UI on the 3D page
12. The Mac desktop (OS overlay)
13. Audio
14. Content and case studies
15. Assets, models, sources and licences
16. Design tokens
17. Responsive, devices, accessibility
18. Performance
19. Deployment and cache-busting
20. Skills (project + personal) and how to run every check
21. AI tooling, plugins, connectors and machine setup
22. Memory (what the assistant remembers between sessions)
23. Known issues, open items, next steps
24. Decision log
25. Change history
26. Legal, credits and IP

---

## 1. Summary — what the site is

A single-page, **no-build** personal portfolio. Everything is static files on GitHub Pages: no package.json, no server, no
analytics, no cookies, no third-party requests (fonts and three.js are self-hosted).

1. **Welcome screen** (black, SJ ring, progress bar, "Good things take time") → **Enter** (with sound) or *Enter without sound*.
2. **The 3D room** — a recreation of Sijo's Bengaluru room, built in Three.js at real-world scale, **always at night on arrival**:
   - Oat-painted plaster walls with real texture and corner shading, glazed Mulberry floor tiles with grout.
   - A black desk with the **MacBook Pro 14" (M5, Space Black)**, **Shea** the ginger cat, a soundbar, an astronaut galaxy light,
     a rubber plant in a mango-yellow pot, a 1 L green bottle, the "AI Lab" sketchbook (opens the AI Lab, v153), an iPhone, the lightning desk
     mat and the **My Projects** folders (one tab per case study).
   - Back wall: Sijo's own A1 typographic poster, the woven wire-cage pendant lamp, a **profile card** (frosted-photo UI card) and a
     modular switch board with a charger whose cable lies on the floor.
   - Left wall: Sijo's **One Piece prints** (his photo) and a 61-key keyboard leaning on the wall.
   - Right wall: a window with half-open rose-print curtains looking out on the **NID Bengaluru campus gate**; a fluted pedestal with a
     peace lily in the corner. Click the curtains → morning ↔ night.
   - A football on the floor (click to kick).
3. **Click the laptop** → the camera flies into the screen, which zooms out into a full **macOS 27-style desktop** (menu bar with real
   menus, Spotlight, dock, Liquid Glass windows): **About, Work, Skills, Resume, Contact**. Work opens three full-screen case studies
   (Syntra, Carekin, Handovo, Ekmaati); Handovo is rendered from HTML, the rest exported from Figma at 2×.
4. Original generative **lo-fi music** synthesised live (no audio files) + small UI sounds.

---

## 2. Access, accounts, hosting, domain & DNS

| Item | Detail |
|---|---|
| GitHub account | `sijojoseph7509-a11y` (git author on Sijo's Mac). GitHub CLI `gh` is logged in on the Mac (keyring; scopes `gist, read:org, repo, workflow`). |
| Repository | `sijojoseph7509-a11y.github.io` — a GitHub **user site** repo. ⚠️ **Never rename it.** On 8 Oct 2026 it was renamed by mistake (`https-sijojoseph7509-a11y.github.io-v-65`) and the site went down until it was renamed back. A custom domain never needs a rename. |
| Hosting | GitHub Pages, legacy build from `main`, folder `/`. Any push deploys in ~40–95 s. |
| Custom domain | **sijo.work**, bought at **GoDaddy** (nameservers `ns63/ns64.domaincontrol.com`). Set in repo Settings → Pages (and the `CNAME` file in the repo root contains `sijo.work`). **Enforce HTTPS: on.** Certificate issued by GitHub (Let's Encrypt), covers `sijo.work` + `www.sijo.work`, renews automatically (current one expires 6 Jan 2027). |
| GoDaddy DNS records (set 8 Oct 2026) | `A @ 185.199.108.153` · `A @ 185.199.109.153` · `A @ 185.199.110.153` · `A @ 185.199.111.153` · `CNAME www → sijojoseph7509-a11y.github.io` (TTL 1 h). Leave GoDaddy's `NS`, `SOA`, `_domainconnect` and `_dmarc` records alone. The old "Parked" A record and forwarding were removed. |
| GoDaddy IPv6 records (added 11 Oct 2026) | `AAAA @` → `2606:50c0:8000::153`, `…8001::153`, `…8002::153`, `…8003::153`. **Required:** on IPv6-only networks (Jio/Airtel mobile data, many hotspots in India) the bare domain was unreachable (`DNS_PROBE_POSSIBLE`) without them, and www.sijo.work redirected there too. Verified over IPv6: HTTPS 200, valid certificate, HTTP→HTTPS 301. |
| Moving the domain elsewhere later | Replace the A/CNAME records with the new host's, then clear the custom domain in Pages settings and delete `CNAME`. Moving back = restore the records above. |
| Third-party services at runtime | **None.** `localStorage`: `muted`, `keepy` (`gate` is no longer used, v154) (keepy-up best). `sessionStorage`: `updatedTo` (self-update guard). |
| Working copy | The project was built in a Claude session "scratch" folder (deleted with the session). **GitHub is the source of truth** — clone it to work elsewhere. |

---

## 3. Quick start

```bash
git clone https://github.com/sijojoseph7509-a11y/sijojoseph7509-a11y.github.io.git
cd sijojoseph7509-a11y.github.io
npx -y http-server@14 . -p 4321 -c-1 -s     # or: python3 -m http.server 4321
# open http://localhost:4321
```
- Must be served over http(s) (ES modules + model loading break on `file://`).
- URL parameters: `?open=about|work|skills|resume|contact` boots straight into a window; `?open=case:syntra|carekin|handovo|ekmaati`
  opens a case study full screen; `?v=N` defeats caches while testing.
- Text, links, projects, skills: edit **`content.js`** only (§14). Room objects: `main.js` (§8, room-scene skill §20).
- Publish: bump the version (§19), run the checks (§20), commit, push.
- In the browser console, `Desk.state()` shows what's loaded (`started, cat, ball, night, music, room…`) and `Desk.boxes()` the
  footprints of the desk props.

---

## 4. Tech stack, dependencies and tools

| Layer | Choice | Notes |
|---|---|---|
| 3D | **Three.js 0.165.0**, self-hosted in `vendor/three/` | Pinned. File hashes recorded in `.claude/skills/site-security/vendor-hashes.json`. Addons used: OrbitControls, RoundedBoxGeometry, RoomEnvironment, GLTFLoader + MeshoptDecoder, BufferGeometryUtils (`mergeGeometries`). |
| UI | Hand-written HTML/CSS/JS | No framework. Load order: `update.js` → `content.js` → `os.js` → `music.js` → `main.js` (module). |
| Fonts | System font (SF Pro on Apple) → **Inter**; **Caveat** (sticky note) | Self-hosted in `fonts/` (latin + latin-ext WOFF2 + OFL licences). Canvas text waits for fonts (≤ 3 s). |
| Audio | Web Audio API | No files. |
| Security | CSP meta tag (`default-src 'self'`, script hash for the import map, `font-src 'self'`, no plugins, no form posts), referrer policy, `safeUrl()` + escaping in os.js, no inline scripts | §20 site-security. |
| Hosting | GitHub Pages + GoDaddy DNS | §2. |
| Tools used to build assets (not needed at runtime) | headless **Google Chrome** via **puppeteer-core 23** (QA, screenshots, image slicing, canvas renders); **gh** CLI; **Figma MCP** (case-study exports); macOS **sips** (HEIC → JPEG, resize); **Swift** + Apple **Vision** (subject cut-outs) and **RealityKit Object Capture** (photogrammetry); **uv** (Python 3.12 venv for `gradio_client`); Hugging Face **TRELLIS** (image → 3D test); `gltfpack` (earlier model compression). | §21. |

Browser support: modern Chrome, Safari (macOS/iOS), Edge, Firefox with WebGL2. Without WebGL the page opens the desktop directly.

---

## 5. File structure

```
/
├── index.html            ≈11 KB   shell: CSP, import map, HUD, nav, loader/welcome, desktop markup
├── styles.css            ≈39 KB   3D-page overlays + the macOS-style desktop + case viewer + big-screen scaling
├── main.js              ≈147 KB   the whole 3D room (≈2,050 lines): renderer, camera, room, props, window view, card, loop
├── os.js                 ≈30 KB   Mac desktop: windows, sidebar, dock, menus, Spotlight, shortcuts, case viewer
├── music.js               ≈6 KB   generative lo-fi track
├── cat.js                ≈16 KB   Shea's animation engine (IK gait, jumps, look-at, spring tail), loaded by main.js
├── content.js            ≈21 KB   ★ all text, links, projects (+ case-study section lists), skills, experience
├── update.js            ≈1.5 KB   self-update (reads version.json, reloads to ?v=N once)
├── version.json                   { "build": "88" }
├── CNAME                          sijo.work
├── mobile-preview.html            phone-frame preview (3 sizes)
├── HANDOVER.md                    this document
├── .gitignore                     ignores .claude/* except .claude/skills/, and .DS_Store
├── assets/
│   ├── profile.jpg                Sijo on a light studio backdrop (1200 px; cut out on-device, §15) — profile card
│   ├── wall-prints.webp           Sijo's photo of his ten One Piece prints, wall keyed out (2048 px) — left wall
│   ├── wallpaper.jpg              Sijo's selfie (edited) — laptop screen + Mac desktop wallpaper
│   ├── deskmat.jpg / deskmat-phone.jpg   original lightning artwork, 3:1 (3072 / 2048 px)
├── fonts/                         Inter + Caveat WOFF2, fonts.css, OFL licences
├── models/
│   ├── cat/ shea.glb (rigged, 32 bones, v78), cat.glb (old static mesh, kept for cached pages), cat_diffuse.jpg, cat_bump.jpg — Free3D cat (licence unverified, §15), recoloured ginger at runtime
│   └── football/ football.glb, color.jpg, normal.jpg, arm.jpg   Poly Haven "Football" (CC0)
├── work/
│   ├── tidewell/ 01–39 (.webp 1440 w + @2x.webp 2880 w)
│   ├── handovo/ 01–16 (rendered from tools/handovo/case.html)
│   └── ekmaati/ 01–27
├── vendor/three/                  three.js 0.165 build + the addons above
└── .claude/skills/                project skills (§20): site-qa, site-security, copy-check, room-scene, object-capture
```

---

## 6. Architecture and runtime flow

### 6.1 Start-up sequence (`main.js`)
0. `index.html` modulepreloads three.js, its addons and `main.js` (**after** the import map, which must come first). The very first thing `main.js` does is start downloading all model files (`fetchAsset`) — deliberately *not* from `index.html`, because on slow connections they would starve the three.js download (measured: three.js arrived last, at 14.7 s on 3G).
1. Loader visible (black, SJ ring, progress bar, "Good things take time").
2. Wait for web fonts (`document.fonts.load`, capped at 3 s) so canvas textures draw with the right type.
3. Create renderer (WebGL, antialias, pixel ratio ≤ 2, ACES tone mapping, PCF soft shadows), scene, perspective camera, OrbitControls.
4. Build all procedural geometry synchronously (room, desk, props, wall pieces, window view, profile card).
5. Load the cat and football through a `LoadingManager` that drives the progress bar (50→95 %). Each model retries once; a model that still fails is simply left out (warning in console) — there are **no built-in stand-ins** any more. The loader waits **at most 5 s from script start**; anything still downloading pops in when it arrives.
6. Draw the laptop screen canvas, `renderer.compileAsync` (capped at 4 s), start the `requestAnimationFrame` loop, fade the loader.
7. **Welcome screen** (inside `#loader`, `.ready` state): three tips + **Enter** / "Enter without sound". That tap is the user gesture browsers require for audio, so music starts on it; it also stops a first "wake-up" tap from landing on the laptop. Wording switches to "Tap" on touch devices (`TOUCH` = `pointer: coarse`).
8. After Enter, a bobbing **"Click/Tap the laptop" pointer** (`#coach`, pinned to the lid's top edge every frame) shows until the laptop is opened in that visit.
9. If `?open=` is present, the welcome screen is skipped and it boots into that section after 0.9 s.


### 6.2 Render loop (`loop(now)`)
Skipped while the Mac desktop fully covers the scene (`OS.isCovering()`); steps scale with frame time. Order: laptop-focus glide →
`adaptQuality` → model fade-ins → `stepDay` (day/night cross-fade) → `stepAstro` (galaxy-light head tilt) → camera tween →
`controls.update()` + `keepInsideRoom()` (skipped while a test camera `Desk.debugView` is active) → hover lift → power-key pulse →
cat tail swish → hearts → football roll → wiggle → laptop screen redraw (~30 fps) → render.

### 6.3 Interactivity registry
`interactive(object, label, onClick)` adds an object to `hoverables`. A raycaster on `pointermove` finds the nearest registered
ancestor → tooltip + pointer cursor + hover lift. A `pointerup` within a few px of `pointerdown` counts as a click (drags never click).

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
| `window.OS` | os.js | `open(key, onClose?, fromRect?)`, `close()`, `setDark(bool)`, `isOpen()`, `isCovering()`, `toast()` |
| `window.Music` | music.js | `start(audioCtx)`, `stop()`, `playing` |
| `window.Sound` | main.js | `hover()`, `click()`, `boot()`, `purr()`, `toggle()`, `setMuted()`, `muted`, `state` |
| `window.Desk` | main.js | test hooks: `state()`, `boxes()`, `offscreen()`, `screenPos()`, `toggleDay()`, `astro()`, `catWander()` (send Shea on a wander now), `catStep(sec)` (advance her in fixed steps, for frame-exact captures), `cat` (her controller), `debugView([x,y,z],[tx,ty,tz])` (fixed camera for screenshots); `state().catBusy` = Shea is walking/jumping |

---

## 7. World conventions (scale, axes, units)

- **1 unit = 5 cm. Y is up.** Desk top surface **y = 0**; floor **y = −14.8** (74 cm desk); ceiling **y = 40.2** (2.75 m, `CEIL_Y`).
- The ruler is the **MacBook Pro 14" (M5)**: 31.26 × 22.12 cm = **6.25 × 4.43 units** (`LAP_SCALE` = 31.26 / 30).
- +Z points into the room toward the viewer. Back wall `WALL_Z = −3.75`. Side walls at `x = 0.2 ± ROOM_HALF (26.4)` (room ≈ 2.6 m wide).
- Desk `TABLE`: centre (0.2, 1.6), 19 × 10, top 0.5 thick → edges `X0 −9.3`, `X1 9.7`, `Z0 −3.4`, `Z1 6.6`; right cubby `CX0 2.9 → CX1 9.5`.
- Side-wall helpers: `leftWall`/`rightWall` groups (local +z into the room); `onLeft(z)` / `onRight(z)` convert world z → local x.

---

## 8. The room — every object

Positions are world (x, y, z) unless "local". All geometry is procedural (code + canvas textures) except the cat and football models
and the photo assets in §5.

### 8.1 Shell
| Object | Detail |
|---|---|
| Walls | Matte **Oat #CDBEA5** paint (`WALL_PAINT` 0xab9271, pre-darkened so the *rendered* colour matches the swatch). `paintTextures()`: roller-stipple + plaster relief bump (80 cm repeat, bumpScale 0.9), broad tonal drift + faint roller laps + a few lived-in marks (2.4 m repeat). `aoStrip()` soft shadows above the skirting, under the cornice and in each inside corner. `trimWall(len, x, z, rotY, corners)` builds each wall. |
| Skirting / cornice | Skirting **Mulberry #664139** (clearcoat); cornice `TRIM` 0xc2b296. Ceiling 0xe3d8c6. |
| Floor | Glazed **Mulberry** ceramic tiles, 60 cm (12 units), light grout ≈ 9 mm, bump-mapped joints, per-tile tone variation (`tileTextures`, `FLOOR_TINT` 0x8a6357); aligned to the back wall with a tile centred under the desk. |
| Background | `#1d1d1f`, fog 70–170. Environment `RoomEnvironment` (PMREM). |

### 8.2 Desk and desk props (sizes from real objects)
| Object | Real size | Where / how | Interaction |
|---|---|---|---|
| Desk | 95 × 50 × 74 cm | dark laminate #221e1c; left side panel; right cubby with shelf, keyboard and white charger cube; back rail | — |
| **MacBook Pro 14" M5**, Space Black #2e2d30 | 31.3 × 22.1 cm | (−1.0, 0, −0.25), rot −0.08, lid ≈105°. Keys (instanced), speaker grilles, trackpad, hinge, SJ monogram + stickers on the lid back, sticky note "make it simple, then make it fun ✶" (76 mm). Screen: live 1600 × 1024 canvas (wallpaper + "Hi, I'm Sijo" window + dock + notch). | Screen / power key → About; keys / trackpad → types hello |
| **Shea** (cat model) | ≈29 cm to head (`CAT_HEIGHT` 5.8) | **Kept simple (Sijo, v85):** stands still at her spot (6.4, 0, 0), facing −1.15; only her head and neck (looking around; at you while you hover, held 2.5 s), tail (gentle sway, trailing easing) and breathing move. Petting = purr + meow (chin lifts) + hearts. No walking, sitting or leg animation (cat.js still contains walk/sit/jump and shea.glb the Blender "sit" clip; unused). Reduced motion: only petting reacts. QA asserts legs and body never move and head/tail steps stay small. | Hover "pet me?", click = purr + meow + hearts |
| Soundbar | 34 × 6 × 7 cm | (6.15, 0, −2.75) behind Shea; mesh front, 4 top buttons, curved feet, no brand | Click = music on/off |
| **Astronaut galaxy light** | ≈26 cm | (−7.4, 0, −2.2), rot 0.3; moon-rock base, suit, backpack, cable, full oval visor; head (`astroHead`) **tilts ≈35° up** while projecting (`stepAstro`) | Click = projection on/off. At night projects a nebula + stars on ceiling and back wall (`projCeil`, `projWall`). |
| Rubber plant | pot ≈10 cm | (−4.95, 0, −1.95) ×0.9; mango-yellow pot #ffb21a; three stems leaning into the room, pointed glossy leaves, lighter new leaves on top | Click = wiggle |
| Water bottle (1 L) | 10.4 × 26 cm | (−8.4, 0, 5.2) front-left corner; translucent ribbed green (no `transmission`) | — |
| "AI Lab" sketchbook (v153; was "Personal explorations") | ≈12 × 8 cm | (−6.9, 0.01, 2.1) ×1.3 on a darker book; cover with the AI Lab flask badge, title and "VR worlds · AR keepsake · a game", elastic band, pencil | Click → AI Lab |
| **My Projects** folders | ≈18 × 13.5 cm | front-right stack (group ×0.576 at (2.2, 0.02, 2.0)); one folder per project, coloured index tab with the project name, cover label "My Projects" | Click a folder → that case study |
| iPhone | 147.6 × 71.6 mm | (−4.3, 0.06, 4.5) on the mat; lock screen with date/time + "Let's work together →" | Click → Contact |
| Desk mat | 57 × 19 cm (11.4 × 3.8) | (−3.1, 0.04, 4.6); original lightning artwork (`assets/deskmat*.jpg`) | — |
| Contact shadows | — | `contact(x, y, z, w, d, opacity)` soft dark ellipses under every prop, under the desk, pedestal and keyboard | — |

### 8.3 Walls
| Object | Detail | Interaction |
|---|---|---|
| **Poster** (Sijo's own) | A1 (11.88 × 16.82) at (−7.8, 13.1, WALL_Z + 0.03); red scattered "SOMETHING" letters + black lines "TO CREATE A SOLUTION… TO BEGIN AN ERA"; tape corners, paper curl | none (decoration) |
| **Pendant lamp** | woven wire cage (38 strands) at (0.4, 15.4, −0.8), warm bulb + glow sprite; `lampLight` #ffb468 (distance 34, decay 2), shadows 1024² on screens > 760 px | — |
| **Profile card** | A **floating UI card** (v77): `drawCard()` on a 1400 × 2309 canvas, rounded corners (radius ≈10 %), no rim or mount; full-bleed `assets/profile.jpg` (unsharp-masked at load, `sharpen`), progressive blur + dark glass at the bottom, white "Sijo Joseph" + verified seal, two-line about, stats (roles 4, projects 3), white pill "Say hi +", glass hairline rim. Lit from within (emissive 0.42) so it reads like a screen at night; floats `CARD.lift` 1.2 (≈6 cm) off the wall with a soft offset drop shadow, and drifts slowly (`stepCard`, off with reduced motion). 6.27 × 10.34 (≈31 × 52 cm) at (7.4, 11.05). | Click → About |
| Switch board + charger | 4.2 × 2.1 at (19.2, 10.2, WALL_Z + 0.12): four switches + a 3-pin socket (earth pin on top); upright white USB-C charger in the socket; cable straight down the wall, then lying in loose coils on the floor with the plug end free | — |
| **One Piece prints** (left wall) | `assets/wall-prints.webp` on a 16 × 9.06 plane (≈80 × 45 cm) at local x `onLeft(13)`, y −14.8 + 34; each print's edges lift slightly | Click = wiggle |
| Keyboard (left wall) | 61-key, ≈94 × 32 × 9 cm, real white/black keys (instanced), leaning ≈9° at `onLeft(9)` | — |
| Window (right wall) | world z 9 → 31, frame + mullions; glass shows `skyTex(night)` cross-faded; half-open rose-print curtains (irregular pleats, sheen, daylight glow) on a black grommet rod | Click curtains/window = morning ↔ night |
| Window view | **v152: a real photo**, Poly Haven "Courtyard" (day) and "Courtyard Night" by Greg Zaal (CC0): a home courtyard with painted walls, palms and garage doors. 150° × 90° slices in `assets/window/`, looked up per pixel by view direction in a shader on the glass (`winViewMat` in main.js), so the view has true parallax; the curtain click cross-fades day ↔ night (`uMix`). Replaced the painted NID-gate drawing. | click curtains = day/night |
| Corner plant | fluted white pedestal with a peace lily, back-right corner | — |
| Football | size ≈17 cm (`BALL_R` 1.7) on the floor at the desk front; rolls between the desk panels | Click = kick |

---

## 9. Camera and controls

| Setting | Value |
|---|---|
| Views | Solved by `solveDesk` / `solveRoom`. **HOME** (start): desk-photo angle from the front-left (`HOME_AZ` −0.45 ≈ 26°), low (`HOME_EL` 0.22 ≈ 13°), aimed left of the laptop (`HOME_AIM_X` −2); closest distance fitting `HOME_SEE`. **ROOM** (zoom button / zoom out): centred on the desk at seated eye level (`EYE_Y` 10 ≈ 124 cm above the floor) fitting poster, card, desk, football (`ROOM_SEE`). |
| Lens | Vertical FOV 56° (62° portrait). Re-solved on resize. |
| Controls | OrbitControls, damping 0.08, pan off; polar/azimuth limits cover both views (±0.5 rad around them); `keepInsideRoom()` slides the camera inward instead of through a wall. Zoom-in from anywhere glides onto the laptop (`focusLaptop`); zoom-out past HOME glides into ROOM. |
| Boot fly-in / fly-out | arc with log-distance dolly; `EASE_IN_OUT` in, `EASE_APPLE` out (§6.4). |

---

## 10. Lighting, materials, shadows, day ↔ night

| Item | Value |
|---|---|
| Renderer | antialias, pixel ratio ≤ 2, ACES filmic, `PCFSoftShadowMap` |
| Start state | **Night on every visit** (`setNight(true, true)`), whatever the visitor's clock. Clicking the curtains cross-fades to morning (1.8 s) and back. |
| `LOOK.day` | sun 1.5 #fff0d6, hemi 0.62, rim 0.3, lamp 28, exposure 1.02, light shaft 0.14, floor sun-patch 0.2 |
| `LOOK.night` | sun (moon) 0.16 #7f96ff, hemi 0.07, rim 0.05, **lamp 70**, exposure 0.98, shaft 0.05, patch 0.1 |
| Also mixed by day/night | `scene.environmentIntensity` 1 → 0.32; laptop screen glow `glow` 1.2 → 3.2 (lights the desk at night); curtain emissive glow (day); galaxy projection (night, if on). |
| Sun / moon | from the window direction (`SUN_DIR`), shadow map 2048² ±20; light shaft + soft floor patch through the curtain gap |
| Lamp | point light, shadows 1024² radius 4 (desktop widths) — this is the main night light |
| Adaptive quality | below ~25 fps after 4 s: pixel ratio → 1.5, then lamp shadows off + sun map 1024² |

---

## 11. Overlay UI on the 3D page

| Element | Detail |
|---|---|
| Loader / welcome | black, SJ ring, progress bar, "Good things take time", three tips, **Enter** / *Enter without sound* (the gesture that unlocks audio) |
| Zoom (top-left) / Sound (top-right) | 44 px frosted circles; sound state persists (`localStorage.muted`) |
| Top nav | glass pill **Work · Resume · Contact** (#0a84ff, no underline); boots the laptop into that section |
| Hint (bottom) | "Drag to look around · Click the laptop to open my portfolio" ("Tap" on touch) |
| Skip link | "open portfolio without 3D →" — opens the desktop directly (accessible path) |
| Coach pointer | "Click the laptop" bubble pinned to the lid until the laptop is opened |
| Tooltip | dark pill over interactive objects |

---

## 12. The Mac desktop (OS overlay)

Markup in `index.html` (`#os`), logic in `os.js`, styles in `styles.css` ("Desktop — macOS 27-style").

### 12.1 Layout
- **Screen** (`.os-screen`): max 1180 × 760, radius 20, laptop bezel shadow, original multi-blob gradient wallpaper (#7d6cff, #ff8fb1, #ffb36b, #3fc6ff over #4b3fd1 → #e46aa0).
- **Menu bar** (transparent, macOS 27 style): `SJ` (logo) · **Portfolio** (bold) · File · Edit · View · Go · Window · Help — right side: Wi-Fi, battery, **Spotlight icon**, Control Center glyph, clock ("Sat 3 Oct  3:02 AM", updates every 15 s).
- **Widget** (top right, glass): "Designer / Sijo Joseph / roles / ● Available for new work".
- **Window**: top 46 px, bottom 100 px (**always ends above the dock**), width min(880, 100% − 48), max-height 600, radius 26, Liquid Glass (blur 40, specular top edge, dark outer edge, deep shadow).
  - **Sidebar** runs the full height (212 px), traffic lights sit on top of it, sections with line icons, profile card at the bottom.
  - **Unified toolbar**: section title + glass capsule with **Search** and **Share**.
  - **Body** scrolls (`min-height: 0` on the flex chain is what makes it scroll — don't remove it).
- **Dock** (glass, radius 26): About, Work, Skills, Resume, Contact | LinkedIn, Behance, Back to desk. Magnification on hover (desktop only), bounce on click, running dot.

### 12.2 Sections (`apps` in os.js)
| Key | Title | Content |
|---|---|---|
| about | About | Name, title · location, role chips (all neutral), about paragraphs, "See my work" / "Get in touch" |
| work | Work | Project cards. If `url` is `"#"` the card is **not a link** and says "Case study coming soon". |
| skills | Skills | Groups → chips (all neutral) |
| resume | Resume | Experience list; "Download résumé" if `resumeUrl` is real, otherwise "Ask for my résumé" → Contact |
| contact | Contact | Big email link + Email / LinkedIn / Behance / GitHub buttons |

### 12.3 Menus (click to open, hover to slide between open menus, click outside to close)
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

### 12.4 Keyboard shortcuts (active only while the desktop is open)
⌘/Ctrl + **1–5** sections · **K** Spotlight · **W** close window · **M** minimise · **Esc** closes Spotlight → menu → desktop (in that order).
On the 3D page: **Enter / Space** boots the laptop (when nothing is focused).

### 12.5 Spotlight
Opens from the menu-bar icon, toolbar search or ⌘K. Indexes sections, project titles, every skill, "Email Sijo", "Back to desk". Live filter, ↑/↓ to move, Enter to open, click outside to close. Results show app-style icons.

### 12.6 Other behaviour
- **Share** copies `origin + pathname` to the clipboard and shows a "Link copied" toast (falls back to showing the URL).
- **Traffic lights**: red = close window (desktop stays), yellow = minimise animation, green / double-click toolbar = zoom (fills above the dock).
- **Drag** the window by its toolbar (desktop widths only); size is locked while dragging; position resets each time a section opens.
- **Icons**: original macOS-style squircle app icons (CSS mask), layered gradients + sheen + inner highlights, solid white glyphs. LinkedIn/Behance use simple "in" / "Bē" letterforms as links to Sijo's profiles.
- `OS.setDark(true)` switches the desktop to dark glass tokens (`.os.dark`) — currently always light.

---


## 13. Audio

**Phones (v1.4):** the audio context is created only inside a gesture; *every* tap/click/key retries until `ctx.state === "running"` (iOS refuses the first touch-down and suspends audio on app switches); `navigator.audioSession.type = "playback"` (or a silent looping `<audio>` on older iOS) so the iPhone **silent switch doesn't mute the music**. Hover/click blips are skipped until audio is running.

- **Music (`music.js`)** — original lo-fi loop synthesised live: **76 BPM**, eighth-note grid with 0.12 swing; 4-bar progression Fmaj7 · Em7 · Dm9 · Cmaj7(add9); triangle/sine pads (lowpass 900 Hz), sine bass, soft keys melody chosen per bar from 5 motifs, kick / noise snare / hats, vinyl-crackle bed; master → lowpass 5.2 kHz → compressor; 2.5 s fade-in, 0.8 s fade-out. **No samples or recordings → no copyright issues.**
- Starts on the first pointer/keyboard gesture (browser autoplay rules) unless muted.
- **UI sounds (`Sound` in main.js)**: hover blip (880 Hz sine), click (520 Hz square), boot arpeggio (C-E-G-C), purr (55 Hz saw + 24 Hz tremolo, 1.8 s).
- Mute/unmute: HUD sound button, or the soundbar on the desk. State saved in `localStorage.muted`.


---

## 14. Content and case studies

### 14.1 `content.js` (edit only this for text)
| Field | Value | Status |
|---|---|---|
| `name`, `first`, `title`, `roles`, `location` | Sijo Joseph · SIJO · Multidisciplinary Designer · Product Designer / Brand Strategist / Experience Designer / 3D Designer · Bangalore, India | ✅ |
| `email`, `links.mail` | sijojoseph7509@gmail.com | ✅ |
| `links.github` | github.com/sijojoseph7509-a11y | ✅ |
| `links.linkedin`, `links.behance` | generic linkedin.com / behance.net | ✏️ **need Sijo's profile URLs** |
| `resumeUrl` | `#` | ✏️ add a PDF (e.g. `/resume.pdf`); until then Resume shows "Ask for my résumé" |
| `about` | four paragraphs from Sijo's interview (Kerala → Bangalore, teens, smart/lazy/adventurous, poster meaning, games/football/bike rides, phonk/Malayalam/Hindi, Shea) | ✅ |
| `projects` | Syntra, Carekin (UX / Product), Handovo (Product Design · AI UX), Ekmaati (Branding · Packaging, NID Semester 2) with full `case.sections` | ✅ |
| `skills` | Product Design, Brand Strategy, Experience Design, 3D & Motion, Tools | ⚠️ review |
| `experience` | `[]` (list hidden while empty) | ✏️ add real roles `{ company, role, from, to }` |

Hard-coded copy in `main.js`: profile-card lines (`drawCard`), sticky note, phone lock screen, sketchbook cover ("Personal
AI Lab · VR worlds · AR keepsake · a game", v153), poster text, terminal message, cat bubble, window-view sign text.

### 14.2 Case studies (Work window)
- Source (v68): Tidewell `s6WXmDrd36Frlkg1kVsvUg` page **"Tidewell v3"** (frame `30:3`, 39 sections) · Ekmaati `tkze0DYw6HIb4LdZGvdsht` "ekmaati final", frame **"Desktop - 1"** `1:694` (27 sections, absolutely positioned and slightly overlapping, so slices are cut at each next section's y). Ledgerly removed from the site in v68.
- **Export at 2× (Figma quality — never ship 1× only):** on a temporary page, clone the frame into a clipping frame, `rescale(2)` the clone (2880 px wide), and move the clone up so each window < 32,768 px tall shows one chunk (cut at section boundaries); `get_screenshot` the clip with `maxDimension: 32768` (it never upscales, so the 2× rescale is required); delete the temp page afterwards. Slice per section in headless Chrome into `work/<slug>/NN@2x.webp` (2880 w) and `NN.webp` (1440 w), WebP q90. `content.js → projects[].case.sections` = `[file, height, description]`; the description is the image's alt text.
- Sections are fixed 1440-px compositions (no auto layout inside), so they cannot reflow for phones; phones get the full-width image + pinch-zoom. A true phone layout would need mobile frames designed in Figma.
- Screen sizes: `.case` stops at 1920 px (1512 px on Retina laptops, the width the 2880-px files fill sharply), centred; the Mac display scales up on big monitors with stepped CSS `zoom` (1.15 / 1.55 / 2 / 2.3), reset to 1 in full-screen case view. `sweep.mjs` now covers 18 devices (phones → 4K/ultrawide) and opens every case study on each.
- Viewer: `openCase(slug)` in os.js (Work card, desk folder, Spotlight, deep link `?open=case:tidewell`); images lazy-load; pinch-zoom on phones.
- **Full screen (v2.6):** a case study opens like a full-screen Mac app (`.os-screen.case-fs`): the window fills the Mac screen; menu bar, widget, sidebar and dock are hidden; a sticky `.fs-bar` has window buttons (red/green = back to Work), "‹ All work", title + discipline + status, ‹ n / N › project switching and share. Esc, the back gesture (history entry `{sjCase}`) and ⌘1–5 leave full screen; prev/next replace the history entry.
- **Syntra (v88, first project):** source = Figma `RFow6mVvYRDVcu5NrMgO7D`, page **"Syntra · Documentation"** (`223:2`, 16 frames in Sijo's own glass/blur Lato style). Exported at 2× **with the moving parts hidden** (16 sections, `work/syntra/01–16`), and the moving parts as layers in `work/syntra/fx/` (cover background + bottles + sharp headline, Meet-Syntra hero, card cover, 7 kiosk loop screens, 10 Poly Haven CC0 panoramas 3072 px, 6 real receipts). `content.js` → `case.fx: "syntra-fx.js"`; `os.js openCase` dynamic-imports it (name must match `^[\w-]+\.js$`). **`syntra-fx.js`** (ES module, imports `./vendor/three/…` directly) wraps each section and adds, in the documentation's 1440-px coordinates: mist reveal on scroll · cover background breathing, bottles drifting, "Let's find your perfume." pulling in and out of focus (also in Reflection) · Meet-Syntra photo Ken Burns · How-it-works flow line drawing itself, dots popping + pinging, knob turning through the six moods at the printed dial angles, slider caps moving, weight bars growing, 162 counting up (Lato Thin, `fonts/lato-*.woff2`, OFL) · the Femme screen playing the real kiosk sequence · the panorama strip as a **live draggable 360° view** with 10 world chips · the six tickets printing one by one, 66 counting up · amber "perfume motes" + a warm lantern under the pointer (both `mix-blend-mode: multiply`, removed when the case closes). Layers exported from Figma screenshots have a #F5F5F5 surround, so they were whitened (×255/245) and blend with multiply. Styles in **`syntra-fx.css`** (injected by the module). Reduced motion: everything static. Re-export: duplicate the frames on a temp page with the animated nodes hidden, `rescale(2)`, `get_screenshot` each, WebP q86 (see Design Portfolio HANDOVER §4.7).
- **Ekmaati real box (v108, rebuilt v109):** `content.js` → `case.fx: "ekmaati-fx.js"` (+ `ekmaati-fx.css`). **"Peel the arch" sits right after the cover (01)**; **"Made, not rendered"** sits after section 19. The 3D box is a **Blender-built model** `work/ekmaati/fx/box.glb` (66 KB, geometry + UVs only) made by `tools/ekmaati/build_box.py` (`blender -b --factory-startup -P tools/ekmaati/build_box.py -- work/ekmaati/fx/box.glb [preview.png]`): 6 mm board, arches cut through the three temple faces, solid back wall, plinth, roof tier, peak, idol card, and the sleeve as four boards with their origin on the top edge (`tab_front/right/left` peel, `sleeve_back` stays). `ekmaati-fx.js` applies the WebP photo textures (`fx/tex/`) by material name, lights it with RoomEnvironment, and peels a tab about its own top edge (rotation order YXZ). Drag turns it; grab the lower 42 % of a tab (half-moon notch + pulsing ring) and pull up; past ~57° it tears off. Buttons for keyboard users; no WebGL / load error → a still photo. Films: `film-peel/sleeve/temple.mp4`, 720×900 (4:5), cropped from the 4K source and masked every frame with a time-smoothed Apple Vision mask on #F2EFE6 (`tools/ekmaati/vcut.swift <in> <out> 720 [0.8] [x y w h]`; it frees each frame, peak ~1.3 GB, run one at a time). `tools/ekmaati/cut.swift` = photo cut-outs, `frames.swift` = posters.
- **Handovo (v110, replaces Backwater Line, which is removed from the site, the reader tool and the repo):** source = the Handovo app in `~/floor-pilot` (README + the static "Play the day" prototype `public/demo.html`). `tools/handovo/case.html` is the 1440-px case study (16 sections, brand blue #2F3BEA + lime #D4FF3A, Mona + Inter), using screens in `tools/handovo/shots/` captured from the prototype's 12-step tour at 1440×900 @2× with the tour card hidden (`screenNN`, phone crops `phoneNN`). `node tools/handovo/render.mjs <url of case.html>` (QA_DEPS=puppeteer-core) renders `work/handovo/NN(.webp|@2x.webp)` + `fx/cover-slide` and prints the heights for `content.js`; `python3 tools/handovo/reader.py <build>` writes `work/handovo/reader.html`, `index.html` and `m/` images. To edit: change case.html → render.mjs → reader.py → copy-check → bump. The store, staff and numbers in the screens are the prototype's scripted demo (said in the footer).
- **Handovo, detailed case study (v113):** tools/handovo/case.html now has 35 sections at Carekin's depth: snapshot, Play the day, problem, context by numbers (IBEF retail ~8% of workforce; Microsoft Work Trend Index 2022 frontline report: 63% say leadership messages don't reach them, 1 in 3 lack the right tools; WhatsApp 400M+ India users via TechCrunch 2019), two illustrated-scenario sections (tools/handovo/ill, captioned "AI-generated illustration in my style"), research plan, competitive landscape (categories, no named products), proto-personas, journey map, system architecture, routing diagram, the 9 rules with defaults (from src/lib/templates.ts), 12 key flows, time-driven flows, edge cases, language, trust and privacy (staff privacy notice), principles, build status, measurement plan (targets, no results), next, reflection. Fixed the count numbers to match the screen (8 counted vs 12, ₹7,596). render.mjs runs on the Mac (QA_DEPS) or in the cloud (global puppeteer); reader.py now reads tables, diagram boxes, the journey map, rule rows and stats, and gives illustrations their own alt text. The floor-pilot repo is on GitHub (sijojoseph7509-a11y/floor-pilot) for facts.
- **Proof and motion (v114):** Handovo gains three evidence sections (At a glance; Testing the agent; What the test changed) from the engine evaluation in the floor-pilot repo (branch eval-and-reader-fix: eval/run.ts, eval/messages.json, eval/results.json): 0 of 8,019 rule checks broke the manager's setting, 80 of 95 labelled messages read right by the scripted fallback (en 52/54, hi 19/22, kn 5/10, ml 4/9), all 15 misses still reached a person, 0 of 78 attack attempts approved anything; it found and fixed "khatam ho gaya" being read as done. Motion: case.fx = case-fx.js with ten films (work/handovo/fx/*.mp4, made by tools/handovo/films.mjs from the Play the day demo and from case.html?anim for the routing diagram) and the journey curve drawing itself (render.mjs leaves [data-fx-draw] out of the still and writes fx/journey-curve.webp; positions in tools/handovo/fx.json). case-fx.js videos take an optional 7th value, a corner radius. Syntra, Carekin and Ekmaati get an "At a glance" strip (tools/glance/glance.html -> work/<slug>/glance.webp via tools/glance/render.mjs), shown by os.js after the cover from content.js case.glance, inside a <figure> so motion layers that count :scope > img are unaffected. Carekin's strip says plainly that no carers have tested it yet.
- **Ekmaati box fixes (v115):** the sleeve textures s_front, s_back and s_left are rebuilt by tools/ekmaati/rectify.py, which finds each cut-out photo's four corners, straightens it to an exact rectangle and fills any uncovered edge pixel from its neighbours (the old warps left white and dark slivers at the panel edges and a slanted back panel). s_right stays as it was: its photo was shot at three quarters. The roof tier and peak are now built in ekmaati-fx.js (temple_top: printed canvas textures from the real box, roof 0.52 x 0.13, peak base 0.15, height 0.12); box.glb's roof and peak are hidden, so Blender isn't needed for this.
- **v116:** Syntra's glance strip names Sijo's part (interaction and screens, the nine VR worlds, the ticket and its AR). floor-pilot main now has the evaluation, the khatam fix and a Live AI mode (eval/live.ts, needs ANTHROPIC_API_KEY, writes eval/results-live.json); Sijo confirmed the two Handovo decisions. tools/carekin/test-kit.md + results.csv: a ready-to-run session script for the Carekin test plan; a filled results.csv becomes Carekin's "What testing showed" section.
- **v117:** update.js reloads the page once (session flag cssRetry, adds ?r=) if styles.css didn't apply by the load event, so a request made mid-publish or a dropped connection never leaves the bare unstyled page.
- **v118:** Handovo's scroll reveal is off (fxOpts.reveal "none", as Carekin): sections are simply there. The films, the routing loop and the self-drawing journey curve stay.
- **v119:** the Ekmaati idol is a solid built at load from tex/idol.webp (ekmaati-fx.js idolRelief: the cut-out's outline inflated by distance from the edge, photo on the front, the same cut-out tinted to clay on the back). box.glb's idol card is hidden: it was two-sided with a mirrored back that showed through the cut-out as a second head. A full 360-degree model would need an Object Capture scan of the real idol (object-capture skill, on the Mac).
- **v120:** the idol sits on the plinth floor with a soft contact shadow, has a fuller profile (eased flat at the outline so edges stay clean) and uses the photo as a bump map for carved folds.
- **v121:** Ekmaati: new cover (01.webp, 760 tall so it fits a laptop screen) and a rebuilt experience map (21.webp) on earth, both from tools/ekmaati/slides.html via slides.mjs; the map's feeling curve is a river line drawn in by ekmaati-fx.js (fx/map-curve.webp). River lines are drawn in SVG to the brand-asset rules; mark and lockup cut from the case study's 2x slides (tools/ekmaati/brand/). The three films are replaced by one unboxing film recorded from the 3D box (tools/ekmaati/film.mjs, stepped clock): fx/film-unbox.mp4. The idol no longer turns toward the viewer; Peel the next tab eases the box round to each tab, and the box turns to face the idol once all three are off. Mac window: scrolling on from the end of a section opens the next one (os.js, a gesture that starts at the end, one section per gesture, "Keep scrolling for ..." hint with a bar).
- **v122:** Ekmaati: a new type-led cover (01.webp, 760 tall): "Ek maati / ONE CLAY" with the mark large on earth and river ripples kept below the mark, no packaging. The research section (07.webp, 1240 tall) is redone on plain snow with no card backgrounds: Sijo's own handwriting and stickies (cut from the 2x slide into tools/ekmaati/brand/hand-*.png) sit along a journey line that ekmaati-fx.js draws in on scroll (fx/research-journey.webp, the same clip-path wipe as the map curve). Map: the Delight peak sits lower so its label is no longer cut at the top. Mac window: the "Keep scrolling" hint spans the full grid and sits centred under the content.
- **v123:** Welcome screen redesign: the loader sits on Sijo's favourite-photos collage (assets/brand/welcome-collage.webp, a 1000px -sm version for phones), darkened and blurred in `.loader::before` with a vignette in `::after`. The content is on a frosted panel (`.loader-inner`): sj logo, SIJO JOSEPH in spaced capitals (`.loader-who`), a thin rule with a blue dot, then a small നമസ്കാരം over HELLO. The old "Namaskaram, hello · from Kerala, at my desk in Bangalore" line is gone. Short screens (max-height 520px) get a compact panel that fits without scrolling.
- **v124:** New welcome screen: Sijo's sky photo with the handwritten "TALENT (struck) AIN'T ENOUGH" in the cloud (assets/welcome/sky.webp, sky-sm.webp for phones) replaces the collage. Identity (logo, SIJO JOSEPH, നമസ്കാരം / HELLO) sits at the top, the welcome card low under the cloud so the handwriting stays clear. Either side, two illustrations of Sijo in the cloud text's red ink: juggling a football (left) and playing FIFA on a beanbag (right). They were generated with Figma AI (file "sijo.work — Welcome illustrations", key qjjOxukztOVXq4HCCforhm, nodes 1:2 and 2:2), pulled out through Figma screenshots (asset downloads are blocked in the cloud) and cut out (assets/welcome/juggle.webp, fifa.webp). The animation is inline SVG + CSS in index.html/styles.css: the ball keeps up off the raised foot and spins, he bobs on each touch; on the TV a little match plays in perspective, the shot goes in, GOAL! pops in Caveat, the controller buzzes and he jumps. A slight line jitter (wlBoil) keeps them hand-drawn. Hidden under 1000px wide or 600px tall; reduced-motion shows still poses.
- **v125:** Welcome screen: the v123 dark centred card is back, over the sky (it may cover the cloud's handwriting; Sijo's call). The drawings are redrawn without sunglasses (Figma nodes 3:2 juggling, 5:2 FIFA) and are red ink lines only, no white fill (alpha from ink darkness, lines thickened one pixel). New geometry: juggle 660x1040, fifa 1048x655, TV screen corners (81,220) (212,233) (212,410) (81,477). Drawings hide under 1180px wide or 600px tall.
- **v126:** Welcome screen composition: the dark card over the sky stays; around it five red-ink line drawings (Figma AI, "sijo.work — Welcome illustrations", nodes 6:2 juggle, 7:2 FIFA, 8:2 shoulder press, 9:2 Royal Enfield Bullet (mirrored to face the card), 10:2 Shea), all outline only, hair and beard unfilled, no sunglasses. Left column: keepy-ups (ball pops and spins) above a dumbbell press (dips and drives each rep, effort lines, sweat, a handwritten 8, 9, 10!). Right column: FIFA (match on the TV in perspective, GOAL!, buzz, cheer) above the Bullet (engine thump, spinning tread, road streaming back, smoke puffs, "dug dug dug"). Shea (`.wl-shea`, fixed, z 2) chases a ball along the bottom to the right and back along the top to the left every 16 s, bounding; she also runs on phones. Drawings hide under 1180px wide or 640px tall; Shea hides under 460px tall and with reduced motion. TV screen corners (cropped fifa.webp): (97,165) (247,185) (247,367) (97,439).
- **v127:** Welcome drawings made easier to see on the sky: thicker lines (alpha dilated 5px), a brighter red (#CE161E), and a thin white keyline plus soft shadow on every drawing and overlay (CSS drop-shadows). FIFA and the Bullet redrawn at a medium level of detail (Figma nodes 13:2 and 12:2, bike mirrored); new TV screen corners (116,45) (337,111) (337,377) (116,465) in fifa.webp; Bullet wheel centres (158,613) and (753,621).
- **v128:** Welcome drawings recoloured to near-black ink (#141414); red sky and red ink had about 1.3:1 contrast on the middle sky, black has 4.2:1 there and 11.5:1 on the cloud. Red (#CE161E) is kept only for the moving accents (ball patches, kick and effort lines, sweat, GOAL!, 8 9 10!, controller buzz, smoke, dug dug dug); the accent text has a thin black outline. The white keyline from v127 is removed.
- **v129:** Welcome card: the name under the logo is removed (the logo carries role=img, aria-label "Sijo Joseph"). Spacing rebuilt with explicit margins instead of the old negative-margin offsets: logo 68px, hairline +26, greeting +18, welcome +34, tips +22, Enter +30, sound link +14; card 440px wide, padding 48/48/34. Short and phone screens keep the same order, tighter.
- **v130:** Welcome drawings cut to two: keepy-ups on the left of the card, the shoulder press on the right (both min(58vh, 600px) tall, vertically centred); FIFA and the Bullet removed (assets deleted, still in Figma as nodes 13:2 and 12:2). Strokes back to the cloud's red (#CE161E) everywhere, overlays and Shea included; accent text without an outline. Shea still runs her laps.
- **v131:** The two welcome drawings redrawn in Sijo's reference style (flat colour, bold slightly uneven black outlines, a few tone shapes, print grain): keepy-ups in a black ribbed tee and beige chinos (Figma node 14:2), shoulder press in a black ribbed tank and beige shorts (15:2). Cut out on transparent with the white inside kept. The football is now white with black patches; kick and effort lines, sweat and the count are black. Ball rests on the raised (left) shoe at (73,644) and rises to (150,110) in juggle.webp (700x1126); lift.webp 647x1135. Shea is still the red line drawing.
- **v132:** Gym drawing re-dressed: green and yellow colour-block sweatshirt (sleeves pushed up), black sports shorts, red sneakers (Figma node 16:2); lift.webp now 624x1106, overlays re-fitted.
- **v133:** Welcome drawings now really move: each is a strip of frames (Figma AI sprite sheets, nodes 18:2 and 19:2, cut and aligned on the feet by tools in the session scratchpad) played as a flip-book in CSS (`.wl-sprite`, step-end keyframes). Keepy-ups (juggle.webp, 4 cells of 395x613): left knee, bounce, right knee (frame 1 mirrored), bounce over 2.2 s; the ball goes from under the left toe (136,488) over the head (196,-36) to under the right toe (258,488); a small hop on the bounce frames and a slow side-to-side drift (footwork). Shoulder press (lift.webp, 3 cells of 328x677): shoulders, halfway, locked out, halfway, down over 2.4 s; effort lines at lockout, sweat, the count goes 8, 9, 10! once per rep. Shea the cat removed (asset deleted).
- **v134:** Gym drawing removed (Sijo preferred the keepy-ups alone; lift.webp deleted, still in Figma as 15:2, 16:2 and the sprite sheet 19:2). New bottom-centre pill on the welcome screen, `#introWork` "Here for the work? Skip the desk, see my projects →": enter(false, "work") then boot("work"), which zooms into the laptop and opens Work; without graphics acceleration enter() opens the requested section directly. Phones show only "Skip the desk, see my projects"; hidden on short screens.
- **v135:** Keepy-ups calmed so the card wins attention: smaller (min(46vh, 480px)), further out (left 5vw), slower (a touch every 1.6 s), and play-then-rest: the animations only run while `.wl-juggle` has `.go`; main.js adds it 0.5 s after the welcome screen is ready and on mouseenter, and removes it on the wlJFrames animationend (three touches, 4.8 s). The rest pose is the right knee up with the ball balanced on the foot, the same as the last frame, so nothing jumps. Reduced motion: no play.
- **v136:** Keepy-ups rest pose fixed for physics: a fifth cell in juggle.webp (Figma node 21:2) has his weight on the left leg and his right foot on the ball on the ground, looking down at it; that is the resting state (img at -80%). Play starts half a cycle in (right foot first), runs two cycles and ends back on the ball. Eyes (`.wl-eyes`, SVG whites + pupils laid over the drawn eyes, per-frame positions) follow the ball: up as it rises, down to the foot it falls to. Ball and eyes overlays hide at rest.
- **v137:** Keepy-ups fixes: juggle.webp now carries ?v=N (it changed from 4 to 5 cells; browsers holding the old file showed the wrong slices, cut legs and floating eyes). The side drift and hop are gone, so the figure stays put and the eye overlay can no longer slip off the face. The flying ball is an SVG drawn to match the ball in the rest pose (r 38: black pentagon in the middle, white hexagons, black patches at the rim); touch points (136,503) and (258,503), peak (196,-70).
- **v138:** Keepy-ups drawing cleaned: leftover white background made transparent in every frame (between the arm and the body in the rest pose, between the fingers, beside the hair), and the loose hair-strand stroke at the left of the rest pose's hair removed; the face (eyes, teeth) and the drawn ball are kept.
- **v138:** Rest pose of the keepy-ups: leftover white background between the arm and the body (and a sliver at the hair) made transparent.
- Work cards and About thumbnails use `case.coverSlide` when a project gives one (Syntra: `fx/cover-slide.webp`, 1440 × 900), otherwise the first section.
- Desk folders: tab width now shares the edge (`TAB_W`), so 4+ projects never overlap.
- ⚠️ Testing note (14 Oct 2026): another session had an http-server on 127.0.0.1:4322 serving the `.claude/worktrees/goofy-solomon-8f688e` copy — always check `lsof -iTCP:<port>` or use a fresh port before trusting QA results.
- To update a case study: edit the Web page in Figma → run the copy-check skill on its text → re-export and re-slice → bump `?v=`.


---

## 15. Assets, models, sources and licences

| Asset | Source | Processing | Licence / status |
|---|---|---|---|
| `models/football/*` | **Poly Haven "Football"** by Amal Kumar | inflated variant only, trimmed GLB 50 KB; textures 512/256 px (`arm.jpg` = AO + roughness) | **CC0** ✅ |
| `models/cat/*` | **Free3D** cat (OBJ "12221_Cat_v1_l3") downloaded by Sijo | `gltfpack -cc -kv -vtf`, image refs stripped, quantised positions unpacked at load for the tail rig; recoloured ginger at runtime | ⚠️ **licence unverified** (Free3D personal-use risk). Replacement pending (§23). Raw source files removed from the repo. |
| `assets/profile.jpg` | Sijo's portrait (400 px original, dark background) | subject cut out on-device with Apple Vision (`VNGenerateForegroundInstanceMaskRequest`), composited on a light grey studio gradient with a soft shadow, 1200 px | Sijo's own photo ✅ — a higher-res original would make the card sharper |
| `assets/wall-prints.webp` | Sijo's photo IMG_5904 of his ten One Piece prints | wall keyed out (flood fill from the border), trimmed, 2048 px | ⚠️ third-party character art (One Piece © Eiichiro Oda / Shueisha), shown at Sijo's explicit request |
| `assets/wallpaper.jpg` | Sijo's selfie | cropped, a stranger's hand removed, extended with Adobe generative expand | Sijo's ✅ (part AI-generated hillside) |
| `assets/deskmat*.jpg` | generated in headless Chrome (navy storm, lightning, embers) | — | original ✅ (replaced a Sasuke / Naruto print in v67) |
| Window view (v152) | Poly Haven "Courtyard" + "Courtyard Night" (Greg Zaal), cropped slices in assets/window/ | CC0 | ✅ (the earlier NID-gate drawing is retired) |
| Poster | Sijo's own typographic poster, redrawn in code | — | Sijo's ✅ |
| Fonts | Inter, Caveat | self-hosted | SIL OFL ✅ |
| three.js | vendor | — | MIT ✅ |
| Music / sounds | synthesised | — | original ✅ |

Retired assets (removed): headset (Razer Kraken model), Free3D football, zebra throw, plaster/epoxy photo textures, cap + camera,
macramé shelf, pencil stand, floor plants, Ledgerly case study, the `lab/` prototype.

Reference photos Sijo shared (kept on his Mac, not in the repo): desk/poster/lamp (IMG_5837–5843), Shea (IMG_5873–5880), soundbar
(IMG_5882–5889), astronaut light (IMG_5890–5899), cap + camera (IMG_5900–5902), One Piece prints (IMG_5903–5904), macramé
(IMG_5905–5907), NID gate + campus photos, colour swatches (Oat #CDBEA5, Mulberry #664139), UI-card reference.

---

## 16. Design tokens

| Token | Value |
|---|---|
| Page / ink / muted | `#1d1d1f` / `#f5f5f7` / `#a1a1a6` |
| Accent blue | `#0a84ff` |
| Desktop glass (light) | window `rgba(250,250,252,.86)`, sidebar `rgba(236,236,242,.62)` |
| Fonts | `--font` system → SF Pro Text → Inter; `--display` system → SF Pro Display → Inter; Caveat |
| Radii | window 26, sidebar 18, cards 22, dock 26, pills 999 |
| Easing | `--ease cubic-bezier(.25,.8,.25,1)`, springs via CSS `linear()`; Apple out `cubic-bezier(.32,.72,0,1)` |
| Room colours | Oat #CDBEA5 · Mulberry #664139 · laminate #221e1c · Space Black #2e2d30 · mango #ffb21a · poster red #c7262e · lamp #ffb468 |

---

## 17. Responsive, devices, accessibility

- **Tested on 18 sizes** by `sweep.mjs`: iPhone SE / 15 / 15 Pro Max, small Android, phone landscape, iPad, iPad landscape,
  iPad Pro portrait, very narrow + narrow windows, small laptop, Windows laptop 1366, MacBook, MacBook Pro 16, Full HD, QHD, ultrawide 3440, 4K.
- Phones: desktop window becomes a tab layout; case studies full width with pinch-zoom ("Pinch to zoom" hint). Big monitors: the
  Mac display scales up with stepped CSS `zoom` (1.15 / 1.55 / 2 / 2.3); case column ≤ 1920 px (≤ 1512 px on Retina laptops) so the
  2880 px images stay sharp.
- `prefers-reduced-motion` disables the camera tween, desktop zoom and animations. Real buttons/links, ARIA menus, Spotlight dialog,
  focus outlines. The 3D scene is not screen-reader navigable — the skip link opens the plain portfolio.

---

## 18. Performance

- First visit ≈ 1.5 MB before case studies (models ≈ 1 MB, photos ≈ 1.8 MB lazy where possible); case-study images lazy-load.
- Models start downloading at the first line of `main.js`; loader waits ≤ 5 s + ≤ 4 s shader warm-up; late models fade in.
- Rendering pauses while the Mac desktop covers the room. Laptop screen redraws ~30 fps. Adaptive quality (§10).
- Live load measured ≈ 2.8 s to the room on a home connection. GitHub Pages is occasionally slow (QA live runs sometimes time out
  once; a rerun passes).

---

## 19. Deployment and cache-busting

1. Edit files.
2. **Bump the version** — the same number in every `?v=N` in `index.html` and in `version.json` (a Python one-liner is in every
   recent commit flow: read `version.json`, +1, regex-replace `?v=\d+`).
   - Why: phones reopen cached pages. `update.js` fetches `version.json` (never cached) on load / back-forward / return after 60 s and
     reloads once to `?v=N` if newer (guarded against loops; never while the desktop is open). main.js/os.js append `?v=` to every asset.
   - Don't delete a model file an older build used without thinking about cached pages (old builds simply leave a failed model out).
3. Run the checks (§20): site-qa, sweep, site-security, copy-check — fix every ❌.
4. `git add -A && git commit -m "vNN: …" && git push origin main` (commit messages end with the Co-Authored-By line for assistant commits).
5. Wait ~1 min, confirm `curl -s https://sijo.work/version.json`, run site-qa against `https://sijo.work/`.

---

## 20. Skills (project + personal) and how to run every check

All project skills live in the repo at `.claude/skills/` (versioned; Claude Code picks them up automatically in this repo).
One-time setup for the scripts: `npm i --prefix <scratch-dir> puppeteer-core@23` and use `QA_DEPS=<scratch-dir>`; Google Chrome must
be installed at `/Applications/Google Chrome.app`. Serve the repo locally first (§3).

| Skill | What it's for | Run |
|---|---|---|
| **site-qa** | 35 real-browser checks (incl. Shea's round trip: starts on the desk, reaches the floor, comes back to her spot): desktop + phone load (cat, ball, no errors), every desk item on screen, welcome/Enter/music, every `?open=` deep link, boot + Esc, menus, Spotlight, ⌘ shortcuts, scrolling, resize, model-failure path, stale-cache path, self-update, fonts self-hosted, case studies open + images load + no notes, window day↔night, zoom behaviour | `QA_DEPS=… node .claude/skills/site-qa/qa.mjs http://localhost:4321/` (or `https://sijo.work/`) |
| site-qa · sweep | layout bugs on 18 devices (off-screen / overlapping controls, cut text, sideways scroll, missing models/wallpaper, blurry case images) + screenshots of every screen | `QA_DEPS=… node .claude/skills/site-qa/sweep.mjs <url> <out-dir>` |
| **site-security** | 15 checks: CSP present + hash valid, no inline scripts, vendor file hashes, no third-party hosts, safe links, no secrets, HTTPS redirect (live) | `QA_DEPS=… node .claude/skills/site-security/audit.mjs <url>` (`--fix` re-records hashes after an intended import-map/three.js change) |
| **copy-check** | finds notes-to-self, placeholders, AI-style words, em dashes, emoji/stray symbols in content.js / os.js / index.html (and Figma text) | `node .claude/skills/copy-check/check.mjs` |
| **room-scene** | real-size table of every room object, art-direction rules, scripts: `render.mjs` (screenshots of home/room/any debug camera, day or night + `Desk.boxes()`), `pixel.mjs` (rendered colour vs swatch) | `QA_DEPS=… node .claude/skills/room-scene/render.mjs <url> /tmp/r night home room "win:5,19,20,30,18,20"` |
| **cat-animation** | rig Shea in Blender (`rig.py`, joint table `J`, eye/ear weight fixes), repack with gltfpack, change her behaviour in `cat.js`, and capture frame-exact sequences (`catstep.mjs`, `catlog.mjs`) | see `.claude/skills/cat-animation/SKILL.md` |
| **object-capture** | turn 40–80 photos into a 3D model on the Mac (Apple RealityKit PhotogrammetrySession); 8 one-sided photos fail | `swiftc -O .claude/skills/object-capture/scan.swift -o scan && ./scan <photos-dir> out.usdz` |

Personal / app skills Sijo has installed (in `~/.claude`, not the repo) and that were used or are relevant:
`portfolio-case-study`, `studio-grade-case-study`, `portfolio-evidence-and-imagery`, `portfolio-image-generation`,
`human-art-direction`, `agency-brand-documentation`, `editorial-narrative-illustration`, `impeccable` (UI design/critique),
design plugin skills (`design:design-critique`, `design:accessibility-review`, `design:ux-copy`, …), `figma:figma-use` (Figma
Plugin API rules — used for every export), `anthropic-skills:*` (browser, docs, pdf, pptx, xlsx, schedule, deep-research…).

---

## 21. AI tooling, plugins, connectors and machine setup

| Tool / connector | Used for | Status |
|---|---|---|
| **Claude Code** (Claude desktop app, Code tab) | all building, testing, deploying | ✅ |
| **Figma MCP** (`use_figma`, `get_metadata`, `get_screenshot`) | reading case-study files and exporting them at 2× (temp pages created and deleted; originals never edited) | ✅ connected. Files: Tidewell `s6WXmDrd36Frlkg1kVsvUg`, Backwater Line `6iuhjuMILOUIsgbqNKq8OG`, Ekmaati `tkze0DYw6HIb4LdZGvdsht` (+ the old Ledgerly `K030R1Iv01ggC5Xf4Tu23h`) |
| **GitHub CLI `gh`** | repo rename back, Pages custom domain + HTTPS via API | ✅ logged in |
| Built-in app browser (Claude Browser) | previews, a GoDaddy attempt | GoDaddy's login doesn't render in it (scripts blocked) — DNS was done by Sijo in Brave |
| Claude in Chrome extension | (offered for GoDaddy) | not connected — Sijo uses **Brave** |
| Apple **Vision** (Swift) | subject cut-outs (Shea photos, profile photo) | ✅ on-device, nothing uploaded |
| Apple **RealityKit Object Capture** (Swift) | photogrammetry test of Shea | ✅ works on the Mac (M5); needs 40–80 photos (object-capture skill) |
| Hugging Face **TRELLIS** (`trellis-community/TRELLIS`, MIT) via `gradio_client` in a `uv` Python 3.12 venv | image → 3D test of Shea (first result: tail and eyes wrong) | free ZeroGPU quota runs out after one generation; a free HF login (`uvx --from huggingface_hub hf auth login`) gives more |
| Sketchfab / Poly Haven / Quaternius / OpenGameArt APIs | finding free (CC0/CC-BY) models | Poly Haven football used |
| Adobe for creativity, creative-claw, Canva, Notion, Slack, Linear, Atlassian, HubSpot… (plugins/connectors in the app) | — | **not authorised / not used** (need sign-in via claude.ai connector settings or `/mcp`) |
| Image generation connectors (Abracadabrax, ManyMotions) | — | not used |

Machine: Apple M5 Mac, macOS 27, Xcode (swift), Google Chrome (for headless checks), Brave (Sijo's browser), Node 26, `uv`, **Blender 5.2** (Homebrew cask, for rigging the cat).

---

## 22. Memory (what the assistant remembers between sessions)

Claude Code keeps notes in `~/.claude/projects/<this-project>/memory/`:
- **hiring-quality-projects** — case studies must match Figma resolution; every change is judged by "does this get Sijo hired".
- **sijo-portfolio-site** — site is sijo.work, repo name must stay `*.github.io`, the lab prototype was rejected, where handover/skills live.

---

## 23. Known issues, open items, next steps

0. **Temporary password gate (since v84)**. While the site is being built, every visitor sees a black "This portfolio is private"
   screen (SJ ring, password field, *Unlock*; no email link since v85). Password: **Shea** (trimmed, any case). Once entered it is
   remembered on that device (`localStorage["gate"]`). It only hides the site: the files stay public on GitHub, so it is not real security.
   - Parts: `gate.js` (salted SHA-256 `HASH`, no plain password), `<script src="gate.js?v=N">` in `<head>` after `update.js`, the
     `<div class="gate" id="gate">` block at the top of `<body>`, the "Password gate" block at the end of `styles.css`, and `GATE_HASH`
     in `site-qa/qa.mjs`, `site-qa/sweep.mjs`, `site-security/audit.mjs` (tests start unlocked) + the "Password gate" check in `qa.mjs`.
   - **Change the password:** `python3 -c "import hashlib;print(hashlib.sha256(b'sijo.work:gate:v1:' + 'newpassword'.lower().encode()).hexdigest())"`
     → paste into `HASH` in `gate.js` and every `GATE_HASH`. Change `v1` in `SALT` (and the command) to sign everyone out.
   - **Remove it before sharing with hiring teams (Sijo's plan):** delete `gate.js`, its `<script>` line, the gate `<div>` and the CSS block;
     delete the "Password gate" check from `qa.mjs` (the `GATE_HASH` lines can stay or go); bump the version; run the checks; push.
1. **Shea (cat) model** is still the Free3D cat (licence unverified) and doesn't look like Shea. Options: (a) Sijo takes 40–80 photos
   (two full circles, soft light) → object-capture skill → real scan; (b) TRELLIS image-to-3D with the five Vision cut-outs (needs HF
   login); (c) the CC-BY Sketchfab "Orange Tabby Cat" by Chenchanchong (needs a credit line).
2. **Content**: LinkedIn + Behance URLs, résumé PDF, work experience.
3. **Profile photo** is upscaled from 400 px (sharpened at load since v77) — a ≥ 1500 px original would make the card truly sharp.
4. **Wikimedia Commons photos inside the Ekmaati case study** need their licence named (e.g. "CC BY-SA 4.0") in the Figma credits.
5. **One Piece prints** are third-party art (Sijo's decision) — replace with original art if the portfolio is used commercially.
6. Old Sasuke mat / Free3D files remain in **git history** (not on the site); purging needs a history rewrite (ask first).
7. Case studies are fixed 1440 px designs — phones pinch-zoom; real mobile layouts would need phone frames in Figma.
8. ~~Optional: AAAA DNS, Open Graph tags + share image, `404.html`, split `main.js`~~ — all done (v103: `sound.js` and `room-utils.js` split out of `main.js`).
9. Brand-new domains are sometimes blocked by corporate firewalls for ~30 days — normal; it clears on its own.

---

### Changes since v6.1 (builds v101–v103)
- **v101** — case studies show the original layout only; the Text button is gone (`caseView()` always returns "layout"; `work/<slug>/reader.html` files remain but are unused).
- **Git history purge** — old Sasuke/Naruto desk-mat blobs and the Free3D football (`football.fbx`, its textures, old `football.glb` versions) removed from all history with git-filter-repo and force-pushed. The cat was deliberately kept.
- **v102** — Work page filter under the subheading: filter icon (shows all) + **NID** (Syntra, Ekmaati) + **Self** (everything else). A project counts as NID when its `status` in `content.js` contains "NID".
- **v103** — `main.js` split: `sound.js` (the Sound synth) and `room-utils.js` (sharpen, rr, bezier, tileNoise, wrapText). Their `?v=N` in main.js must be bumped with every release.
- **v104** — performance: quality now steps down unless the desk runs at ≈45 fps (was 25): pixel ratio 1.25 → shadows off → 1× and no shadow map. Software rendering (browser hardware acceleration off: SwiftShader / llvmpipe / Basic Render, ≈3 fps) is detected from the WebGL renderer name; those visitors go straight to the Mac portfolio with a 9 s toast telling them to turn acceleration on. `Desk.state().gpu` shows the GPU name.
- **v105** — profile card's wall shadow: no longer offset below the card or counter-moving with its drift (it read as a sliding black patch); now a faint static halo right behind it.
- **v106–v107** — new sj ligature logo across the site (favicon, loader, gate, menu bar, avatar, laptop screen and lid); files in `assets/brand/` (`sj-mark.svg`, `sj-mark-white.svg`). The health check covers the logo.
- `CLAUDE.md` added: every change is checked, committed and pushed automatically.

## 24. Decision log

| Topic | History → final |
|---|---|
| Overall concept | Started from a reference portfolio (ishantp.com, desk-diorama idea). Built **original** designs only — no copying of his assets, text or stickers (Pokéball, Dragon Ball, Capsule Corp, anime car were deliberately excluded). |
| Background/floor | Dark dots → light Apple studio → dark dots → **cream marble tiles**. |
| Computer | Retro CRT → silver 13" laptop → Midnight 13" → **MacBook Pro 14" M5, Space Black, real size**. No Apple logo (SJ monogram instead). |
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
| Room direction (Oct 2026) | Desk-only diorama → full room from Sijo's references; brown panelling → oxblood → plaster photo → gingerbread → **Oat paint + Mulberry tiles**; top-view **lab** prototype built and **rejected** (deleted). |
| Copyright line | Sasuke mat replaced with original art; Free3D football replaced with CC0; original pop-art made first, then Sijo chose to show **his own photo of the One Piece prints**; NID view painted, not the web photos. |
| Night default | Day/night followed the visitor's clock → **always night on arrival** (Sijo liked it best); the curtains are the switch. |
| Desk props | Cap + camera, macramé shelf, pencil stand, floor plants, zebra throw, headset all tried and removed at Sijo's request. |

---

## 25. Change history (newest builds first in the v3–v4 block)

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
| (v6.4) | v94: Skills cards aligned with CSS subgrid (icon, title, description and chips share row tracks across the three cards; Product Design card laid out icon-left); chips turn blue (accent) on hover like the primary button. |
| (v6.5) | v95: Case studies tightened from the Figma files (empty bands closed in Carekin, Backwater, Syntra, Ekmaati; sources removed, one credit line kept on Syntra reflection; Carekin problem/voices/try-3 fixes; photo backgrounds behind Carekin human friction and Backwater problem); Syntra card drops "Team project", team names moved from cover to reflection, section 16 removed; Carekin journey map draws itself (case-fx `draw` option, transparent `work/carekin/fx/journey-curve.webp`, coral rings on the two hand-off dots); About bento re-ordered (large lede, photo column spanning two rows, big quote "to begin an era", skills list); Backwater typo "promise ,the" fixed (section 32). |
| (v6.6) | v96: Ekmaati: Festival Errand illustration note no longer overlaps the closing lines (section 20); footer drops the old "Next project · Tidewell" button and the Sources column (section 27). |
| (v6.7) | v97: LinkedIn now points to Sijo's profile https://www.linkedin.com/in/sijodesign (dock, Contact). Behance still a placeholder. |
| (v6.8) | v98: Visit counting ready (`track.js`, GoatCounter, no cookies, image requests only; CSP img-src allows *.goatcounter.com). Inactive until `analytics` in content.js holds the GoatCounter code. Counts "/", Mac apps, `/case/<slug>`, events case-<slug>-half/-end/-1min/-3min, enter-desk, click-linkedin/behance/github/email, copy-email, copy-link. `?ref=<name>` links tag a visit; `?notrack` excludes a device; `localStorage.sjTrackDebug=1` logs instead of sending. Security audit allows *.goatcounter.com. |
| (v6.9) | v99: **Text version of every case study** (tools/reader/, see its README): real HTML built from the Figma data and 2× exports; `work/<slug>/reader.html` shown in the Mac window (phones by default, "Text"/"Layout" button in the case bar, remembered in localStorage `caseView`), and standalone pages `work/<slug>/index.html` (sijo.work/work/<slug>/, no JS needed, gate.js included) with OG images `work/<slug>/fx/og.jpg`. Tables become cards on phones, wide diagrams scroll sideways, tap to zoom (os.js `openZoom`). Layout view now lazy-loads (no preload loop; a case opens with ~0.3 MB instead of 6–14 MB); 540p films for the text version (`fx/*-540.mp4`). Syntra: `case.stills` + `work/syntra/still/` used if syntra-fx fails or isn't ready in 8 s (`fx-ready` class). Enter on the welcome screen is silent; "Enter with sound" below it (#introSound). Phones: no traffic lights or title bar in the window, slimmer case bar. noscript lists the four case pages; os.js watchdog opens the simple portfolio if the desk hasn't started after 25 s (gate time excluded). Meta: new title/description, canonical, Open Graph + Twitter card (`og.jpg`), JSON-LD Person; robots.txt, sitemap.xml, 404.html. Figma (all four files): small text +1 px and grey small text darkened to ≥7:1 (layout untouched, no new overlaps), Carekin journey map heading + bigger labels (draw overlay now at y 330), Ekmaati footer contour fade, typos ("chat , only", "seen i", "idol , nothing", "Sole designer :", Syntra "What they say ?", "Module :", "bottles,one", "It's"), Syntra quote labels no longer overlap. Section heights in content.js corrected (several were off). QA: sweep knows the text view; security audit allows JSON-LD and checks only code hosts. |
| (v6.10) | v100: Fix: pictures in the text version were invisible inside the Mac window (the layout's `.case img { opacity: 0 }` fade-in rule hit them and they never got `.in`); `.case.case-text img` is now always visible. Test: `scratchpad/cap/vis.mjs` scrolls each case on a phone and counts loaded/visible images. |
| (v6.4) | v93: **Role**: "Product, UX & AI designer" + `also: "Vibe coder"` (About eyebrow, role card, Skills subtitle, wall card lines). **Skills**: new group "AI & Vibe Coding" (Claude Code, Codex, ChatGPT, Gemini, Higgsfield, Three.js / WebGL); 3D & Motion removed (Blender + SketchUp now under Experience Design); tools grid = Figma, Photoshop, Illustrator, SketchUp, Blender, Three.js, WebGL, Framer, Notion, Claude Code, Codex, ChatGPT, Gemini, Higgsfield (Simple Icons v13.21 CC0 marks added to `icons.js`; Higgsfield is a lettered tile). Cinema 4D, KeyShot, Spline, ProtoPie, After Effects removed. **Dock/app icons** redrawn calmer and Apple-like (finer glyphs, soft top light, no gloss streak/specular, shadow on the dock item); discipline/tool tiles lost their shine. **Contact** rebuilt: availability + live Bangalore time, email card with Send / Copy address (toast), tiles for LinkedIn, Behance, GitHub, Résumé. **Work cards** all 16:10 via `case.coverSlide` (new slides for Carekin, Backwater, Ekmaati in `work/<slug>/fx/cover-slide*.webp`). QA 36/36, security 15/15, sweep 18/18. |
| (v6.3) | v92: **Finish pass (Sijo's feedback)**: About has a **Resume** button beside Get in touch (opens Resume, or the PDF once `resumeUrl` is set). Carekin and Backwater Line no longer animate sections on scroll (`fxOpts.reveal: "none"`; Sijo "lost the connection"); Backwater's yellow sweep line is gone and the day/night slider simply rests at 50%. Syntra pages are always visible (only the live layers ease in) and three frames were tightened in Figma (02 process −300, 04 journey −480, 14 reflection −280; re-exported 03/05/15). Mac controls: buttons lift with a soft glow, a sheen and a spring press; pill buttons swell; sidebar icons nudge; next-case link underlines; focus rings; a reading-progress hairline under the case-study bar. QA 36/36, security 15/15, sweep 18/18. |
| (v6.2) | v91: **Carekin** (renamed from Tidewell; Figma "Carekin · Case Study (Final)" `121:2`, 44 sections) and **Backwater Line Final** (`88:2`, 44 sections) replace the old exports (`work/tidewell` deleted, `work/backwater` re-sliced; `work/carekin`). Their motion layer is **`case-fx.js` / `case-fx.css`**, configured per project in `content.js → case.fxOpts`: Carekin `reveal: "rise"` (calm settle) + the 49 s walkthrough playing inside its poster (`work/carekin/fx/walkthrough.mp4`, 720p 1.3 Mbps via a Swift AVAssetWriter transcoder); Backwater `reveal: "wipe"` (sections open left→right behind a signage-yellow line) + the 41 s day→night film + a **drag-to-compare day/night jetty** (`fx/jetty-night.webp`, keyboard ←/→). Films play only while on screen and pause on a tap. Work-card hover panel now spans the card's full width, near-opaque, and the cover blurs under it (the cover's own text no longer shows through). **Home page personality:** welcome screen says നമസ്കാരം (self-hosted Noto Sans Malayalam subset, `fonts/noto-malayalam-namaskaram.woff2`, OFL) with "Namaskaram, hello · from Kerala, at my desk in Bangalore"; the phone lock screen shows **Bangalore time (IST)**, a line for the hour, and **Now playing**, redrawn every 20 s; the **soundbar switches four original generative moods** (`music.js`: Desk lo-fi, Night-drive phonk, Kerala evening (Mohanam, tanpura, Adi talam), Monsoon chai (harmonium, flute, keherwa)), with a mood-coloured LED and a "Now playing" pill; the **football is a keepy-up game** (click to pop it up, click again before it lands; best score in `localStorage.keepy`, score pill at the top). A brass nilavilakku was built and removed at Sijo's request. QA 36/36, security 15/15, sweep 18/18. |
| (v6.1) | v90: sticky note resized (1.15) and seated in the free palm rest right of the trackpad (x 2.24, z 1.16, tilt −0.05), clear of the trackpad and the deck edge; it used to overhang the front. |
| (v6.1) | v89: **Syntra added as the first case study** with its own motion layer (`syntra-fx.js` / `syntra-fx.css`): mist reveals, focus-pulling headline, breathing cover, self-drawing system line, turning knob and sliders, counters, kiosk sequence, live 360° VR strip, printing tickets, perfume motes and a pointer lantern; Lato Thin/Light self-hosted; desk folder tabs fit 4 projects. QA 36/36, security 15/15, sweep 18/18. |
| (v6.0) | v88: **Faculty feedback**: the Mac is **full screen** (no bezel, notch or surround; big monitors scale the UI with `--z`); roomier window (1120 px, 56 px padding, bigger type and gaps); **upfront goal and role** (content.js `focus` "Product / UX designer", `education` "M.Des design student, NID Bengaluru", `seeking`): About opens with Sijo's portrait, role, studies and location, then cover slides of the work and a bento of his story; Work shows each project's **cover slide** (section 01) with a frosted panel that rises on hover (always shown on touch); Skills = discipline cards with app-style icons (Product Design first, full width) + a "Tools I use" grid with official logos (`icons.js`, Simple Icons CC0 data; Spline/ProtoPie/KeyShot as lettered tiles). |
| (v5.9) | v86: **Simpler cat, fewer glitches**: Shea only moves her head/neck, tail and breathing (no sitting); hover no longer scales objects (it pushed the laptop screen out of the lid, the curtains into the wall, props into the desk): small desk props (folders, phone, sketchbook) lift a few mm instead; case studies fade each section in over the project colour, fetch the rest in order two at a time after the first view, and start downloading when you hover a project card or desk folder (`OS.warmCase`). `Desk.state().cam` added for tests. |
| (v5.9) | v87: project cards say **Self-initiated project** instead of "Concept project" (Sijo, 13 Oct 2026); copy-check rule updated. |
| (v5.8) | v85: removed the gate's "Need the password? Email me" link (it opened the Mail app). |
| (v5.8) | v84: **temporary password gate** (`gate.js`, password *Shea*, remembered per device; see §23.0). Keys can't reach the desk while locked. QA/sweep/audit start unlocked; new QA check for the gate (36 checks). |
| (v5.7) | v83: **Mac desktop feel**: dock magnification on a per-frame spring with a cosine fall-off measured from resting positions (icons grow from the bottom, neighbours glide, shadows deepen; off on touch/phones/reduced motion); Liquid Glass icons (top specular highlight, refraction glow at the bottom edge, gloss streak, glyph depth; gradients only, no rectangular inset shadows, which the squircle mask cut into white lines); frosted glass dock shelf; switching tabs no longer replays the window pop: the page settles in (fade, short rise, blur clearing, staggered) and the sidebar highlight glides between items; menus open with a soft scale. |
| (v5.6) | v82: **Shea's sit re-posed from reference photos** (Wikimedia Commons "Sitting cats"): upright and compact (pelvis slides 6 cm forward and tips 50°, chest near vertical over straight front legs), hind leg folded flat against her with the heel under a round haunch and the paw just behind the front paws, tail lying in one smooth curve round her side, head brought back level over both neck joints; the tail trails the body with softer easing toward the tip (no whip). `renderclip.py` renders the clip's pose from five sides. |
| (v5.5) | v81: **Shea's neck**: the chest/neck fur layer slid against the skin when she turned her head (stair-step seams); the rig now blends weights over 3 cm in the neck region so both layers move together, and the skull's rigid zone fades in over 4.5 cm instead of a hard edge (`necktest.py` renders a head turn to check). Hover attention holds 2.5 s (the pointer flickering at her outline made the head twitch); head turns slower and within a natural range, spread over neck, neck2 and head. |
| (v5.4) | v80: **Shea stays put and sits like a real cat**: walking removed; sitting is now a clip keyframed in Blender from cat anatomy (hindquarters first, hocks flat, straight front legs, tail wraps) instead of live IK. Leg glitch root causes fixed: per-frame IK flips (now no live IK), Blender constraint flips (poles calibrated per leg, key poses keyed as plain transforms), three's AnimationMixer skipping unchanged bones (clip sampled directly). Spatial weight smoothing in the rig. QA: no joint may move > 8°/frame except the tail. |
| (v5.3) | v79: **Shea smooth and desk-only**: no more floor trips; she walks to the desk mat, sits, meows and comes back. Glitches fixed at the source: paws could target the floor at the desk edge, turning speed jumped between actions, legs over-stretched and snapped (now soft IK + re-stepping + speed-matched stride), head flipped when looking behind, hover scaling stretched her pinned legs. Smoothed skin weights in Blender; joint smoothing every frame. Meow sound (synthesised) on pet and when she sits. QA check now measures per-frame joint jumps. |
| (v5.2) | v78: **Shea is rigged and animated like a real cat**: a 32-bone skeleton skinned in Blender (`models/cat/shea.glb`), animated by `cat.js` (IK-planted paws in a lateral-sequence walk, ballistic jumps with real gravity, head look-at, spring tail, breathing). She starts on the desk; 10 s after Enter she hops down, visits the window and the football, jumps back up and returns; again every 45–80 s. New cat-animation skill; QA round-trip check. |
| (v5.1) | v77: profile card is now a **floating UI card** (rounded, no white rim/acrylic mount, lit from within, 6 cm off the wall with a soft offset shadow, slow drift, 1400 px canvas, photo sharpened). **Shea moves**: walks in across the floor after Enter, crouches and jumps onto the desk, walks to her spot; every 45–75 s hops down, wanders and jumps back (per-vertex leg rig + body pitch/crouch; shadow follows). QA 35 checks (new cat check; position checks wait for `catBusy` false). |
| (v4.6) | v76: pencil stand removed, bottle moved to its spot (front-left); charging cable now only runs from the charger down the wall and lies loose on the floor with a free plug end (MagSafe connector removed); profile card +10% (6.27 × 10.34) and moved left to x 7.4; `assets/profile.jpg` re-made: Sijo cut out with Apple Vision subject lifting (on-device) and placed on a light grey studio backdrop like the reference (1200 px). |
| (v4.5) | v75: wall name/roles lettering replaced by a **profile card** (frosted-photo UI card: `assets/profile.jpg`, progressive blur + dark glass, white name + verified seal, two-line about, stats = disciplines + case studies, white "Say hi +" pill; drawn in `drawCard`, mounted on a white acrylic panel with a wall shadow; click = About). Two floor plants (terracotta + aloe) removed. Charger now upright in the socket with the cable dropping straight down, lying loose on the floor, rising behind the desk to the MacBook. |
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


---

## 26. Legal, credits and IP

- **Sijo's own**: poster, photos (profile, wallpaper, prints photo), case-study content, the room itself.
- **Original, made for this site**: all procedural geometry and textures (walls, tiles, desk, props, astronaut, soundbar, window
  view, curtains), desk-mat art, profile-card design, icons, the generative music (music.js) and the UI sounds.
- **Shea's voice (v150, assets/sound/)**: real recordings, both CC0 (no attribution required, credited anyway): meow-1, meow-2 and
  purr from Kerzoven's "Cat Purr & Meow" (opengameart.org/content/cat-purr-meow); meow-3 and meow-4 from Joseph Sardin's "Small
  mewing of a cat" (bigsoundbank.com, sound 0098), raised 3 semitones. Trimmed, high-passed and level-matched; see sound.js.
- **Window view (v152)**: Poly Haven "Courtyard" and "Courtyard Night" by Greg Zaal, CC0 (polyhaven.com/a/courtyard, /a/courtyard_night).
- **Third-party**: football — Poly Haven, CC0; cat — Free3D (licence unverified, to replace); One Piece print artwork (© Eiichiro Oda /
  Shueisha) shown via Sijo's own photo at his request; fonts — SIL OFL; three.js — MIT.
- **Not used on purpose**: Apple logos/wallpapers/app icons (SJ monogram + original icons instead), brand logos on the speaker/camera,
  the NID web photos, the reference portfolio's assets.
- Trademarks (Apple, MacBook, macOS, LinkedIn, Behance, NID, Portronics) are referenced descriptively only.

### v154: portfolio-review fixes (pd-portfolio-review / UXfolio 2026)
- Password gate removed (gate.js, its markup and styles); QA now checks a first-time visitor reaches the welcome card, which names Sijo and his role.
- Projects ordered Handovo, Syntra, Carekin, Ekmaati. Each project has `result` (shown on its Work card, no hover needed) and `brief` {role, problem, result} (a band at the top of its case study, built in os.js `fillCase`).
- `links.behance` is empty until there is a real profile; the dock icon and Contact tile are hidden while it is.
