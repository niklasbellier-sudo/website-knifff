#!/usr/bin/env python3
"""Reskin the four legal pages onto the new design floor without touching the
legal text. Extracts the <div class="legalWrap"> body verbatim and rewraps it."""
import re, sys, pathlib

PAGES = ["impressum.html", "datenschutz.html", "agb.html", "widerruf.html"]

HEAD = '''<!DOCTYPE html>
<html lang="de">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{title}</title>
<meta name="robots" content="index">
<link rel="icon" href="assets/favicon.ico">
<link rel="apple-touch-icon" href="assets/apple-touch-icon-180.png">
<link rel="stylesheet" href="assets/fonts/kniff-fonts.css">
<link rel="stylesheet" href="css/scrollcraft.css">
<link rel="stylesheet" href="css/kniff.css?v=13">
</head>
<body>

<span data-sc-progress></span>
<div class="sc-grain" aria-hidden="true"></div>
<div class="kf-room" aria-hidden="true"></div>

<header class="kf-head">
  <a href="index.html" class="kf-head__mark" aria-label="Kniff, Startseite"><img src="assets/kniff-wortmarke-hell.png" alt="Kniff"></a>
  <nav class="kf-head__nav" aria-label="Hauptnavigation">
    <a href="3d-druck-auf-anfrage.html">Custom-Druck</a>
    <a href="shop.html">Shop</a>
    <a href="ueber-uns.html">Über uns</a>
    <a href="kontakt.html">Kontakt</a>
    <a href="3d-druck-auf-anfrage.html" class="kf-head__cta">Projekt einreichen</a>
  </nav>
</header>

<main class="kf-page" id="top">
  <section class="kf-sec">
    <div class="kf-wrap kf-longform">
'''

FOOT = '''
    </div>
  </section>
</main>

<footer class="kf-footer">
  <div class="kf-wrap">
    <div class="kf-footer__grid">
      <div><h4>Kniff</h4><p style="font-size:var(--sc-t-sm); color:var(--sc-ink-soft); max-width:26ch; margin:0">Kleine 3D-gedruckte Kniffe für Alltag, Haushalt und unterwegs. Entworfen und gedruckt in Berlin.</p></div>
      <div><h4>Angebot</h4><ul><li><a href="3d-druck-auf-anfrage.html">Custom-Druck</a></li><li><a href="shop.html">Shop</a></li><li><a href="https://www.etsy.com/shop/KniffShop" target="_blank" rel="noopener">Etsy-Shop</a></li></ul></div>
      <div><h4>Service</h4><ul><li><a href="versand-zahlung.html">Versand &amp; Zahlung</a></li><li><a href="kontakt.html">Kontakt</a></li><li><a href="widerruf.html">Widerrufsrecht</a></li></ul></div>
      <div><h4>Rechtliches</h4><ul><li><a href="impressum.html">Impressum</a></li><li><a href="datenschutz.html">Datenschutz</a></li><li><a href="agb.html">AGB</a></li></ul></div>
    </div>
    <div class="kf-footer__base"><span>© 2026 Kniff · Berlin</span><span>kniff.shop</span></div>
  </div>
</footer>

<script src="js/scrollcraft.js"></script>
<script src="js/kniff-bench.js?v=13"></script>
</body>
</html>
'''

for name in PAGES:
    p = pathlib.Path(name)
    src = p.read_text(encoding="utf-8")
    m = re.search(r'<title>(.*?)</title>', src, re.S)
    title = m.group(1).strip() if m else name
    mw = re.search(r'<div class="legalWrap">(.*?)</div>\s*<footer', src, re.S)
    if not mw:
        print("!! no legalWrap in", name); continue
    body = mw.group(1).strip()
    # theme fixes only — no wording changes
    body = body.replace("var(--brand-accent)", "var(--sc-accent)")
    body = body.replace('<div class="updated">', '<p class="kf-meta">').replace("</div>\n\n  <div class=\"draftNotice\">", "</p>\n\n  <div class=\"draftNotice\">")
    body = re.sub(r'<div class="updated">(.*?)</div>', r'<p class="kf-meta">\1</p>', body, flags=re.S)
    body = re.sub(r'<div class="draftNotice">(.*?)</div>', r'<aside class="kf-note" style="margin:1.5rem 0 2.5rem">\1</aside>', body, flags=re.S)
    out = HEAD.format(title=title) + body + FOOT
    p.write_text(out, encoding="utf-8")
    print("reskinned", name, f"({len(body)} chars of legal text preserved)")
