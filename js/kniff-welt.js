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

/* Startbild der Ideen-Welt am Handy: ein Video, in dem der Kniff-Druckkopf das
   Kniff-K druckt (assets/druck-k.mp4). Es läuft einmal, sobald die Ladeanzeige
   weg und das Bild sichtbar ist, und noch einmal bei jedem Wechsel zurück in die
   Ideen-Welt. Bei "Bewegung reduzieren" bleibt das Standbild. */
(() => {
  const video = document.querySelector('[data-k-print] .k-ph__video');
  if (!video || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const handy = matchMedia('(max-width: 820px)');
  const home = document.querySelector('.k-home');
  const html = document.documentElement;
  const spiele = () => {
    if (!handy.matches || (home && home.dataset.welt !== 'idee')) return;
    video.currentTime = 0;
    video.play().catch(() => {});
  };
  const bereit = () => new Promise((ok) => {            // erst nach der Ladeanzeige
    if (!html.classList.contains('k-booting')) return ok();
    new MutationObserver((_, mo) => { if (!html.classList.contains('k-booting')) { mo.disconnect(); ok(); } })
      .observe(html, { attributes: true, attributeFilter: ['class'] });
  });
  let gesehen = false;
  bereit().then(() => {
    new IntersectionObserver((e) => {
      if (e.some((x) => x.isIntersecting) && !gesehen) { gesehen = true; spiele(); }
    }).observe(video);
  });
  if (home) {
    new MutationObserver(() => { if (home.dataset.welt === 'idee') spiele(); else video.pause(); })
      .observe(home, { attributes: true, attributeFilter: ['data-welt'] });
  }
})();

/* Ladeanzeige der Startseite: Balken und Prozent folgen den Bildern, die gerade
   wirklich geladen werden, plus Schriften und dem Laden der Seite. Mindestens
   kurz sichtbar, nie länger als 4,2 s; ohne JavaScript nimmt sie der Failsafe weg. */
(() => {
  const html = document.documentElement, boot = document.querySelector('.k-boot');
  if (!boot || !html.classList.contains('k-booting')) return;
  const bar = boot.querySelector('.k-boot__bar'), pct = boot.querySelector('.k-boot__pct');
  const bilder = [...document.images].filter((i) => !i.complete && i.loading !== 'lazy' && !boot.contains(i));
  const gesamt = bilder.length + 2, start = performance.now();
  let fertig = 0;
  const zeige = () => {
    const p = Math.min(fertig / gesamt, 1);
    bar.style.width = (p * 100).toFixed(0) + '%';
    pct.textContent = (p * 100).toFixed(0).padStart(3, '0');
  };
  const weiter = () => { fertig++; zeige(); };
  bilder.forEach((i) => { i.addEventListener('load', weiter, { once: true }); i.addEventListener('error', weiter, { once: true }); });
  (document.fonts ? document.fonts.ready : Promise.resolve()).then(weiter);
  if (document.readyState === 'complete') weiter(); else addEventListener('load', weiter, { once: true });
  const notaus = setTimeout(() => { while (fertig < gesamt) weiter(); }, 4200);
  const takt = setInterval(() => {
    if (fertig < gesamt || performance.now() - start < 700) return;
    clearInterval(takt); clearTimeout(notaus);
    setTimeout(() => { html.classList.remove('k-booting'); html.classList.add('k-booted'); setTimeout(() => boot.remove(), 900); }, 220);
  }, 120);
})();
