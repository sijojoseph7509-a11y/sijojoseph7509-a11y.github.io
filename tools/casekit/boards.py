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
def carekin(d):
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
