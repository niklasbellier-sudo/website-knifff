# Druckkopf in 3D (Startbild der Ideen-Welt am Handy)

Quelle von `js/kniff-druck3d.js`. Das gebündelte File enthält Three.js r170 und wird
von `js/kniff-welt.js` nur am Handy (≤ 820 px) mit WebGL 2 nachgeladen.

    cd scripts/druck3d && npm install && npm run build

Varianten zum Vergleichen: `/?druck=a` Glühbirne, `/?druck=b` Stiftehalter, `/?druck=c` Kniff-K.
Mit `&druckdebug=1` steht `window.__kDruck.setze(sekunden)` für Standbilder bereit.
Standbilder (`assets/druck3d-*.webp`) zeigen das fertige Teil, sie erscheinen ohne
JavaScript, ohne WebGL und bei „Bewegung reduzieren“.
