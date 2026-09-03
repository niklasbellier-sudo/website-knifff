#!/usr/bin/env bash
# Replace the two generic sub-page hero backgrounds (shop + custom-druck) with
# imposing product-family / custom-part shots, in the commercial-DTC amber-glow
# look that matches the homepage. 16:9, headline sits bottom-left on these
# pages so keep the lower-left third dark and open.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out-heroes
PF=~/Desktop/Kniff/01-produktfotos

P='High-end commercial product photography for a modern direct-to-consumer brand, advertising quality. Near-black charcoal background (#08090b) with a bold soft radial glow of warm amber light behind the subject, gentle god-rays, fading to pure black at the frame edges. Punchy studio lighting: strong soft key from upper left, clean fill, a hard rim light separating the subject from the background, gentle bloom on the highlights, very high micro-contrast, colour graded like a premium product ad. Matte black 3D-printed PLA, fine visible printed layer lines, no wet plastic sheen, precise crisp edges, spotless. Tack-sharp focus, photographic realism, high resolution. NOT a workshop, NOT a dark room, NOT documentary grain, NOT a clay or CGI render, no neon, no text, no hands, no watermark.'

g () { # <out> <scene> [ref]
  echo "=== $1 ==="
  if [ -n "${3:-}" ]; then
    scripts/kie.sh still "$P

$2" "out-heroes/$1" --ar 16:9 --ref "$3" || echo "FAILED $1"
  else
    scripts/kie.sh still "$P

$2" "out-heroes/$1" --ar 16:9 || echo "FAILED $1"
  fi
}

g page-shop.png 'A hero family group of five different matte-black 3D-printed everyday objects, arranged together at dynamic three-quarter angles, floating and staggered in depth like a premium product line-up: a tall deeply vertically-fluted screw-lid travel tube, a minimalist smoothly-curved phone stand with a wide base, a low rectangular tray divided into ten slim upright card slots, a slim angular rear-view-mirror note clip with a small round tube at one end, and a small rounded twin-hole car pen-holder block. The group sits in the upper-right two thirds of the frame, catching the amber rim light. Generous dark, softly amber-lit empty space across the lower-left of the frame for a headline.'

g page-custom.png 'One single striking matte-black 3D-printed bespoke mechanical part floating at a bold three-quarter angle in the centre-right of the frame: an intricate angular mounting bracket with clean machined through-holes, reinforcing ribs and one gracefully curved arm, the kind of custom part made to order from a drawing. A hard rim light rakes one edge, fine printed layer lines visible across the matte surface. Generous dark, softly amber-lit empty space across the lower-left of the frame for a headline.'

echo "=== done ==="
scripts/kie.sh probe
ls -la out-heroes/
