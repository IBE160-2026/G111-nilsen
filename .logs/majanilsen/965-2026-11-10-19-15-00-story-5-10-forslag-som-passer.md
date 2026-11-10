# Story 5.10: forslag som passer oppskriften (versjon 2)

## 2026-11-10 kl. 19:15 — majanilsen

### Oppgave
Forslagene under oppskriften var ikke relevante for retten. Gjør dem passende.

### Plan
- Spesifikasjon: [spec-5-10](../../_bmad-output/implementation-artifacts/spec-5-10-forslag-som-passer.md).
- Årsak: uten språkmodellnøkkel viste appen tre faste eksempelforslag uavhengig av retten. Ny regelbasert `suggestForRecipe` i domenet, brukt av mock-leverandøren. Egen gjennomgang, ingen underagenter.
- Forrige økt: [story-5-9](966-2026-11-10-18-30-00-story-5-9-mal-dl-og-gram.md).

### Resultat
- Forslag laget av regler ut fra ingredienser og steg (pannekaker, kjøttboller, gjærbakst, pasta, fisk, kylling, supper m.fl.), merket «Enkle forslag». Generelle eksempler brukes bare når ingen regel passer.
- lint, typecheck, format og build grønne; 2518 tester; 16 e2e grønne i skyen.

### Åpne punkter
- Maja: `npm test` (2518), e2e (16), åpne noen egne oppskrifter og trykk «Få forslag»; si fra om en rett får råd som ikke passer, eller ingen råd. Med egen språkmodellnøkkel kommer forslagene fra modellen i stedet.
- Utsatt: flere retter, engelske ord, regler som ser på mengder.
