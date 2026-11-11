# 934 – Lagre handlelisten og knytte den til ukemenyen

## Oppgave
Maja ville ha en lagre-funksjon på handlelisten og at handlelister og ukemenyer henger sammen.

## Resultat
- Handlelisten er for denne uka som standard og bygget av ukemenyen, med uke-navigasjon og lenke til menyen.
- «Lagre handlelisten» (navn, oppskrifter og porsjoner) og «Lagrede handlelister» med åpne og slette. Ny migrasjon `0012_shopping_lists`.
- 116 filer, 2859 tester og 24 e2e grønne. Spec 6-4g og epics.

## Åpne punkter
- Avkrysninger og egne varer lagres ikke i en liste (Majas valg), og lister kan ikke gis nytt navn.
