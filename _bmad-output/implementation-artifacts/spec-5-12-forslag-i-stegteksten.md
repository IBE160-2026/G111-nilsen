# Spec 5.12: forslag flettet inn i stegteksten

## Intent
Versjon 2, videre fra 5.11. Forslag som er tatt i bruk skal stå i selve teksten i oppskriften, ikke som egne steg. Valgt av Maja: flett forslaget inn i steget det hører til, uthevet.

## Frosset
- `Step` får `addedBefore` og `addedAfter` (lister med setninger). `withAppliedSuggestions` fyller dem; lagrede steg endres aldri (AD-2), og «Fjern» tar setningen bort.
- Stegforslag: flettes inn **foran** teksten i steget som passer `before` («La røren hvile …» foran «Stek …»; «*» = første steg). Uten plassering (språkmodell) eller uten treff flettes det inn **etter** teksten i siste steg. Bare når oppskriften ikke har steg blir forslaget et eget merket steg.
- Ingrediensforslag: linjen i ingredienslisten som i 5.11, og i tillegg en kort setning (`stepText`, uten mengde, siden mengden står og skaleres i listen) **etter** teksten i første steg som passer `into` («Visp sammen mel og melk. Rør inn vaniljesukker eller kardemomme.»). Uten treff, eller fra språkmodell, bare i listen.
- Visning (`StepText`, brukt i «Slik gjør du» og kokemodus): forslaget står i `<mark>`, lett tonet med strek under, med skjult «Forslag:» foran for skjermlesere; navnet på avkrysningsboksen blir hele teksten. Kokemodus regner også ingrediensene i de innflettede setningene med i «I dette steget».
- Forslag om hele retten står fortsatt under «Forslag til retten».

## Matrise
| Tatt i bruk | Vises |
|---|---|
| «La røren hvile …» (pannekaker) | «[La røren hvile …] Stek tynne pannekaker.» |
| «Ha en teskje vaniljesukker …» | linje i listen + «Visp sammen mel og melk. [Rør inn vaniljesukker eller kardemomme.]» |
| «Forvarm ovnen …» | foran teksten i første steg |
| Språkmodell-stegforslag | etter teksten i siste steg |
| Oppskrift uten steg | eget steg merket «Forslag» |
| «Fjern» | setningen og linjen er borte |

## Verifisering
lint, typecheck, format:check og build grønne; 91 filer og 2536 tester; 16 e2e grønne i skymiljøet (UJ-2 sjekker at forslaget er merket i oppskriften og borte etter «Fjern»). Skjermbilde på 1280 px sett.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- Første versjon pakket setningene i `<span>`, og jsdom (og enkelte skjermlesere) slo sammen ordene uten mellomrom i navnet på boksen; nå er mellomrommene egne tekstnoder ved siden av `<mark>`.
- Setningene i steget hadde først mengde («1 ts»), som ikke skaleres med antall porsjoner; mengden står nå bare i ingredienslisten.
- Utsatt: be språkmodellen om plassering, la brukeren flytte en setning, skalere mengder i stegteksten.
