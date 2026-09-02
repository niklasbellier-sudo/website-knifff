# Kniff-Website: Deployment

Projektordner: **`~/Desktop/Kniff/website`** (Git-Repo, Branch `main`).
Live-Domain: **kniff.shop** (Netlify).

Ziel: **`git push` → Netlify baut & stellt live**. Kein Ordner-Ziehen mehr,
kein „welchen Ordner denn jetzt".

---

## Einmalige Einrichtung (danach nie wieder)

Das lokale Repo ist fertig. Es fehlt nur: zu GitHub bringen, in Netlify
verbinden.

### 1 — Repo zu GitHub

**Ohne Terminal (GitHub Desktop, empfohlen):**
1. GitHub Desktop laden (desktop.github.com), mit GitHub-Account anmelden.
2. *File → Add Local Repository…* → `~/Desktop/Kniff/website` wählen.
3. *Publish repository* klicken. Haken **„Keep this code private"** lassen.
   Name z. B. `kniff-website`. → *Publish*.

**Mit Terminal:**
1. Auf github.com ein **leeres** privates Repo `kniff-website` anlegen
   (ohne README, ohne .gitignore, ohne Lizenz).
2. ```bash
   cd ~/Desktop/Kniff/website
   git remote add origin https://github.com/DEIN-USER/kniff-website.git
   git push -u origin main
   ```
   Beim Passwort-Prompt einen **Personal Access Token** eingeben
   (github.com → Settings → Developer settings → Personal access tokens,
   Scope `repo`).

### 2 — Netlify mit dem Repo verbinden

Damit die **bestehende** Site mit der Domain kniff.shop weiterläuft:

1. Netlify → deine Kniff-Site → **Site configuration → Build & deploy →
   Continuous deployment → „Link repository"**.
2. **GitHub** wählen, Netlify Zugriff auf `kniff-website` geben, Branch **`main`**.
3. Build command und Publish directory zieht Netlify aus `netlify.toml`:
   - Build command: `bash scripts/netlify-build.sh`
   - Publish directory: `_site`
4. Speichern → Netlify baut sofort einen ersten Deploy aus dem Repo.

Falls „Link repository" fehlt: **Add new site → Import an existing project →
GitHub → kniff-website**, danach unter *Domain settings* die Domain `kniff.shop`
auf diese Site umhängen und die alte drag-and-drop-Site löschen.

---

## Ab jetzt: aktualisieren

**Wenn Claude die Änderungen macht:** einfach sagen, was geändert werden soll.
Claude committet und pusht, Netlify deployt in ~1 Minute.

**Selbst:**
```bash
cd ~/Desktop/Kniff/website
# ... Änderungen ...
git add -A
git commit -m "kurze Beschreibung"
git push
```

Fortschritt: Netlify → **Deploys**. Prüfen, dass live: `https://kniff.shop/build.txt`
zeigt aktuelles Datum.

`_site/` wird von Netlify selbst gebaut und ist bewusst **nicht** im Repo.
Lokal testen geht trotzdem:
```bash
cd ~/Desktop/Kniff/website
bash scripts/netlify-build.sh
python3 -m http.server 4507   # dann http://127.0.0.1:4507
```

---

## Notfall-Fallback: Drag & Drop

Nur wenn Git/Netlify mal klemmt.
1. `cd ~/Desktop/Kniff/website && bash scripts/netlify-build.sh`
2. app.netlify.com → **bestehende** Kniff-Site → Tab **Deploys** → den Ordner
   **`~/Desktop/Kniff/website/_site`** ins Drop-Feld ziehen. **Nicht** `website`,
   nur `_site`.

## Seite sieht nach dem Deploy noch alt aus?

1. **Hard-Reload** (Cmd+Shift+R).
2. Netlify → Deploys: neuster Deploy als **„Published"** markiert? Sonst
   „Publish deploy".
3. `kniff.shop/build.txt` öffnen — steht dort das neue Datum, ist der Stand live
   und nur der Browser cacht.
4. Nicht versehentlich **zwei Netlify-Sites** (alt + neu). Domain kniff.shop muss
   auf die richtige zeigen.

---

## Kontaktformular → Kniffshop@gmail.com

Beide Formulare (`kontakt` auf `kontakt.html`, `custom-druck` auf
`3d-druck-auf-anfrage.html`) laufen über **Netlify Forms**. Wohin die Mails
gehen, wird **nicht** im Code gesetzt, sondern einmal im Dashboard:

1. Einmal deployen. Danach erscheinen die Formulare unter **Netlify → Site →
   Forms**.
2. **Forms → Settings → Form notifications → Add notification → Email
   notification**.
3. „Email to notify": **`Kniffshop@gmail.com`** — für **beide** Formulare.
4. Testeinsendung über die Live-Seite, Ankunft prüfen (ggf. Spam). Einsendungen
   stehen zusätzlich immer unter **Forms** im Dashboard.

Bestätigungsseite nach dem Absenden: `danke.html`.

---

## Nach dem Go-Live noch offen

- **Rechtstexte** (Impressum, Datenschutz, AGB, Widerruf) sind vom alten Stand
  übernommen, nur neu gestylt — Inhalt unverändert. Vor echtem Verkaufsstart
  fachkundig prüfen lassen.
- **GPSR-Pflichtangaben** an den Produkten, sobald direkt über die Seite (nicht
  nur Etsy) bestellt werden kann. Pro Produkt sichtbar:
  - Hersteller: Niklas-Amoah Alotey, Württembergallee 27, 14052 Berlin,
    kniffshop@gmail.com — Herkunftsland Deutschland
  - Modellnummern: `KNF-STA-01` Stiftehalter, `KNF-SPC-01` Spiegel-Clip,
    `KNF-RWD-01` Reisedose, `KNF-KH10-01` Kartenhalter, `KNF-HST-01` Handyständer
  - Bei Spiegel-Clip und Stiftehalter (Kleinteile): „Kein Spielzeug. Enthält
    Kleinteile — nicht geeignet für Kinder unter 3 Jahren."
- **Etsy-Buttons**: zeigen aktuell auf das Kontaktformular. Wenn die Etsy-Listings
  online sind, zurückbauen (siehe `~/Desktop/Kniff/02-produkt-infos/
  kniff-aenderungsauftrag-website.md`, Block 2).
- **Netlify Forms** wie oben auf Kniffshop@gmail.com stellen.

## Assets neu generieren (optional)

KIE-Key liegt in `~/.config/kniff/.env` (außerhalb des Repos). Skripte in
`scripts/` (`kie.sh`, `gen-*.sh`). Danach mit `sips` auf Webgröße nach
`assets/scenes/`, `?v=` in den HTML-Dateien hochzählen, committen, pushen.
Render-Master liegen in `~/Desktop/Kniff/03-bild-quellen/render-masters/`.
