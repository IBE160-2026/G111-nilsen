# Spec 6.12: Hva kan jeg lage? ut fra «Har hjemme»

## Intent
Epic 6. Ida vil se hvilke oppskrifter hun kan lage ut fra det hun har hjemme.

## Frosset
- **Treffregel (ren domenefunksjon `matchPantry`):** en ingrediens er hjemme når alle ordene i en «Har hjemme»-oppføring finnes som hele ord i ingrediensen (uavhengig av store/små bokstaver og aksenter, via `normalizeSearch`). Ingrediensnavnet tas ut med `ingredientLabel` (navn hvis lesbart, ellers hele linja); like navn telles én gang.
- **Utvalg og rekkefølge:** oppskrifter uten noe hjemme vises ikke. Gruppene er «Kan lages nå» (mangler 0), «Mangler 1–2 ting» og «Mangler flere ting». Sortert etter færrest manglende, flest har, tittel (nb), id.
- **Data:** samme «Har hjemme»-liste som handlelisten (`listPantry`, `addToPantry`, `removeFromPantry`). Oppskrifter fra `listShoppingRecipes`. Ingen migrasjon.
- **Visning:** side `/hva-kan-jeg-lage` med overskrift utenfor Suspense, klientkomponent `WhatToCook` med live treff, kort som lenker til oppskriften med «Har x av y» og «Mangler: …». Lenke «Hva kan jeg lage?» ved overskriften i Oppskrifter. All tekst i `whatToCookMessages`.
- Klientlisten nullstilles når serverdata endres (samme mønster som SavedLists og TrashList).

## Verifisering
lint, typecheck, format:check og build grønne; 127 filer og 2999 tester; 36 e2e grønne, med nytt løp for siden. Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Funnet og rettet: sidetesten for Oppskrifter ekskluderte ikke den nye lenken i et lenkefilter.
- Valgt: hele ord i stedet for delstreng, så «egg» ikke treffer «eggplomme»-feil og «ris» ikke treffer «paprika».
- Utsatt: sammensatte ord (f.eks. «helmelk» treffer ikke «melk»).
- Utsatt: å ignorere basisvarer som salt og vann i «mangler».
