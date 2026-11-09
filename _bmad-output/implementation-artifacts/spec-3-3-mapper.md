---
title: 'Story 3.3: Sorter oppskrifter i mapper'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '3aa0a75'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---
<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Samlingen er én lang liste. Mapper-siden viser bare en tom-tilstand, og en oppskrift kan ikke legges i en mappe (FR-14, FR-16, UX-DR9, UX-DR10, UX-DR11, UX-DR13).

**Approach:** En ny tabell `folders` og en valgfri kolonne `recipes.folder_id` (en oppskrift ligger i maks én mappe). Mapper-siden lar meg opprette, gi nytt navn til og slette mapper, og viser antall oppskrifter per mappe. Hver mappe har en egen side (`/mapper/[id]`) med oppskriftene i den, eller en tom-tilstand. I lagre-linjen velger jeg mappe for en lagret oppskrift i dialogen «Lagre i mappe» (velg mappe, ny mappe eller ingen). Oppskriftskortene i Samlingen og i mappen viser mappenavnet. Sletter jeg en mappe, blir oppskriftene liggende i samlingen uten mappe.

## Boundaries & Constraints

**Always:**
- **Skjema og migrasjon** (AD-6): én ny migrasjon `drizzle/0002_*.sql` laget med `npm run db:generate` (journal og snapshot committes). `folders`: `id` (autoinkrement), `name` (tekst, ikke null, slik brukeren skrev det etter trimming), `name_key` (tekst, ikke null, **unik**: navnet normalisert for sammenligning), `created_at` (ISO UTC, ikke null). `recipes.folder_id`: heltall, valgfritt, fremmednøkkel til `folders.id` med `ON DELETE SET NULL`. Eksisterende rader får `folder_id = NULL`. Migrasjonen kjøres av `openDatabase` og `npm run db:migrate`, og testes: på en database laget med bare 0000 og 0001 med data i (oppskrifter, linjer og steg bevares), og rerun uten feil.
- **Navneregler** (service, `src/server/services/folder-service.ts`; sjekkes også i Server Action med zod): navnet trimmes og blanke tegn i serie slås sammen til ett mellomrom; 1–40 tegn (telt som Unicode-tegn, ikke UTF-16-enheter); `name_key` er navnet NFC-normalisert og lowercased med `toLocaleLowerCase("nb")`, så «hverdag», «Hverdag» og «HVERDAG» er samme navn, også med æ, ø og å. Unikt på `name_key`. Å gi en mappe nytt navn med bare endret store og små bokstaver er lov (egen id ekskluderes). Feil: `validation` med `detail` `name_required`, `name_too_long` eller `name_taken`; meldingene (AD-7) vises under feltet og ligger i `folderMessages` i `src/lib/messages.ts`. Ukjent id gir `not_found`.
- **Repository** (`src/server/db/repositories/folder-repository.ts` + test mot in-memory SQLite): `insertFolder`, `renameFolder`, `deleteFolder` (oppskriftene beholdes; `folder_id` settes til `NULL`; testes både via FK og at ingen oppskrift slettes), `listFolders(db)` med antall oppskrifter per mappe (venstre-join, tellingen teller bare oppskrifter i samlingen), `findFolderById`, `listRecipesInFolder(db, id)` (samme `RecipeSummary` og sortering som samlingen), `assignRecipeToFolder(db, recipeId, folderId | null)` (bare for lagret oppskrift; `false` ellers) og `assignRecipeToNewFolder(db, recipeId, folder)` som oppretter mappen og flytter oppskriften i én transaksjon (feiler noe, finnes ingen ny mappe). `updatedAt` på oppskriften røres aldri av mappehandlinger (avkrysning og valgt antall er nøklet på den). `updateRecipe` (redigering) rører ikke `folder_id`.
- **Tjeneste:** `createFolder(name)`, `renameFolder(id, name)`, `deleteFolder(id)`, `listFolders()` (sortert alfabetisk med `Intl.Collator("nb")`), `getFolderWithRecipes(id)`, `moveRecipeToFolder(recipeId, folderId | null)` og `moveRecipeToNewFolder(recipeId, name)`. Alle tar `db` som siste valgfrie parameter og returnerer `Result<…>` (`not_found` for ukjent mappe, ukjent oppskrift eller oppskrift som ikke er i samlingen).
- **Domene:** `Recipe` får `folderId: number | null`; `RecipeSummary` får `folderName: string | null`; ny type `Folder` (`id`, `name`) og `FolderSummary` (`id`, `name`, `recipeCount`). `listSavedRecipes` henter `folderName` (venstre-join) uten å lese ingredienser eller steg. Oppdater alle fixtures.
- **Server Actions** (AD-3) i `src/app/mapper/actions.ts` og `src/app/oppskrift/[id]/actions.ts`: `createFolder(name)`, `renameFolder(id, name)`, `deleteFolder(id)` og `moveToFolder(recipeId, folderId | null)` og `moveToNewFolder(recipeId, name)`. Id og navn valideres med zod på nytt. Svar: `{ ok: true, … }` eller `{ ok: false, field?: "name", message }`. Etter vellykket endring: `revalidatePath("/", "layout")` (mappenavn står på kort, i lagre-linjen og på mappesider). Feil i databasen gir generell melding fra `messageFor(undefined)` og endrer ingenting.
- **Mapper-siden** (`/mapper`, Suspense + `connection()` som Samlingen; overskrift utenfor): 
  - Skjema «Ny mappe» (etikett, felt, knappen «Opprett mappe»); feil vises under feltet, koblet med `aria-describedby`, `aria-invalid`, og fokus flyttes til feltet ved feil; feltet tømmes ved suksess.
  - Liste (`<ul role="list">`) med én rad per mappe: lenke til `/mapper/<id>` med navn og antall («3 oppskrifter» / «1 oppskrift» / «Ingen oppskrifter»), knappen «Gi nytt navn» (bytter raden til et skjema forhåndsutfylt med navnet, «Lagre» og «Avbryt», samme feilvisning, Escape avbryter, fokus tilbake til «Gi nytt navn») og knappen «Slett» (dialogen «Slette mappen?» med `ConfirmDialog`; teksten sier at oppskriftene blir liggende i samlingen uten mappe). Alle knapper har `aria-label` som nevner mappenavnet og er minst 44 px.
  - Ingen mapper: `EmptyState` «Du har ingen mapper ennå.» med forklaring og lenken «Gå til samlingen» (som før), under skjemaet.
- **Mappesiden** (`/mapper/[id]`, samme Suspense-mønster som oppskriftssiden, `generateMetadata` «<navn>»): `<h1>` med mappenavnet, lenke «Alle mapper», og oppskriftskort (`RecipeCard`, mappenavnet utelates i metaraden her siden det er samme på alle) i samme rutenett som Samlingen; tom mappe: `EmptyState` «Mappen er tom.» og forklaringen «Legg oppskrifter i mappen fra oppskriftssiden.» med lenken «Gå til samlingen». Ukjent eller ugyldig id: `notFound()` (som oppskriftssiden; andre feil kastes til `error.tsx`). Menypunktet Mapper er markert (finnes allerede via `startsWith`).
- **Lagre-linjen** (`RecipeActions`) for en lagret oppskrift: knappen for mappe viser mappenavnet (visuell tekst «Hverdag», `aria-label` «Hverdag, bytt mappe») eller «Lagre i mappe» når oppskriften ikke ligger i en mappe, ved siden av «Slett». Den åpner dialogen «Lagre i mappe» (ny komponent `FolderDialog`, bygget på en felles `Dialog`-komponent som er trukket ut av `ConfirmDialog`, med samme fokus- og Escape-regler og tester som før): en radiogruppe (`<fieldset>` med `<legend>`) med «Ingen mappe», hver mappe og «Ny mappe», der «Ny mappe» viser et navnefelt (med samme feilvisning som over, og fokus går til feltet når alternativet velges); knappene «Lagre» og «Avbryt». Forhåndsvalgt er oppskriftens nåværende mappe (eller «Ingen mappe»). Startfokus på det valgte alternativet. Ved suksess lukkes dialogen, fokus går tilbake til mappeknappen (som nå viser det nye navnet), og `role="status"`-området sier «Lagret i <navn>.» eller «Fjernet fra mappen.» i 3 sekunder (samme regler som «Lagret.»). Å velge den mappen oppskriften allerede ligger i, endrer ingenting og lukker dialogen. Mappelisten hentes på oppskriftssiden (`listFolders()`) og sendes som prop. Hjerte kommer i 3.4 i samme linje.
- **Oppskriftskort:** `RecipeCard` viser kilde og mappenavn i metaraden (for eksempel «Matprat · Hverdag»), mappenavn som egen `<span>` slik at skjermleser leser begge; uten mappe vises bare kilden. Tittelen er fortsatt lenkens innhold.
- **Tekster** (AD-7) i `src/lib/messages.ts` (`folderMessages`, `folderDialogMessages`, utvidelse av `recipeActionMessages`); med i testen mot utropstegn. Ingen hardkodede farger; gjenbruk tokens og mønstre fra 3.1 og 3.2 (kort, sekundærknapp, dialog, `role="status"`, fokusflytt etter handling).
- README: avsnitt om mapper; deferred-work: mer under.
- Ingen ny pakke. `package-lock.json` uendret.

**Never:**
- Ingen mapper i mapper, ingen flytting av flere oppskrifter om gangen, ingen sortering eller søk i mapper, og ingen dra-og-slipp.
- Ingen favoritthjerte (3.4).
- Ingen mappevalg for oppskrifter som ikke er i samlingen (de må lagres først).
- Ingen endring av `updatedAt` ved mappehandlinger. Ingen sletting av oppskrifter når en mappe slettes.
- Ingen skriving til databasen ved visning av sider. Ingen endring i tolke- eller skaleringsregler.

## I/O & Edge-Case Matrix

| Scenario | State / handling | Forventet | Feil |
|----------|------------------|-----------|------|
| Opprett | «Hverdag» i «Ny mappe» | Mappen finnes med 0 oppskrifter; feltet tømmes | N/A |
| Tomt navn | «» eller «   » | Melding under feltet; ingenting lagres; fokus i feltet | validation `name_required` |
| For langt | 41 tegn (og 40 tegn godtas) | Melding under feltet | validation `name_too_long` |
| Duplikat | «hverdag» når «Hverdag» finnes; «ÆRLIG» mot «ærlig» | Melding «Du har allerede en mappe med dette navnet.» | validation `name_taken` |
| Blanke tegn | «  Ny   helg  » | Lagres som «Ny helg» | N/A |
| Gi nytt navn | «Hverdag» → «Hverdagsmat» | Ny tekst vises overalt (kort, lagre-linje, mappeside) | N/A |
| Endre bare store/små | «Hverdag» → «HVERDAG» | Godtas (samme mappe) | N/A |
| Nytt navn opptatt | Gi nytt navn til navnet til en annen mappe | Melding under feltet; ingenting endres | validation `name_taken` |
| Slett mappe | Mappe med 3 oppskrifter, bekreft | Mappen er borte; de 3 ligger i Samlingen uten mappenavn; `updatedAt` uendret | N/A |
| Avbryt sletting | «Avbryt» eller Escape | Ingenting endres; fokus tilbake | N/A |
| Slett ukjent mappe | Slettet i annen fane | Melding fra `messageFor("not_found")` | not_found |
| Legg i mappe | Lagret oppskrift, velg «Hverdag» | Oppskriften ligger i Hverdag; knappen viser «Hverdag»; «Lagret i Hverdag.» i 3 s | N/A |
| Bytt mappe | Fra «Hverdag» til «Helg» | Kun i Helg; telling i begge mapper oppdatert | N/A |
| Ingen mappe | Velg «Ingen mappe» | `folder_id` NULL; «Fjernet fra mappen.» | N/A |
| Ny mappe fra dialogen | Velg «Ny mappe», skriv «Fest» | Mappen opprettes og oppskriften flyttes i én transaksjon; «Lagret i Fest.» | N/A |
| Ny mappe, ugyldig navn | Tomt eller duplikat i dialogen | Melding under feltet i dialogen; dialogen blir åpen; ingenting opprettet | validation |
| Ikke lagret oppskrift | `moveRecipeToFolder` for `savedAt = null` | Ingenting endres | not_found |
| Oppskrift slettet | Flytt en oppskrift som er slettet | Melding fra `messageFor("not_found")` | not_found |
| Kort i Samlingen | Oppskrift i «Hverdag» med kilde «Matprat» | «Matprat · Hverdag»; uten mappe bare «Matprat» | N/A |
| Mappeside | `/mapper/<id>` med 2 oppskrifter | To kort, sist lagret først | N/A |
| Tom mappe | `/mapper/<id>` uten oppskrifter | «Mappen er tom.» med forklaring og «Gå til samlingen» | N/A |
| Ukjent mappe | `/mapper/999` eller `/mapper/abc` | 404-side | not_found |
| Slett oppskrift i mappe | Oppskrift i mappe slettes | Telling i mappen går ned; mappen står igjen | N/A |
| Rediger oppskrift i mappe | «Lagre endringer» | Oppskriften blir i mappen | N/A |
| Migrasjon | Database med oppskrifter fra 0001 | Alle oppskrifter, linjer og steg bevart; `folder_id` NULL | N/A |
| Databasefeil | Feil i transaksjon | Rulles tilbake (ingen halv mappe); generell melding | unknown |

</frozen-after-approval>

## Code Map

- `src/server/db/schema.ts`, `drizzle/0002_*.sql` + journal + snapshot, `src/server/db/migrate.test.ts` (migrasjonstest).
- `src/server/db/repositories/folder-repository.ts` (+ test); `recipe-repository.ts` (`listSavedRecipes` med `folderName`, `findRecipeById` med `folderId`) + tester.
- `src/server/services/folder-service.ts` (+ test); navnenormalisering som egen ren funksjon i `src/lib/folder-name.ts` (+ test, med æ/ø/å, blanke tegn, 40 tegn med emoji).
- `src/domain/types.ts`, `src/domain/index.ts` -- `Folder`, `FolderSummary`, `Recipe.folderId`, `RecipeSummary.folderName`; fixtures i eksisterende tester.
- `src/app/mapper/page.tsx` (+ test), `src/app/mapper/actions.ts` (+ test), `src/app/mapper/[id]/page.tsx` (+ test, `not-found.tsx` ved behov), komponentene `FolderManager`/`FolderRow`/`FolderNameForm` (+ tester) i `src/components/`.
- `src/app/oppskrift/[id]/actions.ts` -- `moveToFolder`, `moveToNewFolder` (+ tester); `src/app/oppskrift/[id]/page.tsx` og `RecipeView.tsx` -- sender mappeliste og `folderId` til lagre-linjen.
- `src/components/Dialog.tsx` (+ css, test) trukket ut av `ConfirmDialog`; `FolderDialog.tsx` (+ css, test); `RecipeActions.tsx` (+ test); `RecipeCard.tsx` (+ test).
- `src/lib/messages.ts` (+ test).
- `README.md` (mapper, testtall, datamodell), `_bmad-output/implementation-artifacts/deferred-work.md` (redigering av mappe i redigeringsskjemaet er fortsatt utsatt; ingen grense for antall mapper; ingen sortering av mapper utover navn).

## Tasks & Acceptance

**Execution:**
- [x] Skjema, migrasjon og migrasjonstest.
- [x] Navnenormalisering, repository og tjeneste med tester.
- [x] Domenetyper, `listSavedRecipes`/`findRecipeById` med mappedata; fixtures.
- [x] Server Actions med tester.
- [x] `Dialog` utdratt, `FolderDialog`, `RecipeActions` og `RecipeCard` med tester.
- [x] Mapper-siden, mappesiden og komponentene med tester.
- [x] README og deferred-work.

**Acceptance Criteria:**
- Given Mapper-siden, when jeg oppretter, gir nytt navn til eller sletter en mappe, then vises mappene med antall oppskrifter; navn må være 1–40 tegn og unikt uten hensyn til store og små bokstaver, ellers vises en melding under feltet (FR-14).
- Given en lagret oppskrift, when jeg velger mappe i lagre-linjen («Lagre i mappe»: velg mappe, ny mappe eller ingen), then ligger oppskriften i den valgte mappen og ikke lenger i en eventuell tidligere mappe (FR-14, UX-DR9, UX-DR13).
- Given oppskrifter i mapper, when jeg åpner Samlingen, then viser oppskriftskortene mappenavnet (UX-DR10).
- Given en mappe med oppskrifter, when jeg sletter mappen og bekrefter i «Slette mappen?», then blir oppskriftene liggende i samlingen uten mappe.
- Given en mappe, when jeg åpner den, then vises oppskriftene i mappen, eller en tom-tilstand med forklaring (FR-16, UX-DR11).
- Alle eksisterende tester passerer; lint, typecheck, format:check og build er grønne; `package-lock.json` uendret.

## Implementation Notes

Mapper er implementert og dekket av tester.

- **Skjema og migrasjon:** `folders` og `recipes.folder_id` i `schema.ts`; `drizzle/0002_folders.sql` er generert med `npm run db:generate` (omdøpt fra det tilfeldige navnet, journalen er rettet) og kontrollert: ingen `DROP TABLE`, unik indeks `folders_name_key_unique`, eksisterende rader får `folder_id = NULL`. Journal og snapshot er formatert med prettier.
- **Migrasjonstest:** en database laget med bare 0000 og 0001 med data i (oppskrifter, linjer, steg) bevarer alt etter 0002, rerun er trygg, `ON DELETE SET NULL` er bevist ved sletting og i `foreign_key_list`, og ukjent `folder_id` avvises.
- **Navn:** `src/lib/folder-name.ts` (trimming og sammenslåing, lengde i Unicode-tegn, `name_key` = NFC + `toLocaleLowerCase("nb")`); testet med æ/ø/å, «ÆRLIG» mot «ærlig», dekomponert «å» og 40 emoji.
- **Repository og tjeneste:** `folder-repository.ts` og `folder-service.ts` som i Code Map. `assignRecipeToNewFolder` bruker én transaksjon (`BEGIN IMMEDIATE`); tilbakerulling er bevist med en trigger som stopper oppdateringen av oppskriften. Ingen mappehandling rører `updatedAt`, og `updateRecipe` rører ikke `folder_id` (begge testet). `listSavedRecipes` tar valgfri `folderId` og brukes også av `listRecipesInFolder`.
- **Server Actions:** `src/app/mapper/actions.ts` og `moveToFolder`/`moveToNewFolder` i `oppskrift/[id]/actions.ts`; id og navn valideres med zod (`src/app/_shared/folder-action.ts`), svar er `FolderActionResult` (ny type i `action-result.ts`), og `revalidatePath("/", "layout")` etter suksess. `actionFailure` har fått smalere returtype.
- **Dialog:** `Dialog.tsx` (med `DialogActions` og `DialogButton`) er trukket ut av `ConfirmDialog`; eksisterende `ConfirmDialog`-tester er uendret og grønne. Eieren sender `getInitialFocus` (Avbryt i `ConfirmDialog`, det valgte alternativet i `FolderDialog`). `ConfirmDialog.module.css` er slått sammen med `Dialog.module.css`. `FolderDialog` monterer innholdet bare mens den er åpen, så valg og navn starter på nytt ved hver åpning.
- **Lagre-linjen:** mappeknappen (`aria-haspopup="dialog"`), `flash()` gjenbruker tidtakeren for «Lagret.», «Lagret i <navn>.» og «Fjernet fra mappen.». Å velge nåværende mappe lukker dialogen uten kall. Feil som ikke hører til navnefeltet lukker dialogen og vises i `role="status"`.
- **Mapper-siden:** `FolderManager` (skjema + liste/tom-tilstand), `FolderRow` (lenke, «Gi nytt navn» med fokusflytt, «Slett» med `ConfirmDialog`) og `FolderNameForm`. Etter sletting flyttes fokus til feltet «Ny mappe». Mappesiden har egen `not-found.tsx`.
- **Rutenett:** `.list` og `.loading` er flyttet fra `samlingen/page.module.css` til `list-page.module.css`, så mappesiden bruker samme rutenett som Samlingen.
- **Tester:** migrasjon, navn, repository, tjeneste, handlinger, `Dialog`, `FolderDialog`, `FolderNameForm`, `FolderRow`, `FolderManager`, `RecipeActions`, `RecipeView`, `RecipeCard`, sidene (`/mapper`, `/mapper/[id]`, Samlingen, oppskriftssiden) og `messages`. Alle fixtures har fått `folderId` og `folderName`. Ingen nye pakker; `package.json` og `package-lock.json` er uendret.
- **Avvik:**
  - drizzle-kit utelot `ON DELETE SET NULL` i `ALTER TABLE ADD COLUMN` (snapshotet har det); det er rettet for hånd i SQL-en, med kommentar.
  - Generelle feil i «Ny mappe»/«Gi nytt navn» vises under feltet i stedet for et eget område, og feil ved sletting vises i raden (`role="alert"`).
  - Nettleserkontroll: en gjennomgang bygde appen og testet i headless Chrome (360 og 1280 px, lys og mørk): dialogene (startfokus, piler i radiogruppen, Escape, fokus tilbake), feil under felt, «Gi nytt navn» og sletting fungerer. Gjennomgangen fant sidescroll ved 40 tegn uten mellomrom (rettet og målt på nytt: ingen overflyt). `showModal` er stubbet i jsdom og dekket av nettleserkontrollen. Åpent punkt: Maja sjekker selv i nettleseren (også 200 % zoom, forced-colors og Safari om mulig).

## Spec Change Log

## Rettelser etter kodegjennomgang

Alle 10 patch-punktene under er rettet: usynlige tegn og NFC i `cleanFolderName` (med tester), `revalidatePath("/", "layout")` i `removeRecipe`, `saveRecipe` og redigering, opprydding av dialog og skjema ved Activity-skjuling i `FolderRow`, `overflow-wrap` på overskrifter, dialogtekst og mappeknapp (målt på nytt i Chrome), fokus tilbake til feltet etter «Opprett mappe», og strengere test av `recipeActionMessages`.

## Review Triage Log

Tre uavhengige gjennomganger (randtilfeller og dataintegritet, spesifikasjon og arkitektur, UI/tilgjengelighet/testkvalitet) ga 19 funn, ingen høye. Triage: 10 rettes (patch), 3 utsettes (defer), 6 avvises (reject).

**Patch (rettes i denne storyen):**
1. Usynlige tegn (nullbreddemellomrom, U+2060, U+180E) slapp gjennom navnevalideringen: et navn av bare slike tegn ble en mappe uten synlig navn, og «​x» ble en egen mappe ved siden av «x». `cleanFolderName` fjerner dem og gir tomt navn når ingen synlige tegn er igjen. Ordforbinder (ZWJ) beholdes i navn med innhold, så emoji-sekvenser ikke brytes.
2. «40 tegn» telte dekomponerte tegn (é som e + aksent) som to. `cleanFolderName` NFC-normaliserer før lengden telles.
3. `removeRecipe` revaliderte bare `/samlingen`, så `/mapper` (antall) og mappesiden kunne vise den slettede oppskriften ved retur til en bevart side. Nå `revalidatePath("/", "layout")`, også i `saveRecipe` og i redigering (tittel på kort i mapper).
4. `FolderRow` manglet Activity-oppryddingen fra 3.2: dialog og skjema kunne komme tilbake åpne etter navigasjon bakover. `useLayoutEffect`-opprydding.
5. Mappesidens `<h1>` ga sidescroll ved 360 px med 40 tegn uten mellomrom (målt: 598 px). `overflow-wrap: anywhere` på overskrifter globalt (retter også oppskriftssidens `<h1>` med lang tittel fra før).
6. Mappeknappen i lagre-linjen fløt ut ved langt navn (målt: x = 461 ved 360 px). `max-width: 100%` og `overflow-wrap`.
7. «Slette mappen?» klippet langt navn (målt: 446 px i 318 px bred dialog). `overflow-wrap` på beskrivelsen. Målt på nytt: 318 mot 318.
8. Etter «Opprett mappe» mistet feltet fokus fordi knappen er deaktivert under lagring. Fokus tilbake til feltet.
9. `messages.test.ts` brukte `toMatchObject` for `recipeActionMessages` og fanget ikke nye nøkler. Tilbake til `toEqual`.
10. Spesifikasjon og Implementation Notes: status, nettleserkontroll og avvik ført.

**Defer:**
11. Radiogruppen i «Lagre i mappe» har ingen maksimal høyde, så «Lagre» og «Avbryt» havner under bretten med mange mapper (12 mapper ved 360 × 700). Dialogen scroller og fungerer; hører sammen med at antall mapper ikke er begrenset. Ført i `deferred-work.md`.
12. `FolderRow`, `FolderNameForm` og `FolderDialog` har ingen egne `forced-colors`-regler (bruker kantlinje, outline og innebygde radioer). Ikke målt; ført i `deferred-work.md`.
13. `not_found` ved gjentatt sletting eller flytting revaliderer ikke, så en foreldet rad blir stående til neste innlasting. Samme mønster som `removeRecipe` fra 3.2; ført i `deferred-work.md`.

**Reject:**
14. Kappløp på unikhet (to prosesser mot samme databasefil) gir generell melding i stedet for `name_taken`: sjekk og innsetting er synkrone i én Node-prosess, og feilen skader ingenting (transaksjonen rulles tilbake).
15. `role="alert"` for slettefeil i raden: forsvarlig for en feil etter en handling; ført som avvik.
16. Pil ned til «Ny mappe» flytter fokus til tekstfeltet: det spesifikasjonen sier.
17. jsdom-stubber av `showModal`/`close`: kjent begrensning; atferden er nettleserverifisert av gjennomgangen.
18. Håndrettet `ON DELETE SET NULL` i migrasjonen og omdøping til `0002_folders`: verifisert (`PRAGMA foreign_key_list`, `drizzle-kit check` og `generate` er rene).
19. «ß» og «SS» regnes som ulike navn, og NFKC brukes ikke: bevisste valg.
