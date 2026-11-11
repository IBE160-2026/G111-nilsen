# Epic 1 Context: Les og skaler en oppskrift

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Brukeren kan legge inn en oppskrift selv, se den i et fast og ryddig format, velge hvor mange porsjoner maten skal lages til og krysse av ingredienser og steg under matlaging. Skalering er appens viktigste regel og må være forutsigbar og fullt testet, fordi brukeren skal kunne stole på tallene uten å regne selv. Epicen legger også grunnmuren resten av appen bygger på: Next.js-prosjektet med lagdeling, designtokens, toppmeny, SQLite med migrasjoner, `Result`-typen, felles feilmeldinger og testoppsett. Import fra lenke, samling/mapper/favoritter og forslag kommer i senere epics.

## Stories

- Story 1.1: Start appen med toppmeny og visuell profil
- Story 1.2: Tolk mengder og ingredienslinjer
- Story 1.3: Skaler og formater mengder
- Story 1.4: Legg inn en oppskrift manuelt
- Story 1.5: Se oppskriften i fast format og velg antall porsjoner
- Story 1.6: Kryss av under matlaging

## Requirements & Constraints

- **Tolking:** heltall, desimal med komma eller punktum, brøk (1/2), brøktegn (½), blandet tall (1 ½, 1 1/2) og områder (2–3, 2-3). Enhet rett etter tallet (750g, 2dl) gjenkjennes. Minst g, kg, ml, dl, l, ss, ts, krm, stk, fedd, pk, boks, never og engelsk tbsp, tsp, cup, oz, lb; listen kan utvides.
- **Utolkbare linjer** (uten mengde: «nutmeg», «salt og pepper», «en klype salt») vises med originaltekst og skaleres aldri. «2 ss» (mengde uten navn) er tolkbar og skaleres.
- **Skalering** med faktor valgt/opprinnelig: enheten beholdes (ingen konvertering); brøktegn ½ ¼ ¾ ⅓ ⅔ (evt. med heltall foran) vises når brøkdelen avviker ≤ 5 % av selve brøken (avgjort 2026-11-09: 5,4 → «5,4», 1,24 → «1 ¼»), ellers komma og maks én desimal; udelelige ingredienser (egg, løk, fedd, stk) rundes til nærmeste hele tall, minst 1, og merkes «ca.» når verdien endret seg; g og ml over 100 rundes til to gjeldende sifre; områder skaleres i begge ender.
- **Fasit** (opprinnelig 4), hvert tilfelle er en egen automatisk test:

  | Linje | Valgt | Forventet |
  |---|---|---|
  | 400 g mel | 6 | 600 g mel |
  | ½ ts salt | 6 | ¾ ts salt |
  | 1 ½ dl fløte | 2 | ¾ dl fløte |
  | 0,5 dl olje | 8 | 1 dl olje |
  | 1 egg | 3 | 1 egg (ca.) |
  | 2 egg | 3 | 2 egg (ca.) |
  | 2–3 ss sukker | 8 | 4–6 ss sukker |
  | en klype salt | 8 | en klype salt |
  | 1 fedd hvitløk | 2 | 1 fedd hvitløk (ca.) |
  | 750 g potet | 3 | 560 g potet |

- **Avgjort 2026-11-04:** g/ml under 100 avrundes til hele tall (37,5 g → 38 g); over 100 til to gjeldende sifre (PRD FR-8 regel 4).
- **Porsjonsantall:** heltall 1–50 via −/+ eller inntasting; ugyldig verdi gir melding og forrige verdi beholdes; tilbakestilling med én handling; oppdatering uten innlasting og uten merkbar forsinkelse.
- **Manuell innlegging:** tittel, porsjonsantall (heltall ≥ 1) og minst én ingredienslinje er påkrevd; ingredienser og steg én per linje. Ved feil lagres ingenting. Oppskriften tolkes, vises og skaleres som en importert.
- **Fast format:** tittel, kilde (eller «Lagt inn selv»), porsjonsvelger, ingredienser per seksjon, nummererte steg.
- **Avkrysning** påvirker ikke skalering, overlever endret porsjonsantall og lagres ikke når oppskriften lukkes.
- **Kjørbarhet og språk:** kjører lokalt med Node.js 22+ og npm, uten databaseserver eller nøkler. All tekst brukeren ser er norsk bokmål (`html lang="nb"`). 360 px til desktop, WCAG 2.1 AA, alt nåbart med tastatur, alle felt med etiketter. README oppdateres i siste story.

## Technical Decisions

- **Stack (låst):** Node.js 22 LTS+, Next.js 16.4.5 (App Router, create-next-app), React 19.3.0, TypeScript 5.9.3, ESLint 9.39.5 med eslint-config-next, Prettier 3.9.10, Vitest 5.1.0 med jsdom og Testing Library. drizzle-orm/drizzle-kit, better-sqlite3 og zod låses i `package-lock.json` når de innføres i Story 1.4. `npm run lint` og `npm test` skal være grønne før commit. npm-registeret har vært blokkert i utviklingsmiljøet, så installasjon og kjøring kan måtte skje på Majas maskin.
- **Lagdeling:** `src/domain/` (ren kjerne), `src/server/{services,ports,adapters,db}`, `src/app/`, `src/components/`, `src/lib/`, `src/styles/`. Lovlig retning: app → services/domain, services → domain/ports/repositories, repositories → db. Alt annet er forbudt.
- **Ren domenekjerne:** `src/domain/` importerer aldri fra `next`, `react`, `src/server/`, `src/app/` eller database-/nettverkspakker. Tolking, skalering og formatering finnes bare her og brukes både på server og i klient (`parseLine`, `scaleLine(line, factor)`, `formatQuantity`, én enhetstabell som normaliserer til faste nøkler).
- **Typer:** kode og filnavn på engelsk. `Recipe`, `IngredientLine` (med `section` som felt), `Step`, `Quantity = { min: number; max?: number }`. Heltalls-ID-er fra SQLite; tidspunkt som ISO 8601-tekst i UTC.
- **Originalen er fasit:** hver linje lagres med originaltekst og tolkede felt (mengde, enhet, navn, seksjon, rekkefølge); oppskriften lagrer opprinnelig og sist valgt porsjonsantall. Skalerte verdier beregnes ved visning og lagres aldri.
- **Database:** én fil `data/recipemate.db` (ikke i git). `src/server/db/schema.ts` er eneste skjema; i denne epicen bare oppskrift, ingredienslinje og steg. Migrasjoner med drizzle-kit i `drizzle/` (committes), kjøres med `npm run db:migrate`. Bare repositoriene i `src/server/db/repositories/` bruker Drizzle. Oppskrifter lagres som «ikke i samlingen».
- **Skriving og lesing:** skriving via Server Actions (`src/app/ny/actions.ts` for manuell innlegging) med zod-validering som kaller `recipe-service`. Lesing i Server Components via tjenester; oppskriftssiden ligger under `src/app/oppskrift/[id]`. Ingen REST-ruter.
- **Feil som verdier:** tjenester returnerer `Result<T, AppError>` (`{ ok: true, value }` / `{ ok: false, error: { kind, detail? } }`) fra `src/lib/result.ts`, med faste `kind`-strenger (her særlig `validation`). Alle norske meldinger ligger i `src/lib/messages.ts`.
- **Konfigurasjon:** miljøvariabler leses bare i `src/server/config.ts`; `.env.example` uten ekte verdier; appen starter uten `.env`.
- **Avkrysning** er React-tilstand i oppskriftsvisningen, nøklet på linje-ID.
- **Stil og filer:** tokens som CSS-variabler i `src/styles/tokens.css`, ingen hardkodede farger. kebab-case for moduler (`scale-line.ts`), PascalCase for komponenter (`ServingStepper.tsx`), tester ved siden av koden som `*.test.ts`. Ingen test gjør nettverkskall.

## UX & Interaction Patterns

- **Uttrykk:** varm og rolig kokebok. Én aksentfarge (tomat `#B8432F`, mørk `#E58A6E`) for handlinger, lenker, porsjonsvelger og «ca.»; ingen grønt/rødt for tilstander, ingen skygger eller gradienter. Lys/mørk palett følger `prefers-color-scheme`; verdiene står i DESIGN.md.
- **Typografi og form:** Georgia for tittel (28 px) og kortoverskrifter (20 px); systemfont 17 px brødtekst; mengder halvfete med tabulære tall; seksjonsetiketter 12 px store bokstaver; meta 14 px. Avstand 4/8/12/16/24/32 px; hjørner 10 px (knapper, felt), 14 px (kort), runde stepper-knapper. Kort skilles med farge og tynn kant.
- **Toppmeny:** Importer (startside), Samlingen, Mapper, Favoritter; aktiv side med understrek i aksentfarge. Under 768 px logo på egen linje og menypunktene fordelt over bredden under, hvert minst 44 px høyt. De tre siste viser tom-tilstand med forklaring og vei videre.
- **Manuell innlegging:** nås fra Importer; synlige etiketter, feil under feltet koblet med `aria-describedby`, knappen «Lagre oppskrift».
- **Porsjonsvelger:** kort «Antall porsjoner», runde −/+ (44 px) i aksentfarge, tall i Georgia 24 px, «Tilbakestill til N» når valgt ≠ opprinnelig, feilmelding under feltet. Endret antall annonseres for skjermleser.
- **Ingredienslinje:** mengde i egen kolonne til venstre, navn til høyre, tynn skillelinje, «ca.» i aksentfarge 12 px, utolkbare linjer i kursiv dempet tekst; seksjoner som etiketter.
- **Avkrysning:** ekte avkrysningsboks med etikett; trykk hvor som helst på linjen/steget; avkrysset gir fylt boks i aksentfarge, gjennomstreking og dempet tekst. Virker med tastatur.
- **Oppsett:** under 768 px én kolonne; fra 768 px ingredienser og porsjonsvelger til venstre, steg til høyre, maks 1040 px.
- **Tilgjengelighet og stemme:** synlig fokus, logisk tabulatorrekkefølge, trykkflater minst 44 × 44 px, tekst kan forstørres til 200 %, bare trykk/klikk. Du-form, korte setninger, verb på knapper, ingen utropstegn; feilmeldinger sier hva som skjedde og hva brukeren kan gjøre.

## Cross-Story Dependencies

- 1.1 er grunnmuren (prosjekt, struktur, tokens, meny, `Result`, `config.ts`, Vitest/ESLint, README) for alle andre stories.
- 1.3 bygger på tolkingen i 1.2; 1.5 bruker begge til visning og skalering.
- 1.4 innfører databaseskjema, migrasjon, Server Action og `recipe-service`; 1.5 leser oppskriften derfra; 1.6 bygger på oppskriftssiden fra 1.5 og oppdaterer README for epicen.
- Mot senere epics: Epic 2 gjenbruker tolking, visning og «ikke i samlingen»-lagring, og legger til «oppr. N · endre», dialogen for manglende porsjonsantall og feilmelding-komponenten. Epic 3 bruker sist valgt porsjonsantall og flytter oppskrifter inn i samlingen. Endret 2026-11-09 (sprint-change-proposal-2026-11-09.md): epicene bygges 1 → 3 → 2 → 4, manuelt innlagte oppskrifter lagres rett i samlingen (Story 3.1), og redigering kommer i Story 3.5.
