# Spec 6.9: sortering av oppskriftene

## Intent
Epic 6 (FR-34). Ida vil sortere Oppskrifter på flere måter.

## Frosset
- **Valg:** Sist lagret (standard, som fra serveren), Sist laget (aldri laget sist), Mest laget (flest «Laget i dag» først), Høyest vurdering (uvurdert sist) og Alfabetisk (norsk rekkefølge, Æ, Ø og Å til slutt, uavhengig av store og små bokstaver).
- **Tiebreak:** like verdier beholder rekkefølgen sist lagret (stabil sortering).
- **Hvor:** ren funksjon `sortCollection` i domenet, brukt i `CollectionBrowser` etter filtreringen. Valget gjelder treffene og beholdes ved «Nullstill søk». Valget lagres ikke mellom besøk.
- **Data:** oppsummeringene har nå `lastCookedAt` og `cookedCount` (ingen ny migrasjon).

## Verifisering
lint, typecheck, format:check og build grønne; 118 filer og 2901 tester (sortering i domenet og i komponenten, oppsummeringene); 30 e2e grønne, med alfabetisk sortering og tilbake til sist lagret. Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Valgt: sortering i nettleseren på listen siden allerede har lest, som søket og filtrene.
- Valgt: «Høyest vurdering» tatt med her, siden vurderingen kom i 6.8.
- Akseptert: sorteringen huskes ikke til neste besøk.
- Utsatt: å velge synkende eller stigende rekkefølge.
