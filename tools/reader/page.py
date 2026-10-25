# The standalone page around a case study's text version: sijo.work/work/<slug>/ (see build.py).
# Plain HTML and CSS: it works without JavaScript and without WebGL, search engines can read it, and it is the
# link to share for one project.
import json, os, html
from projects import PROJECTS, ORDER

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
esc = lambda s: html.escape(s, quote=True)
SITE = 'https://sijo.work'
ICON = ("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Ccircle cx='32' cy='32' r='30' fill='%231d1d1f'/%3E"
        "%3Ccircle cx='32' cy='32' r='26' fill='none' stroke='%23f5f5f7' stroke-width='3'/%3E%3Ctext x='32' y='41' text-anchor='middle' "
        "font-family='Helvetica,Arial,sans-serif' font-weight='700' font-size='24' fill='%23f5f5f7'%3ESJ%3C/text%3E%3C/svg%3E")

def version():
    try: return json.load(open(os.path.join(ROOT, 'version.json')))['build']
    except Exception: return 'dev'


def write_page(slug, P, main):
    v = version()
    k = ORDER.index(slug)
    prev, nxt = PROJECTS[ORDER[k - 1]], PROJECTS[ORDER[(k + 1) % len(ORDER)]]
    url = f'{SITE}/work/{slug}/'
    og = f'{SITE}/work/{slug}/fx/og.jpg'
    title = f'{P["title"]} · Sijo Joseph, product, UX and AI designer'
    ld = {"@context": "https://schema.org", "@type": "CreativeWork", "name": P['title'], "description": P['summary'], "url": url, "image": og,
          "genre": P['tag'], "author": {"@type": "Person", "name": "Sijo Joseph", "url": SITE + "/", "jobTitle": "Product, UX and AI designer"}}
    doc = f'''<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; font-src 'self'; connect-src 'self'; object-src 'none'; base-uri 'self'; form-action 'none'; upgrade-insecure-requests">
  <base href="../../">
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(P['summary'])}">
  <link rel="canonical" href="{url}">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="Sijo Joseph">
  <meta property="og:title" content="{esc(P['title'])}: {esc(P['tag'])}">
  <meta property="og:description" content="{esc(P['summary'])}">
  <meta property="og:url" content="{url}">
  <meta property="og:image" content="{og}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="theme-color" content="{P['color']}">
  <link rel="icon" href="{ICON}">
  <link rel="stylesheet" href="reader.css?v={v}">
  <script type="application/ld+json">{json.dumps(ld)}</script>
</head>
<body class="rp">
  <a class="rp-skip" href="work/{slug}/#reader">Skip to the case study</a>
  <header class="rp-top">
    <a class="rp-me" href="./">Sijo Joseph <span>Product, UX &amp; AI designer</span></a>
    <nav class="rp-nav" aria-label="Case studies">{''.join(f'<a href="work/{s}/"' + (' aria-current="page"' if s == slug else '') + f'>{esc(PROJECTS[s]["title"])}</a>' for s in ORDER)}</nav>
  </header>
  <p class="rp-meta"><span>{esc(P['tag'])}</span><span>{esc(P['status'])}</span><a href="./?open=case:{slug}">See the original layout ›</a></p>
  {main}
  <footer class="rp-foot">
    <div class="rp-next"><span>Next case study</span><a href="work/{nxt['slug']}/">{esc(nxt['title'])} ›</a></div>
    <div class="rp-links"><a href="./">Portfolio home</a><a href="mailto:sijojoseph7509@gmail.com">sijojoseph7509@gmail.com</a><a href="https://www.linkedin.com/in/sijodesign" rel="noopener">LinkedIn</a></div>
    <p>© Sijo Joseph</p>
  </footer>
</body>
</html>
'''
    open(os.path.join(ROOT, 'work', slug, 'index.html'), 'w').write(doc)
