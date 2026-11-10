# Utsatt arbeid

- source_spec: `spec-1-1-oppsett-toppmeny-visuell-profil.md`
  summary: Legg til CI (GitHub Actions) som kjører npm ci, lint, typecheck, test og format:check på push.
  evidence: Kvalitetsporten i README håndheves ikke automatisk; funnet B2 i gjennomgangen av Story 1.1.
- source_spec: `spec-1-1-oppsett-toppmeny-visuell-profil.md`
  summary: Legg til `messageFor(kind)` med norsk reservemelding og stram inn `errorMessages` til full `Record<ErrorKind, …>` når første feiltype tas i bruk.
  evidence: `errorMessages` er tom og `Partial`; en feiltype uten melding gir tom tekst. Funn B7/E5, blir reelt i Story 1.4.
- source_spec: `spec-1-1-oppsett-toppmeny-visuell-profil.md`
  summary: Vurder `server-only`-vakt i `src/server/config.ts` når første serverkode som importerer den kommer.
  evidence: Uten vakt kan en klientkomponent importere config og få tomme verdier. Funn E3; ingen klientimport finnes ennå.
- source_spec: `spec-1-3-skaler-og-formater-mengder.md`
  summary: Vis enheten slik den står i oppskriften (bøyning og skrivemåte), behold «ca.» fra originalteksten og vis originallinjen uendret ved faktor 1.
  evidence: `formatLine` skriver enhetsnøkkelen («bokser» → «boks», «kilo» → «kg») og mister «ca.»-prefikset; krever at `ParsedLine` bevarer originalt enhetsord. Funn B6/E5/E6/E7, hører hjemme i Story 1.5 (visning).
- source_spec: `spec-1-4-legg-inn-oppskrift-manuelt.md`
  summary: Oppskriftssiden: sidetittel fra oppskriftens tittel (`generateMetadata`) og ekte HTTP 404 for ukjent oppskrift.
  evidence: Sidetittelen er alltid «Oppskrift», og `/oppskrift/999999` svarer 200 fordi `notFound()` kalles inne i Suspense etter at strømmingen har startet. Funn B7 og implementasjonsnotat; hører til Story 1.5.
- source_spec: `spec-1-5-se-oppskrift-og-velg-antall.md`
  summary: Vis enheten slik den står i oppskriften («bokser», «SS.») og behold «ca.» fra originalteksten; krever nye felt i `ParsedLine` og i `ingredient_lines`.
  evidence: Utsatt fra 1.3 til 1.5, men holdt utenfor 1.5 fordi det endrer tolkekontrakten og alle tolketester. Hører til «hvis tid» eller en egen liten story etter Epic 3.
- source_spec: `spec-1-5-se-oppskrift-og-velg-antall.md`
  summary: Ekte HTTP 404 for ukjent oppskrift (i dag 200 med norsk 404-innhold).
  evidence: Med Cache Components må `params` leses inne i Suspense, så strømmen starter før `notFound()`. Krever annen sidestruktur; lav brukerverdi i en lokal app.
- source_spec: `spec-1-5-se-oppskrift-og-velg-antall.md`
  summary: Vis seksjonsoverskrifter i stegene (`Step.section`) slik ingrediensseksjoner vises.
  evidence: Story 2.1 beholder seksjonsnavn fra `HowToSection`, men oppskriftssiden viser stegene som én liste. Funn E5.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Redigering av kilde, mappe, favoritt og seksjoner (ingredienser og steg) i redigeringsskjemaet.
  evidence: Skjemaet har bare tittel, antall personer, ingredienser og steg. Ingredienser og steg lagres uten seksjon, så seksjoner fra import forsvinner når oppskriften redigeres. Tas når seksjoner, kilde og mapper kan redigeres.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Rad-id for ingredienser og steg er ikke stabil mellom redigeringer.
  evidence: Redigering sletter og setter inn linjer og steg på nytt. Ingen funksjon bruker rad-id ennå (avkrysning er klienttilstand); vurder oppdatering på plass hvis noe begynner å lagre mot rad-id.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Oppskrift med verdier utenfor `LIMITS` (mulig etter import) kan ikke lagres uendret i redigeringsskjemaet.
  evidence: Redigering bruker samme grenser som «Legg inn selv». Håndteres når import kan gi lengre tekster.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Tegn med nullbredde (U+200B m.fl.) passerer `trim()` i tittel og linjer.
  evidence: Gjelder også «Legg inn selv» og er ikke en regresjon.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Ved `not_found` under lagring peker «Avbryt» til en side som gir 404.
  evidence: Sjeldent i en enbrukerapp; tas hvis det oppstår.
- source_spec: `spec-3-5-rediger-oppskrift.md`
  summary: Fokusflytt til første feil kan gjentas når en side gjenopprettes av Cache Components.
  evidence: Sjekkes i nettleseren sammen med at skjemaet ikke viser gamle verdier ved ny åpning.

- source_spec: `spec-1-6-kryss-av-under-matlaging.md`
  summary: Klikk på −/+ rett etter ugyldig kladd i porsjonsfeltet ved grensen: blur-commit av kladden gjør at klikket likevel virker (verdi 1, kladd «5», klikk − gir 4).
  evidence: Funn E1; følge av `aria-disabled` i stedet for `disabled`. Resultatet er et gyldig tall; kan løses ved å lese grensen ved `pointerdown`.

- source_spec: `spec-3-1-se-samlingen.md`
  summary: Sporing av «sist åpnet» i Samlingen (FR-16).
  evidence: Samlingen sorteres på «sist lagret først» og dekker FR-16 med «sist lagret». Å spore åpninger krever en ny kolonne og skriving ved visning av oppskriften; tas hvis rekkefølgen etter bruk viser seg å savne det.
- source_spec: `spec-3-1-se-samlingen.md`
  summary: Sidedeling og søk i Samlingen.
  evidence: Alle oppskrifter listes i én liste. Greit for en lokal enbrukerapp med få oppskrifter; vurderes når samlingen blir stor.
- source_spec: `spec-3-1-se-samlingen.md`
  summary: Antall oppskrifter under overskriften i Samlingen (UX-mockupen) og «sist brukt» som rekkefølge (EXPERIENCE.md).
  evidence: Ikke krevd av Story 3.1; sorteringen er «sist lagret først». Tas sammen med sporing av «sist åpnet».
- source_spec: `spec-3-1-se-samlingen.md`
  summary: Import (Epic 2) må lagre tom kilde-lenke som `null`, ikke som tom streng.
  evidence: Migrasjonen 0001 og regelen «uten kilde-lenke» bruker `source_url IS NULL`; en tom streng ville ikke blitt flyttet inn i samlingen.

- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Rydding av ulagrede oppskrifter gjentas bare mens appen kjører.
  evidence: `instrumentation.ts` rydder ved oppstart og deretter hver time med `setInterval`; en app som står lenge uten omstart rydder hver time, men ingenting rydder mens den er stoppet. Greit for en lokal app; vurder en annen planlegger hvis appen skal kjøre på en server.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Kanten øverst på lagre-linjen vises alltid, ikke bare når innholdet ruller under.
  evidence: DESIGN.md sier «når innholdet ruller under»; `position: sticky` gir ingen enkel måte å vite det på uten skrollobservasjon. Akseptert i Story 3.2.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Ny import (Epic 2) skal bruke samme `savedAt = null`-regel.
  evidence: Importerte oppskrifter lagres først uten `savedAt` og legges i samlingen med «Lagre»; uten det ryddes de bort etter et døgn. Import må også skrive `createdAt` med `new Date().toISOString()`; opprydding sammenligner ISO-tekst, og et annet format (for eksempel mellomrom i stedet for «T») kan gi feil sletting.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Valgt antall personer huskes ikke når det velges før oppskriften er lagret; etter «Lagre» åpnes den på opprinnelig antall ved neste besøk.
  evidence: Spesifikasjonen lagrer bare antall for oppskrifter i samlingen. Gjelder først importerte oppskrifter (Epic 2); løses der, for eksempel ved at «Lagre» tar med valgt antall.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: `env(safe-area-inset-bottom)` på lagre-linjen har ingen effekt fordi viewport mangler `viewportFit: "cover"`; dimmingen bak dialogen lysner siden i mørk palett.
  evidence: Funnet i gjennomgangen. Nettleseren holder selv innholdet unna hjemmeindikatoren, og dialogen skilles tydelig også i mørk palett; vurderes ved designgjennomgang av hele appen.
- source_spec: `spec-3-2-lagre-og-slett.md`
  summary: Et sent `rememberServings`-kall kan skrive et valgt antall rett etter at en redigering har nullstilt det.
  evidence: Bare mulig hvis «Rediger» og lagring skjer innen noen få millisekunder etter å ha endret antallet; ingen versjonssjekk finnes. Ikke tatt hånd om i v1.

- source_spec: `spec-3-3-mapper.md`
  summary: Mappevalg i redigeringsskjemaet (Story 3.5).
  evidence: Mappe velges bare fra lagre-linjen på oppskriftssiden; redigering beholder mappen (`updateRecipe` rører ikke `folder_id`). Utsatt som i Story 3.5.
- source_spec: `spec-3-3-mapper.md`
  summary: Ingen grense for antall mapper.
  evidence: Alle mapper listes og vises i dialogen «Lagre i mappe». Greit for en lokal enbrukerapp; vurder en grense eller søk hvis listen blir lang.
- source_spec: `spec-3-3-mapper.md`
  summary: Mapper sorteres bare alfabetisk på navn (norsk), uten annen sortering, søk eller sidedeling.
  evidence: Utenfor Story 3.3 (Never-listen); tas hvis behovet viser seg.
- source_spec: `spec-3-3-mapper.md`
  summary: Radiogruppen i «Lagre i mappe» har ingen maksimal høyde; «Lagre» og «Avbryt» havner under bretten med mange mapper.
  evidence: Funnet i gjennomgangen (12 mapper ved 360 × 700). Dialogen scroller og fokus følger med. Løses sammen med en eventuell grense eller søk i mapper.
- source_spec: `spec-3-3-mapper.md`
  summary: `FolderRow`, `FolderNameForm` og `FolderDialog` har ingen egne `forced-colors`-regler.
  evidence: De bruker kantlinje, outline og innebygde radioer og ventes å fungere i høykontrast, men det er ikke målt. Sjekkes sammen med forced-colors i 1.6.
- source_spec: `spec-3-3-mapper.md`
  summary: Gjentatt sletting eller flytting av en mappe som allerede er slettet (annen fane) revaliderer ikke, så raden eller valget står igjen til neste innlasting.
  evidence: Samme mønster som `removeRecipe` ved `not_found` i 3.2; brukeren får en melding. Tas hvis det oppstår.

## Story 3.4: favoritter

- source_spec: `spec-3-4-favoritter.md`
  summary: Favoritter sorteres som Samlingen (sist lagret først); det finnes ingen «sist åpnet» ennå.
  evidence: Spesifikasjonen ber om samme sortering, og ingen kolonne for sist åpnet finnes. Tas hvis egen rekkefølge eller «sist åpnet» innføres (utenfor Never-listen i 3.4).
- source_spec: `spec-3-4-favoritter.md`
  summary: To avmarkeringer på Favoritter innen 3 sekunder kunngjøres ikke begge for skjermleser (samme tekst i `role="status"` leses ikke på nytt).
  evidence: `FavoriteFeedback` setter samme melding to ganger; teksten endres ikke. Kan løses med et teller-suffiks usynlig for syn, eller ved å tømme området mellom meldingene.
- source_spec: `spec-3-4-favoritter.md`
  summary: Fokus flyttes til overskriften når et avmarkert kort forsvinner, ikke til neste korts hjerte.
  evidence: Valgt som enkleste stabile mål (tillatt i spesifikasjonen). Brukeren som vil fjerne flere favoritter må tabbe tilbake til listen etter hver fjerning.
- source_spec: `spec-3-4-favoritter.md`
  summary: Raske trykk på hjertet gir like mange serverkall som trykk (i kø), ikke ett kall for siste verdi.
  evidence: Kallene sendes ett om gangen og er idempotente, så sluttilstanden er riktig, men et sammenslått kall (bare siste ønskede verdi) ville spart kall. Ikke gjort for å holde logikken enkel.
- source_spec: `spec-3-4-favoritter.md`
  summary: En feilmelding på et kort vises under kortet og lukkes ikke av seg selv; den forsvinner først ved neste trykk på hjertet.
  evidence: Gjelder bare Samlingen, mapper og Favoritter (lagre-linjen bruker statusområdet). Greit for feil som er sjeldne (slettet i annen fane, databasefeil).
- source_spec: `spec-3-4-favoritter.md`
  summary: Å avmarkere en favoritt i en annen fane oppdaterer ikke åpne sider før de revalideres; hjertet kan vise gammel tilstand til neste navigasjon.
  evidence: Ingen live-oppdatering; eksplisitt verdi i handlingen gjør at et trykk likevel ikke snur feil vei.
- source_spec: `spec-3-4-favoritter.md`
  summary: `forced-colors`, 200 % zoom, Safari og 1280 px er ikke målt for hjertet og kortene.
  evidence: Bare CSS-reglene er testet som tekst (tokens, px, `forced-colors: active`). Sjekkes sammen med øvrige forced-colors-punkter fra 3.3 og 1.6.
- source_spec: `spec-3-4-favoritter.md`
  summary: Redigeringsskjemaet kan ikke endre favoritt; hjertet står bare i lagre-linjen og på kort.
  evidence: Redigering beholder favoritten (`updateRecipe` rører ikke `is_favorite`), som i Story 3.5-notatet om kilde, mappe og favoritt.
- source_spec: `spec-3-4-favoritter.md`
  summary: Ekte-nettleser-test (Playwright) for hjerte og kort ved 360 px; test for «skjult Activity mens hjertet har fokus».
  evidence: Layouttestene er jsdom og tekst-regex; målt manuelt i Chromium i kodegjennomgangen (ingen overlapp, ingen sidescroll ved 360, 768, 1280 px).
- source_spec: `spec-3-4-favoritter.md`
  summary: Hjertet i lagre-linjen har ingen ramme og ser løsrevet ut ved siden av rammede knapper.
  evidence: Estetikk; vurderes etter Majas skjermbilder.


## Story 2.1

- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: Vis `section` for steg i oppskriftssiden og ta vare på den ved lagring/redigering; `normalizeRecipe` leverer allerede seksjonsnavn fra `HowToSection`.
  evidence: Lagring og visning er utenfor 2.1; se også 1.5 og 3.5 over (seksjoner forsvinner ved redigering).
- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: Grenser fra `LIMITS` (tittel 200, 100 linjer, 300 tegn per ingrediens, 2000 per steg) håndheves ikke ved lesing; Story 2.2 må avkorte, avvise eller dele før lagring.
  evidence: Spesifikasjonen sier at lange tekster ikke avkortes i `normalizeRecipe`. En importert side kan ha flere enn 100 steg eller en tekstblokk over 2000 tegn.
- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: `Recipe` som bare ligger under andre felt (for eksempel `mainEntity` på en `WebPage`, eller via `@id`-referanse) følges ikke, og bare første `Recipe` på siden brukes.
  evidence: Bevisst etter spesifikasjonen; test låser det. Sjekk om reelle sider (Yoast, WordPress) trenger det når flere kilder prøves i 2.2.
- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: Mikrodata (`itemprop`) og RDFa uten JSON-LD støttes ikke. De to matoppskrift.no-sidene og BBC Good Food-siden i testdataene har ingen JSON-LD `Recipe`, så de gir `no_recipe`.
  evidence: Fixtures `matoppskrift-*`, `bbcgoodfood-lasagne`. Kan gi bedre treff på eldre sider, men krever en HTML-tolker eller en mer omfattende skanner.
- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: Porsjonsantall: tekst som «2 x 4 porsjoner» gir 2, og «Serves 4-6» gir 4. Enheter ved tallet («350 g») vurderes ikke, bare grensene 1–50.
  evidence: Valgt for å følge «første heltall» i spesifikasjonen; ingen gjetting utover det. Brukeren kan endre antallet ved import (2.3/2.4).
- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: Tagger med `>` inne i anførselstegn i attributter (`<a title="a>b">`) fjernes ikke helt; resten etter første `>` blir stående som tekst. Kodede URL-er som ren tekst (uten tagg) beholdes.
  evidence: Tagg-fjerningen er bevisst enkel og lineær (ingen regex med bakoversøk). Teksten vises alltid som tekst (AD-8), så det er ikke et sikkerhetsproblem, bare et kosmetisk.
- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: `test/fixtures/sources.md` lister ikke de fem nye sidene fra matprat.no og godt.no (bare de seks første).
  evidence: Filene finnes i `test/fixtures/html/` og brukes i `recipe-import.test.ts`; spesifikasjonen sier at sources.md er oppdatert, men tabellen mangler radene. Ikke endret i denne storyen.
- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: Første `Recipe` som er et tomt skall skjuler en komplett senere `Recipe` på samme side.
  evidence: Følger spesifikasjonen («første vinner»). Story 2.2 kan la extract returnere kandidater og normalize velge første brukbare. `servings: null` må også håndteres i 2.2/2.4, siden `createManualRecipe`-stien krever et tall.
- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: Flytt generiske `Result`/`ok`/`err` til `src/domain/result.ts` og re-eksporter fra `src/lib/result.ts`, så domenet slipper egne feiltyper (`ImportResult`/`ImportError`).
  evidence: `domain-purity.test.ts` er strengere enn AD-1 og forbyr import utenfor `src/domain`. Dagens løsning er låst av en typetest mot `Result<T, AppError>`.
- source_spec: `spec-2-1-les-oppskriftsdata.md`
  summary: Ytelsestestene for import tar ca. 20 s; vurder å skille dem ut i en egen testkjøring.
  evidence: 2 MB-mønstre med terskel 3 s (kravet er under 1 s på vanlig maskin).

## Story 2.2

- source_spec: `spec-2-2-importer-fra-lenke.md`
  summary: Ulagrede importer ryddes bare bort etter et døgn (Story 3.2), og en import som ikke lagres, blir stående som rad til da. Gjenbruk av en gammel rad viser dataene fra første henting.
  evidence: Bevisst etter spesifikasjonen («gjenbruk uten ny henting»). Vurder en «Hent på nytt»-handling eller en kortere levetid.
- source_spec: `spec-2-2-importer-fra-lenke.md`
  summary: Tekst som avkortes til `LIMITS` (tittel 200, ingrediens 300, steg 2000) og linjer utover 100 forkastes uten at brukeren får beskjed.
  evidence: Spesifikasjonen krever avkorting, ikke varsel. Vurder en nøytral merknad på oppskriftssiden når noe er avkortet.
- source_spec: `spec-2-2-importer-fra-lenke.md`
  summary: Porsjonsdialogen «Hvor mange er oppskriften laget for?» mangler. En importert oppskrift uten antall (`originalServings = null`) vises uskalert uten porsjonsvelger, og «Rediger» krever et antall (feltet står tomt).
  evidence: `IngredientList` håndterte `null` fra før; Story 2.4 bygger dialogen.
- source_spec: `spec-2-2-importer-fra-lenke.md`
  summary: Mikrodata/RDFa og sider som krever JavaScript for å vise oppskriften gir `no_recipe`; HTML hentes uten nettleser og uten cookies, så sider bak samtykkevegg eller innlogging feiler.
  evidence: Videreført fra Story 2.1. Adapteren leser ikke HTML som kode.
- source_spec: `spec-2-2-importer-fra-lenke.md`
  summary: Adressesjekken er strengere enn spesifikasjonen på noen punkter: navn uten punktum (`intranett`) blokkeres, og `::/96`, `::ffff:0:0:0/96`, `64:ff9b:1::/48`, `2001::/32` (Teredo), `fec0::/10` blokkeres. 6to4 (`2002::/16`) godtas bare når den innebygde IPv4-adressen er offentlig.
  evidence: Se Implementation Notes. Ingen av dem skal være nåbare offentlige oppskriftssider.
- source_spec: `spec-2-2-importer-fra-lenke.md`
  summary: Hvis Node startes med `NODE_USE_ENV_PROXY=1` eller en proxy via miljø, går forespørslene via proxyen og adressesjekken gjelder proxyens adresse, ikke målet. `http.request` bruker ikke proxy som standard.
  evidence: Ikke testet. Dokumentér eller blokker proxybruk hvis appen noen gang kjøres bak en proxy.
- source_spec: `spec-2-2-importer-fra-lenke.md`
  summary: Ingen hastighetsbegrensning på importer; én bruker kan starte mange samtidige hentinger (hver maks 2 MB og 10 s).
  evidence: Lokal enbrukerapp (PRD §6). Vurder en kø eller grense hvis appen hostes.
- source_spec: `spec-2-2-importer-fra-lenke.md`
  summary: Playwright-ende-til-ende-tester finnes ikke i repoet; nettleserkontrollen (360/1280 px, lys/mørk, forced-colors, uten JavaScript) ble gjort manuelt med et engangsskript utenfor repoet.
  evidence: AD-11 nevner Playwright, men pakken er ikke installert i prosjektet, og Story 2.2 forbyr nye pakker.

- source_spec: `spec-2-2-importer-fra-lenke.md`
  summary: Fra kodegjennomgangen: adapteren begrenser ikke portnummer (bare offentlig adresse); `normalizeSourceUrl` normaliserer ikke store/små bokstaver i prosentkoding og behandler `ref` som sporingsparameter; omdirigeringer (alias-adresser) gir egne rader; `recipes.source_url` har ingen indeks; DNS-oppslaget har ikke eget tidsavbrudd; ingen samtidighetsgrense på importer.
  evidence: Ingen av dem gir sikkerhetshull (adressepolicyen kontrolleres per hopp). Vurder ved hosting.

- source_spec: `spec-4-1-forslag-i-demomodus.md`
  summary: Med `LLM_API_KEY` satt brukes fortsatt mock-leverandøren (`suggestionMode: "llm"` peker på mock) til språkmodell-adapteren kommer i Story 4.3.
  evidence: Løst i Story 4.3: `providerFor` gir språkmodell-adapteren med nøkkel.
- source_spec: `spec-4-1-forslag-i-demomodus.md`
  summary: Hvert trykk på «Få forslag» er ett kall til leverandøren. Mock er gratis, men språkmodellen koster penger, og det finnes ingen grense mot gjentatte kall.
  evidence: Delvis løst i Story 4.3: maks 10 kall per minutt per prosess i adapteren. Ingen grense per oppskrift eller bruker.
- source_spec: `spec-4-1-forslag-i-demomodus.md`
  summary: På smal skjerm står forslagene visuelt mellom ingredienser og steg (UX), men etter stegene i dokumentet, slik at tastaturrekkefølgen følger bredt oppsett.
  evidence: Ikke testet med skjermleser. Vurder å flytte forslagene i dokumentet hvis det viser seg forvirrende.

- source_spec: `spec-4-2-ta-i-bruk-forslag.md`
  summary: Ingen grense for antall valgte forslag per oppskrift. Hvert forslag er maks 300 + 400 tegn, men antallet er ubegrenset; unik indeks hindrer bare identisk tekst.
  evidence: Lokal enbrukerapp (PRD §6). Vurder en grense (for eksempel 20) hvis appen hostes.
- source_spec: `spec-4-2-ta-i-bruk-forslag.md`
  summary: Forslagsdelen eier listen over valgte forslag i klienttilstand (startverdi fra siden). En endring gjort i en annen fane eller økt vises først når siden åpnes på nytt.
  evidence: Valgt for at listen ikke skal hoppe ved revalidering. Fjern/ta i bruk på et forslag som er borte gir en melding.
- source_spec: `spec-4-2-ta-i-bruk-forslag.md`
  summary: Sporadisk testfeil sett én gang på Macen under Story 4.1: `ManualRecipeForm.test.tsx > deaktiverer knappen mens skjemaet sendes` (forventet fokus på tittelfeltet, fikk knappen). Bestod ved neste kjøring og i alle kjøringer i skymiljøet.
  evidence: Løst 2026-11-10: testen venter nå på fokus (`waitFor`) i stedet for å sjekke det rett etter at knappen er aktiv. Årsak: komponenten flytter fokus i en effekt etter at `pending` er false. Sett igjen på Macen (11:56, grønn ved neste kjøring).

- source_spec: `spec-4-3-forslag-fra-sprakmodell.md`
  summary: Adapteren er ikke prøvd mot ekte API (ingen nøkkel eller nett i utviklingsmiljøet). Svarformen er bygget etter dokumentert Messages API og testet med lagrede svar.
  evidence: Maja prøver 3–5 oppskrifter med egen nøkkel og ser at forslagene er konkrete og trygge (research-og-avklaringer A6). Rett prompten i `llm-suggestions.ts` ved behov.
- source_spec: `spec-4-3-forslag-fra-sprakmodell.md`
  summary: Grensen på 10 kall i minuttet er per prosess og i minnet; den nullstilles ved omstart og deles av alle brukere. Oppskriftstekst fra nettet sendes til tredjepart (prompt-injeksjon mulig, men svaret valideres og vises bare som tekst).
  evidence: Greit for en lokal skoleapp. Vurder per-bruker-grense og innholdsfilter ved hosting.

- source_spec: `oppryddingsøkt 2026-11-10`
  summary: `npm audit` gir 11 moderate funn, alle i utviklingsverktøy: `esbuild` ≤ 0.24.2 via `drizzle-kit` → `@esbuild-kit` (utviklingsserveren til esbuild), og `minimatch` 7–11 via `eslint-config-next` → `@typescript-eslint` (DoS ved ugunstig mønster). `npm audit --omit=dev` gir 0.
  evidence: Rettelse krever `npm audit fix --force` (hovedversjonsbytte av `drizzle-kit` og `eslint-config-next`). Ikke gjort for å unngå brudd like før innlevering; vurder når verktøyene uansett oppdateres.
- source_spec: `oppryddingsøkt 2026-11-10`
  summary: CI-arbeidsflyten `.github/workflows/ci.yml` er skrevet men ikke kjørt på GitHub. `npm ci` på ubuntu bygger `better-sqlite3` fra ferdig bygg (`gypfile: false`), og e2e installerer Chromium med `--with-deps`.
  evidence: Se første kjøring under Actions og rett ved behov.

