---
name: copy-check
description: Proofread portfolio copy for leftover notes ("Note for Sijo", TODO, "to verify", bracketed instructions), placeholders, AI-style writing (em dashes, "seamless", "elevate", "not just X but Y"), stray symbols/emoji and typos — in the website (content.js, os.js, index.html) and in Figma case studies before they are exported. Use whenever text is added or changed, before publishing a case study, or when the user asks to remove notes, AI mistakes or symbols.
---

# Copy check

Goal: everything a recruiter reads looks finished and sounds like Sijo, without inventing anything.

## 1. Website text
```bash
node .claude/skills/copy-check/check.mjs              # content.js, os.js, index.html
node .claude/skills/copy-check/check.mjs some.txt     # any text file
```
Fix every hit, then re-run until it prints "✅ copy is clean".

## 2. Figma case studies (before exporting to the site)
Work on a **copy page** ("Case Study v2 · Web"), never the original. In `use_figma`, collect every TEXT node's
`characters` under the case-study wrapper and test them with the same patterns as `check.mjs` (notes, `to verify`,
`(Add …)`, em dashes, AI words, emoji). Then:
- **Delete** notes-to-self (`Note for Sijo …`, the whole `11 Notes` section) and `12 Next project` (the site has its own navigation).
- **Rewrite** captions that read like to-dos into finished statements — but only with facts you can back up.
  If a value says "to verify", *measure it* (e.g. contrast ratios via the WCAG formula from the actual colours) rather than deleting the cell.
- **Fix** genuine mistakes: empty table headers, missing punctuation, split labels.
Then export with `get_screenshot` (wrapper node, `maxDimension` ≥ height) and slice per section (see HANDOVER §13.1).

## Keep (not mistakes)
- En dashes in ranges: `2020–21`, `15–20 m`. Arrows that mean "maps to" (`→ indigo-700`) or are part of a sign design.
- `✓`, emoji and informal text **inside UI or chat mockups** — they're part of the product being shown.

## Never
- Turn a concept into a real project: keep "Concept project", "targets, not results", "Illustrative photo" labels.
- Invent research, quotes, numbers or results to replace a removed note. Prefer neutral wording ("Working insights") over claims.
