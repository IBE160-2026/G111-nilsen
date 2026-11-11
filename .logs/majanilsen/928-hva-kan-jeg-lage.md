# 928 – Hva kan jeg lage?

## Oppgave
Story 6.12: vise hvilke oppskrifter som kan lages ut fra «Har hjemme».

## Resultat
- Ny side `/hva-kan-jeg-lage` med live treff gruppert i «Kan lages nå», «Mangler 1–2 ting» og «Mangler flere ting». Samme «Har hjemme»-liste som handlelisten; ingen migrasjon.
- Ren domenefunksjon `matchPantry` (hele ord, uavhengig av store/små bokstaver og aksenter). Lenke fra Oppskrifter.
- 127 filer, 2999 tester og 36 e2e grønne. Spec 6-12, epics og README.

## Åpne punkter
- Sammensatte ord («helmelk») treffer ikke «melk».
- Salt og vann regnes ikke som basisvarer.
