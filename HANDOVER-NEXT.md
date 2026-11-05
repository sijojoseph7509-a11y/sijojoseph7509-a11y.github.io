# sijo.work: handover for the next session

The current state, how to work on the site, and what is still open. HANDOVER.md stays the full project
reference, with release notes up to v221. Read this first, then dip into HANDOVER.md for history.

## Where things stand (5 Nov 2026)

- **Live:** v221, commit `114da3e` on `main`, sijo.work/version.json `{"build": "221"}`. Local, GitHub and the
  live site matched when last checked (file hashes compared).
- **Repo:** `/Users/sijo/Documents/Portfolio website`, GitHub Pages from `main`.
- **Recent work (v216 to v221):**
  - Carekin app redesigned (the "D2" look, in Carekin's brand colours) in every Figma page and on the site.
  - Carekin and Handovo are told in seven chapters.
  - Link hovers are an underline plus an arrow.
  - Syntra has three more sketchbook pages.
  - All whiteboards are redrawn in hand-drawn blue pen.
  - Scroll reveal is off on every case.

## Sijo's rules (keep to these)

- **Show before publishing.** Show images or screenshots first, and publish only when Sijo says "publish".
  CLAUDE.md says publish automatically, but this session he has always reviewed first.
- **Documentation:** don't change it unless he asks or says publish.
- **Questions:** when he asks a question or wants an audit, answer only. Make no changes until he says so.
- **Cat model:** don't change it.
- **Paid services:** no cloud credits or paid online services without asking first.
  - Figma AI image generation is fine; he asked for it.
- **Downloads:** need his explicit OK every time.
- **Secrets:** never handle, type or extract API keys.
  - `ANTHROPIC_API_KEY` in `~/floor-pilot/.env.local` is empty, so the live Claude evaluation waits for his own key.
- **floor-pilot repo:** stays private. "Except making the code public, do everything else."
- **AI-generated images:** no per-image captions. One line in Handovo's "How I made it" card is enough.
- **Tokens:** use them wisely. He is short on them, so keep replies and tool output lean.
- **Facts:** only ones already in a case. Never invent quotes, numbers or process steps.

## Publishing

1. Bump `?v=N` everywhere it appears, and `version.json`:
   ```bash
   grep -l "v=221" index.html main.js work/*/index.html | xargs sed -i '' 's/v=221/v=222/g'
   ```
2. Serve locally:
   ```bash
   python3 -m http.server 4321 --bind 127.0.0.1
   ```
3. Run the checks with `QA_DEPS=/Users/sijo/ek_build/qa`. All must pass:
   ```bash
   node .claude/skills/site-qa/qa.mjs http://localhost:4321/
   ```
   ```bash
   node .claude/skills/site-security/audit.mjs http://localhost:4321/
   ```
   ```bash
   node .claude/skills/site-qa/sweep.mjs http://localhost:4321/
   ```
   ```bash
   node .claude/skills/copy-check/check.mjs
   ```
   Also run `check.mjs work/<slug>/reader.html` for each case you changed.
4. Append a release note to HANDOVER.md.
5. Commit, ending the message with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
6. `git push origin main`.
   - The connection is slow, and big pushes time out with HTTP 408.
   - Run the push in the background and retry until `git ls-remote origin main` equals `git rev-parse HEAD`:
     `git -c http.postBuffer=524288000 -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=600 push`
7. Confirm the live `version.json` shows the new build. Never force-push.

## How each case is built

### Handovo: rendered from HTML

- **Source:** `tools/handovo/case.html`, with 61 `<section>`s.
  - Chapters: `.chap` dividers with `data-anchor="ch1…ch7"`.
  - Contents: "The story" (section index 2).
  - "The verdict" (the six decisions) closes Choices.
- **Render:**
  ```bash
  QA_DEPS=/Users/sijo/ek_build/qa node tools/handovo/render.mjs http://localhost:4321/tools/handovo/case.html
  ```
  - Writes `work/handovo/NN(.webp|@2x)` and the `-base` stills for sections with animated layers.
  - Writes `tools/handovo/fx.json` (videos, draw, links with `cta`, stops, layers).
  - Prints `[name, height]` for every section.
- **After a render:** update `content.js` (Handovo `sections` heights, and fxOpts if positions moved).
  - If sections are added or moved, remap every effect index: videos, layers, draw, `travel.i`, links.
  - The pattern lives in a scratchpad script (`ho_remap.py`), which is not in the repo. It maps old index to
    new, keeps each section's alt text and rebuilds links from fx.json.
- **Text version:**
  ```bash
  python3 tools/handovo/reader.py <build>
  ```
- **Whiteboard:** pasted between `<!--board-->` and `<!--/board-->` from `boards.handovo_pen()` in
  `tools/casekit/boards.py`.
  - The decision whiteboard (the animated layers section) is separate and still in its earlier style.

### Carekin and Syntra: Figma exports plus "casekit" sections

- **Base sections:** `work/<slug>/NN.webp` are 2× exports from Figma.
  - Carekin file `s6WXmDrd36Frlkg1kVsvUg`, page "Carekin · Case Study (Final)" `121:2`.
- **Added sections (`k-*`):** live in `tools/casekit/`.
  - `content.py` holds the text and blocks, plus `CAREKIN_ORDER` (the chapter order) and `CHAPTERS`.
  - `design.py` holds each case's styles and block renderers: chapter, toc, dix, dcall, calls, jump, photo, wbx.
  - `boards.py` holds the whiteboards.
- **Build:**
  ```bash
  python3 tools/casekit/build.py html
  ```
  ```bash
  QA_DEPS=/Users/sijo/ek_build/qa node tools/casekit/render.mjs http://localhost:4321/ carekin syntra
  ```
  ```bash
  ONLY=carekin python3 tools/casekit/build.py site <build>
  ```
  Then the same last command with `ONLY=syntra`. Run one project at a time.
- **What the site step does:** inserts and orders the sections in `content.js`, remaps effect indices, and
  rebuilds `reader.html` and `index.html`.
  - Carekin follows `CAREKIN_ORDER`, and files left out of it are dropped. 03, the old walkthrough film,
    is out.
- **Carekin links:** `fxOpts.links` is rebuilt from `tools/casekit/links.json` (written by render.mjs).
  - Format: `[section, x, y, w, h, targetIndex, label, cta]`, where `cta` is the box of the link's own words.
  - Chapter labels read "Chapter N: Name".
- **Carekin design system:**
  - Colours: light #ECF5F2 with white cards, mint #DDEBE7, ink #161513.
  - Text: body 16px in #4C5450. Monospace only for section labels and table headers.
  - Brand: tide #0F3B38, teal #0F766E, mint #5EEAD4. Coral #FF8A6B is for changes only.

### Live phones (Carekin)

- `work/carekin/fx/live-*.webp` are 11 prototype states at 824×1834.
  - They are exported from the Figma page "Carekin UI · D2", from frames named `Live · <state>` (412×917).
  - To export: clone the frame, rescale it ×2, take `get_screenshot` at maxDimension 1834, then convert with
    Pillow.
- Tap points live in `content.js` (Carekin `seqs`), measured in 412×917 coordinates.
- The phone bezels in sections 02 and 06 are drawn into the base stills with Pillow.

### Reels

- `tools/reels/reel.html` and `record.mjs`: Carekin's scenes use the live screens.
  ```bash
  QA_DEPS=/Users/sijo/ek_build/qa node tools/reels/record.mjs http://localhost:4321/ carekin
  ```
- Encoding runs through `tools/handovo/frames2mp4.swift`. There is no ffmpeg on this Mac.

### Case motion (`case-fx.js`, `case-fx.css`)

- **Options** in `content.js` `fxOpts`:
  - reveal (now "none" everywhere), links, travel, layers, videos, draw, seqs.
  - `accent`, and `link`, the colour for link hover (Carekin #0F766E, Handovo #2F3BEA).
- **Link hover:** an underline draws in under the link's own words and an arrow slides in after them.
  - The link box is widened to hold the arrow, so the sweep doesn't flag it.
- **Motion rules:** `.claude/skills/site-motion/SKILL.md`.

## Figma

- **Carekin** (`s6WXmDrd36Frlkg1kVsvUg`):
  - Page "Carekin UI · D2" holds the variable collection "Carekin D2", 8 editable screens and the 11 Live frames.
  - Every phone on all six pages is a "D2 · …" clone of those screens.
  - The hero and feature images on the Final page are editable "UI hero" and "UI feature …" frames.
  - If a source screen changes, re-sync the clones: replace each "D2 · <name>" frame with a fresh clone.
- **Other files:** Illustrations `kVyQAfgi8UmGSHiuDAJwLa` (Figma AI images, model `gpt-image-2.5-sunburst`);
  Syntra `RFow6mVvYRDVcu5NrMgO7D`.
- **UI references** Sijo picked from are in `references/carekin-ui/` (git-ignored). He chose D2.

## Whiteboards (v221)

- **Layout:** `boards.pen_flow(data, project, concept, design)`.
  - Flow: Question → What I saw → Why? Why? Why? → Root cause → Concept → The design.
  - Ideas and "Not this" sit beside the flow, with Listening / Defining / Deciding brackets.
  - A loop reads "the design is the answered question".
  - The model for all of this is Sijo's hand-drawn thesis process sheet.
- **Look:** blue ink #2430C9 on white. Lines are hand strokes: seeded jitter, overshoot, some double passes,
  and an ink displacement filter.
  - Lettering: Architects Daughter (`fonts/architectsdaughter-400.ttf`, OFL licence in
    `fonts/OFL-ArchitectsDaughter.txt`), downloaded with Sijo's OK.
- **Syntra's three sketchbook pages** (affinity, match, retro) use `boards.pen_skin`.
- **Ekmaati** is not touched, as Sijo asked.

## Next idea: scroll sliders (not built yet)

- Sijo wants a scroll slider on all four cases. Options given:
  - **A. One glass rail:** a frosted capsule on the right edge, chapter ticks, a glass label on hover, fades
    out when idle.
  - **B. A slider per case:**
    - Carekin: the sky timeline, with dose dots for chapters.
    - Handovo: a blue rail with a lime marker and task chips.
    - Syntra: a rotating amber knob.
    - Ekmaati: a sindoor thread with clay beads.
  - **C. Recommended:** the glass rail with per-case colour tokens and marker shapes.
- Reference images: `references/sliders/glass-rail.png` and `per-case-sliders.png` (git-ignored; made with
  Figma AI in file `kVyQAfgi8UmGSHiuDAJwLa`).
- Rules for any of them:
  - Desktop only. No scroll hijacking.
  - Respect reduced motion, and make it keyboard reachable.
  - Chapter positions come from the `k-chN` or `.chap` sections.
- Waiting on Sijo to choose A, B or C.

## Still open

- Carekin's 49-second walkthrough film and the illustrated "Tuesday in three cities" frames still show the old
  UI. The film is no longer on the site. Both need a new recording or new drawings.
- Syntra has no chapter structure yet; Carekin and Handovo do.
- Handovo's decision whiteboard section (with animated layers) is not in the new pen style.
- The live Claude evaluation for Handovo is blocked until Sijo adds his own API key.
- Scratchpad helper scripts (screenshots, the Handovo remap) are temporary. Move them into `tools/` if they're
  needed again.
