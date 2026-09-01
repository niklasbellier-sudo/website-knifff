#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
P='High-end commercial product photography for a modern direct-to-consumer brand, advertising quality. Bold radial glow of warm amber light behind the subject with soft god-rays, fading to deep charcoal at the frame edges. Bright punchy studio lighting: strong soft key from upper left, clean fill, a hard rim light separating the subject from the background, gentle bloom on the highlights, high micro-contrast, colour graded like a premium product ad. Matte PLA 3D-printed surface, clean and precise, fine visible layer lines, no dust, no wet plastic sheen. Sharp focus, high resolution. Photographic realism. NOT a workshop, NOT a dark room, NOT documentary grain, NOT 3D render, NOT clay, no text.'
g () { echo "=== $1 ==="; scripts/kie.sh still "$P

$2" "out2/$1" --ar 16:9 || echo "FAILED $1"; }
mkdir -p out2
g 01-process.png 'A single matte PLA 3D-printed L-bracket floating at a dynamic three-quarter angle, one clean machined hole catching the rim light. Large empty amber-lit space across the upper right of the frame for text.'
g 02-proof.png 'A loose cluster of five different small matte PLA 3D-printed mechanical parts floating together at dynamic angles, brackets a gear a bushing, arranged like a hero product family shot. Wide empty amber-lit space across the top third of the frame.'
g 03-origin.png 'A single small matte PLA 3D-printed funnel part floating at a gentle three-quarter angle, softer and calmer lighting, a warm amber glow, a hint of a desktop 3D printer far out of focus in the deep background. Generous empty space on the left of the frame.'
g 04-close.png 'An empty circular pool of warm amber light on a softly lit seamless surface, nothing on it, a faint round pedestal of glow at the centre, deep charcoal all around. Wide open empty space, waiting for a product.'
echo "=== done ==="; scripts/kie.sh probe
