/* Startbild der Ideen-Welt am Handy, in 3D: der Kniff-Druckkopf druckt das
   Kniff-Monogramm Schicht für Schicht; am Ende richtet sich das K mit dem
   Bernstein-Punkt zur Kamera auf. Einheiten: Millimeter, Druckbett auf y = 0.
   Wird von js/kniff-welt.js nur am Handy nachgeladen; ohne WebGL 2 oder bei
   "Bewegung reduzieren" bleibt das Standbild (assets/druck3d-k.webp). */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const F = { amber: 0xf2a63b, amberHi: 0xffbb62, amberTief: 0x7a4a17, creme: 0xf3f0ea };

// Zeitplan in Sekunden: anfahren, drucken, wegfahren; danach richtet sich das K auf
const T_AN = 1.5, T_DRUCK = 8.5, T_AB = 1.4;
const T_ENDE = T_AN + T_DRUCK;
const T_AUF = T_AB * 0.7, D_AUF = 2.2, D_PENDEL = 5;
const T_FERTIG = T_ENDE + T_AUF + D_AUF + D_PENDEL;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const weich = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const sanft = (p) => 0.5 - Math.cos(Math.PI * clamp01(p)) / 2;
const mix = (a, b, t) => a + (b - a) * t;

/* ---------- Material mit Schichtlinien, Druckgrenze und Glut ---------- */
function uniformSatz(lh) {
  return {
    uTop: { value: 1e4 },                          // darüber ist noch nichts gedruckt
    uKopf: { value: new THREE.Vector3(0, -1e3, 0) },
    uLH: { value: lh },                            // sichtbare Schichthöhe
    uHot: { value: new THREE.Color(F.amberHi) },
    uHeiss: { value: 0 },                          // frisch gedrucktes Material glüht
    uOben: { value: new THREE.Vector3(0, 1, 0) },  // Objekt-oben in Kamerakoordinaten
  };
}

const KOPF_GLSL = `
varying vec3 vLokal;
uniform float uTop, uLH, uHeiss;
uniform vec3 uKopf, uHot, uOben;`;

function druckStoff(u, farbe, { rau = 0.55, doppel = true, mat = null, muster = false, glanz = 1 } = {}) {
  const uMat = { value: mat || new THREE.Matrix4() };
  const m = new THREE.MeshStandardMaterial({
    color: farbe, roughness: rau, metalness: 0, envMapIntensity: glanz,
    side: doppel ? THREE.DoubleSide : THREE.FrontSide,
  });
  if (muster) m.defines = { K_MUSTER: '' };
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uMat });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLokal;\nuniform mat4 uMat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLokal = (uMat * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>' + KOPF_GLSL)
      .replace('void main() {', `void main() {
  if (vLokal.y > uTop) discard;
  float kLin = vLokal.y / uLH;
  float kSicht = 1.0 - smoothstep(0.2, 0.45, fwidth(kLin));
  float kF = fract(kLin) * 2.0 - 1.0;
  float kWulst = sqrt(max(1.0 - kF * kF, 0.0));`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  diffuseColor.rgb *= mix(1.0, mix(0.72, 1.0, kWulst), kSicht);
  #ifdef K_MUSTER
    // Füllmuster der offenen Schicht: diagonale Bahnen
    float kB = (vLokal.x + vLokal.z) / 1.15;
    float kBS = 1.0 - smoothstep(0.25, 0.5, fwidth(kB));
    float kBF = abs(fract(kB) - 0.5) * 2.0;
    diffuseColor.rgb *= mix(1.0, mix(0.8, 1.0, smoothstep(0.0, 0.6, kBF)), kBS);
  #endif
  if (!gl_FrontFacing) diffuseColor.rgb *= 0.9;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (gl_FrontFacing) {
    float kSeite = 1.0 - abs(dot(normal, uOben));
    float kHang = clamp(kF / max(kWulst, 0.3), -2.5, 2.5);
    normal = normalize(normal + uOben * kHang * 0.28 * kSicht * kSeite);
  } else {
    normal = uOben;
  }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float kNah = 1.0 - smoothstep(0.0, uLH * 1.8, uTop - vLokal.y);
  float kKappe = gl_FrontFacing ? kNah : 1.0;
  vec2 kD = vLokal.xz - uKopf.xz;
  totalEmissiveRadiance += uHot * uHeiss * kKappe * (0.06 + 1.5 * exp(-dot(kD, kD) / 40.0));`);
  };
  return m;
}

// Schattenwurf nur für das, was schon gedruckt ist
function tiefenStoff(u, mat = null) {
  const uMat = { value: mat || new THREE.Matrix4() };
  const m = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, { uTop: u.uTop, uMat });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying float vY;\nuniform mat4 uMat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvY = (uMat * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying float vY;\nuniform float uTop;')
      .replace('void main() {', 'void main() {\n  if (vY > uTop) discard;');
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
  const schwarz = druckStoff(u, 0x1e1f23, { rau: 0.5, doppel: false, glanz: 1.4 });
  const schwarz2 = druckStoff(u, 0x17181b, { rau: 0.55, doppel: false, glanz: 1.2 });
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

/* ---------- Pfad entlang eines Polygons, nach Bogenlänge, mit runden Ecken ---------- */
function polygonPfad(punkte, rund = 3.5) {
  const seg = [];
  let L = 0;
  for (let i = 0; i < punkte.length; i++) {
    const a = punkte[i], b = punkte[(i + 1) % punkte.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > 1e-6) { seg.push({ a, b, l, s: L }); L += l; }
  }
  const roh = (s) => {
    s = ((s % L) + L) % L;
    const t = seg.find((q) => s <= q.s + q.l) || seg[seg.length - 1];
    const p = (s - t.s) / t.l;
    return [mix(t.a[0], t.b[0], p), mix(t.a[1], t.b[1], p)];
  };
  const N = 9;
  return {
    L,
    bei(s) {                       // gleitender Mittelwert glättet die Ecken
      let x = 0, z = 0;
      for (let i = 0; i < N; i++) {
        const [px, pz] = roh(s + ((i / (N - 1)) * 2 - 1) * rund);
        x += px; z += pz;
      }
      return [x / N, z / N];
    },
  };
}

/* ---------- Kniff-Monogramm ---------- */
function monogramm(u, kipp) {
  const S = 2.6, CX = 18.6, CY = 15.55, TIEFE = 7.6, FASE = 0.7;
  const H = TIEFE + 2 * FASE;
  const P = [[8.8, 4.6], [13.4, 4.6], [13.4, 13.356], [19.4, 9.7], [21.9, 11.9], [16.3, 16.5],
    [23.2, 27.4], [18.5, 27.4], [13.4, 19.796], [13.4, 27.4], [8.8, 27.4]];
  const zuForm = ([x, y]) => [(x - CX) * S, -(y - CY) * S];
  const k = new THREE.Shape();
  P.map(zuForm).forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
  k.closePath();

  const punkt = new THREE.Shape();
  const [px, py] = zuForm([23, 3.7]), w = 5.4 * S, rr = 1.7 * S;
  punkt.moveTo(px + rr, py);
  punkt.lineTo(px + w - rr, py); punkt.quadraticCurveTo(px + w, py, px + w, py - rr);
  punkt.lineTo(px + w, py - w + rr); punkt.quadraticCurveTo(px + w, py - w, px + w - rr, py - w);
  punkt.lineTo(px + rr, py - w); punkt.quadraticCurveTo(px, py - w, px, py - w + rr);
  punkt.lineTo(px, py - rr); punkt.quadraticCurveTo(px, py, px + rr, py);

  const extr = (form) => {
    const geo = new THREE.ExtrudeGeometry(form, {
      depth: TIEFE, bevelEnabled: true, bevelThickness: FASE, bevelSize: 0.6, bevelSegments: 3, curveSegments: 12,
    });
    geo.rotateX(-Math.PI / 2); geo.translate(0, FASE, 0);
    return geo;
  };
  const flaeche = (form) => { const geo = new THREE.ShapeGeometry(form, 12); geo.rotateX(-Math.PI / 2); return geo; };

  const traeger = new THREE.Group();
  const objekt = new THREE.Group();
  const koerper = (geo, farbe) => {
    const m = new THREE.Mesh(geo, druckStoff(u, farbe, { rau: 0.48 }));
    m.customDepthMaterial = tiefenStoff(u);
    m.castShadow = true; m.receiveShadow = true;
    objekt.add(m); return m;
  };
  koerper(extr(k), F.creme);
  koerper(extr(punkt), F.amber);
  const deckel = (geo, farbe) => {
    const m = new THREE.Mesh(geo);
    m.material = druckStoff(u, farbe, { rau: 0.5, doppel: false, mat: m.matrix, muster: true });
    m.customDepthMaterial = tiefenStoff(u, m.matrix);
    m.castShadow = true; m.receiveShadow = true; m.visible = false;
    objekt.add(m); return m;
  };
  const deckelK = deckel(flaeche(k), F.creme), deckelP = deckel(flaeche(punkt), F.amber);
  objekt.position.y = -H / 2;
  traeger.add(objekt); traeger.position.y = H / 2;

  // Pfad: Umriss des K, rüber zum Punkt, Umriss des Punkts, zurück
  const kp = P.map((q) => { const [x, y] = zuForm(q); return [x, -y]; });
  const dp = [[23, 3.7], [28.4, 3.7], [28.4, 9.1], [23, 9.1]].map((q) => { const [x, y] = zuForm(q); return [x, -y]; });
  const pfad = polygonPfad([...kp, dp[3], ...dp, kp[0]]);
  const TEMPO = 70, RAMPE = 0.7, S0 = 18;
  // Weg mit sanftem Anfahren und Abbremsen
  const weg = (t) => {
    const v = (x) => (x < RAMPE ? (x * x) / (2 * RAMPE) : x - RAMPE / 2);
    const tt = Math.min(t, T_DRUCK);
    const ende = Math.max(0, tt - (T_DRUCK - RAMPE));
    return TEMPO * (v(tt) - (ende * ende) / (2 * RAMPE));
  };

  return {
    objekt: traeger, H, radius: 34,
    kamZiel: 6, kamWeit: 1,
    deckel(top) {
      for (const d of [deckelK, deckelP]) {
        d.visible = top > 0 && top < H - 0.05;
        d.position.y = top - 0.02; d.updateMatrix();
      }
    },
    kopf(t) { return pfad.bei(S0 + weg(t)); },
    schluss(t) {
      const p = sanft((t - T_AUF) / D_AUF);
      traeger.position.y = H / 2 + p * 24;
      traeger.rotation.x = p * kipp;
      this.kamZiel = 6 + p * 22; this.kamWeit = 1 + p * 0.32;
      const q = clamp01((t - T_AUF - D_AUF) / D_PENDEL);
      traeger.rotation.y = Math.sin(q * Math.PI * 2) * 0.16 * (1 - q);
      return p;
    },
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
  haupt.shadow.radius = 3;
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
  // weicher Kontaktschatten direkt unter dem Teil
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
  const anfahrt = (z) => 1 - sanft(z / (T_AN + 1.8));   // zu Beginn weit, dann ruhig heran
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
  const zeichne = (z) => {
    let top, heiss = 0, auf = 0;
    if (z < T_AN) {
      const [sx, sz] = teil.kopf(0);
      const p = weich(clamp01(z / T_AN));
      kopfPos.set(mix(PARK.x, sx, p), mix(PARK.y, 0.4, p), mix(PARK.z, sz, p));
      top = -1; heiss = clamp01((z - T_AN + 0.4) / 0.4);
      auf = teil.schluss(-1);
    } else if (z < T_ENDE) {
      const t = z - T_AN;
      top = Math.max(0.4, teil.H * (t / T_DRUCK));
      const [x, zz] = teil.kopf(t);
      kopfPos.set(x, top, zz);
      heiss = 1;
      auf = teil.schluss(-1);
    } else {
      const t = z - T_ENDE;
      const [ex, ez] = teil.kopf(T_DRUCK);
      const p = weich(clamp01(t / T_AB));
      kopfPos.set(mix(ex, AUS.x, p), mix(teil.H, AUS.y, p), mix(ez, AUS.z, p));
      top = 1e4;
      heiss = 1 - clamp01(t / 1.2);
      auf = teil.schluss(t);
    }

    uTeil.uTop.value = top;
    teil.deckel(top);
    uTeil.uHeiss.value = heiss;
    uTeil.uKopf.value.copy(kopfPos);
    kopf.position.copy(kopfPos);
    xAchse.position.set(0, kopfPos.y + 50, kopfPos.z - 13);
    luefter.rotation.z = -z * 2.4;
    glutPunkt.position.set(kopfPos.x, kopfPos.y + 0.3, kopfPos.z);
    glutPunkt.material.opacity = heiss * 0.85;
    duesenLicht.position.set(kopfPos.x, kopfPos.y + 1.5, kopfPos.z);
    duesenLicht.intensity = 900 * heiss;
    kontakt.material.opacity = 0.8 * clamp01((top < 0 ? 0 : Math.min(top, teil.H) / teil.H) * 1.4 + (top > teil.H ? 1 : 0)) * (1 - 0.55 * auf);

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
