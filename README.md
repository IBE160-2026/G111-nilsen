# G111 — MHN

Gruppeprosjekt i **IBE160 Programmering med KI** ved Høgskolen i Molde, høsten 2026 (15 studiepoeng).

Repoet inneholder gruppens applikasjon og dokumentasjon av utvikling, testing og kvalitetssikring med KI.

## Medlemmer

- Maja Hjulstad Nilsen

## Om appen

**RecipeMate** er en matlagingsassistent for oppskrifter fra nettet. Du limer inn en lenke (eller skriver inn oppskriften selv), og appen viser oppskriften i et fast og ryddig format der du kan velge antall personer, slik at alle mengder regnes om med en gang. Oppskrifter kan lagres i en samling, i mapper og som favoritter.

Status: grunnmuren er på plass (Story 1.1–1.3), og du kan legge inn en oppskrift selv via «Legg inn selv» på Importer-siden (`/ny`). Oppskriften lagres i en lokal SQLite-database og vises på `/oppskrift/{id}`. Funksjonene bygges ut story for story.

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

## Mappestruktur

```text
src/
  app/          Sider og ruter (Next.js App Router)
  components/   Gjenbrukbare React-komponenter (f.eks. TopNav, EmptyState)
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
