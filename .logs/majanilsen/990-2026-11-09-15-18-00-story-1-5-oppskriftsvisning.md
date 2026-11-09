# Story 1.5: se oppskriften i fast format og velg antall personer

## 2026-11-09 kl. 12:00 — majanilsen

### Oppgave
Bygge Story 1.5 med `bmad-build`: fast visning av oppskriften på `/oppskrift/[id]` og porsjonsvelger som skalerer ingrediensene (FR-5, FR-6, FR-7).

### Plan
- Spesifikasjon: [spec-1-5](../../_bmad-output/implementation-artifacts/spec-1-5-se-oppskrift-og-velg-antall.md).
- Implementasjon av underagent i arbeidskopien, egen verifisering, tre uavhengige gjennomganger, triage og retting.
- Forrige økt: [story-1-4](991-2026-11-09-10-08-43-story-1-4-manuell-innlegging.md).

### Resultat
- Commits: `31abf37` (visning, porsjonsvelger, skalering i klienten) og `7b27741` (rettelser etter gjennomgang).
- Verifisert: lint, typecheck, format:check, 480/480 tester, bygg; `package-lock.json` uendret.
- Gjennomgang: 16 funn; 6 rettet, 1 utsatt, 9 avvist.
- Skalering regnes alltid fra de lagrede originalene (AD-2); ingenting sendes til serveren når antallet endres.
- Fanetittel fra oppskriften; ukjent id gir standardtittelen.

### Åpne punkter
- Test porsjonsvelgeren i nettleseren på Macen (skriv antall, −/+, tilbakestill) og ta skjermbilder på 360 og 1280 px i lys og mørk modus; sjekk også 768 px og 200 % tekststørrelse.
- Tastaturfokus forsvinner når − blir deaktivert ved 1 (`disabled`); vurder `aria-disabled`.
- Ukjent id gir bare standardtittel; ekte 404-status er utsatt (deferred-work.md).
- Neste: Story 1.6 (avkrysning og README for Epic 1), deretter Epic 3.
