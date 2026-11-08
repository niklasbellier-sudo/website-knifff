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

/* Startbild der Ideen-Welt am Handy: der Kniff-Druckkopf druckt in 3D das
   Kniff-K (js/kniff-druck3d.js, Three.js). Geladen wird nur am Handy und nur mit
   WebGL 2. Ohne JavaScript, ohne WebGL und bei "Bewegung reduzieren" bleibt das Standbild. */
(() => {
  const box = document.querySelector('[data-k-print]');
  if (!box) return;
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('WebGL2RenderingContext' in window)) return;
  const handy = matchMedia('(max-width: 820px)');
  let geladen = false;
  const lade = () => {
    if (geladen || !handy.matches) return;
    geladen = true;
    box.classList.add('k-ph--laedt');      // Standbild ausblenden, bis der Druck startet
    import('/js/kniff-druck3d.js?v=4')
      .then((m) => m.starte(box, { debug: /[?&]druckdebug\b/.test(location.search) }))
      .catch(() => box.classList.remove('k-ph--laedt'));
  };
  lade();
  if (handy.addEventListener) handy.addEventListener('change', lade);
})();
