# Kilder til testdata (oppskriftssider)

Sidene under lagres som HTML i `test/fixtures/html/` med `scripts/fetch-fixtures.sh`, slik at tester og sensor ikke er avhengige av at nettsidene er uendret. Innholdet tilhører de respektive sidene og brukes kun til testing av import.

| Fil | Kilde | Språk | Hvorfor den er med |
|---|---|---|---|
| `tine-kjottkaker.html` | https://www.tine.no/oppskrifter/middag-og-hovedretter/kjott/hjemmelagde-kj%C3%B8ttkaker | nb | Store norske aktører. På den gjengitte siden mangler porsjonsantall, og to ingredienslinjer vises uten navn |
| `tine-kjottboller.html` | https://www.tine.no/oppskrifter/middag-og-hovedretter/kjott/kjottboller-i-tomatsaus | nb | Ny test av samme site med annen oppskrift |
| `matoppskrift-pannekaker.html` | https://www.matoppskrift.no/oppskrift/pannekaker-grunnoppskrift | nb | Porsjonsantall oppgitt som «1 porsjoner», «1 dash», desimalkomma |
| `matoppskrift-kjottkaker.html` | https://www.matoppskrift.no/oppskrift/kjoettkaker-3 | nb | Eldre side, annen oppbygging |
| `visitnorway-farikal.html` | https://www.visitnorway.no/aktiviteter-og-attraksjoner/mat-og-drikke/den-norske-kokeboka/oppskrift-farikal/ | nb | Turistside med oppskrift i fritekst |
| `klikk-farikal.html` | https://www.klikk.no/mat/spise/oppskrift-pa-farikal-2530170 | nb | Magasinside |
| `bbcgoodfood-lasagne.html` | https://www.bbcgoodfoodme.com/recipes/classic-lasagne-0/ | en | Engelsk side med enheter som `750g` uten mellomrom og ingredienser uten mengde («nutmeg») |
| `northwild-kjottkaker.html` | https://northwildkitchen.com/norwegian-brown-cheese-meatballs-kjottkaker-med-brunost/ | en | Matblogg |
| `matprat-rundstykker.html` | https://www.matprat.no/oppskrifter/familien/rundstykker/ | nb | Matprat (Story 2.1): stor norsk aktør |
| `matprat-enkel-brodoppskrift.html` | https://www.matprat.no/oppskrifter/rask/enkel-brodoppskrift/ | nb | Matprat, annen oppskrift på samme site |
| `godt-amerikanske-pannekaker.html` | https://www.godt.no/oppskrifter/pannekaker-og-vafler/155/amerikanske-pannekaker | nb | Godt.no (Story 2.1) |
| `godt-grove-middagspannekaker.html` | https://www.godt.no/oppskrifter/pannekaker-og-vafler/8749/grove-middagspannekaker | nb | Godt.no, annen oppskrift på samme site |

Etter at skriptet er kjørt, noteres i kolonnen under hvilke filer som har `Recipe` i JSON-LD (se «Resultat av kjøring» nederst).

## Resultat av kjøring
Ikke kjørt ennå.
