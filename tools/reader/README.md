# Text versions of the case studies

Every case study exists twice on the site:

- **Layout**: the Figma documentation as images (`work/<slug>/NN.webp`, listed in `content.js`), with the project's motion layer.
- **Text**: the same content as real HTML (`work/<slug>/reader.html`), built from the Figma data by `build.py`.
  Phones open it by default; on desktop the **Text** button in the case-study bar switches to it.
  The same content is also a standalone page, `work/<slug>/index.html` (sijo.work/work/<slug>/): it works without
  JavaScript and WebGL, search engines read it, and it is the link to share for one project.

## Rebuilding after a Figma change

1. **Text and layout data** → `src/<slug>.json`. A read-only `use_figma` script walks each section frame and returns
   every visible node (type, box relative to the section, fill, stroke, name) and every text with its styled segments
   (characters, size, font, colour, case, link). Results are capped at 20 KB, so it runs about ten sections per call;
   `grab.py` copies each result out of the Claude Code session log by its marker (`RDR-<slug>-<n>`).
2. **Exports** (2×, kept outside the repo, `READER_EXP`): clone the sections onto a temporary page, rescale ×2,
   screenshot in chunks under 32,000 px, slice per section into `<slug>/desk-NN.png` and `<slug>/vis-NN.png`.
   - `desk`: as designed (Carekin's journey curve and both films' play buttons hidden, as on the site; Syntra = everything visible).
   - `vis`: the same with every text layer hidden, except text inside drawn pictures (phones, signs, the mark) and the
     La Mericana wordmarks. Text crops come from `desk`, photos and backgrounds from `vis`.
3. `python3 tools/reader/build.py [slug …]` writes the crops (`work/<slug>/m/`), `reader.html` and `index.html`.
   Check the result at phone width before publishing; fix misreadings in `projects.py` (`OVERRIDES`).

## How a section is read

Texts become headings, paragraphs, labels and quotes by size and style. Filled rectangles that hold text become
cards in their own colour. A header row of small labels over aligned rows becomes a table (cards on phones); aligned
rows without a header become a key-value list or a table. A big number with words under it becomes a statistic.
Photos, screens and drawn pictures are cropped; diagrams with words keep a readable size and scroll sideways on phones,
and open larger on a tap. Reading order is a recursive XY-cut, which reads side-by-side columns top to bottom when
each opens with a heading.
