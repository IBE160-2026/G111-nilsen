# Spec 6.31b: velge hvilke snarveier som vises på forsiden

## Intent
Epic 6. «Og dessuten»-raden på forsiden kan tilpasses.

## Frosset
- Knappen «Tilpass» (aria-expanded) åpner en gruppe avkrysningsbokser, én per snarvei, og «Ferdig» lukker den.
- Valget lagres i nettleseren (`recipemate-hidden-shortcuts`, liste over skjulte href-er), ikke på kontoen. Nye snarveier vises derfor av seg selv.
- Server og første visning viser alle (ingen hydreringsfeil); ugyldig lagring tolkes som ingen skjulte; er alle skjult, står en forklaring.
- De seks kortene over er ikke valgfrie.

## Verifisering
Tester for `hidden-shortcuts` og `HomeShortcuts`; e2e utvidet (skjul, last på nytt, vis igjen).

## Review Triage Log
Egen gjennomgang.
- Valgt: lagre de skjulte, ikke de viste.
- Akseptert: valget følger ikke med til andre enheter.
