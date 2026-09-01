# Kniff auf Netlify aktualisieren

**Wichtig:** Es wird IMMER der Ordner **`_site/`** deployed — nicht der
Projektordner `kniff-website_11`. `_site/` enthält nur die fertige Live-Seite
(11 HTML-Seiten inkl. Über uns, `css/`, `js/`, `assets/`, `robots.txt`,
`sitemap.xml`). Skripte, Planungsnotizen, der KIE-Key und die Roh-Bilder sind
NICHT drin.

## Schritt 1 — bauen

```bash
cd ~/Downloads/kniff-website_11
bash scripts/netlify-build.sh
```

Danach in `_site/build.txt` prüfen, dass Datum + „neues Kniff-Design" stimmt.

## Schritt 2 — deployen (eine Variante wählen)

### A) Drag & Drop (am einfachsten)
1. app.netlify.com öffnen → **dein bestehendes Kniff-Projekt** anklicken
   (nicht ein neues anlegen, sonst bekommst du eine zweite URL).
2. Tab **Deploys** → unten das Feld „Drag and drop your site output folder here".
3. Aus dem Finder den Ordner **`_site`** dort hineinziehen
   (Pfad: `~/Downloads/kniff-website_11/_site`). **Nicht** `kniff-website_11`.
4. Netlify baut den Deploy und zeigt dir oben die Live-URL. Nach ~30 Sekunden ist
   die neue Seite live.

### B) Netlify CLI
```bash
cd ~/Downloads/kniff-website_11
npx netlify deploy --dir=_site --prod
```

### C) Git (falls dein Projekt mit einem Repo verbunden ist)
`netlify.toml` ist konfiguriert (`command = "bash scripts/netlify-build.sh"`,
`publish = "_site"`). Änderungen committen und pushen, Netlify baut selbst.

## Wenn die Seite nach dem Deploy noch alt aussieht

1. **Hard-Reload** im Browser (Cmd+Shift+R) — Netlify/Browser cachen aggressiv.
2. Netlify → **Deploys**: ist der neuste Deploy als **„Published"** markiert?
   Sonst „Publish deploy" klicken.
3. Öffne `deine-url/build.txt` — steht dort das aktuelle Datum, ist der neue
   Stand live und dein Browser cacht nur.
4. Prüfe, ob du versehentlich **zwei Netlify-Sites** hast (eine alte, eine neue).
   Die Domain `kniff.shop` muss auf die richtige zeigen (Site → Domain settings).
5. Bei Git-Anbindung: ist der Push auf dem Branch gelandet, den Netlify baut?

## Kontaktformular mit Kniffshop@gmail.com verknüpfen

Beide Formulare (`kontakt` auf `kontakt.html`, `custom-druck` auf
`3d-druck-auf-anfrage.html`) laufen über **Netlify Forms**. Wohin die
Einsendungen als E-Mail gehen, lässt sich **nicht** im HTML festlegen, sondern
nur einmalig im Netlify-Dashboard:

1. Einmal deployen (Schritt 1 + 2). Danach erscheinen die Formulare unter
   **Netlify → deine Site → Forms**.
2. Ein Formular öffnen (oder `Form notifications` unter **Forms → Settings**).
3. **Add notification → Email notification**.
4. Bei „Email to notify" **`Kniffshop@gmail.com`** eintragen, für beide
   Formulare (`kontakt` und `custom-druck`).
5. Testeinsendung über die Live-Seite schicken und prüfen, dass die Mail
   ankommt (ggf. Spam-Ordner). Einsendungen stehen zusätzlich immer unter
   **Forms** im Dashboard.

Die Bestätigungsseite nach dem Absenden ist `danke.html`.

## Nach dem Go-Live noch zu erledigen

- **Rechtstexte** (Impressum, Datenschutz, AGB, Widerruf) sind aus dem alten
  Stand übernommen und nur neu gestylt — Inhalt unverändert. Vor echtem
  Verkaufsstart von fachkundiger Stelle prüfen lassen.

## Assets neu generieren (optional)

`bash scripts/gen-commercial.sh` / `scripts/kie.sh still "..." out/x.png --ar 16:9`.
Key kommt automatisch aus `~/.config/kniff/.env`. Danach mit `sips` auf Webgröße,
nach `assets/scenes/`, `?v=` in den HTML-Dateien hochzählen, `_site` neu bauen.
