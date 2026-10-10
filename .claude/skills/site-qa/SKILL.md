---
name: site-qa
description: Automated bug check for Sijo's 3D portfolio site. Use after any change to main.js, os.js, index.html, styles.css, content.js or the models — and before every push — to catch load errors, broken models, stale-cache problems and broken desktop UI. Also use when the user reports a glitch on a device.
---

# Site QA

Runs 35 real-browser checks against the site with headless Google Chrome and prints ✅/❌ per check.

## Run it (also run the site-security skill before pushing)

1. Serve the repo locally (from the repo root): `python3 -m http.server 4321`
2. Install the one dependency into a scratch folder once: `npm i --prefix <scratch-dir> puppeteer-core@23`
3. Run: `QA_DEPS=<scratch-dir> node .claude/skills/site-qa/qa.mjs http://localhost:4321/`
   - Against the live site: pass `https://sijo.work/` instead.
   - Exit code 1 = at least one check failed. Fix every ❌ before pushing.

## Live health check (run before and after every publish)
`bash .claude/skills/site-qa/health.sh` checks everything outside the code that can stop a recruiter from opening the
site: DNS (4 IPv4 + 4 IPv6 GitHub Pages addresses on GoDaddy's nameserver and 4 public resolvers; IPv6 is required for
Jio/Airtel-style IPv6-only networks), the www CNAME, HTTPS over IPv4 and IPv6, http→https and www→apex redirects,
certificate days left, domain registration days left, the live build and key files. Exit 1 = something is wrong.

## Bug sweep (layout on many devices)
`QA_DEPS=<scratch-dir> node .claude/skills/site-qa/sweep.mjs http://localhost:4321/ <out-dir>`
Opens the site on 18 sizes (phones, tablets, laptops up to 4K/ultrawide) and every case study and flags: controls off-screen or overlapping, cut-off text, sideways scrolling,
missing models, a missing/broken Mac wallpaper, errors. It saves screenshots (welcome, desk, Mac, wallpaper) for every
device — **look at them**: the automated checks can't judge whether something looks right (e.g. a face cropped out).

## What it checks
- Desktop + phone load: real cat and football present (`window.Desk.state()`), zero console errors / failed requests
- Every `?open=` deep link opens the right window
- Shea walks in, jumps onto the desk, wanders and settles (`Desk.state().catBusy`; position checks wait for it)
- Enter boots the laptop, rendering pauses behind the Mac desktop, Esc returns to the desk
- Every menu opens; ⌘K Spotlight → "blend" → Skills; ⌘5 → Contact; placeholder project cards are not links
- Window body scrolls on a phone; resizing while the desktop is open repaints the room
- Failure paths: a model that fails to download leaves no stand-in and no crash; an old cached `os.js` doesn't crash the new `main.js`
- Self-update: a newer `version.json` reloads the page exactly once (no loop)
- Legacy model paths still exist for old cached pages
- Welcome screen: Enter starts the music + shows the laptop pointer; "Enter without sound" stays silent
- Opening the laptop hides the pointer for good; the hint returns after closing the Mac
- Back button / phone back-swipe closes the Mac without leaving the site; reopening the tab starts at the desk
- Touch: a tap's label/lift clears itself; dock + menu-bar clock fit at 320, 360 and 430 px; welcome card fits in landscape

Not covered (needs a real iPhone): iOS silent-switch audio, Safari toolbar overlap, low-memory GPU crashes — check those by hand on a phone.

## Also look at
- Read the console of the live site on a real phone if the user reports a device-specific glitch — the most common cause is a stale cached copy (see HANDOVER §19, self-update).
- For load-time numbers per network, see HANDOVER §18.
