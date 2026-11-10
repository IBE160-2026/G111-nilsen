# Spec 5.7: handleliste

## Intent
Versjon 2 (automatisk handleliste sto utenfor v1). Brukeren velger en eller flere lagrede oppskrifter og antall personer for hver, og får én sammenslått liste å krysse av i butikken.

## Frosset
- Ny side `/handleliste` (femte punkt «Handleliste» i toppmenyen, og lenken «Lag handleliste» ved overskriften på Oppskrifter). Under 480 px er menyskriften 0,78 rem og mellomrommene smalere, så alle fem punktene står på én linje fra 360 px; ved 320 px eller stor tekst brytes de til neste linje (målt i Chromium: 360 px én linje, 320 px to). Overskrift utenfor Suspense, data inne i grensen etter `connection()`, som Oppskrifter. Ingen lagrede oppskrifter gir tom-tilstand med lenke til Oppskrifter.
- `listShoppingRecipes` gir lagrede oppskrifter (sist lagret først) med ingredienser. Utvalg, antall, avkrysning og målsystem er tilstand i nettleseren; ingenting lagres og ingenting nytt i databasen.
- Hver oppskrift har et antall personer (sist valgt, ellers antallet den er skrevet for; hele og halve tall 0,5–50, ugyldig inntasting beholder forrige verdi). Oppskrift uten gyldig opprinnelig antall regnes uskalert og har ikke antallsfelt.
- Ren funksjon `buildShoppingList(utvalg, system)` i domenet: hver linje skaleres (`scaleLine`) og regnes eventuelt om til metrisk (`convertLine`), så slås linjer med **samme navn og samme enhet** sammen ved å legge sammen mengdene (områder i begge ender). Ulike enheter for samme ingrediens står hver for seg. Linjer uten mengde eller som ikke kan tolkes står som de er, én gang per tekst. Sortert på navn. «Ca.» beholdes hvis en av linjene var avrundet.
- Hver vare viser «Til <oppskrifter>». Avkrysning er nøklet på navn og enhet, så den består når utvalget endres. «Vis i metriske mål» gjelder hele listen.
- «Kopier listen» kopierer de som ikke er krysset av som «- vare» per linje (Clipboard API); melder «Listen er kopiert.» eller «Kunne ikke kopiere …».

## Matrise
| Tilfelle | Utfall |
|---|---|
| Pannekaker (4 dl melk, 3 egg, 400 g mel) + Vafler (2 dl melk, 2 egg) | 5 egg, 400 g mel, 6 dl melk |
| «2 dl melk» + «1 ss melk» | to linjer |
| 8 personer av 4 | mengdene doblet før sammenslåing |
| Metrisk på: «1 cup milk» + «1 dl milk» | «3,4 dl milk (ca.)» |
| «salt og pepper» i to oppskrifter | én linje, «Til A, B» |
| Ingenting valgt | veiledning, ingen kopier-knapp |
| 4,3 eller 0 i antallsfeltet | ignoreres |

## Verifisering
lint, typecheck, format:check og build grønne; 87 filer og 2432 tester; 16 e2e grønne i skymiljøet (ny test: handleliste fra lagret oppskrift). Ikke vurdert i nettleser eller på ekte telefon (Clipboard API).

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- To eksisterende sidetester talte lenker på Oppskrifter; filtrerer nå bort handlelisten, og en ny test sjekker lenken.
- Sammenslåing er på nøyaktig navn: «mel» og «hvetemel» slås ikke sammen. «500 g» + «700 g» blir «1200 g», ikke «1,2 kg».
- Utsatt: slå sammen beslektede navn og enheter (dl + ss), kg/l for store summer, huske utvalget og avkrysning mellom besøk, dele listen, rader per avdeling i butikken.
