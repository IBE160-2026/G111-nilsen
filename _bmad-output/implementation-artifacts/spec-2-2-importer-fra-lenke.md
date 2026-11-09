---
title: 'Story 2.2: Importer en oppskrift fra lenke'
type: 'feature'
created: '2026-11-09'
status: 'in-progress'
baseline_commit: '0a31a64'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---
<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Importer-siden sier «Snart kan du lime inn en lenke». Lesing av oppskriftsdata finnes (Story 2.1), men ingenting henter siden, lagrer resultatet eller lar brukeren starte importen (FR-1, FR-2, FR-5, FR-13, AD-4, AD-7, AD-8, AD-11, NFR-2, NFR-3, NFR-4, UX-DR8, UX-DR14, UX-DR17).

**Approach:** Hele rørledningen fra AD-4: `validateUrl` → duplikatsjekk → `RecipeSourceFetcher` (port; HTTP-adapter i produksjon, fixture-adapter i tester og demo) → `extractRecipeJsonLd` → `normalizeRecipe` → `parseLine` → lagring som «ikke i samlingen» (`savedAt = null`). Importer-siden (`/`) får lenkefelt, knappen «Hent oppskrift» og feilvisning. Etter vellykket import vises oppskriften på `/oppskrift/{id}` med kilden som lenke. En lenke som allerede er lagret gir «Du har allerede lagret denne oppskriften» med lenke til den, uten ny henting.

## Boundaries & Constraints

**Always:**
- **Lagdeling og plassering** (AD-1, AD-3, AD-4, AD-6, AD-7, AD-9): URL-regler i `src/lib/source-url.ts` (rene funksjoner, ingen server-importer); porten `src/server/ports/recipe-source-fetcher.ts`; adaptere `src/server/adapters/http-fetcher.ts` og `src/server/adapters/fixture-fetcher.ts`; `src/server/services/import-service.ts`; Server Action `src/app/actions.ts` (eller tilsvarende `src/app/**/actions.ts`); UI-komponenter i `src/components/`. Bare `config.ts` leser miljøvariabler (nye variabler, se under; `env-access.test.ts` skal fortsatt gå grønt). Feil som `Result<T, AppError>` med `kind` `invalid_url`, `fetch_failed`, `no_recipe`, `duplicate`, `validation`; norske tekster bare fra `src/lib/messages.ts` (AD-7). Bare repositoriene bruker Drizzle.
- **`validateUrl(input: string): Result<string, AppError>`** (`invalid_url`; ingen nettverk): trimmer (også usynlige/blanke tegn og omsluttende anførselstegn eller `<…>`); tom, over 2048 tegn eller ugyldig gir `invalid_url`; skjemaet må være `http` eller `https` (alt annet, som `ftp:`, `file:`, `javascript:`, `data:`, gir `invalid_url`); mangler skjema men teksten ser ut som en adresse («www.matprat.no/oppskrifter/x», «matprat.no/x»), prepend `https://`; ingen innebygd brukernavn/passord (`user:pass@`); vertsnavn må finnes; punycode/IDN godtas slik `new URL` normaliserer det. Retur er den normaliserte `URL.href`-strengen (WHATWG), etter at IP-former som `http://2130706433/`, `http://0x7f.1/` og `http://127.1/` er normalisert av URL-parseren (test at de ender som `127.0.0.1` og senere avvises av adapteren).
- **`normalizeSourceUrl(href: string): string`** (rent, i `src/lib/source-url.ts`): brukes for lagring og duplikatsjekk: fjerner fragment (`#…`), fjerner kjente sporingsparametere (`utm_*`, `fbclid`, `gclid`, `gbraid`, `wbraid`, `msclkid`, `mc_cid`, `mc_eid`, `igshid`, `ref`, `ref_src`, `_ga`, `yclid`, `dclid`, `twclid`, `ttclid`, `srsltid`), beholder øvrige parametere i opprinnelig rekkefølge, små bokstaver i skjema og vert, fjerner standardport (`:80`/`:443`), fjerner tom `?`, og en enkelt avsluttende `/` på en tom sti normaliseres konsekvent (`https://a.no` og `https://a.no/` er samme). Beholder sti og dens store/små bokstaver og avsluttende `/` på ikke-tomme stier uendret (to ulike stier er to ulike oppskrifter; ikke gjett). `http` og `https` til samme adresse regnes som ulike (ikke gjett). Idempotent.
- **Port** `RecipeSourceFetcher`: `fetch(url: string): Promise<Result<{ html: string; finalUrl: string }, AppError>>`. Feil er `fetch_failed` (nettverk, tidsavbrudd, HTTP-status 400 og over, blokkert adresse, for mange omdirigeringer, uleselig svar) eller `no_recipe` (200 OK, men svaret er ikke HTML: `Content-Type` er ikke `text/html` eller `application/xhtml+xml`). Porten kaster aldri.
- **HTTP-adapter** (AD-8, NFR-3, NFR-4), Node `node:http`/`node:https` uten ny pakke:
  - Bare `http` og `https`. Avviser vertsnavn og IP-adresser som peker til maskinen selv, private, lenkelokale og andre ikke-offentlige nett: IPv4 `0.0.0.0/8`, `10/8`, `100.64/10`, `127/8`, `169.254/16` (inkl. skymetadata 169.254.169.254), `172.16/12`, `192.0.0/24`, `192.0.2/24`, `192.88.99/24`, `192.168/16`, `198.18/15`, `198.51.100/24`, `203.0.113/24`, `224/4`, `240/4`, `255.255.255.255`; IPv6 `::`, `::1`, `::ffff:0:0/96` (IPv4-mappet; sjekk den innebygde IPv4-adressen), `64:ff9b::/96`, `100::/64`, `2001:db8::/32`, `fc00::/7`, `fe80::/10`, `ff00::/8`; vertsnavn `localhost`, `*.localhost`, `*.local`, `*.internal`, `*.lan`, `*.home.arpa`.
  - **Validering skjer på selve tilkoblingen:** bruk en egen `lookup`-funksjon i `http.request`/`https.request` som slår opp *alle* adresser, avviser hvis **noen** er ikke-offentlig, og kobler til den validerte adressen (ingen ny oppslag etter sjekk: ingen DNS-rebinding). IP-adresser skrevet direkte i URL-en sjekkes uten oppslag. Samme sjekk for hver omdirigering.
  - Omdirigeringer (301, 302, 303, 307, 308) følges manuelt, maks 5; hver nye `Location` (relativ eller absolutt) valideres som ny URL med de samme reglene (skjema, innebygd passord, adresse) før den hentes; omdirigering til ikke-http(s) eller blokkert adresse gir `fetch_failed`. Ingen cookies, ingen autentiseringshoder sendes videre.
  - **Samlet frist 10 sekunder** for hele kjeden (oppslag, tilkobling, alle omdirigeringer, hele kroppen), avbrutt med `AbortController`/timer som alltid ryddes opp (ingen hengende sockets eller timere ved suksess, feil eller avbrudd). Les **maks 2 MB** av kroppen; ved grensen stoppes lesingen og det som er lest brukes (avkortet HTML kan fortsatt ha JSON-LD tidlig); socketen ødelegges. Be om `Accept-Encoding: identity` (ingen dekomprimering, så ingen zip-bombe). Dekod tegnsett fra `Content-Type`-header, ellers `<meta charset>` i de første 2048 byte, ellers UTF-8 (`TextDecoder`; ukjent tegnsett faller tilbake til UTF-8; `windows-1252`/`iso-8859-1` må virke for norske sider).
  - Sender `User-Agent: RecipeMate/0.1 (skoleprosjekt; personlig oppskriftsapp)` og `Accept: text/html,application/xhtml+xml`. Leser aldri HTML-en som kjørbar kode, og returnerer bare tekst.
  - For test kan adapteren opprettes via en fabrikk med injiserbare avhengigheter (oppslag, tidsfrist, maks størrelse, og et eksplisitt `allowLoopbackForTests`-valg som **ikke** kan nås fra `config.ts`, miljøvariabler eller produksjonskode). Enhetstester bruker falske oppslag og lokale `127.0.0.1`-tjenere (ingen trafikk ut av maskinen) for å vise tidsavbrudd, størrelsesgrense, omdirigering, tegnsett og statuskoder; selve adresseklassifiseringen (alle områdene over, også IPv6, IPv4-mappet og norske vertsnavnsuffikser) testes som en ren funksjon med tabelltester.
- **Fixture-adapter:** `RecipeSourceFetcher` som leser `test/fixtures/html/` og slår opp fil fra URL via tabellen i `test/fixtures/sources.md` (første kolonne filnavn i backticks, andre kolonne URL; ikke dupliser URL-lista). Sammenligner på `normalizeSourceUrl`. Ukjent URL gir `fetch_failed`. Ingen nettverk.
- **Valg av adapter** i `src/server/config.ts` (AD-9): ny valgfri miljøvariabel `IMPORT_SOURCE` (`http` standard; `fixtures` bruker fixture-adapteren, for demo og ende-til-ende-tester; alt annet er `http`). `.env.example` og README dokumenterer den. En liten fabrikk (`getRecipeFetcher()`) i `src/server/` velger adapter. Appen starter uten `.env`.
- **`importRecipe(rawUrl, deps?)`** i `import-service.ts` (deps: `fetcher`, `db`, `now`; standard fra config), returnerer `Result<{ id: number }, AppError>`:
  1. `validateUrl` → `normalizeSourceUrl`.
  2. **Duplikatsjekk** (FR-13, AD-4) bare her, på normalisert `sourceUrl`, **før** henting: finnes en oppskrift i samlingen (`savedAt` satt) med samme `source_url`, gir `duplicate` med `detail` = oppskriftens id som tekst (bare til UI-lenken; ikke vist som tekst) og **ingen henting**. Finnes en ikke-lagret import med samme URL (ennå ikke ryddet bort), gjenbrukes den: `ok({ id })` uten ny henting og uten ny rad.
  3. `fetcher.fetch(normalisertUrl)`; `extractRecipeJsonLd`; `normalizeRecipe`; feil gjennomføres som de er (`no_recipe`/`fetch_failed`).
  4. Bygg innholdet: ingredienslinjer med `parseLine` (AD-2: original tekst + tolkede felt), `section: null`; steg med `section` fra normaliseringen. **Grenser** fra `LIMITS` (`src/lib/recipe-input.ts`): tittel avkortes til `titleLength`, hver ingrediens til `ingredientLineLength`, hvert steg til `stepLength` (avkortet tekst ender på «…» innenfor grensen), og maks `linesPerField` ingredienser og steg (resten forkastes). Dokumenter avkorting i README og deferred-work. `originalServings` = `servings` fra normaliseringen (kan være `null`), `selectedServings: null`, `sourceName` fra normaliseringen eller `null`, `sourceUrl` = normalisert URL (aldri sluttadressen etter omdirigering), `savedAt: null`, `createdAt = updatedAt = now`.
  5. Lagre med `insertRecipe` i én transaksjon; ved databasefeil rulles alt tilbake og tjenesten returnerer en generell feil (ikke kast til UI).
  6. Ingen skriving før alle steg har lyktes; ingen delvis lagret oppskrift.
  - Race: to samtidige importer av samme URL gir ikke to lagrede duplikater i samlingen (sjekk og skriv i én transaksjon der det er mulig).
- **Server Action** `importFromUrl(url: string)`: validerer `typeof url === "string"` og lengde (zod, AD-3), kaller `importRecipe`, og ved suksess `revalidatePath("/", "layout")` og `redirect("/oppskrift/{id}")` (utenfor try/catch). Svar ved feil: `{ ok: false, kind, title, body, recipeId? }` med tekster fra `messageFor(kind)`; `duplicate` gir `recipeId` til lenka. Uventede feil gir `fallbackMessage`, aldri unntak til klienten (feilen logges med `console.error`).
- **Importer-siden** (`/`, `src/app/page.tsx` + `ImportForm`-komponent): overskrift og ingress oppdateres (ikke lenger «Snart …»), etikett «Lenke til oppskriften», lenkefeltet har fokus når siden åpnes (`useEffect`, ikke `autoFocus`-attributt), `type="text"` med `inputMode="url"`, `autoComplete="off"`, `spellCheck={false}`; Enter eller «Hent oppskrift» sender; mens kallet pågår viser knappen «Henter oppskriften …», er deaktivert (`aria-disabled`/`disabled` uten at fokus mistes) og et `role="status"`-område sier det samme; feltet endres ikke. Ved feil: **feilmeldingskomponenten** (ny `ErrorMessage`/`ImportError`-komponent, UX-DR8: 4 px venstrekant i aksentfarge, tittel og forklaring, `role="alert"`, knappen/lenken «Legg inn selv» til `/ny`; for `duplicate` i stedet lenken «Åpne oppskriften» til `/oppskrift/{id}`), plassert under feltet og koblet til feltet med `aria-describedby` og `aria-invalid`; **lenken står igjen i feltet**; fokus blir i feltet (alert leses opp). Tre varianter ved feil: ugyldig lenke, siden kunne ikke hentes, ingen oppskrift funnet (tekster i `messages.ts`; bruk gjerne tekstene fra EXPERIENCE.md «Voice and Tone», du-form, ingen utropstegn). «Legg inn selv» ligger fortsatt under skjemaet slik som i dag. Siden fungerer uten JavaScript så langt som mulig (skjema med `action`), og tilstanden nullstilles ved navigasjon bort og tilbake (Activity-mønsteret fra 3.2/3.3). Mørk modus, `forced-colors`, 360 px uten horisontal scroll, 44 px kontroller, `overflow-wrap` for lange lenker.
- **Oppskriftssiden:** kilden vises som lenke når `sourceUrl` finnes: teksten fra `sourceLabel`, `href` = `sourceUrl` bare hvis den er `http`/`https`, `target="_blank"` med `rel="noopener noreferrer"`, tydelig synlig som lenke og med tilgjengelig navn som sier at den åpner kilden (ny fane). Oppskrifter uten `sourceUrl` viser fortsatt bare teksten. Kort i lister viser fortsatt bare teksten (hele kortet er en lenke).
- **Oppskrift uten porsjonsantall** (`originalServings = null`) må ikke krasje noe sted (oppskriftssiden, kort, redigering, skalering). Sjekk hvordan `IngredientList`/`ServingStepper` oppfører seg i dag og dokumenter det; selve dialogen «Hvor mange er oppskriften laget for?» kommer i Story 2.4. Hvis dagens visning ikke er forsvarlig for `null` (for eksempel «NaN» eller feil skalering), skal den i denne storyen vise mengdene uskalert (som originalen) uten porsjonsvelger-feil og uten å gjette et antall.
- **Testing** (AD-11, NFR-2): enhetstester for `validateUrl`/`normalizeSourceUrl` (alle punkt over, tabeller); adresseklassifisering (tabell over alle områdene, IPv6, IPv4-mappet, vertsnavnssuffikser, URL-parserens IP-former); HTTP-adapter mot lokale `127.0.0.1`-tjenere og falske oppslag (tidsavbrudd, 2 MB-grense, omdirigering til privat adresse avvises, for mange omdirigeringer, `Location` med `file:`/`javascript:`, ikke-HTML gir `no_recipe`, 404/500 gir `fetch_failed`, tegnsett ISO-8859-1 og UTF-8, ingen hengende timere/sockets etter ferdig kall); fixture-adapter; **integrasjonstester for `importRecipe` med fixture-adapteren der minst tre lagrede sider (Tine, Matprat, Godt) importeres riktig** (tittel, kildenavn, `originalServings`, ingredienser tolket med `parseLine`, steg, `sourceUrl` normalisert, `savedAt = null`, `originalServings = null` hvis siden mangler det) mot en in-memory-database; duplikat (samme URL med annet fragment og sporingsparametere gir `duplicate` uten at fetcher kalles; test med en fetcher som feiler hvis den kalles); ikke-lagret gjenbruk; hver feiltype; avkorting til `LIMITS`; Server Action; komponenter og side (fokus ved åpning, Enter, «Henter oppskriften …», deaktivert under henting, feil med `role="alert"`, lenken står igjen, «Legg inn selv», tilbakestilling ved navigasjon). Ingen test gjør nettverkskall ut av maskinen.
- **Dokumentasjon:** README (import av lenke, `IMPORT_SOURCE`, sikkerhetsreglene i korte trekk, hva som avkortes, `fetch-fixtures.sh`), oppdaterte testtall, `.env.example`, utsatt arbeid i `deferred-work.md` under «Story 2.2». Ingen nye pakker; `package.json` og `package-lock.json` uendret.

**Never:**
- Ingen nettverkskall fra tester til andre maskiner enn `127.0.0.1`. Ingen ny pakke (ingen `axios`, `undici`-pakke, `cheerio`, `ssrf`-biblioteker). Ingen `eval`.
- Ingen valg som lar miljøvariabler eller UI skru av adressebeskyttelsen i produksjon (`allowLoopbackForTests` finnes bare i testfabrikken).
- HTML og bilder fra kilden lagres eller vises aldri (AD-8, NFR-7). Ingen cookies eller innloggede forespørsler. Ingen skriving av delvis oppskrift ved feil.
- Duplikatsjekk gjøres bare i `import-service`, ikke i adapter, action eller UI. Ingen henting når duplikat er funnet.
- Ingen språkmodell, forslag eller omskriving av oppskriften. Ingen endring i skaleringsreglene.
- Ikke fjern eller endre Story 2.1-funksjonene annet enn ved bevisst behov (dokumenter i Implementation Notes).

## I/O & Edge-Case Matrix

| Scenario | Input / tilstand | Forventet | Feil |
|----------|------------------|-----------|------|
| Vellykket import | Gyldig lenke til side med Recipe | Redirect til `/oppskrift/{id}`; lagret som «ikke i samlingen»; kilden vises som lenke | N/A |
| Mangler skjema | «www.matprat.no/oppskrifter/x» | Behandles som `https://…` | N/A |
| Ugyldig lenke | «», «hei», «ftp://a.no», «javascript:alert(1)», «http://», «https://u:p@a.no» | Meldingen om ugyldig lenke; ingenting hentes; lenken står igjen | invalid_url |
| Lokal adresse | `http://localhost`, `http://127.0.0.1`, `http://[::1]`, `http://2130706433`, `http://10.0.0.1`, `http://169.254.169.254` | Blokkert: «siden kunne ikke hentes» | fetch_failed |
| DNS peker privat | Vertsnavn som løser til 10.x eller til både offentlig og privat | Blokkert | fetch_failed |
| Omdirigering til privat | 302 til `http://127.0.0.1/` | Blokkert | fetch_failed |
| Omdirigering til `file:` | `Location: file:///etc/passwd` | Blokkert | fetch_failed |
| For mange omdirigeringer | 6 ledd | Avbrutt | fetch_failed |
| Tidsavbrudd | Server svarer ikke / drypper data over 10 s | Avbrutt etter 10 s; ingen hengende sockets | fetch_failed |
| For stor side | Over 2 MB | Leser maks 2 MB; bruker det som er lest | N/A / no_recipe |
| Statuskode | 404, 500 | «siden kunne ikke hentes» | fetch_failed |
| Ikke HTML | 200 med `application/pdf` eller `image/png` | «Fant ingen oppskrift» | no_recipe |
| Oversiktsside | HTML uten Recipe | «Fant ingen oppskrift på siden» + «Legg inn selv» | no_recipe |
| Tegnsett | ISO-8859-1-side med «æøå» | Riktige tegn | N/A |
| Allerede lagret | Samme URL i samlingen, men annet fragment og `?utm_source=x` | «Du har allerede lagret denne oppskriften» med lenke; ingen henting | duplicate |
| Allerede importert, ikke lagret | Samme URL, `savedAt = null` | Åpner den eksisterende; ingen ny rad, ingen henting | N/A |
| Ulik sti | `/a` og `/A`, `http` mot `https` | Behandles som ulike | N/A |
| Mangler porsjoner | Side uten tolkbart `recipeYield` | Lagres med `originalServings = null`; visningen krasjer ikke | N/A |
| For lange tekster | Tittel 500 tegn, steg 5000 tegn, 150 ingredienser | Avkortet til `LIMITS` (med «…»), maks 100 linjer | N/A |
| Databasefeil | Feil ved lagring | Ingenting lagret; generell melding | unknown |
| Dobbeltklikk | To trykk på «Hent oppskrift» | Bare én henting (knappen er deaktivert); ingen to rader | N/A |
| Lenken beholdes | Enhver feil | Lenken står igjen i feltet; fokus i feltet | N/A |
| Navigasjon | Gå bort og tilbake til Importer | Feltet og feil er nullstilt | N/A |
| Kilde-lenke | Oppskrift med `sourceUrl` `javascript:…` (manipulert rad) | Vises ikke som lenke | N/A |
| Test uten nett | Hele testsuiten | Ingen trafikk ut av maskinen | N/A |

</frozen-after-approval>

## Implementation Notes

Skrevet etter implementasjonen. Alt over `</frozen-after-approval>` er uendret.

### Avvik og tillegg i forhold til spesifikasjonen

- **Ny feiltype `unknown`** i `ERROR_KINDS` (`src/lib/result.ts`) med `errorMessages.unknown = fallbackMessage`. Matrisen sier «unknown» for databasefeil, men typen fantes ikke. `fallbackMessage` er flyttet foran `errorMessages` i `messages.ts`.
- **Meldingstekster endret** i `errorMessages`: `duplicate` («Du har allerede lagret denne oppskriften. Du finner den under Oppskrifter.»), `no_recipe` (teksten fra EXPERIENCE.md om at lenken kan gå til en oversikt) og `fetch_failed` (nevner «legg inn selv»). Ingen annen kode brukte `duplicate`-teksten fra før.
- **`allowLoopbackForTests` er `true | number[]`**, ikke bare en boolsk. En liste åpner loopback bare for de oppgitte portene, slik at testene kan vise at en omdirigering til loopback på en annen port blokkeres (en tredje lokal tjener får null forespørsler). Navnet finnes bare i `http-fetcher.ts`; en test skanner kildekoden for det.
- **Server Action:** `importFromUrl(url)` returnerer `ImportFailure` (og omdirigerer ved suksess) som spesifisert. I tillegg finnes `submitImport(prev, formData)` i samme fil for `useActionState`, som også gjør at skjemaet virker uten JavaScript. Handlingen ligger i `src/app/actions.ts`; typene i `src/app/_shared/import-form.ts`.
- **Skjemaet** bruker `useActionState` og en indre komponent med `key` som økes i `useLayoutEffect`-opprydding, så tilstanden nullstilles når `<Activity>` skjuler siden (samme prinsipp som `useCheckedSet`). Feltet er `readOnly` mens henting pågår («feltet endres ikke»), knappen bruker `aria-disabled` (ikke `disabled`) så fokus blir stående, og en ref hindrer dobbeltsending før React har tegnet «pending». Feilen skjules mens en ny henting pågår og tegnes på nytt etterpå, så `role="alert"` leses opp også ved samme feil to ganger.
- **Adresseklassifiseringen er strengere enn lista** på disse punktene: vertsnavn uten punktum blokkeres; hele `::/96` (dekker `::`, `::1` og IPv4-kompatible), `::ffff:0:0:0/96` (SIIT), `64:ff9b:1::/48`, `2001::/32` (Teredo) og `fec0::/10` blokkeres; 6to4 (`2002::/16`) godtas bare når den innebygde IPv4-adressen er offentlig; adresser med sone-id (`%eth0`) og alt som ikke lar seg tolke, regnes som blokkert.
- **HTTP-adapteren:** bare status 200 leses som side; andre 2xx (204, 206 …) og ikke-omdirigerende 3xx gir `fetch_failed`. 200 uten `Content-Type` gir `no_recipe`. Svar med `Content-Encoding` som ikke er `identity` gir `fetch_failed` (vi dekomprimerer aldri). Et svar som avbrytes midt i kroppen er `fetch_failed`, mens en side som treffer 2 MB-grensen brukes avkortet. `Location` kjøres gjennom `validateUrl`, så en omdirigering til en adresse over 2048 tegn avvises. Standard `lookup` er `dns.promises.lookup(host, { all: true, verbatim: true })`; Node kaller `lookup` med `all: true` ved `autoSelectFamily`, og begge formene støttes. Én felles `AbortController` og én timer for hele kjeden; timeren ryddes i `finally`, og hver forespørsel ødelegges alltid (også ved suksess).
- **Lagring:** `insertRecipe` er delt i `insertRecipeRows` (uendret oppførsel) og to nye funksjoner i repositoriet: `findRecipeBySourceUrl` og `insertImportedRecipe`. Den siste sjekker og skriver i én `BEGIN IMMEDIATE`-transaksjon, så en lagring som skjer mens vi henter (eller en samtidig import) gir `duplicate` eller gjenbruk i stedet for en ekstra rad. To samtidige importer av samme adresse gir derfor `ok` med samme id til begge.
- **Avkorting:** i tillegg til tittel, ingredienser og steg avkortes `sourceName` og stegseksjonsnavn til 200 tegn (ingen egen grense finnes i `LIMITS`). Avkortingen deler aldri et surrogatpar (`src/lib/truncate-text.ts`).
- **`validateUrl`:** tekst uten skjema godtas bare når verten har punktum og et siste ledd med minst to bokstaver (også IDN og punycode) eller er en IPv4-adresse; «hei», «1.5 dl melk» og lignende gir `invalid_url`. `//host/sti` godtas som `https://host/sti`. «host.no:8080/x» regnes som adresse uten skjema, ikke som skjemaet «host.no:». Også den normaliserte `href` kan maks være 2048 tegn.
- **`normalizeSourceUrl`:** sporingsnavn sammenlignes uavhengig av store/små bokstaver og etter prosentdekoding; tomme parameterdeler (`&&`) fjernes. Ugyldig tekst returneres uendret. `isHttpUrl` er lagt til i samme fil og brukes av oppskriftssiden.
- **Testdata:** de fire matprat- og godt-sidene manglet i `test/fixtures/sources.md` (utsatt fra 2.1); de er nå lagt til med kanonisk URL fra HTML-en, og `scripts/fetch-fixtures.sh` henter dem. Matprat-adressene har avsluttende `/`, og fixture-adapteren sammenligner stien nøyaktig.
- **Oppskrift uten porsjonsantall:** `IngredientList` håndterte allerede `originalServings = null` (ingen porsjonsvelger, faktor 1, uskalerte mengder), så ingen endring var nødvendig; vist med tester i `RecipeView` og `initialValuesOf`. «Rediger» viser et tomt antallsfelt, og lagring krever et antall (utsatt til 2.4).
- **Oppskriftssiden:** kilden er en understreket lenke i aksentfarge med `aria-label` «<navn>, åpner kilden i ny fane». Lenken er minst 44 px høy, noe som gir litt luft under tittelen.

### Verifisering

- `npm run lint`, `typecheck`, `format:check` og `build` er grønne; `npm test`: 71 filer og 2118 tester (før storyen: 60 og 1612). `package.json` og `package-lock.json` er byte-for-byte uendret (sjekksum før og etter).
- Hvert vern i adapteren ble mutasjonstestet for hånd (fjernet ett av gangen, og testene feilet): sjekken i `lookup`, sjekk av hver omdirigering, timer-opprydding, størrelsesgrensen, `request.destroy()`, `Accept-Encoding`, omdirigeringsgrensen, fristen, IPv4-mappet adresse, 6to4 og kontroll av `Content-Type`. Unntak: å fjerne `validateUrl` fra adapteren feilet ingen test, fordi `http.request` selv kaster for `ftp:`/`file:`; skjemasjekken er dermed et ekstra lag, ikke det eneste.
- Ende-til-ende mot en lokal 127.0.0.1-tjener er dekket av `http-fetcher.test.ts` (127 tester). Røyktesten av hele rørledningen er `import-service.test.ts` (fixture-adapter mot database i minnet). Selvsignert HTTPS-sertifikat avvises (testen lager sertifikatet med `openssl` og hoppes over uten).
- Nettleser (headless Chromium, `IMPORT_SOURCE=fixtures`, midlertidig database, engangsskript utenfor repoet): fokus i feltet, ugyldig lenke, blokkert adresse, ingen oppskrift, nullstilling ved navigasjon, vellykket import med kilde-lenke (`target`, `rel`), gjenbruk av ulagret import, duplikat med «Åpne oppskriften», «Henter oppskriften …» (`aria-disabled`, status, fokus beholdt), ingen horisontal scroll og kontroller ≥ 44 px ved 360 og 1280 px i lys, mørk og forced-colors, og skjemaet uten JavaScript: 35 av 35 sjekker. Serveren er stoppet, og skjermbildene ligger i scratchpad.

### Usikkerhet

- Adapteren er ikke prøvd mot ekte nettsider (ingen utgående nett fra tester, og miljøet har bare proxy for HTTPS). Oppførsel mot reelle servere (HTTP/2-forwarders, sider som blokkerer `RecipeMate`-agenten eller krever cookies) er ukjent.
- Tidsfrist-, drypp- og størrelsestestene bruker ekte tidtakere med korte frister (200–350 ms) mot lokale tjenere; på en svært treg maskin kan de i teorien bli ustabile. De ble kjørt gjentatte ganger og parallelt uten feil.
- `ManualRecipeForm.test.tsx` skriver «Not implemented: navigation to another Document» fra jsdom; det gjaldt før denne storyen og er ikke endret.
- Sesjonslogg etter CLAUDE.md er ikke skrevet, siden arbeidet ikke committes her.

## Review Triage Log

Tre uavhengige gjennomganger (spesifikasjon/data/arkitektur, sikkerhet i henting og URL, UI/tilgjengelighet/testkvalitet i Chromium). Ingen høye funn. Sikkerhetsgjennomgangen fant ingen vei forbi vernene mot interne adresser.

### Rettelser etter kodegjennomgang

- Gjenbrukt ulagret import fikk beholde gammel `createdAt` og kunne ryddes bort av døgnrenholdet rett etterpå → `refreshUnsavedRecipe` fornyer `createdAt` ved gjenbruk (test).
- `revalidatePath` lå i samme `try` som importen, så en revalideringsfeil ga «unknown» selv om oppskriften var lagret → flyttet ut, feilen logges og brukeren sendes videre (test).
- `validateUrl` trimmet vilkårlig lange tekster → avviser tekst over 4096 tegn før trimming (test).
- `normalizeSourceUrl`: «matprat.no.» og «matprat.no» er nå samme adresse (test).
- Utkoblet «Henter oppskriften …»-knapp hadde 2,6:1 kontrast (`opacity: .6`) → tint-bakgrunn og primærtekst, uten opacity.
- Testhull funnet ved mutasjon: dobbeltinnsendingsvakten (test med to synkrone `requestSubmit`) og fokus tilbake til feltet etter feil ved knappeklikk (test). Dødt `key={state.attempt}` fjernet.

### Utsatt / bevisst ikke gjort

- Portbegrensning (80/443/8080/8443) i adapteren: ville kreve omskriving av testene som bruker lokale tjenere; adressepolicyen er allerede på plass. Se deferred-work.
- Prosentkodingens store/små bokstaver i `normalizeSourceUrl`, `ref` som sporingsparameter, omdirigeringsaliaser som egne rader, manglende indeks på `source_url`, tidsavbrudd på DNS-oppslag, samtidighetsgrense: ført i deferred-work.
- To lenker «Legg inn selv» samtidig på importsiden og dobbel opplesing av feilen (alert + describedby): ikke WCAG-brudd, ikke endret.
- CSS-testene er streng-søk og dekker lite av kontrast og forced-colors: akseptert, målt manuelt i Chromium.
