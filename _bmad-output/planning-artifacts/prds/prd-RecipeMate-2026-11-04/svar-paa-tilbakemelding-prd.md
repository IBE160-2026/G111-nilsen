# Svar på tilbakemeldingen på PRD-en

| | |
|---|---|
| **Gruppe** | G111 – G111-nilsen |
| **Tilbakemelding** | `tilbakemelding-prd.md`, 2026-11-12 (formativ) |
| **Revidert PRD** | `prd.md`, oppdatert 2026-11-12 |

Dette dokumentet sier hva jeg har endret i PRD-en etter tilbakemeldingen fra faglærer, hva jeg har latt være, og svarer på refleksjonsspørsmålene. Tilbakemeldingen selv er ikke endret.

## 1. Endringer, punkt for punkt

### 4.1 FR-19–FR-39 kunne ikke bli testtilfeller (høy)
Rettet. FR-19–FR-26 har nå «Konsekvenser (testbare)» på samme form som FR-1–FR-18, to til fire per krav. Alle krav i Epic 6 som er bygget (FR-28–FR-38 og nye FR-43), har fått det samme.

For FR-22 står de faste kjøkkenverdiene nå i PRD-en i stedet for «m.fl.»: gram per dl for 15 varegrupper (mel 60, sukker 85, smør 90, melk og vann 100, honning 140, havregryn 35, ris 85 og så videre), og 1 cup = 2,4 dl, 1 oz = 28 g, 1 lb = 450 g. Konsekvensene er de faglærer foreslo, blant annet «1 dl ukjent vare vises uendret».

### 4.2 Scope hadde vokst uten avgrensning (høy)
Rettet, og det er den største endringen.

- Ny **§4.0 Oversikt over krav**: en tabell med alle krav FR-1–FR-43, hvilken paragraf de står i, og status **Bygget**, **Kandidat** eller **Ikke nå**. Det gjør det også mulig å se at listen er komplett, som var et av de mekaniske funnene.
- **§4.7 er delt i tre.** Bygget: FR-28–FR-38 og FR-43. Kandidat, i rekkefølge: FR-41 offentlig lenke, FR-39 glemt passord, FR-42 delt handleliste. Ikke nå: FR-40 stemmestyring.
- To krav ble splittet, fordi halve krav var bygget og halve ikke: FR-32 er nå tidtakeren (bygget) og FR-40 stemmestyringen (ikke nå). FR-38 er deling av samlingen (bygget), mens offentlig lenke (FR-41) og delt handleliste (FR-42) er egne kandidater.
- **§6 er rettet.** Den sa «ingen deling, kommentarer eller vurderinger» samtidig som begge deler var bygget. Den sier nå hva som faktisk gjelder: ingen kommentarer, ingen offentlige profiler, ingen fremmede. Deling er begrenset til én konto jeg selv inviterer, og gir bare lesing. Vurdering er privat og vises ikke engang i en delt samling.
- **§7.2 «hvis tid»** er oppdatert: søk og filtrering er levert (FR-20), KI som reserve for import og ingredienssubstitusjoner er fortsatt ikke bygget og står bak kandidatene i §4.7.
- Jeg fant en motsigelse til selv, i §2.2: den sa at folk som vil «lage egne oppskrifter fra bunnen av» ikke er målgruppen, mens manuell innlegging (FR-4) har vært med siden v1. Den er rettet.

### 4.3 FR-7 og FR-19 motsa hverandre (medium)
Rettet. FR-7 sier nå «fra 0,5 til 50 i steg på 0,5», og at antallet oppskriften er skrevet for fortsatt er et heltall 1–50. FR-19 beskriver bare grensesnittet (pluss en halv, felt, glidebryter) og viser til FR-7 for reglene.

FR-8-tabellen har fått fem nye rader, blant annet de faglærer etterlyste:

| # | Ingredienslinje | Valgt | Forventet |
|---|---|---|---|
| 11 | 1 egg | 0,5 | 1 egg (ca.) |
| 12 | 400 g mel | 2,5 | 250 g mel |
| 13 | 2 løk | 6 | 3 løk |
| 14 | 1 boks tomater | 6 | 2 boks tomater (ca.) |
| 15 | 3 stk gulrot | 2 | 2 stk gulrot (ca.) |

De dobbelte beskrivelsene i FR-11 og FR-12 («Fra versjon 2 …») er fjernet; de viser nå bare til FR-25 og FR-26, så kravet står ett sted.

### 4.4 Språkmodellen manglet grenser (medium)
Rettet. Nytt **NFR-8** med grensene som allerede fantes i koden, men ikke i PRD-en: tidsavbrudd 20 sekunder, maks 10 kall per minutt per app-prosess, oppskriften kuttes ved 8000 tegn, svaret begrenses til 700 tokens, og standardmodellen er det billigste nivået (`claude-haiku-5-5`). Over grensen får brukeren den samme norske meldingen som ved andre feil.

Her fant jeg én ting jeg trodde var sann, men ikke var det: jeg hadde skrevet i PRD-en at appen faller tilbake til de regelbaserte forslagene (FR-25) når grensen er nådd. Da jeg kontrollerte det mot koden, viste det seg at den gir en feilmelding i stedet. Jeg rettet PRD-en til det appen faktisk gjør, og lot koden være. At den heller burde falt tilbake til de enkle forslagene, er notert som et mulig forbedringspunkt, ikke smuglet inn som et krav.

FR-10 har fått den testbare konsekvensen faglærer foreslo: et forslag må ha `text` (1–300 tegn), `reason` (1–400 tegn) og `appliesTo` lik `ingredients`, `steps` eller `recipe`; alt annet avvises.

Åpent spørsmål §9 punkt 2 er lukket: leverandør er Anthropic, og kostnaden i testing er null, fordi alle automatiske tester og ende-til-ende-tester kjører uten nøkkel mot lagrede svar. Funksjonen testes mot ekte modell bare manuelt.

Jeg la også til **NFR-9**, som sier hva appen lagrer i nettleseren (bare den sist sette handlelisten, slettet ved utlogging) og hva service workeren aldri lagrer. Det kom med PWA-arbeidet og hørte hjemme i PRD-en.

### 4.5 «Udelelig ingrediens» var ikke spesifisert (medium)
Rettet. Begrepet i §3 sier nå den faktiske regelen, som er basert på enheten og ikke på en liste med ingrediensnavn: linjer **uten enhet** («2 løk», «1 egg») og linjer med enhetene `stk`, `fedd`, `boks`, `pk`, `pose`, `bunt`, `skive`, `glass`, `beger`, `neve`, `klype` (engelsk `can`, `pinch`) er udelelige. FR-8 regel 3 viser til den, og radene 13–15 i tabellen dekker «2 løk», «1 boks tomater» og «3 stk gulrot».

### 5 Mekaniske funn
- **Glossar:** lagt til Konto, Merkelapp, Vurdering, Notat, Kokemodus, Handleliste, Har hjemme, Ukemeny, Enkle forslag og Delt samling. «Samling» sier nå at fanen heter «Oppskrifter», og at det er det samme.
- **IDer:** løst med oversikten i §4.0 i stedet for å flytte FR-17 og FR-18, så ingen ID-er bytter plass for stories, tester og commits som allerede viser til dem.
- **Utdatert:** §0 sier nå at dokumentet dekker v1, versjon 2 og Epic 6. Frontmatter er endret fra `draft` til `active`.
- **SM for v2:** faglærer sa dette kunne vente, men jeg la til tre: SM-8 (handleliste for en uke, brukt i butikken), SM-9 (alle automatiske tester grønne, og appen virker uten nøkkel) og SM-10 (installere på telefon og bruke handlelisten uten nett). SM-10 er ikke gjennomført ennå og er merket slik.

## 2. Dette har jeg ikke gjort

- **Ingen nye konsekvenser for kandidatene.** FR-39, FR-41 og FR-42 står med én linje hver, slik faglærer foreslo. De får konsekvenser og spec når de prioriteres.
- **Brukerreisene (UJ-1–UJ-3) er ikke utvidet** til versjon 2 og Epic 6. De beskriver fortsatt kjernen, som ikke er endret. Hvis tiden holder, legger jeg til én reise for ukemeny og handleliste, siden det er den nye flyten som har flest steg.
- **§9 punkt 3 om opphavsrett** er fortsatt åpent, og jeg spør faglærer. Det påvirker ikke arkitekturen, men må avklares før innlevering.

## 3. Refleksjonsspørsmål

### «§4.7 er skrevet som "Ønsker fra Maja". Hvordan avgjorde dere hvilke ønsker som er krav, og hva ville dere kuttet først hvis tiden ble kort?»

Jeg skrev først ønskene ned i den rekkefølgen jeg kom på dem, uten å skille mellom «skal» og «kanskje». Det er nettopp det tilbakemeldingen fanget opp: i PRD-en så alle 12 like forpliktende ut.

Etter tilbakemeldingen brukte jeg to spørsmål på hvert ønske. Det første: endrer det hvordan jeg faktisk bruker appen på kjøkkenet? Tidtakeren i kokemodus gjør det, for jeg slipper å ta på telefonen med deigklissete hender. Stemmestyring ville løst det samme problemet, men dårligere og mindre pålitelig. Det andre: kan jeg teste det automatisk? Stemmestyring kan jeg ikke, og da blir det et krav jeg ikke kan vise at virker.

Rekkefølgen min på det som er igjen, er offentlig lenke, glemt passord og delt handleliste. Offentlig lenke først fordi det er den minste av dem og løser noe konkret: å sende en oppskrift til noen som ikke har konto. Glemt passord må med før appen kan brukes av andre enn meg, men ikke før. Delt handleliste er størst, fordi to personer skal krysse av i den samme listen samtidig, og det er lett å gjøre halvveis.

Kuttlisten er altså allerede skrevet, og den står i §4.0: kandidatene ryker først, i motsatt rekkefølge. Stemmestyring er allerede kuttet. Blir tiden veldig kort, kutter jeg også designrunden til det minste som holder (kontrast og mobilbredde), fordi den kan gjøres i små biter, mens en halvferdig delt handleliste ikke kan leveres.

### «Når KI hjalp dere med FR-19–FR-26, hvordan kontrollerte dere at reglene (f.eks. "faste kjøkkenverdier" for dl til gram) er riktige, og hvor står fasiten?»

Her må jeg skille mellom to slags regler.

**Tall jeg kan kontrollere mot virkeligheten.** Kjøkkenverdiene for dl til gram er slike. Jeg sammenlignet dem med målene på emballasje og med tabellene i kokeboka hjemme, og rundet til hele, runde tall. Derfor viser appen alltid «ca.» når den regner mellom dl og gram: verdiene er omtrentlige, og mel pakker seg ulikt alt etter om det er silt eller ikke. Fasiten lå tidligere bare i koden (`src/domain/convert-units.ts`) og i testene. Det var svakheten faglærer peker på, og nå står alle 15 verdiene i FR-22, så koden kan måles mot PRD-en og ikke bare mot seg selv.

**Regler som bare kan være konsekvente.** Skalering er slik: det finnes ingen fasit utenfor appen for hva «1 egg» til 0,5 porsjon skal bli. Her er fasiten eksemplene i FR-8. De er skrevet i PRD-en først og er automatiske tester (NFR-2). De fem nye radene kontrollerte jeg ikke ved å regne i hodet, men ved å kjøre dem gjennom appens egne funksjoner og skrive ned det som faktisk kom ut. Det avdekket noe jeg ellers ville skrevet feil: appen gir «2 boks tomater», ikke «2 bokser tomater», fordi enheten gjentas slik den står. Det står nå som en antakelse i §10 i stedet for å bli pyntet på i dokumentet.

Den generelle regelen jeg jobber etter, er at KI gjerne får foreslå en regel, men at en regel ikke er et krav før jeg enten kan kontrollere den mot noe utenfor appen, eller har skrevet eksempler med fasit som en test kan feile på. FR-35 er et eksempel på at det virker: KI foreslo først at «Har hjemme»-treff kunne gjøres som delstreng-søk, men da ville «ris» ha truffet «paprika». Det ble endret til hele ord, og eksempelet står nå som en konsekvens under FR-35.
