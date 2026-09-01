# BRIEF — kniff-home

Interviewed (answers 1–8 from Niklas, verbatim where possible). Not self-authored.
Focus stated separately: move visitors to submit their own 3D-print ideas; the
shop is important but secondary.

## The eight answers

1. **Vibe + references.** "Futuristisch". Film: *Interstellar*. Confirmed the
   rest of my read: precise, honest, workshop-near, quiet-technical, made in
   Germany.

2. **The scroll journey, in their words.** "Der Besucher sieht zuerst ein 3D
   Modell, was sich zusammen baut, während die Website lädt. Evtl mit einem
   Ladebalken. Danach kommt eine Einführung darüber was unsere Dienstleistungen
   sind und wie wir arbeiten bzw. dazu gekommen sind, danach kommen unsere
   Referenzen, Platzhalter für gute Bewertungen etc. und dann der Shop. Die
   entstehungsgeschichte wäre auch gut."

3. **Energy curve.** "Intensiv am Anfang, um die Aufmerksamkeit zu erregen.
   Ruhig z.B. bei der Entstehungsgeschichte."

4. **The one moment.** "Dieser Moment soll die Startseite sein. Die muss
   definitiv überzeugen." → the hero itself is the peak.

5. **One thing no other site does.** "Die Seite soll interaktiv sein, man sollte
   nicht immer mittig auf den selben langeweiligen Button klicken müssen, sondern
   mit verschiedenen 3D Modellen und Grafiken spielen können."

6. **Aesthetic range.** "Maximalistisch & editorial."

7. **World.** "Ich bin dabei und gucke mir an, was du vorhast." → chosen:
   low-key cinematic (worlds.md #1), Interstellar grade. Real printed parts,
   deep black, one warm key light, cool ambient fill, matte film grain,
   anamorphic feel. No warm-paper technical-drawing look.

8. **Assets.** Product photos NOT final; all products swapped. New range is
   4 of 20; pro photos + copy come the day after this brief (2026-09-01).
   New product names given:
   - Kartenbox für Sammelkarten
   - Aufbewahrungsbox für Q-Tips / Stifte o. Ä.
   - Stiftehalter fürs Auto
   - Sonnenblenden-Clip (für Stift oder faltbares Papier, an die Sonnenblende)
   No workshop/printer photos, CAD, STL, or founder photo supplied yet.

## Grammar — NEW, named: "Workbench"

None of the eight grammars in uniqueness.md fit an interactive page built around
manipulable 3D objects, so a new one is named and given real forbids.

- **Organising logic.** The page is a lit workbench in a dark room. Each act
  sets one *object* on the bench under the light; the visitor can turn it, break
  it open, or change its material before the page moves on. A "section" is an
  object on the bench, not a chapter and not an act of an argument.
- **Scroll feels like.** Things set down in front of you one at a time, each one
  pickup-able, in one continuous dark space with a moving key light.
- **Chrome.** No marketing bar. A thin fixed instrument line (bottom-left)
  reading the current object name + a live spec readout (caliper / slicer HUD,
  TARS-style monospace). It doubles as nav: object names jump.
- **Hero.** The signature object assembling itself during load, grabbable the
  instant the intro wipe clears. Not a title page.
- **Close.** The bench clears to one blank "your part" placeholder; the CTA is
  the act of putting your idea on the bench (a real describe/upload control),
  not a centred button island. Resolves and holds.
- **Forbids.** Centred hero copy; the same "click the button" CTA repeated; any
  act whose object is a static image (every hero object is manipulable, or is
  clearly a photograph used as resolution); filler verbs; more than one accent
  hue; em dashes visible.
- **Leans on.** `pin`, `pan`, `reveal`, `tilt` / `magnet` / `spotlight`,
  `count` on real specs only, bespoke WebGL and `--sc-p`-driven object rigs.
- **Bans.** `scrub` (no video toolchain anyway), worldflight, `kinetic` beyond
  the hero, `drift` as one continuous gradient (grounds hard-cut per act).

## Fingerprint gate

Registry empty; kniff-home is build #1. Passes by default. Row appended on ship.

## Signature move

**The bench light you steer, and every object on the page turns and is shaded by
it.** One pointer-driven key light (`data-sc-spotlight` publishes
`--sc-mx/--sc-my`) wired — bespoke — to the rotation, shading and cast shadow of
whichever printed part is on the bench. Moving the pointer *is* turning the part
over under the light. On touch, scroll velocity drives it. Present the whole
page; it is also the nav feel.

Sub-toys (the grammar's thesis, not seasoning):
- Hero: drag to explode the assembled part into its printed layers; release to
  snap back.
- Material / finish switch (PLA colours + matte/satin) that regrades the current
  object *and* the page accent — one control, whole-page regrade.
- Product rail: each object rotates to face the light as it passes.

## Tell-someone sentence

> It's the site where you move your mouse and you're turning a 3D-printed part
> over under a workshop light, and every part further down the page turns with it.

## Feeling curve

```
1  Hero        Awe / control    a part swims out of black and assembles under a
                                light you are already steering; yours to turn
                                before you have read a word. PEAK. Largest span.
                                Silence before it = the black load screen and the
                                assembling object, no copy.
2  Process     Competence       idea -> check -> quote -> print; each stage a
                                cross-section wiping open on the same part
3  Proof       Impressed        reference objects on a rail, each turning to the
                                light as it passes; real specs count up; review
                                placeholders set as pull-quotes on the same rail
4  Origin      Calm / intimacy  the Waschmaschine story. Longest-feeling, near
                                still, one warm photo, the light stops moving.
                                Counter-peak: quiet is the loudest thing here.
5  Range       Curiosity        the shop: 4 of 20 finished Kniffe, pickable.
                                Deliberately lighter than everything above it.
6  Your turn   Resolve          bench clears to a blank "your part"; CTA is
                                putting your idea on the bench; holds, does not
                                fade.
```

Authored silence: the pre-hero load screen (Act 1 entry) is intentional
anticipation, not dead scroll.

## Score table (device per act)

| Act | Device(s) | Why this one |
|---|---|---|
| 1 Hero | `pin` + bespoke WebGL + `spotlight` + `kinetic` (once) | The bench holds while the object assembles and the visitor steers the light; the only kinetic headline on the page |
| 2 Process | `pin` + `reveal` (cross-section wipe) + `count` | A wipe is a change of state, which is what each process stage is; real numbers (Tage, g Material) if supplied, else no counter |
| 3 Proof | `pan` + `tilt` | Lateral travel reads as breadth; objects the visitor would pick up get tilt; review quotes are labels on the rail |
| 4 Origin | `flow` + one `reveal` on the photo | The one act that reads like a document; the light holds still; quiet by construction |
| 5 Range | `pan` + `tilt` | Same rail idiom as Proof but lighter, shorter, fewer specs; this is the secondary priority and should feel it |
| 6 Your turn | `pin` + `magnet` on the submit control + `spotlight` | The page stops travelling and starts responding; the CTA is a target you move toward, not a button you find |

Checks: 5 device families (pin, reveal, pan, flow, magnet/tilt/spotlight);
never the same family twice in a row; zero `scrub` acts; no two adjacent acts
share a feeling; Act 1 is the peak with the largest span and Act 4 (before the
shop) is the quiet before nothing louder follows on the bottom half.
Target total length ~12.5 vh across 6 acts, spans lopsided on purpose
(hero big, origin biggest-feeling, close tiny) so the page has shape and does
not land on an even-2.2vh template.

## World preamble (paste verbatim into every image prompt)

> Cinematic product photography shot on 35mm anamorphic lenses. Shallow depth of
> field, high dynamic range, true blacks, matte film grain. Low-key lighting:
> one warm amber key from upper left, cool blue ambient fill, deep falloff into
> shadow. Colour grade of deep charcoal, warm amber highlights, desaturated
> mid-tones, faint cyan in the shadows. A single matte PLA 3D-printed part,
> visible fine layer lines, no plastic sheen, sitting on a dark scratched steel
> workbench. Photographic realism. NOT 3D render, NOT clay, NOT illustration,
> NOT CGI, no digital glow, no neon.

Each scene prompt then names the object, the frame, and where the empty space
for copy goes.

## Accent / theme (proposed, not yet confirmed with Niklas)

Shift the brand accent from teal `#0f8b8b` to a warm instrument amber
(~`#F2A63B`) — the bench key light and the single accent. Deep charcoal canvas
with a faint cool-blue cast in the shadows (canvas family, not a second accent).
Two type families: a heavy grotesk for display (maximalist weight), a clean
grotesk for text.

## Asset plan (KIE.AI, budget-bounded)

No video (no ffmpeg; hero is real WebGL). Stills only, one style preamble reused
verbatim.

First wave, ~5 stills (~140 credits list ≈ 0.70 EUR):
- 3 cinematic PLA-part grounds for Process / Proof / Origin (copy negative space)
- 1 quiet warm workshop/printer still for Origin (placeholder; swap for a real
  photo when supplied)
- 1 spare hero-poster still (fallback frame behind the WebGL canvas)

Deferred until real photos land (2026-09-01): the 4 product stills for the shop
rail. Free wireframe/silhouette placeholders until then.

Hard cap for generation this build: 2000 credits (~10 EUR list, ~4 EUR effective).
Stop and ask before exceeding. Account holds 80 credits at brief time; Niklas to
top up ~5-10 USD (1000-2000 credits) on kie.ai before any generation.

## Build sequence (whole site)

1. `index.html` — full Workbench build (engine + WebGL hero + 6 acts + steered light).
2. `3d-druck-auf-anfrage.html` — priority sub-page; the 4-step process deep, the
   submit form styled as "the bench."
3. `shop.html` — gallery/catalog on the same floor; 4 real products, 16 "in Entwicklung."
4. `ueber-uns.html` — the origin story, long-form editorial, quiet.
5. `kontakt.html`, `versand-zahlung.html` — floor + type, simple.
6. `impressum` / `datenschutz` / `agb` / `widerruf` — token theme + type only,
   stay plain documents.

Shared: themed `scrollcraft.css` + site `kniff.css` (nav, footer, HUD);
`scrollcraft.js` (untouched engine) + `kniff-bench.js` (WebGL objects + toys).

---

## Build log

**2026-08-31 / 09-01 — first full pass, autonomous.**

- Grammar "Workbench" built. Hero: hand-rolled WebGL (no deps, no CDN) —
  originally a deck box, then a model car (read as slabs), settled on a
  **9-part gear-reduction unit** (box + cylinder primitives) per Niklas's ask
  for "etwas leicht komplexeres mit Einzelteilen die auseinandergehen".
  Steered light + material switch (regrades `--sc-accent`) + "Explosionsansicht"
  toggle + drag-to-turn/explode.
- Accent: amber `#f2a63b` as the one accent; Kniff teal kept as cool atmosphere
  + HUD hairline only (per Niklas: "mit den bestehenden Farben kombinieren").
- Scene stills regenerated on a **dark anodised aluminium bench** (Niklas:
  "nicht in Holz optik"). 7 stills total (01-process, 02-proof, 03-origin,
  04-close, 05-hero-gearbox, 10-custom-hero, 11-shop-hero). KIE spend so far
  ~182 credits list (~€0.90 effective); 898 credits left.
- Fonts self-hosted (Archivo / Inter Tight / IBM Plex Mono, OFL) — Google
  Fonts CDN avoided for GDPR.
- **Pages built on the same floor:** index (6-act Workbench), 3d-druck-auf-anfrage
  (priority; process steps, briefing checklist, Treiben-Horn example, **Netlify
  form**, FAQ), shop (4 new products as CSS-3D placeholders + Mystery Box concept),
  ueber-uns (long-form origin story), kontakt (**Netlify form** + direct contact),
  versand-zahlung (info), danke (form success). Legal pages (impressum,
  datenschutz, agb, widerruf) reskinned onto the floor — **legal text
  unchanged**, verbatim.
- **Netlify-ready:** `netlify.toml` + `scripts/netlify-build.sh` → clean `_site/`
  (3.6 MB). `DEPLOY.md` has the three deploy paths. KIE key moved to
  `~/.config/kniff/.env`; raw masters + unused old assets moved to
  `~/Downloads/kniff-masters/`.

### Not yet done / known rough edges

- Hero WebGL object still overlaps the headline slightly on tall portrait
  viewports; camera offY/dist is a heuristic, could be tuner-tightened.
- Verify harness (playwright) can't run here (Node 10) — verified by eye in the
  in-app browser across desktop + mobile + the 6 acts; no console errors, no
  404s on final load. No true reduced-motion contrast audit.
- Act-2 cross-section SVG is decent but still reads a bit HUD-ish.
- Real product photos + copy + prices to replace the placeholders (Niklas
  bringing them ~2026-09-01).
- feel.md §6 cold feel-check not formally run.

**2026-09-01 — art-direction pivot to commercial / DTC.**
Niklas sent a Reel (CIAO energy-drink hero shot) wanting "realistischer, mehr
commercial style". Regenerated ALL scene stills as bright glossy single-object
hero shots floating on a bold amber colour-field glow (advertising quality),
keeping matte PLA honest. Cinematic-bench versions kept at
`~/Downloads/kniff-masters/scenes-cinematic/`.
Hero rebuilt: dropped the crude procedural WebGL, now a floating **commercial
render of an exploded planetary gearbox** with pointer parallax + idle float +
a bold amber `::before` glow field. The material switch swaps between 4 real
renders (natur / anthra / werksdunkel / signal) and re-tints the page accent —
this is the "play with the 3D object" interaction now. HeroGL code left dormant
in kniff-bench.js. Rail CSS-3D cubes still provide live-rotating 3D lower down.
KIE spend now ~322 credits list total (~€0.65 effective), 758 left.

**2026-09-01 — whole-site style pass + real PLA palette.**
Niklas: "die gesamte Website in diesem Stil". Gave a photo of their filament
stock (3DJake eco PLA matte + SUNLU): black, white, pastel green, pastel pink,
pastel blue. Done:
- Real palette as `--pla-*` tokens. Product cards (shop + homepage rail) now use
  those colours + a 5-dot swatch row; "Standard-Farben" line on shop and
  custom-druck briefing.
- Hero material chips replaced with the 5 real PLA colours (Schwarz default);
  each swaps to a real commercial render (05-hero-anthra/natur/green/pink/blue),
  accent stays amber. 3 new pastel renders generated (~84 cr; 716 left).
- ueber-uns / kontakt / versand-zahlung given pinned `.kf-phero` heroes with
  commercial renders + kinetic headlines + the amber `::before` glow — same
  treatment as homepage/custom-druck/shop. Legal pages: styled `.kf-longform h1`
  + the room glow, stay documents (appropriate). Whole site now consistent.
- `_site` 5.6 MB. KIE total ~364 cr list (~€0.75 effective).
