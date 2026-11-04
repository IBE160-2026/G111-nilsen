---
stepsCompleted: [1, 2, 3, 4]
inputDocuments:
  - _bmad-output/planning-artifacts/prds/prd-RecipeMate-2026-11-04/prd.md
  - _bmad-output/planning-artifacts/prds/prd-RecipeMate-2026-11-04/addendum.md
  - _bmad-output/planning-artifacts/architecture/architecture-RecipeMate-2026-11-04/ARCHITECTURE-SPINE.md
  - _bmad-output/planning-artifacts/ux-designs/ux-RecipeMate-2026-11-04/DESIGN.md
  - _bmad-output/planning-artifacts/ux-designs/ux-RecipeMate-2026-11-04/EXPERIENCE.md
---

# RecipeMate – oppdeling i epics og stories

## Oversikt

Dette dokumentet deler kravene fra PRD, UX (DESIGN.md og EXPERIENCE.md) og arkitektur inn i epics og stories som kan implementeres én og én. Krav-ID-ene (FR, NFR, AD, UX-DR) er de samme som i kildedokumentene, slik at hver story og commit kan spores tilbake.

## Kravoversikt

### Funksjonelle krav

- FR-1: Brukeren kan importere en oppskrift ved å lime inn en lenke til en kilde med oppskriftsdata (schema.org `Recipe`); tittel, kilde, porsjonsantall, ingredienslinjer med seksjoner og steg vises, norsk og engelsk, uten bilder.
- FR-2: Når import feiler (ugyldig lenke, siden kunne ikke hentes, ingen oppskrift funnet inkl. oversiktssider), vises en norsk feilmelding med årsak og tilbud om manuell innlegging; appen krasjer ikke.
- FR-3: Mangler eller er porsjonsantallet utolkbart, spør appen før skalering; vanlige formater tolkes («4 porsjoner», «Serves 6», liste); opprinnelig porsjonsantall kan alltid endres.
- FR-4: Manuell innlegging via skjema (tittel, porsjonsantall, ingredienser og steg én per linje) med samme tolking, visning, skalering og lagring som import; validering med forklarende meldinger.
- FR-5: Fast format: tittel, kilde som lenke, porsjonsvelger, ingredienser per seksjon, nummererte steg, forslag.
- FR-6: Utolkbare ingredienslinjer vises med originaltekst og skaleres ikke; linjer med mengde men uten navn vises og skaleres.
- FR-7: Brukeren velger antall personer 1–50 med −/+ og inntasting; umiddelbar oppdatering; ugyldig verdi avvises; tilbakestill til opprinnelig.
- FR-8: Skaleringsregler (enhet beholdes, brøktegn innen 5 %, ellers én desimal med komma, udelelige rundes og merkes «ca.», g/ml over 100 til to gjeldende sifre, områder i begge ender, tekst uten tall uendret) med 10 eksempler som fasit.
- FR-9: Tolking av mengder (heltall, desimal med komma/punktum, brøk, brøktegn, blandet tall, områder, enhet uten mellomrom) og norske og engelske enheter.
- FR-10: Brukeren kan be om 1–3 forslag på norsk, knyttet til oppskriften, med begrunnelse; feil eller ugyldig svar gir melding uten å påvirke resten.
- FR-11: Brukeren kan ta i bruk eller hoppe over forslag; valgte forslag lagres og vises merket; kan fjernes; ingredienser og steg endres ikke.
- FR-12: Uten nøkkel gir appen eksempelforslag merket som eksempler; hele kjerneflyten virker uten nøkkel.
- FR-13: Lagre og slette oppskrifter (med bekreftelse); lagret etter omstart, inkl. sist valgte porsjonsantall og valgte forslag; duplikat-import gir beskjed og lenke.
- FR-14: Mapper: opprette, gi nytt navn (1–40 tegn, unikt uten hensyn til store/små bokstaver), slette (oppskrifter blir liggende uten mappe); en oppskrift i maks én mappe.
- FR-15: Favoritter: markere/avmarkere uavhengig av mappe; egen visning; synlig i oppskrift og lister.
- FR-16: Finne igjen: samlingen, én mappe og favoritter, sist lagret/åpnet først, med tittel, kilde og favorittmerke; tomme visninger forklarer og gir vei videre.
- FR-17: Avkrysning av ingredienslinjer og steg under matlaging; påvirker ikke skalering; lagres ikke.

### Ikke-funksjonelle krav

- NFR-1: Kjøres lokalt etter README med Node.js og npm, uten databaseserver, betalte kontoer eller nøkler; kjerneflyten virker uten nøkkel.
- NFR-2: Import testes mot lagrede testsider, forslag mot lagrede eksempelsvar; alle FR-8-eksempler er automatiske tester.
- NFR-3: Henting avbrytes etter 10 s; skalering uten merkbar forsinkelse.
- NFR-4: Nøkler bare i `.env` (ikke i git), `.env.example` uten ekte verdier; import bare http/https, størrelsesgrense, ingen skript, ingen ufiltrert HTML, lokale/interne adresser avvises.
- NFR-5: Fra 360 px til desktop; lesbar på kjøkkenbenken; WCAG 2.1 AA-kontrast, tastatur, etiketter.
- NFR-6: Grensesnitt, meldinger og forslag på norsk bokmål.
- NFR-7: Ingen personopplysninger; kilde vises alltid; ingen bilder fra kilden.

### Tilleggskrav fra arkitekturen

- Oppstart: Next.js 16.4 med TypeScript og App Router (create-next-app), ESLint og Prettier. Dette blir Epic 1, Story 1.
- Mappestruktur og avhengighetsretning etter spinen: `src/domain` (ren), `src/server/{ports,adapters,services,db}`, `src/app`, `src/components`, `src/lib` (AD-1).
- Drizzle ORM + better-sqlite3; ett skjema i `src/server/db/schema.ts`; migrasjoner i `drizzle/` committes; database i `data/recipemate.db`, ignorert i git; npm-skript for migrasjon (AD-6).
- Originaltekst og tolkede felt lagres; skalering beregnes ved visning (AD-2).
- Skriving via Server Actions med zod-validering; lesing i Server Components; ingen REST-ruter (AD-3).
- Import som rørledning med `RecipeSourceFetcher`-port, HTTP-adapter og fixture-adapter; duplikatsjekk på normalisert `sourceUrl` i import-service (AD-4).
- `SuggestionProvider`-port med mock (standard) og språkmodell-adapter; zod-validert svar; bare valgte forslag lagres (AD-5).
- `Result<T, AppError>` med faste `kind`-verdier; alle norske feilmeldinger i `src/lib/messages.ts` (AD-7).
- Sikker henting: http/https, avvis private adresser også etter omdirigering, 10 s, 2 MB (AD-8).
- Miljøvariabler kun i `src/server/config.ts`; `.env.example` (AD-9).
- Avkrysning i klienttilstand (AD-10).
- Testlag: Vitest for domene og import, Playwright ende-til-ende med midlertidig database og mock; ingen nettverkskall i tester (AD-11).
- README med installasjon, migrasjon, kjøring, testing og lenker til planleggingsdokumentene (NFR-1, sensorveiledning kriterium 6).
- Valg av språkmodell er utsatt til forslags-epicen; skal være billig og støtte JSON.

### UX-designkrav

- UX-DR1: Designtokens fra DESIGN.md som CSS-variabler i `src/styles/tokens.css`, lys og mørk palett som følger `prefers-color-scheme`; ingen hardkodede farger i komponenter.
- UX-DR2: Typografi: Georgia for tittel (28 px) og overskrifter (20 px), systemfont 17 px brødtekst, halvfete tabulære tall for mengder, etiketter 12 px store bokstaver, meta 14 px.
- UX-DR3: Toppmeny (Importer, Samlingen, Mapper, Favoritter) med aktiv markering; under 768 px logo på egen linje og menyen fordelt over bredden; punkter minst 44 px høye.
- UX-DR4: Porsjonsvelger: «Antall personer», runde −/+ (44 px), tall i Georgia 24 px, «oppr. N · endre», «Tilbakestill til N», feilmelding under feltet ved ugyldig verdi.
- UX-DR5: Ingredienslinje: mengde i egen kolonne, navn, «ca.»-merke i aksentfarge, utolkbare linjer i kursiv dempet tekst; ingrediensseksjoner som etiketter.
- UX-DR6: Avkrysning: ekte avkrysningsboks med etikett, trykk på hele linjen, gjennomstreking og dempet tekst når krysset av; også for steg.
- UX-DR7: Forslagskort: tint bakgrunn, forslag halvfet, begrunnelse i meta, «Ta i bruk»/«Hopp over», merket «Tatt i bruk» med «Fjern», «Eksempelforslag» i demomodus, plassholdere og «Lager forslag …» ved lasting, feilmelding ved feil.
- UX-DR8: Feilmelding-komponent med 4 px venstrekant i aksentfarge, tittel og forklaring, `role="alert"`, valgfri handling («Legg inn selv»).
- UX-DR9: Lagre-linje fast nederst på oppskriftssiden: «Lagre» før lagring; mappevalg og hjerte etter lagring.
- UX-DR10: Oppskriftskort i lister: tittel i Georgia 18 px, kilde og mappe i meta, hjerte som kan trykkes uten å åpne.
- UX-DR11: Tomme tilstander for samling, mappe og favoritter med forklaring og knapp videre.
- UX-DR12: Statusmelding («Lagret i Hverdag.») i 3 s, `aria-live`.
- UX-DR13: Dialoger: «Hvor mange er oppskriften laget for?», «Lagre i mappe» (velg, ny, ingen), «Slette oppskriften?», «Slette mappen?»; tastaturtilgjengelige med fokusfelle og Escape.
- UX-DR14: Import-tilstander: lenkefelt med fokus ved åpning, Enter starter, knapp «Henter oppskriften …» og deaktivert under henting, tre feilvarianter, lenken står igjen.
- UX-DR15: Oppskriftsoppsett: én kolonne under 768 px (tittel, kilde, porsjonsvelger, ingredienser, forslag, steg); fra 768 px ingredienser venstre og steg høyre, maks 1040 px bredde.
- UX-DR16: Tilgjengelighet: synlig fokus, logisk tabulatorrekkefølge, etiketter og `aria-describedby` på skjemafelt, endret porsjonsantall annonseres, tekst kan forstørres til 200 %.
- UX-DR17: Stemme: norsk bokmål, du-form, verb på knapper, korte bekreftelser, feilmeldinger som sier hva som skjedde og hva man kan gjøre (EXPERIENCE.md Voice and Tone).

### Dekning av krav

- FR-1: Epic 2 – importere fra lenke
- FR-2: Epic 2 – feilmelding når import feiler
- FR-3: Epic 2 – porsjonsantall som mangler eller er feil
- FR-4: Epic 1 – manuell innlegging
- FR-5: Epic 1 – fast format
- FR-6: Epic 1 – utolkbare ingredienslinjer
- FR-7: Epic 1 – velge antall personer
- FR-8: Epic 1 – skaleringsregler
- FR-9: Epic 1 – tolking av mengder og enheter
- FR-10: Epic 4 – be om forslag
- FR-11: Epic 4 – ta i bruk forslag
- FR-12: Epic 4 – demomodus uten nøkkel
- FR-13: Epic 3 – lagre og slette
- FR-14: Epic 3 – mapper
- FR-15: Epic 3 – favoritter
- FR-16: Epic 3 – finne igjen
- FR-17: Epic 1 – avkrysning under matlaging

## Epic-liste

### Epic 1: Les og skaler en oppskrift
Brukeren kan legge inn en oppskrift selv, se den i fast format, skalere den til et annet antall personer og krysse av ingredienser og steg under matlaging. Epicen setter også opp prosjektet, designtokens, toppmeny, database og testoppsett.
**Krav:** FR-4, FR-5, FR-6, FR-7, FR-8, FR-9, FR-17

### Epic 2: Importer oppskrift fra lenke
Brukeren kan lime inn en lenke og få oppskriften inn i appen, med tydelige feilmeldinger og spørsmål om porsjonsantall når kilden mangler det.
**Krav:** FR-1, FR-2, FR-3

### Epic 3: Ta vare på og finn igjen
Brukeren kan lagre og slette oppskrifter, sortere dem i mapper, markere favoritter og finne dem igjen.
**Krav:** FR-13, FR-14, FR-15, FR-16

### Epic 4: Forbedringsforslag
Brukeren kan få 1–3 konkrete forslag til oppskriften og ta dem i bruk, også uten nøkkel til språkmodell (eksempelforslag).
**Krav:** FR-10, FR-11, FR-12

NFR og UX-DR dekkes i storiene som trenger dem. README oppdateres i siste story i hver epic. En oppskrift lagres i databasen fra Epic 1 som «ikke lagret i samlingen»; Lagre i Epic 3 flytter den inn i samlingen.

## Epic 1: Les og skaler en oppskrift

Brukeren kan legge inn en oppskrift selv, se den i fast format, skalere den til et annet antall personer og krysse av ingredienser og steg under matlaging.

### Story 1.1: Start appen med toppmeny og visuell profil

Som Ida (student),
vil jeg åpne RecipeMate og se en ryddig app med meny til alle hoveddelene,
slik at jeg forstår hva appen kan gjøre og finner frem.

**Akseptansekriterier:**

**Gitt** at prosjektet er satt opp med create-next-app (Next.js 16.4, TypeScript, App Router) og mappestrukturen fra arkitekturen (AD-1)
**Når** jeg kjører `npm install` og `npm run dev` og åpner appen
**Så** vises Importer-siden med toppmenyen Importer, Samlingen, Mapper og Favoritter, og aktiv side er markert (UX-DR3)
**Og** sidene Samlingen, Mapper og Favoritter finnes med en tom-tilstand og forklarende tekst (UX-DR11)

**Gitt** en skjerm under 768 px
**Når** siden vises
**Så** ligger logoen på egen linje og menypunktene på linjen under, hvert minst 44 px høyt (UX-DR3)

**Gitt** at systemet står på mørk modus
**Når** appen vises
**Så** brukes den mørke paletten fra DESIGN.md, og alle farger kommer fra CSS-variablene i `src/styles/tokens.css` (UX-DR1, UX-DR2)

**Gitt** prosjektet
**Når** jeg kjører `npm test` og `npm run lint`
**Så** kjører Vitest og ESLint uten feil
**Og** `src/server/config.ts` er eneste sted som leser miljøvariabler, `.env.example` finnes, `src/lib/result.ts` definerer `Result<T, AppError>`, og README beskriver installasjon og kjøring (AD-7, AD-9, NFR-1)
**Og** all tekst brukeren ser er norsk bokmål, og `html lang="nb"` er satt (NFR-6)

### Story 1.2: Tolk mengder og ingredienslinjer

Som Ida,
vil jeg at appen forstår ingredienslinjer som «1 ½ dl fløte» og «750g potet»,
slik at mengdene kan regnes om riktig.

**Akseptansekriterier:**

**Gitt** domenefunksjonen `parseLine` i `src/domain/` (uten avhengigheter til server eller UI, AD-1)
**Når** den får linjer med heltall, desimal med komma og punktum, brøk (1/2), brøktegn (½), blandet tall (1 ½ og 1 1/2) og områder (2–3, 2-3)
**Så** returneres riktig mengde (`{ min, max? }`), enhet og ingrediensnavn (FR-9)

**Gitt** en linje med enhet rett etter tallet (750g, 2dl)
**Når** den tolkes
**Så** gjenkjennes enheten

**Gitt** de norske enhetene g, kg, ml, dl, l, ss, ts, krm, stk, fedd, pk, boks, never og de engelske g, kg, ml, l, tbsp, tsp, cup, oz, lb
**Når** de står i en linje
**Så** normaliseres de til faste nøkler fra én enhetstabell i domenet

**Gitt** linjer uten mengde («nutmeg», «salt og pepper», «en klype salt»)
**Når** de tolkes
**Så** markeres de som ikke tolkbare og beholder originalteksten (FR-6)

**Gitt** en linje med mengde men uten ingrediensnavn («2 ss»)
**Når** den tolkes
**Så** er den tolkbar med tomt navn

**Og** alle tilfellene over er dekket av enhetstester i Vitest (AD-11)

### Story 1.3: Skaler og formater mengder

Som Tor (familie på fem),
vil jeg at mengdene regnes om etter faste regler,
slik at jeg kan stole på tallene uten å regne selv.

**Akseptansekriterier:**

**Gitt** domenefunksjonene `scaleLine(line, factor)` og `formatQuantity` i `src/domain/`
**Når** de brukes på de 10 eksemplene i PRD FR-8 (opprinnelig 4 personer)
**Så** blir resultatet nøyaktig som i tabellen, for eksempel «750 g potet» til 3 personer gir «560 g potet» og «1 egg» til 3 gir «1 egg (ca.)» (FR-8)

**Gitt** et resultat innenfor 5 % av ½, ¼, ¾, ⅓ eller ⅔
**Når** det formateres
**Så** vises brøktegnet, eventuelt med heltall foran; ellers vises desimal med komma og maks én desimal

**Gitt** en udelelig ingrediens (egg, løk, fedd, stk)
**Når** den skaleres
**Så** rundes den til nærmeste hele tall, minst 1, og merkes «ca.» når avrundingen endret verdien

**Gitt** g eller ml over 100
**Når** de skaleres
**Så** avrundes de til to gjeldende sifre

**Gitt** en linje som ikke er tolkbar
**Når** den skaleres
**Så** returneres den uendret

**Og** skalering bruker alltid originalmengden, ikke en tidligere skalert verdi (AD-2), og alle 10 eksemplene er egne tester (NFR-2)

### Story 1.4: Legg inn en oppskrift manuelt

Som Ida,
vil jeg kunne skrive inn en oppskrift selv,
slik at jeg kan bruke appen også når en oppskrift ikke finnes på nett.

**Akseptansekriterier:**

**Gitt** siden «Legg inn selv» (nås fra Importer)
**Når** jeg fyller inn tittel, antall personer, ingredienser (én per linje) og steg (én per linje) og trykker «Lagre oppskrift»
**Så** lagres oppskriften med originaltekst og tolkede felt for hver linje (AD-2), og jeg sendes til oppskriftssiden (FR-4)

**Gitt** at tittel mangler, antall personer ikke er et heltall på 1 eller mer, eller ingen ingredienslinjer er fylt inn
**Når** jeg sender skjemaet
**Så** vises en forklarende melding under feltet med feil, koblet med `aria-describedby`, og ingenting lagres (UX-DR16, UX-DR17)

**Gitt** databasen
**Når** storyen er ferdig
**Så** finnes bare tabellene denne storyen trenger (oppskrift, ingredienslinje, steg) i `src/server/db/schema.ts`, med migrasjon i `drizzle/` og npm-skript for migrasjon (AD-6)
**Og** oppskriften er lagret som «ikke i samlingen» (Epic 3 legger den i samlingen)
**Og** skriving skjer via en Server Action med zod-validering (AD-3), og feil returneres som `Result` med melding fra `src/lib/messages.ts` (AD-7)

### Story 1.5: Se oppskriften i fast format og velg antall personer

Som Ida,
vil jeg se oppskriften ryddig og velge hvor mange jeg lager mat til,
slik at alle mengder passer uten at jeg regner.

**Akseptansekriterier:**

**Gitt** en oppskrift
**Når** jeg åpner oppskriftssiden
**Så** vises tittel, kilde (eller «Lagt inn selv»), porsjonsvelger, ingredienser gruppert per ingrediensseksjon og nummererte steg, i den rekkefølgen (FR-5, UX-DR15)
**Og** utolkbare linjer vises i kursiv dempet tekst, mengder i egen kolonne og «ca.» i aksentfarge (FR-6, UX-DR5)

**Gitt** porsjonsvelgeren
**Når** jeg trykker + eller −, eller skriver et tall fra 1 til 50
**Så** oppdateres alle tolkbare mengder med en gang uten ny innlasting, og endret antall annonseres for skjermleser (FR-7, UX-DR4, UX-DR16)

**Gitt** at jeg skriver 0, 51 eller et tall som ikke er heltall
**Når** feltet mister fokus
**Så** vises en melding under feltet og forrige verdi beholdes

**Gitt** at valgt antall er ulikt opprinnelig
**Når** jeg trykker «Tilbakestill til N»
**Så** går antallet tilbake til opprinnelig

**Gitt** en skjerm på 768 px eller mer
**Når** siden vises
**Så** står ingredienser og porsjonsvelger til venstre og steg til høyre, maks 1040 px bredt (UX-DR15)

### Story 1.6: Kryss av under matlaging

Som Ida,
vil jeg krysse av ingredienser og steg mens jeg lager maten,
slik at jeg ikke mister oversikten på kjøkkenbenken.

**Akseptansekriterier:**

**Gitt** oppskriftssiden
**Når** jeg trykker hvor som helst på en ingredienslinje eller et steg
**Så** krysses den av med fylt boks, gjennomstreking og dempet tekst, og et nytt trykk fjerner avkrysningen (FR-17, UX-DR6)
**Og** avkrysning er en ekte avkrysningsboks med etikett, som kan brukes med tastatur (UX-DR16)

**Gitt** avkryssede linjer
**Når** jeg endrer antall personer
**Så** beholdes avkrysningene, og mengdene oppdateres som vanlig

**Gitt** avkryssede linjer
**Når** jeg lukker og åpner oppskriften igjen
**Så** er ingen linjer krysset av (AD-10)

**Og** README er oppdatert med hva Epic 1 inneholder og hvordan testene kjøres

## Epic 2: Importer oppskrift fra lenke

Brukeren kan lime inn en lenke og få oppskriften inn i appen, med tydelige feilmeldinger og spørsmål om porsjonsantall når kilden mangler det.

### Story 2.1: Les oppskriftsdata fra lagrede oppskriftssider

Som Ida,
vil jeg at appen forstår oppskrifter fra ulike nettsider på samme måte,
slik at alle oppskrifter vises i det samme faste formatet.

**Akseptansekriterier:**

**Gitt** `scripts/fetch-fixtures.sh` med kildene i `test/fixtures/sources.md`, utvidet med minst én side fra matprat.no og én fra godt.no
**Når** skriptet kjøres
**Så** ligger HTML-filene i `test/fixtures/html/`, og `sources.md` noterer hvilke som har `Recipe` i JSON-LD (NFR-2)

**Gitt** HTML fra en lagret side med oppskriftsdata
**Når** `extractRecipeJsonLd` og `normalizeRecipe` kjøres
**Så** får vi tittel, kildenavn, opprinnelig porsjonsantall, ingredienslinjer og steg i riktig rekkefølge (FR-1)
**Og** oppskriftsdata finnes også når de ligger i `@graph`, i en liste eller med `@type` som liste

**Gitt** steg som `HowToStep`, `HowToSection` eller én tekstblokk
**Når** de normaliseres
**Så** blir de nummererte steg, og seksjonsnavn fra `HowToSection` beholdes

**Gitt** `recipeYield` som «4 porsjoner», «Serves 6», `4` eller `["4", "4 porsjoner"]`
**Når** den tolkes
**Så** blir opprinnelig porsjonsantall 4, 6, 4 og 4; mangler eller er den utolkbar, blir den tom (FR-3)

**Gitt** HTML uten oppskriftsdata (f.eks. en oversiktsside)
**Når** den leses
**Så** returneres `Result` med `kind: 'no_recipe'` (AD-7)

**Og** testene bruker bare lagrede filer, og bilder og HTML fra kilden tas ikke med (AD-4, AD-11, NFR-7)

### Story 2.2: Importer en oppskrift fra lenke

Som Ida,
vil jeg lime inn en lenke og få opp oppskriften,
slik at jeg slipper å skrive den inn selv.

**Akseptansekriterier:**

**Gitt** Importer-siden
**Når** den åpnes
**Så** har lenkefeltet fokus, og Enter eller «Hent oppskrift» starter import (UX-DR14)

**Gitt** en lenke til en side med oppskriftsdata
**Når** jeg starter import
**Så** viser knappen «Henter oppskriften …» og er deaktivert, og deretter vises oppskriften på oppskriftssiden med kilden som lenke (FR-1, FR-5)
**Og** oppskriften er lagret som «ikke i samlingen»

**Gitt** HTTP-adapteren
**Når** den henter en side
**Så** godtar den bare http og https, avviser adresser som peker til maskinen selv, private eller lenkelokale nett (også etter omdirigering), avbryter etter 10 sekunder og leser maks 2 MB (AD-8, NFR-3, NFR-4)

**Gitt** import-service med fixture-adapteren
**Når** integrasjonstestene kjøres
**Så** importeres minst tre av de lagrede sidene riktig uten nettverkskall (AD-4, AD-11)

### Story 2.3: Forstå hvorfor en import feilet

Som Tor,
vil jeg få vite hvorfor en oppskrift ikke kunne hentes og hva jeg kan gjøre,
slik at jeg ikke står fast.

**Akseptansekriterier:**

**Gitt** en lenke som ikke er http/https eller ikke er en gyldig adresse
**Når** jeg starter import
**Så** vises meldingen om ugyldig lenke uten at noe hentes (FR-2)

**Gitt** en side som ikke svarer, svarer med feilkode, bruker mer enn 10 sekunder eller er blokkert av sikkerhetsreglene
**Når** jeg starter import
**Så** vises meldingen om at siden ikke kunne hentes

**Gitt** en side uten oppskriftsdata, for eksempel en oversiktsside
**Når** jeg starter import
**Så** vises «Fant ingen oppskrift på siden» med forklaringen fra EXPERIENCE.md

**Og** alle feilmeldinger bruker feilmeldingskomponenten (venstrekant i aksentfarge, `role="alert"`) med knappen «Legg inn selv», lenken står igjen i feltet, og tekstene kommer fra `src/lib/messages.ts` (UX-DR8, UX-DR17, AD-7)
**Og** appen krasjer ikke i noen av tilfellene, og hver feiltype har en test

### Story 2.4: Oppgi porsjonsantall når kilden mangler det

Som Ida,
vil jeg bli spurt hvor mange oppskriften er laget for når siden ikke sier det,
slik at skaleringen blir riktig.

**Akseptansekriterier:**

**Gitt** en importert oppskrift uten tolkbart porsjonsantall
**Når** oppskriften skal vises
**Så** vises dialogen «Hvor mange er oppskriften laget for?» med porsjonsvelger før skalering er mulig (FR-3, UX-DR13)
**Og** dialogen kan brukes med tastatur, holder fokus inne og lagrer valget

**Gitt** en oppskrift med porsjonsantall
**Når** jeg trykker «oppr. N · endre» og velger et nytt tall
**Så** lagres det nye opprinnelige antallet, og alle mengder regnes om fra det (FR-3)

**Og** README er oppdatert med import, testsidene og hvordan `fetch-fixtures.sh` brukes

## Epic 3: Ta vare på og finn igjen

Brukeren kan lagre og slette oppskrifter, sortere dem i mapper, markere favoritter og finne dem igjen.

### Story 3.1: Lagre og slette en oppskrift

Som Ida,
vil jeg lagre oppskrifter jeg liker og slette dem jeg ikke trenger,
slik at samlingen min bare inneholder det jeg vil ha.

**Akseptansekriterier:**

**Gitt** en oppskrift som ikke er i samlingen
**Når** jeg trykker «Lagre» i lagre-linjen nederst
**Så** legges den i samlingen, og «Lagret.» vises i 3 sekunder og leses opp av skjermleser (FR-13, UX-DR9, UX-DR12)

**Gitt** en lagret oppskrift
**Når** jeg endrer antall personer og senere åpner den igjen, også etter at appen er startet på nytt
**Så** vises sist valgte antall (FR-13)

**Gitt** en lagret oppskrift
**Når** jeg velger «Slett» og bekrefter i dialogen «Slette oppskriften?»
**Så** fjernes den fra samlingen; avbryter jeg, skjer ingenting (UX-DR13)

### Story 3.2: Se samlingen og unngå duplikater

Som Ida,
vil jeg se alle oppskriftene mine samlet,
slik at jeg finner dem igjen uten bokmerker.

**Akseptansekriterier:**

**Gitt** lagrede oppskrifter
**Når** jeg åpner Samlingen
**Så** vises de som oppskriftskort med tittel og kilde, sist lagret eller åpnet først (FR-16, UX-DR10)

**Gitt** en tom samling
**Når** jeg åpner Samlingen
**Så** vises «Du har ingen lagrede oppskrifter ennå.» og knappen «Importer din første oppskrift» (UX-DR11)

**Gitt** en lenke som allerede finnes i samlingen (også med annet fragment eller sporingsparametere)
**Når** jeg importerer den
**Så** vises «Du har allerede lagret denne oppskriften» med lenke til den, uten ny henting (FR-13, AD-4)

### Story 3.3: Sorter oppskrifter i mapper

Som Tor,
vil jeg legge oppskrifter i mapper som «Hverdag» og «Helg»,
slik at jeg finner riktig oppskrift raskere.

**Akseptansekriterier:**

**Gitt** Mapper-siden
**Når** jeg oppretter, gir nytt navn til eller sletter en mappe
**Så** vises mappene med antall oppskrifter; navn må være 1–40 tegn og unikt uten hensyn til store og små bokstaver, ellers vises en melding under feltet (FR-14)

**Gitt** en lagret oppskrift
**Når** jeg velger mappe i lagre-linjen («Lagre i mappe»: velg mappe, ny mappe eller ingen)
**Så** ligger oppskriften i den valgte mappen og ikke lenger i en eventuell tidligere mappe (FR-14, UX-DR9, UX-DR13)

**Gitt** oppskrifter i mapper
**Når** jeg åpner Samlingen
**Så** viser oppskriftskortene mappenavnet (UX-DR10)

**Gitt** en mappe med oppskrifter
**Når** jeg sletter mappen og bekrefter i «Slette mappen?»
**Så** blir oppskriftene liggende i samlingen uten mappe

**Gitt** en mappe
**Når** jeg åpner den
**Så** vises oppskriftene i mappen, eller en tom-tilstand med forklaring (FR-16, UX-DR11)

### Story 3.4: Marker favoritter

Som Ida,
vil jeg markere favorittoppskriftene mine,
slik at jeg finner dem med ett trykk.

**Akseptansekriterier:**

**Gitt** en lagret oppskrift
**Når** jeg trykker hjertet på oppskriftssiden eller på kortet i en liste
**Så** markeres eller avmarkeres den som favoritt uten at oppskriften åpnes, og markeringen vises begge steder (FR-15, UX-DR10)

**Gitt** favoritter
**Når** jeg åpner Favoritter
**Så** vises de sist brukt først; uten favoritter vises en tom-tilstand med forklaring (FR-15, FR-16, UX-DR11)

**Og** README er oppdatert med samling, mapper og favoritter

## Epic 4: Forbedringsforslag

Brukeren kan få 1–3 konkrete forslag til oppskriften og ta dem i bruk, også uten nøkkel til språkmodell.

### Story 4.1: Få forslag i demomodus

Som Tor,
vil jeg få forslag som kan gjøre retten bedre,
slik at jeg kan prøve noe nytt uten å lete etter tips selv.

**Akseptansekriterier:**

**Gitt** at `LLM_API_KEY` ikke er satt
**Når** jeg trykker «Få forslag» på en oppskrift
**Så** vises 1–3 eksempelforslag fra `test/fixtures/suggestions/` merket «Eksempelforslag», hver med forslag og begrunnelse (FR-10, FR-12, UX-DR7)

**Gitt** `SuggestionProvider`-porten
**Når** implementasjonen velges i `src/server/config.ts`
**Så** brukes mock når nøkkel mangler, og alle svar valideres med zod-skjemaet `Suggestion` før de vises; ugyldige svar avvises (AD-5)

**Gitt** at henting av forslag pågår eller feiler
**Når** forslagsdelen vises
**Så** vises plassholdere med «Lager forslag …», eller meldingen «Fikk ikke laget forslag akkurat nå. Prøv igjen senere.» mens resten av siden virker (FR-10, UX-DR7)

### Story 4.2: Ta i bruk forslag

Som Tor,
vil jeg velge hvilke forslag jeg vil bruke og finne dem igjen neste gang,
slik at oppskriften blir min egen versjon.

**Akseptansekriterier:**

**Gitt** forslag på en oppskrift
**Når** jeg trykker «Ta i bruk»
**Så** vises forslaget merket «Tatt i bruk» under «Dine valgte forslag», og det lagres med oppskriften (FR-11, UX-DR7)
**Og** ingredienslinjer og steg endres ikke

**Gitt** et forslag
**Når** jeg trykker «Hopp over»
**Så** skjules det og lagres ikke (AD-5)

**Gitt** et valgt forslag
**Når** jeg trykker «Fjern»
**Så** slettes det fra oppskriften

**Gitt** en lagret oppskrift med valgte forslag
**Når** jeg åpner den igjen
**Så** vises de valgte forslagene

### Story 4.3: Forslag fra språkmodell

Som Tor,
vil jeg få forslag laget for akkurat denne oppskriften,
slik at tipsene passer retten.

**Akseptansekriterier:**

**Gitt** at en billig språkmodell med JSON-svar er valgt og beslutningen er logget i arkitekturens memlog
**Når** `LLM_API_KEY` (og eventuelt `LLM_MODEL`) er satt i `.env`
**Så** brukes språkmodell-adapteren, som sender tittel, ingredienslinjer og steg og ber om 1–3 forslag på norsk i JSON (FR-10, AD-5, AD-9)

**Gitt** et svar fra språkmodellen
**Når** det mottas
**Så** valideres det med samme zod-skjema; feil format, tidsavbrudd eller feil fra API-et gir `kind: 'suggestion_failed'` og meldingen fra `messages.ts` (FR-10, AD-7)

**Gitt** testene
**Når** de kjøres
**Så** bruker de lagrede eksempelsvar, ingen ekte nøkkel og ingen nettverkskall (AD-11)
**Og** `.env.example` beskriver variablene uten ekte verdier, og README forklarer hvordan nøkkel settes (NFR-4)

### Story 4.4: Test hele kjerneflyten og ferdigstill README

Som sensor,
vil jeg kunne installere, kjøre og teste appen ved å følge README,
slik at jeg kan vurdere at den gjør det PRD-en lover.

**Akseptansekriterier:**

**Gitt** Playwright med midlertidig database, fixture-adapter for import og mock-forslag
**Når** `npm run test:e2e` kjøres
**Så** går testene gjennom UJ-1 (importer, skaler fra 4 til 5, lagre i mappe og marker favoritt), UJ-2 (forslag tatt i bruk, feilmelding for oversiktsside) og UJ-3 (finn igjen via Favoritter) uten nettverkskall (NFR-2, AD-11, SM-6)

**Gitt** en ren maskin med Node.js 22 eller nyere
**Når** README følges
**Så** kan appen installeres, migreres, startes og testes med kommandoer som kan kopieres, uten nøkkel (NFR-1)
**Og** README beskriver hva appen gjør og for hvem, med skjermbilde, forutsetninger, konfigurasjon, testdata, mappestruktur og lenker til PRD, UX, arkitektur, epics og `issues/`

**Gitt** appen på 360 px og på desktop, i lys og mørk modus
**Når** kjerneflyten gjennomgås med tastatur
**Så** er alt nåbart med synlig fokus, og kontrasten følger DESIGN.md (NFR-5, UX-DR16)
