#!/usr/bin/env bash
# Rebuild the four scroll-background scenes so they show the REAL Kniff products
# (image-to-image from the product photos) instead of abstract 3D forms.
# Same commercial / DTC look as gen-commercial.sh, but darker and with big
# negative space, because these sit at ~0.34 opacity behind text.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out3

BASE='High-end commercial product photography for a modern direct-to-consumer brand. A single warm amber key light from the upper left, clean rim light separating the subject, deep charcoal-to-black seamless studio background (#0b0d0e), soft falloff into pure black at the frame edges. Matte black 3D-printed PLA, fine visible layer lines, precise and clean, no wet sheen. Cinematic, moody, high micro-contrast, colour graded like a premium ad, shallow depth of field, faint dust in the light beam. Photographic realism, NOT a 3D render, NOT clay, NOT a bright workshop, no text, no hands, no props. 16:9.'

g () { # name  ref  extra
  echo "=== $1 ==="
  scripts/kie.sh still "$BASE

$3" "out3/$1" --ar 16:9 --ref "$2" || echo "FAILED $1"
}

# Verfahren  — "from idea to part": one part, close, off to the right
g 01-process.png assets/stiftehalter-auto.jpg \
  'Keep this exact product: the ribbed matte-black 3D-printed car pen holder. Show one unit at a dramatic three-quarter angle, positioned in the right third of the frame, the left two thirds falling away into near-black negative space. Extreme close, macro feel on the layer lines.'

# Sortiment  — "five kniffe": a small considered arrangement
g 02-proof.png assets/kartenhalter-10-decks.jpg \
  'Keep this exact product: the matte-black 3D-printed card-deck holder. Show two or three of them arranged as a loose still life on a dark surface, receding into shadow, lower-right of the frame, wide empty amber-lit space to the upper left.'

# Entstehung — the one warm beauty shot, product the user named
g 03-origin.png assets/reisedose-wattestaebchen.jpg \
  'Keep this exact product: the tall fluted matte-black 3D-printed travel tube / storage container. A warm hero beauty shot, three tubes standing, one slightly open, gentle amber glow, centred but low, soft warm haze, the most inviting and premium frame of the set.'

# Dein Zug — final CTA, calm and open
g 04-close.png assets/spiegel-clip-auto.jpg \
  'Keep this exact product: the small matte-black 3D-printed visor / mirror note clip. A single clip resting at an angle, far right of the frame, most of the frame is quiet dark amber-lit emptiness for a closing headline.'

echo "=== done ==="; scripts/kie.sh probe
