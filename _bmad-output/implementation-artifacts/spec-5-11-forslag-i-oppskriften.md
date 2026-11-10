# Spec 5.11: forslag som er tatt i bruk vises i oppskriften

> **Delvis erstattet av Story 5.12 (2026-11-10):** stegforslag blir ikke lenger egne steg, men flettes inn i teksten i steget de hører til. Ingrediensforslag og «Forslag til retten» under gjelder fortsatt.

## Intent
Versjon 2. Når brukeren trykker «Ta i bruk», skal forslaget komme inn i oppskriften: i ingredienslisten eller ved riktig steg. Valgt av Maja: vis det i listene, merket, uten å endre originalen (alternativet var å redigere oppskriften).

## Frosset
- Ren domenefunksjon `withAppliedSuggestions(ingredienser, steg, forslag)` gir `{ ingredients, steps, tips }`. Lagrede linjer og steg endres aldri (AD-2); ingen ny tabell eller migrasjon.
- `appliesTo: "ingredients"` blir en linje sist i ingredienslisten, merket «Forslag». Enkle forslag fra reglene (5.10) har en kort linje (f.eks. «1 ts vaniljesukker eller kardemomme») som tolkes og skaleres og regnes om (dl/gram) som de andre. Andre forslag (språkmodell) står med forslagsteksten.
- `appliesTo: "steps"` blir et merket steg. Enkle forslag har stammer (`before`) for steget de settes foran (f.eks. «hvile røren» foran første steg med «stek»; «*» = først). Ellers, eller når ingen steg passer, legges det sist. Stegene nummereres på nytt.
- `appliesTo: "recipe"` vises under stegene som «Forslag til retten».
- Forslagslinjer og -steg har negative id-er (avkrysning kolliderer ikke). De følger med i kokemodus (merket steg) og i handlelisten (bare ingrediensforslag med mengde).
- «Ta i bruk» og «Fjern» revaliderer siden som før, så listene oppdateres med en gang. «Pensle med egg …» (gjærbakst) er nå et stegforslag.

## Matrise
| Tatt i bruk | Vises |
|---|---|
| «Ha en teskje vaniljesukker …» | «1 ts vaniljesukker eller kardemomme» sist i ingredienslisten, skalert |
| «La røren hvile 20–30 min …» | nytt steg foran «Stek …» |
| «Forvarm ovnen …» | første steg |
| «Server med friske bær …» | under «Forslag til retten» |
| Språkmodellforslag om ingredienser | forslagsteksten som linje |
| Ingen steg passer `before` | steget sist |
| «Fjern» | borte fra listene |

## Verifisering
lint, typecheck, format:check og build grønne; 91 filer og 2532 tester; 16 e2e grønne i skymiljøet (UJ-2 sjekker merket i oppskriften og at «Fjern» tar det bort). Skjermbilde på 1280 px sett.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- Første e2e-versjon antok at første forslag var et steg; for Rundstykker er det en ingrediens. Testen teller nå «Forslag»-merker uansett liste.
- Kravet fra v1 «forslag endrer aldri ingredienser eller steg» (FR-11) står: lagrede data endres ikke. README og kommentaren på `applySuggestion` er oppdatert.
- Plassering og linje finnes bare for de faste reglene; endres teksten på en regel, faller gamle lagrede forslag tilbake til tekst/sist.
- Utsatt: be språkmodellen om linje og plassering, la brukeren flytte et forslag, gjøre et forslag til en ekte endring.
