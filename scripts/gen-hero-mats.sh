#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
P='High-end commercial product photography for a modern direct-to-consumer brand, advertising quality. The same 3D-printed gear-reduction unit as the reference, same exploded-view composition and camera angle, floating centred with generous even empty space around it. Bold radial glow of warm amber light behind it fading to deep charcoal at the edges, bright punchy studio lighting, hard rim light, gentle bloom, colour graded like a premium product ad. Fine visible layer lines, no wet plastic sheen. Sharp focus, high resolution. NOT a workshop, NOT documentary, NOT 3D render engine look, no text.'
g () { echo "=== $1 ==="; scripts/kie.sh still "$P

$2" "out2/$1" --ar 16:9 --ref assets/ref-gearbox.jpg || echo "FAILED $1"; }
mkdir -p out2
g 05-hero-natur.png  'The printed parts in bright natural warm-white PLA, clean and matte.'
g 05-hero-anthra.png 'The printed parts in dark anthracite grey PLA, matte, still clearly lit by the warm rim light.'
g 05-hero-signal.png 'The printed parts in vivid signal orange PLA, matte, bold and saturated against the amber glow.'
echo "=== done ==="; scripts/kie.sh probe
