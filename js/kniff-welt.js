/* Umschalter der Startseite am Handy. Ohne Abhängigkeiten, am Ende von <body> einbinden. */
(() => {
  const home = document.querySelector('.k-home');
  if (!home) return;

  const setze = (welt) => {
    home.dataset.welt = welt;
    home.classList.toggle('k-dark', welt === 'idee');
    home.classList.toggle('k-light', welt === 'shop');
    home.querySelectorAll('.k-switch [data-zu]').forEach((knopf) => {
      knopf.setAttribute('aria-pressed', String(knopf.dataset.zu === welt));
    });
  };

  home.addEventListener('click', (ereignis) => {
    const knopf = ereignis.target.closest('[data-zu]');
    if (!knopf) return;
    const welt = knopf.dataset.zu;
    setze(welt);
    history.replaceState(null, '', welt === 'shop' ? '#shop' : location.pathname + location.search);
    if (knopf.closest('.k-wechsel')) {
      const ruhig = matchMedia('(prefers-reduced-motion: reduce)').matches;
      scrollTo({ top: 0, behavior: ruhig ? 'auto' : 'smooth' });
    }
  });

  if (location.hash === '#shop') setze('shop');
})();

/* Startbild der Ideen-Welt am Handy: der Druckkopf druckt die Skizze Schicht für
   Schicht. Ohne JavaScript und bei "Bewegung reduzieren" steht das fertige Teil
   da. Gedruckt wird, sobald das Bild sichtbar wird, und erneut bei jedem Wechsel
   zurück in die Ideen-Welt. Koordinaten wie im SVG (viewBox 0 -44 300 318). */
(() => {
  const box = document.querySelector('[data-k-print]');
  if (!box || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const fest = box.querySelector('.k-ph__fest');
  const neu = box.querySelector('.k-ph__neu');
  const kopf = box.querySelector('.k-ph__kopf');
  const glut = box.querySelector('.k-ph__glut');
  const home = document.querySelector('.k-home');

  const PARK = [232, 124];                 // Düse in Ruhe, rechts über dem Teil
  const BODEN = 268, OBEN = 48, H = 4;     // Druckbett, Oberkante, Schichthöhe
  const TEMPO = 1100, LEER = 1700;         // Einheiten/s drucken bzw. leer fahren
  const MIN = 0.1, ZURUECK = 0.6;          // Sekunden

  // Fahrplan: jede Schicht von unten nach oben, abwechselnd hin und zurück,
  // davor eine Leerfahrt, wenn die Düse nicht schon am Startpunkt steht.
  const plan = [];
  let t = 0, x = PARK[0], y = PARK[1];
  for (let s = BODEN - H, i = 0; s >= OBEN; s -= H, i++) {
    const von = 28, bis = s >= 200 ? 272 : 92;
    const rechts = i % 2 === 0;
    const x0 = rechts ? von : bis, x1 = rechts ? bis : von;
    const leer = Math.hypot(x0 - x, s - y) / LEER;
    if (leer > 0.001) { plan.push({ art: 'leer', t, d: leer, a: [x, y], b: [x0, s] }); t += leer; }
    const d = Math.max(MIN, (bis - von) / TEMPO);
    plan.push({ art: 'druck', t, d, y: s, von, bis, rechts });
    t += d; x = x1; y = s;
  }
  plan.push({ art: 'leer', t, d: ZURUECK, a: [x, y], b: PARK, ende: true });
  const GESAMT = t + ZURUECK;

  const weich = (p) => p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2;
  const kopfNach = (kx, ky, an) => {
    kopf.setAttribute('transform', `translate(${kx.toFixed(1)} ${ky.toFixed(1)})`);
    glut.setAttribute('opacity', an ? '1' : '0');
  };
  const gedruckt = (bisY) => {             // alles unterhalb von bisY ist fertig
    fest.setAttribute('y', bisY);
    fest.setAttribute('height', BODEN - bisY);
  };
  const leerZustand = () => { gedruckt(BODEN); neu.setAttribute('width', 0); kopfNach(PARK[0], PARK[1], false); };
  const fertigZustand = () => { gedruckt(OBEN); neu.setAttribute('width', 0); kopfNach(PARK[0], PARK[1], false); };

  // Eigene Uhr statt Wanduhr: Sie läuft nur in Bildern, die der Browser auch
  // zeichnet. In einem Hintergrund-Tab pausiert der Druck also und geht beim
  // Hinschauen dort weiter, statt schon fertig zu sein.
  let uhr = 0, zuletzt = 0, laeuft = 0;
  const bild = (jetzt) => {
    uhr += zuletzt ? Math.min(jetzt - zuletzt, 50) / 1000 : 0;
    zuletzt = jetzt;
    const z = uhr;
    if (z >= GESAMT) { fertigZustand(); laeuft = 0; return; }
    const s = plan.find((p) => z < p.t + p.d) || plan[plan.length - 1];
    const p = Math.min(1, Math.max(0, (z - s.t) / s.d));
    if (s.art === 'leer') {
      const q = weich(p);
      kopfNach(s.a[0] + (s.b[0] - s.a[0]) * q, s.a[1] + (s.b[1] - s.a[1]) * q, false);
      if (s.ende) { gedruckt(OBEN); neu.setAttribute('width', 0); }
    } else {
      const kx = s.rechts ? s.von + (s.bis - s.von) * p : s.bis - (s.bis - s.von) * p;
      gedruckt(s.y + H);
      neu.setAttribute('y', s.y);
      neu.setAttribute('x', s.rechts ? s.von : kx);
      neu.setAttribute('width', Math.abs(kx - (s.rechts ? s.von : s.bis)));
      kopfNach(kx, s.y, true);
    }
    laeuft = requestAnimationFrame(bild);
  };
  const drucke = () => {
    cancelAnimationFrame(laeuft);
    leerZustand();
    uhr = 0; zuletzt = 0;
    laeuft = requestAnimationFrame(bild);
  };
  const halt = () => { cancelAnimationFrame(laeuft); laeuft = 0; fertigZustand(); };

  // Startet die Seite am Handy in der Ideen-Welt, steht das Teil vor dem ersten
  // Bild schon leer da, damit es nicht fertig aufblitzt und dann verschwindet.
  const handy = matchMedia('(max-width: 820px)');
  if (handy.matches && home.dataset.welt === 'idee') leerZustand();

  let gesehen = false;
  if ('IntersectionObserver' in window) {
    new IntersectionObserver((eintraege) => {
      if (eintraege.some((e) => e.isIntersecting) && !gesehen) { gesehen = true; drucke(); }
    }).observe(box);
  } else {
    fertigZustand();
  }
  new MutationObserver(() => {
    if (!handy.matches) return;
    if (home.dataset.welt === 'idee') { gesehen = true; drucke(); } else halt();
  }).observe(home, { attributes: true, attributeFilter: ['data-welt'] });
})();
