# 931 – Sortering av oppskriftene

## Oppgave
Story 6.9: sortere Oppskrifter etter sist lagret, sist laget, mest laget, vurdering og alfabetisk.

## Resultat
- «Sorter etter» i Oppskrifter, ren funksjon `sortCollection` i domenet. Ingen ny migrasjon.
- 118 filer, 2901 tester og 30 e2e grønne. Spec 6-9, epics og README.

## Åpne punkter
- Sorteringen huskes ikke til neste besøk, og rekkefølgen kan ikke snus.
