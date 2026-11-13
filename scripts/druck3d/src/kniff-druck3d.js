/* Startbild der Ideen-Welt am Handy, in 3D: der Kniff-Druckkopf druckt das
   Kniff-Monogramm Raupe für Raupe, wie ein echter Drucker – drei Lagen, jede
   Raupe wächst genau dort, wo die Düse gerade ist. Danach richtet sich das K mit
   dem Bernstein-Punkt zur Kamera auf. Einheiten: Millimeter, Druckbett auf y = 0.
   Wird von js/kniff-welt.js nur am Handy nachgeladen; ohne WebGL 2 oder bei
   "Bewegung reduzieren" bleibt das Standbild (assets/druck3d-k.webp). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const F = { amber: 0xf2a63b, amberHi: 0xffbb62, amberTief: 0x7a4a17, creme: 0xf3f0ea };

// Zeitplan in Sekunden: anfahren, drucken, wegfahren; danach richtet sich das K auf
const T_AN = 1.5, T_DRUCK = 12.5, T_AB = 1.4;
const T_ENDE = T_AN + T_DRUCK;
const T_AUF = T_AB * 0.7, D_AUF = 2.2, D_PENDEL = 5;
const T_FERTIG = T_ENDE + T_AUF + D_AUF + D_PENDEL;
const LAGEN = 3;          // Lagen, abwechselnd hin und zurück gedruckt
const RAUPEN = 11;        // Druckbahnen je Lage: Balken 3, Bein 3, Arm 2, Punkt 3

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const weich = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const sanft = (p) => 0.5 - Math.cos(Math.PI * clamp01(p)) / 2;
const mix = (a, b, t) => a + (b - a) * t;

/* ---------- Material mit Schichtlinien, Druckfortschritt und Glut ----------
   Wie hoch das K an einer Stelle schon steht, rechnet der Shader aus: jede Stelle
   gehört zur nächstgelegenen Druckbahn und wächst in der laufenden Lage, sobald
   die Düse dort ist – vorne mit runder Spitze wie eine echte Raupe. */
function uniformSatz(lh) {
  return {
    uTop: { value: 1e4 },
    uKopf: { value: new THREE.Vector3(0, -1e3, 0) },
    uLH: { value: lh },
    uHot: { value: new THREE.Color(F.amberHi) },
    uHeiss: { value: 0 },
    uOben: { value: new THREE.Vector3(0, 1, 0) },
    uLin: { value: Array.from({ length: RAUPEN }, () => new THREE.Vector4()) },
    uLinU: { value: new Array(RAUPEN).fill(0) },
    uLage: { value: 0 },
    uVor: { value: 1 },
    uUKopf: { value: -100 },
    uLinie: { value: -1 },
    uStufe: { value: 1 },
    uHMax: { value: 1e4 },
    uFertig: { value: 0 },
    uPoly: { value: Array.from({ length: 11 }, () => new THREE.Vector2()) },
    uPunkt: { value: new THREE.Vector4() },     // Mitte x, z, halbe Kante, Eckradius
    uFarbe2: { value: new THREE.Color(F.amber) },
  };
}

const GLSL_KOPF = `
#define RAUPEN ${RAUPEN}
varying vec3 vLokal;
uniform float uTop, uLH, uHeiss, uLage, uVor, uUKopf, uLinie, uStufe, uHMax, uFertig;
uniform vec3 uKopf, uHot, uOben, uFarbe2;
uniform vec4 uLin[RAUPEN];
uniform float uLinU[RAUPEN];
uniform vec2 uPoly[11];
uniform vec4 uPunkt;
float kFertig(vec2 p, float u, float wer) {
  float vorbei = (uVor > 0.5 ? uUKopf - u : u - uUKopf) + 0.6;
  float f = smoothstep(-0.35, 0.35, vorbei);
  if (abs(wer - uLinie) < 0.5) {             // runde Spitze direkt unter der Düse
    float dk = length(p - uKopf.xz);
    f = max(f, 1.0 - smoothstep(1.6, 2.3, dk));
  }
  return f;
}
float kHoehe(vec2 p) {
  if (uFertig > 0.5) return 1e4;
  // die zwei nächsten Bahnen: dazwischen geht die Raupe weich in die Nachbarraupe über
  float d1 = 1e9, d2 = 1e9, u1 = 0.0, u2 = 0.0, w1 = -1.0, w2 = -1.0;
  for (int i = 0; i < RAUPEN; i++) {
    vec2 a = uLin[i].xy, ab = uLin[i].zw - a;
    float t = clamp(dot(p - a, ab) / dot(ab, ab), 0.0, 1.0);
    float d = length(p - a - ab * t);
    float uu = uLinU[i] + t * length(ab);
    if (d < d1) { d2 = d1; u2 = u1; w2 = w1; d1 = d; u1 = uu; w1 = float(i); }
    else if (d < d2) { d2 = d; u2 = uu; w2 = float(i); }
  }
  float b = 0.5 + 0.5 * smoothstep(0.0, 0.9, d2 - d1);
  float f = mix(kFertig(p, u2, w2), kFertig(p, u1, w1), b);
  return uStufe * (uLage + f);
}
bool imK(vec2 p) {
  bool c = false;
  for (int i = 0; i < 11; i++) {
    vec2 a = uPoly[i], b = uPoly[(i + 10) % 11];
    if (((a.y > p.y) != (b.y > p.y)) && (p.x < (b.x - a.x) * (p.y - a.y) / (b.y - a.y) + a.x)) c = !c;
  }
  return c;
}
float imPunkt(vec2 p) {
  vec2 q = abs(p - uPunkt.xy) - vec2(uPunkt.z) + uPunkt.w;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - uPunkt.w;
}`;

const VERT_DECKEL = `#include <begin_vertex>
  #ifdef K_DECKEL
    vKH = kHoehe(transformed.xz);
    transformed.y = min(vKH, uHMax) - 0.03;
  #endif
  vLokal = transformed;`;

function druckStoff(u, farbe, { rau = 0.55, glanz = 1, art = 'kopf' } = {}) {
  // art: 'kopf' (nichts abschneiden), 'wand' (Körper des K), 'deckel' (offene Oberseite)
  const m = new THREE.MeshStandardMaterial({
    color: farbe, roughness: rau, metalness: 0, envMapIntensity: glanz, flatShading: art === 'deckel',
  });
  m.defines = { [`K_${art.toUpperCase()}`]: '' };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>' + GLSL_KOPF + '\nvarying float vKH;')
      .replace('#include <begin_vertex>', VERT_DECKEL);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>' + GLSL_KOPF + '\nvarying float vKH;')
      .replace('void main() {', `void main() {
  #if defined(K_DECKEL)
    float kH = vKH;
    if (kH < 0.02 || kH > uHMax - 0.01) discard;
    bool kImPunkt = imPunkt(vLokal.xz) < 0.0;
    if (!kImPunkt && !imK(vLokal.xz)) discard;
  #elif defined(K_WAND)
    float kH = kHoehe(vLokal.xz);
    if (kH < 0.02 || vLokal.y > kH + 0.02) discard;
  #else
    float kH = uTop;
    if (vLokal.y > kH) discard;
  #endif
  float kLin = vLokal.y / uLH;
  float kSicht = 1.0 - smoothstep(0.2, 0.45, fwidth(kLin));
  float kF = fract(kLin) * 2.0 - 1.0;
  float kWulst = sqrt(max(1.0 - kF * kF, 0.0));`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  #ifdef K_DECKEL
    if (kImPunkt) diffuseColor.rgb = uFarbe2;
  #endif
  diffuseColor.rgb *= mix(1.0, mix(0.72, 1.0, kWulst), kSicht);
  #ifdef K_DECKEL
    // Füllmuster der offenen Lage: diagonale Bahnen, Richtung wechselt je Lage
    float kRicht = mod(floor((kH - 0.02) / uStufe), 2.0) < 0.5 ? 1.0 : -1.0;
    float kB = (vLokal.x + kRicht * vLokal.z) / 1.15;
    float kBS = 1.0 - smoothstep(0.25, 0.5, fwidth(kB));
    float kBF = abs(fract(kB) - 0.5) * 2.0;
    diffuseColor.rgb *= mix(1.0, mix(0.82, 1.0, smoothstep(0.0, 0.6, kBF)), kBS);
  #endif`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  float kSeite = 1.0 - abs(dot(normal, uOben));
  float kHang = clamp(kF / max(kWulst, 0.3), -2.5, 2.5);
  normal = normalize(normal + uOben * kHang * 0.28 * kSicht * kSeite);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float kNah = 1.0 - smoothstep(0.0, uLH * 1.6, kH - vLokal.y);
  vec2 kD = vLokal.xz - uKopf.xz;
  totalEmissiveRadiance += uHot * uHeiss * kNah * (0.04 + 1.7 * exp(-dot(kD, kD) / 22.0));`);
  };
  return m;
}

// Schattenwurf nur für das, was schon gedruckt ist
function tiefenStoff(u, art) {
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.defines = { [`K_${art.toUpperCase()}`]: '' };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>' + GLSL_KOPF + '\nvarying float vKH;')
      .replace('#include <begin_vertex>', VERT_DECKEL);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>' + GLSL_KOPF + '\nvarying float vKH;')
      .replace('void main() {', `void main() {
  #ifdef K_DECKEL
    if (vKH < 0.02 || vKH > uHMax - 0.01) discard;
    if (imPunkt(vLokal.xz) >= 0.0 && !imK(vLokal.xz)) discard;
  #else
    float kH = kHoehe(vLokal.xz);
    if (kH < 0.02 || vLokal.y > kH + 0.02) discard;
  #endif`);
  };
  return m;
}

/* ---------- kleine Helfer ---------- */
function leinwand(b, h, mal, farbraum = THREE.SRGBColorSpace) {
  const c = document.createElement('canvas');
  c.width = b; c.height = h;
  mal(c.getContext('2d'), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = farbraum;
  return t;
}
const verlauf = (stopps) => leinwand(128, 128, (g, b) => {
  const r = g.createRadialGradient(b / 2, b / 2, 0, b / 2, b / 2, b / 2);
  stopps.forEach(([o, c]) => r.addColorStop(o, c));
  g.fillStyle = r; g.fillRect(0, 0, b, b);
});

/* ---------- Druckkopf wie assets/kopf.webp, Düsenspitze im Ursprung ---------- */
function druckkopf(u) {
  const g = new THREE.Group();
  const schwarz = druckStoff(u, 0x1e1f23, { rau: 0.5, glanz: 1.4 });
  const schwarz2 = druckStoff(u, 0x17181b, { rau: 0.55, glanz: 1.2 });
  const alu = new THREE.MeshStandardMaterial({ color: 0xc4c9cf, metalness: 0.9, roughness: 0.38, envMapIntensity: 1.6 });
  const stahl = new THREE.MeshStandardMaterial({ color: 0x9aa1a8, metalness: 0.9, roughness: 0.3, envMapIntensity: 1.6 });
  const messing = new THREE.MeshStandardMaterial({ color: 0xd9a24a, metalness: 1, roughness: 0.26, envMapIntensity: 1.8 });
  const dunkel = new THREE.MeshStandardMaterial({ color: 0x0b0b0c, roughness: 0.6 });
  const gummi = new THREE.MeshStandardMaterial({ color: 0x111214, roughness: 0.35, envMapIntensity: 1.4 });
  const teil = (geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.set(rx, ry, rz);
    m.castShadow = true; m.receiveShadow = true;
    g.add(m); return m;
  };
  const Q = Math.PI / 2;
  const schraube = (x, y, z, r = 1.15, nach = 'z') => {      // Zylinderkopf mit Innensechskant
    const rx = nach === 'z' ? Q : 0, rz = nach === 'x' ? Q : 0;
    const dz = nach === 'z' ? 0.35 : 0, dx = nach === 'x' ? 0.35 : 0;
    teil(new THREE.CylinderGeometry(r, r, 0.7, 24), stahl, x, y, z, rx, 0, rz);
    teil(new THREE.CylinderGeometry(r * 0.48, r * 0.48, 0.2, 6), dunkel, x + dx, y, z + dz, rx, 0, rz);
  };

  // Düse: Spitze, Kegel, Sechskant
  teil(new THREE.CylinderGeometry(0.75, 0.42, 0.9, 24), messing, 0, 0.45, 0);
  teil(new THREE.CylinderGeometry(3.6, 0.75, 6.4, 32), messing, 0, 4.1, 0);
  teil(new THREE.CylinderGeometry(4.6, 4.6, 2.9, 6), messing, 0, 8.75, 0, 0, Math.PI / 6);
  teil(new THREE.CylinderGeometry(3.2, 3.2, 1.0, 24), messing, 0, 10.6, 0);

  // Heizblock mit Schrauben und Heizpatrone
  teil(new RoundedBoxGeometry(18.4, 9.6, 12, 4, 0.9), alu, -2, 15.9, 0);
  schraube(-8.1, 18.6, 6.0);
  schraube(3.4, 18.6, 6.0);
  teil(new THREE.CylinderGeometry(2.5, 2.5, 1.2, 32), stahl, 1.5, 14.0, 6.3, Q);
  teil(new THREE.CylinderGeometry(1.5, 1.5, 0.3, 24), dunkel, 1.5, 14.0, 6.95, Q);
  schraube(7.25, 14.2, 2.5, 0.9, 'x');

  // Hals mit Kühlrippen
  teil(new THREE.CylinderGeometry(1.25, 1.25, 3.4, 16), stahl, 0, 22.4, 0);
  for (let i = 0; i < 2; i++) teil(new THREE.CylinderGeometry(2.6, 2.6, 0.35, 24), alu, 0, 21.6 + i * 1.2, 0);

  // Lüfterkasten mit vertieftem Lüfter
  teil(new RoundedBoxGeometry(26.8, 28.5, 14, 5, 2.0), schwarz, -5.7, 37.6, 1);
  const LX = -8.1, LY = 37.8, LZ = 8.0;
  teil(new THREE.CircleGeometry(10.2, 48), dunkel, LX, LY, LZ + 0.02);
  teil(new THREE.TorusGeometry(10.5, 0.75, 14, 64), schwarz2, LX, LY, LZ + 0.5);
  teil(new THREE.TorusGeometry(9.7, 0.3, 8, 64), gummi, LX, LY, LZ + 0.25);
  const luefter = new THREE.Group();
  luefter.position.set(LX, LY, LZ + 0.55);
  g.add(luefter);
  const blattForm = new THREE.Shape();
  blattForm.moveTo(2.4, -0.9);
  blattForm.quadraticCurveTo(6.2, -2.8, 9.0, -1.2);
  blattForm.lineTo(9.0, 0.9);
  blattForm.quadraticCurveTo(6.0, -0.6, 2.4, 1.0);
  blattForm.closePath();
  const blattGeo = new THREE.ExtrudeGeometry(blattForm, { depth: 0.5, bevelEnabled: true, bevelThickness: 0.15, bevelSize: 0.15, bevelSegments: 2, curveSegments: 8 });
  for (let i = 0; i < 9; i++) {
    const halter = new THREE.Group();
    halter.rotation.z = (i / 9) * Math.PI * 2;
    const blatt = new THREE.Mesh(blattGeo, gummi);
    blatt.rotation.x = 0.42; blatt.castShadow = true; blatt.receiveShadow = true;
    halter.add(blatt); luefter.add(halter);
  }
  const nabe = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.6, 1.6, 32), schwarz2);
  nabe.rotation.x = Q; nabe.position.z = 0.6; luefter.add(nabe);
  const punkt = new THREE.Mesh(new THREE.CircleGeometry(0.5, 24), new THREE.MeshStandardMaterial({ color: F.amber, roughness: 0.4, emissive: F.amberTief, emissiveIntensity: 0.4 }));
  punkt.position.z = 1.42; luefter.add(punkt);
  [[-16.5, 49.2], [5.1, 49.2], [-16.5, 26.0], [5.1, 26.0]].forEach(([x, y]) => schraube(x, y, 8.1, 0.85));

  // Rückplatte mit Lüftungsrippen
  teil(new RoundedBoxGeometry(13.6, 53, 18, 5, 1.8), schwarz2, 14, 42.7, -4);
  teil(new THREE.BoxGeometry(6.2, 21, 0.2), dunkel, 11.4, 36.4, 5.0);
  for (let i = 0; i < 11; i++) teil(new RoundedBoxGeometry(6.4, 0.95, 1.1, 2, 0.3), schwarz, 11.4, 45.5 - i * 1.83, 5.2);
  schraube(20.85, 22, -8, 0.9, 'x');
  schraube(20.85, 64, -8, 0.9, 'x');

  // Oberer Kasten mit Wortmarke und Knopf
  teil(new RoundedBoxGeometry(34, 19, 17, 5, 2.6), schwarz, -0.4, 62.3, 0.5);
  const marke = teil(new THREE.PlaneGeometry(12, 12 / 2.335),
    new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.45, color: 0xffffff }), -5.1, 62.3, 9.03);
  marke.castShadow = false;
  new THREE.TextureLoader().load('/assets/kniff-wortmarke-hell.png', (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    marke.material.map = t; marke.material.needsUpdate = true;
  });
  teil(new THREE.CylinderGeometry(2.6, 2.6, 0.5, 32), schwarz2, 14.6, 62.5, 9.0, Q);
  teil(new THREE.CylinderGeometry(2.0, 2.15, 1.6, 32), gummi, 14.6, 62.5, 9.6, Q);

  // Steckverbindung, Schlauch und Filament nach oben aus dem Bild
  teil(new THREE.CylinderGeometry(3.4, 3.4, 3.0, 32), gummi, 0, 73.3, 0);
  teil(new THREE.CylinderGeometry(2.6, 2.6, 1.4, 32), stahl, 0, 75.4, 0);
  teil(new THREE.CylinderGeometry(0.85, 0.85, 120, 12),
    new THREE.MeshStandardMaterial({ color: F.amber, roughness: 0.4, emissive: F.amberTief, emissiveIntensity: 0.25 }), 0, 136, 0);
  const schlauch = teil(new THREE.CylinderGeometry(1.8, 1.8, 120, 20),
    new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.12, transparent: true, opacity: 0.45, depthWrite: false, envMapIntensity: 1.5 }), 0, 136, 0);
  schlauch.renderOrder = 2; schlauch.castShadow = false;

  return { g, luefter };
}

/* ---------- X-Achse: Aluprofil mit Führung und Riemen, fährt mit dem Kopf ---------- */
function achse() {
  const g = new THREE.Group();
  const profil = new THREE.MeshStandardMaterial({ color: 0x2a2d32, metalness: 0.7, roughness: 0.42, envMapIntensity: 1.3 });
  const stahl = new THREE.MeshStandardMaterial({ color: 0xa6adb4, metalness: 0.95, roughness: 0.28, envMapIntensity: 1.6 });
  const riemen = new THREE.MeshStandardMaterial({ color: 0x0e0e10, roughness: 0.85 });
  const add = (geo, mat, x, y, z) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.receiveShadow = true; g.add(m); return m; };
  add(new RoundedBoxGeometry(460, 18, 22, 3, 1.4), profil, 0, 0, -11);
  add(new THREE.BoxGeometry(460, 1.2, 0.4), riemen, 0, 9.1, -11);          // Nut oben
  add(new RoundedBoxGeometry(460, 5.5, 1.6, 2, 0.4), stahl, 0, 4.2, 0.6);   // Linearführung
  add(new THREE.BoxGeometry(460, 3.6, 0.8), riemen, 0, -4.6, 0.4);         // Riemen
  return g;
}

/* ---------- Kniff-Monogramm und Fahrplan des Kopfes ---------- */
function monogramm(u, kipp) {
  const S = 2.6, CX = 18.6, CY = 15.55, TIEFE = 6.4, FASE = 0.7;
  const H = TIEFE + 2 * FASE;
  const STUFE = H / LAGEN;
  const P = [[8.8, 4.6], [13.4, 4.6], [13.4, 13.356], [19.4, 9.7], [21.9, 11.9], [16.3, 16.5],
    [23.2, 27.4], [18.5, 27.4], [13.4, 19.796], [13.4, 27.4], [8.8, 27.4]];
  const zuForm = ([x, y]) => [(x - CX) * S, -(y - CY) * S];
  const lokal = ([x, y]) => [(x - CX) * S, (y - CY) * S];      // Druckbett: x, z
  const k = new THREE.Shape();
  P.map(zuForm).forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
  k.closePath();

  const punkt = new THREE.Shape();
  const [px, py] = zuForm([23, 3.7]), w = 5.4 * S, rr = 1.7 * S;
  const H2 = Math.PI / 2;
  punkt.moveTo(px + rr, py);
  punkt.lineTo(px + w - rr, py); punkt.absarc(px + w - rr, py - rr, rr, H2, 0, true);
  punkt.lineTo(px + w, py - w + rr); punkt.absarc(px + w - rr, py - w + rr, rr, 0, -H2, true);
  punkt.lineTo(px + rr, py - w); punkt.absarc(px + rr, py - w + rr, rr, -H2, -Math.PI, true);
  punkt.lineTo(px, py - rr); punkt.absarc(px + rr, py - rr, rr, Math.PI, H2, true);

  const extr = (form) => {
    const geo = new THREE.ExtrudeGeometry(form, {
      depth: TIEFE, bevelEnabled: true, bevelThickness: FASE, bevelSize: 0.6, bevelSegments: 3, curveSegments: 12,
    });
    geo.rotateX(-Math.PI / 2); geo.translate(0, FASE, 0);
    return geo;
  };

  // Umriss für die offene Oberseite: um die Fase (0,6 mm) nach außen versetzt wie die Wände
  const versetzt = (pkt, d) => {
    let fl = 0;
    pkt.forEach((a, i) => { const b = pkt[(i + 1) % pkt.length]; fl += a[0] * b[1] - b[0] * a[1]; });
    const sg = fl > 0 ? 1 : -1;
    return pkt.map((c, i) => {
      const a = pkt[(i + pkt.length - 1) % pkt.length], b = pkt[(i + 1) % pkt.length];
      const n = (p, q) => { const dx = q[0] - p[0], dy = q[1] - p[1], l = Math.hypot(dx, dy); return [sg * dy / l, -sg * dx / l]; };
      const n1 = n(a, c), n2 = n(c, b);
      let mx = n1[0] + n2[0], my = n1[1] + n2[1];
      const ml = Math.hypot(mx, my); mx /= ml; my /= ml;
      const f = d / Math.max(0.35, mx * n1[0] + my * n1[1]);
      return [c[0] + mx * f, c[1] + my * f];
    });
  };
  versetzt(P.map(lokal), 0.6).forEach(([x, z], i) => u.uPoly.value[i].set(x, z));
  const pm = lokal([25.7, 6.4]);
  u.uPunkt.value.set(pm[0], pm[1], 2.7 * S + 0.6, rr + 0.6);

  const traeger = new THREE.Group();
  const objekt = new THREE.Group();
  const stueck = (geo, farbe, art) => {
    const m = new THREE.Mesh(geo, druckStoff(u, farbe, { rau: art === 'deckel' ? 0.52 : 0.48, art }));
    m.customDepthMaterial = tiefenStoff(u, art);
    m.castShadow = true; m.receiveShadow = true;
    objekt.add(m); return m;
  };
  stueck(extr(k), F.creme, 'wand');
  stueck(extr(punkt), F.amber, 'wand');
  // offene Oberseite: feines Gitter, das der Shader auf die gedruckte Höhe hebt
  const gitter = new THREE.PlaneGeometry(53, 64, 118, 142);
  gitter.rotateX(-Math.PI / 2);
  const deckel = stueck(gitter, F.creme, 'deckel');
  objekt.position.y = -H / 2;
  traeger.add(objekt); traeger.position.y = H / 2;

  // Druckbahnen einer Lage in Vorwärtsrichtung (Einheiten des Monogramms):
  // Balken runter-hoch-runter, Bein hoch-runter-hoch, Arm raus-zurück, Punkt hin-her-hin
  const BAHNEN = [
    [[9.567, 5.35], [9.567, 26.65]], [[11.1, 26.65], [11.1, 5.35]], [[12.633, 5.35], [12.633, 26.65]],
    [[18.87, 26.77], [13.99, 19.41]], [[14.96, 18.32], [20.44, 26.77]], [[22.0, 26.77], [15.93, 17.22]],
    [[14.64, 15.39], [20.76, 11.66]], [[19.51, 10.56], [13.81, 14.03]],
    [[23.75, 8.2], [27.65, 8.2]], [[27.65, 6.4], [23.75, 6.4]], [[23.75, 4.6], [27.65, 4.6]],
  ].map(([a, b]) => [lokal(a), lokal(b)]);
  let U = 0;
  const bahn = BAHNEN.map(([a, b], i) => {
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const r = { a, b, l, u0: U, u1: U + l, i };
    U += l;
    u.uLin.value[i].set(a[0], a[1], b[0], b[1]);
    u.uLinU.value[i] = r.u0;
    return r;
  });
  u.uStufe.value = STUFE; u.uHMax.value = H;

  // Fahrplan: Druckbahnen und Leerfahrten, je Lage hin oder zurück, dazwischen eine Lage höher
  const A = 0.07, DZ = 0.25;                  // Beschleunigungszeit je Fahrt, Lagenwechsel
  const plan = [];
  let ende = null;
  for (let lage = 0; lage < LAGEN; lage++) {
    const vor = lage % 2 === 0;
    const folge = vor ? bahn : [...bahn].reverse();
    const y = STUFE * (lage + 1);
    if (lage > 0) plan.push({ art: 'z', a: ende, b: ende, ya: y - STUFE, yb: y, l: 0, lage, vor, uk: vor ? 0 : U });
    for (const q of folge) {
      const a = vor ? q.a : q.b, b = vor ? q.b : q.a;
      if (ende && (lage === 0 || q !== folge[0])) {
        const uk = vor ? q.u0 : q.u1;
        plan.push({ art: 'leer', a: ende, b: a, ya: y, yb: y, l: Math.hypot(a[0] - ende[0], a[1] - ende[1]), lage, vor, uk });
      }
      plan.push({ art: 'druck', a, b, ya: y, yb: y, l: q.l, lage, vor, linie: q.i, u0: vor ? q.u0 : q.u1, u1: vor ? q.u1 : q.u0 });
      ende = b;
    }
  }
  const wege = plan.reduce((s, q) => s + q.l, 0);
  const fest = plan.reduce((s, q) => s + (q.art === 'z' ? DZ : A), 0);
  const V = wege / (T_DRUCK - fest);
  let T = 0;
  for (const q of plan) { q.d = q.art === 'z' ? DZ : q.l / V + A; q.t = T; T += q.d; }
  const trapez = (tau, d, l) => {             // anfahren, gleichmäßig fahren, abbremsen
    if (l <= 0) return 0;
    const vmax = l / (d - A);
    if (tau < A) return 0.5 * vmax * tau * tau / A;
    if (tau < d - A) return vmax * (tau - A / 2);
    const r = Math.max(0, d - tau);
    return l - 0.5 * vmax * r * r / A;
  };
  const kopf = new THREE.Vector3();

  return {
    objekt: traeger, H, kamZiel: 6, kamWeit: 1,
    start: () => [plan[0].a[0], plan[0].ya, plan[0].a[1]],
    // Druckstand zur Zeit t (Sekunden seit Druckbeginn); liefert die Düsenposition
    drucke(t) {
      const tt = Math.min(Math.max(t, 0), T - 1e-6);
      const q = plan.find((x) => tt < x.t + x.d) || plan[plan.length - 1];
      const tau = tt - q.t;
      if (q.art === 'z') {
        kopf.set(q.a[0], mix(q.ya, q.yb, sanft(tau / q.d)), q.a[1]);
        u.uUKopf.value = q.uk; u.uLinie.value = -1;
      } else {
        const s = trapez(tau, q.d, q.l), p = q.l > 0 ? s / q.l : 1;
        const hub = q.art === 'leer' ? 0.9 * Math.sin(Math.PI * p) : 0;
        kopf.set(mix(q.a[0], q.b[0], p), q.ya + hub, mix(q.a[1], q.b[1], p));
        if (q.art === 'druck') { u.uUKopf.value = mix(q.u0, q.u1, p); u.uLinie.value = q.linie; } else { u.uUKopf.value = q.uk; u.uLinie.value = -1; }
      }
      u.uLage.value = q.lage;
      u.uVor.value = q.vor ? 1 : 0;
      u.uFertig.value = 0;
      deckel.visible = true;
      return kopf;
    },
    leer() {
      u.uLage.value = 0; u.uVor.value = 1; u.uUKopf.value = -100; u.uLinie.value = -1; u.uFertig.value = 0;
      deckel.visible = false;
    },
    fertig() {
      u.uFertig.value = 1;
      deckel.visible = false;
    },
    anteil(t) { return clamp01(t / T_DRUCK); },
    schluss(t) {
      const p = sanft((t - T_AUF) / D_AUF);
      traeger.position.y = H / 2 + p * 24;
      traeger.rotation.x = p * kipp;
      this.kamZiel = 6 + p * 22; this.kamWeit = 1 + p * 0.32;
      const q = clamp01((t - T_AUF - D_AUF) / D_PENDEL);
      traeger.rotation.y = Math.sin(q * Math.PI * 2) * 0.16 * (1 - q);
      return p;
    },
    info: { V, wege, T },
  };
}

/* ---------- Bühne ---------- */
export function starte(box, { debug = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const canvas = renderer.domElement;
  canvas.className = 'k-ph__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  box.appendChild(canvas);

  const szene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  szene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  szene.environmentIntensity = 0.42;

  // Licht: warmes Hauptlicht von links oben mit weichem Schatten, kühles Kantenlicht von hinten rechts
  szene.add(new THREE.HemisphereLight(0xfff2e0, 0x0b0d0e, 0.42));
  const haupt = new THREE.DirectionalLight(0xffeccf, 2.7);
  haupt.position.set(-95, 170, 70);
  haupt.castShadow = true;
  haupt.shadow.mapSize.set(2048, 2048);
  Object.assign(haupt.shadow.camera, { left: -120, right: 120, top: 120, bottom: -120, near: 20, far: 520 });
  haupt.shadow.bias = -0.0005;
  haupt.shadow.normalBias = 0.35;
  szene.add(haupt, haupt.target);
  const kante = new THREE.DirectionalLight(0xa9bccf, 2.0); kante.position.set(110, 80, -130); szene.add(kante);
  const oben = new THREE.DirectionalLight(0xffffff, 0.5); oben.position.set(30, 200, 140); szene.add(oben);
  const duesenLicht = new THREE.PointLight(0xffa040, 0, 70, 2); szene.add(duesenLicht);

  const KAM_HOEHE = THREE.MathUtils.degToRad(34);
  const KAM_WINKEL = THREE.MathUtils.degToRad(18);

  // Teil
  const uTeil = uniformSatz(1.3);
  const teil = monogramm(uTeil, Math.PI / 2 - KAM_HOEHE);
  szene.add(teil.objekt);

  // Kopf und Achse
  const uKopf = uniformSatz(0.85);
  const { g: kopf, luefter } = druckkopf(uKopf);
  szene.add(kopf);
  const xAchse = achse();
  szene.add(xAchse);
  const glutPunkt = new THREE.Sprite(new THREE.SpriteMaterial({
    map: verlauf([[0, 'rgba(255,214,150,1)'], [0.25, 'rgba(255,170,70,.55)'], [1, 'rgba(242,166,59,0)']]),
    blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, toneMapped: false,
  }));
  glutPunkt.scale.set(8, 8, 1); szene.add(glutPunkt);

  // Druckbett: dunkle, leicht gekörnte Platte mit feinem Raster, die zum Rand ausläuft
  const bettTex = leinwand(1024, 1024, (g, b) => {
    g.fillStyle = '#1c1f23'; g.fillRect(0, 0, b, b);
    let s = 7;
    const zufall = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    for (let i = 0; i < 26000; i++) {
      g.fillStyle = zufall() < 0.5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.18)';
      g.fillRect(zufall() * b, zufall() * b, 1.5, 1.5);
    }
    g.strokeStyle = 'rgba(255,255,255,.05)'; g.lineWidth = 1.5;
    for (let i = 0; i <= b; i += b / 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, b); g.moveTo(0, i); g.lineTo(b, i); g.stroke(); }
  });
  bettTex.anisotropy = 4;
  const bettAlpha = verlauf([[0, '#fff'], [0.45, '#bbb'], [1, '#000']]);
  bettAlpha.colorSpace = THREE.NoColorSpace;
  const bett = new THREE.Mesh(new THREE.CircleGeometry(150, 64),
    new THREE.MeshStandardMaterial({ map: bettTex, alphaMap: bettAlpha, transparent: true, roughness: 0.72, metalness: 0.15, depthWrite: false }));
  bett.rotation.x = -Math.PI / 2; bett.position.y = -0.4; bett.receiveShadow = true; szene.add(bett);
  const kontakt = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: verlauf([[0, 'rgba(0,0,0,.7)'], [0.55, 'rgba(0,0,0,.3)'], [1, 'rgba(0,0,0,0)']]), transparent: true, depthWrite: false, opacity: 0,
  }));
  kontakt.rotation.x = -Math.PI / 2; kontakt.position.y = -0.3; kontakt.scale.set(100, 120, 1); szene.add(kontakt);

  // Kamera
  const kamera = new THREE.PerspectiveCamera(24, 1, 5, 3000);
  const ziel = new THREE.Vector3(0, 6, 0);
  const PARK = new THREE.Vector3(36, 8, 4);          // ganz im Bild, rechts neben dem Teil
  const AUS = new THREE.Vector3(80, 100, -24);       // am Ende aus dem Bild
  let nahDebug = 1;
  const anfahrt = (z) => 1 - sanft(z / (T_AN + 1.8));
  const stelleKamera = (z) => {
    const d = 205 * Math.max(1, 1.45 / kamera.aspect) * teil.kamWeit * (1 + 0.32 * anfahrt(z)) * nahDebug;
    const h = KAM_HOEHE, w = KAM_WINKEL + Math.sin(z * 0.22) * 0.05;
    kamera.position.set(ziel.x + d * Math.cos(h) * Math.sin(w), ziel.y + d * Math.sin(h), ziel.z + d * Math.cos(h) * Math.cos(w));
    kamera.lookAt(ziel);
  };
  const groesse = () => {
    const b = box.clientWidth || 350, h = box.clientHeight || 240;
    renderer.setSize(b, h, false);
    canvas.style.width = '100%'; canvas.style.height = '100%';
    kamera.aspect = b / h; kamera.updateProjectionMatrix();
  };
  groesse();

  const m4 = new THREE.Matrix4();
  const obenFuer = (u, obj) => {
    obj.updateWorldMatrix(true, false);
    m4.multiplyMatrices(kamera.matrixWorldInverse, obj.matrixWorld);
    u.uOben.value.set(0, 1, 0).transformDirection(m4);
  };

  const kopfPos = new THREE.Vector3();
  const [sx, sy, sz] = teil.start();
  const zeichne = (z) => {
    let heiss = 0, auf = 0, anteil = 0;
    if (z < T_AN) {
      const p = weich(clamp01(z / T_AN));
      kopfPos.set(mix(PARK.x, sx, p), mix(PARK.y, sy, p), mix(PARK.z, sz, p));
      heiss = clamp01((z - T_AN + 0.4) / 0.4);
      teil.leer();
      auf = teil.schluss(-1);
    } else if (z < T_ENDE) {
      kopfPos.copy(teil.drucke(z - T_AN));
      heiss = 1;
      anteil = teil.anteil(z - T_AN);
      auf = teil.schluss(-1);
    } else {
      const t = z - T_ENDE;
      const ende = teil.drucke(T_DRUCK);
      const p = weich(clamp01(t / T_AB));
      kopfPos.set(mix(ende.x, AUS.x, p), mix(ende.y, AUS.y, p), mix(ende.z, AUS.z, p));
      teil.fertig();
      heiss = 1 - clamp01(t / 1.2);
      anteil = 1;
      auf = teil.schluss(t);
    }

    uTeil.uHeiss.value = heiss;
    uTeil.uKopf.value.copy(kopfPos);
    kopf.position.copy(kopfPos);
    xAchse.position.set(0, kopfPos.y + 50, kopfPos.z - 13);
    luefter.rotation.z = -z * 2.4;
    glutPunkt.position.set(kopfPos.x, kopfPos.y + 0.3, kopfPos.z);
    glutPunkt.material.opacity = heiss * 0.85;
    duesenLicht.position.set(kopfPos.x, kopfPos.y + 1.5, kopfPos.z);
    duesenLicht.intensity = 900 * heiss;
    kontakt.material.opacity = 0.8 * clamp01(anteil * 1.4) * (1 - 0.55 * auf);

    ziel.y = teil.kamZiel + 16 * anfahrt(z);
    stelleKamera(z);
    obenFuer(uTeil, teil.objekt);
    obenFuer(uKopf, kopf);
    renderer.render(szene, kamera);
  };

  // Eigene Uhr: läuft nur in gezeichneten Bildern, im Hintergrund-Tab pausiert der Druck
  let uhr = 0, zuletzt = 0, raf = 0, sichtbar = true, aktiv = false;
  const bild = (jetzt) => {
    uhr += zuletzt ? Math.min(jetzt - zuletzt, 50) / 1000 : 0;
    zuletzt = jetzt;
    zeichne(Math.min(uhr, T_FERTIG));
    if (uhr >= T_FERTIG) { aktiv = false; raf = 0; return; }
    raf = requestAnimationFrame(bild);
  };
  const weiter = () => { if (aktiv && sichtbar && !raf) { zuletzt = 0; raf = requestAnimationFrame(bild); } };
  const pause = () => { cancelAnimationFrame(raf); raf = 0; };
  const drucke = () => { pause(); uhr = 0; aktiv = true; zeichne(0); weiter(); };
  const halt = () => { pause(); aktiv = false; };

  new ResizeObserver(() => { groesse(); if (!raf) zeichne(uhr); }).observe(box);
  zeichne(0);
  box.classList.add('k-ph--3d');

  const home = document.querySelector('.k-home');
  let gesehen = false;
  new IntersectionObserver((e) => {
    sichtbar = e.some((x) => x.isIntersecting);
    if (sichtbar && !gesehen && (!home || home.dataset.welt !== 'shop')) { gesehen = true; drucke(); } else if (sichtbar) weiter(); else pause();
  }).observe(box);
  if (home) {
    new MutationObserver(() => {
      if (home.dataset.welt === 'idee') { gesehen = true; drucke(); } else halt();
    }).observe(home, { attributes: true, attributeFilter: ['data-welt'] });
  }

  const steuerung = { drucke, halt, dauer: T_FERTIG, setze: (z) => { halt(); uhr = z; zeichne(z); }, nah: (f) => { nahDebug = f; } };
  if (debug) window.__kDruck = steuerung;
  return steuerung;
}
