#!/usr/bin/env bash
# Scene stills for the whole site. One style preamble, reused verbatim.
# World: low-key cinematic, Interstellar grade, on a DARK METAL bench (no wood).
set -uo pipefail
cd "$(dirname "$0")/.."

P='Cinematic product photography shot on 35mm anamorphic lenses. Shallow depth of field, high dynamic range, true blacks, matte film grain. Low-key lighting: one warm amber key from upper left, cool blue ambient fill, deep falloff into shadow. Colour grade of deep charcoal, warm amber highlights, desaturated mid-tones, faint cyan in the shadows. Matte PLA 3D-printed parts, visible fine layer lines, no plastic sheen, on a dark anodised aluminium workbench with a fine brushed metal texture and a few finger smudges. Photographic realism. NOT wood, NOT wooden surface, NOT a workshop table, NOT 3D render, NOT clay, NOT illustration, NOT CGI, no digital glow, no neon.'

gen () { # <outfile> <ar> <scene>
  echo "=== $1 ($2) ==="
  scripts/kie.sh still "$P

$3" "out/$1" --ar "$2" || echo "FAILED: $1"
}

gen 01-process.png     16:9 'A matte PLA printed L-bracket clamped in a small machinist vise, a pair of steel calipers resting beside it, shot from a low three-quarter angle. Large empty shadowed space across the upper right of the frame for text.'
gen 02-proof.png       16:9 'Five different small matte PLA printed mechanical parts arranged in a loose row receding into shadow along the brushed aluminium bench, shallow focus on the nearest part. Wide empty dark space across the top third of the frame.'
gen 03-origin.png      16:9 'A single small matte PLA printed funnel part on the corner of the brushed aluminium bench, a matte dark desktop 3D printer out of focus behind it lit in dim amber, calm and still. Generous empty space on the left of the frame.'
gen 04-close.png       16:9 'An empty pool of soft warm light on the bare brushed aluminium bench, a faint scatter of pale PLA shavings at its edge, nothing else, deep shadow all around. Wide open empty space, the bench waiting for a part.'
gen 05-hero-gearbox.png 16:9 'A matte PLA 3D-printed gear-reduction unit, its housing, lid, two gears and shafts slightly separated in a neat vertical exploded-view arrangement above the brushed aluminium bench, hard warm key light from upper left, deep black surround. Centred, even empty space around it.'
gen 10-custom-hero.png 16:9 'A matte PLA printed enclosure half-finished, sitting beside a rolled technical sketch and a USB stick on the brushed aluminium bench, one hand-tool in frame. Empty dark space along the right two thirds of the frame for text.'
gen 11-shop-hero.png   16:9 'Four different matte PLA printed household parts laid out in a clean grid on the brushed aluminium bench, top-down three-quarter view, even soft key light. Empty space along the top of the frame.'

echo "=== scenes done ==="
scripts/kie.sh probe
ls -la out/
