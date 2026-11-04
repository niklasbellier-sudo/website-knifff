#!/usr/bin/env python3
"""Baut das Vorschaubild für Links (Open Graph, 1200 × 630) im Stil der Startseite:
zwei Türen, Druckkopf an der Schiene. Eine deutsche und eine englische Fassung.

  python3 scripts/og-bild.py      → assets/og.jpg, assets/og-en.jpg

Werkzeuge nur von macOS: qlmanage rendert das SVG (mit eingebetteten Schriften
und Bildern), sips schneidet zu und rechnet herunter. Gerendert wird doppelt so
groß wie nötig und dann verkleinert, damit Kanten und Schrift sauber bleiben.
Nach einer Änderung OG_DEFAULT-Version in scripts/kniff-chrome.py hochzählen.
"""
import base64
import pathlib
import shutil
import subprocess
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
A = ROOT / 'assets'
TEXT = {
    'de': {'file': 'og.jpg', 'l_eye': '3D-DRUCK AUF ANFRAGE', 'l1': 'Ich habe', 'l2': 'eine Idee.',
           'r_eye': 'FERTIGE KNIFFE', 'r1': 'Ich suche', 'r2': 'etwas Fertiges.', 'foot': 'kniff.shop · 3D-Druck aus Berlin'},
    'en': {'file': 'og-en.jpg', 'l_eye': '3D PRINTING ON REQUEST', 'l1': 'I have', 'l2': 'an idea.',
           'r_eye': 'READY-MADE KNIFFE', 'r1': 'I want it', 'r2': 'ready-made.', 'foot': 'kniff.shop · 3D printing from Berlin'},
}


def b64(path):
    return base64.b64encode(path.read_bytes()).decode()


def png_from(src, tmp):
    out = tmp / (src.stem + '.png')
    subprocess.run(['sips', '-s', 'format', 'png', str(src), '--out', str(out)], check=True, capture_output=True)
    return out


def svg(t, kopf, muenz, mark):
    font = lambda fam, w, f: (f"@font-face{{font-family:'{fam}';font-weight:{w};"
                              f"src:url(data:font/woff2;base64,{b64(A / 'fonts' / f)}) format('woff2');}}")
    fonts = (font('Archivo', 800, 'archivo-800-normal-latin.woff2') + font('Inter Tight', 400, 'inter-tight-400-normal-latin.woff2')
             + font('IBM Plex Mono', 400, 'ibm-plex-mono-400-normal-latin.woff2'))
    # 1200 × 1200, das eigentliche Bild liegt im mittigen Band y = 285 … 915
    return f'''<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="1200" height="1200" viewBox="0 0 1200 1200">
<style>{fonts}
.d{{font-family:'Archivo';font-weight:800;font-size:66px;letter-spacing:-2.6px}}
.e{{font-family:'IBM Plex Mono';font-size:15px;letter-spacing:1.4px}}
.f{{font-family:'IBM Plex Mono';font-size:15px}}</style>
<g transform="translate(0 285)">
  <rect width="600" height="630" fill="#0b0d0e"/>
  <rect x="600" width="600" height="630" fill="#f4ede1"/>
  <rect y="0" width="1200" height="74" fill="#0b0d0e"/>
  <image x="48" y="20" width="84" height="36" xlink:href="data:image/png;base64,{mark}"/>
  <rect y="74" width="1200" height="10" fill="#3a3e43"/>
  <rect y="74" width="1200" height="1" fill="#6e7277"/>
  <rect y="77" width="560" height="3" fill="#f2a63b"/>
  <g stroke="#f2a63b" stroke-width="1.6" stroke-dasharray="7 6" fill="none">
    <path d="M60 330V150h52v124h148v56z"/>
  </g>
  <image x="712" y="100" width="380" height="282" xlink:href="data:image/png;base64,{muenz}"/>
  <image x="513" y="66" width="174" height="378" preserveAspectRatio="xMidYMin meet" xlink:href="data:image/png;base64,{kopf}"/>
  <text x="60" y="414" class="e" fill="#f2a63b">{t["l_eye"]}</text>
  <text x="60" y="484" class="d" fill="#f3f0ea">{t["l1"]}</text>
  <text x="60" y="550" class="d" fill="#f3f0ea">{t["l2"]}</text>
  <text x="652" y="414" class="e" fill="#7a4a17">{t["r_eye"]}</text>
  <text x="652" y="484" class="d" fill="#221c14">{t["r1"]}</text>
  <text x="652" y="550" class="d" fill="#221c14">{t["r2"]}</text>
  <text x="60" y="604" class="f" fill="#a9adac">{t["foot"]}</text>
</g>
</svg>'''


def main():
    with tempfile.TemporaryDirectory() as d:
        tmp = pathlib.Path(d)
        kopf = b64(png_from(A / 'kopf.webp', tmp))
        muenz = b64(png_from(A / 'muenzsortierer-freigestellt.webp', tmp))
        mark = b64(A / 'kniff-wortmarke-hell.png')
        for lang, t in TEXT.items():
            src = tmp / f'og-{lang}.svg'
            src.write_text(svg(t, kopf, muenz, mark), encoding='utf-8')
            subprocess.run(['qlmanage', '-t', '-s', '2400', '-o', str(tmp), str(src)], check=True, capture_output=True)
            png = tmp / (src.name + '.png')
            subprocess.run(['sips', '-c', '1260', '2400', str(png)], check=True, capture_output=True)
            subprocess.run(['sips', '-Z', '1200', '-s', 'format', 'jpeg', '-s', 'formatOptions', '88', str(png),
                            '--out', str(A / t['file'])], check=True, capture_output=True)
            shutil.copy(src, ROOT / 'out-brand' / src.name) if (ROOT / 'out-brand').is_dir() else None
            print('geschrieben:', A / t['file'])


if __name__ == '__main__':
    main()
