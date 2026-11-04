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
