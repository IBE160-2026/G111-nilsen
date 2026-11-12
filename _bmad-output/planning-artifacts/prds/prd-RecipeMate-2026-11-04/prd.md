---
title: RecipeMate
status: active
created: 2026-11-04
updated: 2026-11-12
---

# PRD: RecipeMate

## 0. Om dokumentet

Denne PRD-en beskriver hva første versjon (v1) av RecipeMate skal gjøre, og (§4.6, lagt til 2026-11-10) hva versjon 2 la til; se `sprint-change-proposal-2026-11-10.md`. Den bygger på `product-brief.md`, `_bmad-output/planning-artifacts/research-og-avklaringer.md` og tilbakemeldingen på briefen (`tilbakemelding-product-brief.md`), og er grunnlaget for UX, arkitektur, epics og stories. Begrepene i §3 brukes likt i alle senere dokumenter. Krav har faste ID-er (FR-n, NFR-n, UJ-n, SM-n) som stories, tester og commits kan vise til. Tekniske valg og begrunnelser står i `addendum.md`. Antakelser er merket `[ANTAKELSE]` og samlet i §10.

Dokumentet dekker nå v1 (§4.1–§4.5), versjon 2 (§4.6) og Epic 6 (§4.7). §4.0 er oversikten over alle krav med status: **Bygget** (forpliktet og i appen), **Kandidat** (bygges bare hvis tid) og **Ikke nå** (bevisst utsatt). Et krav som er bygget, har testbare konsekvenser. Et krav som er kandidat, har det ikke før det prioriteres.

Revidert 2026-11-12 etter formativ tilbakemelding fra faglærer (`tilbakemelding-prd.md`). Hva som er endret, og svar på refleksjonsspørsmålene, står i `svar-paa-tilbakemelding-prd.md`.

## 1. Visjon

RecipeMate gjør oppskrifter brukeren allerede har funnet på nettet enklere å bruke. Brukeren limer inn en lenke, og appen viser oppskriften i et fast og ryddig format, uansett hvilken side den kommer fra. Brukeren velger hvor mange porsjoner maten skal lages til, og alle mengder regnes om automatisk etter faste, forutsigbare regler.

RecipeMate gir også konkrete forslag som kan gjøre akkurat denne retten bedre, og brukeren velger selv hva som tas i bruk. Oppskrifter lagres i mapper og som favoritter, slik at de er lette å finne igjen.

Målet er at veien fra lenke til en tilpasset, lagret oppskrift tar under et minutt, uten hoderegning og uten bokmerker spredt rundt.

## 2. Målgruppe

### 2.1 Jobber brukeren vil få gjort
- Lage en oppskrift fra nettet for et annet antall porsjoner enn den er skrevet for, uten å regne selv.
- Lese oppskriften raskt på kjøkkenbenken, på mobil eller nettbrett, uten reklame og rot.
- Få et konkret tips som passer akkurat denne retten, og selv bestemme om det skal brukes.
- Finne igjen en oppskrift man likte, uten å lete i bokmerker, skjermbilder og faner.

### 2.2 Ikke målgruppe i v1
- Profesjonelle kjøkken og storhusholdning (store porsjoner, næringsberegning, kostnader).
- Brukere som vil finne nye oppskrifter i appen, eller dele dem med andre enn én de selv inviterer. (Oppdatert 2026-11-12: å legge inn en oppskrift selv har vært med siden v1, FR-4, og deling med én invitert konto kom i Epic 6, FR-38.)
- Brukere med behov for allergi- og kostholdsfiltrering.

### 2.3 Brukerreiser

- **UJ-1. Ida lager taco til fem i stedet for fire.**
  Ida (22) er student og lager middag til seg selv og noen venner, men antallet varierer. Hun har funnet en tacooppskrift på en norsk matside og åpner RecipeMate på mobilen. Hun limer inn lenken og trykker «Hent oppskrift». Oppskriften vises med ingredienser og steg i fast format, laget for 4 porsjoner. Hun endrer antall til 5, og alle mengder oppdateres med en gang: «400 g kjøttdeig» blir «500 g kjøttdeig». Hun lagrer oppskriften i mappen «Hverdag» og markerer den som favoritt. **Kanttilfelle:** siden oppgir ikke antall porsjoner. RecipeMate spør da hvor mange oppskriften er laget for før den skalerer.

- **UJ-2. Tor tilpasser fiskesuppe til familien på fem og prøver et forslag.**
  Tor er forelder i en familie på fem og vil lage fiskesuppe fra en engelsk matblogg skrevet for 2 porsjoner. Han importerer oppskriften, setter antall til 5 og ser at «1 egg» blir «3 egg (ca.)». Han ber om forslag og får tre korte tips knyttet til oppskriften, blant annet «Tilsett litt sitronsaft rett før servering for friskere smak». Han tar i bruk ett forslag og hopper over de andre. Det valgte forslaget vises merket i oppskriften og huskes når han lagrer den i mappen «Helg». **Kanttilfelle:** lenken er en oversiktsside med mange oppskrifter. RecipeMate sier at den ikke fant en oppskrift på siden og foreslår å lime inn lenken til selve oppskriften, eller å legge den inn manuelt.

- **UJ-3. Ida finner igjen favoritten en uke senere.**
  Ida åpner RecipeMate, går til «Favoritter» og finner tacooppskriften øverst. Hun åpner den og ser at den sist ble laget for 5 porsjoner. Hun endrer til 3 og lager maten.

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
- **Udelelig ingrediens** — En ingrediens som telles i hele enheter. Appen avgjør det etter enheten, ikke etter navnet: linjer **uten enhet** («2 løk», «1 egg») og linjer med enhetene `stk`, `fedd`, `boks`, `pk`, `pose`, `bunt`, `skive`, `glass`, `beger`, `neve`, `klype` (og engelsk `can`, `pinch`) er udelelige. Alle andre enheter (g, dl, ss …) deles fritt.
- **Opprinnelig porsjonsantall** — Hvor mange porsjoner oppskriften er skrevet for.
- **Valgt porsjonsantall** — Hvor mange porsjoner brukeren vil lage oppskriften til.
- **Skalering** — Omregning av mengder fra opprinnelig til valgt porsjonsantall.
- **Forslag** — Et konkret forbedringsforslag knyttet til én oppskrift, med en kort begrunnelse.
- **Valgt forslag** — Et forslag brukeren har tatt i bruk. Lagres på oppskriften.
- **Mappe** — En navngitt samling oppskrifter. En oppskrift ligger i null eller én mappe.
- **Favoritt** — Et merke på en oppskrift. Uavhengig av mappe.
- **Samling** — Alle lagrede oppskrifter for én konto. Fanen som viser samlingen heter **«Oppskrifter»** i grensesnittet; begrepene betyr det samme.
- **Konto** — E-post og passord som eier en samling (FR-27). All lagring hører til én konto.
- **Merkelapp** — Et kort, valgfritt stikkord på en lagret oppskrift, for eksempel «vegetar» (FR-34).
- **Vurdering** — Brukerens egne 1–5 stjerner på en lagret oppskrift. Privat (FR-34).
- **Notat** — Brukerens egen tekst på en lagret oppskrift, med «Sist laget»-dato (FR-30).
- **Kokemodus** — Fullskjermvisning med ett steg om gangen under matlaging (FR-21).
- **Handleliste** — Én sammenslått liste med ingrediensene fra valgte oppskrifter i valgt antall porsjoner (FR-23).
- **Har hjemme** — Varer brukeren har merket som hjemme; de skjules fra handlelisten (FR-24).
- **Ukemeny** — Oppskrifter lagt på dager i en uke, som gir handlelisten for uka (FR-31).
- **Enkle forslag** — Forslag laget av faste regler uten språkmodell, merket som enkle i grensesnittet (FR-25).
- **Delt samling** — En annen kontos samling som eieren har invitert brukeren til å se. Bare lesing (FR-38).

## 4. Funksjoner

### 4.0 Oversikt over krav

Alle funksjonelle krav, med hvor de står og hva de er forpliktet til. **Bygget** betyr at kravet er i appen og har testbare konsekvenser. **Kandidat** betyr at det bygges bare hvis tid; det får konsekvenser først når det prioriteres. **Ikke nå** er bevisst utsatt.

| ID | Kort | § | Status |
|---|---|---|---|
| FR-1–FR-3 | Import fra lenke | 4.1 | Bygget |
| FR-4 | Manuell innlegging | 4.1 | Bygget |
| FR-5, FR-6 | Fast format, utolkbare linjer | 4.2 | Bygget |
| FR-17 | Avkrysning under matlaging | 4.2 | Bygget |
| FR-7–FR-9 | Porsjonsvalg, skaleringsregler, tolking | 4.3 | Bygget |
| FR-10–FR-12 | Forslag, ta i bruk, demomodus | 4.4 | Bygget |
| FR-13–FR-16, FR-18 | Lagring, redigering, mapper, favoritter, oversikter | 4.5 | Bygget |
| FR-19 | Halve porsjoner | 4.6 | Bygget |
| FR-20 | Søk og filtrering | 4.6 | Bygget |
| FR-21 | Kokemodus | 4.6 | Bygget |
| FR-22 | Velge mål | 4.6 | Bygget |
| FR-23 | Handleliste | 4.6 | Bygget |
| FR-24 | Har hjemme | 4.6 | Bygget |
| FR-25, FR-26 | Forslag uten nøkkel, forslag i oppskriften | 4.6 | Bygget |
| FR-27 | Kontoer | 4.6 | Bygget |
| FR-28 | Forslag i ingredienslisten | 4.7 | Bygget |
| FR-29 | Tid for oppskriften | 4.7 | Bygget |
| FR-30 | Notater og sist laget | 4.7 | Bygget |
| FR-31 | Ukemeny | 4.7 | Bygget |
| FR-32 | Tidtaker i kokemodus | 4.7 | Bygget |
| FR-33 | Utskrift | 4.7 | Bygget |
| FR-34 | Merkelapper, vurdering, sortering, variant, angre sletting | 4.7 | Bygget |
| FR-35 | «Hva kan jeg lage?» og tilfeldig forslag | 4.7 | Bygget |
| FR-36 | Lim inn tekst, eksport og import | 4.7 | Bygget |
| FR-37 | Installerbar app og handleliste uten nett | 4.7 | Bygget |
| FR-38 | Deling av samlingen med en annen konto | 4.7 | Bygget |
| FR-43 | Forside | 4.7 | Bygget |
| FR-39 | Glemt passord | 4.7 | Kandidat |
| FR-41 | Offentlig lenke til én oppskrift | 4.7 | Kandidat |
| FR-42 | Delt handleliste i husstanden | 4.7 | Kandidat |
| FR-40 | Stemmestyring i kokemodus | 4.7 | Ikke nå |

Kandidatene bygges ikke før alt som er bygget, er testet og designrunden er gjort. Rekkefølgen på kandidatene er FR-41, FR-39, FR-42.

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

#### FR-17: Avkrysning under matlaging
Brukeren kan krysse av ingredienslinjer og steg mens maten lages, for å holde oversikt. Realiserer UJ-1.

**Konsekvenser (testbare):**
- Et trykk på en ingredienslinje eller et steg markerer den som ferdig, og et nytt trykk fjerner markeringen.
- Avkrysning påvirker ikke skalering, og endring av porsjonsantall fjerner ikke avkrysningene.
- Avkrysning lagres ikke når oppskriften lukkes `[ANTAKELSE]`.

### 4.3 Skalering

**Beskrivelse:** Brukeren velger antall porsjoner, og alle tolkbare mengder regnes om med en gang. Skalering er appens viktigste regel og skal være forutsigbar og fullt testet. Realiserer UJ-1, UJ-2, UJ-3.

#### FR-7: Velge antall porsjoner
Brukeren kan velge valgt porsjonsantall fra 0,5 til 50 i steg på 0,5 `[ANTAKELSE: øvre grense 50 holder for hjemmebruk]`, med knapper for pluss og minus, ved å skrive tallet og med glidebryter (FR-19). Opprinnelig porsjonsantall (hva oppskriften er skrevet for) er fortsatt et **heltall fra 1 til 50**.

**Konsekvenser (testbare):**
- Alle tolkbare mengder oppdateres uten å laste siden på nytt.
- 4,5 godtas. Verdier under 0,5, over 50 og verdier som ikke er hele eller halve (2,4) avvises med en melding.
- Opprinnelig porsjonsantall godtar bare heltall: 4 godtas, 4,5 avvises.
- Brukeren kan tilbakestille til opprinnelig porsjonsantall med én handling.

#### FR-8: Skaleringsregler
Mengder regnes om med faktoren valgt porsjonsantall delt på opprinnelig porsjonsantall, etter disse reglene:

1. Enheten beholdes. Det gjøres ingen konvertering mellom enheter.
2. Resultatet vises som ½, ¼, ¾, ⅓ eller ⅔ (eventuelt med heltall foran) når brøkdelen ligger innenfor 5 % av selve brøken (f.eks. 1,24 → 1 ¼, men 5,4 → 5,4). Ellers vises desimaltall med komma og maks én desimal.
3. Udelelige ingredienser (se §3: linjer uten enhet, og enhetene `stk`, `fedd`, `boks`, `pk`, `pose`, `bunt`, `skive`, `glass`, `beger`, `neve`, `klype`, `can`, `pinch`) rundes til nærmeste hele tall, halve oppover, minst 1, og merkes «ca.» når avrundingen endret verdien.
4. Mengder i g og ml over 100 avrundes til to gjeldende sifre, og mengder under 100 avrundes til hele tall (37,5 g → 38 g).
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
| 11 | 1 egg | 0,5 | 1 egg (ca.) |
| 12 | 400 g mel | 2,5 | 250 g mel |
| 13 | 2 løk | 6 | 3 løk |
| 14 | 1 boks tomater | 6 | 2 boks tomater (ca.) |
| 15 | 3 stk gulrot | 2 | 2 stk gulrot (ca.) |

Rad 11–15 er lagt til 2026-11-12. Alle 15 radene er automatiske tester (NFR-2); fasiten er hentet fra appen selv, ikke regnet for hånd.

`[ANTAKELSE: enheter bøyes ikke i flertall]` Rad 14 viser «2 boks tomater», ikke «2 bokser». Enheten gjentas slik den står i oppskriften. Det er forståelig, og bøyning er utsatt.

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
- Et svar fra språkmodellen som ikke har riktig format, avvises i stedet for å vises. Et forslag må ha `text` (1–300 tegn), `reason` (1–400 tegn) og `appliesTo` som er `ingredients`, `steps` eller `recipe`; et svar med en annen verdi i `appliesTo` avvises.
- Grensene for kall til språkmodellen (tidsavbrudd, antall kall, svarstørrelse) står i NFR-8.

#### FR-11: Ta i bruk forslag
Brukeren kan ta i bruk eller hoppe over hvert forslag. Valgte forslag lagres på oppskriften. Realiserer UJ-2.

**Konsekvenser (testbare):**
- Et valgt forslag vises merket i oppskriften og finnes fortsatt etter at oppskriften er lagret og åpnet igjen.
- Brukeren kan fjerne et valgt forslag.
- Ingredienslinjer og steg endres ikke når et forslag tas i bruk. Hvordan et valgt forslag vises i oppskriften, står i FR-26.

#### FR-12: Demomodus uten nøkkel
Uten nøkkel til språkmodell gir appen forslag uten å kontakte noen tjeneste, og viser at de ikke kommer fra en språkmodell. Hvordan forslagene lages uten nøkkel, står i FR-25.

**Konsekvenser (testbare):**
- Appen starter og hele kjerneflyten virker uten nøkkel.
- Eksempelforslag er merket som eksempler i grensesnittet.

### 4.5 Lagring og organisering

**Beskrivelse:** Brukeren lagrer oppskrifter i samlingen, sorterer dem i mapper og markerer favoritter. I v1 lagres alt lokalt uten konto; fra versjon 2 lagres det lokalt på brukerens konto (FR-27). Realiserer UJ-1, UJ-3.

#### FR-13: Lagre og slette oppskrifter
Brukeren kan lagre en oppskrift i samlingen og slette den igjen. En manuelt innlagt oppskrift lagres i samlingen med en gang («Lagre oppskrift»); en importert oppskrift lagres med en egen Lagre-knapp.

**Konsekvenser (testbare):**
- En oppskrift lagt inn via «Legg inn selv» vises i samlingen uten flere steg.
- En lagret oppskrift finnes i samlingen etter at appen er startet på nytt.
- Sist valgte porsjonsantall og valgte forslag lagres med oppskriften.
- Sletting krever bekreftelse.
- Import av en lenke som allerede finnes i samlingen gir beskjed om det og lenke til den lagrede oppskriften `[ANTAKELSE]`.

#### FR-18: Redigere en oppskrift
Brukeren kan endre tittel, opprinnelig porsjonsantall, ingredienser og steg i en lagret oppskrift. Lagt til 2026-11-09 etter manuell test (issue 005): uten redigering måtte en oppskrift med feil legges inn på nytt.

**Konsekvenser (testbare):**
- Redigering bruker samme skjema, validering og tolking som manuell innlegging (FR-4), forhåndsutfylt med oppskriften.
- Endrede ingredienslinjer tolkes på nytt og lagres med originaltekst (AD-2); kilde, mappe, favoritt og valgte forslag beholdes.
- Avbryt gir ingen endring.

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

### 4.6 Versjon 2 (lagt til 2026-11-10)

**Beskrivelse:** Funksjoner som kom etter v1, fra «hvis tid»-listen i §7.2 og fra bruk. Alle er bygget. Hver har en egen spec (`_bmad-output/implementation-artifacts/spec-5-N-*.md`) med full oppførsel og testmatrise; konsekvensene under er de som gjelder uansett hvordan specen er skrevet.

#### FR-19: Halve porsjoner og glidebryter
Valgt antall porsjoner kan være hele og halve tall fra 0,5 til 50, med «+ ½», feltet («4,5») og en glidebryter i halve steg. Antallet oppskriften er skrevet for er fortsatt et heltall 1–50. Reglene står i FR-7. (Story 5.1, 5.3)

**Konsekvenser (testbare):**
- Glidebryteren flytter seg i steg på 0,5 og viser samme verdi som feltet.
- Skalering med halvt antall følger FR-8: «1 egg» ved 0,5 gir «1 egg (ca.)», «400 g mel» ved 2,5 gir «250 g mel» (opprinnelig 4).
- Valget huskes på en lagret oppskrift, også et halvt antall.

#### FR-20: Søk og filtrering i Oppskrifter
Brukeren kan søke i tittel, kilde, mappe, merkelapper og ingredienser (alle ord må finnes) og filtrere på mappe og favoritter. Treffantallet leses opp; ingen treff gir «Nullstill søk». (Story 5.2, 6.7)

**Konsekvenser (testbare):**
- Søket skiller ikke på store og små bokstaver eller aksenter: «creme» finner «Crème».
- Alle ordene må finnes: «taco kjøttdeig» treffer bare oppskrifter som har begge.
- Ingen treff gir en forklarende tekst og «Nullstill søk», ikke en tom side.

#### FR-21: Kokemodus
Fullskjerm med ett steg om gangen i stor tekst, ingrediensene for steget og for hele oppskriften i valgt antall, og skjermen holdt våken der nettleseren støtter det. (Story 5.4, 5.6)

**Konsekvenser (testbare):**
- Kokemodus viser «Steg n av m», «Forrige», «Neste» og «Avslutt», og ett steg om gangen.
- Ingrediensene som nevnes i steget, vises under «I dette steget», i valgt antall porsjoner.
- Skjermen holdes våken der nettleseren støtter det; der den ikke gjør det, virker kokemodus som før uten feilmelding.

#### FR-22: Velge mål
Mengder kan vises «som i oppskriften», som volum (dl) eller som vekt (gram). Kopper, unser og pund regnes om til norske mål; kjente varer regnes mellom dl og gram med faste kjøkkenverdier og merkes «ca.». Gjelder oppskrift, kokemodus og handleliste. (Story 5.5, 5.9)

Faste kjøkkenverdier (gram per dl): mel 60, potetmel 80, maisenna 60, sukker 85, melis 60, farin 80, smør og margarin 90, olje 90, melk, vann, fløte, rømme og yoghurt 100, honning og sirup 140, havregryn 35, ris 85, salt 120, kakao 45. Amerikanske mål: 1 cup = 2,4 dl, 1 oz = 28 g, 1 lb = 450 g; tbsp og tsp er ss og ts.

**Konsekvenser (testbare):**
- «1 dl mel» i gram gir «60 g mel (ca.)», «1 dl melk» gir «100 g melk (ca.)».
- En vare som ikke står på listen («1 dl ukjent vare») vises uendret, ikke omregnet.
- Sammensatte ord regnes med: «hvetemel» bruker verdien for mel, «olivenolje» verdien for olje.
- «1 cup mel» i norske mål gir «2,4 dl mel (ca.)»; «1 tbsp» gir «1 ss» uten «ca.».

#### FR-23: Handleliste
Brukeren velger lagrede oppskrifter og antall porsjoner for hver og får én sammenslått liste (samme navn og enhet legges sammen) som kan krysses av og kopieres. Lister kan lagres med navn og åpnes igjen, og oppskriftene kan søkes opp. Eget punkt i toppmenyen. (Story 5.7, 6.4f, 6.4g)

**Konsekvenser (testbare):**
- «4 dl melk» og «2 dl melk» fra to oppskrifter blir «6 dl melk»; ulik enhet legges ikke sammen.
- Hver vare viser hvilke oppskrifter den kommer fra.
- Uten valgte oppskrifter står det hvorfor listen er tom, ikke en tom side.
- En lagret liste kan åpnes igjen med de samme oppskriftene og porsjonene.

#### FR-24: Har hjemme
Brukeren kan merke varer som «Har hjemme» (fra listen eller ved å skrive dem inn); de skjules fra handlelisten og kopien og huskes. (Story 5.8, 6.4b)

**Konsekvenser (testbare):**
- En vare som er hjemme, forsvinner fra «Du må kjøpe», og antallet skjulte varer vises.
- Valget huskes etter at siden er lastet på nytt, og «Legg tilbake på listen» angrer det.
- «Tøm listen» spør først, og varene kommer tilbake på handlelisten.

#### FR-25: Forslag som passer oppskriften uten nøkkel
Uten nøkkel lages 1–3 forslag med faste regler ut fra hva oppskriften inneholder (pannekaker, kjøttdeig, gjærbakst, pasta, fisk, kylling, supper m.fl.), merket «Enkle forslag». Råd oppskriften allerede følger, hoppes over. Passer ingen regel, brukes de generelle eksemplene. (Story 5.10)

**Konsekvenser (testbare):**
- Ingen nettverkskall gjøres uten nøkkel, og forslagene er merket som enkle forslag.
- En oppskrift med «hvetemel, melk, egg» får pannekakeforslag, ikke de generelle.
- Et råd oppskriften allerede følger (steget nevner det), tas ikke med.

#### FR-26: Forslag i oppskriften
Et forslag som tas i bruk, vises i oppskriften: ingrediensforslag som merket linje i ingredienslisten (skaleres), stegforslag flettet inn og uthevet i steget det hører til, og forslag om hele retten under stegene. De lagrede linjene og stegene endres ikke, og «Fjern» tar forslaget bort. (Story 5.11, 5.12)

**Konsekvenser (testbare):**
- Et valgt ingrediensforslag vises som merket linje og skaleres som andre linjer.
- De lagrede ingredienslinjene og stegene er uendret i databasen etter at et forslag er tatt i bruk.
- «Fjern» tar forslaget ut av visningen, og oppskriften er som før.

#### FR-27: Kontoer og egne oppskrifter
Brukeren kan lage konto med e-post og passord, logge inn og ut. Lagring, mapper, favoritter, handleliste, «Har hjemme» og «Legg inn selv» krever innlogging; å hente, se og skalere oppskrifter gjør det ikke. Hver konto ser bare sine egne data. Den første kontoen overtar det som allerede finnes. (Story 5.13)

**Konsekvenser (testbare):**
- Uten innlogging gir «Lagre» lenken «Logg inn for å lagre», og brukeren kommer tilbake til oppskriften etterpå.
- En annen bruker får «Fant ikke oppskriften» for en lagret oppskrift som ikke er hans.
- Feil e-post og feil passord gir samme melding; passord lagres aldri i klartekst.

### 4.7 Epic 6 (lagt til 2026-11-10, delt i forpliktet og kandidat 2026-11-12)

**Beskrivelse:** Ønsker fra Maja etter versjon 2, prioritert av henne. Fra 2026-11-12 er de delt i tre: **bygget** (FR-28–FR-38, FR-43), **kandidat** (FR-39, FR-41, FR-42) og **ikke nå** (FR-40). Kandidatene bygges ikke før det som er bygget, er testet og designrunden er gjort; da får de konsekvenser og en spec. Hver story som bygges, har en spec i `_bmad-output/implementation-artifacts/`.

#### Bygget

#### FR-28: Forslag i ingredienslisten
Et forslag som innfører en ingrediens, også når det er et stegforslag («Tilsett frisk basilikum til slutt»), gir en merket linje i ingredienslisten. (Story 6.1)

**Konsekvenser (testbare):**
- Et stegforslag som nevner en ny ingrediens, gir en merket linje i ingredienslisten i tillegg til teksten i steget.
- Linjen skaleres som andre linjer og forsvinner når forslaget fjernes.

#### FR-29: Tid
Oppskriften viser hvor lang tid den tar, hentet fra kilden eller skrevet inn selv, ved favoritthjertet. (Story 6.2)

**Konsekvenser (testbare):**
- Tid vises som «1 t 30 min»; uten tid vises ingenting, og oppskriften ser lik ut ellers.
- Tiden kan hentes fra kilden når oppskriften har en lenke, og kan skrives inn og endres selv (1–1440 minutter).

#### FR-30: Notater, «passer til» og sist laget
Eget notatfelt per oppskrift, «Passer til» (brukerens egen vurdering av hvem retten passer for) og «Sist laget»-dato med antall ganger. (Story 6.3, 6.6b)

**Konsekvenser (testbare):**
- Notatet (maks 2000 tegn) og «Passer til» (maks 60 tegn) lagres på oppskriften og finnes igjen etter omstart.
- «Laget i dag» setter datoen og teller opp antall ganger laget.
- Notater vises bare for eieren av oppskriften.

#### FR-31: Ukemeny
Oppskrifter legges på dager i en uke, og uka gir handlelisten. Lagrede uker vises i en oversikt, med egen side per uke. (Story 6.4, 6.4b–6.4g)

**Konsekvenser (testbare):**
- En oppskrift lagt på en dag vises på den dagen, og handlelisten for uka inneholder ingrediensene fra ukas oppskrifter.
- Avkrysninger i handlelisten for en lagret uke huskes til neste gang uka åpnes.
- Uker kan bla framover og bakover, og en tom uke sier hva brukeren kan gjøre.

#### FR-32: Tidtaker i kokemodus
Kokemodus kjenner igjen tider i steget («stek i 10 minutter») og kan starte en tidtaker på dem. Flere tidtakere kan gå samtidig. (Story 6.5)

**Konsekvenser (testbare):**
- Et steg med «10 minutter» gir knappen «Start tidtaker: 10 min».
- Når tiden er ute, vises en beskjed med stegnummer, og lyd spilles der nettleseren tillater det.
- Tidtakeren kan justeres (+/− minutter) og avbrytes.

#### FR-33: Utskrift
Utskriftsvennlig visning av en oppskrift. (Story 6.6)

**Konsekvenser (testbare):**
- Utskriften har tittel, ingredienser i valgt antall og steg, uten meny og knapper.
- Valgt antall porsjoner på skjermen er det samme som på utskriften.

#### FR-34: Organisering
Merkelapper (også i søket), egen vurdering med stjerner, sortering av samlingen, kopiere en oppskrift som egen variant, og angre sletting. (Story 6.7–6.11)

**Konsekvenser (testbare):**
- En oppskrift kan ha inntil 10 merkelapper på maks 30 tegn; samme merkelapp to ganger endrer ingenting.
- Vurdering er 1–5 stjerner, kan fjernes, og er privat (vises ikke i en delt samling).
- Samlingen kan sorteres på sist lagret, tittel, vurdering og sist laget.
- «Lag egen variant» gir en ny, lagret oppskrift med «Kopi av» foran tittelen, som kan endres uten å røre originalen.
- En slettet oppskrift havner i «Nylig slettet» og kan hentes tilbake i 7 dager; etter det slettes den for godt.

#### FR-35: Finne noe å lage
«Hva kan jeg lage?» ut fra «Har hjemme», og tilfeldig middagsforslag fra samlingen. (Story 6.12, 6.13)

**Konsekvenser (testbare):**
- Oppskriftene grupperes som «Kan lages nå», «Mangler 1–2 ting» og «Mangler flere ting», med hva som mangler.
- En ingrediens regnes som hjemme når alle ordene i «Har hjemme»-oppføringen finnes som hele ord i ingrediensen; «ris» treffer ikke «paprika».
- «Foreslå en annen» gir en annen oppskrift enn forrige så lenge det finnes flere som passer filteret.

#### FR-36: Import og eksport
Lime inn tekst og få den tolket til et utkast, og eksport/import av hele samlingen som fil. (Story 6.14, 6.15)

**Konsekvenser (testbare):**
- Limt tekst med overskriftene «Ingredienser» og «Fremgangsmåte» fyller skjemaet for manuell innlegging; ingenting lagres før brukeren har sett over og lagret.
- Teksten tolkes i nettleseren og sendes ingen steder.
- Eksport gir én JSON-fil med alle lagrede oppskrifter, med mappe, merkelapper, notater og vurdering.
- Import av samme fil to ganger gir ingen dubletter: lik tittel og kilde hoppes over, og en ugyldig fil lagrer ingenting.

#### FR-37: Mobil
Installerbar på hjemskjermen (PWA), og handlelisten tilgjengelig uten nett. (Story 6.16, 6.17)

**Konsekvenser (testbare):**
- Appen har manifest og ikoner og kan åpnes uten nettleserlinje.
- Uten nett vises en egen side «Du er frakoblet», ikke nettleserens feilside.
- Den sist sette handlelisten kan krysses av uten nett, og avkrysningene huskes.
- Ingen sider eller oppskrifter lagres av service workeren; handlelisten som lagres i nettleseren, slettes ved utlogging.

#### FR-38: Deling av samlingen
Brukeren kan invitere en annen RecipeMate-konto til å se samlingen sin. Mottakeren godtar, ser oppskriftene og kan kopiere dem til sin egen samling, men ikke endre eierens. Begge kan avslutte delingen. (Story 6.19)

**Konsekvenser (testbare):**
- Invitasjon til en e-post uten konto, til seg selv, eller til noen som allerede er invitert, gir en forklarende melding og deler ingenting.
- Før invitasjonen er godtatt, er oppskriftene ikke synlige for mottakeren.
- En delt oppskrift vises uten knapper for å endre, slette, vurdere eller skrive notater, og med «Delt av <e-post>».
- En kopi av en delt oppskrift er mottakerens egen og har ikke eierens mappe, notater, vurdering eller favoritt.
- Når en av partene avslutter delingen, er oppskriftene ikke synlige lenger.

#### FR-43: Forside
Forsiden forklarer hva appen gjør og viser veien videre til import, oppskrifter, ukemeny og handleliste. (Story 6.4e)

**Konsekvenser (testbare):**
- Forsiden virker uten innlogging og lenker videre til import.
- Den viser ingen data fra en konto før brukeren er logget inn.

#### Kandidater (bygges hvis tid, i denne rekkefølgen)

- **FR-41 Offentlig lenke:** en hemmelig lenke som viser én oppskrift i bare lesing, uten konto. Avklares: hvordan lenken trekkes tilbake, og at ingen personopplysninger følger med.
- **FR-39 Glemt passord:** tilbakestilling med engangslenke; uten e-postnøkkel skrives lenken i terminalen.
- **FR-42 Delt handleliste:** to kontoer som deler samling (FR-38), ser og krysser av i samme handleliste.

#### Ikke nå

- **FR-40 Stemmestyring i kokemodus:** «neste» og «forrige» med stemmen. Utsatt 2026-11-12: avhenger av hva nettleseren støtter, og er vanskelig å teste automatisk. Tidtakeren (FR-32) dekker det viktigste behovet om å slippe å ta på skjermen med skitne hender.

## 5. Tverrgående krav (NFR)

- **NFR-1 Kjørbarhet:** Appen kan installeres og startes lokalt etter README med Node.js og npm, uten egen databaseserver, betalte kontoer eller nøkler. Hele kjerneflyten (import, visning, skalering, lagring, mapper, favoritter) virker uten nøkkel. Kontoer (FR-27) er lokale i appen og krever ingen ekstern tjeneste.
- **NFR-2 Testbarhet:** Import testes mot lagrede testsider i `test/fixtures/`, ikke mot nettet. Forslag testes mot lagrede eksempelsvar. Alle eksemplene i FR-8 er automatiske tester.
- **NFR-3 Ytelse:** Henting av en kilde avbrytes etter 10 sekunder, og svar over 2 MB avvises. Skalering oppdateres uten merkbar forsinkelse. Grensene for språkmodellen står i NFR-8.
- **NFR-4 Sikkerhet:** Nøkler ligger bare i `.env`, som ikke versjoneres; `.env.example` følger med uten ekte verdier. Import henter bare http/https-adresser, begrenser størrelse på svaret, kjører ikke skript fra kilden og viser ikke HTML fra kilden ufiltrert. Adresser til lokal maskin og interne nett avvises `[ANTAKELSE: viktig selv om appen kjøres lokalt]`.
- **NFR-5 Tilgjengelighet og design:** Fungerer fra 360 px bredde (mobil) til desktop. Lesbar tekststørrelse på kjøkkenbenken. Kontrast etter WCAG 2.1 AA, alle handlinger kan nås med tastatur, og alle skjemafelt har etiketter.
- **NFR-6 Språk:** Grensesnitt, meldinger og forslag er på norsk (bokmål).
- **NFR-8 Grenser for språkmodellen (lagt til 2026-11-12):** Et kall til språkmodellen avbrytes etter 20 sekunder, og en feil eller et tidsavbrudd gir en norsk melding mens resten av oppskriften virker (FR-10). Maks 10 kall per minutt per app-prosess; over grensen får brukeren den samme norske meldingen som ved andre feil (FR-10), og oppskriften virker som før. Oppskriften som sendes, kuttes ved 8000 tegn, og svaret begrenses til 700 tokens. Standardmodellen er det billigste nivået hos leverandøren (`claude-haiku-5-5`); modellen kan byttes med `LLM_MODEL`. Kostnaden i testing er null: alle automatiske tester og ende-til-ende-tester kjører uten nøkkel mot lagrede svar (NFR-2), og funksjonen testes mot ekte modell bare manuelt.
- **NFR-9 Lagring i nettleseren (lagt til 2026-11-12):** Det eneste som lagres i nettleseren, er den sist sette handlelisten (FR-37), og den slettes ved utlogging. Service workeren lagrer bare statiske filer og siden «Du er frakoblet», aldri oppskrifter eller svar fra serveren.
- **NFR-7 Personvern og opphavsrett:** Ingen personopplysninger samles inn i v1. Fra versjon 2 lagres bare e-post og en hash av passordet (aldri passordet), lokalt i databasen. Oppskrifter er til personlig bruk, viser alltid kilde og lagrer ikke bilder fra kilden.

## 6. Ikke-mål

- RecipeMate lager ikke nye oppskrifter med KI og er ikke en oppskriftsdatabase eller søkemotor for nettet.
- RecipeMate er ikke et sosialt nettverk: ingen kommentarer, ingen offentlige profiler, ingen anbefalinger til fremmede og ingen felles oppskriftsdatabase. Oppdatert 2026-11-12: deling finnes, men er begrenset til én navngitt konto brukeren selv inviterer, og gir bare lesing (FR-38). Offentlig lenke til én oppskrift er kandidat (FR-41). Vurdering med stjerner (FR-34) er privat og vises bare for eieren, også i en delt samling.
- RecipeMate er ikke et ernærings- eller kostholdsverktøy.
- RecipeMate er ikke en skytjeneste med synkronisering mellom enheter. (Lokale kontoer kom i versjon 2, FR-27.)

## 7. MVP-omfang

### 7.1 Med i v1
- Import fra lenke (FR-1–FR-3) og manuell innlegging (FR-4)
- Visning i fast format med avkrysning (FR-5, FR-6, FR-17)
- Skalering (FR-7–FR-9)
- Forbedringsforslag med demomodus (FR-10–FR-12)
- Lagring, redigering, mapper, favoritter og oversikter (FR-13–FR-16, FR-18)

### 7.2 Ikke med i v1
- Ingredienssubstitusjoner, automatisk handleliste, egne notater, søk og filtrering, kostholdspreferanser og allergier, tidsplan, import fra bilder, ukemenyer (fra briefen). Handleliste og søk og filtrering kom i versjon 2 (FR-20, FR-23).
- Konto og synkronisering (se §6). Lokale kontoer kom i versjon 2 (FR-27); synkronisering er fortsatt utenfor.
- Konvertering mellom enheter (f.eks. ss til dl). Omregning mellom dl og gram og fra amerikanske mål kom i versjon 2 (FR-22).
- KI som reserve for import fra sider uten oppskriftsdata.

**Hvis tid (oppdatert 2026-11-12):** 1) ~~søk og filtrering i samlingen~~ levert i versjon 2 (FR-20). 2) KI som reserve for import fra sider uten oppskriftsdata — fortsatt ikke bygget, og ikke prioritert foran kandidatene i §4.7. 3) Ingredienssubstitusjoner — fortsatt ikke bygget. Kandidatene i §4.7 (FR-41, FR-39, FR-42) står foran disse.

## 8. Suksessmål

Målt i en brukertest med 5 testbrukere og de samme fem lagrede oppskriftslenkene. Hvert mål gjelder: minst 4 av 5 (80 %) fullfører uten hjelp.

**Primære**
- **SM-1:** Importere en oppskrift via lenke. Validerer FR-1, FR-5.
- **SM-2:** Skalere oppskriften til et annet antall porsjoner med riktige mengder. Validerer FR-7, FR-8.
- **SM-3:** Finne, forstå og ta i bruk et forslag. Validerer FR-10, FR-11.
- **SM-4:** Lagre oppskriften i en mappe og markere den som favoritt. Validerer FR-13–FR-15.
- **SM-5:** Finne igjen en lagret oppskrift via mappe eller favoritter. Validerer FR-16.

**Sekundære**
- **SM-6:** Alle automatiske tester for skalering (FR-8) og import fra testsider (FR-1, FR-2) er grønne.
- **SM-7:** Testbrukerne svarer om forslagene var relevante for oppskriften (ja/nei). Brukes som tilbakemelding, ikke som krav.

**For versjon 2 og Epic 6 (lagt til 2026-11-12)**
- **SM-8:** Testbrukeren lager en handleliste for en uke og krysser av i butikken uten hjelp. Validerer FR-23, FR-31, FR-37.
- **SM-9:** Alle automatiske tester og ende-til-ende-tester for v2 og Epic 6 er grønne, og appen virker uten nøkkel til språkmodell. Validerer NFR-1, NFR-2.
- **SM-10:** Maja installerer appen på hjemskjermen på sin egen telefon, slår av nettet og får opp handlelisten. Validerer FR-37. (Ikke gjennomført ennå.)

**Mål som ikke skal optimaliseres**
- **SM-C1:** Andel kilder som «importeres». Å vise oppskrifter med feil data for å få flere vellykkede importer er verre enn en tydelig feilmelding. Motvekt til SM-1.
- **SM-C2:** Antall forslag. Flere forslag er ikke bedre; få og konkrete forslag foretrekkes. Motvekt til SM-3.

## 9. Åpne spørsmål

1. ~~Hvilke norske kilder har oppskriftsdata i HTML-en?~~ Avgjort 2026-11-05: de lagrede testsidene i `test/fixtures/` viser hvilke som virker, og import mot dem er automatisk testet (NFR-2).
2. ~~Hvilken språkmodell og leverandør brukes, og hva koster den i testing?~~ Avgjort 2026-11-12: Anthropic, standardmodell `claude-haiku-5-5` (billigste nivå), med grensene i NFR-8. Kostnaden i testing er null, fordi testene kjører uten nøkkel mot lagrede svar.
3. Er det greit å lagre ingredienser og steg fra andre sider for personlig bruk? Spørres faglærer. Påvirker ikke arkitekturen, men må avklares før innlevering.
4. ~~Skal mengder i g og ml under 100 også avrundes?~~ Avgjort 2026-11-04: ja, til hele tall (37,5 g → 38 g). Se FR-8 regel 4.

## 10. Antakelser

- §4.3 FR-7 — Øvre grense for porsjonsantall er 50.
- §4.3 FR-9 — Listen over enheter dekker testsidene og utvides ved behov.
- §4.5 FR-13 — Import av en lenke som allerede er lagret gir beskjed i stedet for duplikat.
- §4.5 FR-14 — Oppskrifter i en slettet mappe blir liggende uten mappe.
- §5 NFR-4 — Adresser til lokal maskin og interne nett avvises ved import.
- §4.2 FR-17 — Avkrysning lagres ikke når oppskriften lukkes.
- §4.3 FR-8 — Enheter bøyes ikke i flertall («2 boks tomater»).
- §4.7 FR-38 — Deling krever at mottakeren har en konto fra før; invitasjon på e-post til noen uten konto er ikke bygget.
