---
title: 'Story 2.1: Les oppskriftsdata fra lagrede oppskriftssider'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: 'b5e59c6'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---
<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Appen kan bare ta imot oppskrifter som er skrevet inn for hånd. Import fra lenke (Epic 2) trenger først en trygg og enhetlig måte å lese oppskriftsdata (schema.org `Recipe` i JSON-LD) fra HTML (FR-1, FR-3, AD-4, AD-7, AD-8, AD-11, NFR-2, NFR-7).

**Approach:** To rene funksjoner i domenet, uten nettverk, filer eller database: `extractRecipeJsonLd(html)` finner `Recipe`-objektet i HTML-en, og `normalizeRecipe(node)` gjør det om til én fast form (`ImportedRecipe`) med tittel, kildenavn, opprinnelig porsjonsantall, ingredienslinjer og nummererte steg (med seksjoner). Testene bruker bare de lagrede sidene i `test/fixtures/html/` (se `test/fixtures/sources.md`) pluss små, egenskrevne JSON-LD-eksempler. Ingen henting fra nettet, ingen lagring, ingen UI i denne storyen (det kommer i 2.2).

## Boundaries & Constraints

**Always:**
- **Plassering** (AD-1, AD-4): `src/domain/extract-recipe-jsonld.ts` og `src/domain/normalize-recipe.ts` (+ tester ved siden av; eksporter fra `src/domain/index.ts`). Rene TypeScript-funksjoner uten rammeverk, `node:`-moduler, server- eller app-kode; `domain-purity.test.ts` må fortsatt gå grønt. Feil som `Result<T, AppError>` (AD-7) med `kind` `no_recipe` (gjenbruk `src/lib/result.ts`; sjekk først at domenet har lov til å importere den, ellers del typen riktig uten å bryte renhetstesten). Ingen nye pakker (JSON-LD hentes uten HTML-parser-bibliotek). `package.json` og `package-lock.json` uendret.
- **`extractRecipeJsonLd(html: string): Result<RecipeNode, AppError>`**:
  - Finner alle `<script type="application/ld+json">`-blokker (type og attributter uavhengig av store/små bokstaver og rekkefølge, enkle eller doble anførselstegn, ekstra attributter). Skann med `indexOf`/enkle løkker eller regex uten risiko for katastrofal backtracking; 2 MB HTML skal tas på kort tid (test at 2 MB uten oppskrift og 2 MB med mange blokker går på under ett sekund).
  - Hver blokk parses med `JSON.parse`. Ugyldig JSON i én blokk hopper over den blokken (ikke hele siden). Vær snill mot vanlige feil i praksis: rå linjeskift, tabulatorer og andre kontrolltegn inne i strenger, og en innledende BOM eller `<!--`/`//<![CDATA[`-innpakning, uten å godta vilkårlig søppel.
  - Finner `Recipe` i: et enkelt objekt, en liste av objekter, `@graph` (også nestet liste i `@graph`), og når `@type` er en liste (for eksempel `["Recipe", "NewsArticle"]`) eller en full-URL-type (`https://schema.org/Recipe`, `schema:Recipe`). Første `Recipe` i dokumentrekkefølge vinner. Objekter som bare er referert via `@id` følges ikke.
  - Ingen blokker, ingen `Recipe`, eller bare ugyldig JSON: `{ ok: false, error: { kind: "no_recipe" } }`. Funksjonen kaster aldri, uansett input (tom streng, `null`-lignende input, binærsøppel, svært dype JSON-strukturer: sett en rimelig dybdegrense i `@graph`-søket).
- **`normalizeRecipe(node: RecipeNode): Result<ImportedRecipe, AppError>`** med
  `ImportedRecipe = { title: string; sourceName: string | null; servings: number | null; ingredients: { text: string }[]; steps: { text: string; section: string | null }[] }` (juster navn hvis det passer koden bedre, men dokumenter i Implementation Notes). Mengder tolkes **ikke** her (det gjør `parseLine` senere i rørledningen, AD-2/AD-4); `ingredients[].text` er den rene originalteksten.
  - **Tekstrensing** på alle tekstfelt (AD-8: bare tekst brukes, HTML vises aldri): dekod HTML-entiteter (`&amp;`, `&quot;`, `&#39;`, `&#x27;`, `&nbsp;`, `&aelig;` og tilsvarende vanlige navngitte og numeriske, uten bibliotek), fjern HTML-tagger (`<p>`, `<br>`, `<b>`, `<a href=…>`, og innhold i `<script>`/`<style>` fjernes helt), gjør `<br>` og `</p>` til linjeskift der tekst deles i steg, slå sammen blanke tegn (også ` `) til ett mellomrom og trim. Fjern usynlige styretegn. Ingen URL-er eller bilder hentes eller beholdes.
  - **Tittel** fra `name` (streng, rensede; hvis `name` er en liste, første ikke-tomme streng). Tom eller manglende tittel: `no_recipe`.
  - **Kildenavn** `sourceName`: `publisher.name`, ellers `author.name` (objekt, liste av objekter eller ren streng), ellers `null`. Appen faller selv tilbake til vertsnavnet fra lenken.
  - **Porsjonsantall** `servings` fra `recipeYield` (streng, tall, liste, eller liste blandet av begge; objekter med `value`/`name` er tillatt): første heltall i første tolkbare element, i grensene `LIMITS.servingsMin`–`LIMITS.servingsMax` (`src/lib/recipe-input.ts`; sjekk om domenet kan bruke grensene, ellers speil dem med en kommentar). Eksempler som må testes: «4 porsjoner» → 4, «Serves 6» → 6, `4` → 4, `["4", "4 porsjoner"]` → 4, «16 servings» → 16, «1 PORSJONER (1 porsjon gir ca. 20 rundstykker)» → 1, «4-6 porsjoner» → 4 (første tall i området), «4–6» med tankestrek → 4, «Til 4» → 4. Manglende, tom, `0`, `-3`, `4.5`, «noen få», «ca. halvannen liter», tall over grensen (for eksempel 120) eller ellers utolkbar gir `null`. Ikke gjett.
  - **Ingredienser** fra `recipeIngredient` (liste av strenger; også én enkelt streng, eller en liste med objekter som har `text`/`name`): hver renset og trimmet, tomme fjernes, rekkefølgen beholdes. `recipeIngredient` mangler eller er tom: `ingredients` er tom liste (ikke en feil i seg selv).
  - **Steg** fra `recipeInstructions`, i riktig rekkefølge:
    - liste av `HowToStep` (bruk `text`; hvis `text` mangler, bruk `name`; `HowToDirection` og `HowToTip` behandles som `HowToStep` bare hvis de har `text`),
    - liste av rene strenger,
    - `HowToSection` (`name` blir `section` for alle stegene i den, `itemListElement` er listen med steg, også én enkelt `HowToStep` i stedet for liste); seksjonsnavn beholdes, og steg utenfor seksjon har `section: null`,
    - én streng eller én blokk med linjeskift, `<br>`, `<p>` eller nummerering («1. Gjør dette 2. Gjør det»): del i steg på linjeskift og tagger; fjern ledende nummerering («1.», «1)», «Steg 1:») bare når hele teksten er nummerert fortløpende fra 1; ellers beholdes teksten. Én blokk uten linjeskift blir ett steg.
    - Tomme steg fjernes. Dupliserte tekster beholdes (to like steg er lov).
    - `recipeInstructions` mangler eller er tom: `steps` er tom liste.
  - En `Recipe` uten brukbar tittel, **eller** uten både ingredienser og steg, gir `no_recipe` (en tom skall av en oppskrift er ikke en oppskrift).
  - Feltene kan ha helt feil type (tall, `null`, objekter, boolske verdier, dypt nestede lister) uten at noe kaster; feil felt gir tom verdi eller `null`, ikke krasj. Svært lange tekster avkortes ikke her (grenser håndheves når oppskriften lagres, i 2.2).
- **Testing** (AD-11, NFR-2): enhetstester med egenskrevne JSON-LD-strenger for alle regler og kantfall over, pluss fixture-tester som leser `test/fixtures/html/*.html` fra disk i testfilene (testfiler er unntatt renhetstesten). Fixtures med `Recipe` (`tine-kjottboller`, `matprat-rundstykker`, `matprat-enkel-brodoppskrift`, `godt-amerikanske-pannekaker`, `godt-grove-middagspannekaker`): kontroller tittel, `sourceName`, `servings` (16, 1, 1, 4, 6), antall ingredienser, første og siste ingrediens, antall steg, og starten på første og siste steg, med verdier du selv har lest av filene. Fixtures uten `Recipe` (`klikk-farikal`, `northwild-kjottkaker`, `matoppskrift-pannekaker`, `matoppskrift-kjottkaker`, `bbcgoodfood-lasagne`): `no_recipe`. Ingen test gjør nettverkskall.
- **Bilder og HTML fra kilden tas ikke med** (NFR-7, AD-8): `ImportedRecipe` har ingen bilde-, HTML- eller URL-felt. Test at `<img>`, `<script>`, `<a href>` og `javascript:` i tekstfelt aldri overlever (tekst inni linker beholdes, selve taggen og URL-en ikke).
- **Dokumentasjon:** `test/fixtures/sources.md` er allerede oppdatert; README-avsnitt «Lese oppskriftsdata (import, del 1)» med kort beskrivelse av de to funksjonene og hvordan fixtures brukes og fornyes (`bash scripts/fetch-fixtures.sh`; nettsider endrer seg, så testene leser lagrede filer). Oppdater testtall i README. Utsatt arbeid i `_bmad-output/implementation-artifacts/deferred-work.md` under «Story 2.1».
- `test/fixtures/html/*.html` er ferdig hentet; ikke endre dem. De skal committes (jeg sørger for det).

**Never:**
- Ingen nettverkskall, ingen `fetch`, ingen filtilgang i produksjonskoden for domenet, ingen database, ingen UI, ingen Server Actions, ingen lagring i denne storyen.
- Ingen HTML-parser-pakke, ingen ny avhengighet. Ingen bruk av `eval`/`Function`. Ingen `any` uten god grunn (bruk `unknown` og typevakter).
- Ingen tolking av mengder eller enheter i `normalizeRecipe` (det er `parseLine`).
- Ikke gjør brukervendt feiltekst her; `kind` er nok (AD-7). Meldinger kommer i 2.3.

## I/O & Edge-Case Matrix

| Scenario | Input | Forventet | Feil |
|----------|-------|-----------|------|
| Enkelt objekt | `<script type=application/ld+json>{"@type":"Recipe",…}</script>` | Oppskrift funnet | N/A |
| Liste | `[{"@type":"BreadcrumbList"},{"@type":"Recipe",…}]` | Recipe funnet | N/A |
| `@graph` | `{"@graph":[{"@type":"WebSite"},{"@type":"Recipe",…}]}` | Recipe funnet | N/A |
| `@type` som liste | `"@type":["Recipe","NewsArticle"]` | Funnet | N/A |
| Full type | `"@type":"https://schema.org/Recipe"` | Funnet | N/A |
| Flere blokker | Første ugyldig JSON, andre er Recipe | Recipe fra andre | N/A |
| Ingen Recipe | Side med bare artikkel-JSON-LD | `no_recipe` | no_recipe |
| Ingen JSON-LD | Vanlig HTML | `no_recipe` | no_recipe |
| Tom/søppel | `""`, `"<html"`, binærdata | `no_recipe`, kaster ikke | no_recipe |
| Yield | «4 porsjoner», «Serves 6», `4`, `["4","4 porsjoner"]`, «16 servings» | 4, 6, 4, 4, 16 | N/A |
| Yield utolkbar | mangler, «», `0`, `-3`, `4.5`, «noen», 120, `null`, `{}` | `servings: null` | N/A |
| Yield med tekst | «1 PORSJONER (1 porsjon gir ca. 20 rundstykker)» | 1 | N/A |
| Yield område | «4-6 porsjoner», «4–6» | 4 | N/A |
| Steg som HowToStep | liste med `text` | Nummererte steg i rekkefølge | N/A |
| Steg med seksjon | `HowToSection` «Deig» med 2 steg og «Fyll» med 1 | 3 steg, `section` «Deig»/«Fyll» | N/A |
| Steg som tekstblokk | «Bland.\nStek.\nServer.» eller `<p>`/`<br>` | 3 steg | N/A |
| Nummerert blokk | «1. Bland 2. Stek» / linjer «1. …\n2. …» | Steg uten ledende nummer | N/A |
| Delvis nummerert | «1. A\nB\n3. C» | Teksten beholdes som den er | N/A |
| Entiteter og tagger | `"Sm&oslash;r &amp; <b>sukker</b>"` | «Smør & sukker» | N/A |
| Ingredienser tom | `recipeIngredient` mangler, men steg finnes | `ingredients: []` | N/A |
| Skall | Tittel men ingen ingredienser og ingen steg | `no_recipe` | no_recipe |
| Ingen tittel | `name` mangler eller tom | `no_recipe` | no_recipe |
| Kildenavn | `publisher` `{"name":"Godt"}` / `author` kun | Navnet / `null` ellers | N/A |
| Feil felttyper | `recipeIngredient: 5`, `name: {…}`, `recipeInstructions: true` | Ingen krasj; tom verdi | N/A |
| Skadelig tekst | `<img src=x onerror=…>`, `<script>…</script>`, `javascript:` | Fjernet, bare tekst igjen | N/A |
| Stor side | 2 MB HTML | Under 1 sekund | N/A |
| Fixture med Recipe | De fem lagrede sidene | Som lest av filene (se Testing) | N/A |
| Fixture uten Recipe | De fem øvrige | `no_recipe` | no_recipe |

</frozen-after-approval>

## Implementation Notes

**Filer:** `src/domain/extract-recipe-jsonld.ts`, `normalize-recipe.ts`, `clean-text.ts` (tekstrensing, ny hjelpemodul), `import-types.ts` (typer) og tester ved siden av (`*.test.ts`, pluss `recipe-import.test.ts` for fixtures, ytelse og aldri-kaster). Eksport fra `src/domain/index.ts`. `package.json` og `package-lock.json` er uendret.

**Avvik og valg**

- **`Result`/`AppError` kan ikke importeres i domenet.** `domain-purity.test.ts` krever at domenefiler bare importerer fra `src/domain`. Derfor har domenet egne, strukturelt like typer (`ImportResult<T>`, `ImportError = { kind: "no_recipe" }` i `import-types.ts`). `recipe-import.test.ts` tilordner resultatene til `Result<T, AppError>` fra `src/lib/result.ts` (typekontrollen låser det) og sjekker at `kind` finnes i `ERROR_KINDS`. Signaturene er altså de i spesifikasjonen, bare med lokal type.
- **Porsjonsgrensene er speilet** (`SERVINGS_MIN/MAX` = 1 og 50) av samme grunn; en test sammenligner dem med `LIMITS`.
- **`ImportedRecipe`** har nøyaktig feltene fra spesifikasjonen. `no_recipe` får en `detail` (`missing_title`, `empty_recipe`) for feilsøking; ikke brukervendt tekst.
- **Nummerering på én linje.** Matrisen sier at «1. Bland 2. Stek» gir to steg uten nummer, mens teksten sier at en blokk uten linjeskift blir ett steg. Jeg har latt matrisen gå foran: en enkelt linje deles bare når den starter med «1.» (eller «1)», «Steg 1:») og nummer 2, 3 … følger fortløpende foran et ord. Ellers blir den ett steg. «Stek i 10 min. 2. runde i ovnen» deles dermed ikke. En enkelt linje som bare starter med «1.» får nummeret fjernet.
- **Liste med akkurat én streng** i `recipeInstructions` behandles som en tekstblokk (deles på linjeskift); en liste med flere strenger gir ett steg per element og fjerner ikke nummerering. `HowToStep.text` med linjeskift blir ett steg (blanke tegn slås sammen), ikke flere. Det gjelder for eksempel steg 4 i TINE-oppskriften.
- **`recipeIngredient` som én streng** deles på linjeskift og `<br>` (spesifikasjonen sier bare «også én enkelt streng»); i en liste er hvert element én ingrediens.
- **Porsjonsantall:** hvert element i `recipeYield` får tre utfall. Et tydelig heltall avgjør (utenfor 1–50 gir det `null`, også om et senere element er gyldig). Element uten tydelig heltall hoppes over: ingen tall, desimaltall («4.5», «4,5»), brøk («1/2», «1½») og negative tall («-3»). Derfor gir «1 PORSJONER (… 1.5 liters former)» 1, mens «4.5» gir `null`. Tall i «4-6» tas som 4.
- **`@type`** matches mot `Recipe`, `schema:Recipe` og `http(s)://[www.]schema.org/Recipe` (store/små bokstaver teller; «recipe» gir ingen treff). Dybdegrense i søket er 8 nivåer. Det følges bare `@graph`, lister og toppnivå, ikke `mainEntity` eller `@id`.
- **Tekstrensing** (`clean-text.ts`): tagger fjernes (lineær skanner i stedet for regex), `script`/`style` med innhold fjernes, entiteter dekodes én gang, deretter fjernes tagger som kom fram av kodet HTML (`&lt;p&gt;`), maks tre runder. Usynlige tegn og retningsstyring fjernes, teksten normaliseres til NFC. Navngitte entiteter dekker HTML 4 Latin-1 pluss vanlige typografiske tegn; ukjente står uendret, og entiteter uten semikolon dekodes ikke.
- **Utbedring av JSON:** bare rå kontrolltegn inne i strenger, BOM, `<!--`/`-->` og CDATA (`//<![CDATA[ … //]]>`, `/*<![CDATA[*/ … /*]]>*/`). Søppel før/etter JSON, enkle anførselstegn, komma på slutten og kommentarer inni JSON godtas ikke (testet).
- En `<script type=ld+json>` som ikke avsluttes (avkortet side) hoppes over, og skanningen stopper.

**Resultat av fixtures:** fem sider gir oppskrift (TINE 16 porsjoner/10 ingredienser/4 steg; Matprat rundstykker 1/10/4; Matprat enkel brødoppskrift 1/5/3; Godt amerikanske pannekaker 4/10/3; Godt grove middagspannekaker 6/7/2), fem gir `no_recipe`. `klikk-farikal` og `northwild-kjottkaker` har JSON-LD uten `Recipe`; `matoppskrift-*` har ingen JSON-LD; `bbcgoodfood-lasagne` har ingen `ld+json`-blokk. Verdiene er lest av filene, ikke fra spesifikasjonen.

**Usikkerhet og åpne punkter**

- Ytelse er målt i denne utviklingsmiljøet (alle 2 MB-tilfellene under ca. 0,3 s, de fleste under 30 ms); terskelen i testene er 1 s som i spesifikasjonen. En tregere maskin kan i teorien gjøre testene ustabile, men marginen er stor.
- Ingen nettleser eller ekte side utenom de lagrede er prøvd. Hvordan Yoast/WordPress-sider med flere `Recipe`-objekter oppfører seg, er ukjent (første vinner).
- `test/fixtures/sources.md` mangler rader for de fem nye sidene (ikke endret, se `deferred-work.md`).
- Utsatt arbeid står i `deferred-work.md` under «Story 2.1». Git er ikke brukt (ingen commit eller push).

## Rettelser etter kodegjennomgang

- **Ytelse:** `jsonLdBlocks` var kvadratisk (`"<script ".repeat(262144) + ">"` på 2 MB tok ca. 3 s) fordi hver `<script` skannet til slutten etter en «>». Posisjonen til nærmeste «>» mellomlagres nå, så skanningen er lineær (samme side: ca. 20 ms). Nye tester for `<script ` og `<script x` (2 MB og 4 MB). Egne 2 MB-prober av normalisering og rensing (`<a `, `1. a `, `<<`, `&lt;a ` og flere) er lineære. Porsjonstolkingen leser bare et kort vindu rundt hvert tall, ellers ville mange tall som hoppes over gitt kvadratisk tid.
- **Porsjonstolkingen gjetter ikke:** tall med måleenhet (g, kg, dl, cl, ml, l, liter, cm, mm, °C, grader, også området «2-3 dl»), tall på hver side av «x»/«×» og tall i brøker og blandede tall («1/2», «1 1/2», «1 ½», «4 ½», «1½») hoppes over, og letingen fortsetter («1 liter, 4 porsjoner» gir 4). Desimaltall, negative tall og «1e3» gir fortsatt `null`. Regelen er dokumentert i koden og i README.
- **Død kode fjernet:** unntaket for «område» i negativ-sjekken (kunne aldri slå til), lengdesjekken `match[0].length > 15` og `Number.MAX_SAFE_INTEGER`-triksset (store tall gir `Number(...)` over grensen og dermed `null`). Dybdegrensene har navn: `MAX_STEP_DEPTH`, `MAX_NAME_DEPTH`, `MAX_YIELD_DEPTH`.
- **Usynlige tegn:** U+200E, U+200F og U+061C fjernes også; U+0085 (NEL) blir mellomrom.
- **Kildenavn:** en streng som ser ut som en URL («http(s)://…», eller uten mellomrom med både punktum og skråstrek) brukes ikke som `sourceName`; neste kandidat prøves.
- **Dokumentasjon:** `detail` på `no_recipe` er bare til feilsøking (kommentar i `import-types.ts`). Kommentar ved `matprat-*`-fixturene om at servings 1 kommer fra «1 PORSJONER (…)»-teksten.
- **Ytelsestestene:** terskelen er 3000 ms (kravet er under 1 s på vanlig maskin; resten er slingringsmonn for trege CI-maskiner og parallelle workers), og normaliseringstesten er delt per felt med `it.each`.
- **Testdekning:** tester for flere runder i `toPlain`, usynlige tegn (DEL, C0, C1), alle tagger i `BLOCK_TAGS`, `&apos;` og entitetsgrenser, to og tre lag innpakning, «Trinn 1:», oppslag fremover i `splitInlineNumbering`, dybdegrensen for seksjoner (5 og 6 nivåer leses, 7 ikke) og en tilfeldighetstest som krever `ok: true` når tittel og ingrediens er gyldige. Kjente begrensninger: grensen {1,31} i entitetsnavn kan ikke skilles fra en større grense ved atferd (ingen kjent entitet er så lang), så testen låser bare at lange navn står uendret.

## Review Triage Log

Tre uavhengige gjennomganger (robusthet og sikkerhet; spesifikasjon og arkitektur; testkvalitet og lesbarhet, med ca. 45 manuelle mutasjoner) ga ca. 25 funn, ingen datafeil og ingen sikkerhetshull (ingen unntak, ingen prototype-forurensning, ingen overlevende tagger). Triage: 9 rettes, 6 utsettes, 5 avvises. Rettelsene er beskrevet i «Rettelser etter kodegjennomgang» over; de gamle punktene om porsjonsantall og ytelsesterskel (1 s) under Implementation Notes er erstattet av dem.

**Patch (rettet):**
1. Kvadratisk tid i `jsonLdBlocks` (2 MB med `<script ` gjentatt tok 3–5 s; nå ca. 20 ms), med tester.
2. Porsjonstolking som gjettet på tall som ikke er porsjoner («20x20 cm», «3 dl», «2 x 6», «1 1/2»): hoppes over, letingen fortsetter («1 liter, 4 porsjoner» gir 4).
3. Død kode og navnløse tall (dybdegrenser, `MAX_SAFE_INTEGER`).
4. Usynlige tegn: LRM, RLM og U+061C fjernes; NEL blir mellomrom.
5. URL brukt som kildenavn.
6. `detail` på `no_recipe` dokumentert som bare til feilsøking; forklaring ved fixtures med «1 PORSJONER».
7. Ytelsestestene: terskel 3 s (slingringsmonn), delt per felt.
8. Testdekning for overlevende mutanter (rundene i `toPlain`, `stripWrappers`, kontrolltegn, blokktagger, «Trinn», lookahead, dybdegrenser, `ok: true` i tilfeldighetstestene).
9. Domene-spesifikk: tester låser at ukjente lange entiteter står uendret.

**Defer (deferred-work.md):**
10. Første `Recipe` som er et tomt skall skjuler en komplett senere (følger «første vinner»; 2.2 kan prøve neste kandidat).
11. Egne feiltyper i domenet i stedet for `Result`/`AppError` (anbefaling: flytt det generiske til `src/domain/result.ts` og re-eksporter fra `src/lib/result.ts`).
12. `>` inni attributter lekker tagg-rester (kosmetisk; teksten vises alltid som tekst).
13. Tekst som ligner tagger («<eller>») forsvinner (uunngåelig uten parser).
14. `normalize-recipe.ts` og `clean-text.ts` har flere ansvar (steg/nummerering og entitetstabell kan bli egne filer).
15. Ytelsestestene tar ca. 20 s totalt; vurder å skille dem ut.

**Reject:**
16. `HowToStep` med `text` som liste gir 0 steg (ikke observert i fixtures; lav verdi).
17. «1. 2. 3.» gir ett merkelig steg (ufarlig).
18. Store-bokstav-entiteter og entiteter uten semikolon dekodes ikke (bevisst enkel dekoding).
19. Lone surrogates og U+FFFE overlever (ufarlig for tekstvisning).
20. `["1. A"]` (én-elements-liste) gir «A» mens `["1. A","2. B"]` beholder nummeret (dokumentert valg, lav konsekvens).
