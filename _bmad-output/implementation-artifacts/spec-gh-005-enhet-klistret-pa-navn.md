---
title: 'Issue 005: enhet klistret på ingrediensnavnet'
type: 'bugfix'
created: '2026-11-09'
status: 'done'
baseline_commit: '92c4e4d1bd9ac9ea6ca96db34b937195ae8baf63'
route: 'oneshot'
review_loop_iteration: 0
context: []
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Ved manuell testing limte Maja inn en oppskrift kopiert fra tine.no. Der mangler mellomrommet mellom enhet og navn («½ tssalt», «6 dlTINE® Lettmelk», «3 stkegg»), og `parseLine` ga da ingen enhet og navn som «tssalt». Mengdene kan dermed skaleres feil og vises rart (issue 005).

**Approach:** Når første ord etter mengden ikke er en enhet, skill ut en kjent enhetsforkortelse i starten av ordet hvis den ikke kan være starten på et vanlig ord: tbsp, tsp, krm, stk, ss, ts, dl, ml, kg, pk, med små bokstaver og fulgt av minst to bokstaver. «g» og «l» skilles aldri ut, så «2 gulrøtter» og «1 løk» tolkes som før.

</frozen-after-approval>

## Implementation Notes

- `src/domain/parse-line.ts`: ny `GLUED_UNIT` (lengste forkortelse først) brukes bare når `LEADING_WORD` ikke ga en enhet.
- `src/domain/parse-line.test.ts`: alle fire linjene fra Majas test, tre andre enheter, og vakter for «2 gulrøtter», «1 løk», «2 grønne epler», «3 egg», «1 dash smør», «2 dle» og «2 SSsukker».
- Allerede lagrede oppskrifter endres ikke (AD-2 lagrer tolkede felt); oppskriften må legges inn på nytt.
- Kjent grense: et ord som starter med en av forkortelsene (f.eks. «tsatsiki») etter et tall ville fått enhet; svært sjeldent i ingredienslister.
- Etter gjennomgang: listen flyttet til `GLUE_SAFE_UNITS` i `units.ts` (én kilde, test at alle er kjente enheter), `fedd` og `tbs` lagt til, tester for «½tssalt», område og «ca.», og den kjente grensen («tsatsiki») låst i test.
- Verifisert: lint, typecheck, format:check, 430/430 tester, bygg. Commit `3bd7b41`.

## Review Triage Log

Gjennomgang (2026-11-09): Blind Hunter.

| # | Funn | Verdikt | Begrunnelse | Rute |
|---|---|---|---|---|
| 1 | Kommentaren sier at forkortelsene ikke kan starte vanlige ord, men «tsatsiki» får enhet ts | low | Riktig; kommentaren presisert og grensen låst i test | patch |
| 2 | Egen enhetsliste i `parse-line.ts` ved siden av `UNIT_VARIANTS`; `tbs` mangler | low | To kilder kan komme i utakt | patch |
| 3 | Issue 005 finnes ikke | false | Filen ligger i prosjektmappen; gjennomgangen leste arbeidskopien | reject |
| 4 | «½tssalt» uten mellomrom er ikke testet | low | Test lagt til | patch |
| 5 | Område og «ca.» er ikke testet med klistret enhet | low | Tester lagt til | patch |
| 6 | «SSsukker» med store bokstaver skilles ikke ut | low | Med vilje (merkenavn); begrunnelse i kommentar | reject |
| 7 | Ofte klistrede enheter (fedd, boks, pose, cup) mangler uten forklaring | low | `fedd` lagt til; de andre er begrunnet utelatt i kommentaren | patch |
| 8 | Sesjonslogg mangler | false | Skrives ved avslutning av oppgaven | reject |
