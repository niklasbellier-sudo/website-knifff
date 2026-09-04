#!/usr/bin/env bash
# Hero bulb, v3: photoreal clear-glass incandescent bulb, framed dead-centre and
# UPRIGHT for a turntable video (base straight down so a Y-axis spin looks
# natural). Head still -> Kling image-to-video, head==tail for a seamless loop.
set -uo pipefail
cd "$(dirname "$0")/.."
mkdir -p out-bulb

STILL='High-end commercial product photography, advertising quality. Pure near-black charcoal background (#08090b) with a soft radial pool of warm amber light directly behind the subject, fading to black at every edge. One clean clear-glass incandescent LIGHT BULB, classic A60 / A19 shape: a smooth, perfectly symmetrical rounded-pear glass envelope, no dents, no lumps, flawless blown glass. Inside: a horizontal coiled tungsten filament on a slender clear glass stem mount with two fine support wires, glowing warm and softly lit. Below the glass a dark near-black nickel Edison screw cap (E27) with crisp thread ridges and a small black insulator tip. The bulb is perfectly UPRIGHT, base pointing straight down, dead-centre of the frame, shown straight-on at eye level, with a large even margin of empty dark space all around it. Crisp specular highlights and a thin bright rim-light trace the curved glass; the dark background is clearly visible through the clear glass. Tack-sharp, photographic realism, studio lighting, high resolution. No text, no hands, no watermark, no extra objects.'

echo "=== head still (portrait, centred, upright) ==="
scripts/kie.sh still "$STILL" out-bulb/turn-head.png --ar 3:4 || echo FAILED
echo "=== done still ==="; ls -la out-bulb/turn-head.png

VIDEO='The clear glass light bulb rotates slowly and smoothly in place around its own vertical axis, a continuous turntable spin. The camera is completely locked and still. The lighting, the warm amber background glow and the glowing filament all stay exactly constant. The glass keeps its shape, no morphing, no wobble. Elegant, premium, hypnotic. The bulb returns to its exact starting orientation so the motion loops seamlessly.'

echo "=== turntable video (head == tail for loop) ==="
scripts/kie.sh shot "$VIDEO" out-bulb/turn-head.png out-bulb/bulb-turntable.mp4 --tail out-bulb/turn-head.png --dur 5 || echo FAILED
echo "=== done ==="; ls -la out-bulb/bulb-turntable.mp4; scripts/kie.sh probe
