# Spec 6.8: egen vurdering med stjerner

## Intent
Epic 6 (FR-34). Ida vil gi oppskriftene en egen vurdering fra 1 til 5 og se den på kortene.

## Frosset
- **Vurdering:** et helt tall fra 1 til 5, eller ingen. Fem stjerneknapper (`aria-pressed` på den valgte, `aria-label` «N av 5 stjerner») og «Fjern vurdering». Hver endring lagres med en gang; ved feil står den gamle vurderingen igjen og en melding vises.
- **Eierskap:** bare eieren kan endre (`mayChange`); ukjent eller ulagret oppskrift gir «ikke funnet». Handlingen `saveRating` og tjenesten `setRecipeRating` validerer begge på nytt og avviser alt annet enn hele tall 1–5 og `null`.
- **Kort:** stjernene står i metaraden («★★★★☆», `role="img"` med «Vurdering: 4 av 5»), og `/oppskrifter` revalideres.
- **Data:** kolonnen `recipes.rating` (nullable, migrasjon `0014_recipe_rating`). Tekster i `ratingMessages`.
- **Utenfor:** sortering etter vurdering kommer i 6.9.

## Verifisering
lint, typecheck, format:check og build grønne; 118 filer og 2894 tester (repository, tjeneste, handling, komponent, kort, migrasjon); 28 e2e grønne, med vurdering, innlasting på nytt, kort og fjerning. Skjermbilder ved 360 og 1280 px sett, uten vannrett rulling.

## Review Triage Log
Egen gjennomgang.
- Valgt: knapper med `aria-pressed` i stedet for radioknapper, så hver stjerne kan nås og trykkes direkte.
- Valgt: egen «Fjern vurdering» i stedet for at et nytt trykk på samme stjerne fjerner den, så det ikke skjer ved uhell.
- Akseptert: halve stjerner finnes ikke.
- Utsatt: sortering og filter på vurdering (6.9).
