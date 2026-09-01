# kniff.shop

Statische Website für Kniff (3D-Druck auf Anfrage, Berlin). Kein Framework, kein
Node-Build. Die Live-Seite wird von Netlify aus `_site/` ausgeliefert, das
`scripts/netlify-build.sh` beim Deploy erzeugt.

## Lokal ansehen

```bash
python3 -m http.server 4507
# -> http://localhost:4507
```

## Ändern und live stellen

1. HTML/CSS/JS im Projektordner bearbeiten. Beim Tausch von Bildern die
   `?v=NN` in den `<link>`/`<script>`-Tags hochzählen (Cache).
2. `git add -A && git commit -m "…" && git push`
3. Netlify baut automatisch und stellt live (sofern das Repo verbunden ist,
   siehe `SETUP-GIT.md`).

Manuell ohne Git: `bash scripts/netlify-build.sh`, dann den Ordner `_site` bei
Netlify unter „Deploys" reinziehen. Details in `DEPLOY.md`.

## Struktur

| Pfad | Inhalt |
|---|---|
| `index.html` | Startseite, 6-Akt Scroll-Erlebnis mit WebGL-Hero |
| `3d-druck-auf-anfrage.html` | Custom-Druck (Priorität): 4 Schritte, Formular (Netlify Forms) |
| `shop.html` | 4 Produkte, echte PLA-Farben |
| `ueber-uns.html` `kontakt.html` `versand-zahlung.html` | Cinematic-Hero + Inhalt |
| `impressum/datenschutz/agb/widerruf.html` | Rechtstexte, nur neu gestylt |
| `danke.html` | Formular-Erfolgsseite |
| `css/scrollcraft.css` | Scroll-Engine-Styles (nicht ändern) |
| `css/kniff.css` | Theme + Layout dieser Seite |
| `js/scrollcraft.js` | Scroll-Engine (nicht ändern) |
| `js/kniff-bench.js` | WebGL-Hero, gesteuertes Licht, Farbwechsel |
| `assets/scenes/` | KI-Renders (KIE.AI) |
| `assets/fonts/` | selbst gehostete Schriften (Archivo, Inter Tight, IBM Plex Mono) |
| `scripts/` | Build + Asset-Generierung (KIE.AI via `kie.sh`) |
| `scrollcraft/builds/kniff-home/BRIEF.md` | Design-Konzept, Grammatik, Feeling-Curve |

## Formulare

`custom-druck` und `kontakt` laufen über **Netlify Forms** (`data-netlify="true"`).
Nach dem ersten Deploy in Netlify unter **Forms** die E-Mail-Benachrichtigung
einrichten.

## Assets neu generieren

Key liegt in `~/.config/kniff/.env` (nicht im Repo). Beispiel:

```bash
scripts/kie.sh still "<prompt>" out/x.png --ar 16:9
```

Danach mit `sips` auf Webgröße bringen, nach `assets/scenes/`, `?v=` hochzählen.
