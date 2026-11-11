# Spec 6.13: tilfeldig middagsforslag

## Intent
Epic 6. Ida vil la appen velge en tilfeldig middag fra samlingen.

## Frosset
- **Side:** `/middagsforslag` med overskrift utenfor Suspense; data fra `listCollection` etter `connection()`. Lenke «Middagsforslag» ved overskriften i Oppskrifter. All tekst i `dinnerMessages`. Ingen migrasjon.
- **Domene (rene funksjoner):** `dinnerCandidates` (filter: bare favoritter, høyeste tid 30 eller 60 min; oppskrifter uten tid faller ut når tid er valgt) og `pickDinner(candidates, previousId, random)` som hopper over forrige så lenge det finnes flere, og gir den eneste ellers.
- **Trekning:** i klientkomponenten `DinnerSuggester` ved klikk, aldri under visning. Et forslag vises bare så lenge det fortsatt passer filteret.
- **Visning:** antall å velge blant, knapp «Foreslå en middag»/«Foreslå en annen», kort med tittel, tid og «Åpne oppskriften». Ingen treff gir forklaring uten knapp.

## Verifisering
lint, typecheck, format:check og build grønne; 130 filer og 3018 tester; 38 e2e grønne. Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Funnet og rettet: e2e fant to avkrysningsfelt «Bare favoritter» (skjult Oppskrifter-side under Activity); testen bruker rolle-spørring som bare ser synlige elementer.
- Valgt: ingen tilfeldighet under rendering (renhet), trekning ved klikk.
- Utsatt: «ikke samme som sist uke», vekting etter vurdering, å kombinere med «Hva kan jeg lage?».
