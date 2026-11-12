# 920 – Opprydding i README

## Oppgave
Rydde i README-en: den hadde vokst til 25 toppseksjoner på rad, Epic 6-listen lå i tilfeldig rekkefølge, og flere tall og statuser var utdaterte.

## Resultat
- **Struktur:** ny innholdsfortegnelse, og detaljseksjonene samlet under to overskrifter: «Komme i gang» (krav, installasjon, kjøring, database) og «Slik virker delene» (kontoer, samlingen, avkrysning, lagring, mapper, favoritter, redigering, import, forslag). Toppnivået gikk fra 25 til 9 seksjoner.
- **Epic 6:** punktene sortert etter story-nummer i stedet for rekkefølgen de ble lagt til, ny innledning som viser til PRD §4.0, og en linje om hva som ikke er bygget (kandidater og utsatt).
- **Oppdaterte tall:** 150 testfiler og 3124 tester (var 112/2811), 24 e2e-tester per skjermbredde og 48 til sammen (var 22), seks epics (var fem), og `public/` lagt til i mappestrukturen.
- **Ende-til-ende-listen** skrevet om, så den dekker alle 22 løpene (handleliste, ukemeny, deling, uten nett, eksport/import, lim inn tekst, sortering, forside med mer) og ikke bare de åtte første.
- **CI:** fjernet setningen om at arbeidsflyten aldri er prøvd; den viser nå til «Actions» i GitHub.

## Åpne punkter
- Maja bør se om CI faktisk er grønn på GitHub; det kan ikke sjekkes herfra.
