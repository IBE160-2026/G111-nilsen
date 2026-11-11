# 926 – Lim inn tekst

## Oppgave
Story 6.14: lage en oppskrift fra limt tekst.

## Resultat
- Ny side `/lim-inn`: tekst tolkes i nettleseren (`parseRecipeText`) til et utkast i skjemaet «Legg inn selv», som sjekkes og lagres. Lenke fra Importer. Ingen LLM, ingen migrasjon.
- 133 filer, 3033 tester og 40 e2e grønne. Spec 6-14, epics og README.

## Åpne punkter
- Deloverskrifter i ingredienslisten («Til saus:») droppes.
- Rotete tekst uten struktur gjettes bare grovt; LLM-tolking utsatt.
