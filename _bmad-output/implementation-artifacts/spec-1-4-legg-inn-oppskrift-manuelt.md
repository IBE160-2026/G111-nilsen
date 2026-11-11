---
title: 'Story 1.4: Legg inn en oppskrift manuelt'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '4d549d0cca290d65f65fb0db2f320c890b51c6c5'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Brukeren kan ikke få en oppskrift inn i appen ennå. Manuell innlegging gir Epic 1 en egen vei inn (uavhengig av import i Epic 2), og krever appens første database.

**Approach:** Et skjema på `/ny` (lenket fra Importer) der brukeren skriver tittel, antall porsjoner, ingredienser og steg. En Server Action validerer med zod, tolker hver ingredienslinje med `parseLine`, lagrer i SQLite via Drizzle og sender brukeren til `/oppskrift/[id]`, som i denne storyen viser oppskriften enkelt (full visning kommer i 1.5).

## Boundaries & Constraints

**Always:**
- AD-2: lagre originaltekst (trimmet) og tolkede felt per ingredienslinje; aldri skalerte verdier.
- AD-3: skriving bare via Server Action i `src/app/ny/actions.ts`, med zod; lesing i Server Component.
- AD-6: ett skjema i `src/server/db/schema.ts`; migrasjon generert med drizzle-kit og committet i `drizzle/`; utenfor `src/server/db/` importerer ingen Drizzle, og innenfor bruker bare repositoriene spørringer (schema, client og migrering unntatt).
- AD-7: tjenesten returnerer `Result`; alle norske meldinger fra `src/lib/messages.ts` via `messageFor(kind)` med reservemelding.
- AD-9: databasesti fra `config.databasePath`. `config.ts` forblir uten `server-only` (det leses også av migreringsskriptet); `server-only` legges i `src/server/db/client.ts`, repositoriene og tjenestene.
- Databasen åpnes lat (`getDb()` ved første bruk i en forespørsel), aldri ved import eller under `next build`. Tilkoblingen gjenbrukes via `globalThis` (overlever HMR), med WAL og `busy_timeout`. Mappen for databasen opprettes ved behov, og migrasjoner kjøres ved første åpning fra `drizzle/` (sti fra `process.cwd()`).
- `npm run db:migrate` bruker samme migreringsfunksjon som `getDb()` (eget skript, f.eks. via `tsx`), og virker i en ny klone uten `data/`.
- `recipes.originalServings` er valgfri i databasen (import i Epic 2 kan mangle det); kravet 1–50 håndheves av zod for manuell innlegging. Kolonner som kommer senere (mappe, favoritt, sist åpnet) legges til som valgfrie, slik at SQLite ikke må bygge tabellen på nytt.
- Oppskriften lagres med `savedAt = null` («ikke i samlingen»).
- Skjemafelt har synlige etiketter; feil vises under feltet, koblet med `aria-describedby`; fokus flyttes til første felt med feil; skrevne verdier beholdes ved feil (UX-DR16, UX-DR17).

**Never:**
- Ingen tabeller for mapper, favoritter eller forslag.
- Ingen skalering, porsjonsvelger eller avkrysning på oppskriftssiden (Story 1.5–1.6).
- Ingen ingrediensseksjoner i skjemaet.
- Ingen endring i eksisterende domenefunksjoner; bare nye typer i `src/domain/types.ts`.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet | Feil |
|----------|-------|-----------|------|
| Gyldig | Tittel «Pannekaker», 4 porsjoner, 3 ingredienslinjer, 2 steg | Lagret; redirect til `/oppskrift/{id}` som viser tittel, «Lagt inn selv», «4 porsjoner», ingredienser og nummererte steg | N/A |
| Tomme linjer | Ingredienser/steg med tomme linjer og mellomrom | Tomme linjer ignoreres; hver linje trimmes; rekkefølgen beholdes | N/A |
| Utolkbar linje | `salt og pepper` | Lagres med `parseable = false`, vises med originaltekst | N/A |
| Mengde uten navn | `2 ss` | Lagres med tomt navn (`""`), `parseable = true` | N/A |
| Uten steg | Ingen steg | Lagres (steg er valgfrie) | N/A |
| Antall med mellomrom | `4 ` | Godtas som 4 | N/A |
| Mangler tittel | Tom/bare mellomrom | Ingenting lagres; melding under Tittel; verdier beholdt | validation |
| Ugyldig antall | `0`, `51`, `2,5`, `abc`, tomt | Ingenting lagres; melding under Antall porsjoner (heltall 1–50) | validation |
| Ingen ingredienser | Bare tomme linjer | Ingenting lagres; melding under Ingredienser | validation |
| For lang input | Tittel > 200 tegn; > 100 ikke-tomme linjer i et felt; en ingredienslinje > 300 tegn; et steg > 2000 tegn | Ingenting lagres; melding under feltet | validation |
| Ukjent oppskrift | `/oppskrift/999999` eller `/oppskrift/abc` | Norsk 404-side (også i `npm start`) | not_found |
| Første oppstart | Ingen `data/`-mappe og ingen database | Mappe og tabeller opprettes ved første forespørsel som trenger databasen | N/A |
| Bygg | `npm run build` uten database | Bygget lykkes og lager ingen databasefil | N/A |

</frozen-after-approval>

## Code Map

- `src/server/config.ts` -- `config.databasePath` (standard `data/recipemate.db`); ikke legg til `server-only` her.
- `src/server/config.test.ts`, `src/server/env-access.test.ts` -- eksisterende; skal fortsatt være grønne. Lag en tilsvarende importtest for Drizzle.
- `vitest.config.mts` -- miljø `node`; legg til alias som gjør `server-only` til en tom modul i tester.
- `src/lib/result.ts` -- `Result`, `AppError`, `appError`, kinds inkl. `validation` og `not_found`.
- `src/lib/messages.ts` -- tom `errorMessages`; legg til meldinger og `messageFor`.
- `src/domain/types.ts`, `index.ts` -- `ParsedLine`, `Quantity`, `UnitKey`; legg til `Recipe`, `RecipeLine` (`ParsedLine` + `id`, `position`, `section`), `Step` og eksporter dem.
- `src/app/page.tsx` -- Importer-siden; legg til lenke «Legg inn selv» til `/ny`.
- `src/app/not-found.tsx` -- norsk 404; brukes via `notFound()`.
- `next.config.ts` -- `cacheComponents: true`. Les `node_modules/next/dist/docs/01-app/02-guides/server-actions.md`, Cache Components-guiden og API-ene `connection` og `notFound` før koding. På `/oppskrift/[id]`: les `params` og hent data inne i en `<Suspense>`-grense (eller `loading.tsx`), og kall `connection()` før databaselesing. better-sqlite3 er allerede i Nexts `serverExternalPackages`.
- Versjoner (npm 2026-11-09): drizzle-orm 0.45.4, drizzle-kit 0.31.11, better-sqlite3 13.0.3, @types/better-sqlite3 9.6.0, zod 4.6.7, server-only, tsx.

## Tasks & Acceptance

**Execution:**
- [x] `package.json`, `drizzle.config.ts` -- avhengighetene over; skript `db:generate` (drizzle-kit) og `db:migrate` (eget skript).
- [x] `src/domain/types.ts` -- `Recipe`, `RecipeLine`, `Step`.
- [x] `src/server/db/schema.ts` -- `recipes` (id, title, sourceUrl?, sourceName?, originalServings?, selectedServings?, savedAt?, createdAt, updatedAt), `ingredient_lines` (id, recipeId → cascade, position, section?, originalText, quantityMin?, quantityMax?, unit?, name, parseable), `steps` (id, recipeId → cascade, position, section?, text). Tidspunkt som ISO-tekst i UTC.
- [x] `drizzle/` -- generert første migrasjon.
- [x] `src/server/db/migrate.ts` -- `runMigrations(db)`; `scripts/db-migrate.ts` bruker den med `config.databasePath`.
- [x] `src/server/db/client.ts` -- lat `getDb()` etter reglene over; `createTestDb()` i minnet med migrasjoner.
- [x] `src/server/db/repositories/recipe-repository.ts` -- `insertRecipe` (oppskrift, linjer og steg i én transaksjon) og `findRecipeById` (linjer og steg sortert på `position`, `quantityMin/Max` → `Quantity`).
- [x] `src/server/services/recipe-service.ts` -- `createManualRecipe(input, db?)` og `getRecipe(id, db?)` som returnerer `Result`; bruker `parseLine`.
- [x] `src/lib/messages.ts` -- `messageFor(kind)` med reservemelding; meldinger for alle `ErrorKind`; feltmeldinger for skjemaet.
- [x] `src/app/ny/page.tsx`, `src/app/ny/actions.ts`, `src/components/ManualRecipeForm.tsx` -- `useActionState`; tilstanden returnerer `{ fieldErrors, values }` og feltene bruker `defaultValue` fra den; `redirect()` utenfor `try/catch`; knappen «Lagre oppskrift» deaktivert mens den sender.
- [x] `src/app/oppskrift/[id]/page.tsx` -- enkel visning; `notFound()` ved ukjent/ugyldig id.
- [x] `src/app/page.tsx` -- lenke «Legg inn selv» til `/ny`.
- [x] Tester: zod-skjema (alle valideringsrader), tjeneste og repositorium mot `createTestDb()` (lagring, trimming, rekkefølge, `parseable`, tomt navn, `savedAt = null`, transaksjon ruller tilbake ved feil, ukjent id), action-funksjonen (0 rader etter ugyldig input), skjemakomponent (etiketter, `aria-describedby`, verdier beholdt, fokus på første feil), `messageFor` (alle kinds gir tekst), importtest for Drizzle (AD-6).
- [x] `README.md` -- databasen, `npm run db:migrate`, automatisk opprettelse og plassering; testet Node-versjon og hva man gjør hvis better-sqlite3 ikke installerer.

**Acceptance Criteria:**
- Given en ny klone uten `data/`, when `npm run build && npm start` kjøres og en oppskrift legges inn, then lagres den og vises på `/oppskrift/{id}`, også etter omstart.
- Given `npm run build`, when bygget er ferdig, then finnes ingen databasefil.

## Implementation Notes

Implementert i arbeidskopien i commit `32a08ec` (Story 1.4) og `0122c5c` (låsefila, se under). Ikke pushet.

**Filer og valg**
- Pakker: drizzle-orm 0.45.4, better-sqlite3 13.0.3, zod 4.6.7, server-only 0.0.1 (dependencies); drizzle-kit 0.31.11, @types/better-sqlite3 9.6.0, tsx 4.23.15 (devDependencies). Skript `db:generate` (`drizzle-kit generate`) og `db:migrate` (`tsx scripts/db-migrate.ts`). `package-lock.json` har fortsatt oppføringer for alle plattformer (bare nye oppføringer lagt til).
- `src/server/db/migrate.ts` har `openDatabase(path)` (oppretter mappen, `busy_timeout = 5000`, `foreign_keys = ON`, WAL for filer, kjører `runMigrations`) og `runMigrations(db)` (migrasjoner fra `process.cwd()/drizzle`). Fila har ikke `server-only`, fordi `scripts/db-migrate.ts` bruker den. `client.ts` (`server-only`) har lat `getDb()` lagret på `globalThis` og `createTestDb()` (`:memory:`).
- `drizzle/0000_init.sql`: `recipes`, `ingredient_lines`, `steps` med `ON DELETE cascade` og indeks på `(recipe_id, position)`.
- `selectedServings` lagres som `null` ved manuell innlegging (ikke valgt ennå); `originalServings` er antallet brukeren skrev.
- zod-skjemaet ligger i `src/app/ny/manual-recipe-schema.ts` (en `"use server"`-fil kan bare eksportere async-funksjoner); feltlisten og typene i `src/app/ny/form-fields.ts`, så klientkomponenten ikke drar med zod. Feltmeldinger i `messages.ts` (`manualRecipeFieldMessages`).
- `src/lib/result.ts` fikk `ERROR_KINDS` (typen `ErrorKind` avledes av den), så testen av `messageFor` dekker alle kinds. `messageFor` gir `fallbackMessage` for ukjente verdier.
- Actionen fanger uventede feil fra tjenesten og returnerer reservemeldingen i `formError` (aria-live), med verdiene beholdt. `redirect()` ligger utenfor `try/catch`.
- `ManualRecipeForm` får actionen som prop fra `/ny` (enklere å teste). Antall porsjoner er `type="text" inputMode="numeric"` og skjemaet har `noValidate`, slik at serverens norske meldinger alltid vises. Fokus flyttes via `form.elements.namedItem` i en effect.
- Visningen av oppskriften ligger i `src/components/RecipeView.tsx` og id-tolkingen i `src/lib/recipe-id.ts`, fordi Next ikke tillater ekstra eksporter fra `page.tsx`.
- Tester: `manual-recipe-schema.test.ts`, `actions.test.ts`, `recipe-service.test.ts`, `recipe-repository.test.ts`, `migrate.test.ts`, `drizzle-imports.test.ts` (AD-6), `lockfile.test.ts`, `ManualRecipeForm.test.tsx`, `RecipeView.test.tsx`, `messages.test.ts`, `recipe-id.test.ts`, og lenken i `pages.test.tsx`. Vitest har alias `server-only` → `server-only/empty.js`.

**Funn: better-sqlite3 i ny klone (issue 004)**
`npm ci` i en ren klone kjørte `node-gyp rebuild` for better-sqlite3, selv om pakken har ferdigbygde binærfiler og `"gypfile": false`. npm 10.9 lagrer ikke `gypfile` i låsefila. Løst ved å legge `"gypfile": false` inn i oppføringen i `package-lock.json`; `src/server/db/lockfile.test.ts` feiler hvis npm fjerner feltet igjen (skjer når npm skriver låsefila på nytt, f.eks. ved `npm install <pakke>`). Dokumentert i `issues/004-better-sqlite3-bygges-fra-kildekode.md` og README.

**Verifisering**
- `npm run lint`, `typecheck`, `test` (25 filer, 366 tester), `format:check`, `build`: grønne.
- Ren klone: `npm ci` uten feil, `npm run db:migrate` lager `data/recipemate.db`, `package-lock.json` uendret.
- `npm run build` uten `data/`: bygget lykkes, ingen databasefil. `/oppskrift/[id]` er Partial Prerender (◐), `/ny` statisk.
- `npm start` med tom `DATABASE_PATH`, testet med curl mot skjemaets innsending uten JavaScript: ugyldig input gir 200 med meldinger under feltene, `aria-invalid`/`aria-describedby` og beholdte verdier, og ingen rader; gyldig input gir 303 til `/oppskrift/1`, som viser tittel, «Lagt inn selv · 4 porsjoner», ingredienser og nummererte steg. Etter omstart vises oppskriften fortsatt. `next dev` ga ingen advarsler fra Cache Components.
- Skjermbilde (360 px) er ikke tatt: Playwright-Chromium kan ikke lastes ned i KI-miljøet, og ingen annen nettleser er installert der. Må tas manuelt.

**Kjent begrensning**
`/oppskrift/999999` og `/oppskrift/abc` svarer med HTTP 200, ikke 404. Spesifikasjonen krever at `params` leses inne i en `<Suspense>`-grense, og da er strømmen startet før `notFound()` kalles. Next legger inn `<meta name="robots" content="noindex">`, og den norske 404-siden ligger i RSC-dataene og vises når siden er lastet i nettleseren (med JavaScript). Uten JavaScript blir lasteteksten stående. Bør sjekkes i nettleser; ekte 404-status krever `generateStaticParams`/annen struktur og bør i så fall vurderes i 1.5.

**Rettelser etter kodegjennomgang (commit `119921b`):**
- Nye tester: oppskriftssiden (lagret, ukjent og ugyldig id) og ekte `getDb()` (riktig fil, gjenbruk).
- Felles `src/lib/recipe-input.ts` med `LIMITS` og `splitLines`, brukt av både zod-skjemaet og tjenesten; tjenesten returnerer `validation` med feltnavn, som actionen viser under riktig felt.
- `db:migrate` laster `.env`/`.env.local` via `@next/env` (ny avhengighet 16.4.5; `gypfile: false` lagt inn på nytt i låsefila).
- `openDatabase` lukker tilkoblingen ved feil.
- Norske feilsider: `src/app/oppskrift/[id]/not-found.tsx` og `src/app/error.tsx`.
- Live-region for skjemafeil står alltid i DOM-en og får fokus ved skjemafeil.
- Kildetekst fra `sourceName`, ellers vertsnavn fra `sourceUrl`, ellers «Lagt inn selv»; ingen avsluttende mellomrom ved tomt navn.
- Strengere AD-6-vakt (alle importformer og underpakker), lokal stub for `server-only`, rettet gjenskaping i issue 004.
- Verifisert: lint, typecheck, format:check, 397/397 tester, bygg; ren klone med `npm ci` uten endring i låsefila.

## Spec Change Log

- **2026-11-09, gjennomgang av spesifikasjonen før koding (underagent):** `originalServings` gjort valgfri (import i Epic 2); `server-only` flyttet fra `config.ts` til databaselaget, med alias i Vitest og eget migreringsskript; lat databaseåpning med WAL og `globalThis` (unngå migrering under bygg); `Recipe`-typer tillatt i domenet; verdier beholdes via action-tilstand; nye matrise-rader (trimming, tomt navn, lengdegrenser, «4 », bygg); nye tester (action, Drizzle-import, fokus); README om native modul. Opprydding av oppskrifter med `savedAt = null` er utsatt til Epic 3.

## Review Triage Log

Gjennomgang 1 (2026-11-09): Blind Hunter (B), Edge Case Hunter (E), Verification Gap (V). Diffen til gjennomgangen utelot `package-lock.json` og `drizzle/meta/`.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|---|---|---|---|
| 1 | `drizzle/meta/_journal.json` mangler (B1) | false | Filen er committet; den var bare utelatt fra diffen | reject |
| 2 | `package-lock.json` mangler (B2) | false | Committet med `gypfile: false`; utelatt fra diffen. Ren klone + `npm ci` verifisert | reject |
| 3 | `config.ts`, `.env.example`, `.gitignore` vises ikke (B3) | false | Uendret og finnes; `config.ts` har ikke `server-only` | reject |
| 4 | Oppskriftssiden (`RecipeLoader`) er ikke testet: lagret id, ukjent id, ugyldig id (V1, B13) | medium | Verifisert av V: `notFound()`-grenen kan fjernes uten at noen test feiler | patch |
| 5 | Ekte `getDb()` testes aldri (`DATABASE_PATH`, gjenbruk) (V2) | medium | Verifisert av V: kan peke til minnedatabase uten at noe feiler | patch |
| 6 | Tjenesten håndhever ikke grensene (1–50, lengder, linjeantall); dupliserer linjedeling (B5, E7) | medium | Framtidige kallere (import) kan lagre det skjemaet avviser | patch |
| 7 | Valideringsfeil fra tjenesten gir «se feltene» uten feltmelding (B4, E10) | low | Direkte rettelse: `detail` → feltfeil | patch |
| 8 | `db:migrate` leser ikke `.env.local` (E1) | medium | Skriptet og appen kan bruke ulike databasefiler | patch |
| 9 | `openDatabase` lukker ikke tilkoblingen ved feil (E3, E4) | low | Lekker filhåndtak ved hver mislykket forespørsel; direkte rettelse | patch |
| 10 | Databasefeil på oppskriftssiden når ingen norsk feilside (B6, E5); `not_found`-meldingen brukes aldri | medium | Ingen `error.tsx`; meldingen er definert men ikke vist | patch |
| 11 | Live-regionen for skjemafeil har `display: none` når tom (B10) | medium | Skjermlesere kan la være å lese opp første feilmelding | patch |
| 12 | Kilde-tekst «Lagt inn selv» også når `sourceUrl` finnes (B8, E8) | low | Feil for importerte oppskrifter (Epic 2); direkte rettelse | patch |
| 13 | Tomt navn gir avsluttende mellomrom («2 ss ») (B9) | low | Direkte rettelse; første del av funnet er falsk (tolkbare linjer har alltid mengde) | patch |
| 14 | Importvakten for Drizzle matcher eksakt streng (B15) | low | Underpakker som `drizzle-orm/sql` slipper gjennom | patch |
| 15 | Vitest-alias peker inn i `node_modules/server-only/empty.js` (B16) | low | Ikke offentlig API; lokal stub er direkte rettelse | patch |
| 16 | Gjenskapingssteg i issue 004 mangler commit før kloning (B14) | low | Direkte dokumentrettelse | patch |
| 17 | Sidetittel er alltid «Oppskrift» (B7) | low | Hører til full visning | defer (Story 1.5) |
| 18 | HTTP-status 200 for ukjent oppskrift (implementasjon, V) | low | Norsk 404-side vises i nettleseren; ekte status krever annen sidestruktur | defer (Story 1.5) |
| 19 | Migrasjoner og relativ databasesti løses mot `process.cwd()` (B11, E2) | low | npm-skriptene kjøres fra roten; standalone-bygg brukes ikke | reject |
| 20 | Ingen CHECK/UNIQUE-begrensninger i skjemaet (B12) | low | Domeneregler håndheves i tjenesten (sak 6); unngår ny migrasjon nå | reject |
| 21 | Skjemaet mister input hvis action-kallet feiler på nettverk (E6) | low | Lokal app; usannsynlig | reject |
| 22 | Tre SELECT-er utenfor transaksjon (E9) | false | better-sqlite3 er synkron og én bruker; ingen samtidig endring mellom kallene | reject |

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, `npm run build` -- expected: alle grønne
- `npm ci` i ren klone, deretter `npm run db:migrate` -- expected: `package-lock.json` uendret; database opprettet

**Manual checks:**
- `npm run build && npm start` med tom `DATABASE_PATH`: legg inn en oppskrift via `/ny`, sjekk visningen, start på nytt og sjekk at den finnes; `/oppskrift/abc` gir norsk 404. Skjermbilde av skjemaet med feilmeldinger (360 px) lagres som bevis.
