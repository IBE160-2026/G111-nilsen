---
title: 'Story 1.1: Start appen med toppmeny og visuell profil'
type: 'feature'
created: '2026-11-04'
status: 'done'
baseline_commit: 'd072ca55b04b8724b396c772403eb68cbbe559e2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/_bmad-output/planning-artifacts/ux-designs/ux-RecipeMate-2026-11-04/DESIGN.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Repoet har planleggingsdokumenter, men ingen app. Alle senere stories trenger et kjørbart Next.js-prosjekt med riktig mappestruktur, visuell profil, navigasjon og testoppsett.

**Approach:** Sett opp Next.js 16.4 (TypeScript, App Router, `src/`, ESLint) i repoets rot, legg inn designtokens og typografi fra DESIGN.md, bygg toppmenyen og fire sider med tomme tilstander, og sett opp Vitest, Prettier, `config.ts`, `result.ts`, `.env.example` og første README.

## Boundaries & Constraints

**Always:**
- Mappestruktur og avhengighetsretning etter ARCHITECTURE-SPINE (AD-1): `src/domain`, `src/server`, `src/lib`, `src/app`, `src/components`, `src/styles`.
- Alle farger, typografi og avstander som CSS-variabler i `src/styles/tokens.css`; mørk palett via `prefers-color-scheme: dark`. Ingen hardkodede farger i komponenter.
- All brukertekst på norsk bokmål, `<html lang="nb">`.
- Miljøvariabler leses bare i `src/server/config.ts` (AD-9). Appen starter uten `.env`.
- `Result<T, AppError>` i `src/lib/result.ts` etter AD-7.
- Install, test og bygg kjøres i en arbeidskopi utenfor prosjektmappen (Linux), slik at `node_modules` med Linux-binærfiler aldri havner i brukerens mappe. Endringer kommer inn i repoet som git-commits.

**Never:**
- Ingen Tailwind eller UI-bibliotek; vanlig CSS (globale tokens + CSS Modules).
- Ingen database, import, skalering eller forslag i denne storyen.
- Ikke endre filer under `_bmad/`, `_bmad-output/planning-artifacts/` (unntak: Stack-tabellen, se tasks), `issues/`, `.logs/`, `product-brief.md`, `tilbakemelding-product-brief.md`.
- Ingen hemmeligheter, `node_modules`, `.next` eller `data/` i git.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Start | `npm install && npm run dev`, åpne `/` | Importer-siden med toppmeny, «Importer» markert | N/A |
| Navigasjon | Klikk Samlingen/Mapper/Favoritter | Riktig side, riktig punkt markert (`aria-current="page"`) | N/A |
| Smal skjerm | Bredde 360 px | Logo på egen linje, fire menypunkter på linjen under, hvert ≥ 44 px høyt, ingen horisontal rulling | N/A |
| Mørk modus | `prefers-color-scheme: dark` | Mørk palett fra DESIGN.md | N/A |
| Ukjent side | `/finnes-ikke` | Norsk 404-side med lenke til Importer | N/A |
| Uten `.env` | Ingen miljøvariabler | Appen starter; `config.llmApiKey` er `undefined` | N/A |

</frozen-after-approval>

## Code Map

- `.gitignore` -- finnes; dekker `node_modules/`, `.next/`, `.env*`. Legg til `data/`.
- `README.md` -- finnes, kort mal med gruppenavn og medlem; utvides (behold eksisterende innhold øverst).
- `CLAUDE.md` -- finnes; ikke endre.
- `test/fixtures/`, `scripts/fetch-fixtures.sh` -- finnes; ikke endre.
- `_bmad-output/planning-artifacts/architecture/architecture-RecipeMate-2026-11-04/ARCHITECTURE-SPINE.md` -- Stack-tabellen har «låses i package-lock.json»; oppdateres med faktiske versjoner.
- Ingen appkode finnes fra før.

## Tasks & Acceptance

**Execution:**
- [x] Arbeidskopi: `git clone` av prosjektmappen til en mappe utenfor (f.eks. `$HOME/work/G111-nilsen`); generer Next.js-prosjektet med `create-next-app@16.4.5` (TypeScript, ESLint, App Router, `src/`, alias `@/*`, uten Tailwind) i en tom mappe og flytt filene inn -- create-next-app krever tom mappe.
- [x] `package.json` -- navn `recipemate`, `engines.node >=22`, skript `dev`, `build`, `start`, `lint`, `test` (vitest run), `test:watch`, `format` -- felles kommandoer for README.
- [x] `vitest.config.ts`, `.prettierrc` -- Vitest med `@/`-alias; Prettier-oppsett.
- [x] `src/styles/tokens.css` -- alle tokens fra DESIGN.md (lys og mørk) som CSS-variabler; importeres i `src/app/globals.css`.
- [x] `src/app/layout.tsx` -- `lang="nb"`, tittel «RecipeMate», bakgrunn og typografi fra tokens, toppmeny.
- [x] `src/components/TopNav.tsx` (+ CSS Module) -- klientkomponent med `usePathname`, `aria-current`, synlig fokus; to linjer under 768 px.
- [x] `src/components/EmptyState.tsx` -- tittel, forklaring og valgfri lenke.
- [x] `src/app/page.tsx` (Importer: «Hent en oppskrift» + kort forklaring), `src/app/samlingen/page.tsx`, `src/app/mapper/page.tsx`, `src/app/favoritter/page.tsx` (tomme tilstander med tekst fra EXPERIENCE.md), `src/app/not-found.tsx`.
- [x] `src/server/config.ts` -- leser `LLM_API_KEY`, `LLM_MODEL`, `DATABASE_PATH` (standard `data/recipemate.db`).
- [x] `src/lib/result.ts` -- `Result`, `AppError` (`kind`, `detail?`), hjelpere `ok()`/`err()`; `src/lib/messages.ts` med tom norsk meldingstabell.
- [x] `src/domain/`, `src/server/{ports,adapters,services,db}` -- tomme mapper med `.gitkeep` for strukturen.
- [x] Tester: `src/lib/result.test.ts`, `src/server/config.test.ts`, `src/components/TopNav.test.tsx` (Testing Library + jsdom: fire lenker, aktiv markering).
- [x] `.env.example` -- alle variabler med kommentarer, uten verdier.
- [x] `README.md` -- hva appen er, krav (Node.js 22+), installasjon, kjøring, testing, mappestruktur, lenker til planleggingsdokumentene.
- [x] `ARCHITECTURE-SPINE.md` Stack-tabell -- faktiske versjoner fra `package-lock.json`.

**Acceptance Criteria:**
- Given ren klone, when `npm install`, `npm run lint`, `npm test` og `npm run build` kjøres, then alle lykkes uten feil.
- Given appen kjører, when siden sjekkes på 360 px og 1280 px i lys og mørk modus, then toppmenyen og fargene følger DESIGN.md og EXPERIENCE.md (skjermbilder lagres som bevis i implementasjonsnotatene).
- Given repoet etter commit, when `git status` kjøres i prosjektmappen, then er det ingen `node_modules`, `.next` eller `.env` i git.

## Implementation Notes

- Commit `6d74852` («Story 1.1: Next.js-oppsett, toppmeny og visuell profil») er laget i arbeidskopien `$HOME/work/G111-nilsen` (Linux-VM) og hentet inn i prosjektmappen med `git fetch` + `git merge --ff-only`. Ikke pushet.
- Faktiske versjoner: Next.js 16.4.5, React 19.3.0, TypeScript 5.9.3, ESLint 9.39.5, Prettier 3.9.10, Vitest 5.1.0, jsdom 30.1.3, @testing-library/react 16.3.3.
- create-next-app 16.4.5 setter `cacheComponents: true` og `partialPrefetching: true` i `next.config.ts`; beholdt. Fordi `usePathname` kan suspendere på dynamiske ruter med Cache Components (kommer med `oppskrift/[id]`), er `TopNav` pakket i `<Suspense>` i `layout.tsx`, med `TopNavView pathname={null}` (meny uten markering) som fallback.
- `TopNav.tsx` deler i `TopNavView` (ren visning, testbar) og `TopNav` (leser `usePathname`). Undersider markerer forelderen (`/mapper/3` → Mapper).
- Vitest-konfigurasjonen heter `vitest.config.mts` (ikke `.ts`): med `.ts` og CommonJS-`package.json` varsler Vite 8 om ESM-syntaks i en CommonJS-fil.
- `AGENTS.md` fra create-next-app er committet; `next dev` skriver den på nytt hvis den mangler.
- `eslint-config-prettier` er lagt til i ESLint-oppsettet; `_bmad/`, `_bmad-output/` og `test/fixtures/` er utelatt fra lint og Prettier. `npm run format:check` er et ekstra skript.
- Tom-tilstand for Mapper (ingen mapper) står ikke ordrett i EXPERIENCE.md; teksten er «Du har ingen mapper ennå.» + «Legg oppskrifter i en mappe fra oppskriftssiden.» med lenke til samlingen.
- Stack-tabellen i ARCHITECTURE-SPINE har faktiske versjoner for det som er installert; drizzle, better-sqlite3, zod, cheerio og Playwright låses når de innføres.

**Verifisering**

- Ren klone av commiten: `npm ci`, `npm run lint` (0 feil), `npm test` (3 filer, 17 tester grønne), `npm run build` (/, /samlingen, /mapper, /favoritter, /_not-found statisk) og `npx tsc --noEmit` – alt grønt. `npm install` i ren klone gir ingen endring i `package-lock.json`.
- `next start`: `/`, `/samlingen`, `/mapper`, `/favoritter` gir 200 med `<html lang="nb">`; `/finnes-ikke` gir 404 med «Fant ikke siden» og lenke til Importer. `aria-current="page"` står på riktig punkt i prerendret HTML.
- 360 px (målt i iframe): `scrollWidth` 360 (ingen horisontal rulling), logo på egen linje over menyen, alle fire menypunkter 44 px høye.
- Skjermbilder i `screenshots/story-1-1/` (`index-` og `samlingen-` × 360/1280 × lys/mørk). Playwright-Chromium kunne ikke lastes ned i VM-en (nettverksblokkert), så skjermbildene er tatt med headless Chrome av den prerendrede HTML-en og CSS-en fra bygget.
- `git ls-files` i prosjektmappen: ingen `node_modules`, `.next`, `.env` eller `data/`.

## Spec Change Log

## Review Triage Log

Gjennomgang 1 (2026-11-04): Blind Hunter (B), Edge Case Hunter (E), Verification Gap (V).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|---|---|---|---|
| B1 | Ingen `typecheck`-skript; lint og test sjekker ikke typer | low | Riktig: Vitest stripper typer, bare `build` sjekker. Trivielt å legge til | patch |
| B2 | Ingen CI (GitHub Actions) | medium | Kvalitetsporten håndheves bare i README; ikke forårsaket av storyen | defer |
| B3 | README nevner ikke `format:check` | low | Riktig, direkte rettelse | patch |
| B4 | Spine viser eksakte versjoner, package.json bruker områder | low | Riktig; låst i package-lock, men dokumentet sier noe annet | patch |
| B5/V1 | Testen for tomme sider sjekker bare antall overskrifter | medium | Verifisert av V: fjernet lenke eller feil `href` gir fortsatt grønt | patch |
| B6 | Ingen test som håndhever at bare `config.ts` leser `process.env` (AD-9) | low | Riktig; senere stories kan bryte regelen uten at noe feiler | patch |
| B7/E5 | `errorMessages` er tom og `Partial`, ingen reservemelding | low | Ingen kallere ennå; blir reelt når første feiltype tas i bruk (Story 1.4) | defer |
| B8 | Importer-siden lover import som ikke finnes | medium | Riktig: teksten sier «lim inn en lenke», men det finnes ikke felt | patch |
| B9 | Importer-siden mangler egen `metadata.title` | low | Riktig, de andre sidene har det | patch |
| B10 | 768 px-brytepunkt i tre steder; testen splitter på eksakt tekst | low | Riktig: `--breakpoint-wide` er ubrukt (CSS-variabler virker ikke i media queries), og testen er skjør | patch |
| B11/V2 | Ingen test av `lang="nb"` i rotlayout | low | Riktig; en tekstbasert test er enkel nok nå, full rendering kommer med Playwright (4.4) | patch |
| B12 | README-strukturen mangler `scripts/` og `issues/` og hvordan testsider hentes | low | Riktig, direkte rettelse | patch |
| E1 | Menyen kan flyte over under ca. 300 px | low | Riktig under 320 px; liten CSS-rettelse | patch |
| E2 | `data/` i .gitignore er ikke forankret til roten | low | Riktig: vil skjule fremtidige `**/data/`-mapper | patch |
| E3 | `config.ts` mangler `server-only`-vakt | low | Ingen klient importerer den ennå; vurderes når serverkode kommer (Story 1.4) | defer |
| E4 | Relativ `DATABASE_PATH` løses mot `process.cwd()` | low | npm-skriptene kjøres alltid fra roten; rettelsen gir mer kompleksitet | reject |
| E6 | Fargetesten godtar ≥ 18 i stedet for nøyaktig antall | low | Riktig, direkte rettelse (`toBe(18)`) | patch |
| E7 | Farger i tokens.css som ikke finnes i DESIGN.md sjekkes ikke | low | Lite sannsynlig, krever ekstra logikk | reject |
| E8 | Testene leser filer relativt til `process.cwd()` | low | Vitest kjøres fra roten via `npm test`; lite sannsynlig | reject |
| E9 | `vitest.config.mts` i stedet for `.ts` | false | Avviket er bevisst og begrunnet i Implementation Notes | reject |
| E10 | Mapper-teksten avviker fra EXPERIENCE.md | false | EXPERIENCE.md har ingen tekst for «ingen mapper»; teksten er dokumentert i Implementation Notes | reject |

## Verification

**Commands:**
- `npm run lint` -- expected: 0 feil
- `npm test` -- expected: alle tester grønne
- `npm run build` -- expected: bygget lykkes

**Manual checks:**
- Skjermbilde med Playwright (installert Chromium) av `/` på 360 px og 1280 px, lys og mørk: toppmeny på to linjer på mobil, aktiv markering, riktige farger.
