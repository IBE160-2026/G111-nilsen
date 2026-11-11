# Spec 6.5: tidtaker i kokemodus

## Intent
Epic 6 (FR-32). Tider som står i et steg blir knapper som starter en nedtelling, så Ida slipper å huske tiden eller bytte app mens hun lager maten.

## Frosset
- **Finne tider** (`src/domain/step-durations.ts`, rent domene): `findStepDurations(tekst)` finner «10 minutter», «20 min», «2 timer», «1 t», «30 sekunder», «45 sek», desimaler med komma eller punktum («1,5 time»), spenn («10–15 min», «10-15», «10 til 15»: den korteste tiden brukes), sammensatte tider («1 time og 30 minutter», «1 t 15 min») og «en halv time» / «et kvarter». Ord som bare ligner («minst», «timeglass», «mintblader») og tall uten tidsenhet gir ingenting. Tider under ett sekund eller over ett døgn hoppes over, og samme lengde nevnt flere ganger i ett steg gir én knapp. Teksten som søkes i er stegteksten med innflettede forslag.
- **Visning:** `formatTimerLabel` («10 min», «1 t 30 min», «30 sek») og `formatCountdown` («9:05», «1:30:00»).
- **Tidtaker** (`useStepTimers`): flere kan gå samtidig, også fra ulike steg. Nedtellingen regnes fra sluttidspunktet, ikke fra tikkene, så den stemmer også når nettleseren bremser en skjult side. Samme tid i samme steg kan ikke startes to ganger mens den går.
- **Kokemodus:** under stegteksten står «Start tidtaker: …» per tid. Tidtakerne står over steget («Steg 2 · 10 min», nedtelling, «Avbryt»), så de er synlige på alle steg.
- **Store flater:** «Start tidtaker» er en fylt knapp på 3,5 rem, og nedtellingen står i 3,5–6 rem, siden den leses på avstand og trykkes på med våte hender.
- **Mer eller mindre tid:** hver tidtaker har «−1 min», «+1 min» og «+5 min» (og «Avbryt»). «−1 min» går ikke under ett sekund igjen. Legges det til tid etter at den er ute, starter den på nytt fra nå og varsler igjen. Etiketten («Steg 2 · 7 min») følger den nye lengden.
- **Tiden er ute:** raden blir «Tiden er ute for steg N» (`role="alert"`, «+1 min», «+5 min», «Lukk»). Signalet er flere ledd, siden ett kan svikte: fire pip med Web Audio, og med en `<audio>`-fil (laget som WAV i koden) som reserve hvis lydkonteksten ikke er i gang; vibrasjon; et varsel fra systemet (på Mac et banner med lyd) hvis Ida har tillatt det, spurt om første gang hun starter en tidtaker; og fanetittelen blir «⏰ Tiden er ute – …». Pip og vibrasjon gjentas hvert tredje sekund til beskjeden lukkes, høyst ti ganger. Lyd og varsler låses opp i selve klikket på Start, siden nettlesere krever en handling først. Mangler støtte for noe av det, er beskjeden i siden nok.
- **Avslutter hun kokemodus**, stoppes tidtakerne og lyden lukkes. Ingenting lagres.

## Verifisering
lint, typecheck, format:check og build grønne; 110 filer og 2783 tester (domene for tider med 11 tester, 12 komponenttester med falske timere som dekker start, flere samtidig, bytte av steg, avbryt, justering av tid, tiden ute med gjentatt signal, varsel og fanetittel, `<audio>`-reserve, uten lyd og vibrasjon, avslutt); 22 e2e grønne i skyen, inkludert en egen oppskrift med «La hvile i 2 sekunder» der beskjeden kommer, mer tid legges til og tidtakeren avbrytes. Selve lyden kan ikke høres i skyen; den må prøves på Mac og telefon. Skjermbilder ved 360 og 1280 px sett, ingen vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Fikset: på 360 px brøt «Steg 2 · 10 min» over to linjer; etiketten brytes ikke lenger (beskjeden «tiden er ute» får brytes).
- Fikset: «1 time og 30 minutter.» tok med punktum i teksten; punktum og mellomrom i slutten fjernes.
- Akseptert: pipet kan ikke høres hvis telefonen står på lydløs eller nettleseren er helt i bakgrunnen; beskjeden og vibrasjonen er reservene. Skjermen holdes våken i kokemodus (Story 5.4), så siden er vanligvis i forgrunnen.
- Akseptert: tidtakerne følger kokemodus og forsvinner når den avsluttes. Å beholde dem etter avslutning krever varsler utenfor siden (PWA, Story 6.16).
- Akseptert: ved «10–15 minutter» starter tidtakeren på 10 minutter (den korteste), siden det er tid nok til å sjekke maten.
- Etter Majas test: første versjon hadde små knapper og tall, ingen måte å legge til tid på, og én kort lyd som ikke kom frem på Mac. Større flater, justering av tid, gjentatt signal, varsel fra systemet, fanetittel og `<audio>`-reserve er lagt til.
- Akseptert: en fane som har vært skjult i mer enn fem minutter kan få bremset tikkene av nettleseren (Chrome), så signalet kan komme litt etter tiden. Nedtellingen er riktig når siden vises igjen. Skjermen holdes våken, så siden er vanligvis i forgrunnen.
- Utsatt: pause, tidtaker som ikke er knyttet til et steg, og tidtaker uten kokemodus.
