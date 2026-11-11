# 942 – «Alle uker» og lagrede avkrysninger per uke

## Oppgave
Maja ville kunne velge en uke (uke 38, uke 39 …) fra én side og finne menyen og handlelisten der. Hun valgte en egen side for alle uker.

## Resultat
- Ny side `/ukemeny/uker` med hver uke, rettene og lenker til meny og handleliste; «Alle uker»-lenke på Ukemeny.
- Avkrysninger i handlelisten for en uke lagres per uke (`week_checks`, migrasjon 0011).
- 112 filer, 2810 tester og 22 e2e grønne. Spec: `spec-6-4c-alle-uker.md`.

## Åpne punkter
- Fremdrift per uke og kopiering av uke er ikke laget.
