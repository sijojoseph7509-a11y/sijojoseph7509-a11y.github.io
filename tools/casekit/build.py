# Builds the v200 sections for Carekin and Syntra from content.py, in each project's own brand:
#   1. tools/casekit/<slug>.html            the designed sections (1440 px wide), rendered by render.mjs
#   2. work/<slug>/<id>.webp + @2x           the images (render.mjs)
#   3. content.js                            sections inserted after their anchors, effects indices remapped
#   4. work/<slug>/reader.html + index.html  the same sections as text (idempotent: earlier kit sections are replaced)
#   python3 tools/casekit/build.py html            write the HTML only
#   python3 tools/casekit/build.py site <build>    after render.mjs: update content.js and the text versions
import html, json, os, re, sys
sys.path.insert(0, os.path.dirname(__file__))
from content import CAREKIN, SYNTRA
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
E = lambda s: html.escape(s, quote=False)
DATA = {'carekin': CAREKIN, 'syntra': SYNTRA}

THEME = {
  'carekin': dict(font='GSFlex', fontfile='gsflex-400-700.woff2', mono='GSCode', hw=500, ink='#0F3B38', text='#2F4A46', lab='#0F766E', acc='#FF8A6B', wb='#0F766E',
    bg={'light': ('#FFFFFF', '#EEF5F2'), 'mint': ('#EEF5F2', '#FFFFFF'), 'dark': ('#0F2A28', '#183F3B')}, darkink='#FFFFFF', darktext='#B3CCC6', darklab='#FF8A6B',
    lvl={'high': ('#0F3B38', '#FFFFFF', '#E3F1EC'), 'low': ('#7EE0C6', '#0F3B38', '#EFFAF6'), 'worst': ('#FF8A6B', '#3B1A10', '#FFF1EC')}),
  'syntra': dict(font='Lato', fontfile=None, mono='Lato', hw=300, ink='#7A4D1C', text='#5A3A1A', lab='#BD680F', acc='#DD8020', wb='#BD680F',
    bg={'light': ('#FBF6EF', '#FFFFFF'), 'cream': ('#F4E6D3', '#FFFDF9'), 'dark': ('#24170C', '#3A2615')}, darkink='#FBEBD7', darktext='#D7BFA2', darklab='#F99C36',
    lvl={'high': ('#DD8020', '#FFFFFF', '#FCEBD6'), 'low': ('#F3D7B4', '#5A3A1A', '#FFF8EF'), 'worst': ('#9C5410', '#FFFFFF', '#F6E3CF')}),
}

def css(slug):
    t = THEME[slug]
    ff = f"@font-face {{ font-family: GSFlex; src: url(../../fonts/{t['fontfile']}) format('woff2'); font-weight: 400 700; }}" if t['fontfile'] else ''
    return f"""
{ff}
@font-face {{ font-family: GSCode; src: url(../../fonts/gscode-400.woff2) format('woff2'); }}
@font-face {{ font-family: Lato; src: url(../../fonts/lato-400.woff2) format('woff2'); font-weight: 400; }}
@font-face {{ font-family: Lato; src: url(../../fonts/lato-700.woff2) format('woff2'); font-weight: 700; }}
* {{ box-sizing: border-box; margin: 0; padding: 0; }}
body {{ width: 1440px; font-family: {t['font']}, sans-serif; color: {t['text']}; -webkit-font-smoothing: antialiased; }}
section {{ position: relative; width: 1440px; padding: 112px 120px; overflow: hidden; }}
.eye {{ font: 400 15px/1 {t['mono']}, monospace; letter-spacing: .1em; text-transform: uppercase; color: {t['lab']}; margin-bottom: 26px; }}
h2 {{ font: {t['hw']} 56px/1.08 {t['font']}, sans-serif; letter-spacing: -.02em; color: {t['ink']}; max-width: 620px; }}
h3 {{ font: {max(t['hw'], 400) if slug == 'syntra' else 500} 25px/1.2 {t['font']}, sans-serif; color: {t['ink']}; margin-bottom: 12px; letter-spacing: -.01em; }}
p {{ font-size: 18px; line-height: 1.6; }}
.head {{ display: grid; grid-template-columns: 1fr 1fr; gap: 64px; align-items: end; }}
.head .lead {{ font-size: 20px; line-height: 1.6; }}
.grid {{ display: grid; gap: 24px; margin-top: 56px; }}
.grid + .grid {{ margin-top: 24px; }}
.card {{ border-radius: 22px; padding: 30px; }}
.card .lab, .lab {{ display: block; font: 400 12px/1 {t['mono']}, monospace; letter-spacing: .1em; text-transform: uppercase; color: {t['lab']}; margin-bottom: 14px; }}
.card p {{ font-size: 16.5px; line-height: 1.55; }}
.card .big {{ font: {t['hw']} 44px/1 {t['font']}; color: {t['acc'] if slug == 'carekin' else '#B5701F'}; margin: 4px 0 14px; letter-spacing: -.02em; }}
.src {{ font: 400 12.5px/1.45 {t['mono']}, monospace; color: {t['lab']}; opacity: .8; margin-top: 14px; }}
.band {{ display: grid; grid-template-columns: 320px 1fr; gap: 40px; align-items: center; margin-top: 24px; padding: 28px 32px; border-radius: 22px; }}
.band .lab {{ margin: 0; }}
.verdict {{ margin-top: 44px; font: {t['hw'] if slug == 'syntra' else 500} 30px/1.3 {t['font']}; color: {t['ink']}; max-width: 1060px; letter-spacing: -.01em; }}
.persona {{ border-radius: 24px; padding: 32px; }}
.persona .who {{ display: flex; gap: 18px; align-items: center; margin-bottom: 18px; }}
.persona .av {{ flex: none; display: grid; place-items: center; width: 60px; height: 60px; border-radius: 50%; font: 600 22px/1 {t['font']}; color: #fff; }}
.persona h3 {{ margin: 0; }} .persona .meta {{ font-size: 15px; line-height: 1.35; margin-top: 4px; opacity: .8; }}
.persona .f {{ display: grid; grid-template-columns: 140px 1fr; gap: 16px; padding: 12px 0; border-top: 1px solid rgba(0,0,0,.08); }}
.persona .f p {{ font-size: 16px; line-height: 1.5; }}
.c3 .persona .f {{ grid-template-columns: 1fr; gap: 6px; }} .c3 .persona .f .lab {{ margin: 0; }} .persona .f .lab {{ margin: 4px 0 0; }}
.map {{ margin-top: 48px; }} .map .row {{ display: grid; grid-template-columns: 1fr 60px 1fr; align-items: center; padding: 22px 0; border-bottom: 1px solid rgba(0,0,0,.09); }}
.map .row:first-child {{ border-top: 1px solid rgba(0,0,0,.09); }} .map .arr {{ text-align: center; font: 500 26px/1 {t['font']}; color: {t['acc']}; }}
.map p {{ font-size: 18px; }}
.xt {{ border-radius: 20px; padding: 28px; }} .xt p {{ font-size: 16px; line-height: 1.5; }}
.xt .lvl {{ display: inline-block; font: 400 12px/1 {t['mono']}, monospace; letter-spacing: .08em; text-transform: uppercase; padding: 7px 11px; border-radius: 99px; margin-bottom: 16px; }}
.wb {{ --wb-accent: {t['wb']}; --wb-ink: #1B1B22; }}
section.dark h2, section.dark h3, section.dark .verdict {{ color: {t['darkink']}; }} section.dark p {{ color: {t['darktext']}; }}
section.dark .eye, section.dark .lab, section.dark .card .lab {{ color: {t['darklab']}; }}
"""

def para(p): return '<br>'.join(E(x) for x in p.split('\n'))

def block_html(slug, b, bg):
    t = THEME[slug]; panel = t['bg'][bg][1] if bg in t['bg'] else '#fff'
    k = b[0]
    if k == 'head':
        return f'<div class="head"><div><p class="eye">{E(b[1])}</p><h2>{E(b[2])}</h2></div><p class="lead">{E(b[3])}</p></div>'
    if k == 'cards':
        n, items = b[1], b[2]; out = []
        for it in items:
            lab, h, p = it[:3]; src = it[3] if len(it) > 3 else ''
            hh = f'<p class="big">{E(h)}</p>' if re.match(r'^[$0-9]', h) else f'<h3>{E(h)}</h3>'
            out.append(f'<div class="card" style="background:{panel}"><span class="lab">{E(lab)}</span>{hh}<p>{para(p)}</p>{f"<p class=src>{E(src)}</p>" if src else ""}</div>')
        return f'<div class="grid" style="grid-template-columns:repeat({n},1fr)">' + ''.join(out) + '</div>'
    if k == 'band':
        return f'<div class="band" style="background:{panel}"><span class="lab">{E(b[1])}</span><p>{E(b[2])}</p></div>'
    if k == 'verdict':
        return f'<p class="verdict">{E(b[1])}</p>'
    if k == 'personas':
        cols = 2 if len(b[1]) == 4 else 3
        out = []
        for ini, col, name, meta, fields in b[1]:
            fs = ''.join(f'<div class="f"><span class="lab">{E(a)}</span><p>{E(c)}</p></div>' for a, c in fields)
            out.append(f'<div class="persona" style="background:{panel}"><div class="who"><span class="av" style="background:{col}">{ini}</span><div><h3>{E(name)}</h3><p class="meta">{E(meta)}</p></div></div>{fs}</div>')
        return f'<div class="grid c{cols}" style="grid-template-columns:repeat({cols},1fr)">' + ''.join(out) + '</div>'
    if k == 'map':
        rows = ''.join(f'<div class="row"><p><span class="lab">{E(a)}</span>{E(h)}</p><span class="arr">→</span><p><span class="lab">So I designed</span>{E(d)}</p></div>' for a, h, d in b[1])
        return f'<div class="map">{rows}</div>'
    if k == 'xt':
        out = []
        for lv, tag, h, p in b[1]:
            c1, c2, c3 = t['lvl'][lv]
            out.append(f'<div class="xt" style="background:{c3}"><span class="lvl" style="background:{c1}; color:{c2}">{E(tag)}</span><h3>{E(h)}</h3><p>{E(p)}</p></div>')
        return '<div class="grid" style="grid-template-columns:repeat(3,1fr)">' + ''.join(out) + '</div>'
    if k == 'wb':
        w = b[1]; colors = ['n-yellow', 'n-pink', 'n-blue', 'n-green', 'n-orange']
        saw = ''.join(f'<div class="note {colors[i % 5]}">{E(x)}</div>' for i, x in enumerate(w['saw']))
        why = '<div class="down"></div>'.join(f'<p><b>Why {i + 1}</b> {E(x)}</p>' for i, x in enumerate(w['whys']))
        ideas = ''.join(f'<div class="idea"><i>{i + 1}</i>{E(x)}</div>' for i, x in enumerate(w['ideas']))
        dead = ''.join(f'<p><s>{E(a)}</s> {E(c)}</p>' for a, c in w['dead'])
        circ = f'<svg viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M18 64 C 10 18, 120 6, 210 8 C 320 10, 396 30, 390 66 C 384 104, 270 116, 190 114 C 92 112, 14 100, 22 58" fill="none" stroke="{t["wb"]}" stroke-width="3.5" stroke-linecap="round"/></svg>'
        arrow = lambda x: f'<svg class="arrow" style="left:{x}px; top:380px; width:36px; height:30px" viewBox="0 0 60 40"><path d="M4 20 C 20 8, 36 30, 54 18 M44 10 L54 18 L44 26"/></svg>'
        return (f'<div class="wb"><div class="cols"><div><h4>What I saw &amp; heard<small>stores, families, conversations</small></h4>{saw}</div>'
                f'<div><h4>Why? Why? Why?<small>until it isn’t about one person</small></h4><div class="why">{why}</div>'
                f'<div class="root">{circ}<em>root cause</em>{E(w["root"])}</div></div>'
                f'<div><h4>So, how might we…</h4><div class="hmw"><em>HMW</em>{E(w["hmw"])}</div>{ideas}'
                f'<div class="dead"><h4 style="font-size:28px; margin-bottom:6px">Crossed out</h4>{dead}</div></div></div>{arrow(360)}{arrow(774)}</div>')
    if k == 'hook':
        A = '../../work/syntra/fx/'
        return f'''<div class="head" style="align-items:end"><div><p class="eye">Syntra in one look</p><h2 style="max-width:700px; font-size:62px; background:linear-gradient(100deg,#FFD9A8,#F99C36 60%,#E58A2B); -webkit-background-clip:text; background-clip:text; color:transparent">Find a perfume by feeling. Then step inside it, and take it home.</h2></div>
<p class="lead">Turn a knob and three sliders to describe a feeling. Syntra names the perfume, lets you step inside it in VR, and prints a ticket that comes alive in AR.</p></div>
<div style="display:grid; grid-template-columns:1fr 460px; gap:24px; margin-top:60px">
  <div style="position:relative; height:470px; border-radius:26px; overflow:hidden; background:url({A}pano-lakeside_night.webp) 38% 50%/cover">
    <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(20,12,6,0) 40%, rgba(20,12,6,.88) 100%)"></div>
    <span class="lvl" style="position:absolute; left:28px; top:28px; background:#F99C36; color:#24170C; font:700 13px/1 Lato; letter-spacing:.12em; padding:9px 13px; border-radius:99px">VR · META QUEST 3</span>
    <div style="position:absolute; left:32px; right:32px; bottom:28px"><h3 style="font:400 34px/1.15 Lato; color:#FBEBD7; margin:0 0 8px">Your scent becomes a place.</h3><p style="color:#E8D3B8; font-size:17px">Nine 360° worlds: a starry lake, a flower garden, the snowy Alps. Put on the headset and stand inside the perfume you just found.</p></div>
  </div>
  <div style="position:relative; height:470px; border-radius:26px; overflow:hidden; background:#F4E6D3">
    <span class="lvl" style="position:absolute; left:28px; top:28px; background:#24170C; color:#F99C36; font:700 13px/1 Lato; letter-spacing:.12em; padding:9px 13px; border-radius:99px; z-index:2">AR · PRINTED TICKET</span>
    <img src="{A}receipt-164936.webp" style="position:absolute; left:46px; top:74px; width:150px; transform:rotate(-7deg); box-shadow:0 24px 40px -18px rgba(90,45,0,.5); border-radius:4px">
    <img src="{A}receipt-170525.webp" style="position:absolute; left:206px; top:96px; width:150px; transform:rotate(5deg); box-shadow:0 24px 40px -18px rgba(90,45,0,.5); border-radius:4px">
    <div style="position:absolute; left:28px; right:28px; bottom:26px; padding:18px 20px; border-radius:18px; background:rgba(255,253,249,.94)"><h3 style="font:400 24px/1.2 Lato; color:#7A4D1C; margin:0 0 6px">Take it home.</h3><p style="font-size:15.5px; line-height:1.5; color:#5A3A1A">A thermal ticket with your scent’s drawing. Scan it at home and the drawing comes alive.</p></div>
  </div>
</div>
<div style="display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:24px">
  {''.join(f'<div style="padding:26px 30px; border-radius:22px; background:#3A2615"><p style="font:300 52px/1 Lato; color:#F99C36">{n}</p><p style="margin-top:10px; color:#D7BFA2; font-size:16.5px">{E(c)}</p></div>' for n, c in [("66", "tickets printed for visitors at our exhibit, in one day"), ("9", "360° worlds to step into, from a starry lake to the snowy Alps"), ("1 + 3", "a knob and three sliders: nothing to type, nothing to learn")])}
</div>'''
    raise ValueError(k)

def page(slug):
    secs = []
    for S in DATA[slug]:
        bg = S['bg']; t = THEME[slug]
        cls = 'dark' if bg in ('dark', 'hook') else ''
        col = t['bg']['dark'][0] if bg == 'hook' else t['bg'][bg][0]
        if bg == 'hook': col = '#1C120A'
        secs.append(f'<section id="{S["id"]}" class="{cls}" style="background:{col}">' + ''.join(block_html(slug, b, 'dark' if bg == 'hook' else bg) for b in S['blocks']) + '</section>')
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="../../fonts/fonts.css"><link rel="stylesheet" href="whiteboard.css"><style>{css(slug)}</style></head><body>{"".join(secs)}</body></html>'

# ---- text version (reader) ----
def rtext(slug, S, v):
    t = THEME[slug]; bg = S['bg']
    dark = bg in ('dark', 'hook'); col = '#1C120A' if bg == 'hook' else t['bg'][bg][0]; panel = t['bg']['dark' if dark else bg][1]
    fg = t['darkink'] if dark else t['ink']; tx = t['darktext'] if dark else t['text']; lb = t['darklab'] if dark else t['lab']
    sp = lambda s, w=400, cls='f-sans': f'<span class="{cls}" style="font-weight:{w}">{s}</span>'
    out = []
    for b in S['blocks']:
        k = b[0]
        if k == 'head':
            out.append(f'<div class="rk"><p class="t l" style="color:{lb}">{sp(E(b[1]), 400, "f-mono up")}</p><h2 class="t x4" style="color:{fg}">{sp(E(b[2]), 500)}</h2><p class="t b" style="color:{tx}">{sp(E(b[3]))}</p></div>')
        elif k == 'cards':
            def card(it):
                num = 'num ' if re.match(r'^[$0-9]', it[1]) else ''
                src = '<p class="t s" style="color:%s">%s</p>' % (lb, sp(E(it[3]), 400, 'f-mono')) if len(it) > 3 else ''
                return (f'<div class="rpnl" style="background:{panel}"><div class="rk"><p class="t l" style="color:{lb}">' + sp(E(it[0]), 400, 'f-mono up') + '</p>'
                        f'<h3 class="t {num}x3" style="color:{fg}">' + sp(E(it[1]), 500) + f'</h3><p class="t p" style="color:{tx}">' + sp(para(it[2])) + '</p>' + src + '</div></div>')
            items = ''.join(card(it) for it in b[2])
            out.append(f'<div class="rg rg{min(b[1], 3)}">{items}</div>')
        elif k == 'band':
            out.append(f'<div class="rpnl" style="background:{panel}"><div class="rk"><p class="t l" style="color:{lb}">{sp(E(b[1]), 400, "f-mono up")}</p><p class="t p" style="color:{tx}">{sp(E(b[2]))}</p></div></div>')
        elif k == 'verdict':
            out.append(f'<div class="rk"><h3 class="t x3" style="color:{fg}">{sp(E(b[1]), 500)}</h3></div>')
        elif k == 'personas':
            for ini, c, name, meta, fields in b[1]:
                fs = ''.join(f'<p class="t l" style="color:{lb}">{sp(E(a), 400, "f-mono up")}</p><p class="t p" style="color:{tx}">{sp(E(x))}</p>' for a, x in fields)
                out.append(f'<div class="rpnl" style="background:{panel}"><div class="rk"><h3 class="t x3" style="color:{fg}">{sp(E(name), 500)}</h3><p class="t s" style="color:{tx}">{sp(E(meta))}</p>{fs}</div></div>')
        elif k == 'map':
            for a, h, d in b[1]:
                out.append(f'<div class="rpnl" style="background:{panel}"><div class="rk"><p class="t l" style="color:{lb}">{sp(E(a), 400, "f-mono up")}</p><p class="t p" style="color:{fg}">{sp(E(h), 500)}</p><p class="t l" style="color:{lb}">{sp("So I designed", 400, "f-mono up")}</p><p class="t p" style="color:{tx}">{sp(E(d))}</p></div></div>')
        elif k == 'xt':
            for lv, tag, h, p in b[1]:
                out.append(f'<div class="rpnl" style="background:{t["lvl"][lv][2]}"><div class="rk"><p class="t l" style="color:{t["ink"]}">{sp(E(tag), 400, "f-mono up")}</p><h3 class="t x3" style="color:{t["ink"]}">{sp(E(h), 500)}</h3><p class="t p" style="color:{t["text"]}">{sp(E(p))}</p></div></div>')
        elif k == 'wb':
            w = b[1]; img = f'work/{slug}/kit/{S["id"]}-board.webp?v={v}'
            out.append(f'<figure class="rf"><img src="{img}" width="2400" height="1500" alt="Whiteboard: what I saw and heard, five whys to the root cause, how might we, ideas and crossed-out ideas" loading="lazy" decoding="async"></figure>')
            out.append(f'<div class="rk"><p class="t l" style="color:{lb}">{sp("Root cause", 400, "f-mono up")}</p><h3 class="t x3" style="color:{fg}">{sp(E(w["root"]), 500)}</h3><p class="t l" style="color:{lb}">{sp("How might we", 400, "f-mono up")}</p><p class="t p" style="color:{tx}">{sp(E(w["hmw"]))}</p></div>')
        elif k == 'hook':
            out.append(f'<div class="rk"><p class="t l" style="color:{lb}">{sp("Syntra in one look", 400, "f-mono up")}</p><h2 class="t x4" style="color:{fg}">{sp("Find a perfume by feeling. Then step inside it, and take it home.", 400)}</h2><p class="t b" style="color:{tx}">{sp("Turn a knob and three sliders to describe a feeling. Syntra names the perfume, lets you step inside it in VR on a Meta Quest 3, and prints a ticket that comes alive in AR. 66 tickets were printed at our exhibit in one day.")}</p></div>')
            out.append(f'<figure class="rf"><img src="work/syntra/kit/k-hook-board.webp?v={v}" width="2400" height="1200" alt="A 360-degree VR world and two printed Syntra tickets" loading="lazy" decoding="async"></figure>')
    return f'<section class="rs" id="{S["id"]}" data-kit="1" style="--bg:{col};--fg:{fg}"><div class="rs-in">' + ''.join(out) + '</div></section>'

def site(v):
    s = open(os.path.join(ROOT, 'content.js')).read()
    heights = json.load(open(os.path.join(ROOT, 'tools', 'casekit', 'heights.json')))
    for slug, SECS in DATA.items():
        i = s.index(f'slug: "{slug}"'); j = s.index('sections: [', i); k = s.index('\n      ]', j)
        lines = s[j:k].split('\n')
        idx = [n for n, l in enumerate(lines) if re.match(r'\s*\["[\w-]+\.webp"', l)]
        ent = [lines[n] for n in idx]
        name = lambda l: re.match(r'\s*\["([\w-]+\.webp)"', l).group(1)
        pad = re.match(r'(\s*)', ent[0]).group(1)
        base = [l for l in ent if not name(l).startswith('k-')]           # idempotent: drop earlier kit entries
        old_order = [name(l) for l in base]
        order = list(base)
        for S in SECS:
            line = pad + json.dumps([S['id'] + '.webp', heights[slug][S['id']], S['desc']], ensure_ascii=False) + ','
            if S.get('replaces'):
                pos = [name(l) for l in order].index(S['replaces']); order[pos] = line
            else:
                pos = [name(l) for l in order].index(S['after'] if S['after'].endswith('.webp') else S['after'] + '.webp'); order.insert(pos + 1, line)
        order = [l if l.rstrip().endswith(',') else l + ',' for l in order]; order[-1] = order[-1].rstrip(',')
        new_names = [name(l) for l in order]
        first = idx[0]
        s = s[:j] + '\n'.join(lines[:first] + order) + s[k:]
        # remap 0-based effect indices (case-fx: videos, draw, seqs, pops, compare) from the numbered files' positions
        cur_names = [n for n in old_order]
        ci = s.index(f'slug: "{slug}"'); ce = s.index('sections: [', ci); head = s[ci:ce]
        # the original order is the numbered files; an index i refers to the file "%02d.webp" % (i + 1)
        cur = [name(l) for l in ent]   # index i points at the i-th entry as it was before this run
        def r(i):
            f = cur[i] if i < len(cur) else None
            return new_names.index(f) if f in new_names else i
        def remap_list(m): return m.group(1) + re.sub(r'\[(\d+),', lambda x: '[' + str(r(int(x.group(1)))) + ',', m.group(2))
        for key in ('videos', 'seqs', 'pops'):   # each top-level entry starts "[<index>, <number>": remap those only
            m = re.search(rf'{key}: \[', head)
            if not m: continue
            st = m.end(); depth, k2 = 1, st
            while depth: depth += {'[': 1, ']': -1}.get(head[k2], 0); k2 += 1
            seg = re.sub(r'(?<=\[)(\d+)(?=, -?[\d.]+)', lambda x: str(r(int(x.group(1)))) if head[st:k2].count('[' + x.group(1) + ',') else x.group(1), head[st:k2])
            head = head[:st] + seg + head[k2:]
        for key in ('draw', 'compare'):
            head = re.sub(rf'({key}: \[)(\d+)(,)', lambda m: m.group(1) + str(r(int(m.group(2)))) + m.group(3), head)
        s = s[:ci] + head + s[ce:]
        # text version
        rp = os.path.join(ROOT, 'work', slug, 'reader.html'); main = open(rp).read().strip()
        main = re.sub(r'<section class="rs" id="k-[\w-]+" data-kit="1".*?</section>', '', main, flags=re.S)
        for S in SECS:
            sec = rtext(slug, S, v)
            if S.get('replaces'):
                sid = 's' + S['replaces'][:2]
                main, n = re.subn(rf'<section class="rs" id="{sid}"[^>]*>.*?</section>', sec, main, count=1, flags=re.S)
                if not n:   # already replaced on an earlier run: put it after the section before
                    prev = 's%02d' % (int(S['replaces'][:2]) - 1)
                    main = re.sub(rf'(<section class="rs" id="{prev}"[^>]*>.*?</section>)', lambda m: m.group(1) + sec, main, count=1, flags=re.S)
            else:
                a = S['after']; sid = 's' + a[:2] if a.endswith('.webp') else a
                main, n = re.subn(rf'(<section class="rs" id="{sid}"[^>]*>.*?</section>)', lambda m: m.group(1) + sec, main, count=1, flags=re.S)
                assert n, (slug, sid)
        open(rp, 'w').write(main + '\n')
        sys.path.insert(0, os.path.join(ROOT, 'tools', 'reader'))
        from page import write_page
        from projects import PROJECTS
        write_page(slug, PROJECTS[slug], main)
        print(slug, len(new_names), 'sections')
    open(os.path.join(ROOT, 'content.js'), 'w').write(s)

if __name__ == '__main__':
    if sys.argv[1] == 'html':
        for slug in DATA:
            open(os.path.join(os.path.dirname(__file__), slug + '.html'), 'w').write(page(slug))
        print('written')
    else:
        site(sys.argv[2])
