# Spec 6.18b: snarveier til de mindre sidene på forsiden

## Intent
Epic 6. «Hva kan jeg lage?», Middagsforslag, Deling, Eksport og import og Nylig slettet nås bare fra lenkeraden ved overskriften i Oppskrifter. De er lette å gå glipp av.

## Frosset
- **Hvor:** forsiden, i seksjonen «Gå rett til», under de seks kortene: overskrift `h3` «Og dessuten» og en rad med pillelenker som brytes over flere linjer når det er trangt.
- **Hvilke:** `/hva-kan-jeg-lage`, `/middagsforslag`, `/delt`, `/sikkerhetskopi`, `/nylig-slettet`. Handlelisten er ikke med: den har sitt eget kort rett over og står i toppmenyen.
- **Uendret:** lenkeraden ved overskriften i Oppskrifter, og toppmenyen.
- Tekst og rekkefølge i `homeMessages.shortcuts`. Ingen migrasjon, ingen ny side.

## Verifisering
lint, typecheck, format:check og build grønne; 150 filer og 3135 tester; 48 e2e grønne (forsidetesten teller lenkene i «Gå rett til» og følger «Middagsforslag»). Sett ved 390 og 1280 px.

## Review Triage Log
Egen gjennomgang.
- Valgt: piller i stedet for flere kort, så de seks hovedkortene fortsatt er det første øyet treffer.
- Funnet og rettet: «Lag handleliste» var først med, men pekte samme sted som kortet rett over; fjernet.
- Utsatt: å la brukeren velge hvilke snarveier som vises.
