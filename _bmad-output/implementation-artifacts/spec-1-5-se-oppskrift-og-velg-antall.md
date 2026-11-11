---
title: 'Story 1.5: Se oppskriften i fast format og velg antall porsjoner'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: 'a032bc7d15d242845279ee80b740d51841462cae'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Oppskriftssiden fra Story 1.4 viser bare originalteksten. Brukeren kan ikke velge antall porsjoner, og mengdene står ikke i egen kolonne slik DESIGN.md beskriver.

**Approach:** Bygg oppskriftsvisningen i fast format med porsjonsvelger. Skalering og formatering skjer i nettleseren med domenefunksjonene fra Story 1.2–1.3 (`scaleLine`, `formatQuantity`), alltid fra originalmengdene. Valgt antall lagres ikke i denne storyen (Story 3.2).

## Boundaries & Constraints

**Always:**
- Rekkefølge: tittel, kilde (`sourceLabel`), porsjonsvelger, ingredienser gruppert per ingrediensseksjon, nummererte steg (FR-5, UX-DR15).
- Skalering beregnes fra `RecipeLine` (originalmengde) med faktor valgt/opprinnelig (AD-1, AD-2); ingenting skalert lagres eller sendes til serveren.
- Porsjonsvelger (UX-DR4): etikett «Antall porsjoner», runde −/+ (44 px), tallfelt for heltall 1–50, «oppr. N» som tekst, knappen «Tilbakestill til N» når valgt ≠ opprinnelig. Ugyldig inntasting (0, 51, 2,5, tom, bokstaver) gir melding under feltet når feltet mister fokus eller Enter trykkes, og forrige gyldige verdi beholdes. −/+ er deaktivert ved 1/50.
- Endret antall annonseres for skjermleser (`aria-live="polite"`), uten at hver tastetrykk leses opp.
- Ingredienslinje (UX-DR5): mengde og enhet i egen kolonne (halvfet, tabulære tall), navn ved siden av, «ca.» i aksentfarge når `approximate`; utolkbare linjer i kursiv dempet tekst over hele bredden og uendret ved alle antall.
- Oppsett (UX-DR15): én kolonne under 768 px; fra 768 px ingredienser og porsjonsvelger til venstre og steg til høyre, maks 1040 px.
- Sidetittel i nettleserfanen er oppskriftens tittel («Pannekaker · RecipeMate») (utsatt fra 1.4).
- Oppskrifter uten opprinnelig porsjonsantall (`null`, mulig fra import i Epic 2) viser ingrediensene uskalert og ingen porsjonsvelger.

**Never:**
- Ingen lagring av valgt antall, ingen «endre opprinnelig antall» og ingen dialog for manglende antall (Story 3.2 og 2.4).
- Ingen avkrysning (Story 1.6) og ingen forslag (Epic 4).
- Ingen endring i domenets tolke- og skaleringsregler.

## I/O & Edge-Case Matrix

| Scenario | State / handling | Forventet | Feil |
|----------|------------------|-----------|------|
| Åpne | Oppskrift for 4 med «400 g mel», «1 egg», «salt og pepper» | «Antall porsjoner» viser 4; mengder som original; ingen «Tilbakestill» | N/A |
| Pluss | Trykk + én gang | 5; «500 g mel», «1 egg ca.» ; «salt og pepper» uendret; skjermleser hører «5 porsjoner» | N/A |
| Minus til grense | Fra 2, trykk − to ganger | 1; − er deaktivert | N/A |
| Skriv gyldig | Skriv 8 og forlat feltet | Mengder for 8; «Tilbakestill til 4» vises | N/A |
| Skriv ugyldig | Skriv 0, 51, 2,5, tomt eller «abc» og forlat feltet | Melding under feltet; antall og mengder fra forrige gyldige verdi | validation |
| Tilbakestill | Valgt 8, trykk «Tilbakestill til 4» | 4; knappen forsvinner; mengder som original | N/A |
| Ingen porsjoner | `originalServings = null` | Ingen porsjonsvelger; mengder vises uskalert | N/A |
| Seksjoner | Linjer med `section` «Saus» og uten seksjon | Linjer uten seksjon først, deretter etikett «SAUS» med sine linjer, i lagret rekkefølge | N/A |
| Fanetittel | Oppskrift «Pannekaker» | `<title>` «Pannekaker · RecipeMate» | N/A |

</frozen-after-approval>

## Code Map

- `src/app/oppskrift/[id]/page.tsx` -- server: `params` og `connection()` inne i Suspense, `getRecipe`, `notFound()`; behold denne strukturen. Legg til `generateMetadata` (les Next-dokumentasjonen om metadata med Cache Components i `node_modules/next/dist/docs/` først).
- `src/components/RecipeView.tsx` (+ `.module.css`, `.test.tsx`) -- serverkomponent fra 1.4 med `sourceLabel` og `LineText`; deles i server-del (tittel, kilde, steg) og en klientkomponent for porsjonsvelger og ingredienser.
- `src/domain/index.ts` -- `scaleLine`, `formatQuantity`, `formatLine`, typene `Recipe`, `RecipeLine`, `ScaledLine`. Domenet er rent og kan importeres i klientkomponenter.
- `src/styles/tokens.css` -- tokens for farger, `--tap-target-min`, typografi; ingen hardkodede farger.
- `src/lib/messages.ts` -- legg feltmelding for ugyldig antall her (AD-7).
- `_bmad-output/planning-artifacts/ux-designs/ux-RecipeMate-2026-11-04/mockups/key-screens.html` -- skjerm 1 viser porsjonsvelger og ingredienslinjer (spine-dokumentene gjelder ved konflikt).

## Tasks & Acceptance

**Execution:**
- [x] `src/components/ServingStepper.tsx` (+ CSS, test) -- porsjonsvelgeren etter reglene over; kontrollert komponent (`value`, `onChange`, `original`).
- [x] `src/components/IngredientList.tsx` (+ CSS, test) -- klientkomponent som holder valgt antall, viser `ServingStepper` og skalerte linjer gruppert per seksjon.
- [x] `src/components/RecipeView.tsx` -- bruk `IngredientList`; to kolonner fra 768 px; steg nummerert.
- [x] `src/app/oppskrift/[id]/page.tsx` -- `generateMetadata` med oppskriftens tittel (ukjent id gir standardtittel).
- [x] `src/lib/messages.ts` -- melding for ugyldig antall porsjoner.
- [x] Tester -- én per matrise-rad (Testing Library i jsdom), pluss at mengdene alltid regnes fra originalen etter flere endringer.

**Acceptance Criteria:**
- Given oppskriftssiden, when antallet endres med knapper eller tastatur, then oppdateres mengdene uten ny innlasting og uten serverkall.
- Given 360 px og 1280 px, lys og mørk modus, when siden vises, then følger oppsett og farger DESIGN.md og EXPERIENCE.md.

## Implementation Notes

Implementert i commit `31abf37` (arbeidskopi, ikke flettet eller pushet).

- **ServingStepper** (`src/components/ServingStepper.tsx`): kontrollert (`value`, `onChange`, `original`). Feltet holder en kladd mens brukeren skriver; den valideres ved blur eller Enter (`parseServings`: bare sifre, 1–50 fra `LIMITS` i `src/lib/recipe-input.ts`). Ugyldig verdi gir meldingen under feltet (`aria-describedby`, `aria-invalid`), feltet går tilbake til forrige gyldige tall og `onChange` kalles ikke. −/+ er `disabled` ved 1/50. «oppr. N» står under etiketten; «Tilbakestill til N» er en tekstknapp (44 px høy) som bare vises når valgt ≠ opprinnelig. En skjult `role="status"`/`aria-live="polite"` viser «N porsjoner» og endres bare når verdien tas i bruk, ikke per tastetrykk.
- **IngredientList** (`src/components/IngredientList.tsx`, klient): valgt antall er React-tilstand; hver visning kaller `scaleLine(line, valgt/opprinnelig)` på de lagrede `RecipeLine`-ene, så det regnes aldri fra en tidligere skalert verdi og ingenting sendes til serveren. `groupBySection` sorterer på `position`, legger linjer uten seksjon (eller med tom seksjon) først og deretter seksjonene i rekkefølgen de først dukker opp. Seksjonsetiketten er en `h3` (12 px, store bokstaver via CSS, så DOM-teksten er «Saus»), og listen er koblet til den med `aria-labelledby`. `originalServings = null` gir ingen porsjonsvelger og faktor 1.
- **Ingredienslinje:** mengde + enhet i egen grid-kolonne (halvfet, tabulære tall), navn ved siden av, «ca.» (12 px, aksentfarge) etter navnet. Utolkbare linjer er én kursiv, dempet blokk over hele bredden.
- **RecipeView:** meta-linjen viser nå bare kilden (antall porsjoner står i porsjonsvelgeren). Under 768 px én kolonne i rekkefølgen tittel, kilde, porsjonsvelger, ingredienser, steg; fra 768 px grid `5fr / 6fr` innenfor `.page` (maks 1040 px). Stegene sorteres på `position` og vises i `<ol>`.
- **Fanetittel:** `generateMetadata` i `src/app/oppskrift/[id]/page.tsx` avventer `params` og `connection()` og leser oppskriften (siden er allerede dynamisk, så Cache Components krever ingen ekstra markør). Oppslaget er pakket i React `cache`, så metadata og side deler én lesing per forespørsel. Ukjent/ugyldig id gir standardtittelen «Oppskrift» (→ «Oppskrift · RecipeMate»).
- **Melding:** `servingStepperMessages.invalid` i `src/lib/messages.ts` («Skriv et helt tall fra 1 til 50. Antallet er ikke endret.»), dekket av testen mot utropstegn.
- **Tester:** `ServingStepper.test.tsx` (22), `IngredientList.test.tsx` (15, én per matriserad + «alltid fra originalen» etter mange endringer + at `fetch` ikke kalles), oppdatert `RecipeView.test.tsx` (rekkefølge i fast format, null-porsjoner) og `page.test.tsx` (fanetittel for kjent og ukjent id). Ingen nye pakker; `package-lock.json` er uendret.

**Verifisering:** `npm run lint`, `npm run typecheck`, `npm test` (30 filer, 472 tester), `npm run format:check` og `npm run build` er grønne. Manuelt: `next build && next start` mot en midlertidig database med «Pannekaker» (4 porsjoner) — HTML-en har `<title>Pannekaker · RecipeMate</title>`, porsjonsvelgeren, `aria-live` og mengdene; ukjent id gir `<title>Oppskrift · RecipeMate</title>`. Klikk og tastatur i ekte nettleser er bare testet i jsdom.

**Ikke gjort:** skjermbilder på 360 og 1280 px i lys og mørk modus (Playwright-Chromium kan ikke lastes ned i utviklingsmiljøet) må tas på Macen, sammen med en rask sjekk av oppsettet ved 768 px og 200 % tekststørrelse.

**Verdt å vite:** −/+ bruker `disabled`, så en tastaturbruker som trykker − ned til 1 mister fokus på knappen. Spesifikasjonen sier «deaktivert»; `aria-disabled` ville beholdt fokus om det blir ønsket senere.

### Rettelser etter kodegjennomgang

Rettet i commit `7b27741` (se Review Triage Log): stabil `key` i `IngredientList`; ugyldig `selectedServings` (utenfor 1–50) gir `null` i stedet for å skalere; `role="alert"` på feilmeldingen i porsjonsvelgeren; feilmeldingen bygges av `LIMITS`; `notFound()` brukes bare for ugyldig id eller `not_found`, andre feil går til `error.tsx`; nye tokens `--type-stepper-value-size` og `--stepper-border-width`. Nye tester for omrendring, 0/60/-2/2,5, `role="alert"` og feilsti. Etter retting: 30 filer, 480 tester, lint, typecheck, format og bygg grønne; `package-lock.json` uendret.

## Spec Change Log

## Review Triage Log

Gjennomgang 1 (2026-11-09): Blind Hunter (B), Edge Case Hunter (E), Verification Gap (V: ingen hull funnet).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|---|---|---|---|
| 1 | Valgt antall kan henge igjen ved navigering til en annen oppskrift (B1, E3) | medium | `useState` leser prop bare første gang; samme instans kan gjenbrukes | patch |
| 2 | Opprinnelig antall utenfor 1–50 eller 0 gir uendelig faktor eller låst velger (B2, E1, E2) | medium | Ingen CHECK i databasen; import (Epic 2) kan gi slike verdier | patch |
| 3 | Feilmeldingen i porsjonsvelgeren leses ikke opp (B3) | medium | Feilen vises ved blur, når fokus har forlatt feltet | patch |
| 4 | Feilmeldingen har «1 til 50» hardkodet (B4) | low | Direkte rettelse: bygg fra `LIMITS` | patch |
| 5 | Hardkodede skriftstørrelser og vekter i stepperens CSS (B7) | low | Bryter med tokens fra DESIGN.md; direkte rettelse | patch |
| 6 | Databasefeil gir 404 i stedet for feilsiden (B9) | low | Bare `not_found` skal gi 404; andre feil til `error.tsx` | patch |
| 7 | Seksjoner i steg vises ikke (E5) | low | Bare relevant for import med `HowToSection` | defer (Epic 2) |
| 8 | Ugyldig inntasting forsvinner fra feltet (B5) | low | Følger spesifikasjonen (forrige gyldige verdi beholdes); meldingen forklarer | reject |
| 9 | Mangler spinbutton-roller og piltaster (B6) | low | Etikett og −/+ dekker behovet; rettelsen gir ny oppførsel | reject |
| 10 | Hardkodede id-er (B8) | low | Én oppskrift per side | reject |
| 11 | Ingen test av `cache`-deduplisering og titteltemplate (B10) | low | Ingen synlig effekt for brukeren | reject |
| 12 | `parseable` og `quantity === null` koblet uklart (B11) | false | Tolkbare linjer har alltid mengde (`parseLine`) | reject |
| 13 | Valgt antall lagres ikke (B12) | false | Bevisst; Story 3.2 | reject |
| 14 | Porsjonsantall vises ikke i toppteksten uten velger (B13) | low | Uten gyldig antall finnes ingenting å vise | reject |
| 15 | Tom ingrediensliste viser bare overskriften (E4) | low | Skjemaet krever minst én ingrediens | reject |
| 16 | Klikk på −/+ rett etter ugyldig inntasting fjerner feilen (E6) | low | Antallet endres riktig fra forrige gyldige verdi | reject |

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run format:check`, `npm run build` -- expected: alle grønne

**Manual checks:**
- `npm run build && npm start`: legg inn en oppskrift, endre antall med knapper og tastatur, prøv ugyldige verdier. Ta skjermbilde på 360 og 1280 px hvis mulig, ellers noter at det må tas på Macen.
