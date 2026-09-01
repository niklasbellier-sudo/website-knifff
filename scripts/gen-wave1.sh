#!/usr/bin/env bash
# First asset wave for kniff-home. One style preamble, reused verbatim.
set -uo pipefail
cd "$(dirname "$0")/.."

P='Cinematic product photography shot on 35mm anamorphic lenses. Shallow depth of field, high dynamic range, true blacks, matte film grain. Low-key lighting: one warm amber key from upper left, cool blue ambient fill, deep falloff into shadow. Colour grade of deep charcoal, warm amber highlights, desaturated mid-tones, faint cyan in the shadows. A single matte PLA 3D-printed part, visible fine layer lines, no plastic sheen, sitting on a dark scratched steel workbench. Photographic realism. NOT 3D render, NOT clay, NOT illustration, NOT CGI, no digital glow, no neon.'

gen () { # <outfile> <scene>
  echo "=== $1 ==="
  scripts/kie.sh still "$P

$2" "out/$1" --ar 16:9 || echo "FAILED: $1"
}

gen 01-process.png     'A matte PLA printed L-bracket clamped in a small machinist vise, shot from a low three-quarter angle, a pair of steel calipers resting beside it. Large empty shadowed space across the upper right of the frame for text.'
gen 02-proof.png       'Five different small matte PLA printed parts arranged in a loose row receding into shadow along the workbench, shallow focus on the nearest part, the others softening into darkness. Wide empty dark space across the top third of the frame.'
gen 03-origin.png      'A single small matte PLA printed funnel part resting on the corner of the workbench, an older desktop 3D printer out of focus behind it lit in warm amber, calm and still, quiet. Generous empty space on the left of the frame.'
gen 04-close.png       'An empty circle of soft warm light on the bare scratched steel workbench, a faint scatter of pale PLA shavings at its edge, nothing else on the bench, deep shadow all around. Wide open empty space, the bench waiting for a part.'
gen 05-hero-poster.png 'A single matte PLA printed trading-card deck box, its lid slightly ajar, resting on the dark workbench under a hard warm key light from upper left, deep black surround. Centred, even empty space around it.'

echo "=== wave 1 done ==="
scripts/kie.sh probe
ls -la out/
