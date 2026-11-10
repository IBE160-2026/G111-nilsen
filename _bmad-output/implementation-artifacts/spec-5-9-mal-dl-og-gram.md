# Spec 5.9: velg mål – dl eller gram

## Intent
Versjon 2. Brukeren kan velge om ingrediensene vises som volum (dl) eller vekt (gram), på oppskriftssiden, i kokemodus og i handlelisten. Erstatter avkrysningsboksen «Vis i metriske mål» fra 5.5.

## Frosset
- `UnitSystem` er `"original" | "dl" | "gram"` (var `"original" | "metric"`). Valget er en radiogruppe «Vis mengder i»: «Som i oppskriften», «Volum (dl)», «Vekt (gram)» (komponent `UnitChoice`, brukt av `IngredientList` og `ShoppingList`). Kokemodus følger valget fra siden som før (kontekst).
- Kopper, unser og pund regnes som i 5.5 i begge visninger (kopp 2,4 dl, unse 28 g, pund 450 g; tbsp/tsp til ss/ts), bortsett fra at en kopp av en kjent vare i gram-visning går rett til gram.
- Nytt: for kjente ingredienser regnes det mellom dl og gram med faste kjøkkenverdier (g per dl): mel 60, potetmel 80, maisenna 60, sukker 85, melis 60, farin 80, smør/margarin 90, olje 90, melk/vann/fløte/rømme/yoghurt 100, honning/sirup 140, havregryn 35, ris 85, salt 120, kakao 45. `dl`-visning gjør g/kg/oz/lb om til dl (≥10 dl vises som l); `gram`-visning gjør ml/dl/l/krm/ts/ss/kopp om til g (≥1000 g vises som kg). Alt slikt vises som «ca.».
- Navn matches på hele ord, og på ord som slutter på mel, olje, sukker, fløte, smør, melk, salt og ris («hvetemel», «meierismør», «lettmelk», «basmatiris»). «Karamell»/«caramel» tas ikke for mel. Linjer med «og», «eller» eller «and» («salt og pepper») regnes ikke om. Ukjente varer og stykk (egg, løk) røres ikke.
- Valget vises når minst én linje kan regnes om (kopper osv. eller kjent vare i dl/g). I handlelisten vises det alltid. I handlelisten regnes det om før sammenslåing, så «2 dl mel» og «400 g mel» blir «520 g mel (ca.)» i gram-visning.
- Valget er tilstand i nettleseren, som før; ingenting lagres.

## Matrise
| Tilfelle | Utfall |
|---|---|
| 400 g mel, dl | 6 ⅔ dl mel (ca.) |
| 2 dl mel, gram | 120 g mel (ca.) |
| 1 ts salt, gram | 6 g salt (ca.) |
| 1 l melk, gram | 1 kg melk (ca.) |
| 1 cup flour, gram | 140 g flour (ca.) |
| 1 cup stock, gram | 2,4 dl stock (ca.) |
| 2 dl buljong, gram | uendret |
| 2 dl salt og pepper, gram | uendret |
| 2–3 dl melk, gram | 200–300 g melk (ca.) |

## Verifisering
lint, typecheck, format:check og build grønne; 89 filer og 2500 tester; 16 e2e grønne i skymiljøet (v2-testen bytter til gram og tilbake). Skjermbilde på 360 px sett. Verdiene i tabellen er omtrentlige kjøkkenverdier, ikke målt.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- «potetmel» ble først tatt for «mel» (tabellrekkefølge); spesifikk nøkkel står nå først.
- «Karamell» og «caramel» endte på «mel»; egen unntaksliste.
- Radiogruppen er ett nytt tabulatorstopp; tester for tab-rekkefølge justert.
- Fant ved e2e-fixtures at «Meierismør», «lettmelk» og «basmatiris» ikke traff; sammensatte ord for smør, melk, salt og ris lagt til.
- Kjent grense: «saltet smør» regnes som smør (90), «kokosmelk» som melk (100).
- Utsatt: egne tettheter per ingrediens fra brukeren, flere varer (nøtter, ost, grønnsaker), ml/cl i visningen, huske valget mellom besøk.
