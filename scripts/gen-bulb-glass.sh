#!/usr/bin/env bash
# The Kniff symbol, v2: a realistic CLEAR-GLASS incandescent bulb (the "idea"),
# glowing filament, dark Edison base — matches the interactive three.js hero
# after Niklas rejected the matte-black fluted PLA look. Feeds assets/og.jpg
# and the PNG icons.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out-bulb

P='High-end commercial product photography for a modern direct-to-consumer brand, advertising quality. Near-black charcoal background (#08090b) with a bold soft radial glow of warm amber light behind the subject, gentle god-rays fading to pure black at the frame edges. Punchy studio lighting: strong soft key from the upper left, a cool hard rim light down the right edge, gentle highlight bloom, very high micro-contrast, colour graded like a premium product advertisement. Tack-sharp focus, photographic realism, high resolution. No text, no hands, no watermark, no packaging, no neon.

Subject: a single classic incandescent LIGHT BULB with a clear transparent glass envelope in a rounded classic A-shape. Inside, a warm glowing coiled tungsten filament on a slender clear glass stem mount with two fine support wires, softly lit, casting a gentle warm glow through the glass. The screw base below is a dark near-black metal Edison screw cap with crisp thread ridges and a small black insulator tip. The bulb floats in mid-air, tilted slightly to the left with the base pointing down and to the left, centred in frame, generous even dark margin all around. Crisp bright specular highlights and a thin bright rim light trace the curved glass; the dark background is clearly visible straight through the clear glass.'

echo "=== bulb-glass 16:9 (OG / hero) ==="
scripts/kie.sh still "$P" out-bulb/bulb-glass-wide.png --ar 16:9 || echo FAILED
echo "=== bulb-glass 1:1 (icons) ==="
scripts/kie.sh still "$P" out-bulb/bulb-glass-square.png --ar 1:1 || echo FAILED
echo "=== done ==="; scripts/kie.sh probe; ls -la out-bulb/
