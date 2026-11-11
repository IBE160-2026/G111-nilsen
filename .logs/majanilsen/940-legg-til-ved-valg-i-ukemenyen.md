# 940 – Oppskriften legges på dagen ved valg

## Oppgave
Maja ville ikke trykke «Legg til» i ukemenyen; oppskriften skal legges inn når hun velger den.

## Resultat
- `RecipePicker` har `onPick` (klikk eller Enter i listen); `WeekPlan` legger til med en gang. «Legg til»-knappen er fjernet, og Enter i antallfeltet legger til den valgte oppskriften.
- Hjelpetekst over dagene. 112 filer, 2811 tester og 22 e2e grønne. Spec 6-4 oppdatert.

## Åpne punkter
- Å skrive en tittel helt likt legger ikke til alene (for å unngå uhell); Enter eller klikk i listen gjør det.
