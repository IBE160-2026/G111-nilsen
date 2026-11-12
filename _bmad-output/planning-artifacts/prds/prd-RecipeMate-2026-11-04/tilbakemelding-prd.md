# Tilbakemelding på PRD

| | |
|---|---|
| **Gruppe** | G111 – G111-nilsen |
| **PRD vurdert** | `_bmad-output/planning-artifacts/prds/prd-RecipeMate-2026-11-04/prd.md` (status `draft`, sist endret 2026-11-11, commit 81e2d47) |
| **Dato** | 2026-11-12 |
| **Type** | Formativ tilbakemelding, ikke karakter |

## 1. Samlet inntrykk

Kjernen i PRD-en (FR-1–FR-18) er godt arbeid: tydelig tese, brukerreiser med kanttilfeller, testbare konsekvenser og en skaleringstabell med fasit. Risikoen ligger i det som er lagt til etter 4. november. §4.6 og §4.7 har vokst til FR-39, og de siste kravene er stikkord uten testbare konsekvenser. Noen steder motsier de også resten av dokumentet.

## 2. Dette fungerer godt

- **Skaleringsreglene i FR-8.** Seks nummererte regler og ti eksempler med fasit (f.eks. «750 g potet, valgt 3 → 560 g potet») kan bli enhetstester direkte. Jeg regnet gjennom tabellen, og alle ti stemmer med reglene.
- **Ærlighet om feil og usikkerhet.** FR-2 og FR-10 beskriver hva som skjer når import eller språkmodell feiler. «Appen skal heller vise en feilmelding enn å vise feil data» (§4.1) er en tydelig beslutning, og SM-C1 gir den en motvekt i målene.
- **KI-kontroll og testmodus.** FR-12/NFR-1 (alt virker uten nøkkel), NFR-2 (lagrede testsider og eksempelsvar) og «Forslag endrer aldri ingredienslinjene» (§4.4) viser at dere har tenkt på kontrollerbarhet. Brukerreisene UJ-1–UJ-3 har navngitte brukere med kanttilfeller som peker til FR-3 og FR-2.

## 3. Oversikt per dimensjon

| Dimensjon | Vurdering | Kort begrunnelse |
|---|---|---|
| Beslutningsklarhet | god | Ikke-mål, avgjort spørsmål (§9 pkt. 4) og avvist alternativ i addendum er synlige. Åpne spørsmål §9 pkt. 1–2 er ikke oppdatert. |
| Substans | god | Innholdet er produktspesifikt (norske kilder, kjøkkenbenk, «ca.»-regel). Ingen pynte-personas. |
| Strategisk sammenheng | god | V1 har en klar tese. Epic 6 (ukemeny, deling, stemmestyring) trekker bort fra den. |
| Testbarhet | god | FR-1–FR-18 er sterke. FR-19–FR-26 mangler konsekvenser, og FR-28–FR-39 er enlinjere. |
| Scope og avgrensning | svak | 16 FR har vokst til 39, og §6/§7 er ikke oppdatert (se 4.2). |
| Brukbarhet for neste fase | god | IDer er unike, antakelser er indeksert. Nye begreper mangler i glossaret. |
| Formtilpasning | god | Forbrukerapp med brukerreiser. Passer. |

## 4. Viktigste forbedringer

### 4.1 FR-19–FR-39 kan ikke bli testtilfeller
- **Alvorlighet:** høy
- **Hvor:** §4.6 og §4.7, f.eks. FR-22 «vanlige varer (mel, sukker, smør, melk m.fl.) regnes mellom dl og gram med faste kjøkkenverdier» og FR-35 «"Hva kan jeg lage?" ut fra "Har hjemme"»
- **Problem og hvorfor det betyr noe:** FR-1–FR-18 har «Konsekvenser (testbare)», men bare FR-27 har det blant de nye. FR-19–FR-26 henviser til specer utenfor PRD-en, og FR-28–FR-39 er én linje hver. Epics, stories og tester får da ingen fasit i PRD-en. «Faste kjøkkenverdier» er ikke oppgitt, og det er uklart hva «m.fl.» omfatter.
- **Forslag:** Gi hvert FR som bygges to–tre konsekvenser, for eksempel for FR-22: «1 dl mel → 60 g mel (ca.)», «1 dl melk → 100 g melk (ca.)», «1 dl ukjent vare → vises uendret, ikke omregnet». FR-28–FR-39 kan stå som kandidater uten konsekvenser frem til de prioriteres (se 4.2).

### 4.2 Scope har vokst uten at avgrensningen er fulgt opp
- **Alvorlighet:** høy
- **Hvor:** §6 «ingen deling, kommentarer eller vurderinger» mot FR-38 «Deling» og FR-34 «egen vurdering». Dessuten §7.2 «Hvis tid: 1) søk og filtrering», som er levert som FR-20.
- **Problem og hvorfor det betyr noe:** PRD-en sier både at appen ikke har deling og at den skal ha deling. Ikke-mål er det neste steg bruker til å si nei, så motsigelsen gjør arkitektur og epics usikre. Epic 6 har 12 krav uten tester, og det er uklart hva som er forpliktet og hva som er ønsker.
- **Forslag:** Skill mellom «Forpliktet», «Hvis tid» og «Ikke nå». Eksempel: «FR-28–FR-30 er forpliktet. FR-31–FR-39 er kandidater og lages ikke før FR-28–FR-30 er testet.» Oppdater §6 slik at den stemmer: «Ingen sosiale funksjoner. Deling begrenset til husstand og skrivebeskyttet lenke (FR-38, kandidat).» Oppdater også «Hvis tid»-listen.

### 4.3 FR-7 og FR-19 motsier hverandre
- **Alvorlighet:** medium
- **Hvor:** FR-7 «heltall fra 1 til 50 … Verdier … som ikke er heltall avvises» mot FR-19 «hele og halve tall fra 0,5 til 50»
- **Problem og hvorfor det betyr noe:** Samme valg har to regler. En tester vet ikke om 2,5 skal avvises eller godtas. FR-8 viser heller ikke hvordan halve porsjoner skaleres (f.eks. «1 egg» ved 0,5).
- **Forslag:** Skriv FR-7 om til «fra 0,5 til 50 i steg på 0,5» og legg to rader i FR-8-tabellen, for eksempel «1 egg, valgt 0,5 → 1 egg (ca.)» og «400 g mel, valgt 2,5 → 250 g mel». Gjør det samme med enkeltstående «Fra versjon 2»-setninger i FR-11 og FR-12: slå dem sammen med FR-25/FR-26 så kravet står ett sted.

### 4.4 Språkmodellen: valg, kostnad og grenser står ikke som krav
- **Alvorlighet:** medium
- **Hvor:** §9 pkt. 2 «Hvilken språkmodell og leverandør brukes, og hva koster den i testing?», NFR-3 (tidsavbrudd gjelder bare henting av kilde), FR-10
- **Problem og hvorfor det betyr noe:** Spørsmålet er fortsatt åpent selv om funksjonen er bygget. Det finnes ingen grense for antall kall, svarstørrelse eller kostnad, og ingen krav til hva som skjer ved tidsavbrudd i forslagskallet. Kvaliteten på forslagene (relevante, trygge, ikke hallusinerte) er ikke testbar annet enn av SM-7.
- **Forslag:** Lukk punktet og legg til NFR: «Forslagskallet avbrytes etter N sekunder. Maks 1 kall per oppskrift per minutt. Svar over N tegn avvises. Kallene bruker det billigste modellnivået.» Legg til et testbart krav i FR-10: «Et svar med feltet `gjelder` utenfor ingrediens/steg/rett avvises».

### 4.5 Regelen for «udelelig ingrediens» er ikke spesifisert
- **Alvorlighet:** medium
- **Hvor:** §3 «Udelelig ingrediens — … (f.eks. egg, løk, hvitløksfedd, stk)» og FR-8 regel 3
- **Problem og hvorfor det betyr noe:** Rundingsregelen er viktig, men PRD-en sier ikke hvordan appen avgjør hva som er udelelig. Det er bare «1 egg» uten enhet som er testet. Hva med «2 løk», «1 boks tomater» eller «3 stk gulrot»? Uten svar kan koden og testene bli ulike.
- **Forslag:** Definer regelen: «Udelelig er linjer med enhet `stk` eller `fedd`, og linjer uten enhet der ingrediensnavnet står på en liste (egg, løk, gulrot, …).» Legg til to–tre rader i tabellen, for eksempel «1 boks tomater, valgt 6 → 2 bokser tomater (ca.)».

## 5. Mekaniske funn

- **Glossar:** «Oppskrifter» (FR-20, fanen), «Handleliste», «Har hjemme», «Kokemodus», «Konto», «Notat» og «Enkle forslag» er brukt i kravene, men står ikke i §3. «Samling» (§3) og «Oppskrifter» brukes om det samme.
- **IDer:** FR-17 og FR-18 står inne i §4.2 og §4.5 utenfor rekkefølge. Alle er unike, men det er vanskelig å se at FR-1–FR-39 er komplett.
- **Antakelser:** Alle seks `[ANTAKELSE]` i teksten er indeksert i §10, og indeksen stemmer.
- **Utdaterte deler:** SM-1–SM-7 og UJ-1–UJ-3 dekker bare v1. §9 pkt. 1 er trolig besvart av testsidene. §0 sier «v1», men dokumentet beskriver nå også v2 og Epic 6. Frontmatter har `status: draft`.

## 6. Før dere går videre

**Må avklares nå:**
- Hva er forpliktet i v2 og Epic 6 (4.2), og rett motsigelsen mellom §6 og FR-38.
- Konsekvenser for FR-19–FR-26 (4.1) og samkjøring av FR-7/FR-19 (4.3).
- Leverandør, grenser og kostnad for språkmodellen (4.4).

**Kan vente:**
- Glossarutvidelse, SM for v2 og FR-ordning.
- §9 pkt. 3 om opphavsrett (spørres faglærer). Det er viktig for innleveringen, men påvirker ikke arkitekturen.

**Oppfølging av briefen: ja.** De tre «MÅ AVKLARES»-punktene er lukket (ingen konto i v1, kilder med oppskriftsdata, feilhåndtering i FR-2). Skaleringseksempler med fasit finnes (FR-8), testdata ligger i `test/fixtures/`, mock er standard, og «hvis tid»-listen er prioritert. Eneste svakhet fra briefen som gjenstår er språkmodellen og kostnaden.

## 7. Refleksjonsspørsmål

- §4.7 er skrevet som «Ønsker fra Maja». Hvordan avgjorde dere hvilke ønsker som er krav, og hva ville dere kuttet først hvis tiden ble kort?
- Når KI hjalp dere med FR-19–FR-26, hvordan kontrollerte dere at reglene (f.eks. «faste kjøkkenverdier» for dl til gram) er riktige, og hvor står fasiten?

_Vurdert mot kvalitetsrubrikken i bmad-prd. Dette er veiledning, ikke sensur._
