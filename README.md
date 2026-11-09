# G111 — MHN

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder applikasjonen og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Maja Hjulstad Nilsen

## Om appen

**RecipeMate** er en matlagingsassistent for oppskrifter fra nettet. Du limer inn en lenke (eller skriver inn oppskriften selv), og appen viser oppskriften i et fast og ryddig format der du kan velge antall personer, slik at alle mengder regnes om med en gang. Oppskrifter kan lagres i en samling, i mapper og som favoritter.

Status: Epic 1 («Les og skaler en oppskrift») er ferdig: Story 1.1–1.6, pluss Story 3.5 (redigering), Story 3.1 (Samlingen) og Story 3.2 (lagre og slette). Du kan legge inn en oppskrift selv via «Legg inn selv» på Importer-siden (`/ny`), finne den igjen i Samlingen (`/samlingen`), se den på `/oppskrift/{id}`, velge antall personer og krysse av ingredienser og steg mens du lager maten. Oppskriften lagres i en lokal SQLite-database. Import fra lenke, mapper, favoritter og forslag kommer i senere epics.

## Hva Epic 1 (og Story 3.5) inneholder

- **Story 1.1, Start appen:** Next.js-prosjektet med toppmeny (Importer, Samlingen, Mapper, Favoritter), visuell profil som designtokens i lys og mørk palett, felles feilmeldinger og testoppsett.
- **Story 1.2, Tolk ingredienslinjer:** «400 g mel», «1 ½ dl melk» og «2–3 ss sukker» deles i mengde, enhet og navn. Linjer uten mengde («salt og pepper») vises som de står.
- **Story 1.3, Skaler og formater mengder:** mengder regnes om med fast avrunding, brøktegn (½, ¼, ¾) og «ca.» for udelelige ting som egg og løk.
- **Story 1.4, Legg inn en oppskrift manuelt:** tittel, antall personer, ingredienser og steg lagres i databasen. Ved feil lagres ingenting.
- **Story 1.5, Se oppskriften og velg antall personer:** fast format med tittel, kilde, porsjonsvelger (−/+ eller tall, 1–50, «Tilbakestill»), ingredienser per seksjon og nummererte steg.
- **Story 1.6, Kryss av under matlaging:** hver ingrediens og hvert steg kan krysses av (se under). Porsjonsvelgerens −/+ beholder tastaturfokus ved 1 og 50.
- **Story 3.5, Rediger en oppskrift:** se «Redigere en oppskrift» under.
- **Story 3.1, Se samlingen:** se «Samlingen» under.
- **Story 3.2, Lagre og slette en oppskrift:** se «Lagre, slette og rydde» under.

## Kryss av under matlaging

På oppskriftssiden er hver ingredienslinje og hvert steg en avkrysningsboks. Trykk hvor som helst på raden, eller sett fokus på boksen med Tab og trykk mellomrom. Avkrysset rad har fylt boks med hake, gjennomstreket og dempet tekst, og nummeret på steget står igjen. Det gjelder også linjer som appen ikke kan tolke, som «salt og pepper».

- Avkrysningen er bare tilstand i nettleseren. Den lagres ikke (ikke i databasen, `localStorage`, adressen eller en cookie), og det sendes ingen forespørsel til serveren.
- Avkrysningen påvirker ikke skaleringen og består når du endrer antall personer eller trykker «Tilbakestill til N».
- Når du forlater oppskriften eller åpner «Rediger» og går tilbake, er alt tomt igjen. Next.js med Cache Components skjuler en side i stedet for å fjerne den, så `useCheckedSet` (`src/components/use-checked-set.ts`) tømmer avkrysningene i en `useLayoutEffect`-opprydding.
- Ingredienser og steg har hvert sitt sett av id-er, så en ingrediens og et steg med samme id aldri påvirker hverandre.
- Ved 1 og 50 personer er −/+ merket med `aria-disabled` i stedet for `disabled`. Knappen beholder tastaturfokus, og et trykk gjør ingenting.
- Koden ligger i `CheckRow.tsx` (rad, boks og hake med CSS), `IngredientList.tsx` og `StepList.tsx`. Fargene og størrelsene kommer fra `src/styles/tokens.css`.

## Krav

- [Node.js](https://nodejs.org/) 22 eller nyere (npm følger med). Testet med Node.js 22.23 og npm 10.9.
- Ingen database-server, konto eller API-nøkkel trengs

## Installasjon

```bash
git clone https://github.com/IBE160-2026/G111-nilsen.git
cd G111-nilsen
npm install
```

Appen starter uten `.env`. Valgfrie miljøvariabler står i [`.env.example`](.env.example); kopier fila til `.env.local` hvis du vil sette dem.

## Kjøring

```bash
npm run dev      # utviklingsserver på http://localhost:3000
npm run build    # produksjonsbygg
npm start        # kjør produksjonsbygget
```

## Samlingen

«Legg inn selv» lagrer oppskriften rett i samlingen: `savedAt` settes til lagringstidspunktet. Samlingen (`/samlingen`) viser alle oppskrifter med `savedAt` satt som kort med tittel og kilde (kildenavn, ellers vertsnavnet fra lenken, ellers «Lagt inn selv»), sist lagret først. Hele kortet er én lenke til oppskriften. Er samlingen tom, vises en forklaring med knappene «Legg inn selv» og «Importer din første oppskrift».

- En datamigrasjon (`drizzle/0001_move_manual_recipes_to_collection.sql`) legger manuelle oppskrifter som ble lagret før denne storyen (uten kilde-lenke) inn i samlingen. Den kjøres automatisk, endrer ikke skjemaet og er trygg å kjøre på nytt.
- Rekkefølgen er «sist lagret først». Redigering endrer ikke `savedAt`, så plasseringen i listen er den samme. Sporing av «sist åpnet», sidedeling og søk er utsatt.
- Siden leser databasen inne i `Suspense` etter `connection()`, og en databasefeil vises av `error.tsx` i stedet for en tom samling.
- Koden ligger i `src/app/samlingen/`, `RecipeCard.tsx`, `listCollection` i `src/server/services/recipe-service.ts` og `listSavedRecipes` i `src/server/db/repositories/recipe-repository.ts`.

## Lagre, slette og rydde

Nederst på oppskriftssiden står en lagre-linje som følger med når du ruller. Er oppskriften ikke i samlingen (`savedAt` er `null`), står det «Lagre». Etter lagring sier «Lagret.» fra i tre sekunder (skjermleseren leser det opp), og linjen viser «Slett». «Slett» åpner dialogen «Slette oppskriften?» med «Avbryt» som startfokus; bekrefter du, slettes oppskriften med ingredienser og steg, og du sendes til Samlingen. «Avbryt» eller Escape lukker dialogen uten å endre noe, og fokus går tilbake til «Slett».

- **Sist valgte antall:** for en lagret oppskrift huskes antall personer ved hver endring (også «Tilbakestill»), og siden åpnes med sist valgte antall, også etter omstart. Skaleringen regner fortsatt fra originalmengdene. Valgt antall og lagring i samlingen endrer ikke `updatedAt`, så avkrysningen står. Avkrysning lagres fortsatt aldri.
- **Opprydding:** oppskrifter som aldri ble lagret i samlingen og er eldre enn et døgn slettes (med ingredienser og steg) når appen starter og deretter hver time mens den kjører (`src/instrumentation.ts`). Lagrede oppskrifter slettes aldri av dette, og rydding skjer ikke når en side vises.
- Koden ligger i `src/app/oppskrift/[id]/actions.ts` (Server Actions), `RecipeActions.tsx` og `ConfirmDialog.tsx`, tjenestene `saveRecipeToCollection`, `deleteRecipe`, `setSelectedServings` og `purgeStaleUnsavedRecipes` i `src/server/services/recipe-service.ts` og tilsvarende funksjoner i `recipe-repository.ts`.
- Testes med `npm test`: repository og tjenester mot en ekte SQLite-database i minnet (blant annet at sletting kaskaderer og at `updatedAt` er uendret), handlinger, dialog og lagre-linje (falske tidtakere for tresekundersregelen) og opprydding med falske tidtakere.

## Redigere en oppskrift

På oppskriftssiden (`/oppskrift/{id}`) står «Rediger» ved tittelen. Den åpner `/oppskrift/{id}/rediger` med samme skjema som «Legg inn selv», forhåndsutfylt med tittel, antall personer, ingredienser (én per linje, slik de ble skrevet) og steg. «Lagre endringer» bruker samme validering og tolking som ny oppskrift, erstatter ingredienser og steg i én databasetransaksjon og sender deg tilbake til oppskriften. «Avbryt» går tilbake uten å endre noe.

- Endres antall personer, nullstilles et tidligere valgt antall. Kilde og samlingsstatus røres ikke.
- Redigering virker på alle oppskrifter. Kilde, mappe, favoritt og seksjonsoverskrifter kan ikke redigeres ennå.
- Koden ligger i `src/app/oppskrift/[id]/rediger/` (side og Server Action), `updateManualRecipe` i `src/server/services/recipe-service.ts` og `updateRecipe` i `src/server/db/repositories/recipe-repository.ts`.
- Testes med `npm test`: repository og tjeneste mot en ekte SQLite-database i minnet (blant annet tilbakerulling ved feil midt i oppdateringen), og skjema, side og handling med Testing Library.

## Database

Appen bruker én SQLite-fil, som standard `data/recipemate.db` i prosjektmappen (mappen `data/` er ikke med i git). Du trenger ikke gjøre noe for å komme i gang: mappen, fila og tabellene opprettes automatisk første gang appen trenger databasen, for eksempel når du lagrer en oppskrift. `npm run build` lager ingen database.

```bash
npm run db:migrate   # opprett databasen og kjør migrasjonene manuelt (valgfritt)
npm run db:generate  # lag en ny migrasjon etter endring i src/server/db/schema.ts
```

- Vil du ha fila et annet sted, sett `DATABASE_PATH` i `.env.local` (se `.env.example`). Både appen og `npm run db:migrate` leser `.env` og `.env.local` på samme måte (skriptet bruker `@next/env`).
- Vil du starte med tom database, stopp appen og slett mappen `data/`.
- Skjemaet ligger i `src/server/db/schema.ts`, og migrasjonene i `drizzle/` (de er med i git).

### Hvis better-sqlite3 ikke installerer

`better-sqlite3` er en native modul. Pakken har med ferdigbygde versjoner for macOS, Linux og Windows (x64 og arm64), så `npm install` trenger normalt verken kompilator eller nett utover npm. `package-lock.json` har `"gypfile": false` for pakken, slik at npm ikke prøver å bygge den selv (se [issue 004](issues/004-better-sqlite3-bygges-fra-kildekode.md)). Hvis installasjonen feiler (ofte med feil fra `node-gyp` eller `prebuild-install`):

1. Sjekk at du bruker Node.js 22 eller nyere (`node -v`), helst en LTS-versjon.
2. Slett `node_modules/` og kjør `npm install` på nytt.
3. Mangler det ferdigbygd versjon, må modulen bygges lokalt. Det krever byggverktøy: på macOS `xcode-select --install`, på Windows «Desktop development with C++» fra Visual Studio Build Tools, på Linux `build-essential` og `python3`. Kjør deretter `npm rebuild better-sqlite3`.
4. Har du byttet Node-versjon etter installasjonen, kjør `npm rebuild better-sqlite3`.

## Testing og kodekvalitet

```bash
npm test             # alle tester én gang (Vitest)
npm run test:watch   # tester i overvåkingsmodus
npm run lint         # ESLint
npm run typecheck    # typekontroll med TypeScript (tsc --noEmit)
npm run format       # formater koden med Prettier
npm run format:check # sjekk formatering uten å endre filer
```

`npm run lint` og `npm test` skal være grønne før hver commit.

### Hva testene dekker

`npm test` kjører Vitest én gang og gir i dag 43 testfiler og 745 tester. Ingen test bruker nettverket eller en ekte API-nøkkel.

- **Domenet** (`src/domain/`): tolking av mengder og ingredienslinjer og skalering og formatering, med fasittabellen fra Epic 1 (400 g mel for 6 gir 600 g, «1 egg (ca.)», og så videre) som egne tester.
- **Server** (`src/server/`): repositorier og tjenester mot en ekte SQLite-database i minnet, blant annet tilbakerulling ved feil, redigering, samlingen, lagring, sletting og opprydding, og datamigrasjonen (en database med bare den første migrasjonen oppgraderes).
- **Komponenter og sider** (Testing Library og user-event i jsdom): toppmeny, skjema for ny og redigert oppskrift, porsjonsvelger (grenser, ugyldig inntasting, `aria-disabled` og fokus), ingredienser (skalering fra originalen, seksjoner, utolkbare linjer), steg og avkrysning (klikk på teksten, mellomrom med tastatur, skalering og «Tilbakestill» beholder avkrysningen, ingen serverkall, nullstilling når `<Activity>` skjuler siden og ved avmontering, også i Strict Mode).
- **Designtokens**: fargene i `tokens.css` er de samme som i `DESIGN.md`, og avkrysningsboksen bruker tokens uten hardkodede farger.

Det som ikke er automatisk testet, er utseendet i en ekte nettleser (oppsett, hake og fokusring). Det kontrolleres manuelt ved 360 og 1280 px i lys og mørk modus.

## Mappestruktur

```text
src/
  app/          Sider og ruter (Next.js App Router)
  components/   Gjenbrukbare React-komponenter (f.eks. TopNav, CheckRow, StepList)
  domain/       Ren domenekjerne: tolking og skalering (ingen React/Next/database)
  lib/          Felles hjelpere: Result-typen og norske feilmeldinger
  server/
    config.ts   Eneste sted som leser miljøvariabler
    services/   Tjenester som brukes av sider og Server Actions
    ports/      Grensesnitt mot omverdenen
    adapters/   Implementasjoner av portene
    db/         Databaseskjema, tilkobling, migrering og repositorier
  styles/       Designtokens (farger, typografi, avstander)
drizzle/        Databasemigrasjoner (genereres med npm run db:generate)
test/fixtures/  Lagrede eksempelsider brukt som testdata
scripts/        Hjelpeskript; db-migrate.ts kjører migrasjonene, fetch-fixtures.sh henter testsidene
issues/         Feil og problemer underveis, og hva som kan endres (én fil per sak)
```

## Planleggingsdokumenter

- [Product brief](product-brief.md)
- [PRD](_bmad-output/planning-artifacts/prds/prd-RecipeMate-2026-11-04/prd.md)
- [Arkitektur](_bmad-output/planning-artifacts/architecture/architecture-RecipeMate-2026-11-04/ARCHITECTURE-SPINE.md)
- [UX: design](_bmad-output/planning-artifacts/ux-designs/ux-RecipeMate-2026-11-04/DESIGN.md) og [opplevelse](_bmad-output/planning-artifacts/ux-designs/ux-RecipeMate-2026-11-04/EXPERIENCE.md)
- [Epics og stories](_bmad-output/planning-artifacts/epics.md)
- [Issues (feil underveis)](issues/README.md)
