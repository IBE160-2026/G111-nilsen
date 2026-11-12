# Spec 6.34b: delt «Slik gjør du»

## Intent
Epic 6. Stegene kan deles i deler, for eksempel «Kake» og «Glasur».

## Frosset
- Samme skrivemåte som delelister i ingredienser (6.32b): en linje som slutter på «:» eller begynner med «#» er overskrift for stegene under.
- Visningen grupperer etter etterfølgende steg med samme del (`groupSteps`), viser en h3-overskrift per del, og nummereringen starter på 1 i hver del. Uten deler ser det ut som før.
- Redigering skriver delene tilbake som «Navn:»-linjer. Kokemodus går gjennom stegene i rekkefølge som før.

## Verifisering
Tester for `groupSteps`, `StepList`, tjenesten og redigeringsverdiene; e2e (kake med utbytte, uten porsjoner, delt fremgangsmåte).

## Review Triage Log
Egen gjennomgang.
- Akseptert: en stegsetning som ender på kolon og er kort («Bland følgende:») tolkes som overskrift.
- Akseptert: kokemodus viser ikke del-navnet.
