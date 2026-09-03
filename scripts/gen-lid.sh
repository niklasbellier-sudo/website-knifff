#!/usr/bin/env bash
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out-dose

P='Camera: eye level only ~15 degrees above the object, 85mm lens look. The object sits PERFECTLY LEVEL and STRAIGHT — central axis exactly vertical, ribs exactly vertical, absolutely NOT tilted, NOT tipped, NOT rotated. Centred, generous even white margin all around. One single object only.

Lighting: high-end commercial product studio. Strong soft key from upper left, a crisp hard rim light down the right edge, a gentle top highlight skimming the ribs, deep controlled contrast. Matte black surface reads rich and three-dimensional, never flat, never grey.

Material: matte black 3D-printed PLA, deep vertical fluted grip ribs around the side, fine visible printed layer lines, no wet sheen, no dust, crisp clean edges.

Background: absolutely uniform dead-flat pure white (#ffffff) — zero texture, zero marbling, zero gradient, no shadow plane, nothing behind or under the object. Tack-sharp focus, photographic realism, high resolution. No text, no hands, no props.

Subject: a SHORT SQUAT screw CAP / knurled lid — a wide flat disc-shaped cap, clearly WIDER than it is tall (its height is only about one third of its diameter, like a chunky knurled camera-lens cap or a wide jar lid). Flat closed circular top. Deep vertical grip ribs around the short side wall. The round OPEN underside faces straight down; because the camera is only ~15 degrees above, only a thin shallow ellipse of the rim shows along the bottom edge. It hovers dead level. NOT a tube, NOT tall, NOT a cylinder taller than wide.'

echo "=== lid (squat) ==="
scripts/kie.sh still "$P" out-dose/lid.png --ar 4:3 || echo FAILED
echo "=== done ==="; scripts/kie.sh probe
