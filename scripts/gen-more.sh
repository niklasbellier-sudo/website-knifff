#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
P='Cinematic product photography shot on 35mm anamorphic lenses. Shallow depth of field, high dynamic range, true blacks, matte film grain. Low-key lighting: one warm amber key from upper left, cool blue ambient fill, deep falloff into shadow. Colour grade of deep charcoal, warm amber highlights, desaturated mid-tones, faint cyan in the shadows. Matte PLA 3D-printed parts, visible fine layer lines, no plastic sheen, on a dark anodised aluminium workbench with a fine brushed metal texture. Photographic realism. NOT wood, NOT wooden surface, NOT 3D render, NOT clay, NOT illustration, NOT CGI, no digital glow, no neon.'
g () { echo "=== $1 ==="; scripts/kie.sh still "$P

$2" "out/$1" --ar 16:9 || echo "FAILED $1"; }
g 05-hero-gearbox.png 'A matte PLA 3D-printed gear-reduction unit, housing and lid and two gears and two shafts slightly separated in a neat vertical exploded arrangement floating above the bench, hard warm key light from upper left, deep black surround, centred with even empty space around it.'
g 10-custom-hero.png 'A half-finished matte PLA printed enclosure beside a rolled paper technical sketch and a small USB stick on the bench, one metal hand tool in frame, shallow focus. Large empty dark space across the right two thirds of the frame.'
g 11-shop-hero.png 'Four different small matte PLA printed household parts laid out in a clean row on the bench, three quarter top view, soft even key light, subtle shadows. Wide empty dark space across the top of the frame.'
echo "=== done ==="; scripts/kie.sh probe
