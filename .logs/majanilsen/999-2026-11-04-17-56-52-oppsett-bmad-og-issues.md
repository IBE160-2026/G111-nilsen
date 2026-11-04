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
- Commits laget: `1859873` (BMAD + issues-mappe), `c2239c1` (research). Push mislyktes fra utviklingsmiljøet (GitHub blokkert, HTTP 403); pushes lokalt i Terminal.
- `product-brief.md` oppdatert: alle [MÅ AVKLARES] lukket (konto: nei, støttede sider/språk, importfeil, mangelfulle data, opphavsrett, målgruppe, testbrukere), nye seksjoner «Skalering» (regler + 10 eksempler med fasit), «Teknisk retning» og «Hvis tid».
- Forsøkt å teste ekte oppskriftssider: shellene når ikke nettsidene, og nettverktøyet viser bare gjengitt tekst, så JSON-LD er ikke bekreftet. Fire sider lest (tine.no, matoppskrift.no, bbcgoodfoodme.com, matprat.no-oversikt); funn lagt i research §3 (porsjonsantall mangler/misvisende, ingredienser uten navn eller enhet, listesider).
- Laget `scripts/fetch-fixtures.sh` og `test/fixtures/sources.md` (8 sider) for å hente testdata lokalt og sjekke JSON-LD.

### Åpne punkter
- Kjøre `bash scripts/fetch-fixtures.sh` lokalt, legge til én side fra matprat.no og én fra godt.no, og sjekke hvilke sider som har JSON-LD (research §6 pkt. 1).
- Teste 2–3 konkurrentapper selv (skjermbilder til design) og prøve en LLM på 3–5 oppskrifter.
- Spørre faglærer om opphavsrett ved lagring av oppskrifter (prinsipp i briefen: vis kilde, ingen bilder).
- Velge språk for PRD og sette det i BMAD-konfig (`document_output_language` står som engelsk, briefen er norsk).
- Avklare i PRD om et valgt forslag skal lagres sammen med oppskriften.
- Kjøre `bmad-prd`, deretter UX, arkitektur, epics/stories.
- Skrive README.md (installasjon, kjøring, struktur, lenker til planlegging).
- Avgjøre om `product-brief-template.md` skal committes.
