#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
P='High-end commercial product photography for a modern direct-to-consumer brand, advertising quality. The same 3D-printed gear-reduction unit as the reference, same exploded-view composition and camera angle, floating centred with generous even empty space around it. Bold radial glow of warm amber light behind it fading to deep charcoal at the edges, bright punchy studio lighting, hard rim light, gentle bloom, colour graded like a premium product ad. Fine visible layer lines, no wet plastic sheen. Sharp focus, high resolution. NOT a workshop, NOT documentary, NOT 3D render engine look, no text.'
g () { echo "=== $1 ==="; scripts/kie.sh still "$P

$2" "out3/$1" --ar 16:9 --ref assets/ref-gearbox.jpg || echo "FAILED $1"; }
mkdir -p out3
g 05-hero-red.png  'The printed parts in matte signal red PLA, clean and saturated, clearly lit by the warm rim light.'
g 05-hero-grey.png 'The printed parts in matte medium warm grey PLA, clean, clearly lit by the warm rim light.'
echo done; scripts/kie.sh probe
