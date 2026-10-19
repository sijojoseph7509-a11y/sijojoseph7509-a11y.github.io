# Builds the text version of the Handovo case study from tools/handovo/case.html:
#   work/handovo/reader.html (loaded into the Mac window on phones / "Text" view) and work/handovo/index.html (the
#   stand-alone page, same frame as the other work/<slug>/index.html), plus work/handovo/m/ responsive images.
#   python3 tools/handovo/reader.py <build-number>
import sys, re, html, os
from html.parser import HTMLParser
from PIL import Image

V = sys.argv[1] if len(sys.argv) > 1 else "1"
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.chdir(ROOT)
SRC, OUT = "tools/handovo/case.html", "work/handovo"
os.makedirs(OUT + "/m", exist_ok=True)
THEMES = {"blue": ("#2F3BEA", "#FFFFFF", "#E3E5FF"), "dark": ("#0B0B0F", "#FFFFFF", "#C9C9D6"),
          "lime": ("#D4FF3A", "#000000", "#1A1A1A"), "paper": ("#F4F4F7", "#0B0B0F", "#2A2A33"), "": ("#FFFFFF", "#0B0B0F", "#2A2A33")}

VOID = {"img", "br", "hr", "meta", "link", "input", "circle", "path"}
class P(HTMLParser):
    # Collects one text block per heading, paragraph, list item, table row, diagram box, rule row, stat and journey-map cell.
    def __init__(s): super().__init__(); s.secs = []; s.cur = None; s.buf = None; s.kind = None; s.depth = 0; s.svg = 0; s.sep = ""; s.cells = None; s.heads = None; s.tbl = None; s.jm = None
    def start_block(s, kind, sep=""): s.buf = []; s.kind = kind; s.depth = 1; s.sep = sep
    def handle_starttag(s, t, a):
        a = dict(a); cls = a.get("class", "") or ""
        if t == "svg": s.svg += 1
        if t == "section":
            st = a.get("style", "")
            th = "blue" if "blue" in cls else "dark" if "dark" in cls else "lime" if "--lime" in st else "paper" if "--paper" in st else ""
            s.cur = {"theme": th, "items": []}; s.secs.append(s.cur); return
        if s.cur is None: return
        if t == "img" and "mark" not in cls:
            s.cur["items"].append(("img", a["src"], "phone" in cls))
        if t == "table": s.tbl = "mx" if "mx" in cls else "tbl"; s.heads = None
        if s.buf is not None:
            if t not in VOID: s.depth += 1
            if t == "br": s.buf.append(" ")
            return
        if t == "div" and "jm" in cls.split(): s.jm = {"cells": [], "depth": 1}; return
        if s.jm is not None and t == "div": s.start_block("jm"); return
        if t == "div" and "box" in cls.split(): s.start_block("p", ": "); return
        if t == "div" and "stat" in cls.split(): s.start_block("p", " "); return
        if t == "div" and "rr" in cls.split(): s.start_block("p"); s.buf.append(""); return
        if t == "tr": s.cells = []; return
        if t in ("td", "th") and s.cells is not None: s.start_block("cell"); return
        if t == "span" and "chip" in cls.split(): s.start_block("eye"); return
        if t in ("h1", "h2", "h3", "li", "p"):
            k = t
            if t == "p":
                c = cls.split()
                k = "eye" if ("eye" in c or "k" in c or "lab" in c) else "cap" if "cap" in c else "p"
            s.start_block(k)
    def handle_endtag(s, t):
        if t == "svg": s.svg -= 1
        if t == "table": s.tbl = None
        if s.buf is not None:
            if t in VOID: return
            s.depth -= 1
            if t == "b" and s.sep: s.buf.append(s.sep)
            if t in ("p", "span") and s.kind == "p" and s.depth >= 1: s.buf.append(" · ")
            if s.depth > 0: return
            txt = re.sub(r"\s+", " ", "".join(s.buf)).strip(); txt = re.sub(r"(\s*·\s*)+$", "", re.sub(r"^\s*·\s*", "", txt)); txt = re.sub(r"(\s*·\s*){2,}", " · ", txt).replace(": :", ":")
            kind = s.kind; s.buf = None; s.kind = None
            if kind == "cell": s.cells.append(txt); return
            if kind == "jm": s.jm["cells"].append(txt); return
            if txt: s.cur["items"].append((kind, txt))
            return
        if s.jm is not None and t == "div":
            c = s.jm["cells"]; s.jm = None
            stages = c[1:6]; rows = []; i = 6
            while i < len(c):   # the Feeling row is one drawn curve spanning all five stages, so it has 2 cells, not 6
                if c[i] == "Feeling": i += 2; continue
                rows.append(c[i:i + 6]); i += 6
            for j, st in enumerate(stages):
                parts = [f"{r[0].capitalize().replace('handovo', 'Handovo')}: {r[j + 1]}" for r in rows if r[0] and r[j + 1]]
                s.cur["items"].append(("p", f"{st}. " + " ".join(p if p.endswith(".") else p + "." for p in parts)))
            return
        if t == "tr" and s.cells is not None:
            cells = s.cells; s.cells = None
            if s.tbl == "mx":
                if s.heads is None: s.heads = cells; return
                s.cur["items"].append(("p", f"{cells[0]}: " + "; ".join(f"{h[0].lower() + h[1:]}, {v[0].lower() + v[1:]}" for h, v in zip(s.heads[1:], cells[1:])) + "."))
            elif len(cells) == 3: s.cur["items"].append(("td3", cells))
    def handle_data(s, d):
        if s.buf is not None and not s.svg: s.buf.append(d)

p = P(); p.feed(open(SRC, encoding="utf-8").read())

def img(src, n, k):
    base = f"{OUT}/m/{n:02d}-{k}"
    im = Image.open("tools/handovo/" + src).convert("RGB")
    out = []
    for w in (640, 1200, 1600):
        if w > im.width and w != 640: continue
        r = im.resize((w, round(im.height * w / im.width)), Image.LANCZOS) if im.width > w else im
        r.save(f"{base}-{w}.webp", quality=84); out.append((w, r.size))
    big = out[-1]
    srcset = ", ".join(f"{base}-{w}.webp?v={V} {w}w" for w, _ in out)
    return f'<img src="{base}-{big[0]}.webp?v={V}" srcset="{srcset}" sizes="(max-width: 820px) 100vw, 760px" width="{big[1][0]}" height="{big[1][1]}" alt="" loading="lazy" decoding="async">'

ALT = {"screen": "Handovo control room, from the Play the day prototype", "phone": "A staff member's Handovo chat on the phone", "tour": "The Play the day prototype: control room on the left, a staff phone on the right",
       "01-huddle": "AI-generated illustration in my style: the manager briefs the morning shift by the rainy shop window",
       "02-goal": "AI-generated illustration in my style: the manager types the day's goal at the counter",
       "03-phone": "AI-generated illustration in my style: a staff member's hand holding a phone with a task message",
       "04-discount": "AI-generated illustration in my style: a customer shows a rain jacket's zip to a cashier at billing",
       "05-count": "AI-generated illustration in my style: a staff member counts folded linen shirts",
       "06-restock": "AI-generated illustration in my style: a stockroom worker carries jackets out to the floor",
       "07-customer": "AI-generated illustration in my style: an upset customer holds up a shoe at Footwear",
       "08-handover": "AI-generated illustration in my style: two staff compare phones at the door at shift change"}
out = []
for i, s in enumerate(p.secs):
    bg, fg, body = THEMES[s["theme"]]
    rows = []; k = 0; rowcells = []
    for it in s["items"]:
        kind = it[0]
        if kind == "img":
            k += 1; src = it[1]; key = next((x for x in sorted(ALT, key=lambda x: x[0].isalpha()) if x in src), "screen")
            tag = img(src, i + 1, k).replace('alt=""', f'alt="{ALT[key]}."')
            rows.append(f'<figure class="rf{"" if it[2] else " fb"}">{tag}</figure>'); continue
        if kind == "td3":
            c = [html.escape(x, quote=False) for x in it[1]]
            rows.append(f'<div class="rk"><p class="t p" style="color:{body}"><span class="f-sans" style="font-weight:600;color:{fg}">{c[0]}</span> · {c[1]} <span class="f-mono up" style="font-weight:400">({c[2]})</span></p></div>')
            continue
        t = html.escape(it[1], quote=False)
        if kind == "cap": rows.append(f'<div class="rk"><p class="t l" style="color:{body};opacity:.75"><span class="f-sans" style="font-weight:400">{t}</span></p></div>'); continue
        if kind == "eye": rows.append(f'<div class="rk"><p class="t l" style="color:{body}"><span class="f-mono up" style="font-weight:400">{t}</span></p></div>')
        elif kind == "h1": rows.append(f'<div class="rk"><h1 class="t x1" style="color:{fg}"><span class="f-sans" style="font-weight:700">{t}</span></h1></div>')
        elif kind == "h2": rows.append(f'<div class="rk"><h2 class="t x4" style="color:{fg}"><span class="f-sans" style="font-weight:600">{t}</span></h2></div>')
        elif kind == "h3": rows.append(f'<div class="rk"><h3 class="t x5" style="color:{fg}"><span class="f-sans" style="font-weight:600">{t}</span></h3></div>')
        else: rows.append(f'<div class="rk"><p class="t p" style="color:{body}"><span class="f-sans" style="font-weight:400">{t}</span></p></div>')
    out.append(f'<section class="rs" id="s{i+1:02d}" style="--bg:{bg};--fg:{fg}" data-i="{i}"><div class="rs-in">{"".join(rows)}</div></section>')
main = f'<main class="rd rd-handovo" id="reader" lang="en" data-slug="handovo">{"".join(out)}</main>'
open(f"{OUT}/reader.html", "w", encoding="utf-8").write(main)

# stand-alone page: the Carekin page's frame with Handovo's details
t = open("work/carekin/index.html", encoding="utf-8").read()
title, tag, summ = "Handovo", "Product Design · AI UX", "An AI operations layer for retail stores: the manager states the day's goal, the agent turns it into tasks on every staff phone, and rules the manager sets decide what it may do alone."
head_end = t.index("<main"); tail_start = t.index("</main>") + len("</main>")
frame = t[:head_end] + main + t[tail_start:]
frame = frame.replace("work/carekin/", "work/handovo/").replace("Carekin: UX / Product Design", f"{title}: {tag}").replace("<title>Carekin ·", f"<title>{title} ·")
frame = re.sub(r'(name="description" content=")[^"]*', lambda m: m.group(1) + html.escape(summ), frame)
frame = re.sub(r'(property="og:description" content=")[^"]*', lambda m: m.group(1) + html.escape(summ), frame)
frame = re.sub(r'"name": "Carekin", "description": "[^"]*"', f'"name": "{title}", "description": "{summ}"', frame)
frame = frame.replace('"genre": "UX / Product Design"', f'"genre": "{tag}"').replace('content="#0F3B38"', 'content="#2F3BEA"')
frame = re.sub(r'<p class="rp-meta">.*?</p>', f'<p class="rp-meta"><span>{tag}</span><span>Pilot build for one real store</span><a href="./?open=case:handovo">See the original layout ›</a></p>', frame, flags=re.S)
frame = re.sub(r'<h1 class="rp-title">.*?</h1>', f'<h1 class="rp-title">{title}</h1>', frame, flags=re.S)
frame = frame.replace('<a href="work/carekin/" aria-current="page">Carekin</a>', '<a href="work/carekin/">Carekin</a>').replace('<a href="work/handovo/">Handovo</a>', '<a href="work/handovo/" aria-current="page">Handovo</a>')
frame = re.sub(r'<div class="rp-next">.*?</div>', '<div class="rp-next"><span>Next case study</span><a href="work/ekmaati/">Ekmaati ›</a></div>', frame, flags=re.S)
open(f"{OUT}/index.html", "w", encoding="utf-8").write(frame)
print("sections", len(out))
