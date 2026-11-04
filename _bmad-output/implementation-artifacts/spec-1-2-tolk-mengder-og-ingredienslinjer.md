---
title: 'Story 1.2: Tolk mengder og ingredienslinjer'
type: 'feature'
created: '2026-11-04'
status: 'done'
baseline_commit: '493673341cf09486fb0ffaf18cc7cc262d843ac2'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Skalering (Story 1.3), manuell innlegging (1.4) og import (Epic 2) trenger å forstå ingredienslinjer som «1 ½ dl fløte» og «750g potet». Uten en felles tolker vil hver del tolke tekst på sin egen måte.

**Approach:** En ren domenemodul i `src/domain/` som gjør én ingredienslinje om til mengde, enhet og navn, med originalteksten bevart. Linjer uten mengde markeres som ikke tolkbare.

## Boundaries & Constraints

**Always:**
- Ren TypeScript i `src/domain/`: ingen import fra `next`, `react`, `src/server`, `src/app` eller pakker med I/O (AD-1).
- `parseLine` kaster aldri; den returnerer alltid et resultat med `original` lik input (uendret).
- Mengde er `Quantity = { min: number; max?: number }`; `max` bare for områder (konvensjon i spine).
- Enheter normaliseres via én tabell (`units.ts`) til faste nøkler; gjenkjenning uavhengig av store/små bokstaver og av punktum etter forkortelse («ss.», «stk.»).

**Never:**
- Ingen skalering, formatering eller avrunding (Story 1.3).
- Ingen avgjørelse om udelelige ingredienser (Story 1.3 bruker enhet og navn til det).
- Ingen konvertering mellom enheter.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet (quantity / unit / name / parseable) | Feil |
|----------|-------|-----------------------------------------------|------|
| Heltall + enhet | `400 g mel` | {min:400} / g / mel / true | N/A |
| Desimal komma | `0,5 dl olje` | {min:0.5} / dl / olje / true | N/A |
| Desimal punktum | `0.5 tsp salt` | {min:0.5} / tsp / salt / true | N/A |
| Brøk | `1/2 ts salt` | {min:0.5} / ts / salt / true | N/A |
| Brøktegn | `½ ts salt` | {min:0.5} / ts / salt / true | N/A |
| Blandet tall | `1 ½ dl fløte`, `1 1/2 dl fløte`, `1½ dl fløte` | {min:1.5} / dl / fløte / true | N/A |
| Område | `2–3 ss sukker`, `2-3 ss sukker`, `2 til 3 ss sukker` | {min:2,max:3} / ss / sukker / true | N/A |
| Enhet uten mellomrom | `750g potet`, `2dl melk` | {min:750} / g / potet; {min:2} / dl / melk | N/A |
| Uten enhet | `2 egg` | {min:2} / null / egg / true | N/A |
| Mengde uten navn | `2 ss` | {min:2} / ss / "" / true | N/A |
| Uten mengde | `nutmeg`, `salt og pepper`, `en klype salt` | null / null / original / false | N/A |
| «ca.» foran | `ca. 400 g kjøttdeig` | {min:400} / g / kjøttdeig / true | N/A |
| Store bokstaver, punktum | `2 SS. sukker`, `3 stk. egg` | ss / sukker; stk / egg | N/A |
| Engelske enheter | `1 tbsp`, `2 cups`, `8 oz`, `1 lb` + navn | tbsp / cup / oz / lb | N/A |
| Ukjent ord etter tall | `1 dash smør` | {min:1} / null / dash smør / true | N/A |
| Tomt eller bare mellomrom | `""`, `"   "` | null / null / "" / false | kaster ikke |

</frozen-after-approval>

## Code Map

- `src/domain/.gitkeep` -- tom mappe fra Story 1.1; fjern når første modul legges inn.
- `src/lib/result.ts` -- finnes; brukes ikke her (tolkingen feiler aldri, den markerer bare `parseable: false`).
- `vitest.config.mts` -- inkluderer `src/**/*.test.{ts,tsx}`; testene plasseres ved siden av koden.
- Ingen eksisterende domenekode.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/types.ts` -- `Quantity`, `UnitKey`, `ParsedLine { original, quantity, unit, name, parseable }` -- felles typer for 1.3, 1.4 og Epic 2.
- [x] `src/domain/units.ts` -- enhetstabell: norske g, kg, ml, dl, l, ss, ts, krm, stk, fedd, pk, boks, never og engelske g, kg, ml, l, tbsp, tsp, cup, oz, lb, med vanlige varianter (flertall, punktum, «pakke», «tablespoon(s)», «teaspoon(s)», «cups»); funksjon `normalizeUnit(word): UnitKey | null` -- én kilde for enheter.
- [x] `src/domain/parse-quantity.ts` -- tolker tallet i starten av en tekst (heltall, desimal med komma/punktum, brøk, brøktegn ½ ¼ ¾ ⅓ ⅔ ⅛, blandet tall, område med – - eller «til»); returnerer mengde og resten av teksten.
- [x] `src/domain/parse-line.ts` -- `parseLine(text): ParsedLine`: fjerner «ca.» foran, bruker `parse-quantity` og `normalizeUnit`, trimmer navn.
- [x] `src/domain/index.ts` -- eksporterer det offentlige grensesnittet.
- [x] Tester `parse-quantity.test.ts`, `parse-line.test.ts`, `units.test.ts` -- én test per rad i matrisen, pluss at domenet ikke importerer fra forbudte moduler (les filene som tekst).

**Acceptance Criteria:**
- Given alle rader i matrisen, when testene kjøres, then gir hver input nøyaktig forventet resultat.
- Given filene i `src/domain/`, when importene sjekkes, then importerer ingen av dem fra `next`, `react`, `@/server`, `@/app` eller `node:`-moduler.

## Implementation Notes

Implementert i commit `57b8ace` (arbeidskopi, ikke pushet).

- **Filer:** `src/domain/types.ts`, `units.ts`, `parse-quantity.ts`, `parse-line.ts`, `index.ts`; tester `units.test.ts`, `parse-quantity.test.ts`, `parse-line.test.ts` og `domain-purity.test.ts`. `src/domain/.gitkeep` er fjernet.
- **Enhetsnøkler:** `UnitKey` er `g, kg, ml, dl, l, ss, ts, krm, stk, fedd, pk, boks, neve, tbsp, tsp, cup, oz, lb`. «never» normaliseres til nøkkelen `neve` (entall), slik som de andre nøklene. Tabellen `UNIT_VARIANTS` tar også med noen vanlige utskrevne former (gram, liter, spiseskje, teskje, stykk, pakke, bokser, ounce, pound, lbs); «klype» er bevisst ikke en enhet, så «en klype salt» forblir utolkbar.
- **Tall:** ett regulært uttrykk med alternativene blandet tall med brøktegn (`1½`, `1 ½`), blandet tall med brøk (`1 1/2`), brøk, brøktegn og heltall/desimal, i den rekkefølgen. Brøk med nevner 0 gjenkjennes ikke som brøk (bare heltallet før skråstreken tas), så det blir aldri `Infinity`. Område: `–`, `-`, `—` eller « til » mellom to tall; «2 til steking» er ikke et område.
- **Enhet:** første ord etter tallet (også rett etter, «750g»), med valgfritt punktum, og bare når ordet slutter der (ikke etterfulgt av bokstav/tall). Dermed blir «2 gulrøtter» ikke tolket som `g`, mens «400 g, finhakket» gir `g`. Er ordet ikke en kjent enhet, blir det del av navnet («1 dash smør» → navn «dash smør»).
- **«ca.»:** fjernes bare når en mengde følger (`ca.`, `ca`, store/små bokstaver), så «cayennepepper» berøres ikke.
- **Navn ved utolkbare linjer:** matrisen sier navn = original. Implementasjonen bruker originalen trimmet, slik at tom/bare mellomrom gir `""` (som matrisen krever) og `original` likevel alltid er input uendret.
- **Renhetstest:** ligger i egen fil `domain-purity.test.ts` (ikke i en av de tre navngitte testfilene) fordi den selv må bruke `node:fs`. Den sjekker alle ikke-testfiler i `src/domain/` for import fra `next`, `react`, `node:`, `@/server`, `@/app`, relative stier til server/app og I/O-pakker, og at domenefilene bare importerer fra hverandre. Testfilene er unntatt. Kontrollert ved å legge inn en forbudt import midlertidig: testen feilet som forventet.
- **Verifisering:** `npm test` 137 tester grønne (90 nye), `npm run lint`, `npm run typecheck` og `npm run format:check` uten feil.

**Rettelser etter kodegjennomgang (commit `4b0dc06`):**
- Ledende `,` `;` `:` `.` og mellomrom fjernes fra navnet («400 g, finhakket løk» → «finhakket løk», «2 stk.egg» → «egg»).
- «1-1/2» (heltall, strek, ren brøk under 1) tolkes som blandet tall 1,5. Et «område» der øvre ikke er større enn nedre («3–2», «2-2») gir bare nedre verdi. Hele uttrykket regnes likevel som mengde, så «3–2 ss» gir navn «». Regelen for blandet tall gjelder bare strekformene, ikke «til».
- Nye brøktegn ⅕ ⅖ ⅗ ⅘ ⅙ ⅚ ⅜ ⅝ ⅞, brøkstrek U+2044, minustegn U+2212 som områdeskille og desimal uten null foran (.5 og ,5). `FRACTION_CHARS` og `FRACTION_CLASS` eksporteres fra `parse-quantity.ts`, og «ca.»-prefikset bygges av dem.
- Nye enhetsnøkler: `klype`, `kopp`, `pose`, `bunt`, `skive`, `glass`, `beger`, `pinch`, `can`. «en klype salt» kan fortsatt ikke tolkes, fordi «en» ikke er et tall.
- `parseLine` og `normalizeUnit` normaliserer til NFC før tolking; `original` er uendret.
- Renhetstesten leser `src/domain/` rekursivt og finner mappen via `import.meta.url`. Relative importer godtas når de peker inn i `src/domain/` (også fra undermapper).
- Dagens atferd for linjer med flere tall er låst med en test: «1 boks (400 g) tomater» → 1 / boks / «(400 g) tomater».

## Spec Change Log

## Review Triage Log

Gjennomgang 1 (2026-11-04): Blind Hunter (B), Edge Case Hunter (E), Verification Gap (V). Funn med samme rotårsak er gruppert.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|---|---|---|---|
| 1 | Navnet kan starte med skilletegn: «400 g, finhakket løk» → «, finhakket løk»; «2 stk.egg» → «.egg» (B1, E9, V) | medium | Bekreftet ved kjøring; navnet vises i oppskriften (Story 1.5) | patch |
| 2 | Amerikansk blandet tall «1-1/2 cups» tolkes som område {1, 0,5}; omvendt område «3–2» godtas (B4, E1) | medium | Vanlig på engelske oppskriftssider; gir feil mengde ved skalering | patch |
| 3 | Brøktegn ⅕ ⅖ ⅗ ⅘ ⅙ ⅚ ⅜ ⅝ ⅞, brøkstrek U+2044, minustegn U+2212 og «.5» støttes ikke (B6, E3, E4, E5) | medium | Kopierte oppskrifter bruker slike tegn; «1⅝ dl» gir feil mengde | patch |
| 4 | Brøktegnlisten i `APPROX_PREFIX` er en kopi av `FRACTION_CHARS` (B5, E8) | low | Nye brøktegn ville ikke virket etter «ca.»; direkte rettelse | patch |
| 5 | Lange enhetsvarianter (gram, liter, spiseskje, kryddermål, pound …) er ikke testet (V1, B8) | medium | Verifisert av V: kan fjernes fra tabellen uten at noen test feiler | patch |
| 6 | Vanlige enheter mangler: klype, kopp, pose, bunt, skive, glass, beger, pinch, can (B7) | low | FR-9 sier «minst»; tabelltillegg er direkte og hjelper Story 1.3 å skille udelelige enheter | patch |
| 7 | Tekst i NFD-form (macOS-innliming) gjenkjennes ikke, f.eks. «kryddermål» (B11, E10) | medium | Reelt for innlimt tekst; rettelse er `normalize("NFC")` | patch |
| 8 | Renhetstesten leser bare øverste nivå i `src/domain` og avhenger av `process.cwd()` (B9, E13, E14, V) | low | Undermapper ville sluppet unna AD-1; direkte rettelse | patch |
| 9 | Linjer med flere tall («1 boks (400 g) tomater») er ikke dokumentert i test (B10) | low | Atferden er akseptabel; en test låser den | patch |
| 10 | «1/0 ts» gir mengde 1 og navn «/0 ts» (B2, E2) | low | Svært usannsynlig input; rettelse krever egen vakt | reject |
| 11 | «2-pakning tomater», «2x400 g» tolkes med mengde 2 (B3, E12) | low | «2x400 g» skaleres faktisk riktig (antall pakker); «2-pakning» er sjeldent | reject |
| 12 | Tusenskilletegn «1.000 g» blir 1 g (E6) | low | Oppskrifter skriver «1 kg»; rettelse gir tvetydighet mot desimal | reject |
| 13 | Mengde 0 eller svært lange tall (E7) | low | Usannsynlig i oppskrifter | reject |
| 14 | Tallord «en/ett/et halvt» støttes ikke (B6) | false | Matrisen krever at «en klype salt» ikke er tolkbar; utenfor spesifikasjonen | reject |
| 15 | `UNIT_VARIANTS` er ikke fryst (B12) | low | Ingen kode endrer den; usannsynlig | reject |
| 16 | `parseLine` med ikke-streng input kaster (E11) | false | API-et er typet `string`; alle kallere er TypeScript | reject |
| 17 | Testfiler i `src/domain` bruker `node:` (E15) | false | Testfiler er bevisst unntatt; produksjonsfilene sjekkes | reject |

## Verification

**Commands:**
- `npm run lint` -- expected: 0 feil
- `npm run typecheck` -- expected: ingen feil
- `npm test` -- expected: alle tester grønne
- `npm run format:check` -- expected: ingen avvik
