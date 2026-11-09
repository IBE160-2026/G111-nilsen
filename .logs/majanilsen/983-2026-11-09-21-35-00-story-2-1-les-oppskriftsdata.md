# Story 2.1: les oppskriftsdata fra lagrede oppskriftssider

## 2026-11-09 kl. 21:35 — majanilsen

### Oppgave
Starte Epic 2 (import fra lenke) med Story 2.1 (FR-1, FR-3, AD-4, AD-7, AD-8, AD-11, NFR-2, NFR-7): lese oppskriftsdata (schema.org `Recipe` i JSON-LD) fra HTML og normalisere dem til én fast form. Kom etter at «Samlingen» ble omdøpt til «Oppskrifter» (commit `45aeb04`) og Epic 3 var ferdig.

### Plan
- Spesifikasjon: [spec-2-1](../../_bmad-output/implementation-artifacts/spec-2-1-les-oppskriftsdata.md).
- Maja kjørte `bash scripts/fetch-fixtures.sh` selv (nettverket i KI-miljøet når ikke sidene). To av de opprinnelige sidene ga 404 (Tine kjøttkaker) og 403 (Visit Norway) og er tatt ut; fire nye sider fra matprat.no og godt.no er med.
- Implementasjon av underagent, egen verifisering, tre uavhengige gjennomganger (robusthet og sikkerhet; spesifikasjon og arkitektur; testkvalitet med ca. 45 mutasjoner), triage og retting.

### Resultat
Commit `0a31a64` (24 filer, inkludert de ti lagrede sidene, 1,7 MB).
- **Domenet** (`src/domain/`): `extractRecipeJsonLd(html)` (finner `Recipe` i enkeltobjekt, liste, `@graph` og `@type`-varianter; hopper over ugyldig JSON; kaster aldri), `normalizeRecipe(node)` (tittel, kildenavn, `servings`, ingredienstekster, steg med seksjoner; tekstrensing uten HTML-parser), `clean-text.ts` og `import-types.ts`. Mengder tolkes ikke her (det gjør `parseLine` i 2.2).
- **Fixtures:** fem sider med `Recipe` (Tine, to fra Matprat, to fra Godt) og fem uten (`no_recipe`); kilder og resultat i `test/fixtures/sources.md`.
- **Gjennomgang:** ca. 25 funn, ingen datafeil eller sikkerhetshull. Rettet: kvadratisk tid i skanningen (2 MB med `<script ` gjentatt: 3–5 s, nå ca. 20 ms), porsjonstolking som gjettet på «20x20 cm»/«3 dl»/«2 x 6»/brøker, usynlige tegn, URL som kildenavn, døde kodegrener, svake tester (overlevende mutanter), terskel for ytelsestester (3 s). Utsatt: første `Recipe` som tomt skall, `Result`/`AppError` i domenet, `>` i attributter, ytelsestestene tar ca. 20 s.
- **Verifisering:** lint, typecheck, format:check og build grønne; 1612 tester i 60 filer; `package.json` og `package-lock.json` uendret. (Kjørt i skymiljøet; Mac-shellet gir ingen utskrift fra npm.)
- **Avvik:** egne feiltyper i domenet (`ImportResult`) fordi `domain-purity.test.ts` forbyr import fra `src/lib`; nummerering på én linje følger matrisen («1. Bland 2. Stek» blir to steg).

### Åpne punkter
- Kjør `npm test` på Macen og bekreft at hele suiten er grønn der, og at ytelsestestene (ca. 20 s) ikke er for trege (utsatt: skille dem ut).
- Utsatt: se deferred-work.md (tomt skall som første `Recipe`, flytte `Result` til domenet, `servings: null` må håndteres i 2.2/2.4).
- Neste: Story 2.2 (importer fra lenke: URL-validering, HTTP-adapter med SSRF-vern, import-service, Importer-siden, duplikatsjekk).
