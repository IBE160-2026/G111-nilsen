# Spec 6.4g: lagre handlelisten og knytte den til ukemenyen

## Intent
Epic 6. Ida vil ha en lagre-funksjon på handlelisten, og at handliste og ukemeny henger sammen så man kommer fra ukemenyen til handlelisten for gjeldende meny.

## Frosset (Majas valg: én liste per uke, pluss starten på egne lagrede lister; lagre oppskrifter og porsjoner)
- **Uke:** `/handleliste` er for denne uka og bygges av ukemenyen (oppskrifter og porsjoner, summert per oppskrift); `?uke=ÅÅÅÅ-MM-DD` velger en annen uke. Siden har «Forrige uke»/«Neste uke», og en lenke til ukemenyen for uka («Planlegg uka» når uka er tom). Avkrysninger for uka lagres som før. Ukemenyen og ukesiden lenker til handlelisten for uka.
- **Lagre:** «Lagre handlelisten» med et navn (starter som «Uke 46», eller navnet på den åpnede listen) lagrer valgte oppskrifter og porsjoner. Samme navn (uavhengig av store og små bokstaver) per bruker erstatter listen; navn 1–60 tegn, 1–50 oppskrifter, antall 0,5–50 (oppskrift uten antall lagres med 1 og bruker det ikke), høyst 50 lister, bare egne lagrede oppskrifter. Avkrysninger og egne varer lagres ikke i listen.
- **Lagrede lister:** «Lagrede handlelister» nederst: navn, antall oppskrifter, «Åpne» (`/handleliste?liste=ID`, uten ukenavigasjon) og «Slett» med bekreftelse. Ukjent liste gir en melding og viser uka.
- **Data:** tabellene `shopping_lists` og `shopping_list_items` (migrasjon `0012_shopping_lists`), slettes med brukeren, og oppskriftsraden med oppskriften. Tjeneste `shopping-list-service`, handlinger `saveShoppingList` og `deleteShoppingList` (valideres på nytt med zod og i tjenesten).

## Verifisering
lint, typecheck, format:check og build grønne; 116 filer og 2859 tester (tjeneste, handlinger, komponenter, side, migrasjonstestene); 24 e2e grønne, med lagring, åpning og sletting av en liste. Skjermbilde ved 360 px sett.

## Review Triage Log
Egen gjennomgang.
- Valgt: ukelisten følger alltid ukemenyen (ingen egen kopi å holde i synk); lagrede lister er øyeblikksbilder av valg og porsjoner.
- Valgt: standardsiden er denne uka i stedet for en tom liste.
- Akseptert: slettes en oppskrift, forsvinner den fra de lagrede listene.
- Utsatt: å lagre avkrysninger og egne varer i en liste, og å gi nytt navn.
