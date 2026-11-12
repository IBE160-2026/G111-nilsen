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

## Designrunde 2026-11-12
Siden var teknisk riktig, men kjedelig: innholdet lå som en tynn stripe øverst til venstre, og resten av skjermen var tom. Endret uten å endre oppførselen:
- Sentrert komposisjon (overskrift, ingress, filtre, kort, knapp) i en kolonne på maks 34 rem.
- Filtrene er pillevalg i stedet for avkrysningsboks og nedtrekksliste: «Bare favoritter» er fortsatt en `checkbox`, tidsvalgene en radiogruppe med «Alle», «Opptil 30 min» og «Opptil 60 min». Inndatafeltene er skjult visuelt, men er i tabrekkefølgen, har synlig fokusring og valgt tilstand vises som fylt pille (ikke farge alene).
- Et fast kort er sidens midtpunkt. Før trekningen: stiplet kort med en kortstabel og «Middagen venter». Etter: «FORSLAG», tittelen i serif, tid, mappe, stjerner og merkelapper, og «Åpne oppskriften». Ingen treff: samme kort med forklaringen.
- Kortet tones inn ved hver trekning (`prefers-reduced-motion` slår det av).

## Review Triage Log
Egen gjennomgang.
- Funnet og rettet: e2e fant to avkrysningsfelt «Bare favoritter» (skjult Oppskrifter-side under Activity); testen bruker rolle-spørring som bare ser synlige elementer.
- Valgt: ingen tilfeldighet under rendering (renhet), trekning ved klikk.
- Utsatt: «ikke samme som sist uke», vekting etter vurdering, å kombinere med «Hva kan jeg lage?».
- Funnet i designrunden: kortet hadde ingen informasjon utover tittel og tid; det viser nå også mappe, vurdering og merkelapper, som allerede lå i dataene siden leste.
