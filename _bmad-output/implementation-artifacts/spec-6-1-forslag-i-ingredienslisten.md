# Spec 6.1: forslag i ingredienslisten

## Intent
Epic 6. Et forslag som innfører en ingrediens skal stå i ingredienslisten, også når det er et stegforslag eller et serveringsforslag. Før denne storien sto for eksempel basilikum bare i stegteksten.

## Frosset
- Reglene fra 5.10 får en ingredienslinje (`line`) også på steg- og serveringsråd som innfører noe: frisk basilikum eller oregano, pensling (egg/melk og frø), sitron eller eddik i suppe, bær og rømme til pannekaker, parmesan til pasta, poteter og råkost/agurk til servering.
- `withAppliedSuggestions` legger da til en merket linje sist i ingredienslisten i tillegg til teksten i steget eller under «Forslag til retten». Linjen tolkes og skaleres som de andre (pensling: «1 egg …»).
- Stegforslag uten ingrediens (hvile, forvarme, skylle) og forslag fra språkmodellen (uten fast plassering) gir ingen ekstra linje.
- Handlelisten tar med slike linjer når de har mengde (som i 5.11).

## Verifisering
lint, typecheck og format grønne; nye tester i `apply-suggestions.test.ts` (stegforslag, pensling med mengde, serveringsforslag, ingen linje uten ingrediens). Hele suiten kjøres med 6.2.

## Review Triage Log
Egen gjennomgang. Råd uten tydelig ingrediens fikk bevisst ingen linje, så listen ikke fylles med «salt til kokevannet» og lignende. Språkmodellforslag kan ikke plasseres uten at modellen gir linje (utsatt, se `deferred-work.md`).
