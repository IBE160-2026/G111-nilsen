# Spec 4.4: Test hele kjerneflyten og ferdigstill README

## Intent
En sensor skal kunne installere, kjøre og teste appen ved å følge README (NFR-1, SM-6). Ende-til-ende-tester (Playwright) kjører UJ-1, UJ-2 og UJ-3 gjennom en ekte nettleser mot en midlertidig database, lagrede oppskriftssider og eksempelforslag, uten nettverk (NFR-2, AD-11). README beskriver appen, hvem den er for, skjermbilde, forutsetninger, konfigurasjon, testdata, mappestruktur og planleggingsdokumenter.

## Frosset
- `@playwright/test` 1.59.0 som devDependency (låst i `package-lock.json`); `npm run test:e2e` = `playwright test`. Nettleser installeres med `npx playwright install chromium` (ikke en del av `npm install`).
- `playwright.config.ts`: `webServer` sletter `.e2e/`, bygger og starter `next start` på port 3100 med `DATABASE_PATH=.e2e/recipemate.db`, `IMPORT_SOURCE=fixtures`, tom `LLM_API_KEY`. Én arbeider, to prosjekter (360 px og 1280 px). `E2E_CHROMIUM_PATH` kan peke på en annen nettleser (bare for e2e, leses ikke av appen).
- Prosjektene deler databasen, så hvert prosjekt bruker egne oppskrifter og mappenavn: `mobil-360` følger PRD-eksemplene nærmest (4 til 5 personer), `desktop-1280` bruker andre lagrede sider.
- Testene følger appens faktiske oppførsel. UJ-1 velger antallet både før og etter «Lagre», fordi antall som velges før lagring ikke huskes ([issue 009](../../issues/009-valgt-antall-glemmes-ved-lagring.md)); saken er ført, ikke rettet her.
- Kontrastkravene (NFR-5) er ikke automatisert; tastaturtesten sjekker at hvert fokusert element har synlig fokus (outline eller skygge), i lys og mørk modus.
- `.e2e/`, `test-results/` og `playwright-report/` ligger i `.gitignore`. Vitest tar bare `src/**/*.test.*`, så e2e-filene kjøres ikke av `npm test`.

## Matrise
| Tilfelle | Utfall | Test |
|---|---|---|
| UJ-1: importer, ett flere personer, lagre i ny mappe, favoritt | mengder endres, mappenavn på knappen, favoritt trykket | `e2e/kjerneflyt.spec.ts` |
| UJ-2: 5 personer, forslag, ta i bruk og hopp over, lagre i mappe, last på nytt | 1–3 eksempelforslag, valgt forslag huskes, ingredienser uendret | `e2e/kjerneflyt.spec.ts` |
| UJ-2 kanttilfelle: oversiktsside | «Fant ingen oppskrift på siden.» og «Legg inn selv» | `e2e/kjerneflyt.spec.ts` |
| UJ-3: Favoritter, åpne, antall huskes, endre | antall = valgt etter lagring | `e2e/kjerneflyt.spec.ts` |
| Tastatur, lys og mørk | Tab når antall og «Få forslag», synlig fokus | `e2e/kjerneflyt.spec.ts` |
| README fra ren kopi | `npm ci`, `npm run db:migrate`, `npm run build`, `next start` virker uten nøkkel | kjørt i ren kopi |

## Verifisering
lint, typecheck, format:check grønne; 79 filer og 2303 enhetstester; 10 e2e-tester grønne (2 prosjekter × UJ-1, UJ-2, UJ-3 og 2 tastaturtester) mot bygd app i skymiljøet, med forhåndsinstallert Chromium via `E2E_CHROMIUM_PATH`. README-kommandoene `npm ci`, `db:migrate`, `build` og `start` kjørt i en ren kopi uten `node_modules` (200 på forsiden). Skjermbildet er tatt av den bygde appen (1100 px bredt). Ikke kjørt på Majas Mac; ikke prøvd med Safari/Firefox (bare Chromium).

## Review Triage Log
Egen gjennomgang, ingen underagenter. Funn:
- E2E fant en forskjell fra PRD: antall valgt før «Lagre» glemmes (UJ-1/UJ-3). Ført som issue 009, ikke rettet (berører Story 2.4).
- `npm install @playwright/test` fjernet linjen `"gypfile": false` for `better-sqlite3` i `package-lock.json`, noe `lockfile.test.ts` fanget (og en ren `npm ci` ville bygd fra kildekode, issue 004) → linjen satt tilbake; låsfila har bare tillegg for Playwright.
- Skjermbildet viste først en limt «Lagre»-linje midt i siden (full-side-opptak); tatt på nytt i fast høyde.
- Utsatt: kontrastmåling og 200 % zoom er manuell kontroll (Maja); ingen Safari/Firefox; e2e bygger med `npm run build`, så `npm run dev` må stoppes først; `npm audit` viser kjente funn (egen sak); ingen uavhengige reviews.
