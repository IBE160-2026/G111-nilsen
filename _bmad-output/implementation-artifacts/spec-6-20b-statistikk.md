# Spec 6.20b: statistikk over samlingen

## Intent
Epic 6. Ida vil se hva hun lager oftest, og hva som bare blir liggende.

## Frosset
- **Ingen nye data og ingen migrasjon.** Alt regnes ut av det som allerede lagres: «Laget i dag» (`cookedCount`, `lastCookedAt`), vurdering, favoritt, mappe, merkelapper, kilde, tid og ukemenyen.
- **Domene (ren funksjon `collectionStats`)**: nøkkeltall (antall, ganger laget til sammen, laget minst én gang, aldri laget, favoritter, antall vurderte), snitt av vurdering med én desimal og snitt av tid i hele minutter (`null` når ingen har verdien), og topplistene «laget oftest», «sist laget» og «best vurdert» (høyst 5, like verdier sortert på tittel på norsk). Mapper, merkelapper og kilder telles som navn med antall; oppskrifter uten mappe telles som «Uten mappe». Ukemenyen gir antall planlagte måltider og hva som er planlagt oftest. Funksjonen endrer ikke listen den får inn.
- **Tjeneste:** `listPlannedTitles(userId)` gir titlene på alle planlagte måltider.
- **Side `/statistikk`:** overskrift utenfor Suspense, data etter `connection()`. Nøkkeltall i fire ruter, så snittene på én linje, så kort med listene. Titlene i topplistene lenker til oppskriften. Uten oppskrifter vises tom-tilstanden, uten innlogging innloggingskravet. Lenke fra Oppskrifter og fra «Og dessuten» på forsiden. All tekst i `statsMessages`.
- **Utenfor denne storyen:** grafer, valg av tidsrom, statistikk per uke eller måned, og hvor mye av handlelisten som blir krysset av.

## Verifisering
lint, typecheck, format:check og build grønne; 152 filer og 3154 tester (10 for domenefunksjonen, 6 for siden); 50 e2e grønne, med et løp som krysser av «Laget i dag» tre ganger og finner oppskriften igjen i «Laget oftest». Sett ved 390 og 1280 px.

## Review Triage Log
Egen gjennomgang.
- Funnet og rettet: arbeidskopien inneholdt en halvferdig, ubrukt statistikkmodul (`src/domain/statistics.ts`, `statisticsMessages`, en dobbel lenke i Oppskrifter og en e2e-test for en side som ikke fantes). Den var ikke i git og ikke på maskinen. Fjernet, så det bare finnes én statistikkmodul.
- Funnet og rettet: `aria-labelledby` med en id som inneholdt mellomrom (tittelen) ga kort uten tilgjengelig navn; kortene bruker `aria-label`.
- Funnet og rettet: e2e kunne treffe oppskriftskortet i stedet for lenken «Statistikk», fordi oppskriftens tittel inneholdt ordet; testen bruker eksakt navn og en annen tittel.
- Valgt: snittvurdering og snittid på én linje under nøkkeltallene i stedet for inne i kortene, der de hørte dårlig hjemme.
- Akseptert: «ganger laget» teller bare det brukeren selv har krysset av.
