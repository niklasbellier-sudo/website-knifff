#!/usr/bin/env node
/* Verschlüsselt die Projektliste für /meine-projekte.html (DE und EN).

   Die Klartext-Liste liegt AUSSERHALB des Repos, weil das Repo öffentlich ist:
     ~/Desktop/Kniff/projekte-privat/projekte.json
   (anderer Pfad als erstes Argument möglich)

   Aufbau der Liste:
     { "projekte": [ { "titel": "…", "fuer": "…", "stufe": 0-4, "material": "…",
                       "farbe": "…", "gewicht": "…", "druckzeit": "…", "preis": "…",
                       "notiz": "…", "bild": "/assets/…", "code": "…" } ] }
   Stufen: 0 Angefragt, 1 In Prüfung, 2 Angebot erstellt, 3 In Arbeit,
           4 Fertig & versendet.

   Fehlt bei einem Projekt "code", erzeugt das Skript einen neuen (60 Bit
   Zufall, z. B. K7QM-R2XD-9HTW), schreibt ihn in die Liste zurück und zeigt
   den Link für die Kundin oder den Kunden an.

   Pro Projekt: PBKDF2-SHA256(Code, Salz) ergibt 48 Byte. Die ersten 32 sind
   der AES-256-GCM-Schlüssel, die letzten 16 die Such-ID. js/kniff.js macht im
   Browser dasselbe. Ohne Code bleibt der Block unlesbar.

   Läuft mit Node 10 oder neuer, ohne Pakete:
     node scripts/projekt-codes.js
*/
'use strict';

var fs = require('fs');
var os = require('os');
var path = require('path');
var crypto = require('crypto');

var ROOT = path.resolve(__dirname, '..');
var SRC = process.argv[2] || path.join(os.homedir(), 'Desktop', 'Kniff', 'projekte-privat', 'projekte.json');
var ITER = 310000;
var ALPHA = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';   // 32 Zeichen, ohne 0/O und 1/I
var PAGES = [
  { file: 'meine-projekte.html', demo: { titel: 'Beispielprojekt', stufe: 3, material: 'PLA Mattschwarz' } },
  { file: 'en/meine-projekte.html', demo: { titel: 'Example project', stufe: 3, material: 'PLA, matte black' } }
];

function newCode() {
  var b = crypto.randomBytes(12), s = '';
  for (var i = 0; i < 12; i++) s += ALPHA[b[i] % 32];   // 256 ist durch 32 teilbar: gleichverteilt
  return s.slice(0, 4) + '-' + s.slice(4, 8) + '-' + s.slice(8);
}

function norm(code) {
  return String(code).toUpperCase().replace(/[^0-9A-Z]/g, '');
}

var priv = JSON.parse(fs.readFileSync(SRC, 'utf8'));
var changed = false;
if (!priv.salt) { priv.salt = crypto.randomBytes(16).toString('base64'); changed = true; }
var salt = Buffer.from(priv.salt, 'base64');
var links = [];

var items = (priv.projekte || []).map(function (p) {
  if (!p.code) { p.code = newCode(); changed = true; }
  links.push('  ' + p.titel + ': ' + p.code + '  →  https://kniff.shop/meine-projekte.html#c=' + p.code);
  var bits = crypto.pbkdf2Sync(norm(p.code), salt, ITER, 48, 'sha256');
  var data = {};
  Object.keys(p).forEach(function (k) { if (k !== 'code') data[k] = p[k]; });
  var iv = crypto.randomBytes(12);
  var c = crypto.createCipheriv('aes-256-gcm', bits.slice(0, 32), iv);
  var ct = Buffer.concat([c.update(JSON.stringify(data), 'utf8'), c.final(), c.getAuthTag()]);
  return { id: bits.slice(32).toString('base64'), iv: iv.toString('base64'), ct: ct.toString('base64') };
});
// Reihenfolge nach ID, damit sie nichts über die Liste verrät
items.sort(function (a, b) { return a.id < b.id ? -1 : 1; });

PAGES.forEach(function (page) {
  var file = path.join(ROOT, page.file);
  if (!fs.existsSync(file)) return;
  var html = fs.readFileSync(file, 'utf8');
  var block = JSON.stringify({ v: 1, iter: ITER, salt: priv.salt, demo: page.demo, items: items }, null, 1).replace(/</g, '\\u003c');
  var next = html.replace(/(<!-- k:mp-data -->)[\s\S]*?(<!-- \/k:mp-data -->)/,
    '$1\n<script id="mp-data" type="application/json">\n' + block + '\n</script>\n$2');
  if (next === html && html.indexOf('<!-- k:mp-data -->') < 0) throw new Error(page.file + ': Marker k:mp-data fehlt');
  fs.writeFileSync(file, next);
});

if (changed) fs.writeFileSync(SRC, JSON.stringify(priv, null, 2) + '\n');
console.log(items.length + ' Projekt(e) verschlüsselt. Links zum Weitergeben:');
console.log(links.join('\n'));
