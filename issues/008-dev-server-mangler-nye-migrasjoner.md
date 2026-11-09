# 008 – Dev-serveren manglet nye migrasjoner («no such table: folders»)

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-09, Maja (testing av Story 3.3 i nettleseren) |
| **Løst** | 2026-11-09 (commit i Story 3.3-oppfølgingen, se sesjonsloggen) |
| **Område** | lagring |
| **Alvorlighet** | middels |

## Hva skjedde
Etter Story 3.3 viste `/mapper` «Noe gikk galt», og Next-overlayet viste `SqliteError: no such table: folders`. Databasefila hadde bare migrasjon 0000 (ingen `folders`, og heller ikke 0001).

## Hvordan gjenskape
1. Start `npm run dev` og åpne en side som bruker databasen.
2. Hent inn en ny migrasjon (ny story) mens serveren fortsatt går.
3. Åpne en side som bruker den nye tabellen.

## Årsak
`getDb()` mellomlagrer tilkoblingen på `globalThis` (for å overleve hot reload), og migrasjonene kjøres bare når tilkoblingen først åpnes. En dev-server som ble startet før migrasjon 0001/0002 fantes, fikk dem aldri. Ikke en feil i migrasjonene selv; de kjører riktig på en fersk database.

## Løsning / hva kan endres
`getDb()` sammenligner nå antall oppføringer i `drizzle/meta/_journal.json` med antallet da tilkoblingen ble åpnet, og kjører migrasjonene på nytt når tallet har endret seg (bare utenfor produksjon, via `config.isProduction`, slik at AD-9 holdes). Test i `client.test.ts` simulerer en database som mangler 0001/0002. Å starte dev-serveren på nytt fungerer også.

## Lærdom / prompt
Mellomlagrede ressurser i dev må tåle at koden endres under kjøring. Neste gang en story legger til migrasjon: si fra om å starte dev-serveren på nytt, og ha en test som dekker «databasen er eldre enn koden».
