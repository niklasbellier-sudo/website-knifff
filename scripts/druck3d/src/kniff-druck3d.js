/* Startbild der Ideen-Welt am Handy, in 3D: der Kniff-Druckkopf druckt ein Teil
   Schicht für Schicht. Drei Varianten zum Vergleichen (?druck=a|b|c):
     a  Glühbirne  – aus der Idee wird ein Teil, am Ende geht das Licht an
     b  Stiftehalter – gedrehter Sechskant im Vasenmodus, dreht sich am Ende
     c  Kniff-K    – das Monogramm wird flach gedruckt und richtet sich auf
   Einheiten: Millimeter, Druckbett auf y = 0. Wird von js/kniff-welt.js nur am
   Handy nachgeladen; ohne WebGL oder bei "Bewegung reduzieren" bleibt das Poster. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';

const F = {
  amber: 0xf2a63b, amberHi: 0xffbb62, amberTief: 0x7a4a17,
  stahl: 0x3a3e43, creme: 0xf3f0ea, schwarz: 0x17171a,
};

// Zeitplan in Sekunden: anfahren, drucken, wegfahren, Schluss
const T_AN = 1.2, T_DRUCK = 8.5, T_AB = 1.3;
const T_START = T_AN, T_ENDE = T_AN + T_DRUCK;

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const weich = (p) => (p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2);
const sanft = (p) => 0.5 - Math.cos(Math.PI * clamp01(p)) / 2;
const mix = (a, b, t) => a + (b - a) * t;

/* ---------- Material mit Schichtlinien, Druckgrenze und Glut ---------- */
function uniformSatz(extra = {}) {
  return {
    uTop: { value: 1e4 },              // alles darüber ist noch nicht gedruckt
    uKopf: { value: new THREE.Vector3(0, -1e3, 0) },
    uLH: { value: 1.2 },               // sichtbare Schichthöhe
    uHot: { value: new THREE.Color(F.amberHi) },
    uHeiss: { value: 0 },              // frisch gedrucktes Material glüht
    uGlut: { value: 0 },               // Glühbirne an
    uWechsel: { value: -1e4 },         // darunter andere Farbe (Sockel)
    uUnten: { value: new THREE.Color(F.stahl) },
    uOben: { value: new THREE.Vector3(0, 1, 0) },   // Objekt-oben in Kamerakoordinaten
    uRillen: { value: 1 },
    ...extra,
  };
}

function druckStoff(u, farbe, { rau = 0.55, metall = 0, doppel = true, mat = null } = {}) {
  const uMat = { value: mat || new THREE.Matrix4() };
  const m = new THREE.MeshStandardMaterial({
    color: farbe, roughness: rau, metalness: metall,
    side: doppel ? THREE.DoubleSide : THREE.FrontSide,
  });
  m.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, u, { uMat });
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vLokal;\nuniform mat4 uMat;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLokal = (uMat * vec4(transformed, 1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vLokal;
uniform float uTop, uLH, uHeiss, uGlut, uWechsel, uRillen;
uniform vec3 uKopf, uHot, uUnten, uOben;`)
      .replace('void main() {', `void main() {
  if (vLokal.y > uTop) discard;
  float kLin = vLokal.y / uLH;
  float kW = fwidth(kLin);
  float kSicht = (1.0 - smoothstep(0.2, 0.45, kW)) * uRillen;
  float kF = fract(kLin) * 2.0 - 1.0;
  float kWulst = sqrt(max(1.0 - kF * kF, 0.0));`)
      .replace('#include <color_fragment>', `#include <color_fragment>
  if (vLokal.y < uWechsel) diffuseColor.rgb = uUnten;
  diffuseColor.rgb *= mix(1.0, mix(0.74, 1.0, kWulst), kSicht);
  if (!gl_FrontFacing) diffuseColor.rgb *= 0.9;`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
  if (gl_FrontFacing) {
    float kSeite = 1.0 - abs(dot(normal, uOben));
    float kHang = clamp(kF / max(kWulst, 0.3), -2.5, 2.5);
    normal = normalize(normal + uOben * kHang * 0.26 * kSicht * kSeite);
  } else {
    normal = uOben;   // Schnittfläche: liegt waagrecht wie eine frische Schicht
  }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
  float kNah = 1.0 - smoothstep(0.0, uLH * 1.8, uTop - vLokal.y);
  float kKappe = gl_FrontFacing ? kNah : 1.0;
  vec2 kD = vLokal.xz - uKopf.xz;
  float kSpot = exp(-dot(kD, kD) / 55.0);
  totalEmissiveRadiance += uHot * uHeiss * kKappe * (0.08 + 1.5 * kSpot);
  float kZone = smoothstep(uWechsel + 3.0, uWechsel + 12.0, vLokal.y);
  totalEmissiveRadiance += uHot * uGlut * kZone * (0.9 + 0.5 * kWulst);`);
  };
  return m;
}

/* ---------- kleine Helfer ---------- */
function leinwand(b, h, mal) {
  const c = document.createElement('canvas');
  c.width = b; c.height = h;
  mal(c.getContext('2d'), b, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
const glutTextur = () => leinwand(128, 128, (g, b) => {
  const r = g.createRadialGradient(b / 2, b / 2, 0, b / 2, b / 2, b / 2);
  r.addColorStop(0, 'rgba(255,214,150,1)');
  r.addColorStop(0.25, 'rgba(255,170,70,.55)');
  r.addColorStop(1, 'rgba(242,166,59,0)');
  g.fillStyle = r; g.fillRect(0, 0, b, b);
});
const schattenTextur = () => leinwand(128, 128, (g, b) => {
  const r = g.createRadialGradient(b / 2, b / 2, 0, b / 2, b / 2, b / 2);
  r.addColorStop(0, 'rgba(0,0,0,.75)');
  r.addColorStop(0.55, 'rgba(0,0,0,.35)');
  r.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, b, b);
});

/* ---------- Druckkopf wie assets/kopf.webp, Düsenspitze im Ursprung ---------- */
function druckkopf(u) {
  const g = new THREE.Group();
  const schwarz = druckStoff(u, 0x1b1c1f, { rau: 0.62, doppel: false });
  const schwarz2 = druckStoff(u, 0x141518, { rau: 0.66, doppel: false });
  const alu = new THREE.MeshStandardMaterial({ color: 0xc9cdd2, metalness: 0.85, roughness: 0.3 });
  const messing = new THREE.MeshStandardMaterial({ color: 0xd6a24c, metalness: 1, roughness: 0.28 });
  const dunkel = new THREE.MeshStandardMaterial({ color: 0x0c0c0d, roughness: 0.5 });
  const teil = (geo, mat, x, y, z, rx = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z); m.rotation.x = rx; g.add(m); return m;
  };
  const Q = Math.PI / 2;

  teil(new THREE.CylinderGeometry(4.0, 0.45, 8, 32), messing, 0, 4, 0);
  teil(new THREE.CylinderGeometry(4.7, 4.7, 3, 6), messing, 0, 9.5, 0);
  teil(new RoundedBoxGeometry(18.4, 9.8, 12, 3, 1.0), alu, -2, 15.9, 0);
  teil(new THREE.CylinderGeometry(1.1, 1.1, 0.8, 6), dunkel, -8.1, 18.9, 6.1, Q);
  teil(new THREE.CylinderGeometry(1.1, 1.1, 0.8, 6), dunkel, 3.4, 18.9, 6.1, Q);
  teil(new THREE.CylinderGeometry(2.4, 2.4, 1.4, 32), new THREE.MeshStandardMaterial({ color: 0x8a9096, metalness: 0.6, roughness: 0.35 }), 1.5, 14, 6.4, Q);
  teil(new THREE.CylinderGeometry(1.3, 1.3, 3.2, 16), alu, 0, 22.4, 0);

  // Lüfterkasten mit Lüfter
  teil(new RoundedBoxGeometry(26.8, 28.5, 14, 4, 1.8), schwarz, -5.7, 37.6, 1);
  const luefterTex = leinwand(256, 256, (c, b) => {
    c.fillStyle = '#0f1012'; c.beginPath(); c.arc(b / 2, b / 2, b / 2, 0, 7); c.fill();
    c.fillStyle = '#26282c';
    for (let i = 0; i < 9; i++) {
      c.save(); c.translate(b / 2, b / 2); c.rotate((i / 9) * Math.PI * 2);
      c.beginPath(); c.moveTo(18, -8);
      c.quadraticCurveTo(70, -40, 118, -14); c.lineTo(118, 6);
      c.quadraticCurveTo(70, -16, 26, 10); c.closePath(); c.fill(); c.restore();
    }
    c.fillStyle = '#1c1d20'; c.beginPath(); c.arc(b / 2, b / 2, 30, 0, 7); c.fill();
    c.fillStyle = '#f2a63b'; c.beginPath(); c.arc(b / 2, b / 2, 6, 0, 7); c.fill();
  });
  const luefter = teil(new THREE.CircleGeometry(9.6, 48), new THREE.MeshStandardMaterial({ map: luefterTex, roughness: 0.6 }), -8.1, 37.8, 8.06);
  teil(new THREE.TorusGeometry(9.8, 0.55, 10, 48), schwarz2, -8.1, 37.8, 8.0);

  // Rückplatte mit Lüftungsschlitzen
  teil(new RoundedBoxGeometry(13.6, 53, 18, 4, 1.6), schwarz2, 14, 42.7, -4);
  for (let i = 0; i < 11; i++) {
    teil(new THREE.BoxGeometry(5.2, 0.7, 0.4), dunkel, 11.2, 45.5 - i * 1.83, 5.0);
  }

  // Oberer Kasten mit Wortmarke und Knopf
  teil(new RoundedBoxGeometry(34, 19, 17, 4, 2.4), schwarz, -0.4, 62.3, 0.5);
  const marke = teil(new THREE.PlaneGeometry(12, 12 / 2.335),
    new THREE.MeshStandardMaterial({ transparent: true, roughness: 0.5, color: 0xffffff }), -5.1, 62.3, 9.06);
  new THREE.TextureLoader().load('/assets/kniff-wortmarke-hell.png', (t) => {
    t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
    marke.material.map = t; marke.material.needsUpdate = true;
  });
  teil(new THREE.CylinderGeometry(2.1, 2.1, 1.8, 32), new THREE.MeshStandardMaterial({ color: 0x101012, roughness: 0.35 }), 14.6, 62.5, 9.4, Q);

  // Klemme, Schlauch und Filament nach oben aus dem Bild
  teil(new THREE.CylinderGeometry(3.4, 3.4, 3.6, 32), dunkel, 0, 73.6, 0);
  teil(new THREE.CylinderGeometry(0.85, 0.85, 90, 12),
    new THREE.MeshStandardMaterial({ color: F.amber, roughness: 0.4, emissive: F.amberTief, emissiveIntensity: 0.25 }), 0, 120, 0);
  const schlauch = teil(new THREE.CylinderGeometry(1.8, 1.8, 90, 20),
    new THREE.MeshStandardMaterial({ color: 0xf4f1ea, roughness: 0.15, transparent: true, opacity: 0.5, depthWrite: false }), 0, 120, 0);
  schlauch.renderOrder = 2;

  return { g, luefter };
}

/* ---------- Deckel: die gerade gedruckte Schicht als geschlossene Fläche ---------- */
function deckel(geo, u, farbe) {
  const mesh = new THREE.Mesh(geo, null);
  mesh.material = druckStoff(u, farbe, { rau: 0.5, doppel: false, mat: mesh.matrix });
  mesh.matrixAutoUpdate = true;
  mesh.visible = false;
  return mesh;
}

/* ---------- Pfad entlang eines Polygons, nach Bogenlänge ---------- */
function polygonPfad(punkte) {
  const seg = [];
  let L = 0;
  for (let i = 0; i < punkte.length; i++) {
    const a = punkte[i], b = punkte[(i + 1) % punkte.length];
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (l > 1e-6) { seg.push({ a, b, l, s: L }); L += l; }
  }
  return {
    L,
    bei(s) {
      s = ((s % L) + L) % L;
      const t = seg.find((q) => s <= q.s + q.l) || seg[seg.length - 1];
      const p = (s - t.s) / t.l;
      return [mix(t.a[0], t.b[0], p), mix(t.a[1], t.b[1], p)];
    },
  };
}

/* ---------- Variante a: Glühbirne ---------- */
function gluehbirne(u) {
  const H = 68, SOCKEL = 20;
  const r = (y) => {
    if (y <= 1.2) return mix(4.5, 5.5, y / 1.2);
    if (y <= 2.6) return mix(6.5, 8.6, (y - 1.2) / 1.4);
    if (y <= 18) return 10.2 + 0.8 * Math.sin(((y - 2.6) / 2.9) * Math.PI * 2);
    if (y <= 20) return mix(10.8, 11.2, (y - 18) / 2);
    if (y <= 47) return 11.2 + 9.8 * Math.pow(Math.sin(((y - 20) / 27) * Math.PI / 2), 1.4);
    return Math.sqrt(Math.max(0, 21 * 21 - (y - 47) * (y - 47)));
  };
  const pts = [new THREE.Vector2(0, 0)];
  for (let y = 0; y <= H; y += y < 20 ? 0.25 : 0.6) pts.push(new THREE.Vector2(Math.max(r(y), 0.01), y));
  pts.push(new THREE.Vector2(0, H));
  const geo = new THREE.LatheGeometry(pts, 120);
  u.uWechsel.value = SOCKEL;
  u.uUnten.value.set(0x4a4f55);
  const mesh = new THREE.Mesh(geo, druckStoff(u, F.creme, { rau: 0.5 }));
  const objekt = new THREE.Group(); objekt.add(mesh);
  const dGeo = new THREE.CircleGeometry(1, 96); dGeo.rotateX(-Math.PI / 2);
  const d = deckel(dGeo, u, F.creme); objekt.add(d);

  const halo = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glutTextur(), color: 0xffb35c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, toneMapped: false,
  }));
  halo.position.set(0, 47, -8); halo.scale.set(100, 100, 1); objekt.add(halo);
  const licht = new THREE.PointLight(0xffb060, 0, 160, 2); licht.position.set(0, 47, 0); objekt.add(licht);

  const OMEGA = Math.PI * 2 * 0.42;
  return {
    objekt, H, radius: 22, mitte: 34, parkY: 12,
    deckel(top) {
      d.visible = top > 0 && top < H - 0.2;
      const rr = r(Math.min(Math.max(top, 0), H));
      d.position.y = top - 0.02; d.scale.set(rr, 1, rr);
      d.updateMatrix();
    },
    kopf(t, y) {
      const a = 0.6 + OMEGA * t;
      const rr = Math.max(r(Math.min(y, H - 0.3)) - 0.5, 0);
      return [Math.cos(a) * rr, Math.sin(a) * rr];
    },
    schluss(t) {               // t: Sekunden seit Druckende
      const p = sanft((t - T_AB * 0.6) / 1.6);
      u.uGlut.value = p;
      halo.material.opacity = 0.42 * p;
      licht.intensity = 2600 * p;
      return t > T_AB + 2.4;
    },
  };
}

/* ---------- Variante b: gedrehter Stiftehalter ---------- */
function stiftehalter(u) {
  const H = 62, R = 24, WAND = 2.4, BODEN = 2.0, DREH = THREE.MathUtils.degToRad(55);
  const N = 216, M = 124;
  const a6 = R * Math.cos(Math.PI / 6);
  const smin = (a, b, k) => -k * Math.log(Math.exp(-a / k) + Math.exp(-b / k));
  const rHex = (phi) => {
    const s = Math.PI / 3;
    const lok = ((((phi % s) + s) % s)) - s / 2;
    return smin(a6 / Math.cos(lok), R * 0.95, 0.9);
  };
  const rAussen = (phi, y) => rHex(phi - (DREH * y) / H);

  const ring = (rFn, y0, y1, innen) => {
    const pos = [], idx = [];
    for (let j = 0; j <= M; j++) {
      const y = mix(y0, y1, j / M);
      for (let i = 0; i < N; i++) {
        const phi = (i / N) * Math.PI * 2;
        const rr = rFn(phi, y);
        pos.push(Math.cos(phi) * rr, y, Math.sin(phi) * rr);
      }
    }
    for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) {
      const a = j * N + i, b = j * N + ((i + 1) % N), c = a + N, d = b + N;
      if (innen) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };
  const scheibe = (rFn, y, oben) => {
    const pos = [0, y, 0], idx = [];
    for (let i = 0; i < N; i++) {
      const phi = (i / N) * Math.PI * 2, rr = rFn(phi, y);
      pos.push(Math.cos(phi) * rr, y, Math.sin(phi) * rr);
    }
    for (let i = 0; i < N; i++) {
      const a = 1 + i, b = 1 + ((i + 1) % N);
      if (oben) idx.push(0, b, a); else idx.push(0, a, b);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };
  const kranz = (y) => {
    const pos = [], idx = [];
    for (let i = 0; i < N; i++) {
      const phi = (i / N) * Math.PI * 2, ra = rAussen(phi, y), ri = ra - WAND;
      pos.push(Math.cos(phi) * ra, y, Math.sin(phi) * ra, Math.cos(phi) * ri, y, Math.sin(phi) * ri);
    }
    for (let i = 0; i < N; i++) {
      const a = i * 2, b = ((i + 1) % N) * 2;
      idx.push(a, a + 1, b, b, a + 1, b + 1);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setIndex(idx); geo.computeVertexNormals();
    return geo;
  };

  const stoff = druckStoff(u, F.amber, { rau: 0.5 });
  const objekt = new THREE.Group();
  const rInnen = (phi, y) => rAussen(phi, y) - WAND;
  [ring(rAussen, 0, H, false), ring(rInnen, BODEN, H, true), scheibe(rAussen, 0, false),
    scheibe(rInnen, BODEN, true), kranz(H)].forEach((geo) => objekt.add(new THREE.Mesh(geo, stoff)));

  const OMEGA = Math.PI * 2 * 0.4;
  let dreh = 0;
  return {
    objekt, H, radius: R, mitte: 30, parkY: 12,
    kopf(t, y) {
      const a = 0.4 + OMEGA * t;
      const rr = rAussen(a, y) - WAND / 2;
      return [Math.cos(a) * rr, Math.sin(a) * rr];
    },
    schluss(t) {
      const p = sanft((t - T_AB * 0.5) / 5.5);
      dreh = -p * Math.PI * 0.75;
      objekt.rotation.y = dreh;
      return t > T_AB * 0.5 + 5.6;
    },
  };
}

/* ---------- Variante c: Kniff-Monogramm ---------- */
function monogramm(u, kamHoehe) {
  const S = 2.6, CX = 18.6, CY = 15.55, TIEFE = 7.6, FASE = 0.7;
  const H = TIEFE + 2 * FASE;
  const P = [[8.8, 4.6], [13.4, 4.6], [13.4, 13.356], [19.4, 9.7], [21.9, 11.9], [16.3, 16.5],
    [23.2, 27.4], [18.5, 27.4], [13.4, 19.796], [13.4, 27.4], [8.8, 27.4]];
  const zuForm = ([x, y]) => [(x - CX) * S, -(y - CY) * S];
  const k = new THREE.Shape();
  P.map(zuForm).forEach(([x, y], i) => (i ? k.lineTo(x, y) : k.moveTo(x, y)));
  k.closePath();

  const punkt = new THREE.Shape();
  const [px, py] = zuForm([23, 3.7]), w = 5.4 * S, rr = 1.7 * S;   // py ist die Oberkante
  punkt.moveTo(px + rr, py);
  punkt.lineTo(px + w - rr, py); punkt.quadraticCurveTo(px + w, py, px + w, py - rr);
  punkt.lineTo(px + w, py - w + rr); punkt.quadraticCurveTo(px + w, py - w, px + w - rr, py - w);
  punkt.lineTo(px + rr, py - w); punkt.quadraticCurveTo(px, py - w, px, py - w + rr);
  punkt.lineTo(px, py - rr); punkt.quadraticCurveTo(px, py, px + rr, py);

  const extr = (form) => {
    const geo = new THREE.ExtrudeGeometry(form, {
      depth: TIEFE, bevelEnabled: true, bevelThickness: FASE, bevelSize: 0.6, bevelSegments: 3, curveSegments: 10,
    });
    geo.rotateX(-Math.PI / 2); geo.translate(0, FASE, 0);
    return geo;
  };
  const traeger = new THREE.Group();            // dreht sich am Ende um die Mitte
  const objekt = new THREE.Group();
  const kMesh = new THREE.Mesh(extr(k), druckStoff(u, F.creme, { rau: 0.5 }));
  const pMesh = new THREE.Mesh(extr(punkt), druckStoff(u, F.amber, { rau: 0.5 }));
  objekt.add(kMesh, pMesh);
  const flaeche = (form) => { const g = new THREE.ShapeGeometry(form, 10); g.rotateX(-Math.PI / 2); return g; };
  const dK = deckel(flaeche(k), u, F.creme), dP = deckel(flaeche(punkt), u, F.amber);
  objekt.add(dK, dP);
  objekt.position.y = -H / 2;
  traeger.add(objekt); traeger.position.y = H / 2;

  // Pfad: Umriss des K, rüber zum Punkt, Umriss des Punkts, zurück
  const kp = P.map((q) => { const [x, y] = zuForm(q); return [x, -y]; });
  const dp = [[23, 3.7], [28.4, 3.7], [28.4, 9.1], [23, 9.1]].map((q) => { const [x, y] = zuForm(q); return [x, -y]; });
  const pfad = polygonPfad([...kp, kp[0], dp[3], ...dp, dp[3], kp[0]].filter((q, i, a) => i === 0 || q[0] !== a[i - 1][0] || q[1] !== a[i - 1][1]));
  const TEMPO = 72;
  const kipp = Math.PI / 2 - kamHoehe;
  return {
    objekt: traeger, H, radius: 34, mitte: 6, flach: true, parkY: 8,
    kamZiel: 6, kamWeit: 1,
    deckel(top) {
      for (const d of [dK, dP]) {
        d.visible = top > 0 && top < H - 0.05;
        d.position.y = top - 0.02; d.updateMatrix();
      }
    },
    kopf(t) { return pfad.bei(18 + TEMPO * t); },
    schluss(t) {
      const p = sanft((t - T_AB * 0.7) / 2.0);
      traeger.position.y = H / 2 + p * 24;
      traeger.rotation.x = p * kipp;
      this.kamZiel = 6 + p * 22; this.kamWeit = 1 + p * 0.32;
      const q = clamp01((t - T_AB * 0.7 - 2.0) / 5);
      traeger.rotation.y = Math.sin(q * Math.PI * 2) * 0.16 * (1 - q);
      return t > T_AB * 0.7 + 7.1;
    },
    anteilSchatten(t) { return 1 - 0.55 * sanft((t - T_AB * 0.7) / 2.0); },
  };
}

/* ---------- Bühne ---------- */
export function starte(box, variante = 'a', { debug = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  const canvas = renderer.domElement;
  canvas.className = 'k-ph__canvas';
  canvas.setAttribute('aria-hidden', 'true');
  box.appendChild(canvas);

  const szene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  szene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  szene.environmentIntensity = 0.32;

  szene.add(new THREE.HemisphereLight(0xfff2e0, 0x0b0d0e, 0.5));
  const key = new THREE.DirectionalLight(0xffe8c8, 2.4); key.position.set(-70, 130, 90); szene.add(key);
  const rand = new THREE.DirectionalLight(0xa9bccf, 1.6); rand.position.set(90, 70, -120); szene.add(rand);
  const duesenLicht = new THREE.PointLight(0xffa040, 0, 70, 2); szene.add(duesenLicht);

  const KAM_HOEHE = THREE.MathUtils.degToRad(variante === 'c' ? 34 : 20);
  const KAM_WINKEL = THREE.MathUtils.degToRad(variante === 'c' ? 18 : 26);

  // Teil
  const uTeil = uniformSatz({ uLH: { value: variante === 'b' ? 1.25 : 1.3 } });
  const teil = variante === 'b' ? stiftehalter(uTeil) : variante === 'c' ? monogramm(uTeil, KAM_HOEHE) : gluehbirne(uTeil);
  szene.add(teil.objekt);

  // Kopf
  const uKopf = uniformSatz({ uLH: { value: 0.9 } });
  const { g: kopf, luefter } = druckkopf(uKopf);
  szene.add(kopf);
  const glutPunkt = new THREE.Sprite(new THREE.SpriteMaterial({ map: glutTextur(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
  glutPunkt.scale.set(9, 9, 1); szene.add(glutPunkt);

  // Druckbett: dunkle Platte, die zum Rand in den Hintergrund übergeht
  const bettTex = leinwand(512, 512, (g, b) => {
    g.fillStyle = '#1d2024'; g.fillRect(0, 0, b, b);
    g.strokeStyle = 'rgba(255,255,255,.045)'; g.lineWidth = 1;
    for (let i = 0; i <= b; i += b / 24) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, b); g.moveTo(0, i); g.lineTo(b, i); g.stroke(); }
  });
  const bettAlpha = leinwand(256, 256, (g, b) => {
    const r = g.createRadialGradient(b / 2, b / 2, 0, b / 2, b / 2, b / 2);
    r.addColorStop(0, '#fff'); r.addColorStop(0.45, '#bbb'); r.addColorStop(1, '#000');
    g.fillStyle = r; g.fillRect(0, 0, b, b);
  });
  bettAlpha.colorSpace = THREE.NoColorSpace;
  const bett = new THREE.Mesh(new THREE.CircleGeometry(150, 64),
    new THREE.MeshStandardMaterial({ map: bettTex, alphaMap: bettAlpha, transparent: true, roughness: 0.78, metalness: 0.1, depthWrite: false }));
  bett.rotation.x = -Math.PI / 2; bett.position.y = -0.4; bett.renderOrder = -1; szene.add(bett);
  const schatten = new THREE.Mesh(new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: schattenTextur(), transparent: true, depthWrite: false, opacity: 0 }));
  schatten.rotation.x = -Math.PI / 2; schatten.position.y = -0.3;
  const sGroesse = teil.radius * (teil.flach ? 2.9 : 2.6);
  schatten.scale.set(sGroesse, sGroesse * (teil.flach ? 1.25 : 1), 1); szene.add(schatten);

  // Kamera
  const kamera = new THREE.PerspectiveCamera(24, 1, 5, 3000);
  const ziel = new THREE.Vector3(0, teil.mitte, 0);
  const PARK = new THREE.Vector3(teil.radius + (teil.flach ? 2 : 30), teil.parkY, 4);   // ganz im Bild, rechts neben dem Teil
  const AUS = new THREE.Vector3(teil.radius + 46, teil.H + 70, -24);    // am Ende aus dem Bild
  const abstand = () => {
    const a = kamera.aspect;
    const basis = variante === 'c' ? 205 : 238;
    return basis * Math.max(1, 1.45 / a);
  };
  // Zu Beginn weiter weg, damit der ganze Kopf mit Logo zu sehen ist; fährt dann ruhig heran
  const anfahrt = (zeit) => 1 - sanft(zeit / (T_AN + 1.8));
  const stelleKamera = (zeit) => {
    const pendel = Math.sin(zeit * 0.22) * 0.05;
    const d = abstand() * (teil.kamWeit || 1) * (1 + 0.32 * anfahrt(zeit));
    const h = KAM_HOEHE, w = KAM_WINKEL + pendel;
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

  const oben = new THREE.Vector3(), m4 = new THREE.Matrix4();
  const obenFuer = (u, obj) => {
    obj.updateWorldMatrix(true, false);
    m4.multiplyMatrices(kamera.matrixWorldInverse, obj.matrixWorld);
    oben.set(0, 1, 0).transformDirection(m4);
    u.uOben.value.copy(oben);
  };

  // Zustand zur Zeit z (Sekunden seit Start)
  let fertig = false;
  const kopfPos = new THREE.Vector3();
  const zeichne = (z) => {
    let top, heiss = 0;
    if (z < T_START) {
      const [sx, sz] = teil.kopf(0, 0.4);
      const p = weich(clamp01(z / T_AN));
      kopfPos.set(mix(PARK.x, sx, p), mix(PARK.y, 0.4, p), mix(PARK.z, sz, p));
      top = -1; heiss = clamp01((z - T_AN + 0.3) / 0.3);
    } else if (z < T_ENDE) {
      const t = z - T_START;
      top = Math.max(0.4, teil.H * (t / T_DRUCK));
      const [x, zz] = teil.kopf(t, top);
      kopfPos.set(x, top, zz);
      heiss = 1;
    } else {
      const t = z - T_ENDE;
      const [ex, ez] = teil.kopf(T_DRUCK, teil.H);
      const p = weich(clamp01(t / T_AB));
      kopfPos.set(mix(ex, AUS.x, p), mix(teil.H, AUS.y, p), mix(ez, AUS.z, p));
      top = 1e4;
      heiss = 1 - clamp01(t / 1.2);
      fertig = teil.schluss(t);
    }
    if (z >= T_ENDE) { /* Schluss läuft oben */ } else teil.schluss(-1);

    uTeil.uTop.value = top;
    if (teil.deckel) teil.deckel(top);
    uTeil.uHeiss.value = heiss;
    uTeil.uKopf.value.copy(kopfPos);
    kopf.position.copy(kopfPos);
    luefter.rotation.z = -z * 2.2;
    glutPunkt.position.set(kopfPos.x, kopfPos.y + 0.3, kopfPos.z);
    glutPunkt.material.opacity = heiss * (z < T_ENDE ? 0.9 : 0.6);
    duesenLicht.position.copy(kopfPos).add(new THREE.Vector3(0, 1.5, 0));
    duesenLicht.intensity = 900 * heiss;

    const fortschritt = clamp01(top / teil.H);
    schatten.material.opacity = 0.85 * Math.min(1, fortschritt * 1.4) * (teil.anteilSchatten ? teil.anteilSchatten(z - T_ENDE) : 1);

    // Kamera folgt dem Druck ein wenig nach oben
    const zielY = teil.flach ? teil.kamZiel : teil.mitte + (Math.min(Math.max(top, 0), teil.H) - teil.H / 2) * 0.18;
    ziel.y = zielY + 16 * anfahrt(z);
    stelleKamera(z);
    obenFuer(uTeil, teil.objekt);
    obenFuer(uKopf, kopf);
    renderer.render(szene, kamera);
  };

  // Eigene Uhr: läuft nur in gezeichneten Bildern
  let uhr = 0, zuletzt = 0, raf = 0, sichtbar = true, aktiv = false;
  const bild = (jetzt) => {
    uhr += zuletzt ? Math.min(jetzt - zuletzt, 50) / 1000 : 0;
    zuletzt = jetzt;
    zeichne(uhr);
    if (fertig && uhr > T_ENDE + 1) { aktiv = false; raf = 0; return; }
    raf = requestAnimationFrame(bild);
  };
  const weiter = () => { if (aktiv && sichtbar && !raf) { zuletzt = 0; raf = requestAnimationFrame(bild); } };
  const pause = () => { cancelAnimationFrame(raf); raf = 0; };
  const drucke = () => { pause(); uhr = 0; fertig = false; aktiv = true; zeichne(0); weiter(); };
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

  const steuerung = { drucke, halt, setze: (z) => { halt(); uhr = z; zeichne(z); }, dauer: T_ENDE + 8 };
  if (debug) window.__kDruck = steuerung;
  return steuerung;
}
