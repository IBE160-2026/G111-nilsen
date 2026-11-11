# Spec 6.5: tidtaker i kokemodus

## Intent
Epic 6 (FR-32). Tider som står i et steg blir knapper som starter en nedtelling, så Ida slipper å huske tiden eller bytte app mens hun lager maten.

## Frosset
- **Finne tider** (`src/domain/step-durations.ts`, rent domene): `findStepDurations(tekst)` finner «10 minutter», «20 min», «2 timer», «1 t», «30 sekunder», «45 sek», desimaler med komma eller punktum («1,5 time»), spenn («10–15 min», «10-15», «10 til 15»: den korteste tiden brukes), sammensatte tider («1 time og 30 minutter», «1 t 15 min») og «en halv time» / «et kvarter». Ord som bare ligner («minst», «timeglass», «mintblader») og tall uten tidsenhet gir ingenting. Tider under ett sekund eller over ett døgn hoppes over, og samme lengde nevnt flere ganger i ett steg gir én knapp. Teksten som søkes i er stegteksten med innflettede forslag.
- **Visning:** `formatTimerLabel` («10 min», «1 t 30 min», «30 sek») og `formatCountdown` («9:05», «1:30:00»).
- **Tidtaker** (`useStepTimers`): flere kan gå samtidig, også fra ulike steg. Nedtellingen regnes fra sluttidspunktet, ikke fra tikkene, så den stemmer også når nettleseren bremser en skjult side. Samme tid i samme steg kan ikke startes to ganger mens den går.
- **Kokemodus:** under stegteksten står «Start tidtaker: …» per tid. Tidtakerne står over steget («Steg 2 · 10 min», nedtelling, «Avbryt»), så de er synlige på alle steg.
- **Tiden er ute:** raden blir «Tiden er ute for steg N» (`role="alert"`, «Lukk»). Det piper fire ganger (Web Audio, laget i det Ida trykker Start, siden nettlesere krever en handling først) og telefonen vibrerer, én gang per tidtaker. Mangler støtte for lyd eller vibrasjon, er beskjeden i siden nok.
- **Avslutter hun kokemodus**, stoppes tidtakerne og lyden lukkes. Ingenting lagres.

## Verifisering
lint, typecheck, format:check og build grønne; 110 filer og 2779 tester (domene for tider med 11 tester, 8 komponenttester med falske timere som dekker start, flere samtidig, bytte av steg, avbryt, tiden ute én gang, uten lyd og vibrasjon, avslutt); 22 e2e grønne i skyen, inkludert en egen oppskrift med «La hvile i 2 sekunder» der beskjeden kommer og kan lukkes. Skjermbilder ved 360 og 1280 px sett, ingen vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Fikset: på 360 px brøt «Steg 2 · 10 min» over to linjer; etiketten brytes ikke lenger (beskjeden «tiden er ute» får brytes).
- Fikset: «1 time og 30 minutter.» tok med punktum i teksten; punktum og mellomrom i slutten fjernes.
- Akseptert: pipet kan ikke høres hvis telefonen står på lydløs eller nettleseren er helt i bakgrunnen; beskjeden og vibrasjonen er reservene. Skjermen holdes våken i kokemodus (Story 5.4), så siden er vanligvis i forgrunnen.
- Akseptert: tidtakerne følger kokemodus og forsvinner når den avsluttes. Å beholde dem etter avslutning krever varsler utenfor siden (PWA, Story 6.16).
- Akseptert: ved «10–15 minutter» starter tidtakeren på 10 minutter (den korteste), siden det er tid nok til å sjekke maten.
- Utsatt: «+1 min» og pause, tidtaker som ikke er knyttet til et steg, og tidtaker uten kokemodus.
