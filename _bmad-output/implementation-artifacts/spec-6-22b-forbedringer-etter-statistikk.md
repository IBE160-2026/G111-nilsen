# Spec 6.22b–6.25b: små forbedringer etter statistikken

Fire små endringer som Maja ba om etter 6.21b. De deler én spec fordi hver av dem er liten.

## 6.22b Middagsforslag husker filteret
- **Frosset:** bare favoritter, tidsgrense og valgte mapper lagres i nettleseren (`localStorage`, nøkkel `recipemate-dinner-filter`), ikke på kontoen. Det er et valg på denne enheten.
- Komponenten leser lageret med `useSyncExternalStore`; på serveren og før lesing gjelder standardvalget, så første visning er lik overalt. Lagret innhold valideres (`parseDinnerFilter`); ugyldig innhold gir standardvalget. Mapper som er slettet siden sist droppes ved visning.
- Lagring som feiler (privat modus) ignoreres; siden virker som før.

## 6.23b Angre ved fjerning uten bekreftelse
- **Avgrenset:** mappesletting og «Tøm Har hjemme» har allerede en bekreftelsesdialog og er ikke endret; sletting av oppskrift har «Nylig slettet». «Angre» er lagt til der man fjerner med ett trykk: merkelapper på en oppskrift (legges tilbake med samme handling som «Legg til») og oppføringer i ukemenyen (legges tilbake i utkastet, før uka er lagret).
- «Angre» forsvinner når man gjør noe annet (legger til, lagrer, fjerner igjen).
- Rekkefølgen kan endres: en merkelapp som legges tilbake havner sist.

## 6.24b Statistikk for en periode
- **Ny tabell `cooked_log`** (migrasjon 0017): én rad per trykk på «Laget i dag». Eksisterende oppskrifter med «sist laget» får én rad med den datoen. `cookedCount` og `lastCookedAt` er fortsatt sannheten for «alt».
- «Angre» på «Laget i dag» fjerner siste loggrad. Gjenoppretting fra «Nylig slettet» og import av sikkerhetskopi legger inn én rad (siste dato), siden enkeltdatoene ikke finnes i kopien.
- `/statistikk?periode=30|aar|alt` (pillelenker, «Alt» er standard og ukjent verdi gir «Alt»). Ren funksjon `periodStart` i domenet (`now` sendes inn); «I år» begynner nyttårsnatt i norsk tid. I en periode regnes «laget» ut fra loggen; mapper, vurdering og kilder gjelder hele samlingen. Teksten under «aldri laget» sier «ikke laget i perioden».
- **Akseptert:** historikk fra før 0017 kjenner bare siste dato, så «Siste 30 dager» undertelle eldre trykk.

## 6.25b Enkle forslag når språkmodellen er opptatt
- Når språkmodellen svarer `rate_limited` (over 10 kall i minuttet), bruker `getSuggestions` de enkle forslagene i stedet for å feile. Resultatet får `busy: true`, og siden sier «Språkmodellen er opptatt akkurat nå …». Andre feil (tidsavbrudd, nett, HTTP) gir fortsatt en feilmelding. Dette lukker punktet som PRD-en først påsto var gjort.

## Verifisering
tsc, eslint og format:check rene; 154 filer og 3180 tester; e2e utvidet (filter huskes etter reload, angre merkelapp, periodevalg); build grønn.

## Review Triage Log
Egen gjennomgang.
- Valgt: `localStorage` for filteret fremfor en kolonne på kontoen; det er et enhetsvalg og trenger ingen migrasjon.
- Valgt: ikke angre på mappesletting og «Tøm Har hjemme»; de har bekreftelsesdialog, og en riktig gjenoppretting av mapper ville krevd egen lagring.
- Valgt: angre-datoen på «Laget i dag» er fortsatt klientens (validert), loggen fjernes på serveren ved siste rad, så antall og logg holder seg i takt.
- Akseptert: åpnes oppskriften i to faner, kan «Angre» i den ene fjerne en rad som hører til trykket i den andre; antallet er likevel riktig.
