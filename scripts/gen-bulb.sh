#!/usr/bin/env bash
# The Kniff symbol: a 3D-printed "idea" — a lightbulb-shaped object in the
# brand's matte-black fluted PLA. Hero render for the OG image and as a
# fallback / reference for the interactive hero.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out-bulb

P='High-end commercial product photography for a modern direct-to-consumer brand, advertising quality. Near-black charcoal background (#08090b) with a bold soft radial glow of warm amber light behind the subject, gentle god-rays, fading to pure black at the frame edges. Punchy studio lighting: strong soft key from the upper left, a hard rim light down the right edge, gentle highlight bloom, very high micro-contrast, colour graded like a premium product ad. Tack-sharp focus, photographic realism, high resolution. NOT a workshop, NOT documentary grain, NOT a clay or CGI render, no neon, no text, no hands, no watermark, no real glass.

Subject: a single sculptural object shaped like a classic incandescent LIGHT BULB, but it is clearly a solid 3D-PRINTED piece, not real glass. Matte black PLA, deep vertical fluted ribs running up the rounded bulb envelope, fine visible printed layer lines catching the light, no sheen. The screw base below is a short knurled/ribbed cylinder with a scalloped gear-tooth ring, same matte black. The object floats at a dynamic three-quarter angle with a slight lean, upright (base down), centred, generous even dark margin all around.'

echo "=== bulb-hero ==="
scripts/kie.sh still "$P" out-bulb/bulb-hero.png --ar 16:9 || echo FAILED
echo "=== bulb-square (for OG / icon ref) ==="
scripts/kie.sh still "$P" out-bulb/bulb-square.png --ar 1:1 || echo FAILED
echo "=== done ==="; scripts/kie.sh probe; ls -la out-bulb/
