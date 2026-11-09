# 004 – better-sqlite3 bygges fra kildekode ved `npm ci` i ny klone

| | |
|---|---|
| **Status** | Løst (med vakt-test) |
| **Funnet** | 2026-11-09, ved verifisering av Story 1.4 |
| **Løst** | 2026-11-09 (Story 1.4) |
| **Område** | lagring |
| **Alvorlighet** | høy |

## Hva skjedde
`npm install better-sqlite3@13.0.3` virket i arbeidskopien. Men `npm ci` (og `npm install`) i en ny klone kjørte `node-gyp rebuild` for better-sqlite3 og feilet i KI-miljøet, fordi node-gyp prøver å laste ned Node-headere fra nodejs.org. På en maskin uten C++-byggverktøy (Xcode Command Line Tools, Visual Studio Build Tools) ville installasjonen feilet på samme måte, og sensor kunne ikke startet appen.

## Hvordan gjenskape
1. Fjern `"gypfile": false` fra `node_modules/better-sqlite3` i `package-lock.json`.
2. Commit endringen (eller kopier låsefila inn i klonen etter steg 3).
3. `git clone` til ny mappe.
4. Kjør `npm ci` i klonen.
5. npm kjører `node-gyp rebuild` for better-sqlite3.

## Årsak
better-sqlite3 13 leverer ferdigbygde binærfiler for macOS, Linux og Windows i pakken og har `"gypfile": false` i sin `package.json` for å slå av automatisk bygging. npm (10.9) lagrer ikke feltet `gypfile` i `package-lock.json`. Når npm installerer fra låsefila, ser den bare `binding.gyp` i pakken og legger til `node-gyp rebuild` som installasjonsskript.

## Løsning / hva kan endres
- `"gypfile": false` er lagt inn manuelt i oppføringen for better-sqlite3 i `package-lock.json`. Da hopper npm over byggingen, og de ferdigbygde binærfilene brukes.
- npm fjerner feltet igjen når den skriver låsefila på nytt (f.eks. ved `npm install <pakke>`). Testen `src/server/db/lockfile.test.ts` feiler da, og kommentaren i testen har kommandoen som legger feltet inn igjen.
- README beskriver hva man gjør hvis better-sqlite3 likevel ikke installerer.

## Lærdom / prompt
Test alltid installasjon i en ren klone (`npm ci`), ikke bare i arbeidskopien der pakken ble lagt til. Vakt-testen dekker regresjonen.
