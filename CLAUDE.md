## Sesjonslogg

Når en oppgave eller økt avsluttes, før sluttoppsummeringen, bruk `sesjonslogg`-skillen: dokumenter Oppgave + Plan + Resultat + åpne punkter i `.logs/<bruker>/`, og før åpne punkter i `.logs/<bruker>/issues.md`. Skillen committer loggfila lokalt; push gjør du selv. Gruppens egne regler for commit og språk gjelder foran dette.

## Issues (feil underveis)

Feil og problemer som oppstår underveis, og hva som kan endres, dokumenteres som én fil per sak i `issues/` (mal: `issues/_mal.md`, oversikt: `issues/README.md`). Opprett en sak når du finner en feil i KI-generert kode, en importfeil, en bug i testing eller et avvik fra PRD/arkitektur, og oppdater oversikten.

## Prosess

- Planlegging følger BMAD: product brief → PRD → UX/arkitektur → epics og stories → implementasjon. PRD skal være ferdig før design. Planleggingsdokumenter ligger i `_bmad-output/`.
- Commit i små, avgrensede steg med beskrivende meldinger. Push gjør brukeren (eller etter eksplisitt ønske).
- Skriv aldri hemmeligheter (API-nøkler, `.env`) til repoet. Bruk `.env.example`.
- Kjernefunksjoner (import, skalering, lagring) skal virke uten LLM-nøkkel. Eksempelsider lagres som testdata.
