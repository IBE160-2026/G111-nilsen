# 945 – «Passer til» ved notatene

## Oppgave
Maja ville ha et eget felt ved notatene for hvor mange en oppskrift passer til. Hun valgte egen vurdering som tekst («2 sultne»), uten å endre skaleringen.

## Plan
Ny kolonne, tjeneste, Server Action og felt i notatkortet, med tester og e2e.

## Resultat
- Migrasjon `0010_fits_for`, `setRecipeFitsFor`, `saveFitsFor`, felt i `RecipeNotes` som lagres med «Lagre notat».
- 111 filer, 2791 tester, 22 e2e, lint, tsc, format og build grønne.
- Spec: `spec-6-6b-passer-til.md`.

## Åpne punkter
- Kjør `npm run dev` på Mac så migrasjonen tas i bruk i den lokale databasen.
