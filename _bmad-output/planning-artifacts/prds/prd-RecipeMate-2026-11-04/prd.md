---
title: RecipeMate
status: draft
created: 2026-11-04
updated: 2026-11-04
---

# PRD: RecipeMate

## 0. Om dokumentet

Denne PRD-en beskriver hva første versjon (v1) av RecipeMate skal gjøre. Den bygger på `product-brief.md`, `_bmad-output/planning-artifacts/research-og-avklaringer.md` og tilbakemeldingen på briefen (`tilbakemelding-product-brief.md`), og er grunnlaget for UX, arkitektur, epics og stories. Begrepene i §3 brukes likt i alle senere dokumenter. Krav har faste ID-er (FR-n, NFR-n, UJ-n, SM-n) som stories, tester og commits kan vise til. Tekniske valg og begrunnelser står i `addendum.md`. Antakelser er merket `[ANTAKELSE]` og samlet i §10.

## 1. Visjon

RecipeMate gjør oppskrifter brukeren allerede har funnet på nettet enklere å bruke. Brukeren limer inn en lenke, og appen viser oppskriften i et fast og ryddig format, uansett hvilken side den kommer fra. Brukeren velger hvor mange personer maten skal lages til, og alle mengder regnes om automatisk etter faste, forutsigbare regler.

RecipeMate gir også konkrete forslag som kan gjøre akkurat denne retten bedre, og brukeren velger selv hva som tas i bruk. Oppskrifter lagres i mapper og som favoritter, slik at de er lette å finne igjen.

Målet er at veien fra lenke til en tilpasset, lagret oppskrift tar under et minutt, uten hoderegning og uten bokmerker spredt rundt.

## 2. Målgruppe

### 2.1 Jobber brukeren vil få gjort
- Lage en oppskrift fra nettet for et annet antall personer enn den er skrevet for, uten å regne selv.
- Lese oppskriften raskt på kjøkkenbenken, på mobil eller nettbrett, uten reklame og rot.
- Få et konkret tips som passer akkurat denne retten, og selv bestemme om det skal brukes.
- Finne igjen en oppskrift man likte, uten å lete i bokmerker, skjermbilder og faner.

### 2.2 Ikke målgruppe i v1
- Profesjonelle kjøkken og storhusholdning (store porsjoner, næringsberegning, kostnader).
- Brukere som vil lage egne oppskrifter fra bunnen av eller dele oppskrifter med andre.
- Brukere med behov for allergi- og kostholdsfiltrering.

### 2.3 Brukerreiser

- **UJ-1. Ida lager taco til fem i stedet for fire.**
  Ida (22) er student og lager middag til seg selv og noen venner, men antallet varierer. Hun har funnet en tacooppskrift på en norsk matside og åpner RecipeMate på mobilen. Hun limer inn lenken og trykker «Hent oppskrift». Oppskriften vises med ingredienser og steg i fast format, laget for 4 personer. Hun endrer antall til 5, og alle mengder oppdateres med en gang: «400 g kjøttdeig» blir «500 g kjøttdeig». Hun lagrer oppskriften i mappen «Hverdag» og markerer den som favoritt. **Kanttilfelle:** siden oppgir ikke antall porsjoner. RecipeMate spør da hvor mange oppskriften er laget for før den skalerer.

- **UJ-2. Tor tilpasser fiskesuppe til familien på fem og prøver et forslag.**
  Tor er forelder i en familie på fem og vil lage fiskesuppe fra en engelsk matblogg skrevet for 2 personer. Han importerer oppskriften, setter antall til 5 og ser at «1 egg» blir «3 egg (ca.)». Han ber om forslag og får tre korte tips knyttet til oppskriften, blant annet «Tilsett litt sitronsaft rett før servering for friskere smak». Han tar i bruk ett forslag og hopper over de andre. Det valgte forslaget vises merket i oppskriften og huskes når han lagrer den i mappen «Helg». **Kanttilfelle:** lenken er en oversiktsside med mange oppskrifter. RecipeMate sier at den ikke fant en oppskrift på siden og foreslår å lime inn lenken til selve oppskriften, eller å legge den inn manuelt.

- **UJ-3. Ida finner igjen favoritten en uke senere.**
  Ida åpner RecipeMate, går til «Favoritter» og finner tacooppskriften øverst. Hun åpner den og ser at den sist ble laget for 5 personer. Hun endrer til 3 og lager maten.

## 3. Begreper

- **Oppskrift** — En lagret eller importert rett med tittel, kilde, opprinnelig porsjonsantall, ingredienslinjer (eventuelt gruppert i ingrediensseksjoner) og steg.
- **Kilde** — Nettadressen (URL) og navnet på siden oppskriften er importert fra. Mangler ved manuell innlegging.
- **Import** — Å hente en oppskrift fra en kilde via oppskriftsdata.
- **Oppskriftsdata** — Strukturerte data av typen schema.org `Recipe` (JSON-LD) i HTML-en til en kilde.
- **Manuell innlegging** — Å lage en oppskrift ved å fylle ut et skjema i stedet for import.
- **Ingrediensseksjon** — En navngitt gruppe ingredienslinjer, for eksempel «Saus». En oppskrift har null eller flere.
- **Ingredienslinje** — Én linje i ingredienslisten. Består av mengde, enhet og ingrediensnavn når den er tolkbar, ellers bare originalteksten.
- **Tolkbar ingredienslinje** — En ingredienslinje der appen har funnet en mengde. Bare tolkbare ingredienslinjer skaleres.
- **Mengde** — Tallverdien i en ingredienslinje. Kan være et heltall, desimaltall, brøk, blandet tall eller et område (f.eks. 2–3).
- **Enhet** — Måleenheten i en ingredienslinje (f.eks. g, dl, ss, ts, stk). Kan mangle.
- **Udelelig ingrediens** — En ingrediens som telles i hele enheter (f.eks. egg, løk, hvitløksfedd, stk).
- **Opprinnelig porsjonsantall** — Hvor mange personer oppskriften er skrevet for.
- **Valgt porsjonsantall** — Hvor mange personer brukeren vil lage oppskriften til.
- **Skalering** — Omregning av mengder fra opprinnelig til valgt porsjonsantall.
- **Forslag** — Et konkret forbedringsforslag knyttet til én oppskrift, med en kort begrunnelse.
- **Valgt forslag** — Et forslag brukeren har tatt i bruk. Lagres på oppskriften.
- **Mappe** — En navngitt samling oppskrifter. En oppskrift ligger i null eller én mappe.
- **Favoritt** — Et merke på en oppskrift. Uavhengig av mappe.
- **Samling** — Alle lagrede oppskrifter.

## 4. Funksjoner

### 4.1 Import

**Beskrivelse:** Brukeren limer inn en lenke og starter import. Appen henter kilden, leser oppskriftsdata og viser oppskriften i fast format. Hvis import ikke er mulig, får brukeren en norsk feilmelding som sier hvorfor, og kan gå videre til manuell innlegging. Appen skal heller vise en feilmelding enn å vise feil data. Realiserer UJ-1 og UJ-2.

#### FR-1: Importere oppskrift fra lenke
Brukeren kan importere en oppskrift ved å lime inn en lenke til en kilde med oppskriftsdata. Realiserer UJ-1, UJ-2.

**Konsekvenser (testbare):**
- Fra en lagret testside med oppskriftsdata vises tittel, kilde (URL og sidenavn), opprinnelig porsjonsantall, alle ingredienslinjer (med ingrediensseksjoner der kilden har dem) og alle steg i riktig rekkefølge.
- Steg leses både når kilden har steg som liste og når den har én tekstblokk.
- Import virker for norske og engelske kilder.
- Bilder fra kilden lagres ikke.

#### FR-2: Feilmelding når import feiler
Brukeren får en feilmelding på norsk med årsak når import ikke er mulig, og tilbud om manuell innlegging.

**Konsekvenser (testbare):**
- Ugyldig lenke (ikke http/https eller feil format) gir meldingen om ugyldig lenke uten at noe hentes.
- Kilde som ikke svarer, svarer med feilkode eller bruker for lang tid (se NFR-3) gir meldingen om at siden ikke kunne hentes.
- Kilde uten oppskriftsdata, inkludert oversiktssider med mange oppskrifter, gir meldingen om at ingen oppskrift ble funnet.
- Appen krasjer ikke i noen av tilfellene, og brukeren kan prøve igjen eller velge manuell innlegging.

#### FR-3: Porsjonsantall som mangler eller er feil
Brukeren blir bedt om å oppgi opprinnelig porsjonsantall når kilden mangler det eller det ikke kan tolkes, og kan alltid endre det etterpå. Realiserer UJ-1 (kanttilfelle).

**Konsekvenser (testbare):**
- Når oppskriftsdata mangler porsjonsantall, ber appen om det før skalering er mulig.
- «4 porsjoner», «Serves 6», «4» og en liste som `["4", "4 porsjoner"]` tolkes som henholdsvis 4, 6, 4 og 4.
- Når brukeren endrer opprinnelig porsjonsantall, regnes alle mengder om fra den nye verdien.

#### FR-4: Manuell innlegging
Brukeren kan legge inn en oppskrift via et skjema med tittel, opprinnelig porsjonsantall, ingredienser (én per linje) og steg (én per linje).

**Konsekvenser (testbare):**
- En manuelt innlagt oppskrift tolkes, vises, skaleres og lagres på samme måte som en importert.
- Skjemaet kan ikke sendes uten tittel, porsjonsantall (heltall 1 eller høyere) og minst én ingredienslinje. Feltet med feil får en forklarende melding.

### 4.2 Visning av oppskrift

**Beskrivelse:** Alle oppskrifter vises i samme faste format, egnet for mobil og nettbrett på kjøkkenbenken. Realiserer UJ-1, UJ-2, UJ-3.

#### FR-5: Fast format
Brukeren ser oppskriften med tittel, kilde som klikkbar lenke til originalen, porsjonsvelger, ingredienser (gruppert per ingrediensseksjon) og nummererte steg.

**Konsekvenser (testbare):**
- Rekkefølgen er alltid: tittel, kilde, porsjonsvelger, ingredienser, steg, forslag.
- Kilden vises alltid for importerte oppskrifter.

#### FR-6: Ingredienslinjer som ikke kan tolkes
Ingredienslinjer som ikke er tolkbare vises med originalteksten og skaleres ikke.

**Konsekvenser (testbare):**
- «nutmeg», «salt og pepper» og «en klype salt» vises uendret ved alle porsjonsantall.
- Linjer med mengde men uten ingrediensnavn (f.eks. «2 ss») vises og skaleres som andre tolkbare linjer, og fjernes ikke.

### 4.3 Skalering

**Beskrivelse:** Brukeren velger antall personer, og alle tolkbare mengder regnes om med en gang. Skalering er appens viktigste regel og skal være forutsigbar og fullt testet. Realiserer UJ-1, UJ-2, UJ-3.

#### FR-7: Velge antall personer
Brukeren kan velge valgt porsjonsantall som et heltall fra 1 til 50 `[ANTAKELSE: øvre grense 50 holder for hjemmebruk]`, med knapper for pluss og minus og ved å skrive tallet.

**Konsekvenser (testbare):**
- Alle tolkbare mengder oppdateres uten å laste siden på nytt.
- Verdier under 1, over 50 eller som ikke er heltall avvises med en melding.
- Brukeren kan tilbakestille til opprinnelig porsjonsantall med én handling.

#### FR-8: Skaleringsregler
Mengder regnes om med faktoren valgt porsjonsantall delt på opprinnelig porsjonsantall, etter disse reglene:

1. Enheten beholdes. Det gjøres ingen konvertering mellom enheter.
2. Resultatet vises som ½, ¼, ¾, ⅓ eller ⅔ (eventuelt med heltall foran) når det ligger innenfor 5 % av en slik verdi. Ellers vises desimaltall med komma og maks én desimal.
3. Udelelige ingredienser rundes til nærmeste hele tall, minst 1, og merkes «ca.» når avrundingen endret verdien.
4. Mengder i g og ml over 100 avrundes til to gjeldende sifre.
5. Mengdeområder skaleres i begge ender.
6. Ingredienslinjer uten mengde endres ikke (FR-6).

**Konsekvenser (testbare):** Alle eksemplene under gir nøyaktig forventet resultat (opprinnelig porsjonsantall 4):

| # | Ingredienslinje | Valgt | Forventet |
|---|---|---|---|
| 1 | 400 g mel | 6 | 600 g mel |
| 2 | ½ ts salt | 6 | ¾ ts salt |
| 3 | 1 ½ dl fløte | 2 | ¾ dl fløte |
| 4 | 0,5 dl olje | 8 | 1 dl olje |
| 5 | 1 egg | 3 | 1 egg (ca.) |
| 6 | 2 egg | 3 | 2 egg (ca.) |
| 7 | 2–3 ss sukker | 8 | 4–6 ss sukker |
| 8 | en klype salt | 8 | en klype salt |
| 9 | 1 fedd hvitløk | 2 | 1 fedd hvitløk (ca.) |
| 10 | 750 g potet | 3 | 560 g potet |

#### FR-9: Tolking av mengder og enheter
Appen tolker mengder og enheter i norske og engelske ingredienslinjer.

**Konsekvenser (testbare):**
- Mengder: heltall, desimaltall med komma og punktum (0,5 / 0.5), brøk (1/2), brøktegn (½), blandet tall (1 ½, 1 1/2) og områder (2–3, 2-3).
- Enhet rett etter tallet uten mellomrom tolkes (750g, 2dl).
- Minst disse enhetene gjenkjennes: g, kg, ml, dl, l, ss, ts, krm, stk, fedd, pk, boks, never; og engelsk g, kg, ml, l, tbsp, tsp, cup, oz, lb `[ANTAKELSE: listen dekker testsidene; utvides ved behov]`.

### 4.4 Forbedringsforslag

**Beskrivelse:** Brukeren kan be om forslag til en oppskrift. Forslagene skal være konkrete for akkurat denne oppskriften, korte og på norsk. Brukeren tar i bruk eller hopper over hvert forslag. Forslag endrer aldri ingredienslinjene eller stegene. Funksjonen virker også uten nøkkel til språkmodell (se NFR-1). Realiserer UJ-2.

#### FR-10: Be om forslag
Brukeren kan be om forslag til en oppskrift og får 1–3 forslag, hvert med en kort begrunnelse.

**Konsekvenser (testbare):**
- Hvert forslag viser til minst én ingrediens eller ett steg i oppskriften, eller til retten som helhet.
- Forslagene er på norsk, også for engelske oppskrifter.
- Hvis forslag ikke kan hentes (feil fra språkmodell, tidsavbrudd, ugyldig svar), vises en norsk feilmelding, og resten av oppskriften virker som før.
- Et svar fra språkmodellen som ikke har riktig format, avvises i stedet for å vises.

#### FR-11: Ta i bruk forslag
Brukeren kan ta i bruk eller hoppe over hvert forslag. Valgte forslag lagres på oppskriften. Realiserer UJ-2.

**Konsekvenser (testbare):**
- Et valgt forslag vises merket i oppskriften og finnes fortsatt etter at oppskriften er lagret og åpnet igjen.
- Brukeren kan fjerne et valgt forslag.
- Ingredienslinjer og steg endres ikke når et forslag tas i bruk.

#### FR-12: Demomodus uten nøkkel
Uten nøkkel til språkmodell gir appen forhåndslagrede eksempelforslag og viser at de er eksempler.

**Konsekvenser (testbare):**
- Appen starter og hele kjerneflyten virker uten nøkkel.
- Eksempelforslag er merket som eksempler i grensesnittet.

### 4.5 Lagring og organisering

**Beskrivelse:** Brukeren lagrer oppskrifter i samlingen, sorterer dem i mapper og markerer favoritter. Alt lagres lokalt uten konto. Realiserer UJ-1, UJ-3.

#### FR-13: Lagre og slette oppskrifter
Brukeren kan lagre en oppskrift i samlingen og slette den igjen.

**Konsekvenser (testbare):**
- En lagret oppskrift finnes i samlingen etter at appen er startet på nytt.
- Sist valgte porsjonsantall og valgte forslag lagres med oppskriften.
- Sletting krever bekreftelse.
- Import av en lenke som allerede finnes i samlingen gir beskjed om det og lenke til den lagrede oppskriften `[ANTAKELSE]`.

#### FR-14: Mapper
Brukeren kan opprette, gi nytt navn til og slette mapper, og legge en oppskrift i én mappe eller ingen.

**Konsekvenser (testbare):**
- Mappenavn må være 1–40 tegn og unikt (uten forskjell på store og små bokstaver).
- Å flytte en oppskrift til en annen mappe fjerner den fra den forrige.
- Når en mappe slettes, blir oppskriftene liggende i samlingen uten mappe `[ANTAKELSE]`.

#### FR-15: Favoritter
Brukeren kan markere og avmarkere en oppskrift som favoritt, uavhengig av mappe.

**Konsekvenser (testbare):**
- Favoritter vises i en egen visning.
- Markering er synlig både i oppskriften og i lister.

#### FR-16: Finne igjen oppskrifter
Brukeren kan se samlingen, én mappe om gangen og favoritter, sortert med sist lagrede eller åpnede først. Realiserer UJ-3.

**Konsekvenser (testbare):**
- Hver visning viser tittel, kilde og favorittmarkering per oppskrift.
- Tomme visninger har en forklarende tekst og en vei videre (f.eks. «Importer din første oppskrift»).

## 5. Tverrgående krav (NFR)

- **NFR-1 Kjørbarhet:** Appen kan installeres og startes lokalt etter README med Node.js og npm, uten egen databaseserver, betalte kontoer eller nøkler. Hele kjerneflyten (import, visning, skalering, lagring, mapper, favoritter) virker uten nøkkel.
- **NFR-2 Testbarhet:** Import testes mot lagrede testsider i `test/fixtures/`, ikke mot nettet. Forslag testes mot lagrede eksempelsvar. Alle eksemplene i FR-8 er automatiske tester.
- **NFR-3 Ytelse:** Henting av en kilde avbrytes etter 10 sekunder. Skalering oppdateres uten merkbar forsinkelse.
- **NFR-4 Sikkerhet:** Nøkler ligger bare i `.env`, som ikke versjoneres; `.env.example` følger med uten ekte verdier. Import henter bare http/https-adresser, begrenser størrelse på svaret, kjører ikke skript fra kilden og viser ikke HTML fra kilden ufiltrert. Adresser til lokal maskin og interne nett avvises `[ANTAKELSE: viktig selv om appen kjøres lokalt]`.
- **NFR-5 Tilgjengelighet og design:** Fungerer fra 360 px bredde (mobil) til desktop. Lesbar tekststørrelse på kjøkkenbenken. Kontrast etter WCAG 2.1 AA, alle handlinger kan nås med tastatur, og alle skjemafelt har etiketter.
- **NFR-6 Språk:** Grensesnitt, meldinger og forslag er på norsk (bokmål).
- **NFR-7 Personvern og opphavsrett:** Ingen personopplysninger samles inn. Oppskrifter er til personlig bruk, viser alltid kilde og lagrer ikke bilder fra kilden.

## 6. Ikke-mål

- RecipeMate lager ikke nye oppskrifter med KI og er ikke en oppskriftsdatabase eller søkemotor for nettet.
- RecipeMate er ikke et sosialt nettverk: ingen deling, kommentarer eller vurderinger.
- RecipeMate er ikke et ernærings- eller kostholdsverktøy.
- RecipeMate er ikke en skytjeneste med kontoer og synkronisering mellom enheter i v1.

## 7. MVP-omfang

### 7.1 Med i v1
- Import fra lenke (FR-1–FR-3) og manuell innlegging (FR-4)
- Visning i fast format (FR-5, FR-6)
- Skalering (FR-7–FR-9)
- Forbedringsforslag med demomodus (FR-10–FR-12)
- Lagring, mapper, favoritter og oversikter (FR-13–FR-16)

### 7.2 Ikke med i v1
- Ingredienssubstitusjoner, automatisk handleliste, egne notater, søk og filtrering, kostholdspreferanser og allergier, tidsplan, import fra bilder, ukemenyer (fra briefen).
- Konto og synkronisering (se §6).
- Konvertering mellom enheter (f.eks. ss til dl).
- KI som reserve for import fra sider uten oppskriftsdata.

**Hvis tid (i prioritert rekkefølge):** 1) søk og filtrering i samlingen, 2) KI som reserve for import, 3) ingredienssubstitusjoner.

## 8. Suksessmål

Målt i en brukertest med 5 testbrukere og de samme fem lagrede oppskriftslenkene. Hvert mål gjelder: minst 4 av 5 (80 %) fullfører uten hjelp.

**Primære**
- **SM-1:** Importere en oppskrift via lenke. Validerer FR-1, FR-5.
- **SM-2:** Skalere oppskriften til et annet antall personer med riktige mengder. Validerer FR-7, FR-8.
- **SM-3:** Finne, forstå og ta i bruk et forslag. Validerer FR-10, FR-11.
- **SM-4:** Lagre oppskriften i en mappe og markere den som favoritt. Validerer FR-13–FR-15.
- **SM-5:** Finne igjen en lagret oppskrift via mappe eller favoritter. Validerer FR-16.

**Sekundære**
- **SM-6:** Alle automatiske tester for skalering (FR-8) og import fra testsider (FR-1, FR-2) er grønne.
- **SM-7:** Testbrukerne svarer om forslagene var relevante for oppskriften (ja/nei). Brukes som tilbakemelding, ikke som krav.

**Mål som ikke skal optimaliseres**
- **SM-C1:** Andel kilder som «importeres». Å vise oppskrifter med feil data for å få flere vellykkede importer er verre enn en tydelig feilmelding. Motvekt til SM-1.
- **SM-C2:** Antall forslag. Flere forslag er ikke bedre; få og konkrete forslag foretrekkes. Motvekt til SM-3.

## 9. Åpne spørsmål

1. Hvilke norske kilder har oppskriftsdata i HTML-en? Avklares ved å kjøre `scripts/fetch-fixtures.sh` (research §6).
2. Hvilken språkmodell og leverandør brukes, og hva koster den i testing? Avgjøres i arkitekturen.
3. Er det greit å lagre ingredienser og steg fra andre sider for personlig bruk? Spørres faglærer.
4. Skal mengder i g og ml under 100 også avrundes (f.eks. 37,5 g)? Avgjøres før skaleringen implementeres.

## 10. Antakelser

- §4.3 FR-7 — Øvre grense for porsjonsantall er 50.
- §4.3 FR-9 — Listen over enheter dekker testsidene og utvides ved behov.
- §4.5 FR-13 — Import av en lenke som allerede er lagret gir beskjed i stedet for duplikat.
- §4.5 FR-14 — Oppskrifter i en slettet mappe blir liggende uten mappe.
- §5 NFR-4 — Adresser til lokal maskin og interne nett avvises ved import.
