#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out5
PH=/private/tmp/claude-502/-Users-niklasalotey/4e7b2d3c-5768-4d3d-8e68-269273424628/scratchpad
P='Studio product render of a single matte-black 3D-printed planetary gearbox in a clean exploded view: ring housing, two carrier plates, sun gear, three planet gears, shafts and screws, slightly separated along the vertical axis so it reads as an assembly diagram coming apart. The whole object floats dead-centre of the frame, perfectly centred horizontally and vertically, generous even empty space on all four sides. Background is a completely flat, seamless, uniform very dark charcoal-black (#0b0d0e) with NO vignette, NO radial glow, NO gradient, NO colour — just even darkness edge to edge. Soft neutral key light from the upper left with a faint warm rim, gentle contact shadow, fine visible printed layer lines on every part, matte surface, no wet sheen. Photographic realism, sharp, high resolution. NOT a bright background, NOT an amber glow, NOT a spotlight cone, no text, no hands. 16:9.'
scripts/kie.sh still "$P" out5/05-hero-anthra.png --ar 16:9 --ref "assets/scenes/05-hero-anthra.jpg" || echo FAILED
echo done; scripts/kie.sh probe
