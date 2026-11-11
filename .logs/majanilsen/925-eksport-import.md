# 925 – Eksport og import av oppskrifter

## Oppgave
Story 6.15: sikkerhetskopi av oppskriftene som fil, og import av en slik fil.

## Resultat
- Ny side `/sikkerhetskopi` med nedlasting (`/sikkerhetskopi/eksport`) og import av JSON-fil. Eget format uten id-er (mappe og merkelapper på navn), zod-validering, import i én transaksjon, dublettsjekk på tittel og kilde. Lenke fra Importer. Ingen migrasjon.
- 138 filer, 3055 tester og 42 e2e grønne. Spec 6-15, epics og README.

## Åpne punkter
- Ukemeny, handlelister og tatt i bruk forslag eksporteres ikke.
- En oppskrift med endret tittel regnes som ny ved import.
