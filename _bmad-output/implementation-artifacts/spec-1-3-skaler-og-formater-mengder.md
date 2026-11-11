---
title: 'Story 1.3: Skaler og formater mengder'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '1aaf25a2aca300f3f0e1d80715c21dba79312b9c'
route: 'dispatch'
review_loop_iteration: 1
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Brukeren skal kunne lage en oppskrift for et annet antall porsjoner uten å regne selv. Skaleringsreglene i PRD FR-8 er appens viktigste regel og må gi nøyaktig samme resultat hver gang, med fasit i 10 eksempler.

**Approach:** Rene domenefunksjoner som tar en tolket ingredienslinje (`ParsedLine` fra Story 1.2) og en faktor, regner om mengden fra originalen og formaterer den for visning etter FR-8, med avgjørelsen fra 2026-11-04: g og ml under 100 avrundes til hele tall.

## Boundaries & Constraints

**Always:**
- Ren TypeScript i `src/domain/` (AD-1); renhetstesten fra 1.2 skal fortsatt være grønn.
- Skalering bruker alltid originalmengden i `ParsedLine` og aldri en tidligere skalert verdi (AD-2).
- Faktor 1 (valgt = opprinnelig) gir linjen uendret: ingen avrunding, ingen «ca.».
- Funksjonene kaster aldri; ugyldig faktor (ikke endelig tall eller ≤ 0) gir linjen uendret.
- Desimaltegn i visning er komma; område vises med tankestrek uten mellomrom («4–6»).

**Never:**
- Ingen konvertering mellom enheter.
- Ingen endring av `parseLine` eller enhetstabellen (bortsett fra å eksportere nye funksjoner fra `index.ts`).
- Ingen UI, database eller porsjonsvelger (Story 1.4–1.5).

## I/O & Edge-Case Matrix

Opprinnelig 4 porsjoner der ikke annet står. «Visning» er `formatLine(scaleLine(parseLine(input), valgt/4))`.

| Scenario | Input → valgt | Visning | Feil |
|----------|--------------|---------|------|
| FR-8 #1 | `400 g mel` → 6 | `600 g mel` | N/A |
| FR-8 #2 | `½ ts salt` → 6 | `¾ ts salt` | N/A |
| FR-8 #3 | `1 ½ dl fløte` → 2 | `¾ dl fløte` | N/A |
| FR-8 #4 | `0,5 dl olje` → 8 | `1 dl olje` | N/A |
| FR-8 #5 | `1 egg` → 3 | `1 egg (ca.)` | N/A |
| FR-8 #6 | `2 egg` → 3 | `2 egg (ca.)` | N/A |
| FR-8 #7 | `2–3 ss sukker` → 8 | `4–6 ss sukker` | N/A |
| FR-8 #8 | `en klype salt` → 8 | `en klype salt` | N/A |
| FR-8 #9 | `1 fedd hvitløk` → 2 | `1 fedd hvitløk (ca.)` | N/A |
| FR-8 #10 | `750 g potet` → 3 | `560 g potet` | N/A |
| g under 100 | `50 g smør` → 3 | `38 g smør` | N/A |
| Faktor 1 | `½ sitron` → 4 | `½ sitron` | N/A |
| Udelelig uten endring | `2 løk` → 8 | `4 løk` (ikke «ca.») | N/A |
| Desimal når ingen brøk passer | `0,9 dl melk` → 5 | `1,1 dl melk` | N/A |
| Blandet tall i visning | `1 ss olje` → 5 | `1 ¼ ss olje` | N/A |
| Ugyldig faktor | `400 g mel`, faktor 0 / NaN | `400 g mel` (uendret) | kaster ikke |

**Beslutning 2026-11-09 (Maja, etter gjennomgang):** 5 %-grensen for brøkvisning måles mot selve brøkdelen, ikke mot hele tallet. Brøk brukes når |brøkdel − brøk| ≤ 5 % av brøken; ellers én desimal med komma. Eksempler: 5,4 dl → «5,4 dl», 3,1 dl → «3,1 dl», 1,24 → «1 ¼», 0,75 → «¾», 0,65 → «⅔».

</frozen-after-approval>

## Code Map

- `src/domain/types.ts` -- `Quantity`, `UnitKey`, `ParsedLine` fra 1.2; legg til `ScaledLine` her.
- `src/domain/parse-line.ts` -- `parseLine`; brukes i testene, endres ikke.
- `src/domain/parse-quantity.ts` -- eksporterer `FRACTION_CHARS`; gjenbruk tegnene ½ ¼ ¾ ⅓ ⅔ til visning i stedet for å skrive dem på nytt.
- `src/domain/index.ts` -- offentlig grensesnitt; eksporter de nye funksjonene.
- `src/domain/domain-purity.test.ts` -- sjekker AD-1 rekursivt; nye filer dekkes automatisk.

## Tasks & Acceptance

**Execution:**
- [x] `src/domain/types.ts` -- `ScaledLine = ParsedLine & { approximate: boolean }` (mengden er skalert) -- felles type for visning i 1.5.
- [x] `src/domain/scale-line.ts` -- `scaleLine(line, factor): ScaledLine` med reglene: (a) ikke tolkbar eller ugyldig faktor eller faktor 1 → uendret, `approximate: false`; (b) udelelig (enhet `null`, `stk`, `fedd`, `boks`, `pk`, `pose`, `bunt`, `skive`, `glass`, `beger`, `can`) → nærmeste hele tall, halvdeler rundes opp, minst 1, `approximate` når avrundingen endret verdien; (c) `g`/`ml` → over 100 to gjeldende sifre, ellers hele tall (minst 1); (d) andre enheter → eksakt verdi (formateres i visning); (e) område: hver ende for seg, `max` fjernes hvis den blir lik `min`.
- [x] `src/domain/format-quantity.ts` -- `formatQuantity(q): string`: bruk brøk (¼ ⅓ ½ ⅔ ¾, med heltall foran) når brøkdelen avviker ≤ 5 % av selve brøken (se beslutningen over); ellers én desimal med komma, ellers én desimal med komma (uten «,0»); område som `a–b`. `formatLine(line: ScaledLine): string` = mengde, enhet og navn med ett mellomrom, pluss « (ca.)» når `approximate`; ikke tolkbare linjer gir `original`.
- [x] `src/domain/index.ts` -- eksporter `scaleLine`, `formatQuantity`, `formatLine`, `ScaledLine`.
- [x] Tester `scale-line.test.ts`, `format-quantity.test.ts` -- én test per rad i matrisen (de 10 FR-8-eksemplene som egne, navngitte tester), pluss regel (c): `100 g` med faktor 1,25 gir `130 g` (125 → to gjeldende sifre, halvdeler opp), og `0,3 g` med faktor 1 er uendret mens faktor 2 gir `1 g` (minst 1) og AD-2: skalering av samme `ParsedLine` med faktor 0,75 og deretter 1,25 gir samme resultat som fra originalen.

**Acceptance Criteria:**
- Given alle rader i matrisen, when testene kjøres, then gir hver input nøyaktig forventet visning.
- Given en `ParsedLine`, when den skaleres flere ganger med ulike faktorer, then endres ikke originalobjektet og hvert resultat beregnes fra originalmengden.

## Implementation Notes

- Implementert i commit `1dbeea3` (arbeidskopi, ikke pushet): `src/domain/scale-line.ts`, `src/domain/format-quantity.ts`, `ScaledLine` i `types.ts`, eksporter i `index.ts`, og testene `scale-line.test.ts` og `format-quantity.test.ts`.
- Avrunding «halvdeler opp» bruker en liten toleranse (1e-9) mot flyttallsfeil, slik at 37,5 → 38, 562,5 → 560 og 125 → 130 blir stabile.
- g/ml: verdier som rundes til under 100 blir hele tall (minst 1); fra 100 og opp to gjeldende sifre (750 × 1,25 = 937,5 → 940).
- Udelelige: «ca.» settes når avrundingen eller minimumsgrensen 1 endret verdien i minst én ende av et område.
- ~~Brøkkandidat velges etter avvik fra kandidatens hele verdi (heltall + brøk), slik regelen sier. Det betyr at f.eks. 2,8 vises som «2 ¾» (1,8 % avvik), mens 0,9 × 1,25 = 1,125 vises som «1,1».~~ *(Erstattet av rettelsene i `bdf55a5`, se under.)*
- `formatLine` bruker enhetsnøkkelen som visningstekst (`neve`, `tbsp` osv.), så «2 never» skalert til 4 vises som «4 neve». Bøyning av enheter er ikke en del av denne storyen.
- ~~Kjent kanttilfelle: svært små ikke-g/ml-mengder etter skalering (f.eks. 0,1 krm × 0,25 = 0,025) vises som «0», fordi visningen har maks én desimal. Ingen regel i FR-8 dekker dette; kan vurderes i 1.5.~~ *(Erstattet av rettelsene i `bdf55a5`, se under.)*
- Verifisert: `npm test` (251 tester grønne, inkl. renhetstesten), `npm run lint`, `npm run typecheck` og `npm run format:check` uten feil.

**Rettelser etter kodegjennomgang (commit `bdf55a5`):**
- Brøk brukes bare når brøkdelen avviker ≤ 5 % av selve brøken (beslutning 2026-11-09); 5,4 → «5,4», 2,8 → «2,8», 1,24 → «1 ¼».
- Små positive mengder som ville blitt «0» vises med to desimaler (minst «0,01»), f.eks. «¼ ts salt» fra 8 til 1 → «0,03 ts salt».
- Områder der endene formateres likt vises som én verdi.
- `neve`, `klype` og `pinch` er udelelige.
- Nye tester: alle udelelige enheter, områder (øvre ende avrundet, g/ml-område), grensene 100 g og ≥ 1000, kg/l, brøktabellen, og en omskrevet AD-2-test.
- Verifisert: lint, typecheck, format:check, 278/278 tester, bygg.

## Spec Change Log

- **2026-11-09, gjennomgang 1:** Funn B3 (5 %-grensen regnet mot hele verdien gjorde desimalregelen nesten død over 2,5) var et hull i intensjonen. Maja valgte at grensen måles mot brøkdelen; beslutningen er lagt inn i den frosne blokken og i PRD FR-8 regel 2. Oppgaveteksten for `format-quantity.ts` er endret tilsvarende. Siden endringen er avgrenset til én funksjon, rettes den som en målrettet endring av implementasjonen i stedet for full re-implementasjon. KEEP: alt annet i `scale-line.ts` og `format-quantity.ts`, inkludert alle FR-8-testene, som fortsatt skal gi samme resultat.

## Review Triage Log

Gjennomgang 1 (2026-11-09): Blind Hunter (B), Edge Case Hunter (E), Verification Gap (V).

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|---|---|---|---|
| 1 | 5 %-grensen regnes mot hele verdien; 5,4 dl → «5 ⅓», 3,1 → «3» (B3) | medium | Bekreftet i `formatNumber`; brukeren ser uvanlige brøker | intent_gap → avgjort av Maja, målrettet rettelse |
| 2 | `neve`, `klype`, `pinch` mangler i udelelige enheter (B1) | medium | «1 neve» × 1,5 → «1 ½ neve» uten «ca.» | patch |
| 3 | Små mengder vises som «0» (B2, E2) | medium | «¼ ts» fra 8 til 1 → «0 ts»; positiv mengde vises som null | patch |
| 4 | Udelelige enheter (stk, boks, pk …) er ikke testet (V1) | medium | Verifisert ved mutasjon: settet kan tømmes uten at tester feiler | patch |
| 5 | «ca.» satt av bare øvre ende av et område er ikke testet (V2) | medium | Verifisert ved mutasjon | patch |
| 6 | Øvre ende av g/ml-område er ikke testet (V3) | medium | Verifisert ved mutasjon | patch |
| 7 | Område kan vises som «1–1» / «2–2» etter formatering (B5, E1) | low | Direkte rettelse: slå sammen når endene blir like som tekst | patch |
| 8 | AD-2-testen sjekker ikke det den heter (B4) | low | Begge kall starter fra originalen; testen er misvisende | patch |
| 9 | Mangler tester for kg/l, grensen 100 g, ≥ 1000 og en tom brøktabell (B8, B9) | low | Tester for grenser og kontrakter; ingen kodeendring | patch |
| 10 | Enheten vises som nøkkel («bokser» → «boks», «kilo» → «kg»), «ca.» fra originalen forsvinner, skilletegn mellom enhet og navn forsvinner (B6, E5, E6, E7) | medium | Reelt i visning, men krever at `ParsedLine` beholder originalt enhetsord og «ca.»; spesifikasjonen forbyr endring av `parseLine` | defer (Story 1.5) |
| 11 | g/ml under 1 blir 1 («0,3 g safran» × 2 → 1 g) uten «ca.» (B7) | low | Følger avgjort regel (hele tall); sjeldent | reject |
| 12 | Originalmengde 0 blir 1 (E3) | low | «0 g» forekommer ikke i oppskrifter | reject |
| 13 | Enorm faktor gir Infinity (E4) | low | Porsjonsvelgeren begrenser til 1–50 (FR-7) | reject |

## Verification

**Commands:**
- `npm run lint` -- expected: 0 feil
- `npm run typecheck` -- expected: ingen feil
- `npm test` -- expected: alle tester grønne
- `npm run format:check` -- expected: ingen avvik
