# Spec 6.35b: «Hentet fra …» i kildelinjen

## Intent
Epic 6. Øverst på oppskriften står «Hentet fra Tine» i stedet for bare «Tine».

## Frosset
- Gjelder kildelinjen på oppskriftssiden (lenke og ren tekst, også det tilgjengelige navnet: «Hentet fra Tine, åpner kilden i ny fane»).
- Egne oppskrifter viser fortsatt «Lagt inn selv». Kort i Samlingen, statistikk og mapper viser fortsatt bare kildenavnet (plassen er liten).

## Verifisering
tsc, eslint, format rene; 158 filer og 3230 tester (RecipeView-testene oppdatert).

## Review Triage Log
Egen gjennomgang. Valgt å endre bare detaljsiden; `sourceLabel` er uendret så andre sider ikke påvirkes.
