# 005 – Enhet klistret på navnet ved innliming fra oppskriftsside

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-09, manuell test av Story 1.4 (Maja) |
| **Løst** | 2026-11-09 (commit `3bd7b41`) |
| **Område** | skalering / tolking |
| **Alvorlighet** | middels |

## Hva skjedde
En oppskrift på pannekaker ble kopiert fra tine.no og lagt inn via «Legg inn selv». Ingredienslinjene ble lagret som «½ tssalt (kan sløyfes)», «6 dlTINE® Lettmelk 1,0 % fett.», «3 stkegg, helst romtemperert» og «3 ssTINE® Meierismør til steking.», uten enhet og med enheten som del av navnet.

## Hvordan gjenskape
1. Kopier ingredienslisten fra en oppskrift på tine.no.
2. Lim den inn på `/ny` og lagre.
3. Linjene vises med «tssalt», «dlTINE®» osv.

## Årsak
tine.no viser mengde, enhet og navn i hver sine elementer, så mellomrommet forsvinner ved kopiering. `parseLine` krevde at enheten var et eget ord, med vilje, slik at «2 gulrøtter» ikke tolkes som gram.

## Løsning / hva kan endres
`parseLine` skiller nå ut en enhetsforkortelse klistret på navnet når forkortelsen ikke kan være starten på et vanlig ord (tbsp, tsp, krm, stk, ss, ts, dl, ml, kg, pk). «g» og «l» skilles aldri ut. Spesifikasjon: `_bmad-output/implementation-artifacts/spec-gh-005-enhet-klistret-pa-navn.md`.

Funnet avdekket også at appen ikke kan redigere en oppskrift: en «Tips»-seksjon i innlimt tekst ble lagret som steg 3 og 4, og den eneste løsningen er å legge oppskriften inn på nytt. Redigering står ikke i PRD-en; tas opp som eget spørsmål.

## Lærdom / prompt
Test med ekte innlimt tekst, ikke bare ryddige eksempler. Testsidene i `test/fixtures/` bør også brukes til manuell innlegging.
