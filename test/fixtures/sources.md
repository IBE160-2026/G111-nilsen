# Kilder til testdata (oppskriftssider)

Sidene under lagres som HTML i `test/fixtures/html/` med `scripts/fetch-fixtures.sh`, slik at tester og sensor ikke er avhengige av at nettsidene er uendret. Innholdet tilhører de respektive sidene og brukes kun til testing av import.

| Fil | Kilde | Språk | Hvorfor den er med |
|---|---|---|---|
| `tine-kjottboller.html` | https://www.tine.no/oppskrifter/middag-og-hovedretter/kjott/kjottboller-i-tomatsaus | nb | Ny test av samme site med annen oppskrift |
| `matoppskrift-pannekaker.html` | https://www.matoppskrift.no/oppskrift/pannekaker-grunnoppskrift | nb | Porsjonsantall oppgitt som «1 porsjoner», «1 dash», desimalkomma |
| `matoppskrift-kjottkaker.html` | https://www.matoppskrift.no/oppskrift/kjoettkaker-3 | nb | Eldre side, annen oppbygging |
| `klikk-farikal.html` | https://www.klikk.no/mat/spise/oppskrift-pa-farikal-2530170 | nb | Magasinside |
| `bbcgoodfood-lasagne.html` | https://www.bbcgoodfoodme.com/recipes/classic-lasagne-0/ | en | Engelsk side med enheter som `750g` uten mellomrom og ingredienser uten mengde («nutmeg») |
| `northwild-kjottkaker.html` | https://northwildkitchen.com/norwegian-brown-cheese-meatballs-kjottkaker-med-brunost/ | en | Matblogg |
| `matprat-rundstykker.html` | https://www.matprat.no/oppskrifter/familien/rundstykker/ | nb | Matprat (Story 2.1): stor norsk aktør |
| `matprat-enkel-brodoppskrift.html` | https://www.matprat.no/oppskrifter/rask/enkel-brodoppskrift/ | nb | Matprat, annen oppskrift på samme site |
| `godt-amerikanske-pannekaker.html` | https://www.godt.no/oppskrifter/pannekaker-og-vafler/155/amerikanske-pannekaker | nb | Godt.no (Story 2.1) |
| `godt-grove-middagspannekaker.html` | https://www.godt.no/oppskrifter/pannekaker-og-vafler/8749/grove-middagspannekaker | nb | Godt.no, annen oppskrift på samme site |

Etter at skriptet er kjørt, noteres i kolonnen under hvilke filer som har `Recipe` i JSON-LD (se «Resultat av kjøring» nederst).

## Resultat av kjøring
Kjørt 2026-11-09 (HTTP 404/403 for to sider, som er tatt ut: `tine-kjottkaker.html` og `visitnorway-farikal.html`).

| Fil | `ld+json`-blokker | `Recipe` i JSON-LD | Form |
|---|---|---|---|
| `tine-kjottboller.html` | 1 | ja | ett objekt; `recipeYield` «16 servings», steg som `HowToStep` |
| `matprat-rundstykker.html` | 1 | ja | liste (`Recipe` alene); `recipeYield` «1 PORSJONER (1 porsjon gir ca. 20 rundstykker)» |
| `matprat-enkel-brodoppskrift.html` | 1 | ja | liste; `recipeYield` «1 PORSJONER (1 porsjon gir 3 brød i 1.5 liters former)» |
| `godt-amerikanske-pannekaker.html` | 1 | ja | liste med `BreadcrumbList` og `Recipe`; `recipeYield` 4 (tall); `HowToStep` med bilder |
| `godt-grove-middagspannekaker.html` | 1 | ja | som over; `recipeYield` 6 |
| `klikk-farikal.html` | 1 | nei | `@graph` med artikkel, ingen `Recipe` |
| `northwild-kjottkaker.html` | 1 | nei | `@graph` med artikkel, ingen `Recipe` |
| `matoppskrift-pannekaker.html` | 0 | nei | ingen JSON-LD |
| `matoppskrift-kjottkaker.html` | 0 | nei | ingen JSON-LD |
| `bbcgoodfood-lasagne.html` | 0 | nei | ingen JSON-LD i HTML-en vi fikk |
