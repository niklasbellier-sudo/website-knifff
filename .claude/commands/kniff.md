---
description: Kniff — Kontext & aktuellen Arbeitsstand laden (nach Chat-Löschung)
argument-hint: [optionaler Fokus, z.B. "renders", "etsy", "sortiment"]
allowed-tools: Bash(cd:*), Bash(git log:*), Bash(git status:*), Read
---
Du übernimmst die laufende Arbeit an **Kniff** (kniff.shop — 3D-Druck aus Berlin: Etsy-Shop + Website + Instagram, Inhaber Niklas-Amoah Alotey, Kleinunternehmer §19 UStG). Dieser Chat ist frisch; der vorherige wurde zum Credit-Sparen gelöscht. Der komplette Verlauf steckt in der Memory — **nicht bei Null anfangen**.

## Zuerst lesen
- Projektgedächtnis (vollständig, ~750 Zeilen): `~/.claude/projects/-Users-niklasalotey/memory/kniff-scrollcraft.md` — Design-Stil, Deploy-Workflow, alle bisherigen Commits, Blocker, Betriebsfakten, Budgetzahlen.
- Verhaltensnotizen: `~/.claude/projects/-Users-niklasalotey/memory/feedback-*.md` (Asset-Qualität, Renders müssen zum echten Produkt passen, Fortschrittssignale, Blockiert-Status nur einmal melden).
Diese Dateien werden automatisch geladen; bei Bedarf gezielt nachschlagen.

## Repo & Workflow
- Repo: `~/Desktop/Kniff/website` (statische HTML/CSS/JS, kein Framework, kein Node-Build). Dorthin `cd`.
- Deploy: **Ich committe lokal** (Autor `niklasbellier-sudo <niklasbellier@gmail.com>`), **Niklas pusht** über GitHub Desktop → Netlify baut `bash scripts/netlify-build.sh` → live auf `kniff.shop`. Ich habe KEINE Push-Rechte.
- Grafik-Pipeline: `out-brand/gen.py` (alle Marken-/Social-/Print-Grafiken, gitignored); `scripts/kie.sh still "<prompt>" out.png --ar 16:9 --ref <foto>` (KIE, ~14 Credits/Bild, Key in `~/.config/kniff/.env`). Renders IMMER mit echtem Produktfoto als `--ref`. SVG→PNG immer bei 2048 rendern, dann per `sips` runterskalieren.
- Nur `sips` + `qlmanage` fürs Bildhandling (kein ImageMagick/PIL). Vor `git status` einmal `git update-index --refresh`. HTML-only-Änderung braucht keinen `?v=`-Bump; CSS/JS schon (in 12 Dateien, gemeinsame Version).

## Lebende Übersichten (unabhängig vom Chat, auf claude.ai)
- **Projektplan + Budget + Monatscheck:** https://claude.ai/code/artifact/29912519-8021-40e3-9a10-15de577fd1c3
- **Launch-Ticker:** https://claude.ai/code/artifact/6f16415b-8164-4e28-be47-240637f467d8
Zum Aktualisieren: Artifact `action:"read"` mit der URL → Änderungen mergen → gleichen `file_path` neu publishen. WICHTIG: in `buildDoc()` NIE `document.head.innerHTML` verwenden (CSS geht dann verloren) — den Head als JS-Konstante selbst zusammensetzen.

## Aktueller Arbeitsstand
Website, Etsy-Shop und Marke stehen und sind live. In Arbeit / als Nächstes:
1. **Sortiment im September auf 15 Produkte hochskalieren** — Portfolio-Ansatz: breit starten, nach 4–8 Wochen 2–3 Gewinner identifizieren, jeden Gewinner als eigene Linie skalieren (Varianten, eigene Fotos, dedizierte Ads). **Engpass = Lizenz**: nur CC0/CC-BY/CC-BY-SA-Modelle oder eigene Designs (MakerWorld-Standardlizenz verbietet Wiederverkauf; Printables oft besser). Pro Produkt: 1 Render + Etsy-Listing aus Vorlage.
2. **Rechtliche Pflichten (nur Niklas):** Verpackungslizenz duales System (~39 €/J, LUCID allein reicht nicht), Produkthaftpflicht (~150 €/J), Rechtstexte fachkundig prüfen lassen.
3. **Etsy (nur Niklas):** die 5 referenzgeführten Use-Case-Renders als Listing-Hauptbild einsetzen, GPSR-Text pro Listing ins Feld „Produktsicherheitsinformationen", SEO/Tags/Attribute für alle 5 (bisher nur der Sonnenblenden-Clip optimiert).
4. **Instagram (nur Niklas):** restliche 9 Posts + Post 06 (Launch) veröffentlichen; Social-Media-Tool wählen (Metricool oder Buffer) + @kniffshop auf Business-Konto umstellen + FB-Seite verknüpfen. Danach: ich liefere Redaktionsplan + Grafiken, Auto-Publish übers Tool.
5. **Offene Commits pushen** (Niklas, GitHub Desktop).

Aktueller Repo-Stand:
!`cd ~/Desktop/Kniff/website && git log --oneline -8 && echo "--- ungepusht ---" && git log --oneline @{u}..HEAD 2>/dev/null && echo "--- geaenderte Dateien ---" && git -c core.fsmonitor=false status -s`

## Fokus für diese Sitzung
$ARGUMENTS

Fass den aktuellen Stand in ein paar Zeilen zusammen und frag, woran wir weitermachen — es sei denn, oben ist schon ein Fokus genannt, dann leg damit los.
