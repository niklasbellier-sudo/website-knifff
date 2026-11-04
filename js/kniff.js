/* Kniff: Schiene, Menü, Anfrage, Shop-Filter, Galerie, Kontakt, Mein Projekt.
   Keine Abhängigkeiten. Jede Funktion prüft selbst, ob ihre Bausteine auf der
   Seite stehen, und tut sonst nichts. Ohne JavaScript bleibt jede Seite
   vollständig benutzbar: Formulare senden normal, alle Produkte sind sichtbar. */
(function () {
  'use strict';

  var EN = document.documentElement.lang === 'en';
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return [].slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  /* ------------------------------------------------------------ Schiene --- */
  // CSS fährt Kopf und Bahn mit animation-timeline: scroll(root). Browser ohne
  // diese Fähigkeit bekommen --k-scroll (0..1) per requestAnimationFrame.
  function Rail() {
    if (!$('.k-rail')) return;
    if (window.CSS && CSS.supports && CSS.supports('animation-timeline: scroll()')) return;
    if (reduce.matches) return;
    var root = document.documentElement;
    var queued = false;
    function update() {
      queued = false;
      var max = root.scrollHeight - innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, scrollY / max)) : 0;
      root.style.setProperty('--k-scroll', p.toFixed(4));
    }
    function request() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }
    root.classList.add('k-rail-js');
    addEventListener('scroll', request, { passive: true });
    addEventListener('resize', request, { passive: true });
    update();
  }

  /* --------------------------------------------------------------- Menü --- */
  function Menu() {
    var btn = $('.k-menu');
    var panel = btn && document.getElementById(btn.getAttribute('aria-controls'));
    if (!panel) return;
    var labelOpen = btn.getAttribute('aria-label');
    var labelClose = EN ? 'Close menu' : 'Menü schließen';

    function set(open) {
      panel.hidden = !open;
      btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      btn.setAttribute('aria-label', open ? labelClose : labelOpen);
    }
    btn.addEventListener('click', function () { set(panel.hidden); });
    panel.addEventListener('click', function (e) { if (e.target.closest('a')) set(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !panel.hidden) { set(false); btn.focus(); }
    });
    document.addEventListener('click', function (e) {
      if (!panel.hidden && !panel.contains(e.target) && !btn.contains(e.target)) set(false);
    });
    var wide = matchMedia('(min-width: 821px)');
    if (wide.addEventListener) wide.addEventListener('change', function (m) { if (m.matches) set(false); });
  }

  /* -------------------------------------------- Leiste am Handy (k-bar) --- */
  // Blendet die Leiste aus, sobald ihr Ziel (z. B. #anfrage) sichtbar ist.
  function Bar() {
    var bar = $('.k-bar[data-k-hide-on]');
    if (!bar || !('IntersectionObserver' in window)) return;
    var targets = $$(bar.getAttribute('data-k-hide-on'));
    if (!targets.length) return;
    var visible = new Set();
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) visible.add(e.target); else visible.delete(e.target);
      });
      bar.classList.toggle('is-hidden', visible.size > 0);
    });
    targets.forEach(function (t) { io.observe(t); });
  }

  /* ---------------------------------------------------------- Anfrage ---- */
  // Ein einziges <form name="custom-druck"> mit allen Feldern, damit Netlify es
  // erkennt. Ohne JS stehen alle Felder untereinander und es sendet normal an
  // /danke. Mit JS werden daraus drei Schritte plus Abschluss.
  function Anfrage() {
    var form = $('form[data-k-steps]');
    if (!form) return;

    var T = EN ? {
      pick: 'Choose how you are starting.',
      desc: 'Briefly describe what you need.',
      big: 'The file is larger than 7 MB. Please send it by email or add a download link to the description.',
      contact: 'We need your name and email to reply.',
      sending: 'Sending …',
      pieces: 'pcs',
      step: 'Step {n} of 3: {label}',
      start: { datei: '3D file', skizze: 'Sketch or photo', idee: 'Idea' },
      file: { datei: 'File (STL / 3MF / STEP, up to 7 MB)', skizze: 'Sketch or photo (up to 7 MB)' }
    } : {
      pick: 'Wähl kurz aus, womit du startest.',
      desc: 'Beschreib kurz, was du brauchst.',
      big: 'Die Datei ist größer als 7 MB. Schick sie uns bitte per E-Mail oder leg einen Download-Link in die Beschreibung.',
      contact: 'Name und E-Mail brauchen wir für die Antwort.',
      sending: 'Wird gesendet …',
      pieces: 'Stück',
      step: 'Schritt {n} von 3: {label}',
      start: { datei: '3D-Datei', skizze: 'Skizze oder Foto', idee: 'Idee' },
      file: { datei: 'Datei (STL / 3MF / STEP, bis 7 MB)', skizze: 'Skizze oder Foto (bis 7 MB)' }
    };
    var MAX = 7 * 1024 * 1024;
    var RAIL = ['3%', '35%', '67%', '97%'];
    var ACCEPT = {
      datei: '.stl,.3mf,.step,.stp,.obj,.zip',
      skizze: '.jpg,.jpeg,.png,.heic,.webp,.pdf'
    };

    var steps = $$('.k-step', form);
    var labels = $$('.k-progress__labels span', form);
    var print = $('.k-progress__print', form);
    var head = $('.k-progress__head', form);
    var live = $('[data-k-live]', form);
    var summary = $('[data-k-summary]', form);
    var file = form.elements.datei;
    var fileField = file && file.closest('.k-field');
    var fileLabel = $('[data-k-filelabel]', form);
    var sendBtn = $('[data-k-send]', form);
    var sendText = sendBtn ? sendBtn.textContent : '';
    var current = 1;

    form.classList.add('is-steps');
    form.noValidate = true;

    function err(step, msg) {
      var box = $('.k-step[data-step="' + step + '"] .k-formerr', form);
      if (box) box.textContent = msg || '';
    }

    function start() {
      var r = $('input[name="ausgangslage"]:checked', form);
      return r ? r.getAttribute('data-k-start') : '';
    }

    function applyStart() {
      var s = start();
      $$('.k-opt', form).forEach(function (o) {
        o.classList.toggle('is-checked', !!$('input:checked', o));
      });
      if (!fileField) return;
      fileField.hidden = s === 'idee';
      if (s === 'idee') file.value = '';
      if (ACCEPT[s]) file.setAttribute('accept', ACCEPT[s]);
      if (fileLabel && T.file[s]) fileLabel.textContent = T.file[s];
    }

    function go(n, focus) {
      current = n;
      steps.forEach(function (s) { s.classList.toggle('is-current', +s.getAttribute('data-step') === n); });
      labels.forEach(function (l, i) { l.classList.toggle('is-on', i + 1 === n); });
      if (print) print.style.width = RAIL[n - 1];
      if (head) head.style.left = RAIL[n - 1];
      if (n === 3 && summary) {
        var qty = form.elements.stueckzahl.value || '1';
        summary.textContent = (T.start[start()] || '') + ' · ' + qty + ' ' + T.pieces + ' · ' + form.elements.material.value;
      }
      if (live && n < 4) live.textContent = T.step.replace('{n}', n).replace('{label}', labels[n - 1] ? labels[n - 1].textContent : '');
      if (focus === false) return;
      var top = form.getBoundingClientRect().top;
      if (top < 0 || top > innerHeight * 0.6) form.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
      // Fokus auf den ganzen Schritt: Screenreader lesen dann die Überschrift
      // (legend) vor, Tab führt ins erste Feld.
      var target = $('.k-step.is-current', form);
      if (target) target.focus({ preventScroll: true });
    }

    // Schritt 1: Klick oder Tipp auf eine Option geht direkt weiter (wie im
    // Entwurf). Pfeiltasten wählen nur aus, damit Tastaturnutzer nicht beim
    // ersten Druck aus der Gruppe fliegen; Enter oder "Weiter" bestätigt.
    var pointer = false;
    form.addEventListener('pointerdown', function (e) { pointer = !!e.target.closest('.k-opt'); });
    $$('input[name="ausgangslage"]', form).forEach(function (r) {
      r.addEventListener('change', function () {
        applyStart();
        err(1, '');
        if (pointer) { pointer = false; go(2); }
      });
      r.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); next(1); }
      });
    });

    function next(from) {
      if (from === 1) {
        if (!start()) { err(1, T.pick); return; }
        err(1, ''); go(2); return;
      }
      if (from === 2) {
        if (!form.elements.beschreibung.value.trim()) { err(2, T.desc); form.elements.beschreibung.focus(); return; }
        if (file && file.files && file.files[0] && file.files[0].size > MAX) { err(2, T.big); file.focus(); return; }
        err(2, ''); go(3);
      }
    }

    function send() {
      var name = form.elements.name, mail = form.elements.email;
      if (!name.value.trim() || !mail.value.trim() || !mail.checkValidity()) {
        err(3, T.contact);
        (name.value.trim() ? mail : name).focus();
        return;
      }
      err(3, '');
      sendBtn.disabled = true;
      sendBtn.textContent = T.sending;
      // Netlify nimmt AJAX-Einsendungen mit Datei als multipart an "/" an.
      // Klappt das nicht, schickt das Formular ganz normal ab (Ziel /danke).
      fetch('/', { method: 'POST', body: new FormData(form) })
        .then(function (r) {
          if (!r.ok) throw new Error('HTTP ' + r.status);
          go(4);
        })
        .catch(function () {
          HTMLFormElement.prototype.submit.call(form);
        })
        .then(function () {
          sendBtn.disabled = false;
          sendBtn.textContent = sendText;
        });
    }

    form.addEventListener('click', function (e) {
      var b = e.target.closest('[data-k-go]');
      if (!b) return;
      var act = b.getAttribute('data-k-go');
      if (act === 'next') next(current);
      else if (act === 'back') go(Math.max(1, current - 1));
      else if (act === 'send') send();
      else if (act === 'reset') { form.reset(); applyStart(); go(1); }
    });
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (current < 3) next(current); else send();
    });
    if (file) file.addEventListener('change', function () { err(2, ''); });

    applyStart();
    go(1, false);
  }

  /* ------------------------------------------------------- Shop-Filter --- */
  function ShopFilter() {
    var bar = $('[data-k-filter]');
    if (!bar) return;
    var items = $$('[data-cat]');
    bar.hidden = false;
    bar.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-filter]');
      if (!b) return;
      var f = b.getAttribute('data-filter');
      $$('button[data-filter]', bar).forEach(function (x) {
        x.setAttribute('aria-pressed', x === b ? 'true' : 'false');
      });
      items.forEach(function (t) {
        t.hidden = f !== 'alle' && t.getAttribute('data-cat') !== f;
      });
    });
  }

  /* ----------------------------------------------------------- Galerie --- */
  function Gallery() {
    $$('[data-k-gallery]').forEach(function (g) {
      var main = $('[data-k-main]', g);
      var thumbs = $$('.k-thumb', g);
      thumbs.forEach(function (b) {
        b.addEventListener('click', function () {
          main.src = b.getAttribute('data-src');
          main.alt = b.getAttribute('data-alt') || '';
          thumbs.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
        });
      });
    });
    // Videos laufen nur ohne "Bewegung reduzieren"
    if (reduce.matches) $$('video[autoplay]').forEach(function (v) { v.removeAttribute('autoplay'); v.pause(); v.controls = true; });
  }

  /* ------------------------------------------- Aufklapper per Anker öffnen */
  // /shop.html#produktsicherheit soll den Abschnitt nicht nur anspringen,
  // sondern auch aufklappen.
  function OpenDetails() {
    function open() {
      var id = decodeURIComponent(location.hash.slice(1));
      var d = id && document.getElementById(id);
      if (d && d.tagName === 'DETAILS') d.open = true;
    }
    open();
    addEventListener('hashchange', open);
  }

  /* ---------------------------------------------------- Kontakt-Vorlage --- */
  // "Lieber direkt anfragen" trägt ?produkt=<Name>, "erneut beauftragen" auf
  // Mein Projekt trägt ?reorder=<Titel>&change=<Wünsche>. Beides füllt Betreff,
  // eine sichtbare Kontextzeile und einen Textanfang ins Kontaktformular.
  function ContactPrefill() {
    var form = $('form[name="kontakt"]');
    if (!form) return;
    var params = new URLSearchParams(location.search);
    var produkt = params.get('produkt');
    var reorder = params.get('reorder');
    if (!produkt && !reorder) return;

    var subject = form.querySelector('input[name="betreff"]');
    var msg = form.querySelector('textarea[name="nachricht"]');
    function clean(s, n) { return (s || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, n); }
    var line;

    if (reorder) {
      var name = clean(reorder, 90);
      if (!name) return;
      var change = clean(params.get('change'), 400);
      if (subject) subject.value = (EN ? 'Repeat order: ' : 'Wiederholungsauftrag: ') + name;
      if (msg && !msg.value) {
        msg.value = EN
          ? 'I would like to reorder the following project: ' + name + '\n\n' + (change ? 'Requested changes: ' + change + '\n\n' : '')
          : 'Ich möchte folgendes Projekt erneut beauftragen: ' + name + '\n\n' + (change ? 'Änderungswünsche: ' + change + '\n\n' : '');
      }
      line = (EN ? 'Your request refers to: ' : 'Deine Anfrage bezieht sich auf: ') + name + (EN ? ' (repeat order)' : ' (Wiederholungsauftrag)');
    } else {
      var pname = clean(produkt, 90);
      if (!pname) return;
      if (subject) subject.value = (EN ? 'Product inquiry: ' : 'Produktanfrage: ') + pname;
      if (msg && !msg.value) {
        msg.value = EN ? 'I am interested in: ' + pname + '\n\nQuantity: 1\n\n' : 'Ich interessiere mich für: ' + pname + '\n\nMenge: 1\n\n';
      }
      line = (EN ? 'Your request refers to: ' : 'Deine Anfrage bezieht sich auf: ') + pname;
    }

    var note = el('p', 'k-ctx', line);
    form.insertBefore(note, form.querySelector('.k-field'));
    var first = form.querySelector('input[name="name"]');
    if (first) first.focus({ preventScroll: true });
    form.scrollIntoView({ block: 'start', behavior: reduce.matches ? 'auto' : 'smooth' });
  }

  /* ------------------------------------------------------- Mein Projekt --- */
  // Die Projektdaten stehen verschlüsselt in #mp-data (AES-GCM). Schlüssel und
  // Such-ID entstehen per PBKDF2 aus dem Projekt-Code. Ohne Code ist der Block
  // Zeichensalat, auch im öffentlichen Repository. Neue Projekte trägt
  // scripts/projekt-codes.js ein, die Klartext-Liste liegt außerhalb des Repos.
  function MeinProjekt() {
    var app = $('#mp-app');
    var dataEl = $('#mp-data');
    var form = $('#mp-form');
    if (!app || !dataEl || !form) return;

    var data;
    try { data = JSON.parse(dataEl.textContent); } catch (e) { return; }
    var T = EN ? {
      stages: ['Requested', 'In review', 'Quote sent', 'In progress', 'Done & shipped'],
      short: ['Requested', 'Review', 'Quote', 'Printing', 'Shipped'],
      status: 'Status', material: 'Material', colour: 'Colour', weight: 'Weight', time: 'Print time', invoice: 'Invoice',
      later: 'As soon as the part is finished', weightInvoice: 'Weight and invoice', forWho: 'For: ',
      notFound: 'No project found for this code. Check the code in our email, or ',
      write: 'write to us', wait: 'Looking up your project …', noCrypto: 'Your browser cannot open this page securely. Please write to us and we will send you the status.',
      example: 'Example project', prev: 'Previous stage', next: 'Next stage', preview: 'Switch stage for the preview',
      reorder: 'Order this project again', change: 'Changes (optional)', changeHint: 'e.g. different colour or quantity …',
      contact: '/en/kontakt.html', demoNote: 'This is what your project looks like once you enter your code.',
      oldLink: 'This link is from our old customer area. Please use the new code from our email, or '
    } : {
      stages: ['Angefragt', 'In Prüfung', 'Angebot erstellt', 'In Arbeit', 'Fertig & versendet'],
      short: ['Angefragt', 'Prüfung', 'Angebot', 'In Arbeit', 'Versendet'],
      status: 'Status', material: 'Material', colour: 'Farbe', weight: 'Gewicht', time: 'Druckzeit', invoice: 'Rechnung',
      later: 'Sobald das Teil fertig ist', weightInvoice: 'Gewicht und Rechnung', forWho: 'Für: ',
      notFound: 'Kein Projekt mit diesem Code gefunden. Prüf den Code aus unserer E-Mail, oder ',
      write: 'schreib uns', wait: 'Projekt wird gesucht …', noCrypto: 'Dein Browser kann diese Seite nicht sicher öffnen. Schreib uns kurz, dann schicken wir dir den Stand.',
      example: 'Beispielprojekt', prev: 'Stufe zurück', next: 'Stufe weiter', preview: 'Status zur Vorschau wechseln',
      reorder: 'Projekt erneut beauftragen', change: 'Änderungswünsche (optional)', changeHint: 'z. B. andere Farbe, andere Stückzahl …',
      contact: '/kontakt.html', demoNote: 'So sieht dein Projekt aus, sobald du deinen Code eingibst.',
      oldLink: 'Dieser Link stammt aus unserem alten Kundenbereich. Nutz bitte den neuen Code aus unserer E-Mail, oder '
    };
    var POS = ['2%', '26%', '50%', '74%', '98%'];
    var input = $('#mp-code');

    function track(stufe) {
      var wrap = el('div', 'k-track');
      wrap.setAttribute('aria-hidden', 'true');
      wrap.appendChild(el('div', 'k-progress__line'));
      var pr = el('div', 'k-progress__print'); pr.style.width = POS[stufe]; wrap.appendChild(pr);
      var hd = el('img', 'k-progress__head'); hd.src = '/assets/kopf-mini.svg'; hd.alt = ''; hd.style.left = POS[stufe]; wrap.appendChild(hd);
      var lb = el('div', 'k-progress__labels');
      T.short.forEach(function (s, i) {
        var sp = el('span', null, s);
        sp.style.color = i === stufe ? 'var(--amber)' : 'var(--cream-mute)';
        lb.appendChild(sp);
      });
      wrap.appendChild(lb);
      return wrap;
    }

    function rows(list) {
      var dl = el('dl', 'k-rows');
      list.forEach(function (r) {
        var d = el('div');
        d.appendChild(el('dt', null, r[0]));
        d.appendChild(el('dd', null, r[1]));
        dl.appendChild(d);
      });
      return dl;
    }

    function card(p, demo) {
      var stufe = Math.max(0, Math.min(4, p.stufe | 0));
      var c = el('section', 'k-card k-stack');
      c.style.gap = '20px';
      c.style.background = 'var(--ink-1)';
      c.setAttribute('aria-label', demo ? T.example : p.titel);
      if (p.bild) { var im = el('img', 'k-mp-img'); im.src = p.bild; im.alt = ''; im.loading = 'lazy'; c.appendChild(im); }
      var top = el('div', 'k-track__label');
      var h = el('h2', 't-h3', demo ? T.example : p.titel); h.style.fontSize = '26px';
      if (!demo) { h.id = 'mp-title'; h.tabIndex = -1; }
      top.appendChild(h);
      top.appendChild(el('span', 't-mono t-accent', T.stages[stufe]));
      c.appendChild(top);
      if (p.fuer) c.appendChild(el('p', 't-small t-soft', T.forWho + p.fuer));
      c.appendChild(track(stufe));
      var list = [[T.status, T.stages[stufe]]];
      if (p.material) list.push([T.material, p.material]);
      if (p.farbe) list.push([T.colour, p.farbe]);
      if (p.gewicht) list.push([T.weight, p.gewicht]);
      if (p.druckzeit) list.push([T.time, p.druckzeit]);
      if (p.preis) list.push([T.invoice, p.preis]);
      if (!p.gewicht && !p.preis) list.push([T.weightInvoice, T.later]);
      c.appendChild(rows(list));
      if (p.notiz) c.appendChild(el('p', 't-small t-soft', p.notiz));
      if (demo) {
        c.appendChild(el('p', 'k-formnote', T.demoNote));
        var chips = el('div', 'k-chips');
        chips.setAttribute('role', 'group');
        chips.setAttribute('aria-label', T.preview);
        [[T.prev, -1], [T.next, 1]].forEach(function (b) {
          var btn = el('button', 'k-chip', b[0]);
          btn.type = 'button';
          btn.addEventListener('click', function () {
            p.stufe = Math.max(0, Math.min(4, stufe + b[1]));
            render(card(p, true));
            var again = $$('.k-chip', app)[b[1] < 0 ? 0 : 1];
            if (again) again.focus();
          });
          chips.appendChild(btn);
        });
        c.appendChild(chips);
      } else if (stufe === 4) {
        c.appendChild(reorder(p.titel));
      }
      return c;
    }

    function reorder(titel) {
      var f = el('form', 'k-form');
      var lab = el('label', 'k-field', T.change);
      var ta = el('textarea'); ta.rows = 3; ta.placeholder = T.changeHint;
      lab.appendChild(ta);
      f.appendChild(lab);
      var b = el('button', 'k-btn k-btn--amber', T.reorder + ' →'); b.type = 'submit';
      var row = el('div', 'k-formbtns'); row.appendChild(b); f.appendChild(row);
      f.addEventListener('submit', function (e) {
        e.preventDefault();
        var url = T.contact + '?reorder=' + encodeURIComponent(titel);
        if (ta.value.trim()) url += '&change=' + encodeURIComponent(ta.value.trim());
        location.href = url;
      });
      return f;
    }

    function render(node) {
      app.textContent = '';
      app.appendChild(node);
    }

    function message(text, link) {
      var p = el('p', 't-soft', text);
      if (link) { var a = el('a', null, T.write); a.href = T.contact; p.appendChild(a); p.appendChild(document.createTextNode('.')); }
      render(p);
    }

    function norm(code) { return String(code || '').toUpperCase().replace(/[^0-9A-Z]/g, ''); }
    function fromB64(s) { var b = atob(s), u = new Uint8Array(b.length); for (var i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; }
    function toB64(buf) { var u = new Uint8Array(buf), s = ''; for (var i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); }

    var seq = 0;   // nur das Ergebnis der letzten Suche zählt
    function lookup(raw) {
      var code = norm(raw);
      var mine = ++seq;
      if (!code) { render(card(JSON.parse(JSON.stringify(data.demo)), true)); return; }
      if (!window.crypto || !crypto.subtle || !window.TextEncoder) { message(T.noCrypto); return; }
      message(T.wait);
      crypto.subtle.importKey('raw', new TextEncoder().encode(code), 'PBKDF2', false, ['deriveBits'])
        .then(function (base) {
          return crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(data.salt), iterations: data.iter }, base, 384);
        })
        .then(function (bits) {
          var id = toB64(bits.slice(32));
          var hit = (data.items || []).filter(function (x) { return x.id === id; })[0];
          if (!hit) throw new Error('nf');
          return crypto.subtle.importKey('raw', bits.slice(0, 32), 'AES-GCM', false, ['decrypt'])
            .then(function (key) { return crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(hit.iv) }, key, fromB64(hit.ct)); });
        })
        .then(function (plain) {
          if (mine !== seq) return;
          var p = JSON.parse(new TextDecoder().decode(plain));
          render(card(p, false));
          var title = $('#mp-title');
          if (title) title.focus({ preventScroll: true });
        })
        .catch(function () { if (mine === seq) message(T.notFound, true); });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var code = (norm(input.value).match(/.{1,4}/g) || []).join('-');
      if (code) input.value = code;
      // Code in den Anker, nicht in die Adresse: Anker gehen nie an den Server.
      history.replaceState(null, '', code ? '#c=' + code : location.pathname);
      lookup(code);
    });

    var m = location.hash.match(/[#&]c=([^&]+)/);
    var code = m ? decodeURIComponent(m[1]) : '';
    if (!code && new URLSearchParams(location.search).get('id')) { message(T.oldLink, true); return; }
    if (code) input.value = code;
    lookup(code);
  }

  function start() {
    Rail();
    Menu();
    Bar();
    Anfrage();
    ShopFilter();
    Gallery();
    OpenDetails();
    ContactPrefill();
    MeinProjekt();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
