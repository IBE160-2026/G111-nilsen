# Spec 6.21b: angre «Laget i dag» og snarvei til statistikken

## Intent
Epic 6. Ida trykker «Laget i dag» ved en feil og må kunne ta det tilbake. Hun skal også komme til statistikken rett fra oppskriften.

## Frosset
- **Angre bare rett etter:** «Angre» vises ved siden av «Laget i dag» først etter at hun har trykket den i denne økten, og forsvinner etter bruk eller ved ny innlasting. Ingen historikk over enkeltdatoer lagres, så det er ingen migrasjon.
- **Datoen kommer fra siden:** komponenten husker datoen oppskriften hadde før trykket og sender den tilbake. Serveren validerer den på nytt (tekst, høyst 40 tegn eller `null`, gyldig dato) fordi Server Actions er offentlige.
- **Tjeneste `undoRecipeCooked(id, previousAt)`:** teller ned med én og setter «sist laget» tilbake. Når antallet blir 0, blir datoen `null` uansett hva som sendes inn. Ikke laget fra før, ukjent eller ulagret oppskrift gir `not_found`; ugyldig dato gir `validation`. Antallet går aldri under 0.
- **Action `undoCookedToday`:** `mayChange` som de andre; revaliderer `/oppskrifter` og `/statistikk`. `markCookedToday` revaliderer nå også `/statistikk`.
- **Snarvei:** lenken «Se statistikk» står under «Sist laget …»-linjen i Notater-kortet og går til `/statistikk`. All tekst i `notesMessages` (`undo`, `undoDone`, `seeStats`).
- **Utenfor denne storyen:** angre etter at siden er lastet på nytt, og å velge dato bakover i tid.

## Verifisering
lint, typecheck, format:check og build grønne; nye tester for tjenesten (2), actionen (1) og komponenten (3); e2e-løpet for statistikk krysser av tre ganger, angrer én, krysser av igjen og går videre via «Se statistikk».

## Review Triage Log
Egen gjennomgang.
- Valgt: lagre forrige dato i komponenten i stedet for en logg i databasen, så det ikke trengs migrasjon for en angre-knapp.
- Valgt: ved siste angring settes datoen til `null` på serveren, så en feil dato fra klienten ikke kan gi «laget 0 ganger, sist laget i går».
- Akseptert: åpner man oppskriften i to faner, kan «Angre» i den ene bruke en gammel dato; antallet er likevel riktig, siden det telles ned på serveren.
