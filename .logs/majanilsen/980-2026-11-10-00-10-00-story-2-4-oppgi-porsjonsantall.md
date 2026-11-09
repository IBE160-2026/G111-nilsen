# Story 2.4: oppgi porsjonsantall når kilden mangler det

## 2026-11-10 kl. 00:10 — majanilsen

### Oppgave
Story 2.4 (FR-3, UX-DR13): dialogen «Hvor mange er oppskriften laget for?» når antall mangler, og «oppr. N · endre» for å endre det opprinnelige antallet.

### Plan
- Spesifikasjon: [spec-2-4](../../_bmad-output/implementation-artifacts/spec-2-4-oppgi-porsjonsantall.md).
- Bygge på felles `Dialog` og `ServingStepper`; ny Server Action, service og repo-funksjon. Egen gjennomgang og kjøring i Chromium i stedet for tre underagenter (for å spare økta).
- Forrige økt: [story-2-3](981-2026-11-09-22-55-00-story-2-3-forsta-hvorfor-import-feilet.md).

### Resultat
Commit for Story 2.4.
- `ServingsDialog` åpnes når antall mangler (fokus i feltet, tastatur, Escape, fokusfelle); «Avbryt» lar oppskriften stå uskalert med knappen «Oppgi antall personer». «oppr. N · endre» åpner samme dialog. Lagringen (`changeOriginalServings`) gjelder lagret og ulagret oppskrift, nullstiller valgt antall og røres ikke `updatedAt`.
- Funn i egen gjennomgang: en dialog som åpner av seg selv kunne bli stående modal når siden skjules av `<Activity>`. `Dialog` lukker nå stille ved skjuling og åpner igjen ved visning (test).
- Verifisert i Chromium mot dev-server: åpning med fokus, Escape, ny åpning, lagring til «oppr. 6» som består etter omlasting, «endre», ingen konsollfeil.
- lint, typecheck, format og build grønne; 2164 tester i 73 filer; lock-filene uendret.

### Åpne punkter
- Test i nettleseren på Macen: importer en side uten porsjonsantall (eller sett antall til null), sjekk dialogen på 360 og 1280 px, lys og mørk, 200 % zoom, og «oppr. N · endre».
- Utsatt: redigeringsskjemaet krever fortsatt antall for importerte uten antall; ingen uavhengige gjennomganger for 2.4.
