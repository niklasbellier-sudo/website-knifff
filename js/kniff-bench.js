/* ============================================================================
   kniff-bench.js — the Workbench signature layer.

   Not the engine. scrollcraft.js stays untouched; this is the bespoke JS the
   grammar is built on: one steered key light that every lit thing on the page
   reads, a small hand-rolled WebGL hero object you can turn and pull apart, a
   set of CSS-3D rail objects that turn to face the same light, the boot
   assembly, and the instrument HUD.

   Zero dependencies. ~1 canvas. Degrades to the poster if WebGL is missing and
   to a static object under reduced motion.
   ========================================================================== */
(function () {
  'use strict';

  var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
  var root = document.documentElement;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ------------------------------------------------------ steered light --- */
  // Desktop: the pointer moves the key light. Touch: scroll velocity swings it,
  // so the page still feels driven by the hand. Published on :root as
  // --kf-lx/--kf-ly (0..1) and --kf-vel (0..1), all lerped.
  var Light = {
    tx: 0.30, ty: 0.22, x: 0.30, y: 0.22, vel: 0, tvel: 0,
    lastScroll: 0, lastT: 0,
    init: function () {
      var self = this;
      if (fine) {
        addEventListener('pointermove', function (e) {
          if (e.pointerType && e.pointerType !== 'mouse') return;
          self.tx = clamp(e.clientX / innerWidth, 0, 1);
          self.ty = clamp(e.clientY / innerHeight, 0, 1);
        }, { passive: true });
      }
      addEventListener('scroll', function () {
        var y = scrollY, now = performance.now();
        var dt = Math.max(now - self.lastT, 16);
        var v = Math.abs(y - self.lastScroll) / dt;      // px per ms
        self.tvel = clamp(v / 3.5, 0, 1);
        if (!fine) {
          // swing the light with travel direction + speed
          var dir = y >= self.lastScroll ? 1 : -1;
          self.tx = clamp(0.5 + dir * (0.18 + self.tvel * 0.22), 0, 1);
          self.ty = clamp(0.30 - self.tvel * 0.14, 0, 1);
        }
        self.lastScroll = y; self.lastT = now;
      }, { passive: true });
    },
    tick: function () {
      this.x = lerp(this.x, this.tx, 0.08);
      this.y = lerp(this.y, this.ty, 0.08);
      this.tvel *= 0.92;
      this.vel = lerp(this.vel, this.tvel, 0.2);
      root.style.setProperty('--kf-lx', this.x.toFixed(4));
      root.style.setProperty('--kf-ly', this.y.toFixed(4));
      root.style.setProperty('--kf-vel', this.vel.toFixed(4));
    },
    // light direction in view space from the published position
    dir: function () {
      var ax = (this.x - 0.5) * 2.2;          // -1.1 .. 1.1
      var ay = (0.5 - this.y) * 1.6 + 0.35;   // keep it above
      var z = 0.9;
      var l = Math.hypot(ax, ay, z) || 1;
      return [ax / l, ay / l, z / l];
    }
  };


  /* -------------------------------------------------------- rail cubes --- */
  // CSS-3D. Each .kf-obj__cube turns toward the steered light with its own
  // phase; each face is shaded by its normal against the light.
  function RailCubes() {
    var mounts = [].slice.call(document.querySelectorAll('.kf-obj__cube'));
    if (!mounts.length) return null;
    // face rotation + outward axis + normal
    var FN = [
      { t: 'rotateY(0deg)',    n: [0, 0, 1] },
      { t: 'rotateY(180deg)',  n: [0, 0, -1] },
      { t: 'rotateY(90deg)',   n: [1, 0, 0] },
      { t: 'rotateY(-90deg)',  n: [-1, 0, 0] },
      { t: 'rotateX(90deg)',   n: [0, 1, 0] },
      { t: 'rotateX(-90deg)',  n: [0, -1, 0] }
    ];
    var cubes = mounts.map(function (mount, idx) {
      mount.innerHTML = '';
      var faces = FN.map(function (f) {
        var el = document.createElement('span');
        el.className = 'kf-obj__face';
        el._t = f.t;
        mount.appendChild(el);
        return { el: el, n: f.n };
      });
      // squat box, not a cube: printed parts read wider than tall
      return { mount: mount, faces: faces, phase: idx * 1.7, yaw: 0, pitch: -0.34, hy: 0.62 };
    });
    function place() {
      cubes.forEach(function (c) {
        var s = c.mount.offsetWidth || 130;
        var z = s / 2, zy = (s * c.hy) / 2;
        c.faces.forEach(function (f, i) {
          var top = (i === 4 || i === 5);
          f.el.style.height = top ? (c.hy * 100) + '%' : '100%';
          f.el.style.transform = f.el._t + ' translateZ(' + (top ? zy : z) + 'px)';
        });
        c.mount.style.height = (c.hy * 100) + '%';
      });
    }
    place();
    // rail acts are not laid out at construction; re-place once the width is real
    requestAnimationFrame(place);
    setTimeout(place, 400);
    addEventListener('resize', place, { passive: true });
    var placedW = 0;
    return {
      frame: function (dt, tSec) {
        // rail width only becomes real once the pan act lays out; re-place then
        var w0 = cubes[0].mount.offsetWidth;
        if (w0 && w0 !== placedW) { placedW = w0; place(); }
        var lx = (parseFloat(getComputedStyle(root).getPropertyValue('--kf-lx')) || 0.3);
        var ly = (parseFloat(getComputedStyle(root).getPropertyValue('--kf-ly')) || 0.22);
        var L = [ (lx - 0.5) * 2, (0.5 - ly) * 2, 1.1 ];
        var ll = Math.hypot(L[0], L[1], L[2]) || 1; L = [L[0]/ll, L[1]/ll, L[2]/ll];
        cubes.forEach(function (c) {
          c.yaw = (lx - 0.5) * 1.1 + Math.sin(tSec * 0.22 + c.phase) * 0.28;
          var cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
          c.mount.style.transform =
            'rotateX(' + (c.pitch * 57.3) + 'deg) rotateY(' + (c.yaw * 57.3) + 'deg)';
          c.faces.forEach(function (f) {
            var nx = f.n[0] * cy + f.n[2] * sy;
            var nz = -f.n[0] * sy + f.n[2] * cy;
            var d = Math.max(nx * L[0] + f.n[1] * L[1] + nz * L[2], 0);
            f.el.style.filter = 'brightness(' + (0.28 + 1.05 * d).toFixed(3) + ')';
          });
        });
      }
    };
  }

  /* --------------------------------------------------------------- HUD --- */
  function HUD() {
    var name = document.querySelector('.kf-hud__name');
    var spec = document.querySelector('.kf-hud__spec');
    if (!name || !spec) return null;
    var acts = [].slice.call(document.querySelectorAll('[data-kf-obj]'));
    if (!acts.length) return null;
    var cur = -1;
    function set(i) {
      if (i === cur || !acts[i]) return;
      cur = i;
      name.textContent = acts[i].getAttribute('data-kf-obj') || '';
      spec.innerHTML = acts[i].getAttribute('data-kf-spec') || '';
    }
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (e.isIntersecting) set(acts.indexOf(e.target));
      });
    }, { threshold: 0.35 });
    acts.forEach(function (a) { io.observe(a); });
    name.addEventListener('click', function () {
      var nxt = acts[(cur + 1) % acts.length];
      if (nxt) nxt.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
    });
    set(0);

    // the close act carries its own footer; get the HUD out of its way
    var hud = document.querySelector('.kf-hud');
    var close = document.getElementById('dein-zug');
    if (hud && close && 'IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (e) { hud.classList.toggle('kf-hud--hidden', e.isIntersecting); });
      }, { threshold: 0.2 }).observe(close);
    }
    return {};
  }

  /* -------------------------------------------------------------- boot --- */
  function boot(hero) {
    var bar = document.querySelector('.kf-boot__bar');
    var pct = document.querySelector('.kf-boot__pct');
    var imgs = [].slice.call(document.images).filter(function (i) { return !i.complete; });
    var total = imgs.length + 2, done = 0;
    function bump() {
      done++;
      var p = Math.min(done / total, 1);
      if (bar) bar.style.width = (p * 100).toFixed(0) + '%';
      if (pct) pct.textContent = (p * 100).toFixed(0).padStart(3, '0');
      if (hero) hero.setBoot(Math.min(p * 1.15, 1));
    }
    imgs.forEach(function (i) {
      i.addEventListener('load', bump, { once: true });
      i.addEventListener('error', bump, { once: true });
    });
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(bump);
    if (document.readyState === 'complete') bump();
    else addEventListener('load', bump, { once: true });
    // never hang on a stalled asset
    var give = setTimeout(function () { while (done < total) bump(); }, 4200);
    var iv = setInterval(function () {
      if (done >= total) {
        clearInterval(iv); clearTimeout(give);
        if (hero) hero.setBoot(1);
        setTimeout(function () {
          root.classList.remove('kf-booting');
          root.classList.add('kf-booted');
        }, 260);
      }
    }, 120);
  }


  /* ---------------------------------------------------------- reviews ---- */
  // A few visible slots that cross-fade through the review pool, one slot at a
  // time, staggered. Pauses on hover, off-screen and hidden tab; static under
  // reduced motion.
  function Reviews() {
    var host = document.getElementById('kf-reviews');
    var data = document.getElementById('kf-reviews-data');
    if (!host || !data) return;
    var pool;
    try { pool = JSON.parse(data.textContent); } catch (e) { return; }
    if (!pool.length) return;
    // shuffle once so the first shown reviews vary between visits (all rotate
    // through anyway) — no visitor sees "only the same three"
    for (var si = pool.length - 1; si > 0; si--) {
      var sj = Math.floor(Math.random() * (si + 1));
      var st = pool[si]; pool[si] = pool[sj]; pool[sj] = st;
    }

    var STAR = '<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 1.6l2.47 5 5.53.8-4 3.9.94 5.5L10 15.2 5.06 16.8 6 11.3l-4-3.9 5.53-.8z"/></svg>';
    function stars(n) {
      var s = ''; for (var i = 0; i < n; i++) s += STAR;
      return '<span class="kf-stars" role="img" aria-label="' + n + ' von 5 Sternen">' + s + '</span>';
    }
    function fill(fig, r) {
      fig.innerHTML = stars(r.rating || 5) +
        '<blockquote></blockquote><figcaption></figcaption>';
      fig.querySelector('blockquote').textContent = r.text;
      fig.querySelector('figcaption').textContent = r.name;
    }

    function slotCount() {
      return matchMedia('(min-width: 1180px)').matches ? Math.min(4, pool.length)
           : matchMedia('(min-width: 1000px)').matches ? Math.min(3, pool.length)
           : matchMedia('(min-width: 620px)').matches ? Math.min(2, pool.length) : 1;
    }
    var figs = [], idx = [], n = 0;
    function build() {
      host.innerHTML = ''; figs = []; idx = [];
      n = slotCount();
      for (var i = 0; i < n; i++) {
        var f = document.createElement('figure');
        f.className = 'kf-review';
        fill(f, pool[i % pool.length]);
        host.appendChild(f);
        figs.push(f); idx.push(i % pool.length);
      }
    }
    build();
    addEventListener('resize', function () {
      if (slotCount() !== n) build();
    }, { passive: true });

    if (reduce) return;                       // no rotation under reduced motion

    var turn = 0, hover = false;
    host.addEventListener('mouseenter', function () { hover = true; });
    host.addEventListener('mouseleave', function () { hover = false; });
    function visible() {
      var r = host.getBoundingClientRect();
      return r.bottom > 0 && r.top < (innerHeight || 800);
    }

    setInterval(function () {
      if (document.hidden || hover || !visible() || pool.length < 2) return;
      var slot = turn % figs.length; turn++;
      // step to the next review not currently shown in another slot
      var next = idx[slot], step = Math.max(figs.length, 1);
      for (var guard = 0; guard < pool.length; guard++) {
        next = (next + step) % pool.length;
        if (figs.length === 1 || idx.indexOf(next) === -1) break;
      }
      idx[slot] = next;
      var f = figs[slot];
      f.classList.add('is-swap');
      setTimeout(function () {
        fill(f, pool[next]);
        requestAnimationFrame(function () { f.classList.remove('is-swap'); });
      }, 420);
    }, Math.max(4200 / Math.max(slotCount(), 1), 1600));
  }

  /* ---------------------------------------------------------------- nav --- */
  // Header menu: marks the current page, and drives the mobile drawer toggle.
  function Nav() {
    var head = document.querySelector('.kf-head');
    var nav = document.getElementById('kf-nav');
    if (!head || !nav) return;
    var links = [].slice.call(nav.querySelectorAll('a'));

    var here = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
    if (!here) here = 'index.html';
    links.forEach(function (a) {
      if (a.classList.contains('kf-head__cta')) return;
      var href = (a.getAttribute('href') || '').split('#')[0].split('/').pop().toLowerCase();
      if (href === here) a.setAttribute('aria-current', 'page');
    });

    var burger = head.querySelector('.kf-head__burger');
    if (!burger) return;
    var root = document.documentElement;
    function setOpen(open) {
      head.classList.toggle('is-open', open);
      root.classList.toggle('kf-nav-open', open);   // locks page scroll (CSS)
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    }
    function close() { setOpen(false); }
    burger.addEventListener('click', function () {
      setOpen(!head.classList.contains('is-open'));
    });
    links.forEach(function (a) { a.addEventListener('click', close); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
    // tap anywhere off the header (the dimmed page) closes the menu
    document.addEventListener('click', function (e) {
      if (head.classList.contains('is-open') && !e.target.closest('.kf-head')) close();
    });
    var wide = matchMedia('(min-width: 901px)');
    var onWide = function (e) { if (e.matches) close(); };
    if (wide.addEventListener) wide.addEventListener('change', onWide);
    else if (wide.addListener) wide.addListener(onWide);
  }

  /* -------------------------------------------------------- mobile span --- */
  // Pinned/pan acts own several viewport-heights of scroll each; on a phone
  // that stacks into a very long, heavy page. Shorten the spans before the
  // engine reads them so the whole story stays swipe-able.
  function tuneSpans() {
    if (!matchMedia('(max-width: 768px)').matches) return;
    [].forEach.call(document.querySelectorAll('[data-sc-act][data-sc-span]'), function (el) {
      var s = parseFloat(el.getAttribute('data-sc-span')) || 0;
      if (!s) return;
      var floor = el.getAttribute('data-sc-act') === 'pan' ? 1.8 : 1.15;
      var next = Math.max(floor, Math.round(s * 0.6 * 100) / 100);
      if (next < s) el.setAttribute('data-sc-span', String(next));
    });
  }
  /* ---------------------------------------------------- hero bulb -------- */
  // The Kniff symbol: a photoreal clear-glass "idea" bulb (a still render with a
  // slow float + specular sheen in CSS). Four captions cycle beneath it —
  // Angebot, Ablauf, Material, Preis — each a deep link into the site. Reduced
  // motion -> the still plus the four lines as a plain stacked list, no cycling.
  function BulbHero() {
    var host = document.querySelector('[data-bulb]');
    if (!host) return;
    var faces = [].slice.call(host.querySelectorAll('.kf-bulb__face'));
    var n = faces.length || 1;
    var cur = 0;

    function showFace(i) {
      faces.forEach(function (f, k) { f.classList.toggle('is-on', k === i); });
    }
    showFace(0);

    if (reduce) {
      host.classList.add('kf-bulb--flat');            // still + stacked list
      return;
    }

    var timer = 0, running = false;
    function step() { cur = (cur + 1) % n; showFace(cur); }
    function setRunning(on) {
      if (on === running) return;
      running = on;
      if (on) { timer = setInterval(step, 4200); }
      else { clearInterval(timer); }
    }

    function isOnScreen(el) {
      var r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < (innerHeight || 800);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { setRunning(en.isIntersecting && !document.hidden); });
      }, { threshold: 0.05 }).observe(host);
    } else {
      setRunning(true);
    }
    document.addEventListener('visibilitychange', function () {
      setRunning(!document.hidden && isOnScreen(host));
    });
  }


  /* ----------------------------------------------- contact prefill ------ */
  // A "Jetzt anfragen" button on the shop carries ?produkt=<name>. Pull it into
  // the contact form: a visible context line, a hidden subject for the Netlify
  // notification, and a head start in the message box. Kills the "which product
  // was that again?" round-trip.
  function ContactPrefill() {
    var form = document.querySelector('form[name="kontakt"]');
    if (!form) return;
    var raw = new URLSearchParams(location.search).get('produkt');
    if (!raw) return;
    var name = raw.replace(/[\r\n\t]+/g, ' ').trim().slice(0, 90);
    if (!name) return;

    var subject = form.querySelector('input[name="betreff"]');
    if (subject) subject.value = 'Produktanfrage: ' + name;

    var msg = form.querySelector('textarea[name="nachricht"]');
    if (msg && !msg.value) {
      msg.value = 'Ich interessiere mich für: ' + name + '\n\nMenge: 1\n\n';
    }

    var note = document.createElement('p');
    note.className = 'kf-form__ctx';
    note.textContent = 'Deine Anfrage bezieht sich auf: ' + name;
    form.insertBefore(note, form.querySelector('.kf-field'));

    // arriving from a product means the form is the point of the visit — bring it
    // into view (past the pinned hero) and put the cursor in the first field
    var nameField = form.querySelector('#k-name');
    setTimeout(function () {
      try { form.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { form.scrollIntoView(); }
      if (nameField) nameField.focus({ preventScroll: true });
    }, 400);
  }

  /* --------------------------------------------------------------- go ---- */
  function start() {
    Nav();
    tuneSpans();
    Light.init();
    BulbHero();
    ContactPrefill();
    Reviews();
    var rail = RailCubes();
    HUD();

    var last = performance.now();
    (function loop(now) {
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      Light.tick();
      if (rail) rail.frame(dt, now / 1000);
      requestAnimationFrame(loop);
    })(last);

    boot();

    // mount the engine once markup + fonts are settled
    function mount() {
      if (window.ScrollCraft && !window.__kfMounted) {
        window.__kfMounted = true;
        window.ScrollCraft.mount(document.body);
      }
    }
    if (document.readyState === 'complete') mount();
    else addEventListener('load', mount);
  }

  if (document.readyState === 'loading') addEventListener('DOMContentLoaded', start);
  else start();
})();
