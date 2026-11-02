import re
# v202: three whiteboards, one per project, each drawn the way I'd really work, all in the same handwriting (Caveat):
#   Handovo  · a FigJam board: sections, square stickies with my name, connectors, a 5-whys chain, voting dots, my cursor
#   Carekin  · a ruled notebook page in ink: a fishbone of causes, the root cause highlighted, a ticked idea list
#   Syntra   · a cream sketchbook page in pencil and amber marker: a mind map around the question, a why-staircase, doodles
import html
E = lambda s: html.escape(s, quote=False)
FONT = "font-family:Caveat,cursive;"

def t(x, y, w, s, size=24, color="#1E1E1E", rot=0, weight=600, extra=""):
    return f'<div style="position:absolute; left:{x}px; top:{y}px; width:{w}px; {FONT} font-size:{size}px; line-height:1.12; font-weight:{weight}; color:{color}; transform:rotate({rot}deg); {extra}">{s}</div>'

def svg(w, h, body):
    return f'<svg width="{w}" height="{h}" viewBox="0 0 {w} {h}" style="position:absolute; left:0; top:0; overflow:visible" fill="none" stroke-linecap="round" stroke-linejoin="round">{body}</svg>'

# ------------------------------------------------------------------ Handovo · FigJam
HO = dict(
  saw=["Huddle plan never reached the 2 pm shift", "Task buried in a 200-message WhatsApp group", "Manager walks the floor asking “who did this?”", "Head-office brief done late, or differently", "“I never saw that message”"],
  whys=["Tasks don’t get done on time", "People didn’t know it was theirs", "It was said once, at the huddle or in the group", "No one owns each task or follows it up", "Only the manager can"],
  root="The manager is the only router of every task and every decision",
  hmw="HMW let the manager say it once, and have it reach the right person, followed up, without losing control?",
  ideas=["One goal in, tasks out with an owner + reason", "Staff stay in WhatsApp", "The agent follows up, not the manager", "Manager sets what it may do alone"],
  dead=[("New app for staff", "they won’t install it"), ("Fully automatic AI", "managers won’t trust it"), ("Stricter group rules", "doesn’t scale")])

def handovo(d=HO):
    W, H = 1200, 940
    o = []
    sec = lambda x, y, w, h, name, col: (f'<div style="position:absolute; left:{x}px; top:{y}px; width:{w}px; height:{h}px; border-radius:14px; background:{col}; border:1px solid rgba(0,0,0,.06)"></div>'
                                         f'<div style="position:absolute; left:{x}px; top:{y - 30}px; font:600 13px/1 Inter; color:#333; padding:6px 10px; border-radius:6px; background:#fff; box-shadow:0 1px 2px rgba(0,0,0,.12)">{name}</div>')
    o += [sec(28, 70, 400, 700, "From the floor · my VM years + chats", "rgba(255,224,122,.16)"), sec(470, 70, 330, 840, "5 whys", "rgba(151,71,255,.07)"), sec(842, 70, 330, 840, "How might we…", "rgba(13,153,255,.07)")]
    cols = ["#FFE07A", "#FFB8A8", "#A8D8FF", "#9FE3B4", "#D9C2FF"]
    pos = [(48, 96, -1.5), (238, 104, 1.2), (52, 300, 1), (242, 296, -1.8), (140, 500, .8)]
    for i, (x, y, r) in enumerate(pos):
        o.append(f'<div style="position:absolute; left:{x}px; top:{y}px; width:172px; height:168px; padding:14px 14px; background:{cols[i]}; transform:rotate({r}deg); box-shadow:0 2px 3px rgba(0,0,0,.12), 0 8px 16px -8px rgba(0,0,0,.18)">'
                 f'<p style="{FONT} font-size:23px; line-height:1.1; font-weight:600; color:#1E1E1E">{E(d["saw"][i])}</p><p style="position:absolute; left:14px; bottom:10px; font:500 10px/1 Inter; color:rgba(0,0,0,.42)">Sijo Joseph</p></div>')
    o.append(t(60, 700, 330, "same 4 stories in every store I asked →", 22, "#7A6A2B", -1))
    # whys chain
    for i, w in enumerate(d["whys"]):
        y = 104 + i * 112
        o.append(f'<div style="position:absolute; left:492px; top:{y}px; width:286px; height:76px; border-radius:12px; background:#fff; border:2px solid #9747FF; padding:9px 14px">'
                 f'<p style="font:600 11px/1 Inter; color:#9747FF; letter-spacing:.04em">WHY {i + 1}</p><p style="{FONT} font-size:23px; line-height:1.08; font-weight:600; color:#1E1E1E; margin-top:4px">{E(w)}</p></div>')
    o.append(f'<div style="position:absolute; left:500px; top:690px; width:270px; height:150px; padding:16px; background:#FF8577; transform:rotate(-2deg); box-shadow:0 2px 3px rgba(0,0,0,.12), 0 10px 18px -8px rgba(0,0,0,.2)"><p style="{FONT} font-size:27px; line-height:1.08; font-weight:700; color:#1E1E1E">{E(d["root"])}</p></div>')
    o.append(t(560, 852, 240, "← the root cause", 30, "#F24822", -3, 700))
    # how might we
    o.append(f'<div style="position:absolute; left:862px; top:100px; width:290px; height:190px; padding:16px; background:#A8D8FF; transform:rotate(1deg); box-shadow:0 2px 3px rgba(0,0,0,.12), 0 8px 16px -8px rgba(0,0,0,.18)"><p style="{FONT} font-size:25px; line-height:1.1; font-weight:600; color:#1E1E1E">{E(d["hmw"])}</p></div>')
    for i, idea in enumerate(d["ideas"]):
        x, y = 862 + (i % 2) * 150, 330 + (i // 2) * 150
        dots = ''.join(f'<i style="display:inline-block; width:12px; height:12px; border-radius:50%; background:#9747FF; margin-right:4px"></i>' for _ in range(3 - i % 2))
        o.append(f'<div style="position:absolute; left:{x}px; top:{y}px; width:138px; height:134px; padding:12px; background:#9FE3B4; transform:rotate({(-1) ** i * 1.2}deg); box-shadow:0 2px 3px rgba(0,0,0,.12)"><p style="{FONT} font-size:21px; line-height:1.08; font-weight:600; color:#1E1E1E">{E(idea)}</p><p style="position:absolute; left:12px; bottom:10px">{dots}</p></div>')
    o.append(t(866, 640, 280, "nope:", 26, "#F24822", -2, 700))
    for i, (a, why) in enumerate(d["dead"]):
        y = 680 + i * 74
        o.append(f'<div style="position:absolute; left:862px; top:{y}px; width:290px; height:62px; padding:8px 12px; background:#E6E6E6; transform:rotate({(-1) ** i * .8}deg)"><p style="{FONT} font-size:21px; line-height:1.05; font-weight:600; color:#555"><s style="text-decoration-color:#F24822; text-decoration-thickness:3px; color:#1E1E1E">{E(a)}</s><br>{E(why)}</p></div>')
    arrow = lambda p: f'<path d="{p}" stroke="#757575" stroke-width="2.2"/>'
    head = lambda x, y, a: f'<path d="M{x} {y} l{-12 if a == "r" else 12} -7 M{x} {y} l{-12 if a == "r" else 12} 7" stroke="#757575" stroke-width="2.2"/>' if a in "rl" else f'<path d="M{x} {y} l-7 -12 M{x} {y} l7 -12" stroke="#757575" stroke-width="2.2"/>'
    body = arrow("M412 420 C 440 420, 450 140, 488 140") + head(488, 140, "r")
    body += ''.join(arrow(f"M635 {180 + i * 112} L635 {214 + i * 112}") + head(635, 214 + i * 112, "d") for i in range(4))
    body += arrow("M635 628 L635 684") + head(635, 684, "d")
    body += arrow("M772 760 C 820 760, 820 196, 858 196") + head(858, 196, "r")
    # FigJam marker: a red loop around the root cause
    body += '<path d="M488 712 C 470 640, 640 650, 760 672 C 820 690, 800 850, 690 856 C 560 864, 470 820, 492 726" stroke="#F24822" stroke-width="4.5" opacity=".9"/>'
    cursor = f'<div style="position:absolute; left:770px; top:820px"><svg width="22" height="26" viewBox="0 0 22 26"><path d="M2 2 L2 21 L7 16 L11 24 L14 22.5 L10 15 L17 15 Z" fill="#0D99FF" stroke="#fff" stroke-width="1.5"/></svg><span style="position:absolute; left:16px; top:20px; font:600 12px/1 Inter; color:#fff; background:#0D99FF; padding:4px 7px; border-radius:4px 10px 10px 10px">Sijo</span></div>'
    grid = "background:#F4F4F4; background-image:radial-gradient(circle, #D2D2D2 1.1px, transparent 1.3px); background-size:24px 24px;"
    return f'<div style="position:relative; width:{W}px; height:{H}px; border-radius:16px; {grid} box-shadow:inset 0 0 0 1px #E2E2E2; overflow:hidden">{svg(W, H, body)}{"".join(o)}{cursor}</div>'

# ------------------------------------------------------------------ Carekin · notebook fishbone
def _carekin_board(d):
    W, H, ink, pen, coral = 1280, 1010, "#22324A", "#5E6B7A", "#D9573A"
    paper = ("background:#FDFCF6; background-image:linear-gradient(90deg, transparent 98px, #F2B8B5 98px, #F2B8B5 100px, transparent 100px),"
             " repeating-linear-gradient(180deg, transparent 0 33px, #D9E5F0 33px 34px);")
    holes = ''.join(f'<i style="position:absolute; left:28px; top:{40 + k * 70}px; width:22px; height:22px; border-radius:50%; background:#E9E6DD; box-shadow:inset 0 2px 3px rgba(0,0,0,.25)"></i>' for k in range(14))
    o = [holes]
    o.append(t(130, 26, 900, "Why do wrong doses happen? <span style='font-size:24px; color:#5E6B7A'>(fishbone, after talking to families)</span>", 36, ink, 0, 700))
    # capsule doodle
    o.append(svg(W, H, '<g transform="translate(1110 30) rotate(-25)"><rect x="0" y="0" width="90" height="36" rx="18" stroke="#22324A" stroke-width="2.5"/><path d="M45 0 L45 36" stroke="#22324A" stroke-width="2.5"/><path d="M48 3 C 60 3, 84 3, 86 18 C 84 33, 60 33, 48 33 Z" fill="rgba(255,138,107,.55)" stroke="none"/></g>'))
    bones = ('<path d="M140 330 C 400 326, 700 334, 960 330" stroke="#22324A" stroke-width="3.2"/>'
             '<path d="M960 330 l-18 -10 M960 330 l-18 10" stroke="#22324A" stroke-width="3"/>'
             + ''.join(f'<path d="M{x} 330 C {x - 30} {300 if up else 360}, {x - 80} {200 if up else 460}, {x - 110} {150 if up else 510}" stroke="#22324A" stroke-width="2.4"/>'
                       for x, up in [(530, 1), (900, 1), (530, 0), (900, 0)]))
    o.append(svg(W, H, bones))
    o.append(f'<div style="position:absolute; left:972px; top:282px; width:250px; padding:16px 18px; {FONT} font-size:30px; line-height:1.1; font-weight:700; color:{ink}">A wrong dose<br>is given</div>')
    o.append(svg(W, H, '<path d="M970 280 C 1060 272, 1180 276, 1236 284 C 1242 320, 1240 360, 1232 384 C 1140 390, 1050 388, 976 382 C 968 350, 966 310, 970 280 Z" stroke="#D9573A" stroke-width="3"/>'))
    cats = [(110, 108, "PEOPLE", ["helper finds out last", "brother in Dubai has to call"]), (470, 108, "MESSAGES", ["prescription = a WhatsApp photo", "nobody confirms it"]),
            (110, 520, "MOMENTS", ["right after the doctor changes a dose", "two people, same evening dose"]), (470, 520, "TOOLS", ["a notebook in the kitchen", "nothing shows the whole plan"])]
    for x, y, cat, items in cats:
        o.append(t(x, y, 300, f'<u style="text-decoration-color:{coral}; text-decoration-thickness:2px; text-underline-offset:4px">{cat}</u>', 26, coral, 0, 700, "text-align:right"))
        for k, it in enumerate(items):
            o.append(t(x, y + 40 + k * 34, 300, E(it) + " –", 23, pen, 0, 600, "text-align:right"))
    # root cause, highlighted
    o.append(t(130, 640, 120, "so…", 30, pen, -4, 700))
    o.append(f'<div style="position:absolute; left:130px; top:690px; width:600px; {FONT} font-size:34px; line-height:1.15; font-weight:700; color:{ink}"><span style="background:linear-gradient(transparent 38%, rgba(126,224,198,.7) 38%, rgba(126,224,198,.7) 88%, transparent 88%); padding:0 4px; box-decoration-break:clone; -webkit-box-decoration-break:clone">{E(d["root"])}</span></div>')
    o.append(t(130, 790, 600, "← root cause. not one careless person. the system.", 24, coral, -1, 700))
    o.append(t(130, 856, 600, "<b style='font-size:30px'>HMW</b> " + E(d["hmw"].lstrip("…")), 26, ink, 0, 600))
    # ideas list
    o.append(t(800, 650, 400, "<u style='text-underline-offset:5px'>ideas</u>", 30, ink, 0, 700))
    tick = '<svg width="24" height="24" viewBox="0 0 24 24" style="flex:none"><rect x="2" y="3" width="19" height="18" rx="3" stroke="#22324A" stroke-width="2" fill="none"/><path d="M6 12 L10 16 L20 4" stroke="#0F766E" stroke-width="3" fill="none" stroke-linecap="round"/></svg>'
    for k, idea in enumerate(d["ideas"]):
        o.append(f'<div style="position:absolute; left:800px; top:{698 + k * 44}px; width:440px; display:flex; gap:10px; align-items:center; {FONT} font-size:24px; font-weight:600; color:{ink}">{tick}{E(idea)}</div>')
    for k, (a, why) in enumerate(d["dead"]):
        o.append(f'<div style="position:absolute; left:800px; top:{890 + k * 38}px; width:440px; {FONT} font-size:22px; font-weight:600; color:{pen}"><s style="text-decoration-color:{coral}; text-decoration-thickness:3px; color:{ink}">{E(a)}</s>, {E(why)}</div>')
    return f'<div style="position:relative; width:{W}px; height:{H}px; border-radius:6px; {paper} box-shadow:0 1px 0 #E5E1D6, 0 24px 50px -30px rgba(0,0,0,.35); overflow:hidden">{"".join(o)}</div>'

def _carekin_v219(d):
    """v219: the same notebook, written in the case's own Google Sans Flex instead of handwriting (sizes x0.74, no tilt)."""
    global FONT
    old, FONT = FONT, "font-family:GSFlex,sans-serif;"
    try: h = _carekin_board(d)
    finally: FONT = old
    h = re.sub(r'font-size:(\d+)px', lambda m: 'font-size:%dpx' % round(int(m.group(1)) * .74), h)
    h = re.sub(r'font-weight:\s*[67]00', 'font-weight:500', h)
    return re.sub(r'rotate\((-?\d+)deg\)', 'rotate(0deg)', h)

# ------------------------------------------------------------------ Syntra · sketchbook mind map
def syntra(d):
    W, H, pen, amber, brown = 1200, 1040, "#5B4128", "#DD8020", "#975C1C"
    paper = ("background:#F8EEDF; background-image:radial-gradient(rgba(140,90,40,.07) 1px, transparent 1.4px), radial-gradient(rgba(140,90,40,.05) 1px, transparent 1.4px);"
             " background-size:7px 7px, 11px 11px; background-position:0 0, 3px 5px;")
    tape = lambda x, r: f'<i style="position:absolute; left:{x}px; top:-8px; width:120px; height:34px; background:rgba(255,255,255,.55); transform:rotate({r}deg); box-shadow:0 1px 2px rgba(0,0,0,.08)"></i>'
    o = [tape(60, -4), tape(1010, 5)]
    # centre question in a marker blob
    o.append(svg(W, H, f'<path d="M430 300 C 470 250, 700 238, 770 268 C 830 296, 820 400, 760 420 C 660 450, 470 446, 420 404 C 386 372, 396 334, 430 300 Z" stroke="{amber}" stroke-width="5" opacity=".9"/>'))
    o.append(t(452, 300, 330, "Why do shoppers leave without buying?", 33, pen, -1, 700, "text-align:center"))
    spots = [(40, 40, -3), (430, 40, 2), (860, 50, -2), (40, 300, 2), (880, 300, -3)]
    branches = ["M250 110 C 330 160, 380 230, 440 300", "M600 128 C 600 180, 600 220, 600 252", "M920 120 C 860 180, 820 230, 770 280", "M300 350 C 350 350, 380 350, 410 350", "M880 350 C 850 352, 820 352, 800 352"]
    o.append(svg(W, H, ''.join(f'<path d="{b}" stroke="{pen}" stroke-width="2" stroke-dasharray="1 0"/>' for b in branches)))
    for (x, y, r), s in zip(spots, d["saw"]):
        o.append(t(x, y, 300, E(s), 25, pen, r, 600))
    # why staircase
    o.append(t(60, 500, 200, "why? why? why?", 30, amber, -3, 700))
    for k, w in enumerate(d["whys"]):
        x, y = 60 + k * 56, 560 + k * 50
        o.append(t(x, y, 640 - k * 56, f'<span style="color:{amber}">↳</span> {E(w)}', 25, pen, 0, 600))
    # root cause, highlighted with amber
    o.append(f'<div style="position:absolute; left:60px; top:850px; width:620px; {FONT} font-size:35px; line-height:1.15; font-weight:700; color:{pen}; transform:rotate(-1deg)"><span style="background:linear-gradient(100deg, rgba(249,156,54,.0) 0%, rgba(249,156,54,.42) 4%, rgba(249,156,54,.36) 96%, rgba(249,156,54,0) 100%); padding:0 6px; box-decoration-break:clone; -webkit-box-decoration-break:clone">{E(d["root"])}</span></div>')
    o.append(t(64, 806, 300, "ROOT CAUSE ↓", 26, brown, -2, 700))
    # HMW + ideas with doodles
    o.append(t(740, 500, 420, "<b>HMW</b> " + E(d["hmw"].lstrip("…")), 27, pen, 1, 600))
    o.append(svg(W, H, f'<path d="M742 616 C 860 606, 1000 610, 1140 604" stroke="{amber}" stroke-width="3.5"/>'))
    doodles = [  # knob, screen, VR headset, ticket
      f'<circle cx="22" cy="22" r="18" stroke="{pen}" stroke-width="2.2"/><path d="M22 22 L22 8" stroke="{amber}" stroke-width="3"/>',
      f'<rect x="3" y="7" width="38" height="28" rx="3" stroke="{pen}" stroke-width="2.2"/><path d="M14 40 L30 40" stroke="{pen}" stroke-width="2.2"/>',
      f'<rect x="2" y="10" width="40" height="22" rx="9" stroke="{pen}" stroke-width="2.2"/><circle cx="13" cy="21" r="5" stroke="{amber}" stroke-width="2"/><circle cx="31" cy="21" r="5" stroke="{amber}" stroke-width="2"/>',
      f'<path d="M10 3 L34 3 L34 37 L30 33 L26 37 L22 33 L18 37 L14 33 L10 37 Z" stroke="{pen}" stroke-width="2.2"/><path d="M15 12 L29 12 M15 18 L26 18" stroke="{amber}" stroke-width="2"/>']
    for k, (idea, dd) in enumerate(zip(d["ideas"], doodles)):
        y = 640 + k * 64
        o.append(f'<div style="position:absolute; left:744px; top:{y}px"><svg width="44" height="44" viewBox="0 0 44 44" fill="none" stroke-linecap="round" stroke-linejoin="round">{dd}</svg></div>')
        o.append(t(800, y + 4, 380, E(idea), 25, pen, 0, 600))
    for k, (a, why) in enumerate(d["dead"]):
        y = 910 + k * 38
        o.append(t(744, y, 430, f'<s style="text-decoration-color:{amber}; text-decoration-thickness:4px; color:{pen}">{E(a)}</s> <span style="color:#8A6A4A">{E(why)}</span>', 23, pen, (-1) ** k * .6, 600))
    return f'<div style="position:relative; width:{W}px; height:{H}px; border-radius:4px; {paper} box-shadow:0 30px 60px -36px rgba(90,50,10,.45), 0 0 0 1px rgba(150,100,50,.12); overflow:hidden">{"".join(o)}</div>'

# ------------------------------------------------------------------ v220 Syntra: three more sketchbook pages, same paper and pen
def _sy_page(W, H, body):
    paper = ("background:#F8EEDF; background-image:radial-gradient(rgba(140,90,40,.07) 1px, transparent 1.4px), radial-gradient(rgba(140,90,40,.05) 1px, transparent 1.4px);"
             " background-size:7px 7px, 11px 11px; background-position:0 0, 3px 5px;")
    tape = lambda x, r: f'<i style="position:absolute; left:{x}px; top:-8px; width:120px; height:34px; background:rgba(255,255,255,.55); transform:rotate({r}deg); box-shadow:0 1px 2px rgba(0,0,0,.08)"></i>'
    return (f'<div class="board" style="position:relative; width:{W}px; height:{H}px; border-radius:4px; {paper} box-shadow:0 30px 60px -36px rgba(90,50,10,.45), 0 0 0 1px rgba(150,100,50,.12); overflow:hidden">'
            + tape(70, -3) + tape(W - 190, 4) + ''.join(body) + '</div>')

def _sticky(x, y, w, text, bg, r):
    return (f'<div style="position:absolute; left:{x}px; top:{y}px; width:{w}px; padding:16px 16px 18px; background:{bg}; transform:rotate({r}deg); box-shadow:0 10px 16px -10px rgba(90,50,10,.45)">'
            f'<p style="{FONT} font-size:27px; line-height:1.12; font-weight:600; color:#3E2B18">{E(text)}</p></div>')

def syntra_affinity(d):
    """Sticky notes from the store visits, grouped into four themes, each ending in what it asks of the design."""
    W, H, pen, amber = 1200, 700, "#5B4128", "#DD8020"
    o = [t(60, 40, 900, "What we heard in stores, grouped", 38, pen, -1, 700), t(62, 92, 900, "from our store visits, grouped into four themes", 22, "#8A6A4A", 0, 600)]
    cols = ["#FFE7A6", "#FFD3B0", "#F7E2C2", "#FFEBC8"]
    for k, (head, notes, so) in enumerate(d):
        x = 50 + k * 285
        o.append(t(x, 160, 260, f'<u style="text-decoration-color:{amber}; text-decoration-thickness:3px; text-underline-offset:5px">{E(head)}</u>', 28, amber, 0, 700))
        for n, note in enumerate(notes):
            o.append(_sticky(x + (n % 2) * 10, 214 + n * 158, 250, note, cols[(k + n) % 4], (-1) ** (k + n) * 1.6))
        o.append(t(x, 556, 250, f'<span style="color:{amber}">so →</span> {E(so)}', 24, pen, 0, 700))
    o.append(svg(W, H, ''.join(f'<path d="M{50 + k * 285} 542 C {120 + k * 285} 536, {200 + k * 285} 538, {290 + k * 285 - 40} 542" stroke="{amber}" stroke-width="2.5"/>' for k in range(4))))
    o.append(t(60, 636, 1000, "the shelf speaks in notes and names; people speak in feelings and places", 27, pen, -1, 700, "background:linear-gradient(100deg, rgba(249,156,54,0) 0%, rgba(249,156,54,.36) 3%, rgba(249,156,54,.3) 97%, rgba(249,156,54,0) 100%); padding:0 6px; width:auto"))
    return _sy_page(W, H, o)

def syntra_match(d):
    """The match worked out on paper: the controls, the count, and the fairness trade-off."""
    W, H, pen, amber, brown = 1200, 760, "#5B4128", "#DD8020", "#975C1C"
    o = [t(60, 40, 900, "How should a feeling pick a bottle?", 38, pen, -1, 700)]
    # the controls, sketched
    ctl = (f'<circle cx="170" cy="250" r="78" stroke="{pen}" stroke-width="3"/><path d="M170 250 L170 186" stroke="{amber}" stroke-width="5"/>'
           + ''.join(f'<path d="M{300 + k * 80} 176 L{300 + k * 80} 324" stroke="{pen}" stroke-width="3"/><rect x="{288 + k * 80}" y="{200 + k * 40}" width="24" height="16" rx="4" stroke="{amber}" stroke-width="3"/>' for k in range(3)))
    o.append(svg(W, H, ctl))
    o.append(t(110, 344, 140, "mood", 24, pen, 0, 700, "text-align:center"))
    for k, lab in enumerate(d["sliders"]):
        o.append(t(262 + k * 80, 344, 80, lab, 20, pen, 0, 700, "text-align:center"))
    o.append(t(60, 410, 560, d["count"], 30, pen, 0, 700))
    o.append(t(60, 456, 560, d["bottles"], 26, "#8A6A4A", 0, 600))
    # two ways to pick
    o.append(t(640, 150, 500, "way 1: best scent for every setting", 26, pen, 0, 700))
    o.append(t(640, 192, 500, f'<s style="text-decoration-color:{amber}; text-decoration-thickness:4px">{E(d["greedy"])}</s>', 24, pen, 0, 600))
    o.append(t(640, 290, 500, "way 2: one-to-one, every bottle gets its turn", 26, pen, 0, 700))
    o.append(t(640, 332, 500, E(d["fair"]), 24, pen, 0, 600))
    o.append(svg(W, H, f'<path d="M630 282 C 700 272, 1100 270, 1160 284 C 1168 330, 1166 372, 1156 392 C 1050 400, 700 402, 636 392 C 626 360, 624 310, 630 282 Z" stroke="{amber}" stroke-width="3.5"/>'))
    o.append(t(640, 470, 520, "what fairness costs", 28, brown, -1, 700))
    for k, line in enumerate(d["cost"]):
        o.append(t(640, 520 + k * 44, 520, f'<span style="color:{amber}">→</span> {E(line)}', 24, pen, 0, 600))
    o.append(t(60, 560, 520, "next", 28, brown, -1, 700))
    o.append(t(60, 606, 520, E(d["next"]), 24, pen, 0, 600))
    o.append(t(60, 690, 1080, d["verdict"], 28, pen, -1, 700, "background:linear-gradient(100deg, rgba(249,156,54,0) 0%, rgba(249,156,54,.36) 3%, rgba(249,156,54,.3) 97%, rgba(249,156,54,0) 100%); padding:0 6px"))
    return _sy_page(W, H, o)

def syntra_retro(d):
    """After the exhibit: what to keep, what we changed on the day, and what to measure next time."""
    W, H, pen, amber = 1200, 700, "#5B4128", "#DD8020"
    o = [t(60, 40, 900, "After the exhibit: keep, change, measure", 38, pen, -1, 700), t(62, 92, 900, "from what we saw at the kiosk", 22, "#8A6A4A", 0, 600)]
    cols = [("KEEP", "#E9F2D9"), ("CHANGED ON THE DAY", "#FFE7A6"), ("MEASURE NEXT TIME", "#FFD3B0")]
    for k, (head, bg) in enumerate(cols):
        x = 50 + k * 380
        o.append(t(x, 160, 360, f'<u style="text-decoration-color:{amber}; text-decoration-thickness:3px; text-underline-offset:5px">{head}</u>', 26, amber, 0, 700))
        for n, note in enumerate(d[k]):
            o.append(_sticky(x + (n % 2) * 12, 214 + n * 152, 330, note, bg, (-1) ** (k + n) * 1.4))
    o.append(svg(W, H, ''.join(f'<path d="M{410 + k * 380} 170 C {412 + k * 380} 360, {408 + k * 380} 520, {411 + k * 380} 660" stroke="#C9B08C" stroke-width="2" stroke-dasharray="6 8"/>' for k in range(2))))
    return _sy_page(W, H, o)

# ------------------------------------------------------------------ v221 blue-pen design-process board (Sijo's reference: a thesis process sheet)
INK = "#2430C9"
PEN = "font-family:Caveat,cursive; color:" + INK + ";"
def _box(x, y, w, h, head, body="", r="28px 22px 32px 24px / 24px 30px 22px 28px", extra=""):
    return (f'<div style="position:absolute; left:{x}px; top:{y}px; width:{w}px; height:{h}px; box-sizing:border-box; border:3px solid {INK}; border-radius:{r}; padding:14px 22px; {extra}">'
            f'<p style="{PEN} font-size:40px; line-height:1; font-weight:700; letter-spacing:.04em">{head}</p>' + (f'<p style="{PEN} font-size:27px; line-height:1.12; font-weight:600; margin-top:8px">{body}</p>' if body else '') + '</div>')
def _arrow(x1, y1, x2, y2, bend=0):
    mx, my = (x1 + x2) / 2 + bend, (y1 + y2) / 2
    import math; a = math.atan2(y2 - my, x2 - mx); h = 16
    p1 = (x2 - h * math.cos(a - .45), y2 - h * math.sin(a - .45)); p2 = (x2 - h * math.cos(a + .45), y2 - h * math.sin(a + .45))
    return f'<path d="M{x1} {y1} Q {mx} {my} {x2} {y2} M{p1[0]:.0f} {p1[1]:.0f} L{x2} {y2} L{p2[0]:.0f} {p2[1]:.0f}" stroke="{INK}" stroke-width="3"/>'
def _bracket(x, y1, y2, label):
    return (svg(1200, 1560, f'<path d="M{x + 30} {y1} L{x} {y1} L{x} {y2} L{x + 30} {y2}" stroke="{INK}" stroke-width="3"/>')
            + f'<div style="position:absolute; left:{x - 26}px; top:{(y1 + y2) // 2}px; transform:translate(-50%,-50%) rotate(-90deg); white-space:nowrap; {PEN} font-size:30px; font-weight:700; letter-spacing:.08em">{label}</div>')

def pen_flow(d, project, concept, design):
    W, H = 1200, 1600
    s = lambda a: E(a)
    o = [f'<div style="position:absolute; left:0; right:0; top:34px; text-align:center; {PEN} font-size:76px; font-weight:700; letter-spacing:.08em">DESIGN PROCESS</div>',
         f'<div style="position:absolute; left:0; right:0; top:120px; text-align:center; {PEN} font-size:50px; font-weight:700; letter-spacing:.06em">FOR {s(project.upper())}</div>',
         svg(W, H, f'<path d="M300 186 C 520 182, 760 190, 930 184" stroke="{INK}" stroke-width="3"/>')]
    cx, cw = 330, 520
    o.append(_box(cx, 230, cw, 170, "QUESTION", "(" + s(d["hmw"].lstrip("…").replace("HMW ", "how might we ")) + ")"))
    o.append(_box(cx, 450, cw, 230, "WHAT I SAW", "<br>".join("· " + s(x) for x in d["saw"][:3])))
    o.append(_box(cx, 730, cw, 230, "WHY? WHY? WHY?", "<br>".join("→ " + s(x) for x in d["whys"][:4])))
    o.append(_box(cx, 1010, cw, 150, "ROOT CAUSE", s(d["root"]), extra=f"box-shadow:0 0 0 6px #fff, 0 0 0 9px {INK}"))
    o.append(_box(cx, 1210, cw, 160, "CONCEPT", s(concept)))
    o.append(_box(cx + 20, 1416, cw - 40, 140, "THE DESIGN", s(design), r="40px 34px 44px 30px / 34px 42px 30px 40px"))
    # ideas, and what got crossed out
    o.append(_box(880, 820, 230, 70, "IDEAS", r="40px"))
    o.append(f'<div style="position:absolute; left:892px; top:905px; width:205px; {PEN} font-size:23px; line-height:1.12; font-weight:600">' + "<br>".join("+ " + s(x) for x in d["ideas"][:4]) + '</div>')
    o.append(_box(104, 1180, 210, 70, "NOT THIS", r="40px", extra="padding:14px 18px; white-space:nowrap"))
    o.append(f'<div style="position:absolute; left:110px; top:1268px; width:210px; {PEN} font-size:23px; line-height:1.1; font-weight:600">' + "<br>".join(f'<s style="text-decoration-thickness:3px">{s(a)}</s>' for a, _ in d["dead"][:3]) + '</div>')
    # the loop: the design is the answered question
    o.append(f'<div style="position:absolute; left:1110px; top:520px; width:64px; height:760px; box-sizing:border-box; border:3px solid {INK}; border-radius:34px"></div>')
    o.append(f'<div style="position:absolute; left:1142px; top:900px; transform:translate(-50%,-50%) rotate(-90deg); white-space:nowrap; {PEN} font-size:27px; font-weight:400; letter-spacing:.06em">THE DESIGN IS THE ANSWERED QUESTION</div>')
    o.append(svg(W, H, _arrow(590, 400, 590, 446) + _arrow(590, 680, 590, 726) + _arrow(590, 960, 590, 1006) + _arrow(590, 1160, 590, 1206) + _arrow(590, 1370, 590, 1416)
                 + _arrow(995, 820, 852, 760, -20) + _arrow(882, 870, 854, 1250, -70) + _arrow(314, 1215, 328, 1250, -10)
                 + f'<path d="M810 1480 C 1000 1490, 1140 1440, 1142 1282" stroke="{INK}" stroke-width="3"/>' + _arrow(1142, 518, 852, 300, -60)))
    o += [_bracket(64, 230, 680, "LISTENING"), _bracket(64, 730, 1160, "DEFINING"), _bracket(64, 1210, 1556, "DECIDING")]
    return f'<div class="board" style="position:relative; width:{W}px; height:{H}px; background:#FDFDFB; border-radius:4px; box-shadow:0 30px 60px -40px rgba(20,30,90,.35), 0 0 0 1px rgba(36,48,201,.08); overflow:hidden">{"".join(o)}</div>'

def pen_skin(h):
    """v221: the Syntra sketchbook pages in the same blue pen on white."""
    for c in ("#5B4128", "#DD8020", "#975C1C", "#8A6A4A", "#3E2B18", "#C9B08C", "#5B4128"):
        h = h.replace(c, INK)
    h = re.sub(r'background:#F8EEDF;[^"]*?background-position:0 0, 3px 5px;', 'background:#FDFDFB;', h)
    h = re.sub(r'background:(#E9F2D9|#FFE7A6|#FFD3B0|#F7E2C2|#FFEBC8); transform', f'background:transparent; border:3px solid {INK}; border-radius:26px 20px 30px 22px / 22px 28px 20px 26px; transform', h)
    h = h.replace('box-shadow:0 10px 16px -10px rgba(90,50,10,.45)', 'box-shadow:none').replace('rgba(249,156,54,', 'rgba(36,48,201,')
    return h

CONCEPT = {"carekin": ("One plan, seen three ways: the app for Priya, WhatsApp for Lakshmi, one button at home", "Carekin: an Android app + WhatsApp"),
           "syntra": ("Find it by feeling, step inside it in VR, take it home in AR", "Syntra: a knob, three sliders, nine VR worlds, an AR ticket"),
           "handovo": ("One goal in; the agent turns it into tasks in each person’s WhatsApp, within the manager’s limits", "Handovo: a control room + WhatsApp")}
def carekin(d): return pen_flow(d, "Carekin", *CONCEPT["carekin"])
_syntra_v202 = syntra
def syntra(d): return pen_flow(d, "Syntra", *CONCEPT["syntra"])
def handovo_pen(): return pen_flow(HO, "Handovo", *CONCEPT["handovo"])
for _n in ("syntra_affinity", "syntra_match", "syntra_retro"):
    globals()["_" + _n] = globals()[_n]
    globals()[_n] = (lambda f: (lambda d: pen_skin(f(d))))(globals()["_" + _n])

# ------------------------------------------------------------------ v221b: drawn by hand. Every line wobbles, overshoots a little and some get a second pass.
import random as _rnd
_R = _rnd.Random(7)
_INKF = ('<defs><filter id="ink" x="-2%" y="-2%" width="104%" height="104%"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="3"/>'
         '<feDisplacementMap in="SourceGraphic" scale="1.6"/></filter></defs>')
def _j(v, a=2.2): return v + _R.uniform(-a, a)
def _hline(pts, w=3.0, passes=1):
    """A hand line through points: jittered, smooth (Catmull-Rom), drawn once or twice."""
    out = []
    for k in range(passes):
        P = [(_j(x), _j(y)) for x, y in pts]
        d = f'M{P[0][0]:.1f} {P[0][1]:.1f}'
        for i in range(len(P) - 1):
            p0 = P[i - 1] if i else P[i]; p1, p2 = P[i], P[i + 1]; p3 = P[i + 2] if i + 2 < len(P) else p2
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6); c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
            d += f' C{c1[0]:.1f} {c1[1]:.1f} {c2[0]:.1f} {c2[1]:.1f} {p2[0]:.1f} {p2[1]:.1f}'
        out.append(f'<path d="{d}" stroke="{INK}" stroke-width="{w * _R.uniform(.85, 1.15):.2f}" opacity="{.92 if k == 0 else .55}"/>')
    return ''.join(out)
def _seg(x1, y1, x2, y2, n=4):
    return [(x1 + (x2 - x1) * t / n + _R.uniform(-1.5, 1.5), y1 + (y2 - y1) * t / n + _R.uniform(-1.5, 1.5)) for t in range(n + 1)]
def _hbox(x, y, w, h, r=26, passes=1):
    """A rounded box drawn in one go, starting top-left, ending with a small overshoot past where it began."""
    pts = [(x + r, y)] + _seg(x + r, y, x + w - r, y)[1:] + [(x + w - r * .3, y + r * .3), (x + w, y + r)] + _seg(x + w, y + r, x + w, y + h - r)[1:] \
        + [(x + w - r * .3, y + h - r * .3), (x + w - r, y + h)] + _seg(x + w - r, y + h, x + r, y + h)[1:] + [(x + r * .3, y + h - r * .3), (x, y + h - r)] \
        + _seg(x, y + h - r, x, y + r)[1:] + [(x + r * .3, y + r * .3), (x + r + 14, y - 2)]
    return _hline(pts, 3.1, passes)
def _harrow(x1, y1, x2, y2, bend=0):
    import math
    mx, my = (x1 + x2) / 2 + bend, (y1 + y2) / 2
    a = math.atan2(y2 - my, x2 - mx); h = _R.uniform(14, 18)
    return (_hline([(x1, y1), (mx * .5 + (x1 + x2) / 4, my * .5 + (y1 + y2) / 4), (x2, y2)], 2.8)
            + _hline([(x2 - h * math.cos(a - .5), y2 - h * math.sin(a - .5)), (x2, y2), (x2 - h * math.cos(a + .5), y2 - h * math.sin(a + .5))], 2.8))

def _ptext(x, y, w, html, size, weight=600, extra=""):
    return f'<div style="position:absolute; left:{x}px; top:{y}px; width:{w}px; {PEN} font-size:{size}px; line-height:1.12; font-weight:{weight}; transform:rotate({_R.uniform(-1.1, 1.1):.2f}deg); {extra}">{html}</div>'

def pen_flow(d, project, concept, design):
    _R.seed(len(project) * 31)
    W, H = 1200, 1600; s = E; st = []; o = []
    o.append(_ptext(0, 30, W, "DESIGN PROCESS", 78, 700, "text-align:center; letter-spacing:.08em"))
    o.append(_ptext(0, 118, W, "FOR " + s(project.upper()), 52, 700, "text-align:center; letter-spacing:.06em"))
    st.append(_hline(_seg(300, 188, 930, 182, 6), 3.2, 2))
    cx, cw = 330, 520
    def box(x, y, w, h, head, body="", r=26, passes=1, hs=40):
        st.append(_hbox(x, y, w, h, r, passes))
        o.append(_ptext(x + 22, y + 14, w - 40, head, hs, 700, "letter-spacing:.04em"))
        if body: o.append(_ptext(x + 22, y + 14 + hs + 6, w - 40, body, 27))
    box(cx, 230, cw, 170, "QUESTION", "(" + s(d["hmw"].lstrip("…").replace("HMW ", "how might we ")) + ")")
    box(cx, 450, cw, 230, "WHAT I SAW", "<br>".join("· " + s(x) for x in d["saw"][:3]))
    box(cx, 730, cw, 230, "WHY? WHY? WHY?", "<br>".join("→ " + s(x) for x in d["whys"][:4]))
    box(cx, 1010, cw, 150, "ROOT CAUSE", s(d["root"]), passes=2); st.append(_hbox(cx - 8, 1002, cw + 16, 166, 30))
    box(cx, 1210, cw, 160, "CONCEPT", s(concept))
    box(cx + 20, 1416, cw - 40, 140, "THE DESIGN", s(design), r=40, passes=2)
    box(880, 820, 230, 70, "IDEAS", r=34)
    o.append(_ptext(892, 905, 205, "<br>".join("+ " + s(x) for x in d["ideas"][:4]), 23))
    box(104, 1180, 210, 70, "NOT THIS", r=34)
    o.append(_ptext(110, 1268, 210, "<br>".join(f'<s style="text-decoration-thickness:3px">{s(a)}</s>' for a, _ in d["dead"][:3]), 23))
    st.append(_hbox(1110, 520, 64, 760, 32))
    o.append(f'<div style="position:absolute; left:1142px; top:900px; transform:translate(-50%,-50%) rotate(-90.6deg); white-space:nowrap; {PEN} font-size:27px; font-weight:400; letter-spacing:.06em">THE DESIGN IS THE ANSWERED QUESTION</div>')
    for a in [(590, 400, 590, 446), (590, 680, 590, 726), (590, 960, 590, 1000), (590, 1170, 590, 1206), (590, 1370, 590, 1412), (995, 820, 852, 760, -20), (882, 870, 854, 1250, -70), (314, 1215, 328, 1250, -10), (1142, 518, 852, 300, -60)]:
        st.append(_harrow(*a))
    st.append(_hline([(810, 1480), (960, 1488), (1100, 1440), (1142, 1360), (1142, 1284)], 3))
    for x, y1, y2, label in [(64, 230, 680, "LISTENING"), (64, 730, 1160, "DEFINING"), (64, 1210, 1556, "DECIDING")]:
        st.append(_hline([(x + 30, y1 + _R.uniform(-3, 3)), (x, y1), (x + _R.uniform(-2, 2), (y1 + y2) / 2), (x, y2), (x + 32, y2 + _R.uniform(-3, 3))], 3))
        o.append(f'<div style="position:absolute; left:{x - 26}px; top:{(y1 + y2) // 2}px; transform:translate(-50%,-50%) rotate({-90 + _R.uniform(-1, 1):.2f}deg); white-space:nowrap; {PEN} font-size:25px; font-weight:400; letter-spacing:.08em">{label}</div>')
    ink = f'<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" style="position:absolute; left:0; top:0; overflow:visible" fill="none" stroke-linecap="round" stroke-linejoin="round">{_INKF}<g filter="url(#ink)">{"".join(st)}</g></svg>'
    return f'<div class="board" style="position:relative; width:{W}px; height:{H}px; background:#FDFDFB; border-radius:4px; box-shadow:0 30px 60px -40px rgba(20,30,90,.35), 0 0 0 1px rgba(36,48,201,.08); overflow:hidden">{ink}{"".join(o)}</div>'

def pen_skin(h):
    """v221b: the Syntra sketchbook pages in blue pen on white, borders roughened like a ballpoint."""
    for c in ("#5B4128", "#DD8020", "#975C1C", "#8A6A4A", "#3E2B18", "#C9B08C"):
        h = h.replace(c, INK)
    h = re.sub(r'background:#F8EEDF;[^"]*?background-position:0 0, 3px 5px;', 'background:#FDFDFB;', h)
    h = re.sub(r'background:(#E9F2D9|#FFE7A6|#FFD3B0|#F7E2C2|#FFEBC8); transform', f'background:transparent; border:2.6px solid {INK}; border-radius:26px 18px 30px 20px / 20px 28px 18px 26px; filter:url(#inkb); transform', h)
    h = h.replace('box-shadow:0 10px 16px -10px rgba(90,50,10,.45)', 'box-shadow:none').replace('rgba(249,156,54,', 'rgba(36,48,201,')
    defs = ('<svg width="0" height="0" style="position:absolute"><filter id="inkb" x="-4%" y="-6%" width="108%" height="112%"><feTurbulence type="fractalNoise" baseFrequency=".035" numOctaves="2" seed="5" result="n"/>'
            '<feDisplacementMap in="SourceGraphic" in2="n" scale="5"/></filter></svg>')
    return h.replace('class="board" style="', 'class="board" style="', 1).replace('>', '>' + defs, 1)

# v221c: Sijo's reference lettering: Architects Daughter (OFL), regular weight only, sizes scaled for its wider letters
PEN = "font-family:ArchDaughter,cursive; color:" + INK + ";"
def _ptext(x, y, w, html, size, weight=400, extra=""):
    return f'<div style="position:absolute; left:{x}px; top:{y}px; width:{w}px; {PEN} font-size:{round(size * .8)}px; line-height:1.18; font-weight:400; transform:rotate({_R.uniform(-1.1, 1.1):.2f}deg); {extra}">{html}</div>'
_pen_skin_v221b = pen_skin
def pen_skin(h):
    h = _pen_skin_v221b(h).replace("font-family:Caveat,cursive;", "font-family:ArchDaughter,cursive;")
    h = re.sub(r'font-size:(\d+)px', lambda m: 'font-size:%dpx' % round(int(m.group(1)) * .8), h)
    return re.sub(r'font-weight:\s*[5-7]00', 'font-weight:400', h)
