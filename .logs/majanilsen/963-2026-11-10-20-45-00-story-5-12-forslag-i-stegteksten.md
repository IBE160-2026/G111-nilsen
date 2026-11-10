# Story 5.12: forslag flettet inn i stegteksten (versjon 2)

## 2026-11-10 kl. 20:45 — majanilsen

### Oppgave
Forslag som tas i bruk skal også komme inn i teksten i oppskriften.

### Plan
- Spesifikasjon: [spec-5-12](../../_bmad-output/implementation-artifacts/spec-5-12-forslag-i-stegteksten.md).
- Maja valgte «flett inn i steget» framfor egne steg. `addedBefore`/`addedAfter` på `Step`, `stepText`/`into` på reglene, ny `StepText` i stegene og kokemodus. Egen gjennomgang, ingen underagenter.
- Forrige økt: [story-5-11](964-2026-11-10-20-00-00-story-5-11-forslag-i-oppskriften.md).

### Resultat
- Stegforslag flettes inn foran eller etter teksten i riktig steg, ingrediensforslag nevnes i steget der ingrediensene blandes; uthevet og lest opp som «Forslag:».
- lint, typecheck, format og build grønne; 2536 tester; 16 e2e grønne i skyen.

### Åpne punkter
- Maja: `npm test` (2536), e2e (16), ta i bruk forslag på pannekaker og en kjøttdeigrett og les stegene.
- Utsatt: plassering for språkmodellforslag, flytte setninger.
