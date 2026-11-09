#!/usr/bin/env bash
# Henter oppskriftssidene i test/fixtures/sources.md som HTML-filer og rapporterer
# hvilke som inneholder schema.org Recipe i JSON-LD. Kjør fra repoets rot: bash scripts/fetch-fixtures.sh
set -u
OUT="test/fixtures/html"
UA="Mozilla/5.0 (compatible; RecipeMateTestFetcher/0.1; skoleprosjekt)"
mkdir -p "$OUT"

fetch() { # fil url
  local f="$OUT/$1" u="$2"
  code=$(curl -sL -m 30 -A "$UA" -o "$f" -w '%{http_code}' "$u")
  if [ "$code" != "200" ]; then echo "FEIL  $1  (HTTP $code)"; rm -f "$f"; return; fi
  ld=$(grep -c 'application/ld+json' "$f")
  rc=$(grep -c '"@type" *: *"Recipe"\|"@type" *: *\[[^]]*"Recipe"' "$f")
  echo "OK    $1  ld+json-blokker=$ld  Recipe=$rc  størrelse=$(wc -c < "$f")"
}

# tine-kjottkaker.html: gir HTTP 404 (siden er fjernet), tatt ut 2026-11-09
fetch tine-kjottboller.html "https://www.tine.no/oppskrifter/middag-og-hovedretter/kjott/kjottboller-i-tomatsaus"
fetch matoppskrift-pannekaker.html "https://www.matoppskrift.no/oppskrift/pannekaker-grunnoppskrift"
fetch matoppskrift-kjottkaker.html "https://www.matoppskrift.no/oppskrift/kjoettkaker-3"
# visitnorway-farikal.html: gir HTTP 403 (blokkerer skriptet), tatt ut 2026-11-09
fetch klikk-farikal.html "https://www.klikk.no/mat/spise/oppskrift-pa-farikal-2530170"
fetch bbcgoodfood-lasagne.html "https://www.bbcgoodfoodme.com/recipes/classic-lasagne-0/"
fetch northwild-kjottkaker.html "https://northwildkitchen.com/norwegian-brown-cheese-meatballs-kjottkaker-med-brunost/"
fetch matprat-rundstykker.html "https://www.matprat.no/oppskrifter/familien/rundstykker/"
fetch matprat-enkel-brodoppskrift.html "https://www.matprat.no/oppskrifter/rask/enkel-brodoppskrift/"
fetch godt-amerikanske-pannekaker.html "https://www.godt.no/oppskrifter/pannekaker-og-vafler/155/amerikanske-pannekaker"
fetch godt-grove-middagspannekaker.html "https://www.godt.no/oppskrifter/pannekaker-og-vafler/8749/grove-middagspannekaker"
echo "Ferdig. Recipe=0 betyr at siden ikke har JSON-LD-oppskrift i HTML-en vi fikk."
