# 949 – Ryddigere kokemodus-skjerm

## Oppgave
Steg-skjermen i kokemodus så rotete ut etter tidtakeren (Story 6.5).

## Plan
- «Start tidtaker» som rolig knapp med omriss i stedet for en stor fylt blokk.
- «Test lyden» bare der steget har tid eller en tidtaker går.

## Resultat
- `CookingMode.module.css`: `.startTimer` er nå utlinjet (1 px kant, hvit flate, aksentfarget tekst).
- `CookingMode.tsx`: «Test lyden» ligger under tidsknappene og vises bare når `durations` eller `timers` finnes.
- Tester og e2e justert (Test lyden på steg med tid). Sjekket med skjermbilde ved 360 og 1280 px.

## Åpne punkter
- Test på telefon gjenstår.
