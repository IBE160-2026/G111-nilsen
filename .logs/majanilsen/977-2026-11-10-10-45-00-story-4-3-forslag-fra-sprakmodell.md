# Story 4.3: forslag fra språkmodell

## 2026-11-10 kl. 10:45 — majanilsen

### Oppgave
Story 4.3 (FR-10, AD-5, AD-9, AD-11): med `LLM_API_KEY` lages forslag av en språkmodell for den aktuelle oppskriften. Svaret valideres med samme skjema som mock; feil gir `suggestion_failed`. Testene bruker lagrede svar. `.env.example` og README beskriver nøkkelen.

### Plan
- Spesifikasjon: [spec-4-3](../../_bmad-output/implementation-artifacts/spec-4-3-forslag-fra-sprakmodell.md).
- Modellvalg logget i arkitekturens `.memlog.md`: Anthropic Messages API via `fetch`, standard `claude-haiku-5-5`, `LLM_MODEL` overstyrer. Maja svarte ikke på valg av leverandør, så jeg tok en standard som er lett å bytte.
- Ny adapter `llm-suggestions.ts`, `providerFor` med innstillinger, README-avsnitt «Forslag», lagrede svar i `test/fixtures/llm/`. Egen gjennomgang i stedet for underagenter.
- Forrige økt: [story-4-2](978-2026-11-10-10-15-54-story-4-2-ta-i-bruk-forslag.md). Story 4.2 ble lagt inn på Macen (`332e896`, `002452c`); pushes av Maja.

### Resultat
- Adapteren sender tittel, ingredienslinjer og steg, tolker JSON (også i kodeblokk), har 20 s tidsavbrudd og maks 10 kall i minuttet, og lekker ikke nøkkel eller API-svar.
- `providerFor("llm")` gir språkmodell-adapteren med nøkkel, ellers mock.
- lint, typecheck, format og build grønne; 2303 tester i 79 filer (17 nye); lock-filene uendret.
- Ikke prøvd mot ekte API.

### Åpne punkter
- Maja: lag en API-nøkkel hos Anthropic, sett `LLM_API_KEY` i `.env.local`, prøv 3–5 oppskrifter og vurder om forslagene er konkrete og trygge. Si fra hvis du vil ha en annen leverandør.
- Test «Få forslag» uten og med nøkkel i nettleseren (360 og 1280 px, lys og mørk, 200 % zoom); kjør npm test (2303 grønne).
- Utsatt (spec-4-3, deferred-work.md): ikke prøvd mot ekte API; grensen i minnet; ingen uavhengige gjennomganger.
