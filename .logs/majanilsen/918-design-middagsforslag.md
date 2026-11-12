# 918 – Design på middagsforslag

## Oppgave
Maja syntes siden «Hva skal vi ha til middag?» var kjedelig. Gi den et design uten å endre oppførselen.

## Resultat
- Sentrert komposisjon i stedet for en tynn stripe øverst til venstre: overskrift, ingress, filtre, kort og knapp under hverandre, maks 34 rem bredt.
- Filtrene er nå pillevalg: «Bare favoritter» (avkrysning) og en radiogruppe for tid («Alle», «Opptil 30 min», «Opptil 60 min») i stedet for nedtrekkslisten. Skjulte inndatafelt, men i tabrekkefølgen, med fokusring, og valgt tilstand som fylt pille.
- Et fast kort er midtpunktet: før trekningen et stiplet kort med kortstabel og «Middagen venter», etter trekningen tittelen i serif med tid, mappe, stjerner og merkelapper. Kortet tones inn ved hver trekning, og animasjonen er av ved `prefers-reduced-motion`.
- Kortet viser mappe, vurdering og merkelapper, som allerede lå i dataene siden leste.
- 150 filer, 3127 tester og 48 e2e grønne. Sett ved 390 og 1280 px.

## Åpne punkter
- Samme pille-mønster kan brukes på andre filtre (Oppskrifter, handlelisten) i designrunden til slutt.
