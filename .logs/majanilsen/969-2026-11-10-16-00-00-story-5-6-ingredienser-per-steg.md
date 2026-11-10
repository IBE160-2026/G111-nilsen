# Story 5.6: ingredienser per steg i kokemodus (versjon 2)

## 2026-11-10 kl. 16:00 — majanilsen

### Oppgave
Maja så kokemodus og ville ha mengden og ingrediensen som brukes i steget rett under steget.

### Plan
- Spesifikasjon: [spec-5-6](../../_bmad-output/implementation-artifacts/spec-5-6-ingredienser-per-steg.md).
- `ingredientsForStep` i domenet (ordtreff med bestemt form, flertall og sammensetninger), «I dette steget» i `CookingMode`. Egen gjennomgang, ingen underagenter.
- Forrige økt: [story-5-5](970-2026-11-10-15-30-00-story-5-5-metriske-mal.md).

### Resultat
- «I dette steget» under stegteksten, med mengder i valgt antall (og metrisk hvis valgt), bare når det er treff; hele listen ligger fortsatt under.
- lint, typecheck, format og build grønne; tester og 14 e2e grønne i skyen. Ikke vurdert i nettleser.

### Åpne punkter
- Maja: npm test, e2e, prøv kokemodus på en oppskrift og se om riktige ingredienser dukker opp per steg; send eksempler på steg som bommer.
- Utsatt: bare delmengden steget bruker, synonymer, avkrysning i kokemodus.
