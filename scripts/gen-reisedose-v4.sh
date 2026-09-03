#!/usr/bin/env bash
# Reisedose hero, take 4c. Matched pair, DYNAMIC 3/4 angle with a slight lean
# (floating hero-product energy, drink-can style) — but cap-end up, NOT flopped.
# Matte black, punchy commercial light, dead-flat white bg for a clean key.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out-dose
REF=~/Desktop/Kniff/01-produktfotos/reisedose-03.jpg

CAM='Camera & pose: a dynamic hero-product shot like a premium drink-can ad. The object is turned about 20 degrees around its own vertical axis for a lively three-quarter view (two planes of ribs visible, the circular end reading as a gentle ellipse), and it leans just slightly — about 8 to 10 degrees — as if floating and caught mid-motion. It is still clearly the right way up (cap / opening end pointing UP), absolutely NOT fallen over, NOT lying on its side, NOT flopped, NOT tipped past ~10 degrees. 85mm lens look, object centred, generous even white margin all around, one single object only.'

LIGHT='Lighting: high-end commercial product studio. One strong soft key from the upper left, a crisp hard rim light down the right edge separating the object from the background, a gentle top highlight skimming the ribs, deep controlled contrast. The matte black surface reads rich and three-dimensional, never flat, never grey.'

SURF='Material: matte black 3D-printed PLA, deep vertical fluted ribs all around, fine visible printed layer lines catching the light, no wet plastic sheen, no dust, crisp clean edges, a subtle scalloped gear-tooth rim.'

BG='Background: absolutely uniform dead-flat pure white (#ffffff) — zero texture, zero marbling, zero gradient, zero vignette, no shadow plane, nothing behind or under the object. Tack-sharp focus, photographic realism, high resolution. No text, no hands, no props, no reflection.'

g () { # <out> <subject>
  echo "=== $1 ==="
  scripts/kie.sh still "$CAM

$LIGHT

$SURF

$BG

Subject: $2" "out-dose/$1" --ar 3:4 --ref "$REF" || echo "FAILED $1"
}

g body.png 'ONLY the tall fluted cylindrical BODY of the travel tin — a tube about 2.5x taller than it is wide. Open circular mouth at the TOP with a fine screw thread just inside the rim and a scalloped gear-tooth ring around it; at this three-quarter angle the opening reads as a clear ellipse. Closed flat bottom. No lid, no cap in frame.'

g lid.png 'ONLY the SHORT SQUAT screw CAP of the travel tin, matching the same three-quarter rotation and the same slight ~10-degree lean as its tube. It is clearly WIDER than it is tall (height about one third of its diameter, like a chunky knurled jar lid). Flat closed circular top facing up, deep vertical grip ribs around the short side, scalloped gear-tooth edge, the round OPEN threaded underside facing DOWN with just a thin ellipse of the rim visible. It hovers as if lifted straight up off the tube — level relative to the leaning axis, NOT tipped forward, NOT flopped on its side. No tube body in frame.'

echo "=== done ==="; scripts/kie.sh probe; ls -la out-dose/
