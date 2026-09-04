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

  /* ------------------------------------------------- rotatable bulb ------ */
  // The Kniff symbol: a 3D-printed "idea". A procedural fluted light bulb in
  // three.js the visitor drags / swipes / arrows to turn. It snaps to four
  // faces, each surfacing one line about Kniff (Angebot / Ablauf / Material /
  // Preis) that deep-links into the site. Idle = slow auto-spin. No WebGL or
  // reduced motion -> a flat list of the same four links.
  var HALF_PI = Math.PI / 2;
  function snapAngle(v) { return Math.round(v / HALF_PI) * HALF_PI; }

  function BulbHero() {
    var host = document.querySelector('[data-bulb]');
    if (!host) return;
    var faces = [].slice.call(host.querySelectorAll('.kf-bulb__face'));
    var canvas = host.querySelector('.kf-bulb__canvas');

    function showFace(i) {
      faces.forEach(function (f, k) { f.classList.toggle('is-on', k === i); });
    }

    var gl = null;
    try { gl = canvas && canvas.getContext('webgl2') || canvas && canvas.getContext('webgl'); } catch (e) {}
    if (reduce || !window.THREE || !gl) {
      host.classList.add('kf-bulb--flat');           // static: all four links listed
      return;
    }
    host.classList.add('kf-bulb--3d');

    var THREE = window.THREE;
    var renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    if (THREE.ACESFilmicToneMapping) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.06;
    if ('outputColorSpace' in renderer) renderer.outputColorSpace = THREE.SRGBColorSpace;
    var scene = new THREE.Scene();
    var camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
    camera.position.set(0, 0.05, 9.2);

    var group = new THREE.Group();
    group.rotation.x = 0.05;
    group.rotation.z = 0.14;        // leans slightly to the left, floating
    scene.add(group);

    // --- environment: a compact studio room baked to a PMREM cube. This is the
    //     same trick three.js' own RoomEnvironment uses — real soft-box
    //     reflections are what make glass read as glass and metal as metal
    //     instead of flat plastic. A painted gradient never gets there.
    var roomScene = new THREE.Scene();
    var roomBox = new THREE.BoxGeometry(1, 1, 1);
    function emitBox(w, h, d, x, y, z, color, intensity) {
      var m = new THREE.MeshStandardMaterial({
        color: 0x000000, roughness: 1, metalness: 0,
        emissive: new THREE.Color(color), emissiveIntensity: intensity,
        side: THREE.BackSide
      });
      var mesh = new THREE.Mesh(roomBox, m);
      mesh.scale.set(w, h, d); mesh.position.set(x, y, z);
      roomScene.add(mesh);
    }
    emitBox(26, 18, 26, 0, 4, 0, 0x1c222e, 1.0);        // room shell — dark blue-grey, always gives the glass a body
    emitBox(2.0, 3.0, 0.1, -4.2, 3.6, 8.0, 0xfff2e0, 16); // soft key window, front-left -> main glint
    emitBox(0.5, 5.0, 0.1, -3.0, 3.0, 7.4, 0xffffff, 13); // vertical strip -> edge streak, left
    emitBox(0.5, 5.0, 0.1, 3.4, 2.6, 7.0, 0xeef4ff, 9);  // vertical strip -> edge streak, right
    emitBox(1.1, 1.6, 0.1, 6.6, 1.4, 5.6, 0xccdaf4, 6);  // cool counter-glint, far right
    emitBox(11, 0.1, 11, 0, -4.6, 0, 0xcf8438, 0.4);    // warm floor bounce
    var pmrem = new THREE.PMREMGenerator(renderer);
    var envRT = pmrem.fromScene(roomScene, 0.035);
    scene.environment = envRT.texture;
    pmrem.dispose(); roomBox.dispose();

    // --- classic A19 glass envelope — one clean thin shell, double-sided so the
    //     rim reads without a second milky mesh.
    // round A-shape: near-spherical belly (widest ~1.33) tapering into a short
    // neck at the base — matches a classic clear incandescent bulb.
    var envPts = [
      [0.00, -1.30], [0.30, -1.30], [0.30, -1.10], [0.25, -0.90],
      [0.36, -0.62], [0.64, -0.30], [0.95, 0.06], [1.18, 0.42],
      [1.31, 0.76], [1.335, 1.04], [1.29, 1.34], [1.14, 1.60],
      [0.92, 1.82], [0.64, 2.00], [0.36, 2.12], [0.13, 2.18], [0.00, 2.19]
    ].map(function (p) { return new THREE.Vector2(p[0], p[1]); });
    // A thin, mostly see-through shell: no refraction (transmission would turn
    // the envelope into a lens that smears the hot filament across the back
    // wall — the milky-bulb bug). Fresnel rim + sharp env reflections carry the
    // "this is curved glass" read; low opacity keeps the filament crisp.
    var glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xe4ecf5, roughness: 0.045, metalness: 0,
      transmission: 0, ior: 1.6,
      transparent: true, opacity: 0.24, depthWrite: false,
      clearcoat: 1, clearcoatRoughness: 0.03,
      envMapIntensity: 2.5,
      side: THREE.DoubleSide
    });
    var envGeo = new THREE.LatheGeometry(envPts, 160);
    var envelope = new THREE.Mesh(envGeo, glassMat);
    envelope.renderOrder = 3; group.add(envelope);

    // --- filament assembly: glass stem, a splayed pair of support wires and
    //     a coiled tungsten filament strung between them.
    var wireMat = new THREE.MeshStandardMaterial({ color: 0xb8b6b0, metalness: 1, roughness: 0.3 });
    var stemGlass = new THREE.MeshPhysicalMaterial({
      color: 0xffffff, roughness: 0.12, transmission: 0.92, thickness: 0.2, ior: 1.5,
      clearcoat: 1, transparent: true, depthWrite: false
    });
    var stem = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.11, 1.15, 20), stemGlass);
    stem.position.y = -0.42; group.add(stem);
    var press = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.10, 0.05), stemGlass);
    press.position.y = 0.12; group.add(press);

    function wire(x1, y1, x2, y2) {
      var a = new THREE.Vector3(x1, y1, 0), b = new THREE.Vector3(x2, y2, 0);
      var len = a.distanceTo(b);
      var m = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, len, 8), wireMat);
      m.position.copy(a).lerp(b, 0.5);
      m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      group.add(m); return b;
    }
    wire(-0.05, 0.14, -0.42, 0.52);
    wire(0.05, 0.14, 0.42, 0.52);

    // coiled filament that also WEAVES in depth (shallow W) so it reads as a
    // filament head-on and side-on alike — not a candle flame at the 90° faces.
    var fPts = [], COILS = 18, FR = 0.045, SPAN = 0.82;
    for (var t = 0; t <= 1.0001; t += 1 / 240) {
      var a = t * Math.PI * 2 * COILS;
      var zc = Math.sin(t * Math.PI * 3) * 0.14;
      fPts.push(new THREE.Vector3((t - 0.5) * SPAN, 0.52 + Math.sin(a) * FR, zc + Math.cos(a) * FR));
    }
    // NOTE: keep the filament tone-mapped and only moderately bright. A very hot
    // (toneMapped:false, emissive > 3) filament smears through the transmissive
    // glass and turns the whole envelope milky — that was the "sieht schlecht
    // aus" bug. Moderate glow + a small additive sprite reads as "lit" without
    // flooding the glass.
    var filMat = new THREE.MeshStandardMaterial({
      color: 0xffd9a0, emissive: 0xff9d38, emissiveIntensity: 2.2,
      roughness: 0.5, metalness: 0.1
    });
    var filament = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(fPts), 300, 0.016, 8, false), filMat);
    filament.renderOrder = 2; group.add(filament);
    var glow = new THREE.PointLight(0xffb066, 1.6, 7, 2); glow.position.set(0, 0.52, 0); group.add(glow);
    // additive sprite so the hot filament blooms softly through the glass
    var gc = document.createElement('canvas'); gc.width = gc.height = 128;
    var gx = gc.getContext('2d');
    var gg = gx.createRadialGradient(64, 64, 0, 64, 64, 64);
    gg.addColorStop(0.00, 'rgba(255,224,170,0.95)');
    gg.addColorStop(0.28, 'rgba(255,180,95,0.30)');
    gg.addColorStop(0.70, 'rgba(255,165,85,0.05)');
    gg.addColorStop(1.00, 'rgba(255,160,80,0)');
    gx.fillStyle = gg; gx.fillRect(0, 0, 128, 128);
    var glowSprite = new THREE.Sprite(new THREE.SpriteMaterial({
      map: new THREE.CanvasTexture(gc), color: 0xffffff,
      transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, opacity: 0.28
    }));
    glowSprite.scale.set(0.8, 0.8, 1);
    glowSprite.position.set(0, 0.52, 0);
    glowSprite.renderOrder = 4; group.add(glowSprite);

    // --- dark Edison screw base ("Stumpf kann schwarz bleiben")
    var dark = new THREE.MeshStandardMaterial({ color: 0x201c17, metalness: 0.92, roughness: 0.3, envMapIntensity: 1.0 });
    var blackMat = new THREE.MeshStandardMaterial({ color: 0x0b0b0b, metalness: 0.35, roughness: 0.55 });
    var base = new THREE.Group();
    var shoulder = new THREE.Mesh(new THREE.CylinderGeometry(0.30, 0.30, 0.14, 40), dark);
    shoulder.position.y = -0.78; base.add(shoulder);
    var cap = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.24, 0.44, 40), dark);
    cap.position.y = -1.06; base.add(cap);
    for (var k = 0; k < 4; k++) {
      var ring = new THREE.Mesh(new THREE.TorusGeometry(0.262, 0.03, 10, 40), dark);
      ring.rotation.x = Math.PI / 2; ring.position.y = -0.94 - k * 0.10; base.add(ring);
    }
    var neck = new THREE.Mesh(new THREE.CylinderGeometry(0.235, 0.12, 0.20, 32), blackMat);
    neck.position.y = -1.36; base.add(neck);
    var tip = new THREE.Mesh(new THREE.SphereGeometry(0.10, 20, 16), blackMat);
    tip.position.y = -1.49; base.add(tip);
    group.add(base);

    // env map carries most of the light now — keep direct lights subtle
    scene.add(new THREE.HemisphereLight(0x2c2e35, 0x0a0806, 0.14));
    var key = new THREE.DirectionalLight(0xffffff, 1.0); key.position.set(-3.2, 4.0, 5.0); scene.add(key);
    var rim = new THREE.DirectionalLight(0xf2a63b, 0.7); rim.position.set(3.6, -0.6, -1.6); scene.add(rim);

    function resize() {
      var w = canvas.clientWidth || host.clientWidth || 1;
      var h = canvas.clientHeight || host.clientHeight || 1;
      renderer.setSize(w, h, false);
      camera.aspect = w / h; camera.updateProjectionMatrix();
    }
    resize();
    addEventListener('resize', resize, { passive: true });

    // --- state
    var rot = 0, vel = 0, target = null, auto = true, curFace = 0, running = false;
    var dragging = false, lastX = 0, lastT = 0, idleTimer = 0;
    // idle = a slow carousel: rest square-on to a face (looks like a real bulb),
    // ease 90° to the next, rest again. Never lingers at the 45° side angle
    // where the envelope reads thin.
    var autoStep = 0, autoDwellUntil = 0, autoInit = false;
    showFace(0);

    function wake() {
      auto = false; clearTimeout(idleTimer);
      idleTimer = setTimeout(function () { auto = true; autoInit = false; }, 4500);
    }

    host.addEventListener('pointerdown', function (e) {
      dragging = true; lastX = e.clientX; lastT = performance.now(); vel = 0; target = null; wake();
      if (host.setPointerCapture) { try { host.setPointerCapture(e.pointerId); } catch (x) {} }
    });
    host.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      var now = performance.now(), dx = e.clientX - lastX, dt = Math.max(now - lastT, 8);
      rot += dx * 0.011;
      vel = (dx * 0.011) / dt * 16;
      lastX = e.clientX; lastT = now;
    });
    function endDrag(e) {
      if (!dragging) return;
      dragging = false;
      target = snapAngle(rot + vel * 9);
      vel = 0;
      if (host.releasePointerCapture && e && e.pointerId != null) { try { host.releasePointerCapture(e.pointerId); } catch (x) {} }
    }
    host.addEventListener('pointerup', endDrag);
    host.addEventListener('pointercancel', endDrag);
    host.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') { e.preventDefault(); wake(); target = snapAngle(rot - HALF_PI); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { e.preventDefault(); wake(); target = snapAngle(rot + HALF_PI); }
      else if (e.key === 'Enter' || e.key === ' ') {
        var on = faces[curFace]; if (on) { e.preventDefault(); location.href = on.getAttribute('href'); }
      }
    });

    var clock = 0;
    function tick(now) {
      if (!running) return;
      clock = (now || 0) / 1000;
      if (auto && !dragging) {
        if (!autoInit) { autoStep = snapAngle(rot); autoDwellUntil = (now || 0) + 2400; autoInit = true; }
        var ad = autoStep - rot;
        if (Math.abs(ad) > 0.004) {
          rot += ad * 0.045;                         // ~1s glide to the next face
        } else {
          rot = autoStep;
          if ((now || 0) >= autoDwellUntil) {        // rested long enough -> step on
            autoStep -= HALF_PI;
            autoDwellUntil = (now || 0) + 3400;      // ~1s glide + ~2.4s rest
          }
        }
      }
      else if (target !== null) {
        rot += (target - rot) * 0.14;
        if (Math.abs(target - rot) < 0.002) { rot = target; target = null; }
      } else if (!dragging) {
        rot += vel; vel *= 0.9;
        if (Math.abs(vel) < 0.0008) { vel = 0; target = snapAngle(rot); }
      }
      group.rotation.y = rot;
      group.rotation.x = 0.08 + Math.sin(clock * 0.6) * 0.02;
      group.rotation.z = 0.14 + Math.sin(clock * 0.5) * 0.02;   // keeps the left lean, gently breathing
      group.position.y = Math.sin(clock * 0.8) * 0.06;
      group.position.x = Math.sin(clock * 0.42) * 0.05;          // slow drift -> floating

      // swap the caption only when the bulb is settled on a face or drifting
      // slowly (auto-spin) — never mid-drag / mid-snap, so it doesn't flicker
      // through all four while you throw it.
      if (!dragging && target === null) {
        var f = ((Math.round(rot / HALF_PI) % 4) + 4) % 4;
        if (f !== curFace) { curFace = f; showFace(f); }
      }

      renderer.render(scene, camera);
      requestAnimationFrame(tick);
    }
    function setRunning(on) {
      if (on === running) return;
      running = on;
      if (on) requestAnimationFrame(tick);
    }
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (es) {
        es.forEach(function (en) { setRunning(en.isIntersecting && !document.hidden); });
      }, { threshold: 0.05 }).observe(host);
    } else { setRunning(true); }
    document.addEventListener('visibilitychange', function () { setRunning(running && !document.hidden || (!document.hidden && isOnScreen(host))); });

    function isOnScreen(el) {
      var r = el.getBoundingClientRect();
      return r.bottom > 0 && r.top < (innerHeight || 800);
    }
    // canvas may have zero size until the pinned stage lays out — re-measure
    setTimeout(resize, 200); setTimeout(resize, 800);
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
