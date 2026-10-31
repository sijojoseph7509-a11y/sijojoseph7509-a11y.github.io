---
name: site-motion
description: Motion rules for sijo.work, after ondocollective.jp. Use before adding, changing or reviewing any animation, transition, hover or scroll effect on the site or in a case study (case-fx.js, case-fx.css, styles.css, os.js), or when Sijo asks for motion "like a pro" or says something feels too much or too little.
---

# Motion on sijo.work

Reference: ondocollective.jp (studied in v206). Its motion feels expensive because it is **slow, eased and rare**: one diagonal
mask that fades content in, one text roll on buttons, image frames that tighten on hover, images that fade in as they load.
Nothing bounces, nothing loops, and nothing moves that you didn't just bring into view or point at.

## The rules

1. **One motion per moment.** A thing can reveal, or respond to hover, never both at once. Remove an old effect before adding a new one
   (v206 removed the button sheen when the text roll arrived).
2. **Ease out, never linear or bouncy, for reveals.** Tokens:
   - mask reveal `cubic-bezier(.33, 1, .68, 1)`, 1.4 s, starting about 40% revealed (Ondo uses 3.2 s from hidden on a hero; a long page that people jump through must never look empty)
   - text roll `cubic-bezier(.25, 1, .5, 1)`, 0.7 s
   - image frame / inset `cubic-bezier(.22, 1, .36, 1)`, 0.9 s
   - simple fades `ease`, 0.4–0.6 s
3. **Content is never hidden without JavaScript.** Start states apply only under a class JS adds (`.cfx-mask`, `.cfx-in`, `.roll`),
   so if a script fails the page is still readable. Add a timer backstop for anything that waits on an observer.
4. **Reveal once.** Sections animate the first time they are seen, then stay. Never re-hide on scroll up.
5. **The first screen never waits.** The first section of a case, and anything above the fold on load, is shown at once.
6. **Clean up expensive effects.** Masks, filters and blurs on tall layers cost paint: remove them when done (`.cfx-done`).
7. **Respect `prefers-reduced-motion`.** Every effect needs a reduced-motion rule that shows the end state with no transition.
8. **Don't hijack scrolling.** No smooth-scroll libraries; the Mac window's own scroll stays native.
9. **Accessibility.** Duplicated text for an effect carries `aria-hidden="true"`; focus-visible gets the same state as hover.

## What exists (v206)

| Effect | Where | Code |
|---|---|---|
| Diagonal mask reveal per section | Handovo, Carekin cases (`fxOpts.reveal: "mask"`) | case-fx.css `.cfx-mask`, case-fx.js |
| Text roll on hover | every `.btn` with a plain-text label | os.js `rollify`, styles.css `.roll` |
| Gradient bands (stepped contour gradient, slow drift) | **Not used** (Sijo removed them from Handovo in v208); available as `fxOpts.bands` (`fxOpts.bands`, section entry 4th field `"blue"`/`"dark"`) | case-fx.js WebGL; stills rendered transparent by render.mjs (`data-bands`); os.js paints the colour if the script can't run |
| Images fade in when loaded | work cards, About projects, Lab media | styles.css `img.in` |
| Syntra and Ekmaati keep their own motion | syntra-fx, ekmaati-fx | — |

Other reveal options in case-fx: `rise` (Sijo found it "lost the connection" on Carekin), `wipe` (Backwater, retired), `none`.

## Gradient bands rules
- Palettes stay deep enough for white text (lightest band tone ≥ 4.5:1 with white). Never lavender/pink tips behind text.
- ~30 fps, under device resolution, only while near the screen; one still frame under reduced motion.
- A band section's still must be transparent, and its content.js entry must carry the colour for the no-script fallback.

## Before shipping motion

1. Open the case locally (`python3 -m http.server 4321`) at 1440 × 900 and scroll the whole thing: nothing blank for more than a
   moment, films and overlays reveal with their section, no flash of black.
2. Fast-scroll test: jump to the bottom; every section must still end up fully visible.
3. Reduced motion: emulate it and check everything is visible with no animation.
4. Run site-qa, site-security, the sweep and copy-check as usual.
