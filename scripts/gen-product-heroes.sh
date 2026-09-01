#!/usr/bin/env bash
# One commercial "hero" graphic per shop product, same floating-object /
# bold-amber-glow look as the gearbox hero (ref: the CIAO DTC landing page).
# image-to-image from a clean product photo so the shape stays true.
set -uo pipefail
cd "$(dirname "$0")/.."
PH=/private/tmp/claude-502/-Users-niklasalotey/4e7b2d3c-5768-4d3d-8e68-269273424628/scratchpad/photos
mkdir -p out4

P='High-end commercial product photography for a modern direct-to-consumer brand, advertising quality. One single object floating at a dynamic three-quarter angle, centred, with generous empty space around it. Bold radial glow of warm amber light directly behind the subject, fading to deep charcoal at the frame edges. Punchy studio lighting: strong soft key from upper left, clean fill, a hard rim light separating the subject from the background, gentle bloom on the highlights, high micro-contrast, colour graded like a premium product ad. Matte black 3D-printed PLA surface, clean and precise, fine visible layer lines, no dust. Sharp focus, high resolution, photographic realism. NOT a workshop, NOT a dark room, NOT documentary grain, NOT a clay render, no text, no hands.'

g () { echo "=== $1 ==="; scripts/kie.sh still "$P

$2" "out4/$1" --ar 16:9 --ref "$3" || echo "FAILED $1"; }

g stiftehalter-auto-1.png   'Keep this exact object: a small rounded matte-black 3D-printed car pen holder block with two round openings on top and a vent clip on the back.' "$PH/IMG_6962.jpg"
g spiegel-clip-auto-1.png   'Keep this exact object: a slim angular matte-black 3D-printed mirror clip, a long triangular wire-frame arm with a small round tube at one end.' "$PH/IMG_6971.jpg"
g reisedose-wattestaebchen-1.png 'Keep this exact object: a tall fluted matte-black 3D-printed travel tube with a screw lid, deep vertical ribs.' "$PH/IMG_6953.jpg"
g kartenhalter-10-decks-1.png 'Keep this exact object: a low rectangular matte-black 3D-printed tray divided into ten slim upright card compartments.' "$PH/IMG_6965.jpg"
g handystaender-minimal-1.png 'Keep this exact object: a minimalist matte-black 3D-printed phone stand, a single smoothly curved bracket with a small front lip and a wide base.' "$PH/IMG_6977.jpg"

echo "=== done ==="; scripts/kie.sh probe
