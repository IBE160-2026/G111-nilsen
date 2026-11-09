# Story 1.4: legg inn en oppskrift manuelt

## 2026-11-09 kl. 11:08 — majanilsen

### Oppgave
Bygge Story 1.4 med `bmad-build`: skjema på `/ny`, første database (SQLite via Drizzle) og enkel visning på `/oppskrift/[id]` (FR-4).

### Plan
- Spesifikasjon: [spec-1-4](../../_bmad-output/implementation-artifacts/spec-1-4-legg-inn-oppskrift-manuelt.md); gjennomgått av en underagent før koding (Maja valgte det), som fant fire ting som måtte rettes først.
- Implementasjon av underagent i arbeidskopien, egen verifisering inkl. ren klone, tre uavhengige gjennomganger, triage og retting.
- Forrige økt: [story-1-3-skalering](992-2026-11-09-09-33-25-story-1-3-skalering.md).

### Resultat
- Commits: `32a08ec` (skjema, database, visning), `0122c5c` (hindre bygging av better-sqlite3 fra kildekode), `119921b` (rettelser etter gjennomgang), `d327571` (spesifikasjon og triage).
- Verifisert: lint, typecheck, format:check, 397/397 tester, bygg; ren klone med `npm ci` og `db:migrate` uten endring i låsefila; `npm start` med curl (lagring, visning, omstart).
- Nytt issue 004: npm mister `gypfile: false` for better-sqlite3 i låsefila, så `npm ci` prøver å bygge fra kildekode. Rettet i låsefila og beskyttet av `lockfile.test.ts`.
- Gjennomgang: 22 saker; 13 rettet, 2 utsatt (sidetittel, ekte 404-status), 7 avvist (3 falske fordi diffen utelot låsefil og migrasjonsmetadata).
- Ikke verifisert i ekte nettleser (ingen nettleser i KI-miljøet): fokus, deaktivert knapp og skjermbilde på 360 px.

### Åpne punkter
- Test skjemaet i nettleseren på Macen (fokus på første feil, verdier beholdes, lagring) og ta skjermbilde på 360 px.
- Hvis `npm install <pakke>` kjøres: sjekk at `gypfile: false` står i låsefila (lockfile-testen feiler ellers).
- Story 1.5: sidetittel fra oppskriften og ekte 404-status (deferred-work.md).
- Neste: Story 1.5 (se oppskriften i fast format og velg antall personer).

## 2026-11-09 kl. 11:19 — majanilsen

### Oppgave
Manuell test av Story 1.4 i nettleseren: en pannekakeoppskrift kopiert fra tine.no ga ingredienser som «½ tssalt» og «6 dlTINE® Lettmelk», og «Tips» havnet blant stegene.

### Plan
- Undersøke lagrede data: enhet og navn manglet mellomrom i innlimt tekst; «Tips» var del av innlimt tekst.
- Rette tolkeren med `bmad-build` (kort løp): [spec-gh-005](../../_bmad-output/implementation-artifacts/spec-gh-005-enhet-klistret-pa-navn.md), én uavhengig gjennomgang.

### Resultat
- Commits `3bd7b41` (tolking av klistret enhet) og `1effc17` (issue 005, spesifikasjon, triage).
- Verifisert: lint, typecheck, format:check, 430/430 tester, bygg.
- Gjennomgang: 8 funn; 5 rettet, 3 avvist.

### Åpne punkter
- Pannekakeoppskriften må legges inn på nytt (lagrede data endres ikke).
- Redigering av oppskrifter finnes ikke i PRD-en; avgjør om det skal inn (avdekket av «Tips»-linjene).
