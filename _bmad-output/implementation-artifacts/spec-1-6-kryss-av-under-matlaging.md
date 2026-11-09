---
title: 'Story 1.6: Kryss av under matlaging'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '96864f51f2037e301ea8b2aa0522c0cd24d072ac'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Mens jeg lager maten har jeg ingen måte å holde oversikt på hva som er gjort. Oppskriftssiden fra Story 1.5 viser ingredienser og steg, men ingenting kan krysses av.

**Approach:** Gjør hver ingredienslinje og hvert steg til en ekte avkrysningsboks med etikett, der hele raden er trykkflate. Avkrysning er ren klienttilstand (AD-10): den nøkles på linje-id og steg-id, lagres aldri, påvirker ikke skalering og overlever endret antall personer. Fordi Next.js med Cache Components skjuler en side i stedet for å avmontere den (Activity), må tilstanden nullstilles eksplisitt når siden skjules, ellers ville avkrysningene stått igjen når jeg åpner oppskriften på nytt. Story 1.6 avslutter Epic 1, så README oppdateres med hva epicen inneholder og hvordan testene kjøres. Tastaturfokus på porsjonsvelgerens −/+ ved grensene (utsatt fra 1.5) rettes samtidig, siden den samme siden skal kunne brukes helt uten mus.

## Boundaries & Constraints

**Always:**
- Hver ingredienslinje og hvert steg er en `<label>` som omslutter en ekte `<input type="checkbox">` og teksten (FR-17, UX-DR6, UX-DR16). Trykk hvor som helst på raden veksler avkrysningen; mellomromstasten gjør det samme når boksen har fokus. Boksens tilgjengelige navn er radens tekst («400 g mel», «Finhakk løken»).
- Alle ingrediensrader kan krysses av, også utolkbare linjer («salt og pepper»). Utolkbare linjer forblir kursive, dempede og uskalerte.
- Avkrysset rad: fylt boks i aksentfarge med hake i `--color-on-accent`, gjennomstreking og tekst i `--color-ink-secondary` (DESIGN.md «Avkrysset linje»). Tilstanden vises ikke med farge alene: boksen er fylt og teksten gjennomstreket.
- Boksen står til venstre for mengde og navn (mockup `key-screens.html` skjerm 1), 24 px (`--checkbox-size`), hjørner fra tokens, kant `--color-border-strong` når den er tom. Hele raden er minst `--tap-target-min` (44 px) høy. Synlig fokusring på boksen (`:focus-visible`, `--focus-ring-width`).
- Ingen hardkodede farger, størrelser eller vekter; nye verdier som tokens i `src/styles/tokens.css`. Lys og mørk palett.
- Avkryssede ingredienser holdes i ett `Set<number>` av linje-id i `IngredientList`, avkryssede steg i ett `Set<number>` av steg-id i en ny klientkomponent `StepList`. De to settene er uavhengige, så lik id på en linje og et steg aldri kolliderer (AD-10).
- Avkrysning overlever endret antall personer, «Tilbakestill» og ugyldig inntasting; mengdene oppdateres som vanlig.
- Avkrysningene nullstilles når oppskriftssiden skjules av Activity og når komponenten avmonteres. En felles hook (`useCheckedSet`) gjør dette med en `useLayoutEffect`-opprydding (se `node_modules/next/dist/docs/01-app/02-guides/preserving-ui-state.md`). Å åpne «Rediger» og gå tilbake gir ingen avkrysning.
- `RecipeView` forblir en serverkomponent. Stegene flyttes til `StepList` (klient) med samme overskrift («Slik gjør du»), nummerering og sortering på `position`; ingredienser og steg beholder rekkefølge og oppsett fra 1.5.
- Porsjonsvelgerens −/+ bruker `aria-disabled="true"` i stedet for `disabled` ved 1 og 50, så tastaturfokus ikke forsvinner. Klikk ved grensen gjør ingenting. Utseendet er det samme som for deaktivert i dag.
- README oppdateres: status, hva Epic 1 inneholder (Story 1.1–1.6 og 3.5), hvordan avkrysning og porsjonsvelger brukes, hvordan testene kjøres og hva de dekker.

**Never:**
- Ingen lagring av avkrysning (ikke i database, `localStorage`, URL eller cookie) og ingen serverkall.
- Ingen knapp for «fjern alle avkrysninger», ingen fremdriftsteller og ingen sortering av avkryssede rader nedover.
- Ingen endring i domenets tolke-, skalerings- eller formateringsregler, og ingen endring i det som sendes fra serveren.
- Ingen nye pakker; `package-lock.json` skal være uendret.

## I/O & Edge-Case Matrix

| Scenario | State / handling | Forventet | Feil |
|----------|------------------|-----------|------|
| Åpne | Oppskrift for 4 med «400 g mel», «1 egg», «salt og pepper» og to steg | Alle bokser tomme; ingen gjennomstreking | N/A |
| Trykk på tekst | Trykk på «mel» i «400 g mel» | Boksen er avkrysset; raden er gjennomstreket og dempet | N/A |
| Trykk igjen | Trykk på samme rad | Avkrysningen er fjernet; vanlig stil | N/A |
| Utolkbar linje | Trykk på «salt og pepper» | Avkrysset; fortsatt kursiv og uendret ved alle antall | N/A |
| Tastatur | Tab til en boks, trykk mellomrom | Veksler; synlig fokusring; fokus blir stående | N/A |
| Steg | Trykk på «Finhakk løken» | Steget er avkrysset som en ingrediens; nummeret står igjen | N/A |
| Skalering | «400 g mel» avkrysset, antall 4 → 8 | Fortsatt avkrysset; «800 g mel» | N/A |
| Tilbakestill | Avkrysset linje, antall endret, «Tilbakestill til 4» | Avkrysningen beholdes | N/A |
| Lik id | Ingrediens og steg har id 1 | Å krysse av den ene påvirker ikke den andre | N/A |
| Seksjoner | Linjer i «Saus» og uten seksjon | Avkrysning per linje, uavhengig av seksjon | N/A |
| Lukke og åpne | Siden skjules av Activity og vises igjen | Ingen rader er avkrysset | N/A |
| Avmontere | Komponenten avmonteres og monteres på nytt | Ingen rader er avkrysset | N/A |
| Skjermleser | Fokus på en boks | Navnet er radens tekst; avkrysset/ikke avkrysset annonseres av boksen | N/A |
| Grense | Antall 1, fokus på −, trykk Enter/mellomrom | Fokus blir på −; antallet er uendret; `aria-disabled="true"` | N/A |
| Ingen porsjoner | `originalServings = null` | Avkrysning virker som ellers; ingen porsjonsvelger | N/A |

</frozen-after-approval>

## Code Map

- `src/components/use-checked-set.ts` (ny, + `.test.tsx`) -- hook `useCheckedSet()` som returnerer `{ isChecked(id), toggle(id) }` over et `Set<number>` i `useState`, og tømmer det i en `useLayoutEffect`-opprydding.
- `src/components/CheckRow.tsx` (ny, + `.module.css`, `.test.tsx`) -- felles rad: `<label>` med `<input type="checkbox">` og innhold som barn; eier utseendet til boks, hake, fokus og avkrysset tekst.
- `src/components/IngredientList.tsx` (+ CSS, test) -- bruk `useCheckedSet` og `CheckRow` i `Line`; behold kolonnene for mengde og navn og utseendet for utolkbare linjer.
- `src/components/StepList.tsx` (ny, + CSS, test) -- klientkomponent for «Slik gjør du» med avkrysning; flyttet fra `RecipeView`.
- `src/components/RecipeView.tsx` (+ CSS, test) -- bruk `StepList`; ellers uendret.
- `src/components/ServingStepper.tsx` (+ CSS, test) -- `aria-disabled` i stedet for `disabled` på −/+.
- `src/styles/tokens.css` (+ `tokens.test.ts`) -- `--checkbox-size`, og eventuelt tokens for hake og avkrysset tekst.
- `README.md` -- status, Epic 1-oversikt, bruk, testing.
- `_bmad-output/planning-artifacts/ux-designs/ux-RecipeMate-2026-11-04/DESIGN.md` -- nytt fargetoken `control-border` (se Review Triage Log, funn 11). Mockupen `key-screens.html` er ikke endret; spine-dokumentene gjelder ved konflikt.

## Tasks & Acceptance

**Execution:**
- [x] `src/components/use-checked-set.ts` -- hook med nullstilling ved skjuling og avmontering; test med `<Activity mode="hidden">` og med avmontering.
- [x] `src/components/CheckRow.tsx` -- delt rad med boks, hake, fokus og avkrysset stil; tester for etikett, tastatur og at klikk hvor som helst veksler.
- [x] `src/components/IngredientList.tsx` -- avkrysning på alle rader (også utolkbare); tester per matriserad, inkludert skalering og «Tilbakestill».
- [x] `src/components/StepList.tsx` + `RecipeView.tsx` -- steg som avkrysningsrader; tester for nummerering, sortering og uavhengige sett.
- [x] `src/components/ServingStepper.tsx` -- `aria-disabled` på −/+; oppdater testene som sjekker `disabled`, og legg til test av at fokus beholdes og at klikk ved grensen er uten virkning.
- [x] `src/styles/tokens.css` -- nye tokens; oppdater `tokens.test.ts` hvis den teller eller lister tokens.
- [x] `README.md` -- se «Always».

**Acceptance Criteria:**
- Given oppskriftssiden, when jeg trykker hvor som helst på en ingredienslinje eller et steg, then krysses den av med fylt boks, gjennomstreking og dempet tekst, og et nytt trykk fjerner avkrysningen; boksen er en ekte avkrysningsboks med etikett som kan brukes med tastatur.
- Given avkryssede linjer, when jeg endrer antall personer, then beholdes avkrysningene og mengdene oppdateres som vanlig.
- Given avkryssede linjer, when jeg lukker og åpner oppskriften igjen, then er ingen linjer krysset av.
- Given README, when sensor leser den, then står det hva Epic 1 inneholder og hvordan testene kjøres.

## Implementation Notes

Implementert av underagent, deretter rettet etter tre gjennomganger (se Review Triage Log).

- **useCheckedSet** (`src/components/use-checked-set.ts`): `Set<number>` i `useState`, returnerer `{ isChecked(id), toggle(id) }`. En `useLayoutEffect`-opprydding tømmer settet når Activity skjuler komponenten og når den avmonteres. Oppryddingen setter ikke en ny `Set` hvis settet allerede er tomt, så Strict Mode sin ekstra kjøring av effekten ved første montering ikke gir en ekstra rendring eller endret oppførsel.
- **CheckRow** (`CheckRow.tsx`, `.module.css`): `<li>` med `<label>` som omslutter `<input type="checkbox">` og innholdet. Boksen er selve input-elementet med `appearance: none` (24 px fra `--checkbox-size`, hjørner, kant og hakestrek fra nye tokens), og haken er en rotert kant på `::before`, ikke et bilde. Avkrysset: fylt `--color-accent`, hake i `--color-on-accent`, innholdet i `--color-ink-secondary` med gjennomstreking (sibling-selektor). Fokusring via `:focus-visible` og `--focus-ring-width`. Raden er minst `--tap-target-min` høy; padding og boksens topp-marg beregnes av tokens slik at boksen står på første tekstlinje også for lange steg. `@media (forced-colors: active)` bruker systemfargene `ButtonText`, `Highlight` og `HighlightText` så boksen og haken synes når bakgrunner overstyres. Komponenten har ingen tilstand.
- **IngredientList:** `Line` bruker `CheckRow`; avkrysningen er nøklet på `line.id` og alle rader kan krysses av, også utolkbare. Skillelinjen ligger nå på `<li>` (`.row`), og kolonnene for mengde og navn (`grid-template-columns: minmax(5.5em, auto) 1fr`) ligger uendret i `.line` inne i raden. Utolkbare linjer er fortsatt en kursiv, dempet blokk (`.unparsed`).
- **StepList** (`StepList.tsx`, `.module.css`): klientkomponent med samme overskrift («Slik gjør du»), `<ol>` og sortering på `position` som før; nummeret er et eget element inni labelen (`CheckRow`s `marker`, `aria-hidden`), ikke `::marker`, og blir stående (endret etter manuell test, issue 007). `<ol role="list">` med `list-style: none`. Returnerer `null` uten steg. Kortet og `.steps` er flyttet fra `RecipeView.module.css`. Eget sett av steg-id.
- **RecipeView:** forblir serverkomponent og bruker `StepList`. `key` er `ingredienser-{id}-{updatedAt}` og `steg-{id}-{updatedAt}`. Prefikset trengs fordi `IngredientList` og `StepList` er søsken og ikke kan dele nøkkel; `updatedAt` gjør at valgt antall og avkrysning nullstilles når oppskriften er redigert og lagret på nytt (rettet etter gjennomgang, funn 1).
- **ServingStepper:** −/+ har `aria-disabled="true"` ved 1 og 50 i stedet for `disabled`; klikkbehandlerne gjør ingenting ved grensen (de kaller heller ikke `change`, så en feilmelding eller kladd røres ikke). CSS-regelen for «deaktivert» gjelder nå `[aria-disabled="true"]` og ser lik ut.
- **Tokens:** `--checkbox-size: 24px`, `--checkbox-radius: 6px` (som i mockupen), `--checkbox-border-width: 2px`, `--checkbox-check-stroke: 3px`. Én ny farge etter gjennomgang: `--color-control-border` (se issue 006). `tokens.test.ts` har to nye tester (tokens finnes; `CheckRow.module.css` har ingen hex-farger eller px-verdier og inneholder `:focus-visible` og `forced-colors`).
- **README:** status (Epic 1 ferdig, Story 1.1–1.6 og 3.5), ny seksjon «Hva Epic 1 inneholder», «Kryss av under matlaging» og «Hva testene dekker» med antall filer og tester.
- **Tester:** nye `use-checked-set.test.tsx`, `CheckRow.test.tsx` og `StepList.test.tsx`; `IngredientList.test.tsx` har en gruppe «avkrysning» med én test per matriserad (åpne, trykk på tekst, trykk igjen, utolkbar linje, tastatur, skalering, «Tilbakestill», ugyldig inntasting, seksjoner, Activity, avmontering, ingen porsjoner, skjermleser, ingen `fetch`); `RecipeView.test.tsx` tester lik id på ingrediens og steg, Activity og bytte av oppskrift; `ServingStepper.test.tsx` er oppdatert fra `disabled` til `aria-disabled` med tester for fokus og klikk ved 1 og 50. Activity-testene feiler når oppryddingen i hooken fjernes (kontrollert).

**Verifisering:** se Verification-kommandoene; `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test` (35 filer, 583 tester) og `npm run build` er grønne, og `package-lock.json` er byte-identisk med baseline. Ingen nye pakker.

**Ikke gjort:** skjermbilder og manuell sjekk i ekte nettleser (360 og 1280 px, lys og mørk, 200 % tekststørrelse, høykontrast) må tas på Macen. Mockupen `key-screens.html` er ikke endret: skjerm 1 viser allerede avkrysset linje, men med 22 px boks; spesifikasjonen (24 px) gjelder; DESIGN.md oppgir ingen størrelse. Stegavstanden i `StepList.module.css` er `--space-1` med radens egen padding i stedet for `--space-3` mellom elementene; den samlede avstanden bør sjekkes i nettleseren.

**Verdt å vite:** alt som gjelder utseende er bare testet i jsdom, som ikke bruker CSS. Spesielt bør det sjekkes manuelt at (1) stegnummeret står på linje med første tekstlinje (kontrollert i Chrome etter issue 007), (2) haken ligger midt i boksen, og (3) høykontrastmodus viser fylt boks. `Set` byttes ut ved hvert trykk (nytt objekt), som er greit for få titalls rader.

### Rettelser etter gjennomgang

Rettet i samme arbeidsøkt før commit: `key` med `updatedAt` på `IngredientList` og `StepList` (valgt antall og avkrysning nullstilles etter redigering); nytt token `control-border` (issue 006) på avkrysningsboks, tallfelt og skjemafelt; «ca.» dempes i avkrysset rad; kommentar om hakens forholdstall; mer presis tittel på en StepList-test; én ny test for `updatedAt`; DESIGN.md oppdatert. Etter retting: 35 filer, 581 tester, lint, typecheck og format grønne; bygg og `package-lock.json` sjekket til slutt.

### Rettelse etter manuell test (issue 007)

Ved manuell test havnet stegnumrene oppå boksene etter at jeg hadde åpnet «Rediger» og gått tilbake (ikke ved fanebytte). Feilen lot seg ikke gjenskape i headless Chrome på Linux (Avbryt, Lagre endringer og tilbakeknapp), så årsaken er trolig nettleserspesifikk. I stedet for å jakte på den fjernet jeg konstruksjonen den bygger på: nummeret er nå et vanlig element (`marker` i `CheckRow`) inni labelen i stedet for en listemarkør (`::marker`). Det gjør også at trykk på nummeret veksler steget, og `role="list"` på stegene og ingredienslistene beholder listesemantikken. Tester: nummer og rekkefølge, nummer som del av trykkflaten og skjult for skjermlesere. 583 tester grønne.

## Spec Change Log

Ingen endringer i den frosne delen.

## Review Triage Log

Gjennomgang 1 (2026-11-09): Edge Case Hunter (E), Spec og arkitektur (S), UI, tilgjengelighet og tester (U). Funn som gjentok hverandre er slått sammen.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|---|---|---|---|
| 1 | `IngredientList` og avkrysning følger ikke nye props etter redigering; avkryssede id-er filtreres ikke mot gjeldende rader (E2, E3) | medium | Activity kan gjenbruke instansen; viste seg som feil `selected` og «oppr.» i jsdom | patch: `key` med `updatedAt` |
| 2 | Kanten på tom boks og tallfelt har 1,8:1, under 3:1 (U1) | medium | Spesifikasjons- og designfeil (issue 006), ikke implementasjonsfeil | patch: token `control-border` |
| 3 | «ca.» beholder aksentfarge i avkrysset rad (S6, U5) | low | Spesifikasjonen sier dempet tekst; én regel i CSS | patch |
| 4 | Forholdstallene i hakegeometrien er uforklarte (S9, U6) | low | Enhetsløse, men bør forklares | patch: kommentar |
| 5 | Notatene: «DESIGN.md (24 px)» og forklaringen av `key` er unøyaktige; Code Map lister mockupen som endret (S1, S2, S4) | low | Dokumentasjon må stemme med det som er gjort | patch |
| 6 | Notatene nevner ikke at stegavstanden er endret (S3) | low | Dokumentert i notatene; verifiseres visuelt | patch (notat) |
| 7 | README-overskriften «Hva Epic 1 inneholder» omfatter også Story 3.5 (S5) | low | Kan forvirre sensor | patch |
| 8 | Tittel på steg-test lover mer enn testen sjekker (U3) | low | Nummereringen kan ikke testes i jsdom | patch: tittel |
| 9 | Klikk på − ved 1 etter ugyldig kladd: blur-commit gjør at klikket gir 4 (E1) | low | Resultatet er et gyldig tall og følger det brukeren skrev; ekstrem sekvens | defer |
| 10 | Stegnummeret (`::marker`) ligger utenfor `<label>`, så trykk på nummeret veksler ikke (S7) | low | Tekst og boks er trykkflate; nummeret er markør, ikke innhold | defer → rettet etter manuell test (issue 007) |
| 11 | `list-style: none` kan fjerne listesemantikk i Safari/VoiceOver (U, spekulasjon) | low | Eldre kode fra 1.5; ikke bekreftet | defer → rettet etter manuell test (`role="list"`, issue 007) |
| 12 | `useLayoutEffect` kan byttes med `useEffect` uten at en test feiler (E4) | low | Ingen funksjonell forskjell, bare mulig blink | reject |
| 13 | Ingen test for gjennomstreking og 44 px (U2) | low | CSS kan ikke testes i jsdom; dekkes av skjermbilder og manuell sjekk | reject |
| 14 | Tester bundet til klassenavn og Tab-antall; overlapp mellom Activity-tester (U3, U4) | low | Gir liten verdi å skrive om nå | reject |
| 15 | `selected` (valgt antall) og kladd beholdes ved Activity-skjuling (E) | low | Spesifikasjonen krever bare nullstilling av avkrysning; antall lagres i Story 3.2 | reject |
| 16 | `::marker` mot flex-label, hakens plassering og gjennomstreking over barn (S8, S9, S10) | false | Kontrollert i Chrome av gjennomgang 3: nummer på linje med første tekstlinje, hake midt i boksen, gjennomstreking går over alle barn | reject |

## Verification

**Commands:**
- `npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test`, `npm run build` -- expected: alle grønne
- `diff` mot `package-lock.json` fra baseline -- expected: ingen endring

**Manual checks:**
- `npm run build && npm start` (eller `npm run dev`): kryss av ingredienser og steg med mus og tastatur, endre antall, åpne «Rediger» og gå tilbake (ingenting avkrysset). Skjermbilder på 360 og 1280 px, lys og mørk, tas på Macen.
