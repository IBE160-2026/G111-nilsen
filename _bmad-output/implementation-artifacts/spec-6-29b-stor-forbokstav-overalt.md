# Spec 6.29b: stor forbokstav også i kokemodus, handleliste og «Har hjemme»

## Intent
Epic 6. Navnene skal se like ut på alle sider (oppfølging av 6.28b).

## Frosset
- Fortsatt bare ved visning; databasen, søk og matching bruker originalteksten.
- Ny ren funksjon `capitalizeName(tekst, navn)`: setter stor forbokstav på navnet inne i en ferdig formatert linje («2 dl melk» → «2 dl Melk»), og på hele teksten hvis navnet ikke finnes.
- Kokemodus (begge ingredienslistene), handlelisten (linjer, kopieringstekst og offline-kopi) og «Har hjemme»-listen/«Hva kan jeg lage?» (valgte ingredienser og «mangler»-listen).

## Verifisering
tsc, eslint, format rene; vitest grønn; e2e grønn.

## Review Triage Log
Egen gjennomgang.
- Valgt: `lastIndexOf(navn)` så mengden foran ikke treffes feil.
- Akseptert: i handlelistens elementer står tekst og «Til …» sammen i textContent, så noen testforventninger er skrevet om.
