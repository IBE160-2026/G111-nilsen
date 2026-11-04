# Product Brief: RecipeMate

## Executive Summary

RecipeMate er en digital matlagingsassistent for oppskrifter som allerede finnes på nettet. Brukeren limer inn en lenke til en oppskrift. RecipeMate henter oppskriften og viser ingredienser og fremgangsmåte i et fast, oversiktlig format. Formatet er det samme uansett hvilken nettside oppskriften kommer fra.

Brukeren velger hvor mange personer maten skal lages til, og ingrediensmengdene regnes om automatisk. RecipeMate kommer også med konkrete forslag til ingredienser eller endringer som kan forbedre smaken eller resultatet. Forslagene er knyttet til den aktuelle oppskriften, og brukeren velger selv om de vil bruke dem.

Oppskriftene kan lagres, sorteres i egne mapper og markeres som favoritter. Det gjør det enkelt å finne dem igjen. Med RecipeMate kan brukeren gå fra en lenke til en tilpasset og lagret oppskrift på ett sted, uten å regne om mengder for hånd eller holde orden på lenker selv.

## The Problem

Mange som lager mat hjemme bruker oppskrifter fra ulike nettsider. Det gir flere vanlige frustrasjoner:

- **Ulik oppbygging:** Oppskrifter fra ulike nettsider er satt opp på forskjellige måter. Brukeren må finne frem til ingrediensene og fremgangsmåten på nytt hver gang.
- **Feil antall porsjoner:** Oppskriften er laget for et annet antall personer enn brukeren trenger. Da må mengdene regnes om for hånd, noe som tar tid og lett gir feil.
- **Usikkerhet om forbedringer:** Brukeren kan lure på om retten kunne blitt bedre, for eksempel med et ekstra krydder eller en annen fremgangsmåte, men vet ikke hva som passer til akkurat denne oppskriften.
- **Oppskrifter blir borte:** Gode oppskrifter lagres som bokmerker, skjermbilder eller åpne faner, eller de glemmes. Det er vanskelig å finne igjen det man likte.

I dag løser brukerne dette med hoderegning, bokmerker, notater og egne søk etter tips. Resultatet er ekstra tid og friksjon, og oppskrifter som ikke blir brukt igjen.

## The Solution

RecipeMate samler hele oppskriftsflyten på ett sted:

1. **Importer:** Brukeren limer inn en lenke, og RecipeMate henter oppskriften.
2. **Les:** Oppskriften vises i et fast format, med ingredienser og fremgangsmåte tydelig adskilt.
3. **Tilpass:** Brukeren velger antall personer, og alle ingrediensmengder justeres automatisk.
4. **Få forslag:** RecipeMate kommer med konkrete forslag til ingredienser eller endringer som kan forbedre smaken eller resultatet. Brukeren velger selv hvilke forslag de vil bruke.
5. **Ta vare på:** Brukeren lagrer oppskriften, legger den i egne mapper og kan markere den som favoritt.

Opplevelsen skal føles enkel: fra lenke til en oppskrift man kan bruke, på kort tid.

## What Makes This Different

- **Bygger på oppskrifter brukeren allerede har funnet:** RecipeMate lager ikke nye oppskrifter. Den gjør eksisterende oppskrifter enklere å bruke og tilpasse.
- **Forslag knyttet til oppskriften:** Forslagene gjelder den konkrete retten brukeren ser på, ikke generelle matlagingstips.
- **Alt i én flyt:** Import, visning, skalering, forslag og organisering henger sammen i én løsning, i stedet for å være spredt på flere verktøy.

Produktets viktigste forskjell i MVP-en er kombinasjonen av import, automatisk skalering, oppskriftsknyttede forbedringsforslag og organisering i én samlet flyt.

Konkurrentlandskapet er kartlagt i `_bmad-output/planning-artifacts/research-og-avklaringer.md`. Etablerte apper som Paprika, AnyList, Recipe Keeper og Samsung Food har allerede import fra nettsider og i hovedsak skalering, så disse funksjonene alene skiller ikke RecipeMate ut. Det som skiller er forslag som er knyttet til den konkrete oppskriften, i en enkel flyt på norsk. Mela bruker maskinlæring bare som reserve når vanlig import feiler, og RecipeMate følger samme prinsipp for KI i importen (se «Hvis tid»).

## Who This Serves

**Primærbrukere:** Hjemmekokker som bruker oppskrifter fra nettet og ofte må tilpasse dem, for eksempel når de lager mat til et annet antall personer enn oppskriften er laget for. De ønsker en rask og ryddig måte å bruke oppskrifter på og er åpne for tips som kan gjøre retten bedre. For dem er det en suksess når de kan gå fra lenke til tilpasset oppskrift uten å regne selv, og finne oppskriften igjen neste gang.

**Typisk bruker:** En student som lager mat til seg selv og noen få andre, og som ofte må tilpasse porsjonene fordi oppskriften er laget for et annet antall. Brukeren bruker mobil eller nettbrett på kjøkkenbenken og har liten erfaring med å justere krydder og smak på egen hånd.

**Sekundærbrukere:** Ingen definert sekundærmålgruppe for MVP.

## Success Criteria

MVP-en vurderes gjennom en enkel brukertest. Hver testbruker får de samme oppgavene, og vi registrerer om oppgaven blir fullført uten hjelp.

Antall testbrukere: 5.
Oppskriftslenker i testen: de samme fem lenkene til alle testbrukere. Sidene lagres som testdata i `test/fixtures/`, slik at testene ikke avhenger av at nettsidene er uendret.

| # | Oppgave | Kriterium for at MVP-en fungerer |
|---|---------|----------------------------------|
| 1 | Importere en oppskrift via lenke | Oppskriften vises med ingredienser og fremgangsmåte, og brukeren klarer oppgaven uten hjelp. |
| 2 | Skalere oppskriften til et annet antall personer | Mengdene blir regnet riktig om, og brukeren klarer oppgaven uten hjelp. |
| 3 | Bruke et forbedringsforslag | Oppskriften får minst ett konkret forslag, og brukeren finner og forstår forslaget uten hjelp. |
| 4 | Lagre oppskriften i en mappe og markere den som favoritt | Brukeren klarer oppgaven uten hjelp. |
| 5 | Finne igjen en lagret oppskrift | Brukeren finner oppskriften via mapper eller favoritter uten hjelp. |

**Mål:** Minst 80 % av testbrukerne fullfører hver av de fem oppgavene uten hjelp.

I tillegg kan testbrukerne svare på om de synes forslagene var relevante for oppskriften (ja/nei). Svarene brukes som tilbakemelding, ikke som et krav til MVP-en.

## Scope

**Med i første versjon (MVP)**
- Importere en oppskrift via lenke
- Vise oppskriften på en oversiktlig måte
- Skalere oppskriften til ønsket antall personer
- Få forslag til ingredienser eller endringer som kan forbedre smaken eller resultatet
- Lagre oppskrifter
- Organisere oppskrifter i mapper
- Markere oppskrifter som favoritter

**Ikke med i første versjon**
- Ingredienssubstitusjoner
- Automatisk handleliste
- Egne notater på oppskrifter
- Søk og filtrering
- Kostholdspreferanser og allergier
- Tidsplan for matlaging
- Import av oppskrifter fra bilder
- Ukemenyer

**Avklaringer for MVP-en**
- **Konto:** Ingen konto og ingen innlogging i første versjon. Oppskrifter lagres lokalt i appen (SQLite). Det gir enklere kjøring for sensor og færre personopplysninger. Konto er en mulig utvidelse.
- **Støttede sider og språk:** Sider som har strukturerte oppskriftsdata (schema.org `Recipe`), med norsk og engelsk innhold. Importen testes mot et utvalg norske og engelske sider som lagres som testdata.
- **Når import feiler:** Appen viser en tydelig feilmelding på norsk med årsak (ugyldig lenke, siden kunne ikke hentes, ingen oppskriftsdata funnet). Brukeren kan da legge inn oppskriften manuelt.
- **Mangelfulle data:** Oppgir siden ikke antall porsjoner, spør appen brukeren hva oppskriften er laget for. Ingredienslinjer som ikke kan tolkes (for eksempel uten mengde eller navn) vises uendret og skaleres ikke, i stedet for å gi feil tall.
- **Opphavsrett:** Appen viser alltid kilde og lenke til originalen og lagrer ikke bilder fra andre sider. Oppskriftene er til personlig bruk.

## Skalering

Skalering er appens viktigste regel. Mengden multipliseres med nytt antall personer delt på opprinnelig antall.

- Enheten beholdes. Det gjøres ingen automatisk konvertering mellom enheter i første versjon.
- Brøker vises som ½, ¼, ¾, ⅓ og ⅔ når verdien ligger innenfor ca. 5 % av en av dem. Ellers vises desimaltall med komma og maks én desimal.
- Udelelige ingredienser (egg, løk, hvitløksfedd, stk) rundes til nærmeste hele tall, minst 1, og merkes «ca.».
- Mengder i gram og milliliter over 100 avrundes til to gjeldende sifre.
- Tekst uten tall («en klype», «etter smak») endres ikke.
- Mengdeområder («2–3 ss») skaleres i begge ender.
- Norsk desimalkomma og brøktegn (0,5 / ½ / 1/2) forstås ved lesing.

| # | Original (for 4) | Til | Forventet resultat | Tester |
|---|---|---|---|---|
| 1 | 400 g mel | 6 | 600 g mel | Enkel multiplikasjon |
| 2 | ½ ts salt | 6 | ¾ ts salt | Brøk inn og ut |
| 3 | 1 ½ dl fløte | 2 | ¾ dl fløte | Blandet tall nedover |
| 4 | 0,5 dl olje | 8 | 1 dl olje | Desimalkomma |
| 5 | 1 egg | 3 | 1 egg (ca.) | 0,75 rundes til 1 |
| 6 | 2 egg | 3 | 2 egg (ca.) | 1,5 rundes opp til 2 |
| 7 | 2–3 ss sukker | 8 | 4–6 ss sukker | Mengdeområde |
| 8 | en klype salt | 8 | en klype salt | Ingen tall, uendret |
| 9 | 1 fedd hvitløk | 2 | 1 fedd hvitløk (ca.) | 0,5 rundes til 1, minst 1 |
| 10 | 750 g potet | 3 | 560 g potet | Avrunding av store tall (562,5 → 560) |

## Teknisk retning

- Webapp med Next.js og TypeScript, og SQLite som lokal database. Valget gjør at sensor kan kjøre appen med `npm install` og `npm run dev` uten egen databaseserver.
- Import, skalering og lagring virker uten nøkler. Forbedringsforslag ligger bak et eget grensesnitt med to implementasjoner: en mock med lagrede eksempelsvar (standard) og en ekte språkmodell som aktiveres med nøkkel i `.env`. `.env.example` følger med uten ekte hemmeligheter.
- Testing: enhetstester for skalering og ingrediensparsing, integrasjonstester for import fra lagrede sider, og ett til to ende-til-ende-tester for kjerneflyten.
- Oppskriftssider som brukes som testdata lagres i `test/fixtures/`.

## Hvis tid

Prioritert rekkefølge for utvidelser etter at MVP-en er ferdig og stabil:

1. Søk og filtrering av lagrede oppskrifter.
2. KI som reserve for import fra sider uten strukturerte oppskriftsdata.
3. Ingredienssubstitusjoner.

## Vision

På to til tre års sikt skal RecipeMate være det faste stedet brukeren samler og bruker oppskriftene sine, uansett hvor de kommer fra. Samlingen skal gradvis bli brukerens egen kokebok: oppskrifter som er tilpasset husholdningen, justert etter smak og lette å finne igjen.

RecipeMate skal også hjelpe mer enn med én oppskrift om gangen. Løsningen skal støtte brukeren i planleggingen og i selve matlagingen, med forslag som tar hensyn til brukerens behov og preferanser. Ambisjonen er at brukeren skal bruke mindre tid på praktiske detaljer og få mer ut av oppskriftene de allerede liker.

Mulige utvidelser er blant annet ingredienssubstitusjoner, handleliste, notater, søk, kostholdspreferanser og allergier, tidsplan for matlaging, import fra bilder og ukemenyer. De første utvidelsene er søk og filtrering, KI som reserve for import og ingredienssubstitusjoner (se «Hvis tid»). Rekkefølgen på resten er ikke bestemt og avgjøres etter MVP-en.
