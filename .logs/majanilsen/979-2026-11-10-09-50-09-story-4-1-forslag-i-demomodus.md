# Story 4.1: få forslag i demomodus

## 2026-11-10 kl. 09:50 — majanilsen

### Oppgave
Story 4.1 (FR-10, FR-12, UX-DR7, AD-5): «Få forslag» på en oppskrift gir 1–3 forslag med begrunnelse. Uten språkmodellnøkkel er de eksempelforslag fra `test/fixtures/suggestions/`, merket «Eksempelforslag». Henting viser plassholdere og «Lager forslag …»; feil gir en norsk melding mens resten av siden virker.

### Plan
- Spesifikasjon: [spec-4-1](../../_bmad-output/implementation-artifacts/spec-4-1-forslag-i-demomodus.md).
- Port `SuggestionProvider` med zod-skjemaet `Suggestion`, mock-adapter, `suggestion-service`, Server Action `requestSuggestions`, komponenten `SuggestionsSection` på oppskriftssiden. Egen gjennomgang i stedet for tre underagenter (for å spare økta).
- Forrige økt: [story-2-4](980-2026-11-10-00-10-00-story-2-4-oppgi-porsjonsantall.md). Repoet ble hentet fra GitHub etter at Maja hadde pushet de syv commitene (`013c4b1..7155096`); de lå ikke på GitHub ved starten av økta.

### Resultat
Commit for Story 4.1 (kode) og denne loggen i egen commit.
- Nye filer: port og skjema (`ports/suggestion-provider.ts`), `adapters/mock-suggestions.ts`, `services/suggestion-service.ts`, `SuggestionsSection` (+ CSS), tre eksempelsvar i `test/fixtures/suggestions/`. Endret: domenetyper, `config.ts` (`suggestionMode`), `messages.ts` (ny tekst for `suggestion_failed` og `suggestionMessages`), `actions.ts`, `RecipeView` (rutenett med forslagsdel mellom ingredienser og steg på smal skjerm, under begge kolonner fra 768 px).
- Funn i egen gjennomgang, alle rettet: manglende `role="group"` på forslagene, statusfelt som ikke var i dokumentet fra start, tre Turbopack-advarsler om dynamisk filsystemtilgang i mock-adapteren (`turbopackIgnore`).
- Forslag lagres ikke og kan ikke tas i bruk ennå (Story 4.2); språkmodell kommer i 4.3. Med nøkkel satt brukes mock til 4.3.
- lint, typecheck, format og build grønne (build uten advarsler); 2221 tester i 77 filer (57 nye); lock-filene uendret. Ikke kjørt i nettleser (skymiljøet har ingen).
- Levering: skymiljøet kunne ikke sende filer til Macen (verktøyene `device_stage_files`/`device_commit_files` fantes ikke i økta), så endringene ble overført som patch og lagt inn på Macen.

### Åpne punkter
- Test «Få forslag» i nettleseren på Macen (360 og 1280 px, lys og mørk, 200 % zoom): plassholdere, «Eksempelforslag»-merket, fokus på forslagene, feilmelding. Kjør npm test (2221 grønne).
- Utsatt (spec-4-1 og deferred-work.md): `llm`-modus bruker mock til 4.3; grense mot gjentatte kall til språkmodellen; visuell rekkefølge på smal skjerm vs. dokumentrekkefølge; ingen uavhengige gjennomganger.
