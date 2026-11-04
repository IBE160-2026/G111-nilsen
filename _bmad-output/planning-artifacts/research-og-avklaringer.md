# RecipeMate – research, avklaringer og forslag før PRD

| | |
|---|---|
| **Dato** | 2026-11-04 |
| **Formål** | Forberedelse til torsdag 2026-11-05 og PRD (`bmad-prd`) |
| **Status** | Utkast. Stacken i §4 er valgt. Øvrige forslag er ikke besluttet ennå. |
| **Kilde for krav** | `product-brief.md`, `tilbakemelding-product-brief.md`, Sensorveiledning IBE160 del 1 |

## 1. Hva research og tilbakemelding peker på

- Skalering er appens viktigste og mest testbare regel (tilbakemeldingen). Den bør få flest tester.
- Kjernen (import, skalering, lagring) må virke **uten LLM-nøkkel**, ellers kan ikke sensor kjøre appen etter README.
- Import fra eksterne sider er ustabilt. Vi trenger lagrede eksempelsider som testdata.
- Sensor vurderer sporbarhet fra plan til kode. Hver beslutning under bør derfor inn i PRD/arkitektur med begrunnelse.

## 2. Lignende løsninger

| App | Import fra nett | Skalering | KI | Prismodell | Det vi kan lære |
|---|---|---|---|---|---|
| Paprika 3 | Ja, innebygd nettleser og utvidelse. Markering av tekst som reserve på ukjente sider | Ja, automatisk | Ikke omtalt | Engangskjøp per plattform (iOS ca. $5, Mac/Windows ca. $30) | Reservevei for sider som ikke lar seg importere. Funksjonsrik (handleliste, måltidsplan), men ingen forslag til forbedring av retten |
| AnyList | Ja (krever betalt «Complete», ca. $8/år) | Ja (betalt) | Ikke omtalt | Gratis grunnapp + abonnement | Fokus på handleliste. Svak på selve oppskriftsvisningen |
| Recipe Keeper | Ja, også fra sosiale medier | Ikke omtalt | KI-oppskriftsgenerator | Gratis versjon + engangskjøp | Mange funksjoner, men mer en samling enn en tilpasningsflyt |
| Mela | Ja | Ikke omtalt i kildene | Maskinlæring som **reserve** når metadata-import feiler. Merkes med «ML» i appen | Ikke undersøkt | Samme idé som tilbakemeldingens forslag: først strukturerte data, KI bare som reserve, og vis brukeren at KI er brukt |
| Samsung Food | Ja | Ikke undersøkt | KI-drevet, personlige oppskrifter og kostholdstilpasning | Ikke undersøkt | Går bredere (planlegging, kosthold) enn vår MVP |

**Konklusjon (foreløpig):** import og skalering er standard i etablerte apper, så de skiller oss ikke ut. Det som kan skille RecipeMate er **forbedringsforslag knyttet til akkurat denne oppskriften**, i en enkel flyt, med norsk språk. Briefen bør si dette ærlig i «What Makes This Different». Merk at vi ikke har testet appene selv og at kildene delvis er anmeldelser og konkurrenters sammenligninger.

## 3. Teknisk research om import

- **Strukturerte oppskriftsdata:** schema.org `Recipe` i JSON-LD er standarden Google bruker. Relevante felt: `name`, `recipeIngredient` (én ingrediens per element, ren tekst), `recipeInstructions` (helst `HowToStep`/`HowToSection`, men kan være én tekstblokk), `recipeYield`, `prepTime`/`cookTime` (ISO 8601). Kun `name` og `image` er påkrevd hos Google. Mange sider mangler altså deler, og `recipeYield` kan være tekst som «4 porsjoner» eller en liste.
- **Kjent bibliotek:** Python-pakken `recipe-scrapers` (MIT) leser HTML (schema.org, microdata, OpenGraph) og støtter over 745 sider. Norske sider i listen: godt.no, matprat.no, tine.no, nrk.no, vegetarbloggen.no og hellofresh.no. Biblioteket henter ikke selv siden og omgår ikke bot-beskyttelse. Det viser at tilnærmingen fungerer og kan brukes som referanse for hvilke felt som varierer.
- **Ikke verifisert:** at hver av de norske sidene faktisk har fullstendig JSON-LD i dag, og om de blokkerer serverforespørsler. Dette må testes med ekte forespørsler i neste steg (se §6).
- **Ingrediensparsing:** tekst som «1 ½ dl fløte» må deles i mengde, enhet og navn. Det finnes JS-biblioteker for dette (f.eks. `parse-ingredient`), men de er laget for engelsk. Norske enheter (ss, ts, dl, krm, stk, fedd, pk) og desimalkomma må testes.

## 4. Stack (valgt)

| Del | Valg | Begrunnelse |
|---|---|---|
| App | Next.js + TypeScript | Én kodebase for UI og API, godt dokumentert, `.gitignore` er allerede satt opp for det |
| Database | SQLite (fil lokalt) via Drizzle eller better-sqlite3 | Ingen databaseserver for sensor |
| Import | Eget kall som henter HTML og leser JSON-LD (cheerio), med `User-Agent` og tydelig feilmelding | Enkelt å teste mot lagrede HTML-filer |
| Ingrediensparsing og skalering | Egen ren TypeScript-modul uten avhengighet til UI | Lett å enhetsteste mot fasit |
| KI | Tynt grensesnitt (`SuggestionProvider`) med to implementasjoner: **Mock** (standard, lagrede svar) og en ekte LLM via nøkkel i `.env` | Appen virker uten nøkkel. Mock gir stabile tester |
| Tester | Vitest (enhet og integrasjon), Playwright for 1–2 ende-til-ende-flyter | Dekker skalering, import fra fixtures og mapper/favoritter |
| Kjøring | `npm install`, `cp .env.example .env`, `npm run dev` (Node 20+) | Kort README |

Åpent: hvilken LLM og hva den koster (se §5, punkt A6).

## 5. Det som må avklares (med forslag)

Prioritet: **P1** må avgjøres før PRD, **P2** kan avgjøres i PRD, **P3** kan vente.

| # | Spørsmål | Pri | Forslag | Beslutter |
|---|---|---|---|---|
| A1 | Må brukeren ha konto? | P1 | Nei i v1. Én lokal bruker, data i lokal SQLite. Enklere for sensor og færre personopplysninger. Konto nevnes som mulig utvidelse | Maja |
| A2 | Hvilke sider og språk støttes? | P1 | Sider med schema.org `Recipe` (JSON-LD), norsk og engelsk innhold. Test mot 4–5 navngitte sider (f.eks. matprat.no, godt.no, tine.no, én engelsk side, én matblogg) | Maja |
| A3 | Hva skjer når import feiler? | P1 | Tydelig feilmelding på norsk med årsak (ugyldig lenke, siden blokkerte, ingen oppskriftsdata). Reserve: bruker kan legge inn oppskriften manuelt eller limme inn tekst. KI-reserve for tolking er «hvis tid» | Maja |
| A4 | Skaleringsregler (udelelige ingredienser, «en klype», områder) | P1 | Se §7. Må godkjennes | Maja |
| A5 | Antall testbrukere og testlenker | P2 | 5 testbrukere, de samme 5 lenkene som lagres som testdata. Mål: ≥ 80 % fullfører uten hjelp (må avtales) | Maja |
| A6 | Hvilken LLM, kostnad og testmodus | P1 | Én leverandør bak grensesnittet, billig modell, mock som standard, ekte svar lagret som eksempelsvar til tester. Avklar hva som er tilgjengelig | Maja |
| A7 | Målgruppe | P2 | Student som lager mat til seg selv og noen få andre (varierende porsjoner). Skriv også én persona i PRD | Maja |
| A8 | Opphavsrett ved lagring av kopier | P2 | Lagre ingredienser og steg for personlig bruk, vis alltid kilde og lenke til originalen, og ikke lagre bilder fra andre sider. **Må vurderes nærmere**, vi har ikke gjort en juridisk vurdering | Maja (spør faglærer ved tvil) |
| A9 | Hva er «hvis tid»-utvidelsen? | P3 | 1) Søk og filtrering 2) KI som reserve for import 3) ingredienssubstitusjon | Maja |
| A10 | Skal forslag kunne lagres på oppskriften? | P2 | Ja: bruker «tar i bruk» et forslag og det lagres som egen versjon/merknad, originalen beholdes | Maja |
| A11 | Språk i appen og dokumenter | P2 | App og UI på norsk. BMAD-konfig har dokumentspråk engelsk, men briefen er norsk. Velg ett språk for PRD og sett det i konfig | Maja |

## 6. Research som gjenstår (til torsdag)

1. **Test ekte sider:** hent 8–10 oppskriftslenker fra norske og engelske sider, lagre HTML som fixtures, og noter hvilke som har JSON-LD, hvilke felt som mangler og hvilke som blokkerer.
2. Test selv 2–3 av appene (Paprika, AnyList, Samsung Food): hvordan ser import, skalering og feilmeldinger ut? Skjermbilder til designdelen.
3. Se på hvordan norske sider skriver mengder («2 ss», «½ dl», «1 pk», «krm», «etter smak») og lag en liste over varianter.
4. Finn en LLM og prøv 3–5 oppskrifter for å se om forslagene er konkrete og trygge (ikke farlige eller meningsløse kombinasjoner).
5. Finn ut hva faglærer sier om opphavsrett ved lagring av oppskrifter.

## 7. Skaleringseksempler – Forslag (med fasit, må godkjennes)

Regler: mengden multipliseres med nytt antall / opprinnelig antall. Enheten beholdes (ingen automatisk konvertering i v1). Brøker vises som `½ ¼ ¾ ⅓ ⅔` når nærmeste verdi er innenfor ca. 5 %, ellers som desimal med komma og maks én desimal. Udelelige ingredienser (egg, løk, hvitløksfedd, stk) rundes til nærmeste hele tall (minst 1) og merkes «ca.». Tekst uten tall («en klype», «etter smak») endres ikke.

| # | Original (for 4) | Til | Forventet resultat | Hva det tester |
|---|---|---|---|---|
| 1 | 400 g mel | 6 | 600 g mel | Enkel multiplikasjon |
| 2 | ½ ts salt | 6 | ¾ ts salt | Brøk inn og ut |
| 3 | 1 ½ dl fløte | 2 | ¾ dl fløte | Blandet tall nedover |
| 4 | 0,5 dl olje | 8 | 1 dl olje | Desimalkomma |
| 5 | 1 egg | 3 | 1 egg (ca.) | 0,75 rundes til 1, minst 1 |
| 6 | 2 egg | 3 | 2 egg (ca.) | 1,5 rundes opp til 2 |
| 7 | 2–3 ss sukker | 8 | 4–6 ss sukker | Mengdeområde |
| 8 | en klype salt | 8 | en klype salt | Ingen tall, uendret |
| 9 | 1 fedd hvitløk | 2 | 1 fedd hvitløk (ca.) | 0,5 rundes til 1 (minst 1) |
| 10 | 750 g potet | 3 | 562,5 → 560 g potet | Avrunding av store tall (regel: 5 g-steg). **Åpent: skal vi runde?** |

Nr. 10 viser at vi må bestemme avrundingsregel for g/ml. Forslag: avrund til to gjeldende sifre over 100 (560 g).

## 8. Brainstorming-temaer til torsdag

- Hvordan vises et forslag? Kort tekst («Prøv 1 ts sitronsaft til slutt – gir friskhet») med «ta i bruk / hopp over». Hvordan unngår vi at forslag oppleves som støy?
- Kan KI-forslagene begrunnes? Vi bør kunne vise hvorfor, slik at brukeren kan vurdere (KI-styring og kvalitetssikring).
- Hva ser brukeren på kjøkkenet: stor tekst, mobil først, krysse av ingredienser og steg?
- Skal oppskriftsvisningen kunne låses mot at skjermen slukker (cooking mode)? (P3)
- Hvordan ser feilmeldingen ut ved mislykket import, og hva gjør brukeren da?
- Navn på mapper, standardmapper («Favoritter») og hva som skjer når en mappe slettes.
- Persona og brukerreise: student som lager mat til tre venner kontra familie på fem.

## 9. Anbefalt rekkefølge fram til og etter torsdag

1. Maja tar P1-beslutningene (A1–A4, A6) og oppdaterer `product-brief.md`.
2. Hente og lagre testsider som fixtures; kjøre pkt. 1–3 i §6.
3. Kjøre `bmad-prd` med briefen og denne filen som input (research) og skaleringseksemplene som funksjonelle krav med fasit.
4. UX (`bmad-ux`), arkitektur (`bmad-architecture`), epics og stories, sprint-planlegging.
5. Implementere med `bmad-build`, og skrive issues i `issues/` ved feil.

## Kilder

- [Google: Recipe structured data](https://developers.google.com/search/docs/appearance/structured-data/recipe)
- [recipe-scrapers (GitHub)](https://github.com/hhursev/recipe-scrapers) og [støttede sider](https://docs.recipe-scrapers.com/getting-started/supported-sites/)
- [The Sweet Setup: beste oppskriftsapper for iOS/Mac](https://thesweetsetup.com/apps/best-recipe-manager-ios-mac/)
- [Mr. Cook: Recipe Keeper mot Paprika 3](https://www.mrcook.app/en/compare/recipe-keeper-vs-paprika-3) (publisert av en konkurrent)
- [ifun.de: Mela bruker maskinlæring som reserve for import](https://www.ifun.de/rezeptmanager-mela-nutzt-machine-learning-fuer-web-importe-179176/)
- [Samsung Food lansering](https://news.samsung.com/global/samsung-announces-global-launch-of-samsung-food-an-ai-powered-personalized-food-and-recipe-service)
- [parse-ingredient (npm)](https://npmjs.com/package/parse-ingredient)
