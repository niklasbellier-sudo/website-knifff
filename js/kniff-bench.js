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

  /* ---------------------------------------------------------- mat4 math ---
     Column-major, the layout WebGL's uniformMatrix4fv(..., false, ...) wants.
     mMul(a, b) computes a * b so it reads left-to-right as parent * child. */
  function mIdent() { return [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1]; }
  function mMul(a, b) {
    var o = new Array(16);
    for (var c = 0; c < 4; c++) for (var r = 0; r < 4; r++) {
      o[c*4+r] = a[r]*b[c*4] + a[4+r]*b[c*4+1] + a[8+r]*b[c*4+2] + a[12+r]*b[c*4+3];
    }
    return o;
  }
  function mPersp(fov, asp, n, f) {
    var t = 1 / Math.tan(fov / 2);
    return [ t/asp,0,0,0, 0,t,0,0, 0,0,(f+n)/(n-f),-1, 0,0,(2*f*n)/(n-f),0 ];
  }
  function mTrans(x, y, z) { var m = mIdent(); m[12]=x; m[13]=y; m[14]=z; return m; }
  function mScale(x, y, z) { return [x,0,0,0, 0,y,0,0, 0,0,z,0, 0,0,0,1]; }
  function mRotX(a){var c=Math.cos(a),s=Math.sin(a);return [1,0,0,0, 0,c,s,0, 0,-s,c,0, 0,0,0,1];}
  function mRotY(a){var c=Math.cos(a),s=Math.sin(a);return [c,0,-s,0, 0,1,0,0, s,0,c,0, 0,0,0,1];}
  function mRotZ(a){var c=Math.cos(a),s=Math.sin(a);return [c,s,0,0, -s,c,0,0, 0,0,1,0, 0,0,0,1];}

  /* ----------------------------------------------------------- hero GL --- */
  // A printed model car: body, cabin, hood, chassis, splitter, wing, four
  // wheels. Ten parts, each its own model matrix, colour and explode vector, so
  // pulling it apart reads as an assembly diagram coming undone.
  function HeroGL(canvas) {
    var gl = canvas.getContext('webgl', { antialias: true, alpha: true, premultipliedAlpha: false });
    if (!gl) return null;

    var VS =
      'attribute vec3 p; attribute vec3 n;' +
      'uniform mat4 uMVP; uniform mat4 uModel;' +
      'varying vec3 vN; varying vec3 vP;' +
      'void main(){ vN = mat3(uModel) * n; vP = (uModel * vec4(p,1.0)).xyz;' +
      ' gl_Position = uMVP * vec4(p,1.0); }';
    var FS =
      'precision mediump float;' +
      'varying vec3 vN; varying vec3 vP;' +
      'uniform vec3 uLight; uniform vec3 uColor; uniform float uRough;' +
      'void main(){' +
      ' vec3 N = normalize(vN);' +
      ' float d = max(dot(N, normalize(uLight)), 0.0);' +
      ' vec3 warm = vec3(1.0, 0.78, 0.5);' +       // amber key
      ' vec3 cool = vec3(0.5, 0.6, 0.68);' +       // bright neutral-cool fill
      ' float rim = pow(1.0 - max(dot(N, vec3(0.0,0.0,1.0)), 0.0), 2.2);' +
      ' vec3 col = uColor * (0.42 + 0.8 * d) * mix(cool, warm, d * 0.85);' +
      ' col += warm * rim * 0.5;' +               // stronger rim separation
      ' float spec = pow(d, mix(46.0, 8.0, uRough)) * (1.0 - uRough) * 0.8;' +
      ' col += spec * vec3(1.0, 0.95, 0.88);' +
      ' float ll = 0.5 + 0.5 * sin(vP.y * 118.0);' +   // printed layer lines
      ' col *= 0.95 + 0.05 * ll;' +
      ' col += pow(rim, 2.0) * 0.12;' +           // gentle bloom
      ' col = pow(col, vec3(0.88));' +            // brighter lift
      ' gl_FragColor = vec4(col, 1.0);' +
      '}';

    function sh(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.warn(gl.getShaderInfoLog(s)); }
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.warn('[kniff] hero shader link failed:', gl.getProgramInfoLog(prog));
      return null;
    }
    gl.useProgram(prog);

    // ---- geometry: a box and a cylinder, each its own buffer pair ----------
    function makeGeo(P, N) {
      var vb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, vb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(P), gl.STATIC_DRAW);
      var nb = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, nb);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(N), gl.STATIC_DRAW);
      return { vb: vb, nb: nb, count: P.length / 3 };
    }
    var bP = [], bN = [];
    [
      [[ 1,0,0],[[ .5,-.5,-.5],[ .5,.5,-.5],[ .5,.5,.5],[ .5,-.5,.5]]],
      [[-1,0,0],[[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5],[-.5,-.5,-.5]]],
      [[0, 1,0],[[-.5,.5,-.5],[-.5,.5,.5],[ .5,.5,.5],[ .5,.5,-.5]]],
      [[0,-1,0],[[-.5,-.5,.5],[-.5,-.5,-.5],[ .5,-.5,-.5],[ .5,-.5,.5]]],
      [[0,0, 1],[[-.5,-.5,.5],[ .5,-.5,.5],[ .5,.5,.5],[-.5,.5,.5]]],
      [[0,0,-1],[[ .5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[ .5,.5,-.5]]]
    ].forEach(function (f) {
      var nrm = f[0], q = f[1];
      [0,1,2, 0,2,3].forEach(function (i) { bP.push(q[i][0], q[i][1], q[i][2]); bN.push(nrm[0], nrm[1], nrm[2]); });
    });
    // cylinder, axis along X, unit diameter in YZ, x in [-.5,.5]
    var cP = [], cN = [], SEG = 18;
    for (var s = 0; s < SEG; s++) {
      var a = s / SEG * 6.2831853, a2 = (s + 1) / SEG * 6.2831853;
      var c1 = [Math.cos(a), Math.sin(a)], c2 = [Math.cos(a2), Math.sin(a2)];
      var A = [-.5, .5*c1[0], .5*c1[1]], B = [.5, .5*c1[0], .5*c1[1]];
      var C = [.5, .5*c2[0], .5*c2[1]], D = [-.5, .5*c2[0], .5*c2[1]];
      var n1 = [0, c1[0], c1[1]], n2 = [0, c2[0], c2[1]];
      cP.push(A[0],A[1],A[2], B[0],B[1],B[2], C[0],C[1],C[2],  A[0],A[1],A[2], C[0],C[1],C[2], D[0],D[1],D[2]);
      cN.push(n1[0],n1[1],n1[2], n1[0],n1[1],n1[2], n2[0],n2[1],n2[2],  n1[0],n1[1],n1[2], n2[0],n2[1],n2[2], n2[0],n2[1],n2[2]);
      cP.push(.5,0,0, B[0],B[1],B[2], C[0],C[1],C[2]);        cN.push(1,0,0, 1,0,0, 1,0,0);
      cP.push(-.5,0,0, D[0],D[1],D[2], A[0],A[1],A[2]);       cN.push(-1,0,0, -1,0,0, -1,0,0);
    }
    // gear, axis along Y, unit tip radius, y in [-.5,.5], square teeth
    function makeGear(teeth, rootR) {
      var P = [], N = [], steps = teeth * 4, i;
      function rad(k) { var m = ((k % 4) + 4) % 4; return (m === 1 || m === 2) ? 1.0 : rootR; }
      for (i = 0; i < steps; i++) {
        var a1 = i / steps * 6.2831853, a2 = (i + 1) / steps * 6.2831853;
        var r1 = rad(i), r2 = rad(i + 1);
        var p1 = [Math.cos(a1) * r1, Math.sin(a1) * r1], p2 = [Math.cos(a2) * r2, Math.sin(a2) * r2];
        var nx = (Math.cos(a1) + Math.cos(a2)) / 2, nz = (Math.sin(a1) + Math.sin(a2)) / 2;
        var nl = Math.hypot(nx, nz) || 1; nx /= nl; nz /= nl;
        // outer wall
        P.push(p1[0],-.5,p1[1], p1[0],.5,p1[1], p2[0],.5,p2[1],  p1[0],-.5,p1[1], p2[0],.5,p2[1], p2[0],-.5,p2[1]);
        for (var w = 0; w < 6; w++) N.push(nx, 0, nz);
        // caps
        P.push(0,.5,0, p1[0],.5,p1[1], p2[0],.5,p2[1]);   N.push(0,1,0, 0,1,0, 0,1,0);
        P.push(0,-.5,0, p2[0],-.5,p2[1], p1[0],-.5,p1[1]); N.push(0,-1,0, 0,-1,0, 0,-1,0);
      }
      return makeGeo(P, N);
    }
    var GBOX = makeGeo(bP, bN), GCYL = makeGeo(cP, cN);
    var GGEAR = makeGear(14, 0.78), GPINION = makeGear(9, 0.7);

    var aP = gl.getAttribLocation(prog, 'p'), aN = gl.getAttribLocation(prog, 'n');
    gl.enableVertexAttribArray(aP); gl.enableVertexAttribArray(aN);
    function bindGeo(G) {
      gl.bindBuffer(gl.ARRAY_BUFFER, G.vb); gl.vertexAttribPointer(aP, 3, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, G.nb); gl.vertexAttribPointer(aN, 3, gl.FLOAT, false, 0, 0);
    }

    var uMVP = gl.getUniformLocation(prog, 'uMVP');
    var uModel = gl.getUniformLocation(prog, 'uModel');
    var uLight = gl.getUniformLocation(prog, 'uLight');
    var uColor = gl.getUniformLocation(prog, 'uColor');
    var uRough = gl.getUniformLocation(prog, 'uRough');
    gl.enable(gl.DEPTH_TEST);

    // g: geometry, s: scale, t: assembled position, ex: explode vector,
    // tint: multiplies the material colour. A printed planetary gearset —
    // ring, carrier plates, sun, three planets, shafts, screws — so pulling it
    // apart reads as an exploded assembly diagram. `ay` = stood on the Y axis.
    var R3 = 0.62, S3 = 0.537;   // planet ring at radius R3, 120deg apart
    var parts = [
      { g: GCYL, ay: 1, s: [1.9, 0.46, 1.9], t: [0, -0.06, 0], ex: [0, -1.5, 0], tint: 0.5 },   // ring body
      { g: GCYL, ay: 1, s: [1.78, 0.12, 1.78], t: [0,  0.34, 0], ex: [0,  1.9, 0], tint: 0.72 }, // top carrier plate
      { g: GCYL, ay: 1, s: [1.78, 0.12, 1.78], t: [0, -0.42, 0], ex: [0, -2.2, 0], tint: 0.72 }, // base plate
      { g: GGEAR, s: [0.62, 0.34, 0.62], t: [0, 0.02, 0], ex: [0, 2.7, 0], tint: 1.0 },          // sun gear
      { g: GGEAR, s: [0.6, 0.34, 0.6], t: [ R3, 0.02, 0.0 ], ex: [ 1.6, 1.3, 0.0], tint: 0.95 }, // planet 1
      { g: GGEAR, s: [0.6, 0.34, 0.6], t: [-0.31, 0.02, S3 ], ex: [-0.8, 1.3, 1.4], tint: 0.95 },// planet 2
      { g: GGEAR, s: [0.6, 0.34, 0.6], t: [-0.31, 0.02,-S3 ], ex: [-0.8, 1.3,-1.4], tint: 0.95 },// planet 3
      { g: GCYL, ay: 1, s: [0.24, 1.5, 0.24], t: [0, -0.75, 0], ex: [0, -2.9, 0], tint: 0.35 },  // output shaft (down)
      { g: GCYL, ay: 1, s: [0.2, 0.9, 0.2], t: [0, 0.62, 0], ex: [0, 3.3, 0], tint: 0.4 },       // input pinion shaft (up)
      { g: GCYL, ay: 1, s: [0.12, 0.34, 0.12], t: [ 0.82, 0.28, 0.0 ], ex: [ 2.4, 0.7, 0.0], tint: 0.3 }, // screw 1
      { g: GCYL, ay: 1, s: [0.12, 0.34, 0.12], t: [-0.41, 0.28, 0.71], ex: [-1.2, 0.7, 2.1], tint: 0.3 }, // screw 2
      { g: GCYL, ay: 1, s: [0.12, 0.34, 0.12], t: [-0.41, 0.28,-0.71], ex: [-1.2, 0.7,-2.1], tint: 0.3 }  // screw 3
    ];

    var mats = {
      natur:  { col: [0.86, 0.82, 0.72], rough: 0.85, accent: '#f2a63b' },
      anthra: { col: [0.20, 0.21, 0.22], rough: 0.7,  accent: '#f2a63b' },
      petrol: { col: [0.06, 0.42, 0.42], rough: 0.6,  accent: '#12b0b0' },
      signal: { col: [0.95, 0.44, 0.12], rough: 0.55, accent: '#ff8a3d' }
    };
    var mat = mats.natur;

    var state = { yaw: -0.42, tyaw: -0.42, pitch: -0.62, explode: 0, texplode: 0, boot: 0, idle: 0 };
    var t0 = performance.now();
    var dpr = Math.min(devicePixelRatio || 1, 2);

    var lastW = 0, lastH = 0;
    function resize() {
      var w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h) return false;
      if (w === lastW && h === lastH) return true;
      lastW = w; lastH = h;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      return true;
    }
    resize();
    addEventListener('resize', resize, { passive: true });

    // pointer drag: horizontal = turn, vertical = pull apart
    var drag = null;
    canvas.addEventListener('pointerdown', function (e) {
      drag = { x: e.clientX, y: e.clientY, yaw: state.tyaw, ex: state.texplode, moved: 0 };
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!drag) return;
      var dx = e.clientX - drag.x, dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      state.tyaw = drag.yaw + dx * 0.011;
      if (Math.abs(dy) > 14) {
        state.texplode = clamp(drag.ex + (dy > 0 ? dy - 14 : dy + 14) * 0.006, 0, 1);
        if (e.cancelable && Math.abs(dy) > Math.abs(dx)) e.preventDefault();
      }
    });
    function endDrag() { if (drag) { drag = null; } }
    canvas.addEventListener('pointerup', endDrag);
    canvas.addEventListener('pointercancel', endDrag);

    var RUBBER = [0.085, 0.085, 0.095];

    var api = {
      setBoot: function (t) { state.boot = clamp(t, 0, 1); },
      setMaterial: function (key) {
        if (!mats[key]) return;
        mat = mats[key];
        root.style.setProperty('--sc-accent', mat.accent);
      },
      setExplode: function (v) { state.texplode = clamp(v, 0, 1); },
      toggleExplode: function () { state.texplode = state.texplode > 0.5 ? 0 : 1; return state.texplode > 0.5; },
      materials: Object.keys(mats),
      frame: function (dt) {
        if (!resize()) return;               // canvas not laid out yet (pre-mount)
        if (reduce) { state.boot = 1; state.tyaw = -0.62; }
        if (state.boot < 1 && performance.now() - t0 > 3000) {
          state.boot = Math.min(1, state.boot + dt * 1.2);
        }
        state.explode = lerp(state.explode, state.texplode, 0.12);
        if (!drag) {
          state.idle += dt;
          var sway = reduce ? 0 : Math.sin(state.idle * 0.3) * 0.13;
          state.yaw = lerp(state.yaw, state.tyaw + sway, 0.05);
        } else {
          state.yaw = lerp(state.yaw, state.tyaw, 0.14);
        }

        var w = canvas.width, h = canvas.height, asp = w / h;
        gl.clearColor(0, 0, 0, 0);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        var proj = mPersp(0.60, asp, 0.1, 100);
        // wide screen: car pushed right, headline clear bottom-left.
        // narrow / portrait: car lifted into the top third, above the headline.
        var wide = asp >= 1.1;
        var offX = wide ? clamp((asp - 1.0) * 0.8, 0.3, 1.2) : 0;
        // portrait: keep the object small and high so the headline zone below is
        // clean; wide: pushed right of the corner-anchored headline.
        var offY = wide ? 0.2 : clamp(1.7 + (1 / asp - 1) * 0.7, 1.7, 2.7);
        var dist = wide ? -9.4 : -13.6;
        var view = mMul(mTrans(offX, offY, dist), mMul(mRotX(state.pitch), mRotY(state.yaw)));
        gl.uniform3f.apply(gl, [uLight].concat(Light.dir()));

        var be = state.boot * state.boot * (3 - 2 * state.boot);
        for (var i = 0; i < parts.length; i++) {
          var p = parts[i];
          // assembled at boot=1 & explode=0; boot scatters, explode spreads x1.6
          var k = (1 - be) * 1.3 + state.explode * 1.25;
          bindGeo(p.g);
          var local = p.ay ? mMul(mRotZ(1.5707963), mScale(p.s[0], p.s[1], p.s[2]))
                           : mScale(p.s[0], p.s[1], p.s[2]);
          var m = mMul(view,
                    mMul(mTrans(p.t[0] + p.ex[0] * k, p.t[1] + p.ex[1] * k, p.t[2] + p.ex[2] * k),
                      mMul(mRotY((1 - be) * ((i % 3) - 1) * 0.8), local)));
          gl.uniformMatrix4fv(uMVP, false, new Float32Array(mMul(proj, m)));
          gl.uniformMatrix4fv(uModel, false, new Float32Array(m));
          if (p.rubber) { gl.uniform3f(uColor, RUBBER[0], RUBBER[1], RUBBER[2]); gl.uniform1f(uRough, 0.95); }
          else {
            var tn = p.tint || 1;
            gl.uniform3f(uColor, mat.col[0] * tn, mat.col[1] * tn, mat.col[2] * tn);
            gl.uniform1f(uRough, mat.rough);
          }
          gl.drawArrays(gl.TRIANGLES, 0, p.g.count);
        }
      }
    };
    return api;
  }

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

  /* ----------------------------------------------------------- hero art --- */
  // The hero is a floating render, not live 3D. Pointer parallax is pure CSS
  // off --kf-lx/--kf-ly; this only swaps the render when a material is picked.
  function HeroArt() {
    var img = document.getElementById('kf-hero-img');
    var sw = document.querySelectorAll('.kf-switch button[data-mat]');
    if (!img || !sw.length) return;
    // warm the alternates so the swap is instant
    [].forEach.call(sw, function (b) {
      var s = b.getAttribute('data-src'); if (s) { var p = new Image(); p.src = s; }
    });
    [].forEach.call(sw, function (b) {
      b.addEventListener('click', function () {
        var src = b.getAttribute('data-src');
        if (!src) return;
        [].forEach.call(sw, function (x) { x.setAttribute('aria-pressed', 'false'); });
        b.setAttribute('aria-pressed', 'true');
        root.style.setProperty('--sc-accent', b.getAttribute('data-accent') || '#f2a63b');
        if (img.getAttribute('src') === src) return;
        img.classList.add('kf-swap');
        var next = new Image();
        next.onload = function () { img.src = src; requestAnimationFrame(function () { img.classList.remove('kf-swap'); }); };
        next.src = src;
      });
    });
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
      return matchMedia('(min-width: 1000px)').matches ? Math.min(3, pool.length)
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
    function close() {
      head.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Menü öffnen');
    }
    burger.addEventListener('click', function () {
      var open = head.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? 'Menü schließen' : 'Menü öffnen');
    });
    links.forEach(function (a) { a.addEventListener('click', close); });
    addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
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

  /* --------------------------------------------------------------- go ---- */
  function start() {
    Nav();
    tuneSpans();
    Light.init();
    HeroArt();
    Reviews();
    var rail = RailCubes();
    HUD();
    var hero = null;

    var last = performance.now();
    (function loop(now) {
      var dt = Math.min((now - last) / 1000, 0.05); last = now;
      Light.tick();
      if (hero) hero.frame(dt);
      if (rail) rail.frame(dt, now / 1000);
      requestAnimationFrame(loop);
    })(last);

    boot(hero);

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
