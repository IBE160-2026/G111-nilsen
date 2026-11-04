# Epic 1 Context: Les og skaler en oppskrift

<!-- Compiled from planning artifacts. Edit freely. Regenerate with compile-epic-context if planning docs change. -->

## Goal

Brukeren kan legge inn en oppskrift selv, se den i et fast og ryddig format, velge hvor mange personer maten skal lages til (alle mengder regnes om med en gang etter faste regler) og krysse av ingredienser og steg under matlaging. Skalering er appens viktigste regel og må være forutsigbar og fullt testet. Epicen legger også grunnmuren resten av appen bygger på: Next.js-prosjektet, mappestruktur og lagdeling, designtokens, toppmeny, SQLite-database med migrasjoner, `Result`-typen, felles feilmeldinger og testoppsett. Import fra lenke (Epic 2), lagring i samlingen (Epic 3) og forslag (Epic 4) er ikke med her.

## Stories

- Story 1.1: Start appen med toppmeny og visuell profil
- Story 1.2: Tolk mengder og ingredienslinjer
- Story 1.3: Skaler og formater mengder
- Story 1.4: Legg inn en oppskrift manuelt
- Story 1.5: Se oppskriften i fast format og velg antall personer
- Story 1.6: Kryss av under matlaging

## Requirements & Constraints

- **Tolking:** mengder som heltall, desimal med komma eller punktum, brøk (1/2), brøktegn (½), blandet tall (1 ½, 1 1/2) og områder (2–3, 2-3). Enhet rett etter tallet (750g, 2dl) gjenkjennes. Minst enhetene g, kg, ml, dl, l, ss, ts, krm, stk, fedd, pk, boks, never og engelsk g, kg, ml, l, tbsp, tsp, cup, oz, lb; listen kan utvides ved behov.
- **Utolkbare linjer** (uten mengde, f.eks. «nutmeg», «salt og pepper», «en klype salt») vises med originaltekst og skaleres aldri. En linje med mengde men uten navn («2 ss») er tolkbar og skaleres; den fjernes ikke.
- **Skaleringsregler** (faktor = valgt / opprinnelig porsjonsantall):
  1. Enheten beholdes; ingen konvertering mellom enheter.
  2. Innenfor 5 % av ½, ¼, ¾, ⅓ eller ⅔ (eventuelt med heltall foran) vises brøktegn; ellers desimal med komma og maks én desimal.
  3. Udelelige ingredienser (egg, løk, fedd, stk) rundes til nærmeste hele tall, minst 1, og merkes «ca.» når avrundingen endret verdien.
  4. g og ml over 100 avrundes til to gjeldende sifre.
  5. Områder skaleres i begge ender.
  6. Linjer uten mengde endres ikke.
- **Fasit (opprinnelig 4 personer)** – hvert eksempel er en egen automatisk test:

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

- **Åpent spørsmål:** om g/ml under 100 også skal avrundes (f.eks. 37,5 g) er ikke avgjort. Må bestemmes før skaleringen implementeres; ikke anta et svar.
- **Porsjonsantall:** heltall 1–50, med −/+ og inntasting. Ugyldig verdi (0, 51, ikke heltall) avvises med melding, og forrige verdi beholdes. Tilbakestilling til opprinnelig antall med én handling. Mengder oppdateres uten ny innlasting og uten merkbar forsinkelse.
- **Manuell innlegging:** tittel, porsjonsantall (heltall ≥ 1) og minst én ingredienslinje er påkrevd; ingredienser og steg skrives én per linje. Feil gir forklarende melding under feltet, og ingenting lagres. Oppskriften tolkes og vises som en importert.
- **Fast format:** tittel, kilde (eller «Lagt inn selv»), porsjonsvelger, ingredienser gruppert per ingrediensseksjon, nummererte steg.
- **Avkrysning** påvirker ikke skalering, overlever endring av porsjonsantall, men lagres ikke når oppskriften lukkes.
- **Kjørbarhet:** lokalt med Node.js 22+ og npm, uten databaseserver, kontoer eller nøkler. README beskriver installasjon, migrasjon, kjøring og testing, og oppdateres i siste story.
- **Språk og tilgjengelighet:** all tekst brukeren ser er norsk bokmål (`html lang="nb"`). 360 px til desktop, WCAG 2.1 AA-kontrast, alt nåbart med tastatur, alle skjemafelt med etiketter.

## Technical Decisions

- **Stack:** Next.js 16.4 (App Router, TypeScript) satt opp med create-next-app, React 19, ESLint + Prettier, Drizzle ORM + better-sqlite3, zod, Vitest. Øvrige versjoner låses i `package-lock.json`. `npm run lint` og `npm test` skal være grønne før commit.
- **Lagdeling:** `src/domain/` (ren kjerne), `src/server/{services,ports,adapters,db}`, `src/app/`, `src/components/`, `src/lib/`, `src/styles/`. Lovlige avhengigheter: app → services/domain, services → domain/ports/repositories, repositories → db.
- **Ren domenekjerne:** `src/domain/` importerer aldri fra `next`, `react`, `src/server/`, `src/app/`, database- eller nettverkspakker. All tolking, skalering og formatering ligger bare her og brukes både på server og i klient (f.eks. `parseLine`, `scaleLine(line, factor)`, `formatQuantity`, én enhetstabell som normaliserer til faste nøkler).
- **Typer og begreper:** kode og filnavn på engelsk. `Recipe`, `IngredientLine` (med `section` som felt), `Step`. `Quantity = { min: number; max?: number }`. Heltalls-ID-er fra SQLite, tidspunkt som ISO 8601-tekst i UTC.
- **Originalen er fasit:** hver ingredienslinje lagres med originaltekst og tolkede felt (mengde, enhet, navn, seksjon, rekkefølge). Oppskriften lagrer opprinnelig og sist valgt porsjonsantall. Skalerte mengder beregnes ved visning fra originalen og lagres aldri.
- **Database:** én SQLite-fil `data/recipemate.db` (ikke i git). `src/server/db/schema.ts` er eneste skjemadefinisjon; i denne epicen bare tabellene for oppskrift, ingredienslinje og steg. Migrasjoner lages med drizzle-kit, ligger i `drizzle/` og committes; npm-skript for migrasjon. Bare repositoriene i `src/server/db/repositories/` bruker Drizzle. Oppskrifter lagres som «ikke i samlingen» (Epic 3 legger dem i samlingen).
- **Skriving og lesing:** all skriving via Server Actions i `src/app/**/actions.ts` med zod-validering som kaller en tjeneste (`recipe-service`). Lesing i Server Components via tjenester. Ingen REST-ruter.
- **Feil som verdier:** tjenester returnerer `Result<T, AppError>` (`{ ok: true, value }` / `{ ok: false, error: { kind, detail? } }`) definert i `src/lib/result.ts`. `kind` er faste strenger (her særlig `validation`). Alle norske feilmeldinger ligger i `src/lib/messages.ts`; ingen andre steder skriver feiltekst.
- **Konfigurasjon:** miljøvariabler leses bare i `src/server/config.ts`. `.env.example` lister variabler uten ekte verdier; appen starter uten `.env`.
- **Avkrysning** er React-tilstand i oppskriftsvisningen, nøklet på linje-ID.
- **Stil:** farger, typografi og avstander som CSS-variabler i `src/styles/tokens.css`; ingen hardkodede farger i komponenter.
- **Filnavn og tester:** kebab-case for moduler (`scale-line.ts`), PascalCase for komponenter (`ServingStepper.tsx`), tester ved siden av koden som `*.test.ts`. Ingen test gjør nettverkskall.
- **Miljø:** npm-registeret har vært blokkert i utviklingsmiljøet; `npm install`, dev-server og tester kan måtte kjøres på Majas maskin.

## UX & Interaction Patterns

- **Uttrykk:** varmt og rolig som en kokebok. Én aksentfarge (tomat `#B8432F`, mørk `#E58A6E`) for handlinger, lenker, porsjonsvelger og «ca.»; ingen grønt/rødt for tilstander, ingen skygger, ingen gradienter. Lys og mørk palett følger `prefers-color-scheme`; verdiene står i DESIGN.md.
- **Typografi:** Georgia for tittel (28 px) og kortoverskrifter (20 px); systemfont 17 px brødtekst; mengder halvfete med tabulære tall; seksjonsetiketter 12 px store bokstaver; meta 14 px. Brøker med brøktegn.
- **Form:** avstandsskala 4/8/12/16/24/32 px; hjørner 10 px (knapper, felt), 14 px (kort), runde stepper-knapper. Kort skilles med farge og tynn kant.
- **Toppmeny:** Importer (startside), Samlingen, Mapper, Favoritter; aktiv side med understrek i aksentfarge. Under 768 px: logo på egen linje, menypunkter fordelt over bredden på linjen under, hvert minst 44 px høyt. Samlingen, Mapper og Favoritter viser tom-tilstand med forklaring og vei videre.
- **Manuell innlegging:** nås fra Importer. Synlige etiketter, feil under feltet koblet med `aria-describedby`, knappen «Lagre oppskrift».
- **Porsjonsvelger:** kort med «Antall personer», runde −/+ (44 px) i aksentfarge, tall i Georgia 24 px, «oppr. N · endre», «Tilbakestill til N» når valgt ≠ opprinnelig, feilmelding under feltet. Endret antall annonseres for skjermleser.
- **Ingredienslinje:** mengde i egen kolonne til venstre, navn til høyre, tynn skillelinje, «ca.» i aksentfarge 12 px, utolkbare linjer i kursiv dempet tekst. Seksjoner vises som etiketter.
- **Avkrysning:** ekte avkrysningsboks med etikett; trykk hvor som helst på linjen eller steget; avkrysset gir fylt boks i aksentfarge, gjennomstreking og dempet tekst. Virker med tastatur.
- **Oppsett:** under 768 px én kolonne; fra 768 px ingredienser og porsjonsvelger til venstre, steg til høyre, maks 1040 px bredt.
- **Tilgjengelighet:** synlig fokus, logisk tabulatorrekkefølge, trykkflater minst 44 × 44 px, tekst kan forstørres til 200 %. Bare trykk/klikk, ingen sveip.
- **Stemme:** du-form, korte setninger, verb på knapper, ingen utropstegn; feilmeldinger sier hva som skjedde og hva brukeren kan gjøre.

## Cross-Story Dependencies

- 1.1 er grunnmuren (prosjekt, struktur, tokens, meny, `Result`, `config.ts`, Vitest/ESLint, README) for alle andre stories.
- 1.3 bygger på tolkingen i 1.2; 1.5 bruker begge til visning og skalering.
- 1.4 innfører databaseskjema, migrasjon, Server Action og `recipe-service`; 1.5 leser oppskriften derfra. 1.6 bygger på oppskriftssiden fra 1.5 og oppdaterer README for epicen.
- Mot senere epics: Epic 2 gjenbruker tolking, visning og «ikke i samlingen»-lagring; «oppr. N · endre» og manglende porsjonsantall-dialog fullføres der. Epic 3 bruker sist valgt porsjonsantall og legger oppskrifter i samlingen. Feilmelding-komponenten (venstrekant i aksentfarge, `role="alert"`) kommer i Epic 2.
