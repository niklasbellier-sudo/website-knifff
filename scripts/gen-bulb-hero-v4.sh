#!/usr/bin/env bash
# Hero bulb v4 — match the site's graphic family (10-custom-hero.jpg /
# 11-shop-hero.jpg): matte-black 3D-printed object, floating, dynamic tilt,
# intense warm amber sunburst behind it, near-black void, cinematic grade.
# The bulb reads as a bulb via its silhouette + a warm glowing filament inside
# a dark SMOKED-amber glass envelope; the screw base is matte-black printed PLA
# with visible FDM layer lines.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out-bulb

REF="assets/scenes/11-shop-hero.jpg"

P='Cinematic hero product render, exactly the lighting, grade and mood of the reference image. One classic incandescent LIGHT BULB, floating at a dynamic three-quarter angle in a near-black void, positioned right of centre with a large expanse of dark empty space on the left. The glass envelope is dark smoked amber glass — clearly readable as a light bulb by its silhouette and a bright warm orange rim light along its curve — and inside it a coiled tungsten filament glows warm and bright, throwing a soft glow through the smoked glass. The screw base (E27) is matte black 3D-printed plastic with fine, visible FDM print layer lines and a small dark insulator tip. Behind the bulb an intense radial burst of warm amber light streams outward like god-rays, brightest just behind the bulb and falling to pure black at every edge, with faint volumetric haze. High contrast, moody, premium, shallow depth of field. No text, no hands, no sockets, no extra objects, no wires.'

echo "=== hero still, 16:9, ref=$REF ==="
scripts/kie.sh still "$P" out-bulb/hero-v4.png --ar 16:9 --ref "$REF" || echo FAILED
echo "=== done ==="; ls -la out-bulb/hero-v4.png; scripts/kie.sh probe
