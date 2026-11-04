# 002 – npm-registeret er blokkert i KI-utviklingsmiljøet

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-04 |
| **Løst** | 2026-11-04 |
| **Område** | prosess |
| **Alvorlighet** | høy |

## Hva skjedde
Under arkitekturarbeidet skulle pakkeversjoner sjekkes med `npm view`. Både skymiljøet og shellet på den lokale maskinen som KI-assistenten bruker, fikk `403 Forbidden` fra `registry.npmjs.org`. Det betyr at KI-assistenten ikke kan kjøre `npm install`, tester eller dev-server selv.

## Hvordan gjenskape
1. Kjør `npm view next version` fra KI-assistentens shell.
2. Svaret er `403 Forbidden` (sikkerhetsregel for nettverkstilgang).

## Årsak
Nettverkstilgangen i KI-miljøet er begrenset til en liste med tillatte domener, og npm-registeret er ikke med.

## Løsning / hva kan endres
- Pakkeversjoner (utenom Next.js) er ikke låst i arkitekturen; de låses i `package-lock.json` ved første `npm install`.
- Inntil tilgang er på plass: KI-assistenten skriver koden, og `npm install`, `npm test` og `npm run dev` kjøres i egen Terminal. Resultatet limes tilbake i økten.
- Alternativ: legg `registry.npmjs.org` til i tillatte domener for KI-miljøet, hvis innstillingene tillater det.

## Lærdom / prompt
Sjekk tidlig at utviklingsmiljøet kan installere pakker, før byggingen planlegges.

## Oppfølging 2026-11-04
Nettverkstilgangen ble endret i Claude-innstillingene. Shellet på maskinen når nå `registry.npmjs.org` (`npm view next version` gir 16.4.5) og `github.com`. Installasjon og tester kjøres der, i en egen arbeidskopi slik at prosjektmappen ikke får Linux-versjoner av `node_modules`.
