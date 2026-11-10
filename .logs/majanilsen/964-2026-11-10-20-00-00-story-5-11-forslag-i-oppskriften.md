# Story 5.11: forslag som er tatt i bruk vises i oppskriften (versjon 2)

## 2026-11-10 kl. 20:00 — majanilsen

### Oppgave
Et forslag som tas i bruk skal komme inn i oppskriften og ingredienslisten.

### Plan
- Spesifikasjon: [spec-5-11](../../_bmad-output/implementation-artifacts/spec-5-11-forslag-i-oppskriften.md).
- Maja valgte «vis i listene» (merket, originalen uendret) framfor å redigere oppskriften.
- `withAppliedSuggestions` i domenet, linje og plassering på reglene fra 5.10, merke i `IngredientList`, `StepList` og kokemodus, «Forslag til retten» under stegene, handlelisten tar med ingrediensforslag med mengde. Egen gjennomgang, ingen underagenter.
- Forrige økt: [story-5-10](965-2026-11-10-19-15-00-story-5-10-forslag-som-passer.md).

### Resultat
- «Ta i bruk» legger forslaget inn som merket linje eller steg, og «Fjern» tar det bort.
- lint, typecheck, format og build grønne; 2532 tester; 16 e2e grønne i skyen.

### Åpne punkter
- Maja: `npm test` (2532), e2e (16), ta i bruk et ingrediensforslag og et stegforslag på en oppskrift, endre antall personer og åpne kokemodus.
- Utsatt: plassering for språkmodellforslag, flytte forslag, gjøre forslag til ekte endring.
