# Druckkopf in 3D (Startbild der Ideen-Welt am Handy)

Quelle von `js/kniff-druck3d.js`. Das gebündelte File enthält Three.js r170 und wird
von `js/kniff-welt.js` nur am Handy (≤ 820 px) mit WebGL 2 nachgeladen.

    cd scripts/druck3d && npm install && npm run build

Gedruckt wird das Kniff-K in drei Lagen, Raupe für Raupe (11 Bahnen je Lage); jede
Stelle wächst genau unter der Düse. Danach richtet es sich zur Kamera auf.
Mit `&druckdebug=1` steht `window.__kDruck.setze(sekunden)` für Standbilder bereit.
Das Standbild (`assets/druck3d-k.webp`) zeigt das fertige K und erscheint ohne
JavaScript, ohne WebGL und bei „Bewegung reduzieren“.
