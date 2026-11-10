# Spec 5.6: ingredienser per steg i kokemodus

## Intent
Versjon 2, etter at Maja så kokemodus: i kokemodus skal mengden og ingrediensen som brukes i steget stå rett under steget («Bland mel og salt …» → «4 dl hvetemel», «½ ts salt»). Utsatt fra Story 5.4.

## Frosset
- Ren funksjon `ingredientsForStep(stegtekst, linjer)` i domenet. Et treff er at et ord fra ingrediensnavnet (≥3 bokstaver, uten tilberedningsord som «finhakket», «til», «steking») står i steget: samme ord, bestemt form eller flertall («melken», «eggene», «løken»), eller sammensetning («mel» ↔ «hvetemel», «melet» ↔ «hvetemel»). «mel» treffer ikke «melken».
- Regelen er enkel og uten ordliste: den kan overse en ingrediens, men viser aldri en ingrediens uten ordtreff. Hele ingredienslisten ligger fortsatt i «Ingredienser for N personer» under steget.
- Visningen «I dette steget» står under stegteksten, i stor skrift, og bare når det er treff. Mengdene er skalert til valgt antall og regnet om i metrisk hvis det er valgt (som i listen). Det vises full mengde for hele oppskriften, også når steget bare bruker en del («halvparten av melken»).
- Ingen databaseendring og ingenting lagres.

## Matrise
| Steg | Viser |
|---|---|
| «Bland mel og salt. Tilsett halvparten av melken.» | hvetemel, melk, salt (i listens rekkefølge) |
| «Visp inn melken.» | bare melk |
| «Sikt melet.» | hvetemel |
| «Pisk eggene lett.» | egg |
| «Fres løken i smør.» | smør, løk |
| «Sett ovnen på 200 grader.» | ingenting, ingen «I dette steget» |

## Verifisering
Se loggen.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- Eksisterende kokemodus-tester så nå samme mengde både i steget og i hele listen; byttet til `getAllByText`.
- Utsatt: vise bare delmengden steget bruker («halvparten»), tydeligere ordgjenkjenning (synonymer, stavemåter), og å la brukeren krysse av ingredienser i kokemodus.
