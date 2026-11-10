# Spec 5.8: «Har hjemme» på handlelisten

## Intent
Versjon 2. Det man alltid har hjemme (salt, olje, mel …) skal ikke stå på handlelisten. Brukeren kan klikke en vare bort med «Har hjemme», eller skrive inn selv hva som er hjemme, og det huskes mellom besøk.

## Frosset
- Ny tabell `pantry_items` (migrasjon `0005_pantry`): `id`, `name`, `name_key` (unik), `created_at`. Ingen kobling til oppskrifter. Vises og lagres globalt, siden appen har én bruker.
- Sammenligning på **normalisert navn** (`normalizeSearch`: små bokstaver, NFC) og bare navnet: «olivenolje» hjemme skjuler både «2 ss olivenolje» og «1 dl olivenolje». «Mel» skjuler ikke «hvetemel» (samme begrensning som sammenslåingen i 5.7).
- Domene: `splitByPantry(varer, hjemme)` gir `{ toBuy, atHome }`, rekkefølgen beholdes. `ShoppingItem` har nå `name` og `nameKey`.
- Tjeneste `addPantryItem` (trimmer og samler mellomrom; tomt gir `name_required`, over 60 tegn `name_too_long`; samme navn to ganger gir den som finnes), `removePantryItem` (ukjent id gir `not_found`), `listPantry` (sortert på navn).
- Server Actions `addToPantry(name)` og `removeFromPantry(id)` validerer på nytt med zod/typesjekk og gir norske meldinger, `field: "name"` for feil under feltet.
- UI på `/handleliste`: knappen «Har hjemme» (tekstknapp, skjermlesernavn «Har hjemme: <vare>») på hver vare, utenfor avkrysningsetiketten så den ikke krysser av. Egen seksjon «Har hjemme» med forklaring, felt «Legg til noe du har hjemme» + «Legg til», statuslinje «N varer er skjult fordi du har dem hjemme.», og «Legg tilbake» per oppføring. Statusmeldinger i `aria-live`.
- «Kopier listen» og varetellingen gjelder bare det som må kjøpes.
- Uten handlingene i props vises hverken knapper eller seksjon (komponenten kan brukes uten database).

## Matrise
| Tilfelle | Utfall |
|---|---|
| Egg hjemme, Pannekaker valgt | «3 egg» skjult, «1 vare er skjult …» |
| «Har hjemme» på «4 dl melk» | melk skjules, oppføring «melk» vises, melding |
| Samme navn to ganger («Salt», «  SALT ») | én oppføring |
| Tomt eller 61 tegn | melding under feltet, ingenting lagres |
| «Legg tilbake» | varen vises igjen på listen |
| Feil fra server (kaster) | generell melding, oppføring beholdes, logges |
| Siden lastes på nytt | «Har hjemme» er husket, utvalg av oppskrifter er det ikke |

## Verifisering
lint, typecheck, format:check og build grønne; 89 filer og 2458 tester; 16 e2e grønne i skymiljøet (handlelistetesten dekker nå skjuling, husking etter reload og «Legg tilbake»). Skjermbilde på 360 px sett: knappene står til høyre på raden, seksjonen under listen.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- `client.test.ts` simulerer ny kjøring av migrasjoner og må droppe `pantry_items` også; rettet.
- `drizzle/meta`-filene må kjøres gjennom Prettier for at `format:check` skal bli grønn; gjort.
- Knappen ligger utenfor `<label>` i `CheckRow` (ny `action`-slot), ellers ville klikket også krysset av raden.
- Rekkefølgen i «Har hjemme» er sortert på nøkkelen i databasen, og på norsk `localeCompare` etter en lokal tilføyelse; kan avvike for tegn utenfor a–z til siden lastes på nytt. Akseptert.
- Utsatt: matche beslektede navn («mel»/«hvetemel»), vise hva som er skjult og la brukeren hente det frem, forslag til vanlige basisvarer, mengder hjemme.
