#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out6
P='A single matte-black 3D-printed planetary gearbox in a clean exploded view — ring housing, two carrier plates, sun gear, three planet gears, shafts and hex screws, separated along the vertical axis like an assembly diagram coming apart. Isolated product cut-out on a FULLY TRANSPARENT background (alpha channel, PNG with transparency), absolutely no backdrop, no ground plane, no floor, no shadow catcher, nothing behind the object — only the object itself and empty transparency around it. Object centred, generous empty margin on all four sides. Soft neutral studio key light from upper left with a faint warm rim, subtle self-shadowing between parts, fine visible printed layer lines on every surface, matte finish. Sharp, high resolution, photoreal. No text, no hands, no background of any kind.'
scripts/kie.sh still "$P" out6/gearbox-cutout.png --ar 16:9 --ref assets/scenes/05-hero-anthra.jpg || echo FAILED
echo done; scripts/kie.sh probe
