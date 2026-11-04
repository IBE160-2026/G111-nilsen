# Oppsett: BMAD i repoet og issues-mappe

## 2026-11-04 kl. 18:06 — majanilsen

### Oppgave
Forstå RecipeMate-prosjektet (IBE160, del 1) ut fra sensorveiledning, product-brief og tilbakemelding. Gjøre repoet klart for planlegging (issues-mappe, BMAD inne i repoet, sesjonslogg) og gjøre research før torsdag 2026-11-05 med oversikt over hva som må avklares.

### Plan
- Lese sensorveiledning, `product-brief.md`, `tilbakemelding-product-brief.md` (ikke endret) og `CLAUDE.md`.
- Flytte BMAD (`_bmad/`, `_bmad-output/`, BMAD-skills i `.claude/skills/`) fra kursmappen inn i `G111-nilsen`.
- Lage `issues/` for feil underveis og hva som kan endres (mal + oversikt).
- Sette git-identitet lokalt i repoet.
- Research: konkurrenter, schema.org-oppskriftsdata, `recipe-scrapers`, ingrediensparsing, KI som reserve for import. Skrive resultatet til `_bmad-output/planning-artifacts/research-og-avklaringer.md`.

### Resultat
- BMAD flyttet inn i repoet; 30 skills i `.claude/skills/`; `_bmad-output/.gitkeep` opprettet.
- Ny mappe `issues/` med `README.md`, `_mal.md` og `001-bmad-utenfor-repo.md`. `CLAUDE.md` utvidet med «Issues» og «Prosess».
- Git `user.name`/`user.email` satt lokalt i repoet (ikke globalt). Loggmappen heter `.logs/majanilsen/`.
- Ny fil `_bmad-output/planning-artifacts/research-og-avklaringer.md`: konkurrentoversikt, teknisk research, stackvalg (Next.js + TypeScript + SQLite + Vitest/Playwright, KI bak grensesnitt med mock som standard), 11 avklaringer med forslag, research som gjenstår, 10 skaleringseksempler med fasit (ett regnefeil rettet underveis) og brainstorming-temaer.
- Ikke verifisert: at norske oppskriftssider har fullstendig JSON-LD og ikke blokkerer forespørsler (shell kunne ikke nå nettsidene, så dette må testes). Konkurrentopplysninger er fra anmeldelser og komparative sider, ikke egne tester.
- `tilbakemelding-product-brief.md` og `product-brief.md` er uendret. Det tomme git-repoet i kursmappen er ryddet (rules.txt unstaget; filen er ikke slettet).
- Ingenting utenom denne loggen er committet ennå.

### Åpne punkter
- Ta P1-beslutningene i research-filen: A1 konto, A2 støttede sider/språk, A3 importfeil, A4 skaleringsregler, A6 LLM/kostnad. Deretter oppdatere `product-brief.md`.
- Godkjenne eller justere de 10 skaleringseksemplene og avrundingsregelen (eksempel 10).
- Hente 8–10 oppskriftslenker, lagre HTML som testdata og sjekke JSON-LD og blokkering (research §6 pkt. 1).
- Teste 2–3 konkurrentapper selv (skjermbilder til design) og prøve en LLM på 3–5 oppskrifter.
- Avklare opphavsrett ved lagring av oppskrifter (spør faglærer ved tvil).
- Velg språk for PRD og sett det i BMAD-konfig (`document_output_language` står som engelsk, briefen er norsk).
- Kjøre `bmad-prd` etter at P1 er avgjort, deretter UX, arkitektur, epics/stories.
- README.md i repoet er kun en kort mal; må skrives (installasjon, kjøring, struktur, lenker til planlegging).
- `product-brief-template.md` er ukommittet; avgjør om den skal med.
