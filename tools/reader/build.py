# Builds the text version of every case study from the Figma data (tools/reader/src/<slug>.json) and the 2× Figma exports.
#
#   python3 tools/reader/build.py [slug ...]
#
# For each project it writes
#   work/<slug>/m/*.webp       image crops (photos, screens, diagrams) cut out of the Figma exports
#   work/<slug>/reader.html    the case study as real HTML (headings, paragraphs, tables, cards, figures); os.js shows it
#                              on phones and behind the "Text" button on desktop
#   work/<slug>/index.html     the same content as a standalone page (sijo.work/work/<slug>/): readable without JavaScript,
#                              indexable, shareable
# The exports (desk = the Figma layout as designed, vis = the same with the text layers hidden) live outside the repo;
# EXP below points at them. Re-export from Figma with the scripts in tools/reader/README.md when a case study changes.
import json, os, re, sys, html, math
from PIL import Image

Image.MAX_IMAGE_PIXELS = None
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SRC = os.path.join(ROOT, 'tools', 'reader', 'src')
EXP = os.environ.get('READER_EXP', '/private/tmp/claude-501/-Users-sijo-Documents-Design-Portfolio/51335f43-eaab-4ba4-a5bd-8ab1f21921bc/scratchpad/exp')
sys.path.insert(0, os.path.dirname(__file__))
from projects import PROJECTS, OVERRIDES  # per-project settings and per-section corrections

esc = lambda s: html.escape(s, quote=True)
try: VERSION = json.load(open(os.path.join(ROOT, 'version.json')))['build']
except Exception: VERSION = 'dev'

# ───────────── colour helpers ─────────────
def hx(c):
    c = c.lstrip('#'); return tuple(int(c[i:i + 2], 16) / 255 for i in (0, 2, 4))
def tohex(t): return '#' + ''.join('%02x' % max(0, min(255, round(v * 255))) for v in t)
def lum(t):
    f = lambda v: v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4
    r, g, b = (f(v) for v in t); return 0.2126 * r + 0.7152 * g + 0.0722 * b
def cr(a, b):
    x, y = lum(a), lum(b); return (max(x, y) + 0.05) / (min(x, y) + 0.05)
def mix(a, b, t): return tuple(a[i] + (b[i] - a[i]) * t for i in range(3))
def paint_rgb(f, bg):
    """A Figma paint from the dump → an RGB tuple as seen on bg (alpha flattened)."""
    if not f: return None
    if isinstance(f, str):
        return hx(f) if f.startswith('#') else None
    if isinstance(f, list):  # [hex, opacity]
        return mix(bg, hx(f[0]), f[1])
    if isinstance(f, dict) and 'g' in f:  # gradient: the stop that reads best on bg
        stops = [mix(bg, hx(c), a) for c, a in f['g']]
        return max(stops, key=lambda s: cr(s, bg))
    return None
def readable(fg, bg, size):
    need = 3.0 if size >= 24 else 4.5
    if cr(fg, bg) >= need: return fg
    target = (0, 0, 0) if lum(bg) > 0.35 else (1, 1, 1)
    for k in range(1, 21):
        c = mix(fg, target, k / 20)
        if cr(c, bg) >= need: return c
    return target

# ───────────── geometry ─────────────
def inside(a, b, pad=0):   # a's centre inside b
    cx, cy = a['x'] + a['w'] / 2, a['y'] + a['h'] / 2
    return b['x'] - pad <= cx <= b['x'] + b['w'] + pad and b['y'] - pad <= cy <= b['y'] + b['h'] + pad
def contains(b, a, pad=2):  # a fully inside b
    return a['x'] >= b['x'] - pad and a['y'] >= b['y'] - pad and a['x'] + a['w'] <= b['x'] + b['w'] + pad and a['y'] + a['h'] <= b['y'] + b['h'] + pad
def overlap(a, b):
    return a['x'] < b['x'] + b['w'] and b['x'] < a['x'] + a['w'] and a['y'] < b['y'] + b['h'] and b['y'] < a['y'] + a['h']
def union(items):
    x0 = min(i['x'] for i in items); y0 = min(i['y'] for i in items)
    x1 = max(i['x'] + i['w'] for i in items); y1 = max(i['y'] + i['h'] for i in items)
    return {'x': x0, 'y': y0, 'w': x1 - x0, 'h': y1 - y0}

def in_panel(p, t):
    return inside(t, p) and t['x'] >= p['x'] - 4 and t['y'] >= p['y'] - 4 and t['y'] + t['h'] <= p['y'] + p['h'] + 6

def text_of(n): return ''.join(s[0] for s in n['s'])
def main_seg(n): return max(n['s'], key=lambda s: len(s[0].strip()))
def tsize(n): return main_seg(n)[1]
def tfam(n): return main_seg(n)[2].split('|')[0]
def is_label(n):
    seg = main_seg(n); fam, sty = seg[2].split('|')
    t = text_of(n).strip()
    if re.search(r'www\.|https?:|\.com', t): return False
    return tsize(n) <= 16 and len(t) <= 64 and (len(seg) > 4 and seg[4] == 'U' or 'Code' in fam or (t.isupper() and len(t) > 2 and fam != 'Courier Prime'))

DECOR_NAME = re.compile(r'contour|cloud|blob|grain|noise|shade|dashed path|thread|fade|overlay|^play|play icon', re.I)

# ───────────── flatten the Figma tree into items ─────────────
def flatten(nodes, sec_h, out, depth=0):
    for n in nodes:
        it = dict(n); it.pop('c', None)
        # clip to the section
        y0, y1 = max(0, n['y']), min(sec_h, n['y'] + n['h']); x0, x1 = max(0, n['x']), min(1440, n['x'] + n['w'])
        if y1 <= y0 or x1 <= x0: continue
        it.update(x=x0, y=y0, w=x1 - x0, h=y1 - y0, ox=n['x'], oy=n['y'], ow=n['w'], oh=n['h'], depth=depth)
        k = n['k']
        if k == 'T':
            if not text_of(n).strip(): continue
            it['kind'] = 'text'
        elif 'z' in n:
            it['kind'] = 'img' if n['z'][1] > 0 else 'vis'
        elif n.get('f') == 'IMG':
            it['kind'] = 'img'
        else:
            it['kind'] = 'shape'
        out.append(it)
        if 'c' in n and 'z' not in n:
            flatten(n['c'], sec_h, out, depth + 1)
    return out

# ───────────── per-section layout ─────────────
class Sec:
    def __init__(self, P, s, ov):
        self.P, self.s, self.ov = P, s, ov
        self.i, self.h = s['i'], s['h']
        f = s.get('f')
        self.bg = paint_rgb(f, (1, 1, 1)) or (1, 1, 1)
        self.items = flatten(s['c'], self.h, [])
        self.blocks = []

def classify(S):
    ov, P = S.ov, S.P
    items = [i for i in S.items]
    sec_area = 1440 * S.h
    for it in items:
        it['role'] = None
        n = it.get('n') or ''
        if re.match(r'play\b|play icon', n, re.I): it['role'] = 'decor'; continue
        if it['kind'] == 'shape':
            if it.get('bl') or DECOR_NAME.search(n): it['role'] = 'decor'
            elif not it.get('f') and it.get('sk') and (it['w'] > 700 or it['h'] > 700): it['role'] = 'decor'   # dashed story paths, big process curves
            elif isinstance(it.get('f'), dict): it['role'] = 'decor'                                             # gradient fades and overlays
            elif it['k'] in ('V', 'L') and not it.get('f'): it['role'] = 'decor'                                  # connectors and arrows
            elif it['k'] == 'E' and not it.get('f') and it['w'] < 300: it['role'] = 'decor'                       # rings around dots
        elif it['kind'] == 'vis':
            if DECOR_NAME.search(n) and it['w'] >= 1000: it['role'] = 'decor'
        elif it['kind'] == 'img' and DECOR_NAME.search(n) and it['w'] >= 1000 and it['h'] >= 500 and 'photo' not in n.lower():
            it['role'] = 'decor'
    # overrides: regions that are figures (cropped as an image, text included) or dropped
    for r in ov.get('drop', []):
        for it in items:
            if inside(it, r): it['role'] = 'decor'
    figs = []
    for r in ov.get('figure', []):
        src = r.get('src', 'desk')
        fg = {'kind': 'figure', 'x': r['x'], 'y': r['y'], 'w': r['w'], 'h': r['h'], 'src': src, 'zoom': r.get('zoom', True), 'members': [], 'alt': r.get('alt')}
        for it in items:
            if it['role'] is None and inside(it, fg):
                if it['kind'] == 'text' and r.get('absorb') is False and 'La Mericana' not in main_seg(it)[2]: continue
                it['role'] = 'fig'; fg['members'].append(it)
        figs.append(fg)
    live = [i for i in items if i['role'] is None]
    texts = [i for i in live if i['kind'] == 'text']
    # La Mericana wordmarks are drawn into the pictures; keep them out of the HTML
    for t in texts:
        if 'La Mericana' in main_seg(t)[2] and not ov.get('mericana_text'): t['role'] = 'decor'
    texts = [t for t in texts if t['role'] is None]
    # background photos: a large photo with text on top
    for it in live:
        if it['kind'] == 'img' and it['role'] is None and it['w'] >= 900 and it['h'] >= 380:
            on = [t for t in texts if t['role'] is None and contains(it, t, 4)]
            if on and not ov.get('no_bgphoto'):
                it['role'] = 'bgphoto'
    for it in live:
        if it['role'] is None and it['kind'] in ('img', 'vis'):
            if any(ph is not it and ph['role'] == 'bgphoto' and contains(ph, it, 2) for ph in live): it['role'] = 'decor'
    for sh in live:
        if sh['role'] is None and sh['kind'] == 'shape' and sh.get('f') and not isinstance(sh.get('f'), dict) and sh['w'] >= 120 and sh['h'] >= 120:
            inner = [v for v in live if v['role'] is None and v['kind'] == 'vis' and contains(sh, v, 2)]
            if inner:
                fg = dict(kind='figure', src='desk', zoom=True, members=[sh], alt=None, **{k: sh[k] for k in 'xywh'})
                sh['role'] = 'fig'
                for v in live:
                    if v['role'] is None and v is not sh and contains(sh, v, 3): v['role'] = 'fig'; fg['members'].append(v)
                figs.append(fg)
    # pictures: images and drawn visuals (screens, maps, signs, marks)
    for it in live:
        if it['role'] is None and it['kind'] in ('img', 'vis'):
            fg = {'kind': 'figure', 'x': it['x'], 'y': it['y'], 'w': it['w'], 'h': it['h'], 'members': [it], 'alt': None,
                  'src': 'vis' if it['kind'] == 'img' else 'desk', 'zoom': it['kind'] == 'vis' or (it.get('z') or [0])[0] > 0, 'name': it.get('n', '')}
            it['role'] = 'fig'
            if it['kind'] == 'vis':   # labels drawn around a diagram belong to it
                box = {'x': it['x'] - 70, 'y': it['y'] - 70, 'w': it['w'] + 140, 'h': it['h'] + 140}
                for t in texts:
                    if t['role'] is None and inside(t, box) and (inside(t, it, 4) or (tsize(t) <= 22 and len(text_of(t)) <= 48)):
                        t['role'] = 'fig'; fg['members'].append(t)
                fg.update(union(fg['members']))
                fg['src'] = 'desk'
            else:
                over = [t for t in texts if t['role'] is None and inside(t, it)]
                if over and ov.get('img_text') == 'keep':
                    for t in over: t['role'] = 'fig'; fg['members'].append(t)
                    fg['src'] = 'desk'
            figs.append(fg)
    # drawn diagrams made of plain shapes (wireframes, swatches with no words): crop them with their labels
    shapes = [i for i in live if i['role'] is None and i['kind'] == 'shape' and not isinstance(i.get('f'), dict)
              and (i.get('f') or (i.get('sk') and i['k'] in ('R', 'F') and i['w'] >= 120 and i['h'] >= 60))]
    panels = []
    for sh in shapes:
        has_text = [t for t in texts if t['role'] is None and in_panel(sh, t)]
        if has_text and sh['w'] >= 60 and sh['h'] >= 24:
            sh['role'] = 'panel'; panels.append(sh)
    loose = [s for s in shapes if s['role'] is None]
    # cluster loose shapes
    clusters = []
    for sh in sorted(loose, key=lambda s: (s['y'], s['x'])):
        placed = False
        for c in clusters:
            b = union(c)
            if sh['x'] < b['x'] + b['w'] + 40 and b['x'] < sh['x'] + sh['w'] + 40 and sh['y'] < b['y'] + b['h'] + 40 and b['y'] < sh['y'] + sh['h'] + 40:
                c.append(sh); placed = True; break
        if not placed: clusters.append([sh])
    for c in clusters:
        b = union(c)
        if len(c) >= 3 and b['w'] >= 150 and b['h'] >= 60:
            fg = dict(kind='figure', src='desk', zoom=True, members=list(c), alt=None, **b)
            box = {'x': b['x'] - 30, 'y': b['y'] - 30, 'w': b['w'] + 60, 'h': b['h'] + 60}
            for t in texts:
                if t['role'] is None and inside(t, box) and tsize(t) <= 20: t['role'] = 'fig'; fg['members'].append(t)
            for p in panels:
                if p['role'] == 'panel' and inside(p, box): p['role'] = 'fig'; fg['members'].append(p)
            fg.update(union(fg['members']))
            for s_ in c: s_['role'] = 'fig'
            figs.append(fg)
        else:
            for s_ in c: s_['role'] = 'decor'
    for p in panels:
        if p['role'] == 'panel' and any(i['kind'] == 'img' and i['role'] in (None, 'fig') and contains(p, i, 2) for i in items):
            p['role'] = 'decor'
    # panels that hold a button, chip or tablet photo are UI drawings: crop them
    for p in panels:
        if p['role'] != 'panel': continue
        inner = [s for s in items if s is not p and s['kind'] == 'shape' and contains(p, s, 1) and re.search(r'button|chip|tablet|phone|screen|badge|arrow', s.get('n', ''), re.I)]
        if inner or re.search(r'phone|screen|board|specimen|blade|wireframe', p.get('n', ''), re.I):
            fg = dict(kind='figure', src='desk', zoom=True, members=[p], alt=None, **{k: p[k] for k in 'xywh'})
            p['role'] = 'fig'
            for t in texts:
                if t['role'] is None and inside(t, p): t['role'] = 'fig'; fg['members'].append(t)
            for s in items:
                if s['role'] in (None, 'panel') and s is not p and inside(s, p): s['role'] = 'fig'
            figs.append(fg)
    S.figs = figs
    S.panels = [p for p in panels if p['role'] == 'panel']
    S.bgphotos = [i for i in live if i['role'] == 'bgphoto']
    S.texts = [t for t in texts if t['role'] is None]
    S.overlays = [i for i in items if i['kind'] == 'shape' and isinstance(i.get('f'), dict)]

# ───────────── blocks ─────────────
def style_key(t):
    seg = main_seg(t); return (round(seg[1]), seg[2], json.dumps(seg[3]))

def find_grids(texts):
    rows = []
    for t in sorted(texts, key=lambda t: (t['y'], t['x'])):
        if rows and abs(t['y'] - rows[-1][0]) <= 22: rows[-1][1].append(t)
        else: rows.append([t['y'], [t]])
    rows = [sorted(r[1], key=lambda t: t['x']) for r in rows]
    is_arrow = lambda t: text_of(t).strip() in ('→', '->', '←')
    grids, k = [], 0
    while k < len(rows):
        r0 = rows[k]
        if len(r0) < 2: k += 1; continue
        cols = [t['x'] for t in r0 if not is_arrow(t)]
        run = [r0]; j = k + 1
        while j < len(rows):
            r = rows[j]
            prev_bottom = max(t['y'] + t['h'] for t in run[-1])
            if r[0]['y'] - prev_bottom > 120: break
            if len(r) < 2 or abs(r[0]['x'] - cols[0]) > 14 or not all(is_arrow(t) or any(abs(t['x'] - c) <= 14 for c in cols) for t in r): break
            run.append(r); j += 1
        body = run
        head = None
        if len(run) >= 2 and all(len(text_of(t).strip()) <= 24 for t in run[0]) and any(len(text_of(t).strip()) > 40 for r in run[1:] for t in r):
            head, body = run[0], run[1:]
        differ = sum(1 for r in body if len({style_key(t) for t in r}) > 1)
        if any(is_numeral(t) for r in body for t in r[1:]): differ = 0   # two numbered lists side by side, not a table
        if len(body) >= (2 if head else 3) and differ * 2 >= len(body):
            arrows = [t for r in run for t in r if text_of(t).strip() in ('→', '->', '←')]
            keep = [c for c in cols if not any(abs(a['x'] - c) <= 14 for a in arrows)]
            def cell_rows(rs):
                out = []
                for r in rs:
                    row = [None] * len(keep)
                    for t in r:
                        if t in arrows: continue
                        ci = next((i for i, c in enumerate(keep) if abs(t['x'] - c) <= 14), None)
                        if ci is not None: row[ci] = t
                    out.append(row)
                return out
            allc = [t for r in run for t in r]
            g = dict(kind='grid', head=[t for t in head if t not in arrows] if head else None, rows=cell_rows(body), drop=arrows, **union(allc))
            grids.append(g); k = j
        else:
            k += 1
    return grids

def build_blocks(S, region, texts, figs, panels, photos):
    """Order the content inside one container (the section, a panel or a photo panel) into blocks."""
    blocks = []
    T = sorted(texts, key=lambda t: (t['y'], t['x']))
    used = set()
    # captions under pictures
    for fg in figs:
        cap = []
        bottom = fg['y'] + fg['h']
        for t in T:
            if id(t) in used: continue
            partner = any(u is not t and abs(u['y'] - t['y']) <= 22 and abs(u['x'] - t['x']) > 40 and not (u['y'] >= fg['y'] + fg['h'] - 4 and u['x'] >= fg['x'] - 14 and u['x'] + min(u['w'], 400) <= fg['x'] + fg['w'] + 40 and not cap) for u in T)
            if partner: break
            if t['y'] >= bottom - 4 and t['y'] - bottom <= 44 and t['x'] >= fg['x'] - 14 and t['x'] + min(t['w'], 400) <= fg['x'] + fg['w'] + 40 and tsize(t) <= 24:
                cap.append(t); used.add(id(t)); bottom = t['y'] + t['h']
            elif cap and t['y'] > bottom + 44: break
        fg['caption'] = cap
    # tables: a header row of small labels, then aligned rows
    rest = [t for t in T if id(t) not in used]
    heads = {}
    for t in rest:
        if is_label(t): heads.setdefault(round(t['y'] / 6), []).append(t)
    for key in (sorted(heads) if not S.ov.get('no_table') else []):
        hdr = sorted([t for t in heads[key] if id(t) not in used], key=lambda t: t['x'])
        if len(hdr) < 2: continue
        if len({text_of(t).strip().lower() for t in hdr}) < len(hdr): continue
        topped = sum(1 for h in hdr if any(abs(u['x'] - h['x']) <= 14 and 0 <= h['y'] - (u['y'] + u['h']) <= 30 for u in rest if u is not h and not is_label(u)))
        if topped * 2 > len(hdr): continue   # each 'header' sits under its own title: cards, not a table
        cols = [t['x'] for t in hdr]
        hy = max(t['y'] + t['h'] for t in hdr)
        heads_row = list(hdr)
        # a first column without a header (row names)
        lead = [t for t in rest if id(t) not in used and t['y'] > hy - 2 and t['x'] < cols[0] - 40 and t['y'] - hy < 400]
        if lead:
            groups = {}
            for t in lead: groups.setdefault(round(t['x'] / 14), []).append(t)
            best = max(groups.values(), key=len)
            if len(best) >= 2:
                cols = [min(t['x'] for t in best)] + cols; heads_row = [None] + heads_row
        def col_of(x):
            for k, cx in enumerate(cols):
                if abs(x - cx) <= 14: return k
            return None
        cand = [t for t in rest if id(t) not in used and t['y'] > hy - 2 and col_of(t['x']) is not None and t not in hdr]
        rows, last = [], hy
        col0w = (cols[1] - cols[0]) if len(cols) > 1 else 300
        stop = min([u['y'] for u in rest if id(u) not in used and u['y'] > hy + 10 and (u['w'] > col0w * 1.6 and col_of(u['x']) == 0 or (is_label(u) and col_of(u['x']) is not None))] + [10 ** 6])
        for t in sorted(cand, key=lambda t: (t['y'], t['x'])):
            if t['y'] >= stop - 2: break
            if t['y'] - last > 110 and rows: break
            if rows and abs(t['y'] - rows[-1][0]) <= 8: rows[-1][1].append(t)
            else: rows.append([t['y'], [t]])
            last = max(last, t['y'] + t['h'])
        # a lone line right under a cell continues that cell (a name and its gloss)
        merged = []
        for y, cells in rows:
            if merged and len(cells) == 1:
                c = cells[0]; k = col_of(c['x'])
                prev = [p for p in merged[-1][1] if col_of(p['x']) == k]
                if prev and 0 <= c['y'] - (prev[-1]['y'] + prev[-1]['h']) <= 16:
                    merged[-1][1].append(c); continue
            merged.append([y, cells])
        rows = [r for r in merged if len({col_of(c['x']) for c in r[1]}) >= 2 and col_of(min(r[1], key=lambda t: t['x'])['x']) == 0]
        if not rows: continue
        for t in hdr: used.add(id(t))
        trs = []
        for _, cells in rows:
            row = [None] * len(cols)
            for c in sorted(cells, key=lambda c: c['y']):
                k = col_of(c['x']); used.add(id(c))
                row[k] = (row[k] or []) + [c]
            trs.append(row)
        b = union(hdr + [c for r in trs for cl in r if cl for c in cl])
        blocks.append(dict(kind='table', head=heads_row, rows=trs, **b))
    # stats: a big short number with its words underneath
    rest = [t for t in T if id(t) not in used]
    stats = []
    for t in rest:
        tx = text_of(t).strip()
        if tsize(t) >= 56 and len(tx) <= 14 and re.search(r'[\d%<>~]', tx) and id(t) not in used and not is_numeral(t):
            cap = [u for u in rest if id(u) not in used and u is not t and abs(u['x'] - t['x']) <= 16 and 0 <= u['y'] - (t['y'] + t['h']) <= 70 and tsize(u) <= 24]
            cap = sorted(cap, key=lambda u: u['y'])[:2]
            if not cap: continue
            used.add(id(t)); [used.add(id(u)) for u in cap]
            stats.append(dict(kind='stat', num=t, cap=cap, **union([t] + cap)))
    # group stats sitting in one row
    stats.sort(key=lambda s: (s['y'], s['x']))
    while stats:
        row = [stats.pop(0)]
        while stats and abs(stats[0]['y'] - row[0]['y']) <= 60: row.append(stats.pop(0))
        blocks.append(dict(kind='stats', items=sorted(row, key=lambda s: s['x']), **union(row)))
    # aligned lists without a header row (pin maps, numbered steps, "we saw → we changed")
    rest = sorted([t for t in T if id(t) not in used], key=lambda t: (t['y'], t['x']))
    for g in find_grids(rest):
        for row in g['rows']:
            for c in row:
                if c is not None: used.add(id(c))
        for c in g.get('head') or []: used.add(id(c))
        for c in g.get('drop', []): used.add(id(c))
        blocks.append(g)
    # stacks: texts that read as one column
    rest = sorted([t for t in T if id(t) not in used], key=lambda t: (t['y'], t['x']))
    stacks = []
    for t in rest:
        best = None
        for st in stacks:
            last = st[-1]
            gap = t['y'] - (last['y'] + last['h'])
            dx = t['x'] - last['x']
            same_col = abs(dx) <= 12 or (0 < dx <= 40 and tsize(last) >= 18 and tsize(t) <= tsize(last)) or \
                (t.get('a') == 'C' and last.get('a') == 'C' and abs((t['x'] + t['w'] / 2) - (last['x'] + last['w'] / 2)) <= 24)
            limit = max(48, 1.6 * tsize(t))
            if tsize(t) <= 16 and len(text_of(t)) <= 48 and text_of(last).strip()[:1] in '“"‘\'': limit = max(limit, 100)   # a quote's attribution
            if same_col and -4 <= gap <= limit and not is_numeral(t):
                best = st; break
        if best is not None: best.append(t)
        else: stacks.append([t])
    # a big step number belongs to the words beside it
    for st in list(stacks):
        if len(st) == 1 and is_numeral(st[0]):
            n = st[0]
            tgt = next((o for o in stacks if o is not st and 0 < o[0]['x'] - n['x'] <= 260 and n['y'] - 12 <= o[0]['y'] <= n['y'] + n['h']), None)
            if tgt is None:
                tgt = next((o for o in stacks if o is not st and abs(o[0]['x'] - n['x']) <= 12 and 0 <= o[0]['y'] - (n['y'] + n['h']) <= 60), None)
            if tgt is not None:
                tgt.insert(0, n); stacks.remove(st)
    for st in stacks:
        blocks.append(dict(kind='stack', items=st, **union(st)))
    for fg in figs:
        blocks.append(dict(kind='fig', fig=fg, **union([fg] + fg['caption'])))
    for p in panels:
        blocks.append(dict(kind='panel', panel=p, x=p['x'], y=p['y'], w=p['w'], h=p['h']))
    for ph in photos:
        blocks.append(dict(kind='photo', photo=ph, x=ph['x'], y=ph['y'], w=ph['w'], h=ph['h']))
    return order(blocks)

def split(blocks, axis):
    a, d = ('y', 'h') if axis == 'y' else ('x', 'w')
    bs = sorted(blocks, key=lambda b: b[a]); groups = [[bs[0]]]; edge = bs[0][a] + bs[0][d]
    for b in bs[1:]:
        if b[a] >= edge - 2: groups.append([b])
        else: groups[-1].append(b)
        edge = max(edge, b[a] + b[d]) if b[a] < edge - 2 else b[a] + b[d]
    return groups

def heads_column(g):
    top = min(g, key=lambda b: b['y'])
    if top['kind'] != 'stack': return False
    t = top['items'][0]
    return len(text_of(t).strip()) <= 32 and not is_numeral(t)

def xycut(blocks):
    if len(blocks) <= 1: return blocks
    xs = split(blocks, 'x')
    if len(xs) > 1 and all(len(g) >= 3 for g in xs) and all(heads_column(g) for g in xs):
        return [b for g in xs for b in xycut(g)]
    ys = split(blocks, 'y')
    if len(ys) > 1:
        out, i = [], 0
        while i < len(ys):
            j, best = i, None
            while j + 1 < len(ys):     # bands that share the same columns: read each column top to bottom when it opens with a heading
                cols = split([b for g in ys[i:j + 2] for b in g], 'x')
                if len(cols) < 2: break
                j += 1
                if all(len(g) >= 3 for g in cols) and all(heads_column(g) for g in cols): best = (j, cols)
            if best:
                out += [b for g in best[1] for b in xycut(g)]; i = best[0] + 1
            else:
                out += xycut(ys[i]); i += 1
        return out
    if len(xs) > 1: return [b for g in xs for b in xycut(g)]
    return sorted(blocks, key=lambda b: (b['y'], b['x']))

def order(blocks):
    out = xycut(blocks) if blocks else []
    # neighbouring pictures in one row become a gallery
    res = []
    for b in out:
        last = res[-1] if res else None
        band = last and min(b['y'] + b['h'], last['y'] + last['h']) - max(b['y'], last['y']) >= 0.5 * min(b['h'], last['h'])
        if b['kind'] == 'fig' and last and last['kind'] in ('fig', 'gallery') and (abs(b['y'] - last['y']) <= 60 or band) and b['w'] < 1100:
            prev = res.pop()
            g = prev if prev['kind'] == 'gallery' else dict(kind='gallery', items=[prev], **{k: prev[k] for k in 'xywh'})
            g['items'].append(b); g.update(union([g, b])); res.append(g)
        else:
            res.append(b)
    return res

# ───────────── HTML ─────────────
WEIGHT = {'Thin': 100, 'ExtraLight': 200, 'Light': 300, 'Regular': 400, 'Medium': 500, 'SemiBold': 600, 'Semi Bold': 600, 'Bold': 700, 'ExtraBold': 800, 'Black': 900}
FAM = {'Google Sans Flex': 'sans', 'Google Sans Code': 'mono', 'Mona Sans': 'sans', 'Rozha One': 'disp', 'Courier Prime': 'type', 'Lato': 'sans',
       'Noto Sans Malayalam': 'ml', 'Anek Devanagari': 'dev', 'La Mericana': 'word', 'Inter': 'sans'}

def is_numeral(t):
    tx = text_of(t).strip()
    return bool(re.fullmatch(r'0\d', tx)) and tsize(t) >= 36

def size_class(px):
    return 'x1' if px >= 120 else 'x2' if px >= 72 else 'x3' if px >= 44 else 'x4' if px >= 28 else 'x5' if px >= 20 else 'b' if px >= 17 else 'p' if px >= 15 else 's'

class Ctx:
    def __init__(self, bg, fg): self.bg, self.fg = bg, fg

def seg_html(seg, ctx, base_color, size, proj):
    t, px, font, paint = seg[0], seg[1], seg[2], seg[3]
    fam, sty = font.split('|')
    w = next((v for k, v in sorted(WEIGHT.items(), key=lambda kv: -len(kv[0])) if k in sty), 400)
    if fam == 'Lato' and w == 500: w = 700
    it = 'Italic' in sty
    col = paint_rgb(paint, ctx.bg)
    style = []
    if col is not None:
        col = readable(col, ctx.bg, px)
        if tohex(col) != base_color: style.append('color:' + tohex(col))
    style.append(f'font-weight:{w}')
    if it: style.append('font-style:italic')
    cls = FAM.get(fam, 'sans')
    s = esc(t).replace(' ', '\n').replace('\n', '<br>')
    upper = len(seg) > 4 and seg[4] == 'U'
    inner = f'<span class="f-{cls}{" up" if upper else ""}" style="{";".join(style)}">{s}</span>'
    link = next((x['u'] for x in seg[4:] if isinstance(x, dict) and 'u' in x), None)
    if link: inner = f'<a href="{esc(link)}" target="_blank" rel="noopener">{inner}</a>'
    return inner

def text_html(t, ctx, proj, first_heading):
    seg = main_seg(t); px = seg[1]
    base = paint_rgb(seg[3], ctx.bg) or ctx.fg
    base = readable(base, ctx.bg, px)
    txt = text_of(t).strip()
    label = is_label(t)
    cls = 'l' if label else 'kn' if is_numeral(t) else size_class(px)
    if cls == 'kn': tag = 'p'
    elif not label and txt[:1] in '“"\'‘' and px >= 17 and len(txt) > 12: tag = 'blockquote'
    elif label: tag = 'p'
    elif px >= 28: tag = 'h2' if first_heading[0] else 'h3'
    elif px >= 20: tag = 'h3'
    else: tag = 'p'
    if tag in ('h2', 'h3') and first_heading[0]: first_heading[0] = False
    align = ' c' if t.get('a') == 'C' and len(txt) <= 160 else ''
    segs = [s for s in t['s'] if s[0]]
    # trim the trailing newlines and spaces Figma keeps
    if segs: segs[-1] = [segs[-1][0].rstrip()] + segs[-1][1:]
    inner = ''.join(seg_html(s, ctx, tohex(base), s[1], proj) for s in segs)
    return f'<{tag} class="t {cls}{align}" style="color:{tohex(base)}">{inner}</{tag}>'

class Out:
    def __init__(self, slug):
        self.slug, self.n = slug, 0
        self.files = []

def crop(S, out, fg, src, extra=''):
    """Cut a region out of the 2× export and save it as webp crops (and a zoom copy)."""
    slug = S.P['slug']
    srcname = {'desk': 'desk', 'vis': 'vis'}[src]
    im = Image.open(os.path.join(EXP, slug, f'{srcname}-{S.i:02d}.png'))
    x0, y0 = max(0, int(fg['x'] * 2)), max(0, int(fg['y'] * 2))
    x1, y1 = min(im.width, int((fg['x'] + fg['w']) * 2)), min(im.height, int((fg['y'] + fg['h']) * 2))
    c = im.crop((x0, y0, x1, y1)).convert('RGB')
    ov = S.ov.get('overlay')
    if ov and src == 'desk':
        lay = Image.open(os.path.join(ROOT, ov['file'])).convert('RGBA')
        c.paste(lay, (int(ov['x'] * 2 - x0), int(ov['y'] * 2 - y0)), lay)
    out.n += 1
    name = f'{S.i + 1:02d}-{out.n}{extra}'
    d = os.path.join(ROOT, 'work', slug, 'm'); os.makedirs(d, exist_ok=True)
    w = c.width
    sizes = []
    for target in (640, 1200, 1600):
        if w > target * 1.15:
            r = c.resize((target, round(c.height * target / w)), Image.LANCZOS)
            r.save(os.path.join(d, f'{name}-{target}.webp'), 'WEBP', quality=78, method=6); sizes.append((target, f'{name}-{target}.webp', r.height))
    if not sizes or w <= 1600 * 1.15:
        c.save(os.path.join(d, f'{name}.webp'), 'WEBP', quality=80, method=6); sizes.append((w, f'{name}.webp', c.height))
    zoom = None
    if fg.get('zoom') and w > 1300:
        c.save(os.path.join(d, f'{name}-z.webp'), 'WEBP', quality=82, method=6); zoom = f'{name}-z.webp'
    return sizes, zoom

def img_tag(slug, sizes, alt, cls='', natural=None, eager=False, sizes_attr='(max-width: 820px) 100vw, 760px'):
    big = sizes[-1]
    cap_w = f' style="max-width:{round(natural)}px"' if natural and natural < 700 else ''
    srcset = ', '.join(f'work/{slug}/m/{f}?v={VERSION} {w}w' for w, f, h in sizes)
    return (f'<img src="work/{slug}/m/{big[1]}?v={VERSION}" srcset="{srcset}" sizes="{sizes_attr}" width="{big[0]}" height="{big[2]}" '
            f'alt="{esc(alt)}" {"fetchpriority=" + chr(34) + "high" + chr(34) if eager else "loading=" + chr(34) + "lazy" + chr(34)} decoding="async"{cap_w}{(" class=" + chr(34) + cls + chr(34)) if cls else ""}>')

def fig_html(S, out, fg, ctx, proj):
    slug = S.P['slug']
    vid = S.ov.get('video')
    if vid and abs(fg['x'] - vid['x']) < 30 and abs(fg['y'] - vid['y']) < 30:
        sizes, _ = crop(S, out, fg, 'vis')
        poster = f'work/{slug}/m/{sizes[-1][1]}?v={VERSION}'
        cap = ''.join(text_html(t, ctx, proj, [False]) for t in fg['caption'])
        return (f'<figure class="rf fb"><video controls playsinline preload="none" poster="{poster}" src="{esc(vid["src"])}" '
                f'width="{sizes[-1][0]}" height="{sizes[-1][2]}" aria-label="{esc(vid["label"])}"></video>'
                + (f'<figcaption>{cap}</figcaption>' if cap else '') + '</figure>')
    sizes, zoom = crop(S, out, fg, fg['src'])
    member_text = ' '.join(text_of(m).strip() for m in fg['members'] if m['kind'] == 'text')
    alt = fg.get('alt') or (member_text[:300] if member_text else '')
    if not alt and not fg['caption']:
        alt = S.ov.get('alt') or ''
    cap = ''.join(text_html(t, ctx, proj, [False]) for t in fg['caption'])
    wide = fg['w'] >= 1200
    swipe = fg['src'] == 'desk' and fg['w'] >= 900 and any(m['kind'] == 'text' for m in fg['members'])
    if swipe and zoom:   # shown wider than the phone, so offer the full-resolution file too
        sizes = sizes + [(round(fg['w'] * 2), zoom, round(fg['h'] * 2))]
    sz = f'(max-width: 760px) {round(fg["w"] * .72)}px, 760px' if swipe else '(max-width: 820px) 100vw, 760px'
    img = img_tag(slug, sizes, alt, natural=fg['w'], eager=S.i == 0 and out.n <= 2, sizes_attr=sz)
    if zoom: img = f'<a class="rz" href="work/{slug}/m/{zoom}?v={VERSION}" aria-label="Open this image larger">{img}</a>'
    if swipe:
        img = f'<div class="rsw" style="--fw:{round(fg["w"])}" tabindex="0" role="region" aria-label="Diagram, scroll sideways">{img}</div>'
    return f'<figure class="rf{" fb" if wide else ""}{" swipe" if swipe else ""}">{img}' + (f'<figcaption>{cap}</figcaption>' if cap else '') + '</figure>'

def render_blocks(S, out, blocks, ctx, proj, first_heading):
    h = []
    for b in blocks:
        k = b['kind']
        if k == 'stack':
            h.append('<div class="rk">' + ''.join(text_html(t, ctx, proj, first_heading) for t in b['items']) + '</div>')
        elif k == 'fig':
            h.append(fig_html(S, out, b['fig'], ctx, proj))
        elif k == 'gallery':
            n = len(b['items'])
            h.append(f'<div class="rg rg{min(n, 4)}">' + ''.join(fig_html(S, out, i['fig'], ctx, proj) for i in b['items']) + '</div>')
        elif k == 'stats':
            cells = []
            for st in b['items']:
                cells.append('<div class="rn">' + text_html(st['num'], ctx, proj, [False]).replace('class="t ', 'class="t num ') +
                             ''.join(text_html(c, ctx, proj, [False]) for c in st['cap']) + '</div>')
            h.append(f'<div class="rns">{"".join(cells)}</div>')
        elif k == 'table':
            heads = [text_of(t).strip() if t else '' for t in b['head']]
            cell = lambda cl: ''.join(text_html(c, ctx, proj, [False]) for c in cl) if cl else ''
            if len(b['rows']) == 1:
                cells = ''.join(f'<div><dt>{esc(hd)}</dt><dd>{cell(c)}</dd></div>' for hd, c in zip(heads, b['rows'][0]))
                h.append(f'<dl class="rmeta">{cells}</dl>')
            else:
                th = ''.join(f'<th scope="col">{esc(x)}</th>' for x in heads)
                trs = ''
                for r in b['rows']:
                    tds = ''.join(f'<td data-l="{esc(hd)}">{cell(c)}</td>' for hd, c in zip(heads, r))
                    trs += f'<tr>{tds}</tr>'
                h.append(f'<div class="rtw"><table class="rt"><thead><tr>{th}</tr></thead><tbody>{trs}</tbody></table></div>')
        elif k == 'grid':
            ncol = len(b['rows'][0]) if b['rows'] else 0
            heads = [text_of(t).strip() for t in b['head']] if b.get('head') else [''] * ncol
            short_first = b['rows'] and sum(len(text_of(r[0]).strip()) if r[0] else 0 for r in b['rows']) / len(b['rows']) <= 20
            if ncol == 2 and not b.get('head') and short_first:
                items = ''.join(f'<div><dt>{text_html(r[0], ctx, proj, [False]) if r[0] else ""}</dt><dd>{text_html(r[1], ctx, proj, [False]) if r[1] else ""}</dd></div>' for r in b['rows'])
                h.append(f'<dl class="rkv">{items}</dl>')
            else:
                th = ''.join(f'<th scope="col">{esc(x)}</th>' for x in heads) if b.get('head') else ''
                trs = ''.join('<tr>' + ''.join(f'<td data-l="{esc(hd)}">{text_html(c, ctx, proj, [False]) if c else ""}</td>' for hd, c in zip(heads, r)) + '</tr>' for r in b['rows'])
                h.append(f'<div class="rtw"><table class="rt{"" if b.get("head") else " rt-nh"}">' + (f'<thead><tr>{th}</tr></thead>' if th else '') + f'<tbody>{trs}</tbody></table></div>')
        elif k == 'panel':
            p = b['panel']
            pbg = paint_rgb(p.get('f'), ctx.bg) or ctx.bg
            inner_t = [t for t in S.texts if t.get('_panel') is p]
            pctx = Ctx(pbg, readable(ctx.fg, pbg, 16))
            sub = build_blocks(S, p, inner_t, [], [x for x in S.panels if x.get('_parent') is p], [])
            outline = ' ro' if not p.get('f') else ''
            h.append(f'<div class="rpnl{outline}" style="background:{tohex(pbg) if p.get("f") else "transparent"}">' + render_blocks(S, out, sub, pctx, proj, first_heading) + '</div>')
        elif k == 'photo':
            ph = b['photo']
            sizes, _ = crop(S, out, ph, 'vis')
            inner_t = [t for t in S.texts if t.get('_photo') is ph]
            ov = next((o for o in S.overlays if contains(o, ph, 4) or contains(ph, o, 4)), None)
            tint = ov['f']['g'][0][0] if ov else '#000000'
            pctx = Ctx(hx(tint), (1, 1, 1))
            sub = build_blocks(S, ph, inner_t, [], [], [])
            srcset = ', '.join(f'work/{S.P["slug"]}/m/{f}?v={VERSION} {w}w' for w, f, hh in sizes)
            lz = 'fetchpriority="high"' if S.i == 0 else 'loading="lazy"'
            h.append(f'<div class="rph" style="--tint:{tint}"><img class="rph-bg" src="work/{S.P["slug"]}/m/{sizes[-1][1]}?v={VERSION}" srcset="{srcset}" sizes="100vw" alt="" {lz} decoding="async">'
                     f'<div class="rph-in">' + render_blocks(S, out, sub, pctx, proj, first_heading) + '</div></div>')
    return ''.join(h)

def section_html(S, out, proj):
    classify(S)
    # give every text to its innermost container
    for t in S.texts:
        for ph in S.bgphotos:
            if contains(ph, t, 4): t['_photo'] = ph
        cands = [p for p in S.panels if in_panel(p, t)]
        if cands: t['_panel'] = min(cands, key=lambda p: p['w'] * p['h'])
    for p in S.panels:
        outer = [q for q in S.panels if q is not p and contains(q, p, 2)]
        if outer: p['_parent'] = min(outer, key=lambda q: q['w'] * q['h'])
    top_t = [t for t in S.texts if '_panel' not in t and '_photo' not in t]
    top_p = [p for p in S.panels if '_parent' not in p and not any(contains(ph, p, 4) for ph in S.bgphotos)]
    for ph in S.bgphotos:
        for p in S.panels:
            if contains(ph, p, 4): p['role'] = 'gone'
    blocks = build_blocks(S, None, top_t, S.figs, top_p, S.bgphotos)
    fg_counts = {}
    for t in S.texts:
        c = paint_rgb(main_seg(t)[3], S.bg)
        if c: fg_counts[tohex(c)] = fg_counts.get(tohex(c), 0) + len(text_of(t))
    fg = hx(max(fg_counts, key=fg_counts.get)) if fg_counts else ((0, 0, 0) if lum(S.bg) > .4 else (1, 1, 1))
    ctx = Ctx(S.bg, readable(fg, S.bg, 16))
    first = [True]
    body = render_blocks(S, out, blocks, ctx, proj, first)
    if not body.strip(): return ''
    full = ' rs-photo' if (S.bgphotos and S.bgphotos[0]['w'] >= 1400 and S.bgphotos[0]['h'] >= S.h * .8) else ''
    return (f'<section class="rs{full}" id="s{S.i + 1:02d}" style="--bg:{tohex(S.bg)};--fg:{tohex(ctx.fg)}" data-i="{S.i}">'
            f'<div class="rs-in">{body}</div></section>')

def build(slug):
    P = PROJECTS[slug]
    data = json.load(open(os.path.join(SRC, slug + '.json')))
    d = os.path.join(ROOT, 'work', slug, 'm')
    if os.path.isdir(d):
        for f in os.listdir(d): os.remove(os.path.join(d, f))
    out = Out(slug)
    parts = []
    for s in data['s']:
        ov = OVERRIDES.get(slug, {}).get(s['i'], {})
        if ov.get('skip'): continue
        S = Sec(P, s, ov)
        out.n = 0
        parts.append(section_html(S, out, P))
    main = f'<main class="rd rd-{slug}" id="reader" lang="en" data-slug="{slug}">' + ''.join(parts) + '</main>'
    open(os.path.join(ROOT, 'work', slug, 'reader.html'), 'w').write(main + '\n')
    from page import write_page
    write_page(slug, P, main)
    n = len(os.listdir(d)); kb = sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d)) // 1024
    print(f'{slug}: {len(parts)} sections, {n} crops, {kb} KB')

if __name__ == '__main__':
    for slug in (sys.argv[1:] or list(PROJECTS)):
        build(slug)
