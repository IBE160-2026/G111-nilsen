# Spec 5.5: metriske mål

## Intent
Versjon 2. Oppskrifter fra engelske sider bruker kopper, unser og pund. Brukeren kan slå på «Vis i metriske mål» og se mengdene i dl, gram og kg. Omregning av enheter sto utenfor v1 (PRD).

## Frosset
- Ren funksjon `convertLine(line, "original" | "metric")` i domenet. Originalen røres aldri (AD-2): omregningen skjer ved visning, etter skalering (`convertLine(scaleLine(line, faktor), system)`).
- Regler: 1 cup = 2,4 dl, 1 oz = 28,35 g, 1 lb = 453,6 g (avrundet som g/ml ellers), 1 tbsp = 1 ss, 1 tsp = 1 ts. Kopper, unser og pund merkes «ca.»; skjeer gjør ikke det. Gram fra 1000 vises som kg (én desimal), dl fra 10 som l. dl får én desimal. Områder («1–2 cups») regnes om i begge ender.
- Ikke omregnet: norske enheter, `can`, `pinch`, stykk, linjer uten enhet og ikke tolkbare linjer. Fahrenheit og mål inne i stegteksten og forslag regnes ikke om.
- Avkrysning «Vis i metriske mål» ligger øverst i ingredienslisten og vises bare når minst én linje har en amerikansk enhet. Standard er av. Valget gjelder bare denne visningen (ingen lagring) og følger med inn i kokemodus.
- Valget deles via `SelectedServings`-leverandøren (egen ref for målsystem), som antall personer.

## Matrise
| Tilfelle | Utfall |
|---|---|
| «2 cups flour» på | «4,8 dl flour ca.» |
| «1 lb beef» | «450 g beef ca.» |
| «3 lb potatoes» | «1,4 kg potatoes ca.» |
| «5 cups water» | «1,2 l water ca.» |
| «2 tbsp butter» | «2 ss butter» (ikke ca.) |
| «1 cup milk» ved 5 personer av 4 → «1 ¼ cup» | regnes om etter skalering |
| «4 dl melk», «3 egg», «2 cans …» | uendret |
| Ingen amerikanske enheter | ingen avkrysning |
| På i kokemodus | ingrediensene vises metrisk |

## Verifisering
lint, typecheck, format:check og build grønne; 83 filer og 2400 tester (22 nye); 14 e2e grønne i skyen. Ikke vurdert i nettleser.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- Parseren normaliserer «cups» til «cup», så uomregnet visning heter «2 cup flour»; ikke endret her.
- To refs i leverandøren ble to kontekster, fordi React-lint nekter å endre en ref som ligger i et kontekstobjekt.
- Utsatt: omregning til amerikanske mål, mål i stegtekst, °F til °C, fl oz, å huske valget.
