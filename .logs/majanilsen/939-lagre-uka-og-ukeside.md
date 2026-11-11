# 939 – Lagre uka, stor «Se alle uker» og ukeside

## Oppgave
Maja ville ha en større «Se alle uker»-knapp (også under Ukemeny), en side per uke med menyen og videre valg til handlelisten, og en «Lagre uka»-knapp i stedet for automatisk lagring.

## Resultat
- `WeekPlan` bruker utkast og «Lagre uka» (`saveWeekPlan`, `saveWeek`, `replaceWeek` i én transaksjon); status om ulagret, advarsel ved lukking, handlelisten venter til uka er lagret.
- Stor «Se alle uker»-knapp; ny side `/ukemeny/uker/[uke]` med dagene, «Se handlelisten for uka» og «Endre uka». Kortene i «Alle uker» lenker dit.
- 113 filer, 2819 tester, 22 e2e, lint, tsc, format og build grønne. Spec 6-4d, epics og skjermbilder ved 360/1280 px.

## Åpne punkter
- Lagrer man samme uke i to faner, vinner den siste lagringen.
