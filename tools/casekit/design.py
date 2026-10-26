# v201: the added sections drawn in each case study's own design system, measured from the Figma pages
# (tools/reader/src/<slug>.json): same fonts, weights, sizes, colours, margins and layout patterns as the sections around them.
#   Syntra  · white page with soft amber "clouds"; centred 40 px heading, Lato Light + Lato Medium, #BD680F; 20 px Lato Light
#             subtitle and 17–18 px body in the amber gradient (#F99C36 → #975C1C); 96 px Lato Thin numbers; 24 px Lato Medium
#             item titles; no boxed cards; text column x 184–1256.
#   Carekin · 13 px Google Sans Code label at x 40; content from x 480; 30 px Google Sans Flex Regular headings; 15–16 px body;
#             19 px Medium item titles; mint panels #DDEBE6 / #EEF5F2, dark #0F3B38 with #164A46 panels; table rows with a
#             13 px code-font header (like Edge cases).
import html, re
import boards   # v202: a different, hand-made whiteboard per project
E = lambda s: html.escape(s, quote=False)
para = lambda p: '<br>'.join(E(x) for x in p.split('\n'))

GRAD = 'linear-gradient(90deg,#F99C36,#975C1C)'

CSS = {
'syntra': """
@font-face { font-family: Lato; src: url(../../fonts/lato-100-latin.woff2) format('woff2'); font-weight: 100; }
@font-face { font-family: Lato; src: url(../../fonts/lato-300-latin.woff2) format('woff2'); font-weight: 300; }
@font-face { font-family: Lato; src: url(../../fonts/lato-400.woff2) format('woff2'); font-weight: 400; }
@font-face { font-family: Lato; src: url(../../fonts/lato-400.woff2) format('woff2'); font-weight: 500; }   /* Medium: no Medium file; Regular is closest */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1440px; font-family: Lato, sans-serif; -webkit-font-smoothing: antialiased; }
section { position: relative; width: 1440px; padding: 140px 184px 130px; overflow: hidden; background: #fff; }
.cloud { position: absolute; border-radius: 50%; filter: blur(90px); pointer-events: none; }
section > *:not(.cloud) { position: relative; }
.g { background: """ + GRAD + """; -webkit-background-clip: text; background-clip: text; color: transparent; }
h2 { font: 300 40px/1.2 Lato; color: #BD680F; text-align: center; } h2 b { font-weight: 500; }
.sub { max-width: 872px; margin: 22px auto 0; font: 300 20px/1.5 Lato; text-align: center; }
.cols { display: grid; gap: 48px 56px; margin-top: 80px; }
.it .num { font: 100 96px/1 Lato; }
.it h3 { font: 500 24px/1.25 Lato; color: #BD680F; margin: 18px 0 12px; }
.it p { font: 300 17px/1.6 Lato; }
.it .big { font: 300 44px/1.05 Lato; margin: 6px 0 14px; }
.it .k { font: 500 14px/1 Lato; letter-spacing: .12em; text-transform: uppercase; color: #BD680F; }
.src { margin-top: 12px; font: 300 13px/1.45 Lato; color: #948573; }
.rule { border-top: 1px solid rgba(189,104,15,.22); padding-top: 26px; }
.verdict { margin: 90px auto 0; max-width: 972px; font: 300 30px/1.4 Lato; color: #BD680F; text-align: center; } .verdict b { font-weight: 500; }
.persona .who { display: flex; gap: 16px; align-items: center; }
.persona .av { flex: none; display: grid; place-items: center; width: 56px; height: 56px; border-radius: 50%; font: 300 24px/1 Lato; color: #fff; }
.persona h3 { font: 500 24px/1.2 Lato; color: #BD680F; } .persona .meta { font: 300 15px/1.4 Lato; color: #948573; margin-top: 4px; }
.persona .f { margin-top: 20px; } .persona .f .k { display: block; font: 500 16px/1 Lato; color: #BD680F; margin-bottom: 8px; } .persona .f p { font: 300 17px/1.55 Lato; }
.map { margin-top: 80px; } .map .hd, .map .row { display: grid; grid-template-columns: 1fr 50px 1fr; }
.map .hd p { font: 400 20px/1 Lato; color: #BD680F; padding-bottom: 18px; } .map .hd p + p + p { font-weight: 500; }
.map .row { padding: 20px 0; border-top: 1px solid rgba(189,104,15,.18); } .map .row p { font: 300 18px/1.5 Lato; } .map .arr { font: 300 20px/1.4 Lato; color: #BD680F; }
.xt .k { color: #BD680F; } .xt .k.hi { color: #E58A2B; } .xt .k.lo { color: #B79A78; } .xt .k.wo { color: #975C1C; }
""",
'carekin': """
@font-face { font-family: GSFlex; src: url(../../fonts/gsflex-400-700.woff2) format('woff2'); font-weight: 400 700; }
@font-face { font-family: GSCode; src: url(../../fonts/gscode-400.woff2) format('woff2'); }
* { box-sizing: border-box; margin: 0; padding: 0; }
body { width: 1440px; font-family: GSFlex, sans-serif; -webkit-font-smoothing: antialiased; }
section { position: relative; width: 1440px; padding: 154px 120px 130px 480px; overflow: hidden; }
.side { position: absolute; left: 40px; top: 160px; width: 300px; font: 400 13px/1.3 GSCode, monospace; letter-spacing: .02em; text-transform: uppercase; }
h2 { font: 400 30px/1.25 GSFlex; max-width: 680px; }
.sub { margin-top: 18px; max-width: 680px; font: 400 16px/1.6 GSFlex; }
.cols { display: grid; gap: 16px; margin-top: 48px; }
.pnl { border-radius: 16px; padding: 24px; }
.pnl .k, .k { display: block; font: 400 13px/1.3 GSCode, monospace; text-transform: uppercase; margin-bottom: 12px; }
.pnl h3 { font: 500 19px/1.3 GSFlex; margin-bottom: 8px; } .pnl p { font: 400 15px/1.55 GSFlex; }
.pnl .big { font: 400 30px/1.1 GSFlex; color: #FF8A6B; margin: 2px 0 10px; }
.src { margin-top: 10px; font: 400 12px/1.45 GSCode, monospace; opacity: .8; }
.verdict { margin-top: 40px; font: 500 19px/1.45 GSFlex; max-width: 760px; }
.tbl { margin-top: 44px; } .tbl .hd, .tbl .row { display: grid; grid-template-columns: 300px 1fr; gap: 30px; }
.tbl .hd { padding-bottom: 14px; } .tbl .row { padding: 15px 0; border-top: 1px solid rgba(15,59,56,.1); } .tbl .row p { font: 400 15px/1.5 GSFlex; }
.tbl .row .tag { display: block; font: 400 12px/1.2 GSCode, monospace; text-transform: uppercase; margin-bottom: 6px; }
.persona h3 { font: 400 30px/1.15 GSFlex; } .persona .meta { display: block; margin: 8px 0 18px; font: 400 13px/1.35 GSCode, monospace; text-transform: uppercase; color: #0F766E; }
.persona .f { margin-top: 12px; } .persona .f p { font: 400 15px/1.5 GSFlex; } .persona .f b { font-weight: 500; }
""",
}

SPLIT = {"Choosing is where the sale is won or lost.": ("Choosing is where", "the sale is won or lost."),
         "How I got from symptoms to the root cause.": ("How I got from symptoms", "to the root cause."),
         "Every choice traces back to a shopper.": ("Every choice traces back", "to a shopper.")}
def split_title(t):
    # Syntra headings: the first phrase light, the rest medium ("What we heard, | again and again.")
    if t in SPLIT: return f'{E(SPLIT[t][0])} <b>{E(SPLIT[t][1])}</b>'
    m = re.match(r'^(.*?[,.:?])\s+(.+)$', t)
    if m: return f'{E(m.group(1))} <b>{E(m.group(2))}</b>'
    w = t.split(' '); return f'{E(" ".join(w[:-2]))} <b>{E(" ".join(w[-2:]))}</b>'

def wb_html(w, accent):
    colors = ['n-yellow', 'n-pink', 'n-blue', 'n-green', 'n-orange']
    saw = ''.join(f'<div class="note {colors[i % 5]}">{E(x)}</div>' for i, x in enumerate(w['saw']))
    why = '<div class="down"></div>'.join(f'<p><b>Why {i + 1}</b> {E(x)}</p>' for i, x in enumerate(w['whys']))
    ideas = ''.join(f'<div class="idea"><i>{i + 1}</i>{E(x)}</div>' for i, x in enumerate(w['ideas']))
    dead = ''.join(f'<p><s>{E(a)}</s> {E(c)}</p>' for a, c in w['dead'])
    circ = f'<svg viewBox="0 0 400 120" preserveAspectRatio="none"><path d="M18 64 C 10 18, 120 6, 210 8 C 320 10, 396 30, 390 66 C 384 104, 270 116, 190 114 C 92 112, 14 100, 22 58" fill="none" stroke="{accent}" stroke-width="3.5" stroke-linecap="round"/></svg>'
    return (f'<div class="wb" style="--wb-accent:{accent}"><div class="cols" style="margin:0">'
            f'<div><h4>What I saw &amp; heard<small>stores, families, conversations</small></h4>{saw}</div>'
            f'<div><h4>Why? Why? Why?<small>until it isn’t about one person</small></h4><div class="why">{why}</div><div class="root">{circ}<em>root cause</em>{E(w["root"])}</div></div>'
            f'<div><h4>So, how might we…</h4><div class="hmw"><em>HMW</em>{E(w["hmw"])}</div>{ideas}<div class="dead"><h4 style="font-size:28px; margin-bottom:6px">Crossed out</h4>{dead}</div></div></div></div>')

# ---------------- Syntra ----------------
CLOUDS = [[(-300, 200, 900, 700, '#dab376', .45), (900, 1100, 900, 700, '#f99c36', .22)], [(800, 100, 900, 700, '#dab376', .45), (-300, 1000, 900, 700, '#f99c36', .2)]]
def sy_section(S, k):
    cl = ''.join(f'<i class="cloud" style="left:{x}px; top:{y}px; width:{w}px; height:{h}px; background:{c}; opacity:{o}"></i>' for x, y, w, h, c, o in CLOUDS[k % 2])
    out = [cl]
    for b in S['blocks']:
        t = b[0]
        if t == 'head': out.append(f'<h2>{split_title(b[2])}</h2><p class="sub g">{E(b[3])}</p>')
        elif t == 'cards':
            n, items = b[1], b[2]; cells = []
            for i, it in enumerate(items):
                lab, h, p = it[:3]; src = f'<p class="src">{E(it[3])}</p>' if len(it) > 3 else ''
                head = f'<p class="big g">{E(h)}</p>' if re.match(r'^[$0-9]', h) else f'<h3>{E(h)}</h3>'
                cells.append(f'<div class="it rule"><p class="k">{E(lab)}</p>{head}<p class="g">{para(p)}</p>{src}</div>')
            mt = 56 if out[-1].startswith('<div class="cols"') else 80
            out.append(f'<div class="cols" style="grid-template-columns:repeat({n},1fr); margin-top:{mt}px">' + ''.join(cells) + '</div>')
        elif t == 'verdict':
            a, _, c = b[1].partition(':'); out.append(f'<p class="verdict"><b>{E(a)}:</b>{E(c)}</p>')
        elif t == 'personas':
            cells = []
            for ini, col, name, meta, fields in b[1]:
                fs = ''.join(f'<div class="f"><span class="k">{E(a)}</span><p class="g">{E(c)}</p></div>' for a, c in fields)
                cells.append(f'<div class="persona rule"><div class="who"><span class="av" style="background:{col}">{ini}</span><div><h3>{E(name)}</h3><p class="meta">{E(meta)}</p></div></div>{fs}</div>')
            out.append(f'<div class="cols" style="grid-template-columns:repeat(3,1fr)">' + ''.join(cells) + '</div>')
        elif t == 'map':
            rows = ''.join(f'<div class="row"><p class="g">{E(h)}</p><p class="arr">→</p><p class="g">{E(d)}</p></div>' for a, h, d in b[1])
            out.append(f'<div class="map"><div class="hd"><p>What I heard and saw</p><p></p><p>So I designed</p></div>{rows}</div>')
        elif t == 'xt':
            cls = {'high': 'hi', 'low': 'lo', 'worst': 'wo'}
            cells = ''.join(f'<div class="it xt rule"><p class="k {cls[lv]}">{E(tag)}</p><h3>{E(h)}</h3><p class="g">{E(p)}</p></div>' for lv, tag, h, p in b[1])
            out.append(f'<div class="cols" style="grid-template-columns:repeat(3,1fr)">{cells}</div>')
        elif t == 'wb': out.append('<div style="margin:72px -64px 0">' + boards.syntra(b[1]) + '</div>')
        elif t == 'hook': out.append(sy_hook())
    return f'<section id="{S["id"]}">' + ''.join(out) + '</section>'

def sy_hook():
    A = '../../work/syntra/fx/'
    stats = ''.join(f'<div class="it"><p class="num g">{n}</p><p class="g" style="margin-top:14px">{E(c)}</p></div>' for n, c in [("66", "tickets printed for visitors at our exhibit, in one day"), ("9", "360° worlds to step into, from a starry lake to the snowy Alps"), ("1+3", "a knob and three sliders: nothing to type, nothing to learn")])
    return f'''<h2>Find a perfume by feeling.<br><b>Then step inside it, and take it home.</b></h2>
<p class="sub g">Turn a knob and three sliders to describe a feeling. Syntra names the perfume, lets you step inside it in VR, and prints a ticket that comes alive in AR.</p>
<div style="display:grid; grid-template-columns:1fr 1fr; gap:56px; margin-top:80px">
  <div><div style="height:420px; border-radius:16px; background:url({A}pano-lakeside_night.webp) 38% 50%/cover"></div>
    <p class="k" style="font:500 14px/1 Lato; letter-spacing:.12em; color:#BD680F; margin-top:28px">VR · META QUEST 3</p><h3 style="font:500 24px/1.25 Lato; color:#BD680F; margin:14px 0 10px">Your scent becomes a place.</h3>
    <p class="g" style="font:300 17px/1.6 Lato">Nine 360° worlds: a starry lake, a flower garden, the snowy Alps. Put on the headset and stand inside the perfume you just found.</p></div>
  <div><div style="position:relative; height:420px; border-radius:16px; background:#F7EEE3; overflow:hidden">
      <img src="{A}receipt-164936.webp" style="position:absolute; left:92px; top:34px; width:170px; transform:rotate(-6deg); box-shadow:0 24px 40px -18px rgba(90,45,0,.45)">
      <img src="{A}receipt-170525.webp" style="position:absolute; left:282px; top:52px; width:170px; transform:rotate(5deg); box-shadow:0 24px 40px -18px rgba(90,45,0,.45)"></div>
    <p class="k" style="font:500 14px/1 Lato; letter-spacing:.12em; color:#BD680F; margin-top:28px">AR · PRINTED TICKET</p><h3 style="font:500 24px/1.25 Lato; color:#BD680F; margin:14px 0 10px">Take it home.</h3>
    <p class="g" style="font:300 17px/1.6 Lato">A thermal ticket with your scent’s drawing. Scan it at home and the drawing comes alive.</p></div>
</div>
<div class="cols" style="grid-template-columns:repeat(3,1fr); margin-top:90px">{stats}</div>'''

# ---------------- Carekin ----------------
CK = {'light': ('#FFFFFF', '#EEF5F2', '#0F2A28', '#405652', '#0F766E', '#3B504C'),
      'mint': ('#EEF5F2', '#DDEBE6', '#0F2A28', '#405652', '#0F766E', '#3B504C'),
      'dark': ('#0F3B38', '#164A46', '#F4F8F6', '#B3CCC6', '#FF8A6B', '#B3CCC6')}
def ck_section(S):
    bg, pnl, ink, tx, acc, side = CK[S['bg']]
    out = []
    for b in S['blocks']:
        t = b[0]
        if t == 'head': out.append(f'<p class="side" style="color:{side}">{E(b[1])}</p><h2 style="color:{ink}">{E(b[2])}</h2><p class="sub" style="color:{tx}">{E(b[3])}</p>')
        elif t == 'cards':
            n, items = b[1], b[2]; cells = []
            for it in items:
                lab, h, p = it[:3]; src = f'<p class="src" style="color:{acc}">{E(it[3])}</p>' if len(it) > 3 else ''
                head = f'<p class="big">{E(h)}</p>' if re.match(r'^[$0-9]', h) else f'<h3 style="color:{ink}">{E(h)}</h3>'
                cells.append(f'<div class="pnl" style="background:{pnl}"><span class="k" style="color:{acc}">{E(lab)}</span>{head}<p style="color:{tx}">{para(p)}</p>{src}</div>')
            out.append(f'<div class="cols" style="grid-template-columns:repeat({2 if n == 4 else n},1fr)">' + ''.join(cells) + '</div>')
        elif t == 'band':
            out.append(f'<div class="pnl" style="background:{pnl}; margin-top:16px; display:grid; grid-template-columns:240px 1fr; gap:24px"><span class="k" style="color:{acc}; margin:0">{E(b[1])}</span><p style="color:{tx}">{E(b[2])}</p></div>')
        elif t == 'verdict': out.append(f'<p class="verdict" style="color:{ink}">{E(b[1])}</p>')
        elif t == 'personas':
            cells = ''.join(f'<div class="persona pnl" style="background:{pnl}"><h3 style="color:{ink}">{E(name)}</h3><span class="meta">{E(meta)}</span>' + ''.join(f'<div class="f"><p style="color:{tx}"><b style="color:{ink}">{E(a)}.</b> {E(c)}</p></div>' for a, c in fields) + '</div>' for ini, col, name, meta, fields in b[1])
            out.append(f'<div class="cols" style="grid-template-columns:repeat(2,1fr)">{cells}</div>')
        elif t == 'map':
            rows = ''.join(f'<div class="row"><p style="color:{ink}">{E(h)}</p><p style="color:{tx}">{E(d)}</p></div>' for a, h, d in b[1])
            out.append(f'<div class="tbl"><div class="hd"><span class="k" style="color:{side}">What I heard</span><span class="k" style="color:{side}">So I designed</span></div>{rows}</div>')
        elif t == 'xt':
            tc = {'high': acc, 'low': '#0F766E' if S['bg'] != 'dark' else '#7EE0C6', 'worst': '#C2412D' if S['bg'] != 'dark' else '#FF8A6B'}
            rows = ''.join(f'<div class="row"><p style="color:{ink}"><span class="tag" style="color:{tc[lv]}">{E(tag)}</span>{E(h)}</p><p style="color:{tx}">{E(p)}</p></div>' for lv, tag, h, p in b[1])
            out.append(f'<div class="tbl"><div class="hd"><span class="k" style="color:{side}">Situation</span><span class="k" style="color:{side}">What Carekin does</span></div>{rows}</div>')
        elif t == 'wb': out.append('<div style="margin:56px 0 0 -440px">' + boards.carekin(b[1]) + '</div>')
    return f'<section id="{S["id"]}" style="background:{bg}">' + ''.join(out) + '</section>'

def page(slug, secs):
    body = ''.join(sy_section(S, k) for k, S in enumerate(secs)) if slug == 'syntra' else ''.join(ck_section(S) for S in secs)
    return f'<!doctype html><html lang="en"><head><meta charset="utf-8"><link rel="stylesheet" href="whiteboard.css"><style>{CSS[slug]}</style></head><body>{body}</body></html>'
