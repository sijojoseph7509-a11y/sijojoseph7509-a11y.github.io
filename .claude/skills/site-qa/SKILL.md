---
name: site-qa
description: Automated bug check for Sijo's 3D portfolio site. Use after any change to main.js, os.js, index.html, styles.css, content.js or the models — and before every push — to catch load errors, broken models, stale-cache problems and broken desktop UI. Also use when the user reports a glitch on a device.
---

# Site QA

Runs 15 real-browser checks against the site with headless Google Chrome and prints ✅/❌ per check.

## Run it

1. Serve the repo locally (from the repo root): `python3 -m http.server 4321`
2. Install the one dependency into a scratch folder once: `npm i --prefix <scratch-dir> puppeteer-core@23`
3. Run: `QA_DEPS=<scratch-dir> node .claude/skills/site-qa/qa.mjs http://localhost:4321/`
   - Against the live site: pass `https://sijojoseph7509-a11y.github.io/` instead.
   - Exit code 1 = at least one check failed. Fix every ❌ before pushing.

## What it checks
- Desktop + phone load: real cat, football and headset present (`window.Desk.state()`), zero console errors / failed requests
- Every `?open=` deep link opens the right window
- Enter boots the laptop, rendering pauses behind the Mac desktop, Esc returns to the desk
- Every menu opens; ⌘K Spotlight → "blend" → Skills; ⌘5 → Contact; placeholder project cards are not links
- Window body scrolls on a phone; resizing while the desktop is open repaints the room
- Failure paths: a model that fails to download leaves no stand-in and no crash; an old cached `os.js` doesn't crash the new `main.js`
- Self-update: a newer `version.json` reloads the page exactly once (no loop)
- Legacy model paths still exist for old cached pages

## Also look at
- Read the console of the live site on a real phone if the user reports a device-specific glitch — the most common cause is a stale cached copy (see HANDOVER §19, self-update).
- For load-time numbers per network, see HANDOVER §18.
