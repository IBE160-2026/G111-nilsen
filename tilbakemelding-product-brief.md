# Tilbakemelding på product brief

| | |
|---|---|
| **Gruppe** | G111 – G111-nilsen |
| **Product brief** | `product-brief.md` (commit `850133f`) |
| **Tilbakemelding fra** | Faglærer i IBE160 (utarbeidet med KI-støtte) |
| **Dato** | 2026-10-06 |

## Samlet vurdering

- **Godt utgangspunkt med justeringer.** Gruppen kan gå videre og innarbeide punktene under.

**Det som er bra:**

1. Tydelig og avgrenset kjerneflyt i fem steg: importer → les → tilpass → få forslag → ta vare på. Problemene (ulik oppbygging, feil antall porsjoner, oppskrifter som blir borte) er gjenkjennelige og henger direkte sammen med funksjonene.
2. Suksesskriteriene er formulert som fem konkrete brukeroppgaver med kriterier, for eksempel «mengdene blir regnet riktig om». Det er nesten ferdige testtilfeller.
3. God avgrensning. «Ikke med i første versjon» (handleliste, allergier, ukemenyer, import fra bilder) er tydelig. Dere skiller også ærlig mellom KI-forslag som brukeren velger og automatiske endringer.

**De viktigste endringene:**

1. **Lukk punktene merket [MÅ AVKLARES] før PRD.** Det gjelder særlig de tre åpne avklaringene i Scope: om brukeren må ha konto, hvilke oppskriftssider og språk som støttes, og hva som skjer når import feiler. Dette er beslutninger dere kan ta selv. For eksempel: «v1 støtter sider som har strukturerte oppskriftsdata, og gir en tydelig feilmelding ellers».
2. **Beskriv hvordan skaleringen skal fungere.** Det er appens viktigste regel og den mest testbare delen. Hva skjer med «1 egg» til 3 personer når oppskriften er for 4? Hvordan håndteres brøker, «en klype salt» og enheter som dl og ss? Skriv noen eksempler med forventet resultat inn i briefen.
3. **Tenk på kjørbarhet og testdata for importen.** Oppskriftssider endrer seg og kan blokkere automatiske forespørsler. Lagre noen eksempelsider lokalt som testdata, slik at testene og sensor ikke er avhengige av at nettsidene er uendret.

## Vanskelighetsgrad og gjennomførbarhet

### Vurdert vanskelighetsgrad

- **Enkel**

**Sammenlignbart med:** 6) To-do-liste med smarte etiketter (enkel). Begge er CRUD med lagring, organisering i mapper eller lister og én avgrenset KI-funksjon. Import fra nettsider og skalering med enheter gjør RecipeMate til et litt mer krevende enkelt prosjekt.

**Begrunnelse:**

| Faktor | Nivå (lav / middels / høy) | Kommentar |
|---|---|---|
| Domenelogikk – hvor mange og hvor kompliserte regler og beregninger må stemme? | middels | Skalering av mengder med brøker, enheter og ingredienser som ikke kan deles. Reglene er forståelige og godt egnet for tester. |
| Datamodell – antall entiteter og relasjoner mellom dem | lav | Oppskrift, ingrediens, steg, mappe og favoritt, eventuelt bruker. |
| Brukere, roller og innlogging | lav | Én rolle. Om det trengs konto er ikke avklart. Uten konto blir det enklere. |
| KI-funksjonalitet i appen, f.eks. kall til språkmodell, prompts i koden og håndtering av usikre svar | middels | Forslag til forbedringer knyttet til oppskriften. KI kan også brukes som reserve for å tolke oppskrifter fra sider uten strukturerte data. |
| Integrasjoner og eksterne tjenester, f.eks. API-er, betaling og e-post | middels | Henting og tolking av eksterne nettsider (uten API) og et LLM-API. |
| Sanntid, samtidighet eller flere brukere som påvirker hverandre | lav | Ingen. |
| Filhåndtering, f.eks. opplasting, PDF-lesing og eksport | lav | Ingen opplasting. Import av bilder er bevisst utelatt. |
| Sikkerhet og personvern | lav | Lite personopplysninger. Vær bevisst på opphavsrett når dere lagrer kopier av oppskrifter. |

**Hva vanskelighetsgraden betyr for dere:**

- _Enkel:_ Et enkelt prosjekt gir stor sjanse for å bli ferdig. Vanskelighetsgraden inngår likevel i vurderingen, så for å nå helt opp må dere vise mer i gjennomføringen. Det betyr særlig et gjennomarbeidet design, grundig testing, en tydelig dokumentert prosess og en README som virker. Skaleringslogikken gir dere en god mulighet til å vise grundig testing.

### Gjennomførbarhet med BMAD og Claude Code

Dere skal planlegge med BMAD (product brief → PRD → arkitektur → epics og stories) og implementere med Claude Code. Vurderingen under tar hensyn til at det må være tid til hele denne flyten, og til testing, retting og README til slutt.

| Spørsmål | Vurdering (OK / risiko / stor risiko) | Kommentar |
|---|---|---|
| **Tid og omfang** – kan v1 realistisk bli ferdig og stabil i løpet av semesteret, med tid til flere iterasjoner? | OK | Sju avgrensede funksjoner i én flyt er realistisk, med tid til testing og forbedring. |
| **BMAD-flyten** – er briefen konkret nok til at PRD, arkitektur og stories kan lages uten store hull, og blir det overkommelig mange stories? | risiko | Flere [MÅ AVKLARES] gjør at PRD-en får hull. Lukk dem først. BMAD er ikke satt opp i repoet ennå. |
| **Egnet for Claude Code** – bruker løsningen en vanlig, godt dokumentert teknologistakk som Claude Code håndterer godt, eller krever den nisjeteknologi, spesialmaskinvare eller mye manuell konfigurasjon? | OK | En vanlig webapp med database. Henting av strukturerte oppskriftsdata fra nettsider er et godt dokumentert problem. |
| **Kontroll på KI-ens arbeid** – kan gruppen selv avgjøre om koden gjør det riktige? Krever domenet kunnskap gruppen ikke har, f.eks. avanserte beregninger eller fagregler, så er det vanskelig å kvalitetssikre. | OK | Dere kan selv regne ut riktig skalering og vurdere om forslagene gir mening for retten. |
| **Testbarhet** – finnes det tydelige regler og forventede resultater som tester kan skrives mot? | OK | Skalering, import fra lagrede eksempelsider, mapper og favoritter kan testes godt automatisk. |
| **Kjørbar for sensor** – kan appen kjøres lokalt etter README, uten gruppens nøkler, betalte kontoer eller egen infrastruktur? | risiko | Forbedringsforslagene krever en LLM-nøkkel, og importen er avhengig av eksterne sider. Planlegg at import, skalering og lagring fungerer uten nøkkel, og ha lagrede eksempelsider. |
| **Avhengigheter og kostnader** – krever løsningen betalte API-er, f.eks. språkmodeller, og finnes det en plan for kostnad, testmodus eller mock-data? | risiko | Ikke omtalt. Beskriv hvilken LLM dere vil bruke, og lagre eksempelsvar til testene. |

**Konklusjon om gjennomførbarhet:**

- **Gjennomførbart som beskrevet.**

**Forslag til justering av omfang eller vanskelighetsgrad:**

1. Behold v1, men skriv en prioritert «hvis tid»-liste. Søk og filtrering eller ingredienssubstitusjoner er naturlige første utvidelser som også gir mer å vise.
2. Vurder å bruke KI som reserve for import fra sider uten strukturerte oppskriftsdata. Det gjør importen mer robust og gir en ekstra, testbar KI-funksjon.

## Hvorfor product brief er viktig for mappen

Product brief er utgangspunktet for PRD, arkitektur, stories og til slutt koden. Del 1 av mappen vurderes blant annet på om sensor kan følge en sporbar vei fra plan til ferdig app. Den vurderes også på om appen gjør det dere har beskrevet, om den er testet, om den er godt designet, og om den kan kjøres etter README. Et uklart, for stort eller for lite brief gjør alt dette vanskeligere senere. Det er mye enklere å rette nå enn sent i semesteret.

## 1. Gjennomgang av briefens deler

| Del av brief | Status | Kommentar |
|---|---|---|
| Executive Summary – er det klart hva appen er, og hvilket problem den løser? | OK | Tydelig: fra lenke til tilpasset og lagret oppskrift på ett sted. |
| The Problem – er problemet konkret, med reelle situasjoner og brukere? | OK | Fire konkrete frustrasjoner som alle henger sammen med en funksjon. |
| The Solution – beskriver løsningen brukeropplevelsen, ikke bare teknologi? | OK | De fem stegene beskriver brukeropplevelsen uten teknologi. |
| What Makes This Different – er vurderingen ærlig og realistisk? | Juster | Konkurrentlandskapet er merket [MÅ AVKLARES]. Det finnes flere oppskriftsapper med import og skalering. Undersøk noen, og vær ærlig om at kombinasjonen med oppskriftsknyttede forslag er det som skiller dere ut. |
| Who This Serves – er primærbrukerne tydelige, og vet vi hva de trenger? | Juster | Hjemmekokker er en god start. Målgruppen er merket [MÅ AVKLARES]. Beskriv én typisk bruker, for eksempel en student som lager mat til seg selv eller en familie på fem. |
| Success Criteria – kan kriteriene faktisk sjekkes eller testes? | OK | Fem konkrete oppgaver. Bestem antall testbrukere og hvilke oppskriftslenker som brukes. |
| Scope – er det klart hva som er med i første versjon, og hva som ikke er det? | Juster | Med og ikke med er tydelig, men de tre åpne avklaringene må lukkes. |
| Vision – henger visjonen sammen med resten uten å blåse opp omfanget? | OK | Utvidelsene er tydelig plassert utenfor v1. |

## 2. Utgangspunkt for del 1 av mappen

Punktene følger kriteriene i sensorveiledningen for del 1. Vektene i parentes viser hvor mye hvert kriterium teller i del 1.

| Kriterium i del 1 | Hva briefen bør legge til rette for | Status | Kommentar |
|---|---|---|---|
| **1. Prosess og KI-styring** (30 %) | Brief som er presis nok til at PRD og stories kan bygges direkte på den, slik at krav kan spores fra brief til kode. | Juster | Briefen er et godt grunnlag når [MÅ AVKLARES]-punktene er lukket. Sett opp BMAD og flytt briefen til en planleggingsmappe. |
| **2. Funksjonalitet og omfang** (20 %) | Realistisk omfang for gruppen og semesteret: en tydelig kjerneflyt som kan bli ferdig og stabil, og nok innhold til å vise reell funksjonalitet. | OK | Tydelig kjerneflyt som kan bli ferdig. Planlegg én utvidelse for å ha mer å vise. |
| **3. Kvalitetssikring og testing** (15 %) | Suksesskriterier og funksjoner som er konkrete nok til å bli testtilfeller. | OK | Brukeroppgavene og skaleringsreglene er gode testtilfeller. Skriv eksempler med fasit. |
| **4. Design og brukeropplevelse** (10 %) | Tydelige brukere og brukssituasjoner som designet kan bygges rundt, gjerne med de viktigste skjermbildene eller flytene skissert. | Juster | Skisser oppskriftsvisningen og mappeoversikten. Tenk på bruk på mobil eller nettbrett på kjøkkenbenken, med stor tekst. |
| **5. Kodekvalitet og arkitektur** (10 %) | Teknologivalg som er begrunnet og ikke mer komplekse enn appen trenger. | OK | Ingen teknologi er valgt ennå. Appen trenger ikke mer enn én webapp med én database. |
| **6. README og kjørbarhet** (10 %) | Løsning som andre kan kjøre lokalt uten betalte kontoer, og uten tilgang til gruppens egne tjenester og nøkler. | Juster | Planlegg lagrede eksempeloppskrifter, `.env.example` for LLM og at kjernefunksjonene virker uten nøkkel. |
| **7. Ryddighet i repoet** (5 %) | En plan for hvor hemmeligheter, testdata og dokumentasjon skal ligge. | Juster | Legg lagrede eksempelsider i en egen testdatamappe, og hold nøkler utenfor Git. |

## 3. Neste steg for gruppen

1. Ta beslutningene for alle [MÅ AVKLARES]-punktene og oppdater briefen, særlig konto, støttede sider og feilhåndtering ved import.
2. Skriv 5–8 skaleringseksempler med forventet resultat (brøker, enheter, udelelige ingredienser) inn i briefen eller PRD-en.
3. Sett opp BMAD i repoet og lag PRD.

Oppdater product brief i repoet når dere har gjort endringene, slik at historikken viser hvordan planen utviklet seg. Det er en del av prosessen sensor ser etter.
