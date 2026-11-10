# Spec 5.10: forslag som passer oppskriften

## Intent
Versjon 2. Uten språkmodellnøkkel viste appen tre faste eksempelforslag som var like for alle retter og ofte ikke passet («La retten hvile …» til pannekaker). Forslagene skal nå passe det oppskriften inneholder, også uten nøkkel.

## Frosset
- Ren domenefunksjon `suggestForRecipe({ title, ingredients, steps })` gir 0–3 forslag (`Suggestion`: tekst, begrunnelse, `appliesTo`) fra faste regler. Ingen nettverk, samme oppskrift gir samme svar.
- Regelgrupper etter rett: kjøttdeig/kjøttboller, gjærbakst, pannekaker/vafler, kaker, pasta, tomatsaus, ris, fisk, kylling, supper og gryter, omelett, bønner/linser/kikerter, løk, poteter. Gruppene prioriteres i den rekkefølgen; første gruppe som passer gir opptil to forslag, de neste ett hver, og er det færre enn tre fylles det opp fra gruppene som passet.
- Matching på ord i tittel og ingredienser («hvetemel» regnes som mel, «melk» som melk, «pannekake» ikke som kake). Hvert råd har en `skipWhen`: har oppskriften allerede ingrediensen eller steget (hvile, skylle, vanilje, pensle …), foreslås det ikke.
- Mock-leverandøren bruker reglene først. Gir de ingenting, brukes eksempelsettene i `test/fixtures/suggestions/` som før (id modulo antall filer). Svaret er fortsatt `isExample: true`, så «Ta i bruk», lagring og språkmodellmodus er uendret.
- Teksten i appen: merket er «Enkle forslag» (var «Eksempelforslag») og notatet sier at forslagene er laget ut fra ingrediensene og stegene og at en språkmodell gir forslag skrevet spesielt for oppskriften. README oppdatert.

## Matrise
| Oppskrift | Forslag |
|---|---|
| Grove pannekaker | hvile røren, vanilje/kardemomme, server med bær |
| Kjøttboller i tomatsaus (med ris) | gulrot/løk i deigen, la deigen hvile kaldt, klype sukker i tomatsausen |
| Rundstykker | pensle med egg og frø, grovt mel, damp i ovnen |
| Pannekaker med «hvile røren» i stegene | hopper over hvile |
| Smoothie (ingen regel) | de generelle eksempelsettene |
| Ingen eksempelmappe og ingen regel | `suggestion_failed` som før |

## Verifisering
lint, typecheck, format:check og build grønne; 90 filer og 2518 tester; 16 e2e grønne i skymiljøet. Ikke vurdert med språkmodell.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- Mock-testenes oppskrift het «Pannekaker» og traff nå reglene i stedet for eksempelfilene; endret til «Testrett».
- Kake-gruppen traff «pannekake» via sammensatt ord; utelatt for pannekake, lapper og vafler.
- Reglene er skrevet for norske ingredienslister. Engelske oppskrifter treffer få regler og faller tilbake på de generelle eksemplene.
- Utsatt: flere retter (grønnsaksretter, pizza, wok), regler som ser på antall (store mengder), engelske ord, oppdage tomme grupper i testene automatisk.
