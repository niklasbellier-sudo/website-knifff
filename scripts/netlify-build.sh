#!/usr/bin/env bash
# Assemble a clean publish directory for Netlify: only the files the live site
# needs. Keeps scripts, planning notes, raw masters and the KIE key (already
# outside this folder) out of the deploy.
set -euo pipefail
cd "$(dirname "$0")/.."

OUT="_site"
rm -rf "$OUT"
mkdir -p "$OUT"

# top-level pages + site metadata
cp -p ./*.html "$OUT"/ 2>/dev/null || true
for f in robots.txt sitemap.xml favicon.ico site.webmanifest _redirects _headers; do
  [ -f "$f" ] && cp -p "$f" "$OUT"/
done

# asset trees
cp -R css "$OUT"/css
cp -R js "$OUT"/js
cp -R assets "$OUT"/assets

# never ship these even if they slipped into a tree
rm -f  "$OUT"/.env "$OUT"/*/.env "$OUT"/assets/ref-* 2>/dev/null || true
rm -rf "$OUT"/scripts "$OUT"/scrollcraft "$OUT"/lab "$OUT"/node_modules "$OUT"/assets/products 2>/dev/null || true
rm -f "$OUT"/_fotos-index.html 2>/dev/null || true
find "$OUT" -name '*.mjs' -delete 2>/dev/null || true
find "$OUT" \( -name '.DS_Store' -o -name 'Thumbs.db' \) -delete 2>/dev/null || true

date -u +"%Y-%m-%d %H:%M UTC  neues Kniff-Design (Commercial-Style, echte PLA-Farben)" > "$OUT/build.txt"
echo "built $OUT/:"
find "$OUT" -type f | sort
du -sh "$OUT"
