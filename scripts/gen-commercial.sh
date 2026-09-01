#!/usr/bin/env bash
# Commercial / DTC brand-hero style: bright, glossy, single floating hero object
# against a bold amber glow. Reference: the CIAO energy-drink hero shot.
set -uo pipefail
cd "$(dirname "$0")/.."
P='High-end commercial product photography for a modern direct-to-consumer brand, advertising quality. Bold radial glow of warm amber light behind the subject, fading to deep charcoal at the frame edges. Bright punchy studio lighting: strong soft key from upper left, clean fill, a hard rim light separating the subject from the background, gentle bloom on the highlights, high micro-contrast, colour graded like a premium product ad. Matte PLA 3D-printed surface, clean and precise, fine visible layer lines, no dust, no wet plastic sheen. Sharp focus throughout, high resolution. Photographic realism. NOT a workshop, NOT a dark room, NOT documentary grain, NOT 3D render, NOT clay, no text.'
g () { echo "=== $1 ==="; scripts/kie.sh still "$P

$2" "out2/$1" --ar 16:9 || echo "FAILED $1"; }
mkdir -p out2
g 05-hero-gearbox.png 'A single matte PLA 3D-printed gear-reduction unit, housing lid gears and shafts very slightly separated in a clean exploded view, floating at a dynamic three-quarter angle, centred with generous even empty space around it.'
g 10-custom-hero.png 'A single clean matte PLA 3D-printed enclosure floating at a dynamic three-quarter angle. Large empty amber-lit space along the right two thirds of the frame for text.'
g 11-shop-hero.png 'A single matte PLA 3D-printed storage box with its lid floating just above it, dynamic three-quarter angle, centred, generous empty space along the top of the frame for text.'
echo "=== done ==="; scripts/kie.sh probe
