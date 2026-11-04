#!/usr/bin/env python3
"""Schreibt den gemeinsamen Rahmen in alle Seiten von kniff.shop.

Die HTML-Seiten bleiben die Quelle. Dieses Skript ersetzt nur, was zwischen
diesen Markern steht, und lässt den Rest jeder Seite unberührt:

  <!-- k:meta -->  … <!-- /k:meta -->   im <head>: Favicons, Schriften, CSS,
                                         Canonical, hreflang, Open Graph
  <!-- k:top -->   … <!-- /k:top -->    direkt nach <body>: Sprunglink, Kopf,
                                         Schiene, Menü am Handy
  <!-- k:foot -->  … <!-- /k:foot -->   vor </body>: Fußzeile und Skript

Was pro Seite anders ist, steht als Attribut am <body>:

  data-k-nav="custom|shop|ueber|projekt"   aktiver Menüpunkt (fehlt = keiner)
  data-k-cta="custom|etsy"                 Button rechts im Kopf (fehlt = keiner)
  data-k-alt="/en/shop.html"               Gegenstück in der anderen Sprache
  data-k-claim="…"                         Zeile neben dem Logo (nur Startseite, als h1)
  data-k-og="/assets/…"                    Vorschaubild (Standard: /assets/og.jpg)
  data-k-robots="noindex, follow"          optional

Aufruf nach jeder Änderung an Menü, Fuß oder Versionen:
  python3 scripts/kniff-chrome.py
"""
import html
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://kniff.shop'
CSS_V = '200'   # bei jeder Änderung an css/kniff.css hochzählen
JS_V = '200'    # bei jeder Änderung an js/kniff.js hochzählen
OG_DEFAULT = '/assets/og.jpg?v=6'

TXT = {
    'de': {
        'skip': 'Zum Inhalt springen',
        'home': '/', 'logo': 'Kniff, Startseite',
        'navlabel': 'Hauptnavigation', 'menu': 'Menü öffnen', 'menulabel': 'Menü',
        'nav': [('custom', '/3d-druck-auf-anfrage.html', 'Custom-Druck', False),
                ('shop', '/shop.html', 'Shop', False),
                ('ueber', '/ueber-uns.html', 'Über uns', True),
                ('projekt', '/meine-projekte.html', 'Mein Projekt', True)],
        'kontakt': ('/kontakt.html', 'Kontakt'),
        'cta_custom': 'Projekt einreichen', 'cta_etsy': 'Etsy-Shop',
        'newtab': ' (öffnet neuen Tab)',
        'blurb': '3D-gedruckte Kniffe für Alltag, Haushalt und unterwegs, dazu 3D-Druck auf Anfrage. Gedruckt und geprüft in Berlin.',
        'cols': [
            ('Kniff', None),
            ('Angebot', [('/3d-druck-auf-anfrage.html', 'Custom-Druck'), ('/shop.html', 'Shop'),
                         ('https://www.etsy.com/shop/KniffShop', 'Etsy-Shop'), ('https://instagram.com/kniffshop', 'Instagram')]),
            ('Service', [('/meine-projekte.html', 'Mein Projekt'), ('/versand-zahlung.html', 'Versand &amp; Zahlung'),
                         ('/kontakt.html', 'Kontakt'), ('/widerruf.html', 'Widerrufsrecht')]),
            ('Rechtliches', [('/impressum.html', 'Impressum'), ('/datenschutz.html', 'Datenschutz'),
                             ('/agb.html', 'AGB'), ('/shop.html#produktsicherheit', 'Produktsicherheit')]),
        ],
        'copy': '© 2026 Kniff · Berlin', 'other': ('en', 'EN', 'English'), 'locale': 'de_DE',
    },
    'en': {
        'skip': 'Skip to content',
        'home': '/en/', 'logo': 'Kniff, home',
        'navlabel': 'Main navigation', 'menu': 'Open menu', 'menulabel': 'Menu',
        'nav': [('custom', '/en/3d-druck-auf-anfrage.html', 'Custom print', False),
                ('shop', '/en/shop.html', 'Shop', False),
                ('ueber', '/en/ueber-uns.html', 'About', True),
                ('projekt', '/en/meine-projekte.html', 'My project', True)],
        'kontakt': ('/en/kontakt.html', 'Contact'),
        'cta_custom': 'Submit a project', 'cta_etsy': 'Etsy shop',
        'newtab': ' (opens in a new tab)',
        'blurb': '3D-printed Kniffe for everyday life, home and travel, plus 3D printing on request. Printed and checked in Berlin.',
        'cols': [
            ('Kniff', None),
            ('Offer', [('/en/3d-druck-auf-anfrage.html', 'Custom print'), ('/en/shop.html', 'Shop'),
                       ('https://www.etsy.com/shop/KniffShop', 'Etsy shop'), ('https://instagram.com/kniffshop', 'Instagram')]),
            ('Service', [('/en/meine-projekte.html', 'My project'), ('/en/versand-zahlung.html', 'Shipping &amp; payment'),
                         ('/en/kontakt.html', 'Contact'), ('/en/widerruf.html', 'Right of withdrawal')]),
            ('Legal', [('/en/impressum.html', 'Legal notice'), ('/en/datenschutz.html', 'Privacy'),
                       ('/en/agb.html', 'Terms'), ('/en/shop.html#produktsicherheit', 'Product safety')]),
        ],
        'copy': '© 2026 Kniff · Berlin', 'other': ('de', 'DE', 'Deutsch'), 'locale': 'en_GB',
    },
}

MENU_ICON = ('<svg width="22" height="16" viewBox="0 0 22 16" fill="none" stroke="currentColor" '
             'stroke-width="2" aria-hidden="true"><path d="M0 1h22M0 8h22M0 15h22"/></svg>')


def ext(href, label, t, cls=''):
    c = f' class="{cls}"' if cls else ''
    return (f'<a href="{href}" target="_blank" rel="noopener noreferrer"{c}>{label} '
            f'<span aria-hidden="true">↗</span><span class="k-sr">{t["newtab"]}</span></a>')


def page_path(f):
    rel = f.relative_to(ROOT).as_posix()
    if rel == 'index.html':
        return '/'
    if rel == 'en/index.html':
        return '/en/'
    return '/' + rel


def attr(tag, name):
    m = re.search(r'\s' + re.escape(name) + r'="([^"]*)"', tag)
    return html.unescape(m.group(1)) if m else None


def build_meta(f, lang, body, head):
    t = TXT[lang]
    path = page_path(f)
    alt = attr(body, 'data-k-alt')
    robots = attr(body, 'data-k-robots')
    og = attr(body, 'data-k-og') or OG_DEFAULT
    title = re.search(r'<title>(.*?)</title>', head, re.S).group(1).strip()
    desc_m = re.search(r'<meta name="description" content="([^"]*)"', head)
    desc = desc_m.group(1) if desc_m else ''
    out = [
        '<meta name="theme-color" content="#0b0d0e">',
        '<link rel="icon" href="/assets/favicon.svg?v=5" type="image/svg+xml">',
        '<link rel="icon" type="image/png" sizes="32x32" href="/assets/favicon-32.png?v=5">',
        '<link rel="icon" type="image/png" sizes="192x192" href="/assets/favicon-192.png?v=5">',
        '<link rel="apple-touch-icon" href="/assets/apple-touch-icon-180.png?v=5">',
        '<link rel="manifest" href="/site.webmanifest">',
        '<link rel="preload" href="/assets/fonts/archivo-800-normal-latin.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="preload" href="/assets/fonts/inter-tight-400-normal-latin.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="stylesheet" href="/assets/fonts/kniff-fonts.css">',
        f'<link rel="stylesheet" href="/css/kniff.css?v={CSS_V}">',
    ]
    if robots:
        out.append(f'<meta name="robots" content="{robots}">')
    if not robots or 'noindex' not in robots:
        out.append(f'<link rel="canonical" href="{SITE}{path}">')
    if alt:
        de, en = (path, alt) if lang == 'de' else (alt, path)
        out += [f'<link rel="alternate" hreflang="de" href="{SITE}{de}">',
                f'<link rel="alternate" hreflang="en" href="{SITE}{en}">',
                f'<link rel="alternate" hreflang="x-default" href="{SITE}{de}">']
    img = og if og.startswith('http') else SITE + og
    out += [
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Kniff">',
        f'<meta property="og:locale" content="{t["locale"]}">',
        f'<meta property="og:title" content="{title}">',
        f'<meta property="og:description" content="{desc}">',
        f'<meta property="og:url" content="{SITE}{path}">',
        f'<meta property="og:image" content="{img}">',
        '<meta property="og:image:width" content="1200">',
        '<meta property="og:image:height" content="630">',
        '<meta name="twitter:card" content="summary_large_image">',
    ]
    return '\n'.join(out)


def build_top(f, lang, body, text):
    t = TXT[lang]
    nav = attr(body, 'data-k-nav')
    cta = attr(body, 'data-k-cta')
    claim = attr(body, 'data-k-claim')
    alt = attr(body, 'data-k-alt')
    links = []
    for key, href, label, wide in t['nav']:
        cur = ' aria-current="page"' if key == nav else ''
        cls = ' class="k-nav__wide"' if wide else ''
        links.append(f'        <a href="{href}"{cls}{cur}>{label}</a>')
    button = ''
    if cta == 'custom':
        href = '#anfrage' if 'id="anfrage"' in text else t['nav'][0][1] + '#anfrage'
        button = f'\n      <a href="{href}" class="k-btn k-btn--amber">{t["cta_custom"]}</a>'
    elif cta == 'etsy':
        button = '\n      ' + ext('https://www.etsy.com/shop/KniffShop', t['cta_etsy'], t, 'k-btn k-btn--amber')
    claim_html = f'\n      <h1 class="t-mono t-soft k-nav__wide k-claim">{claim}</h1>' if claim else ''
    other_lang, other_short, other_long = t['other']
    other_href = alt or TXT[other_lang]['home']
    drawer = []
    for key, href, label, _ in t['nav']:
        cur = ' aria-current="page"' if key == nav else ''
        drawer.append(f'        <li><a href="{href}"{cur}>{label}</a></li>')
    kontakt_cur = ' aria-current="page"' if page_path(f) == t['kontakt'][0] else ''
    drawer.append(f'        <li><a href="{t["kontakt"][0]}"{kontakt_cur}>{t["kontakt"][1]}</a></li>')
    return f'''<a class="k-skip" href="#inhalt">{t["skip"]}</a>
<div class="k-top">
  <header class="k-head">
      <a href="{t["home"]}" class="k-logo" aria-label="{t["logo"]}"><img src="/assets/kniff-wortmarke-hell.png?v=3" alt="" width="439" height="188"></a>{claim_html}
      <nav class="k-nav" aria-label="{t["navlabel"]}">
{chr(10).join(links)}
      </nav>{button}
      <button type="button" class="k-menu" aria-expanded="false" aria-controls="k-menu" aria-label="{t["menu"]}">
        {MENU_ICON}
      </button>
  </header>
  <div class="k-rail" aria-hidden="true">
    <div class="k-rail__print"></div>
    <img class="k-rail__head" src="/assets/kopf-mini.svg" alt="" width="26" height="40">
  </div>
  <nav class="k-drawer k-dark" id="k-menu" aria-label="{t["menulabel"]}" hidden>
    <ul>
{chr(10).join(drawer)}
    </ul>
    <p class="k-drawer__small">{ext("https://www.etsy.com/shop/KniffShop", t["cta_etsy"], t)}{ext("https://instagram.com/kniffshop", "Instagram", t)}<a href="{other_href}" hreflang="{other_lang}" lang="{other_lang}">{other_long}</a></p>
  </nav>
</div>'''


def build_foot(f, lang, body):
    t = TXT[lang]
    alt = attr(body, 'data-k-alt')
    other_lang, other_short, other_long = t['other']
    other_href = alt or TXT[other_lang]['home']
    cols = []
    for head, items in t['cols']:
        if items is None:
            cols.append(f'      <div><h4>{head}</h4><p class="t-soft">{t["blurb"]}</p></div>')
            continue
        lis = []
        for href, label in items:
            lis.append('<li>' + (ext(href, label, t) if href.startswith('http') else f'<a href="{href}">{label}</a>') + '</li>')
        cols.append(f'      <div><h4>{head}</h4><ul>{"".join(lis)}</ul></div>')
    return f'''<footer class="k-foot">
    <div class="k-foot__cols">
{chr(10).join(cols)}
    </div>
    <div class="k-foot__end"><span>{t["copy"]}</span><a href="{other_href}" hreflang="{other_lang}" lang="{other_lang}"><span aria-hidden="true">{other_short}</span><span class="k-sr">{other_long}</span></a></div>
</footer>
<script src="/js/kniff.js?v={JS_V}" defer></script>'''


def replace(text, name, content, f):
    pat = re.compile(r'(<!-- k:' + name + r' -->)(.*?)(<!-- /k:' + name + r' -->)', re.S)
    if not pat.search(text):
        sys.exit(f'{f}: Marker k:{name} fehlt')
    return pat.sub(lambda m: m.group(1) + '\n' + content + '\n' + m.group(3), text, count=1)


def pages():
    for f in sorted(ROOT.glob('*.html')):
        if not f.name.startswith('_'):
            yield f
    for pattern in ('shop/*.html', 'en/*.html', 'en/shop/*.html'):
        yield from sorted(ROOT.glob(pattern))


def main():
    changed = 0
    for f in pages():
        text = f.read_text(encoding='utf-8')
        if '<!-- k:top -->' not in text:
            print(f'übersprungen (noch alter Aufbau): {f.relative_to(ROOT)}')
            continue
        lang = re.search(r'<html lang="([a-z]+)"', text).group(1)
        body = re.search(r'<body[^>]*>', text).group(0)
        head = re.search(r'<head>(.*?)</head>', text, re.S).group(1)
        new = replace(text, 'meta', build_meta(f, lang, body, head), f)
        new = replace(new, 'top', build_top(f, lang, body, new), f)
        new = replace(new, 'foot', build_foot(f, lang, body), f)
        if new != text:
            f.write_text(new, encoding='utf-8')
            changed += 1
    print(f'{changed} Seite(n) aktualisiert')


if __name__ == '__main__':
    main()
