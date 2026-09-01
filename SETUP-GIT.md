# Auto-Deploy über Git einrichten (einmalig)

Danach gilt: `git push` → Netlify baut & stellt live. Von jedem Tool aus,
kein Ordner-Ziehen mehr.

Das lokale Git-Repo ist **schon fertig** (Branch `main`, erster Commit liegt
vor). Es fehlen nur noch: Repo bei GitHub anlegen, hochpushen, in Netlify
verbinden.

---

## Schritt 1 — Repo zu GitHub bringen

**Variante A: GitHub Desktop (ohne Terminal, empfohlen)**
1. GitHub Desktop installieren (desktop.github.com), mit GitHub-Account anmelden.
2. *File → Add Local Repository…* → Ordner `~/Downloads/kniff-website_11` wählen.
3. Oben *Publish repository* klicken. Haken bei **"Keep this code private"** lassen.
   Name z. B. `kniff-website`. → *Publish*.

**Variante B: Terminal mit gh CLI**
```bash
brew install gh          # falls noch nicht da
gh auth login            # GitHub im Browser bestätigen
cd ~/Downloads/kniff-website_11
gh repo create kniff-website --private --source=. --remote=origin --push
```

**Variante C: Terminal ohne gh**
1. Auf github.com ein **leeres** privates Repo `kniff-website` anlegen
   (ohne README/.gitignore).
2. ```bash
   cd ~/Downloads/kniff-website_11
   git remote add origin https://github.com/DEIN-USER/kniff-website.git
   git push -u origin main
   ```
   Beim Passwort-Prompt einen **Personal Access Token** eingeben
   (github.com → Settings → Developer settings → Tokens, Scope `repo`).

---

## Schritt 2 — Netlify mit dem Repo verbinden

Damit die **bestehende** Seite (mit deiner Domain kniff.shop) weiterläuft:

1. Netlify → deine Kniff-Site → **Site configuration → Build & deploy →
   Continuous deployment → Link repository**.
2. **GitHub** wählen, Netlify Zugriff auf das Repo `kniff-website` geben.
3. Branch: **main**. Build command und Publish directory erkennt Netlify aus
   `netlify.toml` automatisch:
   - Build command: `bash scripts/netlify-build.sh`
   - Publish directory: `_site`
4. Speichern → Netlify macht sofort einen ersten Build vom Repo.

Alternativ (falls „Link repository" fehlt): **Add new site → Import an existing
project → GitHub → kniff-website**. Dann unter *Domain settings* die Domain
`kniff.shop` auf diese neue Site umhängen und die alte Site löschen.

---

## Ab jetzt

```bash
cd ~/Downloads/kniff-website_11
# ... Änderungen machen ...
git add -A
git commit -m "kurze Beschreibung"
git push
```

Netlify baut in ~1 Min und stellt live. Status siehst du unter **Deploys**.
Prüfen: `https://kniff.shop/build.txt` zeigt Datum + „neues Kniff-Design".

## Wenn ein Build fehlschlägt

Netlify → Deploys → den roten Deploy öffnen → **Deploy log** lesen. Fast immer
ein Tippfehler in einer Datei. Lokal testen:
```bash
bash scripts/netlify-build.sh && python3 -m http.server 4507
```
