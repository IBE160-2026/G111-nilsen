---
title: 'Story 3.1: Se samlingen'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: 'cd8a6fa'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---
<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Oppskrifter som legges inn med «Legg inn selv» havner ikke noe sted man kan finne dem igjen. De får `savedAt = null` («ikke i samlingen»), og Samlingen viser bare en tom-tilstand. Uten lenken til oppskriften er den borte (FR-13, FR-16).

**Approach:** «Legg inn selv» lagrer oppskriften rett i samlingen (`savedAt` settes til lagringstidspunktet). En migrasjon flytter eksisterende manuelle oppskrifter (uten kilde-lenke) inn i samlingen. Samlingen leser alle oppskrifter med `savedAt` satt, sist lagret først, og viser dem som oppskriftskort med tittel og kilde; hele kortet er én lenke til oppskriften. Tom samling viser forklaring og to knapper: «Legg inn selv» og «Importer din første oppskrift».

## Boundaries & Constraints

**Always:**
- `createManualRecipe` setter `savedAt` til samme tidspunkt som `createdAt` og `updatedAt` (ISO 8601 UTC). `updateManualRecipe` og `updateRecipe` røres ikke og endrer fortsatt ikke `savedAt`.
- Migrasjon `drizzle/0001_*.sql` (laget med `drizzle-kit generate --custom`, så journal og snapshot er konsistente): `UPDATE recipes SET saved_at = created_at WHERE saved_at IS NULL AND source_url IS NULL;`. Den endrer ikke skjemaet, bare data. Kjøres automatisk av `openDatabase` og `npm run db:migrate`, og er trygg å kjøre på en tom database. Oppskrifter med kilde-lenke og `savedAt = null` røres ikke (de kommer i Epic 2).
- Repository: `listSavedRecipes(db)` returnerer `RecipeSummary[]` (`id`, `title`, `sourceName`, `sourceUrl`, `savedAt`) for oppskrifter der `savedAt` ikke er `null`, sortert på `savedAt` synkende, deretter `id` synkende. Ingen ingredienser og steg leses. `RecipeSummary` ligger i `src/domain/types.ts`.
- Service: `listCollection(db)` i `recipe-service.ts` returnerer `Result<RecipeSummary[]>`. Samme mønster som `getRecipe`.
- Kildeteksten for et kort bruker samme regler som oppskriftssiden: `sourceLabel` (navn, ellers vertsnavn fra lenken, ellers «Lagt inn selv»). Funksjonen flyttes fra `RecipeView.tsx` til `src/lib/source-label.ts` (med testene), og både `RecipeView` og kortet importerer den derfra.
- Kortet `RecipeCard` (`src/components/RecipeCard.tsx` + `.module.css` + test): hele kortet er én `<Link href="/oppskrift/<id>">`. Tittel i Georgia 18 px (`<h2>`), kilde i meta (14 px, dempet tekst). Flate, tynn kant (`border-hairline`) og hjørner 14 px som øvrige kort, ingen skygge. Minst 44 px høyt. Synlig fokus. Tittel som er lang brytes (`overflow-wrap: anywhere`) i stedet for å flyte ut av kortet ved 360 px. Tilstand ved hover/fokus skilles med mer enn farge (kant), og `forced-colors` får egen kant.
- Listen er `<ul role="list">` med ett `<li>` per kort (som i 1.6: `list-style: none` fjerner listesemantikken i Safari). Én kolonne under 768 px; fra 768 px to kolonner (`grid`), maks bredde som øvrige sider.
- Samlingssiden (`src/app/samlingen/page.tsx`) følger Cache Components-mønsteret fra `oppskrift/[id]/page.tsx`: leser databasen inne i `Suspense` etter `connection()` (reservetekst «Henter samlingen …»). `<h1>Samlingen</h1>` ligger utenfor Suspense. Ved tjenestefeil kastes en feil som `error.tsx` viser (samme regel som oppskriftssiden).
- Tom samling: `<h2>` «Du har ingen lagrede oppskrifter ennå.», forklaring, og to knapper i denne rekkefølgen: «Legg inn selv» (`/ny`, primær) og «Importer din første oppskrift» (`/`, sekundær). `EmptyState` får en valgfri `secondaryAction` (sekundærknapp med kantlinje, `control-border`, ikke fylt); Mapper og Favoritter fungerer uendret.
- Tekster (AD-7) legges i `src/lib/messages.ts` (`collectionMessages`) og er med i den eksisterende testen mot utropstegn.
- Etter lagring av ny oppskrift sendes brukeren fortsatt til `/oppskrift/[id]` (uendret).
- Ingen ny pakke. `package-lock.json` skal være uendret (drizzle-kit er allerede installert).

**Never:**
- Ingen favoritthjerte, mappenavn, sletting eller «Lagre»/«Fjern fra samlingen» (Story 3.2–3.4).
- Ingen sporing av «sist åpnet» og ingen ny kolonne: sorteringen er «sist lagret først». Det oppfyller FR-16 («sist lagret/åpnet») med «sist lagret»; sporing av åpninger utsettes (se `deferred-work.md`).
- Ingen sidedeling eller søk (se `deferred-work.md`).
- Ingen endring i tolke- eller skaleringsregler, og ingen endring i databaseskjemaet.
- Ingen skriving til databasen ved visning av Samlingen.

## I/O & Edge-Case Matrix

| Scenario | State / handling | Forventet | Feil |
|----------|------------------|-----------|------|
| Ny manuell oppskrift | «Lagre oppskrift» i `/ny` | `savedAt` = `createdAt` = `updatedAt`; oppskriften vises i Samlingen | N/A |
| Tom samling | Ingen rader med `savedAt` | Tom-tilstand med «Legg inn selv» (`/ny`) og «Importer din første oppskrift» (`/`) | N/A |
| Flere oppskrifter | Tre lagret på ulike tidspunkt | Nyeste øverst; like tidspunkt sorteres på høyest id først | N/A |
| Oppskrift uten kilde | `sourceName` og `sourceUrl` er `null` | Kilde vises som «Lagt inn selv» | N/A |
| Oppskrift med kildenavn | `sourceName` «Matprat» | Kilde «Matprat» | N/A |
| Kilde uten navn | `sourceUrl` satt, `sourceName` `null` | Vertsnavn fra lenken, uten `www.` | N/A |
| Ikke i samlingen | `savedAt = null` og kilde-lenke satt | Vises ikke i Samlingen | N/A |
| Lang tittel | 200 tegn uten mellomrom ved 360 px | Brytes i kortet, ingen horisontal rulling | N/A |
| Klikk på kort | Trykk hvor som helst på kortet | Åpner `/oppskrift/<id>` | N/A |
| Tastatur | Tab til kortet, Enter | Fokusring synlig; Enter åpner oppskriften | N/A |
| Migrasjon | Database med to manuelle (`savedAt = null`) og én importert (`sourceUrl` satt, `savedAt = null`) | De to manuelle får `savedAt = createdAt`; den importerte er uendret | N/A |
| Migrasjon rerun / tom database | Kjøres på tom eller allerede migrert database | Ingen feil, ingen endring | N/A |
| Redigering | Rediger en oppskrift i samlingen | `savedAt` uendret, posisjon i listen uendret | N/A |
| Databasefeil | Lesing feiler | `error.tsx` vises (ikke tom samling) | unknown |

</frozen-after-approval>

## Code Map

- `src/domain/types.ts` -- ny `RecipeSummary` (`Pick<Recipe, "id" | "title" | "sourceName" | "sourceUrl" | "savedAt">`-lik, men `savedAt: string`).
- `src/server/db/repositories/recipe-repository.ts` -- `listSavedRecipes(db)`. Test i `recipe-repository.test.ts` mot in-memory SQLite (rekkefølge, like tidspunkt, `savedAt = null` utelatt, tom liste).
- `src/server/services/recipe-service.ts` -- `createManualRecipe` setter `savedAt: now`; ny `listCollection(db)`. Oppdater eksisterende test «lagres med savedAt = null …» til ny regel.
- `drizzle/0001_*.sql`, `drizzle/meta/_journal.json`, `drizzle/meta/0001_snapshot.json` -- datamigrasjon. Test i `src/server/db/migrate.test.ts`: lag en database med bare `0000`, sett inn tre rader, kjør `0001`, sjekk resultatet (matrisen over).
- `src/lib/source-label.ts` (+ test) -- flyttet fra `RecipeView.tsx`.
- `src/components/RecipeCard.tsx` (+ css, test), `src/components/EmptyState.tsx` (+ css) -- `secondaryAction`.
- `src/app/samlingen/page.tsx` (+ test `page.test.tsx`) -- Suspense + `connection()`, liste eller tom-tilstand. Oppdater `src/app/pages.test.tsx` (Samlingen testes nå i egen fil, dels med mockede tjenester; Mapper og Favoritter beholdes).
- `src/lib/messages.ts` -- `collectionMessages`.
- `README.md` -- avsnitt om samlingen, testtall, og at manuelle oppskrifter lagres rett i samlingen. `_bmad-output/implementation-artifacts/deferred-work.md` -- sist åpnet, sidedeling.
- `_bmad-output/implementation-artifacts/epic-1-context.md` rør ikke (historisk).

## Tasks & Acceptance

**Execution:**
- [x] Repository `listSavedRecipes` + tester.
- [x] Service: `savedAt` ved ny manuell oppskrift, `listCollection`, tester.
- [x] Datamigrasjon `0001` + migreringstest.
- [x] `sourceLabel` flyttet til `src/lib/source-label.ts`.
- [x] `RecipeCard`, `EmptyState` med `secondaryAction`, Samlingssiden, meldinger, tester.
- [x] README og deferred-work.

**Acceptance Criteria:**
- Given skjemaet «Legg inn selv», when jeg trykker «Lagre oppskrift», then lagres oppskriften rett i samlingen (FR-13), og eksisterende manuelle oppskrifter (uten kilde-lenke) er flyttet inn av migrasjonen.
- Given lagrede oppskrifter, when jeg åpner Samlingen, then vises de som oppskriftskort med tittel og kilde, sist lagret først, og hele kortet åpner oppskriften (FR-16, UX-DR10).
- Given en tom samling, when jeg åpner Samlingen, then vises «Du har ingen lagrede oppskrifter ennå.» og knappene «Legg inn selv» og «Importer din første oppskrift» (UX-DR11).
- Alle eksisterende tester passerer; lint, typecheck, format:check og build er grønne; `package-lock.json` uendret.

## Implementation Notes

Samlingen er implementert og dekket av tester.

- **Repository og service:** `listSavedRecipes(db)` leser bare `id`, `title`, `sourceName`, `sourceUrl` og `savedAt` for rader med `savedAt` satt, sortert på `savedAt` og deretter `id` synkende. `RecipeSummary` ligger i `src/domain/types.ts` (eksportert fra `@/domain`). `listCollection(db)` pakker resultatet i `Result` etter samme mønster som `getRecipe`. `createManualRecipe` setter `savedAt` til samme `now` som `createdAt` og `updatedAt`; `updateManualRecipe` og `updateRecipe` er uendret.
- **Migrasjon:** `drizzle/0001_move_manual_recipes_to_collection.sql` er laget med `drizzle-kit generate --custom`. Journal og `0001_snapshot.json` er konsistente (snapshot er semantisk lik `0000`; bare `id`, `prevId` og nøkkelrekkefølge skiller). Prettier er kjørt på `drizzle/meta/`. Migreringstesten kopierer `0000` til en midlertidig mappe, setter inn to manuelle og én importert oppskrift, kjører `0001` og sjekker matrisen. Den dekker også rerun, tom database, rad som allerede har `savedAt`, og at `0001` står i journalen.
- **Kildetekst:** `sourceLabel` er flyttet til `src/lib/source-label.ts` med egne tester; `RecipeView` og `RecipeCard` importerer derfra.
- **Visning:** `RecipeCard` er én `<Link>` med `<h2>` (Georgia 18 px) og kilde i meta. Hover og fokus bruker aksentfarget kant med innvendig ring (mer enn farge), `forced-colors` bruker `Highlight`. `EmptyState` har valgfri `secondaryAction` (kantlinje med `--color-control-border`, ikke fylt) i en felles `actions`-rad. Samlingssiden bruker `<ul role="list">` i ett- og (fra 768 px) todelt grid, og følger Cache Components-mønsteret (`connection()` i `Suspense`, overskriften utenfor). Tjenestefeil kastes til `error.tsx`. Tekstene ligger i `collectionMessages` og er med i testen mot utropstegn.
- **Dokumenter:** README har avsnittet «Samlingen», nye testtall (39 filer, 608 tester) og beskrivelse av at manuelle oppskrifter lagres rett i samlingen. `deferred-work.md` noterer «sist åpnet» og sidedeling/søk.
- **Avvik:** ingen fra spesifikasjonen. Tittelstørrelsen 18 px ligger i det nye tokenet `--type-card-title-size`, og sekundærknappen har eget `--button-border-width`.
- **Tester:** repository (4 nye), service (`listCollection`, nytt `savedAt`-krav), migrasjon (4 nye), `source-label`, `RecipeCard`, `EmptyState`, `src/app/samlingen/page.test.tsx` (tom, rekkefølge, kilde, utelatt `savedAt = null`, feil videre til `error.tsx`) og oppdatert `pages.test.tsx` (Mapper og Favoritter). Ingen nye pakker; `package-lock.json` er uendret.
- **Nettleserkontroll:** en gjennomgang bygde appen og tok skjermbilder i headless Chrome ved 360 og 1280 px i lys og mørk palett: ingen horisontal rulling, lang tittel brytes i kortet, to kolonner fra 768 px, fokusring og tom-tilstandens to knapper stables pent, nyeste oppskrift øverst. Åpent punkt: Maja sjekker selv i nettleseren (360 og 1280 px, lys og mørk, 200 % zoom), og at en ny manuell oppskrift dukker opp øverst etter lagring.

## Spec Change Log

## Rettelser etter kodegjennomgang

Alle 8 patch-punktene under er rettet: tester som ikke kunne feile er gjort strengere (Tab mellom to kort, eksplisitt `role="list"`, `connection()` før `listCollection`), «Lagt inn selv» ligger i `sourceMessages` (AD-7), tokens `--type-card-title-size` og `--button-border-width`, og Implementation Notes er rettet (snapshot, avvik, nettleserkontroll).

## Review Triage Log

Tre uavhengige gjennomganger (randtilfeller og dataintegritet, spesifikasjon og arkitektur, UI/tilgjengelighet/testkvalitet) ga 15 funn, ingen høye eller middels. Triage: 8 rettes (patch), 2 utsettes (defer), 5 avvises (reject).

**Patch (rettes i denne storyen):**
1. Test «kan nås med tastatur» kunne ikke feile (`focus()` virker på enhver lenke). Erstattet med Tab mellom to kort og `toHaveFocus()`.
2. Test «tar imot en lang tittel» påsto mer enn den testet. Navnet sier nå at brytingen testes i nettleser.
3. `getByRole("list")` er grønn uten `role="list"`. Tester nå attributtet.
4. Ingen test sjekket at `connection()` kalles før databasen leses. Spy sjekker rekkefølgen.
5. Sekundærknappen brukte `--stepper-border-width`. Eget token `--button-border-width`.
6. Tittelstørrelsen 18 px var hardkodet. Nytt token `--type-card-title-size`.
7. «Lagt inn selv» var hardkodet i `source-label.ts` (AD-7). Flyttet til `sourceMessages` i `messages.ts`.
8. Implementation Notes sa «identisk» snapshot og nevnte 18 px som avvik; rettet. Nettleserkontrollen er ført.

**Defer:**
9. Antall oppskrifter under overskriften (vist i UX-mockupen) og «sist brukt» (EXPERIENCE.md): ikke krevd av storyen. Ført i `deferred-work.md`.
10. Import (Epic 2) må normalisere tom `sourceUrl` til `null`, ellers flyttes en slik rad ikke av migrasjonen og regler som «uten kilde-lenke» treffer feil. Ført i `deferred-work.md`.

**Reject:**
11. `listCollection` returnerer alltid `ok`, og `!result.ok`-grenen er i praksis død kode. Følger `getRecipe`; databasefeil kastes og ender i `error.tsx`, som kravet sier.
12. `isNotNull` slipper gjennom `saved_at = ''`. Ingen kode skriver tom streng, og `created_at` er NOT NULL med ISO-tekst.
13. `tsconfig.tsbuildinfo` og endret `next-env.d.ts`. Begge er gitignored.
14. Kortkanten (`border-hairline`) er under 3:1 mot flaten. DESIGN.md pålegger hairline for kort, kortet er en lenke med tekst som innhold, og hover og fokus får kontrastrik aksentkant.
15. `:hover` uten `@media (hover: hover)`. Samme mønster som i resten av appen; ikke nytt i denne storyen.
