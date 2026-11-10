# 010 – Skjult forrige side ga to felt med samme id

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-10, av Claude (ende-til-ende-test for innlogging) |
| **Løst** | 2026-11-10 (Story 5.13) |
| **Område** | annet (innlogging) |
| **Alvorlighet** | middels |

## Hva skjedde
Fra «Logg inn» trykket man «Lag konto» og fylte inn e-post og passord, men skjemaet svarte «Skriv en gyldig e-postadresse». E-posten ble skrevet i et felt man ikke så.

## Hvordan gjenskape
1. Åpne `/logg-inn`.
2. Trykk «Lag konto» (navigering i appen, ikke ny side).
3. Fyll inn e-post og passord og trykk «Lag konto».

## Årsak
Next beholder forrige side skjult i DOM-en (`cacheComponents`, `<Activity>`). Begge skjemaene hadde feltet `id="email"`, og etiketten på den nye siden pekte på det skjulte feltet. KI-generert kode brukte faste id-er slik resten av skjemaene i appen gjør.

## Løsning / hva kan endres
`AccountForm` bruker `useId()`, så hvert skjema har egne id-er. E2e-testene finner feltene med `field(page, …)`, som bare ser på synlige felt. Skjemaet «Legg inn selv» har fortsatt faste id-er; det er bare ett slikt skjema om gangen, men samme løsning bør brukes der hvis to sider med skjemaet kan ligge samtidig.

## Lærdom / prompt
«Gi skjemafelt unike id-er med `useId()`; med `cacheComponents` kan forrige side ligge skjult i DOM-en.» Dekkes av e2e-testen «Versjon 2: innlogging».
