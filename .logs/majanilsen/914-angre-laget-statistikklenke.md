# 914 – Angre «Laget i dag» og «Se statistikk»

## Oppgave
Ønske: en angre-knapp på «Laget i dag», og en knapp «Se statistikk» under teksten om sist laget.

## Resultat
- «Angre» vises ved siden av «Laget i dag» etter at man har trykket den, og setter antall og dato tilbake. Serveren teller ned og går aldri under 0.
- «Se statistikk» står under «Sist laget …» i Notater og går til `/statistikk`. Statistikksiden oppdateres ved både «Laget i dag» og «Angre».
- Ingen migrasjon. Nye tester for tjeneste, action og komponent; e2e-løpet for statistikk dekker angre og lenken.

## Åpne punkter
- «Angre» finnes bare til siden lastes på nytt; en lagret historikk per dato er ikke laget.
