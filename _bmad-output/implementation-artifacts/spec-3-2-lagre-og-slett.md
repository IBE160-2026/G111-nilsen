---
title: 'Story 3.2: Lagre og slette en oppskrift'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: 'e919adc'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---
<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En oppskrift kan ikke legges i samlingen etter at den er hentet (gjelder importerte oppskrifter fra Epic 2), valgt antall porsjoner glemmes når siden lukkes, ingen oppskrift kan slettes, og oppskrifter som aldri ble lagret blir liggende for alltid (FR-13, UX-DR9, UX-DR12, UX-DR13, deferred-work fra Story 1.4).

**Approach:** En lagre-linje nederst på oppskriftssiden: «Lagre» når oppskriften ikke er i samlingen (`savedAt = null`), «Slett» når den er det. «Lagre» setter `savedAt` og viser «Lagret.» i 3 sekunder i et `aria-live`-område. «Slett» åpner dialogen «Slette oppskriften?»; bekreftelse sletter oppskriften med ingredienser og steg og sender brukeren til Samlingen. For en lagret oppskrift lagres hvert valgt antall porsjoner, og siden åpnes med sist valgte antall. Oppskrifter som aldri ble lagret og er eldre enn et døgn ryddes bort ved oppstart og deretter hver time.

## Boundaries & Constraints

**Always:**
- **Service og repository** (AD-3, AD-6; mønster som `updateManualRecipe`):
  - `markRecipeSaved(db, id, savedAt)`: setter `savedAt` bare når den er `null` (en allerede lagret oppskrift beholder sitt tidspunkt, slik at plassen i Samlingen ikke endres). Returnerer `false` når id ikke finnes. Rører ikke `updatedAt`.
  - `deleteRecipeById(db, id)`: sletter raden; `ingredient_lines` og `steps` følger med via `ON DELETE CASCADE` (fremmednøkler er slått på i `openDatabase`). Returnerer `false` når id ikke finnes.
  - `updateSelectedServings(db, id, servings)`: setter `selectedServings` bare for en lagret oppskrift (`savedAt` ikke `null`). Returnerer `false` når id ikke finnes eller oppskriften ikke er lagret. Rører ikke `updatedAt` (avkrysning på siden er nøklet på `updatedAt`, jf. 1.6).
  - `deleteStaleUnsavedRecipes(db, cutoff)`: sletter rader med `savedAt IS NULL` og `createdAt < cutoff` (ISO-tekst), og returnerer antall slettede.
  - `recipe-service.ts`: `saveRecipeToCollection(id)`, `deleteRecipe(id)`, `setSelectedServings(id, servings)` og `purgeStaleUnsavedRecipes(now = new Date())` (grense: nå minus 24 timer). Alle tar `db` som siste valgfrie parameter. `Result<…>`: ugyldig id (ikke positivt heltall), ukjent id og (for `setSelectedServings`) ikke-lagret oppskrift gir `not_found`; antall utenfor 1–50 eller ikke heltall gir `validation` med `servings` i `detail`.
- **Server Actions** (AD-3) i `src/app/oppskrift/[id]/actions.ts`: `saveRecipe(id)`, `removeRecipe(id)` og `rememberServings(id, servings)`. Id og antall valideres på nytt med zod (id via `parseRecipeId`-reglene), selv om de er bundet fra siden. `saveRecipe` kaller `revalidatePath` for oppskriftssiden, så lagre-linjen bytter tilstand. `removeRecipe` kaller `redirect("/samlingen")` utenfor `try/catch`. `rememberServings` kaller ikke `revalidatePath` (det skal ikke gi ny innlasting). Alle returnerer `{ ok: true }` eller `{ ok: false, message }` med melding fra `messageFor`, unntatt `removeRecipe` ved suksess (redirect).
- **Lagre-linje** (`RecipeActions`, klientkomponent, `src/components/RecipeActions.tsx` + `.module.css` + test), plassert nederst i `RecipeView`:
  - Ikke lagret: knappen «Lagre» (primær, aksentfarge, minst 44 px). Under lagring: deaktivert og «Lagrer …».
  - Etter lagring: «Lagret.» i et område med `role="status"` (alltid i DOM, tomt til meldingen kommer, så skjermleser leser opp teksten) i 3 sekunder, deretter tomt. Tidtakeren ryddes ved avmontering og nullstilles ved ny lagring.
  - Lagret: knappen «Slett» (sekundær, kantlinje i `--color-control-border`, ikke rød) med `aria-label` «Slett <tittel>». Mappevalg og hjerte kommer i 3.3 og 3.4 i samme linje.
  - Feil: meldingen fra `messageFor` i samme `role="status"`-område (ikke tidsbegrenset), og knappen kan trykkes på nytt.
  - Fast nederst: `position: sticky; bottom: 0`, bakgrunn `--color-surface-base`, tynn kant øverst (`border-hairline`), `padding-bottom` med `env(safe-area-inset-bottom)`, ikke skygge. Dekker ikke innhold (sticky, ikke fixed). Aksepterer at kanten alltid vises (DESIGN.md sier «når innholdet ruller under»).
- **Dialog** (`ConfirmDialog`, `src/components/ConfirmDialog.tsx` + `.module.css` + test; gjenbrukes i 3.3 for «Slette mappen?»): bruker `<dialog>` med `showModal()` (innebygd fokusfelle, Escape og `aria-modal`), `aria-labelledby` på tittelen og `aria-describedby` på teksten. Props: `open`, `title`, `description`, `confirmLabel`, `cancelLabel`, `onConfirm`, `onCancel`, `pending`. Startfokus på «Avbryt» (den trygge handlingen). Escape og «Avbryt» kaller `onCancel`; fokus går tilbake til knappen som åpnet dialogen. Trykk på bakgrunnen gjør ingenting. «Slett» deaktiveres mens sletting pågår. Tekstene (AD-7): tittel «Slette oppskriften?», beskrivelse ««<tittel>» fjernes fra samlingen. Du kan ikke angre.», knappene «Slett» og «Avbryt». Ikke rød farge (designet bruker ikke rødt for tilstander); bekreftelsesknappen bruker aksentfarge.
- **Sist valgte antall:**
  - `RecipeView` sender `selectedServings` og, bare for lagret oppskrift, `onServingsChange={rememberServings.bind(null, id)}` til `IngredientList`.
  - `IngredientList` starter med gyldig `selectedServings` (heltall 1–50), ellers `originalServings`, og kaller `onServingsChange(n)` ved hver endring (også «Tilbakestill»), uten å vente på svaret. Feil logges i konsollen og forstyrrer ikke siden. Manglende prop (ikke lagret) gir ingen lagring.
  - Skaleringen bruker fortsatt originalmengdene (AD-2); bare valgt antall lagres.
  - Redigering som endrer `originalServings` nullstiller `selectedServings` (finnes fra 3.5); uendret.
- **Opprydding:** `src/instrumentation.ts` (Next `register()`, bare når `NEXT_RUNTIME === "nodejs"`, med dynamisk import) kjører `purgeStaleUnsavedRecipes()` ved oppstart og deretter hver time med et `setInterval` som `unref()`-es og vernes mot dobbel registrering ved hot reload (flagg på `globalThis`). Feil logges og stopper ikke appen. Les `node_modules/next/dist/docs/` om instrumentation før koden skrives. Rydding skjer aldri ved visning av en side.
- **Tekster** (AD-7) i `src/lib/messages.ts` (`recipeActionMessages`, `deleteDialogMessages`) og med i testen mot utropstegn. Rett samtidig kommentarene i `messages.ts` slik at «Tekster for Samlingen (Story 3.1)» står rett over `collectionMessages` og `sourceMessages` har sin egen kommentar.
- Gjenbruk `Result`, `messageFor`, tokens og mønstrene fra 3.5 og 1.6. Ingen hardkodede farger. Ingen ny pakke; `package-lock.json` uendret.

**Never:**
- Ingen mappevalg, hjerte eller favoritt (3.3, 3.4), og ingen «Lagre»-dialog for porsjonsantall (Epic 2).
- Ingen sletting uten bekreftelse, og ingen angreknapp (v1).
- Ingen endring av `updatedAt` ved lagring i samlingen eller ved lagring av valgt antall.
- Ingen lagring av avkrysning (AD-10) og ingen lagring av valgt antall for oppskrifter som ikke er i samlingen.
- Ingen rydding ved sidevisning, og ingen sletting av oppskrifter med `savedAt` satt.
- Ingen endring av tolke- eller skaleringsregler eller av databaseskjemaet (ingen ny migrasjon).

## I/O & Edge-Case Matrix

| Scenario | State / handling | Forventet | Feil |
|----------|------------------|-----------|------|
| Lagre | Oppskrift med `savedAt = null`, trykk «Lagre» | `savedAt` satt; «Lagret.» i 3 s i `role="status"`; linjen viser «Slett»; vises i Samlingen | N/A |
| Lagre igjen | `markRecipeSaved` på allerede lagret | Ingen endring i `savedAt` (beholder tidspunktet) | N/A |
| «Lagret.» forsvinner | 3 sekunder etter lagring | Området er tomt; «Slett» står igjen | N/A |
| Lagre ukjent id | Oppskriften ble slettet i en annen fane | Melding fra `messageFor("not_found")`; ingenting endres | not_found |
| Endre antall, lagret | 4 → 6 | `selectedServings = 6` i databasen; `updatedAt` uendret; avkrysning står | N/A |
| Åpne på nytt | Lagret oppskrift med `selectedServings = 6`, også etter omstart | Porsjonsvelgeren viser 6 og mengdene er skalert til 6 | N/A |
| «Tilbakestill til 4» | Valgt 6 → 4 | `selectedServings = 4` lagres | N/A |
| Endre antall, ikke lagret | `savedAt = null` | Ingen lagring (ingen kall) | N/A |
| Ugyldig lagret antall | `selectedServings = 99` eller `0` i databasen | Porsjonsvelger starter på opprinnelig antall | N/A |
| Ugyldig antall til tjenesten | `setSelectedServings(id, 0 / 51 / 2.5)` | Ingenting lagres | validation |
| Slett, bekreft | «Slett» → dialogen «Slette oppskriften?» → «Slett» | Raden, ingrediensene og stegene er borte; bruker sendes til `/samlingen` uten oppskriften | N/A |
| Slett, avbryt | «Avbryt» eller Escape | Dialogen lukkes; ingenting endres; fokus tilbake på «Slett» | N/A |
| Slett to ganger | Id slettet allerede (annen fane) | Melding fra `messageFor("not_found")` | not_found |
| Tastatur i dialog | Tab og Shift+Tab | Fokus blir i dialogen; Escape lukker | N/A |
| Åpne slettet oppskrift | `/oppskrift/<id>` etter sletting | 404-side | not_found |
| Opprydding | `savedAt = null` og `createdAt` eldre enn 24 timer | Slettes (med linjer og steg) | N/A |
| Ikke ryddet | `savedAt = null` og yngre enn 24 timer; lagrede oppskrifter uansett alder | Beholdes | N/A |
| Rydding feiler | Databasefeil ved oppstart | Feil logges; appen starter | unknown |
| Databasefeil ved lagring | Feil i handlingen | Generell melding fra `messageFor(undefined)`; ingenting endret | unknown |

</frozen-after-approval>

## Code Map

- `src/server/db/repositories/recipe-repository.ts` -- `markRecipeSaved`, `deleteRecipeById`, `updateSelectedServings`, `deleteStaleUnsavedRecipes` + tester mot ekte in-memory SQLite (matrisen; kaskade til linjer og steg; `updatedAt` uendret).
- `src/server/services/recipe-service.ts` -- `saveRecipeToCollection`, `deleteRecipe`, `setSelectedServings`, `purgeStaleUnsavedRecipes` + tester.
- `src/app/oppskrift/[id]/actions.ts` (+ test) -- `saveRecipe`, `removeRecipe`, `rememberServings`.
- `src/components/RecipeActions.tsx` (+ css, test), `src/components/ConfirmDialog.tsx` (+ css, test; jsdom mangler `showModal`, så testen stubber `HTMLDialogElement.prototype.showModal/close`).
- `src/components/RecipeView.tsx` (+ test) -- lagre-linje og nye props til `IngredientList`; `src/components/IngredientList.tsx` (+ test) -- startverdi og `onServingsChange`.
- `src/instrumentation.ts` (+ test av funksjonen som planlegger rydding, med falske tidtakere).
- `src/lib/messages.ts` (+ test), `src/styles/tokens.css` ved behov.
- `README.md` -- avsnitt om å lagre, slette og rydde, testtall. `_bmad-output/implementation-artifacts/deferred-work.md` -- fjern posten om rydding av `savedAt = null`, og legg til: rydding gjentas bare mens appen kjører; kanten på lagre-linjen vises alltid; ny import (Epic 2) skal bruke samme `savedAt = null`-regel.

## Tasks & Acceptance

**Execution:**
- [x] Repository-funksjoner og tester.
- [x] Service-funksjoner og tester.
- [x] Server Actions og tester.
- [x] `ConfirmDialog` og `RecipeActions` med tester; meldinger.
- [x] Sist valgte antall i `RecipeView` og `IngredientList` med tester.
- [x] `instrumentation.ts` og test.
- [x] README, deferred-work og rydding av kommentarene i `messages.ts`.

**Acceptance Criteria:**
- Given en oppskrift som ikke er i samlingen, when jeg trykker «Lagre» i lagre-linjen, then legges den i samlingen, og «Lagret.» vises i 3 sekunder og leses opp av skjermleser (FR-13, UX-DR9, UX-DR12).
- Given en lagret oppskrift, when jeg endrer antall porsjoner og senere åpner den igjen, også etter omstart, then vises sist valgte antall (FR-13).
- Given en lagret oppskrift, when jeg velger «Slett» og bekrefter i dialogen «Slette oppskriften?», then fjernes den fra samlingen; avbryter jeg, skjer ingenting (UX-DR13).
- Given oppskrifter som aldri ble lagret i samlingen, then ryddes de bort etter et døgn.
- Alle eksisterende tester passerer; lint, typecheck, format:check og build er grønne; `package-lock.json` uendret.

## Implementation Notes

Lagre, slette, sist valgte antall og opprydding er implementert og dekket av tester.

- **Repository:** `markRecipeSaved`, `deleteRecipeById`, `updateSelectedServings` og `deleteStaleUnsavedRecipes` i `recipe-repository.ts`. `markRecipeSaved` setter `savedAt` bare når den er `null` og skiller «ukjent id» (`false`) fra «allerede lagret» (`true`). Ingen av dem rører `updatedAt`. Kaskaden til `ingredient_lines` og `steps` er bevist i test mot `createTestDb` (som, som `openDatabase`, har `foreign_keys = ON`), og at andre oppskrifters linjer står igjen.
- **Service:** `saveRecipeToCollection`, `deleteRecipe`, `setSelectedServings` og `purgeStaleUnsavedRecipes(now, db)` (returnerer `ok({ deleted })`; grensen er nå minus 24 timer). Validering og `not_found`/`validation` som i matrisen.
- **Server Actions:** `saveRecipe`, `removeRecipe` og `rememberServings` i `src/app/oppskrift/[id]/actions.ts`. Id og antall valideres på nytt med zod. Svaret er `ActionResult` (`src/app/_shared/action-result.ts`, med `actionFailure(kind)` som bygger meldingen fra `messageFor`). `redirect` ligger utenfor `try/catch`.
- **Komponenter:** `ConfirmDialog` (`<dialog>` + `showModal()`, `cancel`-hendelsen stoppes og går til `onCancel`, `close`-hendelsen utenfra tolkes som «Avbryt», fokus tilbake til utløseren) og `RecipeActions` (lagre-linje, `role="status"` alltid i DOM, 3-sekundersregel med tidtaker som ryddes). «Slett» fokuserer seg selv ved klikk, slik at fokus kan gå tilbake også i Safari. Sekundærknapp og primærknapp bruker bare tokens.
- **Sist valgte antall:** `RecipeView` sender `selectedServings` og, bare for lagret oppskrift, `rememberServings.bind(null, id)` til `IngredientList`. `IngredientList` er testbar uten server (`onServingsChange` er en vanlig valgfri funksjon); feil, avvist løfte og `ok: false` logges i konsollen.
- **Opprydding:** `src/instrumentation.ts` med `register()` (bare `NEXT_RUNTIME === "nodejs"`, dynamisk import) og den testbare `schedulePurge(purge)`: kjører med en gang og deretter hver time, `unref()`, flagg på `globalThis` mot dobbel registrering, feil logges.
- **Tekster:** `recipeActionMessages` og `deleteDialogMessages` i `messages.ts`, med i testen mot utropstegn. Kommentarene over `sourceMessages` og `collectionMessages` er rettet.
- **Dokumenter:** README har avsnittet «Lagre, slette og rydde» og nye testtall (43 filer, 745 tester). `deferred-work.md` mister posten om rydding av `savedAt = null` og får nye poster.
- **Avvik:**
  - `removeRecipe` kaller også `revalidatePath("/samlingen")` (spesifikasjonen nevner bare `saveRecipe`), slik at en bevart Samlingen-side ikke viser den slettede oppskriften.
  - `src/server/env-access.test.ts` (AD-9) tillater nå `src/instrumentation.ts`, som leser Nexts egen `NEXT_RUNTIME`; en ny test sikrer at fila ikke leser annet.
  - `schedulePurge` ligger i `instrumentation.ts` og tar rydde-funksjonen som parameter (ingen ny fil).
- **Tester:** repository (nye blokker for alle fire funksjoner), service, handlinger (revalidering, redirect, feil, ugyldig id/antall), `ConfirmDialog` (stubbet `showModal`/`close`), `RecipeActions` (falske tidtakere), `RecipeView`, `IngredientList`, `instrumentation` og `messages`. Ingen nye pakker; `package-lock.json` er uendret.
- **Nettleserkontroll:** en gjennomgang bygde appen og testet i headless Chrome (360 og 1280 px, lys og mørk): lagre-linjen ligger nederst uten å dekke innhold, `role="status"` er samme element hele tiden og «Lagret.» står i 3 s, dialogen er modal med startfokus på «Avbryt», Tab holder seg i dialogen, Escape og «Avbryt» gir fokus tilbake til «Slett», sletting sender til Samlingen uten oppskriften, og sist valgte antall står etter innlasting. `showModal`, fokusfelle og Escape er stubbet i jsdom og dekket av denne kontrollen. Åpent punkt: Maja sjekker selv i nettleseren (også 200 % zoom og Safari om mulig).
- **Kjent begrensning:** endres antallet før oppskriften lagres, huskes ikke det valgte antallet (spesifikasjonen sier at ulagret oppskrift ikke lagrer antall); etter «Lagre» åpnes den på opprinnelig antall ved neste besøk. Ført i `deferred-work.md` til Epic 2.

## Spec Change Log

## Rettelser etter kodegjennomgang

Alle 6 patch-punktene under er rettet: fokus flyttes til «Slett» etter vellykket lagring og tilbake til «Lagre» ved feil (to nye tester), dialogen lukkes når siden skjules (Activity), dialogens kant bruker `--color-control-border`, AD-9 er oppdatert med unntaket, og `deferred-work.md` og Implementation Notes er rettet.

## Review Triage Log

Tre uavhengige gjennomganger (randtilfeller og dataintegritet, spesifikasjon og arkitektur, UI/tilgjengelighet/testkvalitet) ga 17 funn, ingen høye. Triage: 6 rettes (patch), 4 utsettes (defer), 7 avvises (reject).

**Patch (rettes i denne storyen):**
1. Fokus gikk til `<body>` etter «Lagre», fordi knappen byttes ut av «Slett» (målt i Chrome). `RecipeActions` husker hvor fokus lå og flytter det til «Slett». Samme sted: deaktivert «Lagre» under lagring mistet fokus, så fokus gis tilbake til «Lagre» ved feil.
2. Dialogtilstand kunne bli stående åpen mens siden er skjult av `<Activity>` og dukke opp som ikke-modal ved retur. `useLayoutEffect`-opprydding lukker dialogen.
3. AD-9 («bare `config.ts` leser miljøvariabler») var svekket i testen uten at arkitekturdokumentet sa det. Unntaket for `NEXT_RUNTIME` i `instrumentation.ts` er skrevet inn i AD-9.
4. Dialogens kant (hairline, 1,3:1) skilte nesten ikke dialogen fra siden. Kanten bruker `--color-control-border`.
5. Nettleserkontrollen (fokusfelle, Escape, tilbakefokus) var bare ført som åpent punkt; Implementation Notes sier nå at den er gjort av gjennomgangen, og at Maja sjekker selv.
6. Epic 2 må bruke ISO-tekst for `createdAt` (opprydding sammenligner tekst), og kjent begrensning om valgt antall før lagring er ført i `deferred-work.md`.

**Defer:**
7. Valgt antall før «Lagre» huskes ikke (Epic 2).
8. `viewportFit: "cover"` for `env(safe-area-inset-bottom)`, og dimmingen bak dialogen lysner siden i mørk palett (designgjennomgang).
9. Et sent `rememberServings`-kall kan overskrive en redigering som nullstilte antallet (millisekundvindu).
10. Kanten på lagre-linjen vises alltid (allerede ført under implementasjonen).

**Reject:**
11. `removeRecipe` revaliderer også `/samlingen`: skadeløst og dokumentert; gjennomgangen aksepterer det.
12. `schedulePurge` i `instrumentation.ts`: ingen lagdelingsbrudd.
13. Gjentatt sletting i to faner gir melding i stedet for videresending: det er det spesifikasjonen sier.
14. Oppskrift etter sletting gir HTTP 200 med «Fant ikke oppskriften»: eksisterende oppførsel fra Story 1.5 (ekte 404-status er utsatt tidligere).
15. Deaktivert «Lagrer …» har lav kontrast: deaktiverte kontroller er unntatt i WCAG.
16. jsdom-stubber av `showModal`/`close`: kjent begrensning, atferden er nettleserverifisert av gjennomgangen.
17. `tsconfig.tsbuildinfo` og `next-env.d.ts`: gitignored.
