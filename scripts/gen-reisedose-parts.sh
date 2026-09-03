#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out7
PF=~/Desktop/Kniff/01-produktfotos
COMMON='Clean studio product render, advertising quality. Matte-black 3D-printed PLA, fine visible printed layer lines, no wet sheen, precise clean edges. The object sits centred with generous even margin on all sides. Background is a completely flat seamless pure white (#ffffff), no gradient, no vignette, no shadow plane, nothing behind the object. Soft neutral key light from upper-left, gentle contact shadow directly under the object only. Sharp, photoreal, high resolution. No text, no hands, no props.'

echo "=== body ==="
scripts/kie.sh still "$COMMON

Show ONLY the tall fluted cylindrical body of a screw-lid travel tube: deep vertical ribs all around, open circular mouth at the top with a fine screw thread just inside the rim, closed flat bottom. No lid, no cap present. Upright, slight three-quarter angle." out7/reisedose-body.png --ar 1:1 --ref "$PF/reisedose-09.jpg" || echo FAIL-body

echo "=== lid ==="
scripts/kie.sh still "$COMMON

Show ONLY the short fluted screw cap of a travel tube: a squat knurled/ribbed disc-shaped cap, deep vertical grip ribs around the side, a matching internal screw thread visible on the underside, slightly tilted so the underside thread is just visible. Nothing else in frame, no tube body." out7/reisedose-lid.png --ar 1:1 --ref "$PF/reisedose-09.jpg" || echo FAIL-lid

echo "=== done ==="; scripts/kie.sh probe
