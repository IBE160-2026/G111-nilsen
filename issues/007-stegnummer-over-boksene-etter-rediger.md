# 007 – Stegnumrene havnet oppå avkrysningsboksene etter Rediger

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-09, manuell test av Story 1.6 (Maja) |
| **Løst** | 2026-11-09 |
| **Område** | design |
| **Alvorlighet** | middels |

## Hva skjedde
På oppskriftssiden sto stegnumrene riktig til venstre for avkrysningsboksene. Etter at jeg åpnet «Rediger» og gikk tilbake til oppskriften, ble numrene tegnet oppå boksene. Å bytte nettleserfane og tilbake ga ingen feil, og siden så riktig ut igjen etter en ny innlasting.

## Hvordan gjenskape
1. Åpne en oppskrift med steg.
2. Trykk «Rediger», og gå tilbake til oppskriften.
3. Stegnumrene ligger oppå boksene.

Feilen lot seg ikke gjenskape i headless Chrome på Linux (Avbryt, Lagre endringer og tilbakeknappen ble prøvd mot utviklingsserveren), så den er trolig knyttet til nettleseren min. Jeg har ikke funnet den eksakte årsaken.

## Årsak
Nummeret var listemarkøren (`::marker`) til en `<li>` som bare inneholder en flex-`<label>`. Next.js skjuler siden med Activity når jeg forlater den, og stilene slås av og på. En nettleser-generert markør ved siden av en flex-label er skjør i den situasjonen, og markøren ble lagt «inni» raden i stedet for utenfor. Konstruksjonen kom fra KI-implementasjonen av Story 1.6 og ble flagget som usikker i gjennomgangen, men kunne ikke vurderes uten ekte nettleser.

## Løsning / hva kan endres
Nummeret er nå et vanlig element (`marker` i `CheckRow`) inni labelen, med `aria-hidden`, og `<ol>` og ingredienslistene har `role="list"` siden `list-style: none` ellers kan fjerne listesemantikken. Det fjerner avhengigheten av `::marker`, og trykk på nummeret veksler nå steget (utsatt funn S7 i gjennomgangen). Kontrollert i Chrome på 1280 og 360 px, også etter Rediger og tilbake. Spesifikasjon: avsnittet «Rettelse etter manuell test» i `spec-1-6-kryss-av-under-matlaging.md`.

## Lærdom / prompt
Gjennomgangen anbefalte uttrykkelig manuell sjekk av `::marker`, og den sjekken fanget feilen. Avhengighet av nettleser-genererte elementer (`::marker`, tilfeldig plassering) bør unngås i komponenter som skjules og vises igjen. Testene dekker nå at nummeret er med i labelen, er skjult for skjermlesere og står i riktig rekkefølge; selve plasseringen må sees i nettleser.
