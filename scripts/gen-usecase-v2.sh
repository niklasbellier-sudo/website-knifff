#!/usr/bin/env bash
# Regenerate the 5 product use-case renders — this time each is REFERENCE-GUIDED
# with the real studio product photo so the printed object's geometry matches
# what actually ships. Kniff cinematic style: near-black, warm amber low light,
# realistic photo (not glossy render), product = clear hero, no text/logos.
set -euo pipefail
cd "$(dirname "$0")/.."
K=scripts/kie.sh
O=out-usecase

run () { # name  refpath  prompt
  echo "── $1 ─────────────────────────────────────"
  bash "$K" still "$3" "$O/$1.png" --ar 16:9 --ref "$2"
  echo "   -> $O/$1.png"
}

run stiftehalter-auto-usecase assets/stiftehalter-auto.jpg \
"Place this exact matte black 3D-printed pen holder — identical shape and proportions to the reference, visible fine FDM print layer lines — clipped onto a car dashboard air vent. Two slim black ballpoint pens stand upright in it. Dark car interior, black leather dashboard, steering wheel soft and blurred in the background. Late warm sunset light rakes in from the left, deep amber glow around #f2a63b, near-black shadows, cinematic Interstellar-grade contrast, subtle film grain. Realistic photograph, shallow depth of field. No text, no logos, no brand marks. Landscape composition with dark negative space on the left."

run sonnenblenden-clip-usecase assets/spiegel-clip-auto.jpg \
"Place this exact matte black 3D-printed clip — identical to the reference: a flat thin wedge-shaped clamp with a small round upright tube on top, same proportions, visible FDM print layer lines — slid onto the edge of a car's folded-down sun visor (a flat padded panel above the windscreen). A folded blank paper note is gripped in the flat jaw and a single pen sits in the small tube. Dark car interior, windscreen and visor, warm low sunlight coming through the glass from the right, deep amber glow, near-black shadows, cinematic contrast, film grain. Realistic photograph, shallow depth of field. Blank papers, no text, no logos. Landscape composition."

run reisedose-wattestaebchen-usecase assets/reisedose-wattestaebchen-6.jpg \
"Place this exact grass-green 3D-printed jar — identical to the reference: cylindrical ribbed body with a screw-on lid, same proportions, visible FDM print layer lines, matte finish — standing on a narrow bathroom shelf. The lid rests beside it; a few white cotton swabs poke out of the open jar. A neatly folded towel and a canvas washbag sit behind, softly blurred. Warm low light from the side, deep amber glow, dark stone-tiled wall near-black, cinematic contrast, film grain. Realistic photograph, shallow depth of field. No text, no logos. Landscape composition."

run kartenhalter-10-decks-usecase assets/kartenhalter-10-decks.jpg \
"Place this exact matte black 3D-printed card-deck holder — identical to the reference: a low tiered rack with angled slots, same proportions, visible FDM print layer lines — on a dark walnut shelf, holding several boxed playing-card decks standing upright at a slight backward lean. A row of books blurred behind. Warm low sunlight from the right, deep amber glow, near-black background, cinematic contrast, film grain. Realistic photograph, shallow depth of field. Generic plain card-box backs, no readable text, no logos. Landscape composition."

run handystaender-minimal-usecase assets/handystaender-minimal.jpg \
"Place this exact matte black minimalist 3D-printed phone stand — identical to the reference: an angled solid wedge with a slot at the back for a cable, same proportions, visible FDM print layer lines — on a dark wooden desk. A modern smartphone rests on it in landscape orientation with a plain switched-off dark screen (no clock, no icons, no text, no reflections of a face). A short charging cable runs through the rear slot. A dark mechanical keyboard sits beside it, softly blurred. Warm desk-lamp light from the left, deep amber glow, near-black background, cinematic contrast, film grain. Realistic photograph, shallow depth of field. No text, no logos. Landscape composition."

echo
echo "ALLE 5 FERTIG."
bash "$K" probe
