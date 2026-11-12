# Spec 6.27b: sammensatte ord i «Hva kan jeg lage?»

## Intent
Epic 6. Maja ønsket at «mel» hjemme passer til «hvetemel» i en oppskrift. Det samme trengs ikke for «melk».

## Frosset
- **Kort liste over endelser:** «mel», «olje» og «sukker». Når brukeren har ett av dem hjemme (som ett ord), passer det også til oppskriftsord som er lengre og slutter på det («hvetemel», «sammalt hvetemel», «olivenolje», «rørsukker»).
- **Uendret:** hele ord må fortsatt passe ellers. «melk» passer ikke til «kokosmelk», og «mel» passer ikke til «melis» (som ikke slutter på mel). Omvendt passer ikke «hvetemel» hjemme til «mel» i en oppskrift. Det gjelder bare når det brukeren har hjemme er ett ord; «fint mel» må fortsatt passe ord for ord.
- Listen er kort med vilje, så ikke «gressløk» regnes som «løk» eller «kost» som «ost».

## Verifisering
tsc, eslint og format rene; alle tester grønne (to nye for domenefunksjonen); e2e for «Hva kan jeg lage?» grønn.

## Review Triage Log
Egen gjennomgang.
- Valgt: en liten liste over endelser framfor generell suffiks-matching, fordi generell matching ville gjort «melk» til «kokosmelk» og gitt feil treff på tvers av ord.
- Akseptert: listen må utvides for hånd (for eksempel «løk» eller «ost») hvis det trengs.
