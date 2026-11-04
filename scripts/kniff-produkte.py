#!/usr/bin/env python3
"""Erzeugt alles Produktbezogene aus scripts/produkte.json.

  shop/<slug>.html, en/shop/<slug>.html     die sechs Produktseiten je Sprache
  <!-- k:kacheln:start -->                  Produktkacheln auf der Startseite
  <!-- k:kacheln:shop -->                   Produktkacheln im Shop (ohne "neu")
  <!-- k:ld:shop -->                        JSON-LD ItemList im Shop
  <!-- k:gpsr -->                           Produktsicherheit im Shop
  <!-- k:preis:<slug> -->, <!-- k:preis:ab -->  einzelne Preise im Fließtext

Preise, Staffeln, Tipps und Lizenzen stehen damit an genau einer Stelle.
Danach immer den Rahmen nachziehen:

  python3 scripts/kniff-produkte.py && python3 scripts/kniff-chrome.py
"""
import html
import json
import urllib.parse
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = 'https://kniff.shop'
DATA = json.loads((ROOT / 'scripts' / 'produkte.json').read_text(encoding='utf-8'))
PRODS = DATA['produkte']
BY_SLUG = {p['slug']: p for p in PRODS}

T = {
    'de': {
        'base': '', 'shop': '/shop.html', 'custom': '/3d-druck-auf-anfrage.html', 'kontakt': '/kontakt.html',
        'versand': '/versand-zahlung.html', 'crumbs': 'Brotkrumen', 'more': 'Weitere Bilder', 'image': 'Bild',
        'plus_ship': 'zzgl. Versand', 'tiers': 'Staffelpreise', 'buy': 'Bei Etsy kaufen', 'ask': 'Lieber direkt anfragen',
        'newtab': ' (öffnet neuen Tab)', 'tip': 'Kniff-Tipp:', 'fits': 'Passt dazu', 'cross_h': 'Du brauchst eine andere Größe oder Aufteilung?',
        'cross_p': 'Das fertigen wir nach Maß.', 'cross_btn': 'Projekt einreichen', 'gpsr': 'Produktsicherheit und Hinweise',
        'from': 'ab {p}', 'title': '{name} — Kniff Shop',
    },
    'en': {
        'base': '/en', 'shop': '/en/shop.html', 'custom': '/en/3d-druck-auf-anfrage.html', 'kontakt': '/en/kontakt.html',
        'versand': '/en/versand-zahlung.html', 'crumbs': 'Breadcrumb', 'more': 'More images', 'image': 'image',
        'plus_ship': 'plus shipping', 'tiers': 'Quantity prices', 'buy': 'Buy on Etsy', 'ask': 'Ask us directly instead',
        'newtab': ' (opens in a new tab)', 'tip': 'Kniff tip:', 'fits': 'Goes well with', 'cross_h': 'Need a different size or layout?',
        'cross_p': 'We make it to measure.', 'cross_btn': 'Submit a project', 'gpsr': 'Product safety and notes',
        'from': 'from {p}', 'title': '{name} — Kniff Shop',
    },
}


def esc(s):
    return html.escape(s, quote=True)


def strip(s):
    return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', '', s))).strip()


def url(p, lang):
    return f'{T[lang]["base"]}/shop/{p["slug"]}.html'


def price_label(p, lang):
    first = p[lang]['staffel'][0][1]
    return T[lang]['from'].format(p=first) if len(p[lang]['staffel']) > 1 else first


def price_number(p):
    return p['de']['staffel'][0][1].replace('€', '').replace('.', '').replace(',', '.').strip()


def abs_img(src):
    return SITE + src.split('?')[0]


def tile(p, lang, shop=False):
    L = p[lang]
    img = (f'<div class="k-tile__img k-tile__img--photo" style="--pos: {p["kachel"]["pos"]}">'
           f'<img src="{p["kachel"]["src"]}" alt="" loading="lazy" decoding="async"></div>')
    if shop:
        return (f'<a href="{url(p, lang)}" class="k-tile" id="{p["anker"]}" data-cat="{p["kategorie"]}">\n'
                f'  {img}\n'
                f'  <div class="k-stack" style="gap: 2px"><strong style="font-weight: 600; line-height: 1.3">{L["kurz"]}</strong>'
                f'<span class="t-mono">{price_label(p, lang)}</span></div>\n</a>')
    return (f'<a href="{url(p, lang)}" class="k-tile">\n'
            f'  {img}\n'
            f'  <div class="k-tile__meta"><strong>{L["kurz"]}</strong><span>{price_label(p, lang)}</span></div>\n</a>')


def small_tile(p, lang):
    L = p[lang]
    return (f'<a href="{url(p, lang)}" class="k-tile"><div class="k-tile__img k-tile__img--photo" style="height: 150px; --pos: {p["kachel"]["pos"]}">'
            f'<img src="{p["kachel"]["src"]}" alt="" loading="lazy" decoding="async"></div>'
            f'<strong class="t-small">{L["kurz"]}</strong><span class="t-mono">{price_label(p, lang)}</span></a>')


def product_ld(p, lang):
    L = p[lang]
    data = {
        '@context': 'https://schema.org',
        '@graph': [
            {
                '@type': 'Product',
                'name': 'Kniff ' + strip(L['name']),
                'description': strip(L['ld']),
                'image': [abs_img(b['src']) for b in p['bilder'][:4]],
                'brand': {'@type': 'Brand', 'name': 'Kniff'},
                'category': DATA['kategorien'][p['kategorie']][lang],
                'url': SITE + url(p, lang),
                'offers': {
                    '@type': 'Offer', 'priceCurrency': 'EUR', 'price': price_number(p),
                    'availability': 'https://schema.org/InStock', 'itemCondition': 'https://schema.org/NewCondition',
                    'url': p['etsy'], 'seller': {'@type': 'Organization', 'name': 'Kniff'},
                },
            },
            {
                '@type': 'BreadcrumbList',
                'itemListElement': [
                    {'@type': 'ListItem', 'position': 1, 'name': 'Shop', 'item': SITE + T[lang]['shop']},
                    {'@type': 'ListItem', 'position': 2, 'name': strip(L['kurz']), 'item': SITE + url(p, lang)},
                ],
            },
        ],
    }
    if p['modell']:
        data['@graph'][0]['sku'] = html.unescape(p['modell']).replace('‑', '-')
    return json.dumps(data, ensure_ascii=False, indent=1)


def product_page(p, lang):
    t, L = T[lang], p[lang]
    other = 'en' if lang == 'de' else 'de'
    cat = DATA['kategorien'][p['kategorie']][lang]
    first = p['bilder'][0]['src']

    thumbs = []
    for i, (b, label) in enumerate(zip(p['bilder'], L['bildlabels'])):
        alt = L['alt'] if i == 0 else f'{strip(L["kurz"])}, {t["image"]} {i + 1}'
        thumbs.append(f'        <button type="button" class="k-thumb" aria-label="{esc(label)}" aria-pressed="{"true" if i == 0 else "false"}" '
                      f'data-src="{b["src"]}" data-alt="{esc(alt)}"><img src="{b["th"]}" alt="" loading="lazy" width="300" height="225"></button>')
    video = ''
    if p['video']:
        video = (f'\n      <video class="k-video" src="{p["video"]["src"]}" poster="{p["video"]["poster"]}" autoplay muted loop playsinline '
                 f'preload="metadata" aria-label="{esc(L["videolabel"])}"></video>')

    head = (f'<span class="k-badge">{L["badge"]}</span>' if L['badge'] else f'<span class="t-eyebrow">{L["eyebrow"]}</span>')
    tiers = ''
    if len(L['staffel']) > 1:
        lis = ''.join(f'<li><b>{a}</b><span>{b}</span></li>' for a, b in L['staffel'])
        tiers = f'\n      <ul class="k-tiers" aria-label="{t["tiers"]}">{lis}</ul>'
    if L['staffel_mehr']:
        tiers += f'\n      <a href="{t["custom"]}" class="k-link t-small">{L["staffel_mehr"]}</a>'

    def dd(label, value):
        if label in ('Farbe', 'Colour') and p['farben']:
            dots = ''.join(f'<span class="k-dot" style="--c: var({c})" aria-hidden="true"></span>' for c in p['farben'])
            value = dots + ' ' + value
        return f'<div><dt>{label}</dt><dd>{value}</dd></div>'
    rows = '\n        '.join(dd(a, b) for a, b in L['zeilen'])
    lizenz = f'\n      <p class="k-license">{L["lizenz"]}</p>' if L['lizenz'] else ''
    text = '\n        '.join(f'<p class="t-soft">{x}</p>' for x in L['text'])
    fits = '\n          '.join(small_tile(BY_SLUG[s], lang) for s in p['passt'])
    gpsr = DATA['produktsicherheit'][lang]['html']
    price = L['staffel'][0][1]
    etsy = (f'<a href="{p["etsy"]}" target="_blank" rel="noopener noreferrer" class="k-btn k-btn--{{cls}}"{{style}}>{t["buy"]} '
            f'<span aria-hidden="true">→</span><span class="k-sr">{t["newtab"]}</span></a>')

    return f'''<!DOCTYPE html>
<html lang="{lang}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
<title>{t["title"].format(name=strip(L["name"]))}</title>
<meta name="description" content="{esc(strip(L["ld"]))}">
<!-- k:meta -->
<!-- /k:meta -->
<script type="application/ld+json">
{product_ld(p, lang)}
</script>
</head>
<!-- Erzeugt von scripts/kniff-produkte.py aus scripts/produkte.json. Nicht von Hand ändern. -->
<body class="k k-light" data-k-nav="shop" data-k-cta="etsy" data-k-alt="{url(p, other)}" data-k-og="{first.split("?")[0]}">
<!-- k:top -->
<!-- /k:top -->

<main id="inhalt" tabindex="-1" class="k-wrap" style="padding-block: 20px clamp(40px, 5vw, 64px)">
  <nav aria-label="{t["crumbs"]}" class="k-crumbs t-mono t-soft" style="display: flex; flex-wrap: wrap; gap: 8px; padding-block: 10px 18px">
    <a href="{t["shop"]}">Shop</a><span aria-hidden="true">/</span><span>{cat}</span><span aria-hidden="true">/</span><span aria-current="page">{L["kurz"]}</span>
  </nav>

  <div class="k-pdp">
    <div data-k-gallery>
      <div class="k-gallery__main k-gallery__main--photo"><img data-k-main src="{first}" alt="{esc(L["alt"])}" fetchpriority="high"></div>
      <div class="k-thumbs" role="group" aria-label="{t["more"]}">
{chr(10).join(thumbs)}
      </div>{video}
    </div>

    <div class="k-stack" style="gap: 16px">
      {head}
      <h1 class="t-h1" style="font-size: clamp(36px, 3.7vw, 54px); line-height: 1.02">{L["name"]}</h1>
      <p class="t-lead">{L["lead"]}</p>
      <div style="display: flex; flex-wrap: wrap; align-items: baseline; gap: 4px 14px">
        <strong class="k-price">{price}</strong>
        <a href="{t["versand"]}" class="t-small t-soft" style="text-decoration: underline; text-underline-offset: 3px">{t["plus_ship"]}</a>
      </div>{tiers}
      <p class="t-mono t-soft">{L["verfuegbar"]}</p>
      <div class="k-formbtns" id="kaufen">
        {etsy.format(cls="ink", style=' style="flex: 1 1 220px"')}
        <a href="{t["kontakt"]}?produkt={p["kontakt"] if lang == "de" else urllib.parse.quote(strip(L["name"]))}" class="k-btn k-btn--ghost" style="flex: 1 1 180px">{t["ask"]}</a>
      </div>
      <dl class="k-rows">
        {rows}
      </dl>
      <div class="k-tip">
        <img src="/assets/kopf-mini.svg" alt="" width="26" height="40">
        <p class="t-small"><strong>{t["tip"]}</strong> {L["tipp"]}</p>
      </div>{lizenz}
    </div>
  </div>

  <section class="k-two" style="margin-top: clamp(40px, 5vw, 64px)">
    <div class="k-stack">
      <h2 class="t-h2">{L["wie"]}</h2>
        {text}
    </div>
    <div>
      <h2 class="t-h3" style="margin-bottom: 14px">{t["fits"]}</h2>
      <div class="k-grid" style="grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px">
          {fits}
      </div>
    </div>
  </section>

  <a href="{t["custom"]}" class="k-crossband k-dark" style="margin-top: clamp(32px, 4vw, 48px)">
    <div class="k-stack" style="flex: 1 1 380px; min-width: 0; max-width: 640px">
      <h2 class="t-h2">{t["cross_h"]}</h2>
      <p class="t-soft">{t["cross_p"]}</p>
    </div>
    <span class="k-btn k-btn--amber">{t["cross_btn"]} →</span>
  </a>

  <details style="margin-top: 32px">
    <summary>{t["gpsr"]}</summary>
    <div class="k-details-body">
{gpsr}
    </div>
  </details>
</main>

<div class="k-bar" data-k-hide-on="#kaufen">
  <strong>{price}</strong>
  {etsy.format(cls="amber", style="")}
</div>

<!-- k:foot -->
<!-- /k:foot -->
</body>
</html>
'''


def item_list(lang):
    items = []
    for i, p in enumerate(PRODS, 1):
        L = p[lang]
        item = {
            '@type': 'Product', 'name': 'Kniff ' + strip(L['name']), 'description': strip(L['ld']),
            'image': [abs_img(b['src']) for b in p['bilder'][:3]], 'brand': {'@type': 'Brand', 'name': 'Kniff'},
            'category': DATA['kategorien'][p['kategorie']][lang], 'url': SITE + url(p, lang),
            'offers': {'@type': 'Offer', 'priceCurrency': 'EUR', 'price': price_number(p),
                       'availability': 'https://schema.org/InStock', 'itemCondition': 'https://schema.org/NewCondition',
                       'url': p['etsy'], 'seller': {'@type': 'Organization', 'name': 'Kniff'}},
        }
        items.append({'@type': 'ListItem', 'position': i, 'item': item})
    data = {'@context': 'https://schema.org', '@type': 'ItemList', 'name': 'Kniff Sortiment' if lang == 'de' else 'Kniff range',
            'itemListElement': items}
    return '<script type="application/ld+json">\n' + json.dumps(data, ensure_ascii=False, indent=1) + '\n</script>'


def put(text, name, content, f):
    pat = re.compile(r'(<!-- k:' + re.escape(name) + r' -->)(.*?)(<!-- /k:' + re.escape(name) + r' -->)', re.S)
    if not pat.search(text):
        return text
    return pat.sub(lambda m: m.group(1) + '\n' + content + '\n' + m.group(3), text, count=1)


def put_inline(text, name, content):
    pat = re.compile(r'(<!-- k:' + re.escape(name) + r' -->)(.*?)(<!-- /k:' + re.escape(name) + r' -->)', re.S)
    return pat.sub(lambda m: m.group(1) + content + m.group(3), text)


def main():
    for lang in ('de', 'en'):
        d = ROOT / ('shop' if lang == 'de' else 'en/shop')
        d.mkdir(parents=True, exist_ok=True)
        for p in PRODS:
            (d / f'{p["slug"]}.html').write_text(product_page(p, lang), encoding='utf-8')
        for page in (ROOT / ('index.html' if lang == 'de' else 'en/index.html'),
                     ROOT / ('shop.html' if lang == 'de' else 'en/shop.html')):
            if not page.exists():
                continue
            text = page.read_text(encoding='utf-8')
            new = put(text, 'kacheln:start', '\n'.join(tile(p, lang) for p in PRODS), page)
            new = put(new, 'kacheln:shop', '\n'.join(tile(p, lang, shop=True) for p in PRODS if not p['neu']), page)
            new = put(new, 'ld:shop', item_list(lang), page)
            new = put(new, 'gpsr', DATA['produktsicherheit'][lang]['html'], page)
            for p in PRODS:
                new = put_inline(new, 'preis:' + p['slug'], price_label(p, lang))
            cheapest = min(PRODS, key=lambda p: float(price_number(p)))
            new = put_inline(new, 'preis:ab', T[lang]['from'].format(p=cheapest[lang]['staffel'][0][1]))
            if new != text:
                page.write_text(new, encoding='utf-8')
    print(f'{len(PRODS) * 2} Produktseiten geschrieben')


if __name__ == '__main__':
    main()
