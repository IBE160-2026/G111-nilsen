---
title: 'Story 3.5: Rediger en oppskrift'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '9ebc0fa'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---
<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** En oppskrift som er lagt inn kan ikke rettes. Skrivefeil og feil tolking (for eksempel «Tips» blant stegene) krever at oppskriften legges inn på nytt (FR-18, issue 005).

**Approach:** Legg til «Rediger» på oppskriftssiden. Den åpner samme skjema som «Legg inn selv», forhåndsutfylt, på `/oppskrift/[id]/rediger`. Lagring bruker samme validering (zod) og tolking (`parseLine`) som ny oppskrift og erstatter ingredienser og steg i én transaksjon. Redigeringen er fra denne storyen uavhengig av samlingen (Story 3.1–3.4), så den virker på alle eksisterende oppskrifter.

## Boundaries & Constraints

**Always:**
- Skjemaet gjenbrukes: `ManualRecipeForm` får valgfrie props for startverdier, knappetekst og «Avbryt»-lenke. Valideringen og feltmeldingene er de samme som i `/ny` (AD-3, AD-7).
- Forhåndsutfylling: tittel; porsjonsantall (`originalServings`, tomt felt når `null`); ingredienser = `original` fra hver linje sortert på `position`, én per linje; steg = `text` per steg sortert på `position`.
- Lagring: tittel, `originalServings`, ingredienslinjer og steg erstattes; ingredienser tolkes på nytt med `parseLine` (AD-2); `updatedAt` settes. `sourceUrl`, `sourceName`, `savedAt`, `createdAt` og `id` er uendret. Hvis `originalServings` endres, settes `selectedServings` til `null`.
- Alt skjer i én transaksjon i repository (`updateRecipe`); feiler noe, er den lagrede oppskriften uendret.
- Etter lagring: `redirect` til `/oppskrift/[id]`. Valideringsfeil: ingenting lagres, skrevne verdier beholdes, fokus flyttes til første feil (som i `/ny`).
- «Avbryt» er en lenke tilbake til `/oppskrift/[id]` og endrer ingenting.
- Ukjent eller ugyldig id på `/oppskrift/[id]/rediger` gir `notFound()` (samme regler som visningssiden: andre feil kastes til `error.tsx`). Id-en kommer fra URL og valideres på nytt i serveren; handlingen binder id (`updateRecipe.bind(null, id)`) og sjekker at oppskriften finnes (`not_found` → melding via `messageFor`).
- Knappen «Rediger» (tekstknapp/lenke, minst 44 px høy, ikke fremhevet som primærhandling) står på oppskriftssiden ved tittelen. Fanetittel på redigeringssiden: «Rediger · <tittel> · RecipeMate» (ukjent id: «Rediger»).
- Følg Cache Components-mønsteret fra `oppskrift/[id]/page.tsx` (`params` og `connection()` i Suspense) og les `node_modules/next/dist/docs/` ved tvil.

**Never:**
- Ingen redigering av kilde, mappe, favoritt, valgte forslag eller seksjonsoverskrifter (finnes ikke ennå eller kommer i senere stories).
- Ingen endring i domenets tolke- og skaleringsregler.
- Ingen ny pakke. `package-lock.json` skal være uendret.
- Ingen lagring av valgt antall (Story 3.2).

## I/O & Edge-Case Matrix

| Scenario | State / handling | Forventet | Feil |
|----------|------------------|-----------|------|
| Åpne | «Rediger» på oppskrift med 4 personer og 3 ingredienser | Skjema forhåndsutfylt; knappen «Lagre endringer» og lenken «Avbryt» | N/A |
| Lagre endret ingrediens | «0,5 ts salt» → «1 ts salt» | Oppskriftssiden viser 1 ts salt; linjen tolket på nytt | N/A |
| Fjern «Tips» fra steg | Slett siste steg | Oppskriften har ett steg færre | N/A |
| Endre porsjoner | 4 → 6 med `selectedServings` satt | `originalServings` 6, `selectedServings` `null` | N/A |
| Uendret | Trykk «Lagre endringer» uten å endre | Samme innhold; `updatedAt` oppdatert | N/A |
| Tom tittel / ugyldig antall / tom ingrediensliste | Feil verdier | Feltmelding som i `/ny`; ingenting lagret; verdier beholdes | validation |
| Tom porsjon fra `null` | Oppskrift uten porsjoner | Feltet tomt; lagring uten tall gir feltmelding «antall» (krever 1–50) | validation |
| Avbryt | Trykk «Avbryt» | Tilbake til oppskriften; ingenting endret | N/A |
| Ukjent id | `/oppskrift/999/rediger` | 404-side | not_found |
| Id slettet mellom visning og lagring | Handling for id som ikke finnes | Melding fra `messageFor("not_found")`; ingenting lagret | not_found |
| Databasefeil midt i | Feil under transaksjonen | Hele oppdateringen rulles tilbake; oppskriften uendret | unknown |

</frozen-after-approval>

## Code Map

- `src/server/db/repositories/recipe-repository.ts` -- legg til `updateRecipe(db, id, data)` (transaksjon: update recipes, slett og sett inn `ingredient_lines` og `steps`). Se `insertRecipe` for mønsteret.
- `src/server/services/recipe-service.ts` -- legg til `updateManualRecipe(id, input, db)` som gjenbruker `invalidField`, `linesOf` og `parseLine`; returnerer `Result<{ id: number }>`; `not_found` når id ikke finnes. Trekk ut felles bygging av linjer/steg fra `createManualRecipe`, så logikken ikke dupliseres.
- `src/app/oppskrift/[id]/rediger/page.tsx` (+ `page.module.css` om nødvendig, `page.test.tsx`) -- serverside som henter oppskriften og viser skjemaet forhåndsutfylt; `generateMetadata`.
- `src/app/oppskrift/[id]/rediger/actions.ts` -- Server Action `saveRecipeEdits(id, previous, formData)` med samme struktur som `saveManualRecipe` (zod via `validateManualRecipe`, redirect utenfor try/catch).
- `src/components/ManualRecipeForm.tsx` -- nye valgfrie props: `initialValues`, `submitLabel` (standard «Lagre oppskrift»), `cancelHref`. `/ny` skal fungere uendret.
- `src/components/RecipeView.tsx` -- «Rediger»-lenke ved tittelen.
- `src/lib/messages.ts` -- eventuelle nye tekster (AD-7); tekstene skal passere eksisterende test mot utropstegn.
- `README.md` -- avsnitt om redigering (hva det gjør, hvor det finnes, hvordan det testes).
- `_bmad-output/implementation-artifacts/deferred-work.md` -- noter at seksjoner og kilde ikke kan redigeres ennå.

## Tasks & Acceptance

**Execution:**
- [x] `updateRecipe` i repository med transaksjon, test mot ekte in-memory SQLite (rollback ved feil, uendret kilde/savedAt/createdAt).
- [x] `updateManualRecipe` i service med tester (matrise over).
- [x] `ManualRecipeForm` med startverdier, knappetekst og «Avbryt»; eksisterende tester for `/ny` skal fortsatt passere.
- [x] Server Action og redigeringsside med forhåndsutfylling, 404 og fanetittel.
- [x] «Rediger»-lenke i `RecipeView` (testet).
- [x] README og deferred-work.

**Acceptance Criteria:**
- Given en lagret oppskrift, when jeg trykker «Rediger», then vises samme skjema forhåndsutfylt med tittel, antall personer, ingredienser og steg (FR-18).
- Given endringer, when jeg trykker «Lagre endringer», then lagres de med samme validering og tolking som ny oppskrift, og jeg sendes tilbake til oppskriften.
- Given en valideringsfeil eller «Avbryt», then er den lagrede oppskriften uendret, og skrevne verdier beholdes ved feil.
- Alle eksisterende tester passerer; lint, typecheck, format:check og build er grønne; `package-lock.json` uendret.

## Implementation Notes

Redigering av en oppskrift er implementert og dekket av tester; rettelser etter kodegjennomgang er ført under.

- **Repository:** `updateRecipe(db, id, data)` i én transaksjon: leser gjeldende `originalServings`, oppdaterer tittel, antall og `updatedAt`, sletter og setter inn `ingredient_lines` og `steps`. `selectedServings` settes til `null` bare når `originalServings` endres. `id`, kilde, `savedAt` og `createdAt` røres ikke. Returnerer `false` for ukjent id; feil kastes og transaksjonen rulles tilbake.
- **Service:** `updateManualRecipe(id, input, db)`. Valideringen og byggingen av tolkede linjer og steg er trukket ut i `buildContent`, som både `createManualRecipe` og `updateManualRecipe` bruker. Ugyldig id (ikke positivt heltall) og ukjent id gir `not_found`.
- **Skjema:** `ManualRecipeForm` har valgfrie `initialValues`, `submitLabel` (standard «Lagre oppskrift») og `cancelHref` («Avbryt» som lenke). `/ny` er uendret i oppførsel.
- **Handling og side:** `saveRecipeEdits(id, previous, formData)` i `src/app/oppskrift/[id]/rediger/actions.ts`, bundet til id med `bind`. Feilmapping (felt, `messageFor`, reservemelding) er flyttet til `src/app/_shared/form-errors.ts` og deles med `saveManualRecipe`. Siden følger Cache Components-mønsteret fra oppskriftssiden (`params` og `connection()` i Suspense, `cache` for oppslaget) med `generateMetadata` («Rediger · <tittel>», ukjent id «Rediger»). Startverdiene bygges i `initial-values.ts` (eget modul fordi sidefiler ikke kan eksportere hjelpefunksjoner).
- **Visning:** «Rediger» er en tekstlenke (aksentfarge, 44 px høy) ved tittelen i `RecipeView`. Tekstene ligger i `editRecipeMessages` i `src/lib/messages.ts` og er med i testen mot utropstegn.
- **Dokumenter:** README har et avsnitt om redigering, og `deferred-work.md` noterer at kilde, mappe, favoritt og seksjoner ikke kan redigeres ennå.
- **Avvik:** ingen fra spesifikasjonen.
- **Seksjoner:** ingredienser og steg lagres uten seksjon ved redigering, siden skjemaet bare har én tekstboks per felt. Tapet er akseptert til seksjoner kan redigeres, og er dokumentert i en test.
- **Tester:** repository (7 nye, blant annet tilbakerulling og uendret kilde/`savedAt`/`createdAt`), service (matrisen i spesifikasjonen, inkludert databasefeil midt i), handling, redigeringsside (forhåndsutfylling, tomt antall, 404, fanetittel, andre feil videre til `error.tsx`), skjema og `RecipeView`. Ingen nye pakker; `package-lock.json` er uendret.
- **Åpent punkt, manuell nettlesersjekk:** klikk på «Rediger» og «Avbryt»; fokusflytt til første feil (også når siden gjenopprettes); trykkflater på 44 px; mørk palett; at redirect etter lagring faktisk skjer; at skjemaet ikke viser gamle verdier når redigeringssiden åpnes på nytt etter lagring eller «Avbryt». Alt dette er så langt bare dekket i jsdom med mockede `redirect` og `notFound`.

## Spec Change Log

## Rettelser etter kodegjennomgang

Alle 15 patch-punktene under er rettet: `key` med `updatedAt` på skjemaet, «Avbryt» deaktivert under lagring, strammere tester (`updatedAt`, ingredienslisten, rekkefølge, gjenbruk av skjemaet, ekte handling), `aria-label` på «Rediger» og tittelen i `<h1>`, «Endre tittel …» i teksten, `BEGIN IMMEDIATE` i `updateRecipe`, flere grense- og rollback-tester, og delte skjemamoduler flyttet til `src/app/_shared/` så `rediger/` ikke importerer fra `ny/`. README-status er oppdatert.

## Review Triage Log

Tre uavhengige gjennomganger (randtilfeller og dataintegritet, spesifikasjon og arkitektur, UI/tilgjengelighet/testkvalitet) ga 28 funn. Triage: 15 rettes (patch), 5 utsettes (defer), 8 avvises (reject).

**Patch (rettes i denne storyen):**
1. Skjemaet kan vise gamle verdier når redigeringssiden åpnes på nytt for samme oppskrift (Cache Components bevarer komponenttilstand). `key` på skjemaet får `updatedAt` i tillegg til id.
2. «Avbryt»-lenken er aktiv mens lagring pågår, så en lagring kan fullføres etter «Avbryt». Lenken deaktiveres under `pending`.
3. Testen «Uendret» bruker `>=` på `updatedAt` og er delvis alltid grønn. Bruk eldre startverdi og kreve strengt nyere; sammenlign hele ingredienslisten (uten `id`) med `toEqual`.
4. Ingen test fanger gamle verdier ved gjenbruk av skjemaet. Legg til `rerender`-test med nye startverdier og ny `key`, og en test med ekte action mot test-database der verdiene beholdes ved valideringsfeil.
5. Sorteringen av ingredienser på `position` i forhåndsutfyllingen er ikke testet. Snu `position` også for ingredienser.
6. «Rediger»-lenken får `aria-label` «Rediger <tittel>».
7. `<h1>` på redigeringssiden nevner oppskriftens tittel.
8. Meldingstekst «Rett tittel …» byttes til «Endre tittel …».
9. Seksjoner forsvinner ved redigering uten å være testet. Legg til test som dokumenterer oppførselen, og en linje i spesifikasjonen om at tapet er akseptert til seksjoner kan redigeres.
10. `updateRecipe` bruker `BEGIN IMMEDIATE` (`behavior: "immediate"`) for å unngå `SQLITE_BUSY` ved oppgradering til skrivelås.
11. Testhull: `originalServings` fra `null` til tall nullstiller `selectedServings`; rollback ved feil i selve oppdateringen av `recipes` og ved feil i ingrediens-innsettingen; grenseverdier for `LIMITS` og CRLF/blanke linjer i `updateManualRecipe`; id-ene `Infinity`, `2**53`, `1abc`, `-1`, `1.5`, `01` i service og rute.
12. Type-syklus og avhengighet mellom ruter: `ManualRecipeFormState` og felles hjelpere flyttes til nøytral modul, slik at `rediger/` ikke importerer fra `ny/actions`.
13. `deferred-work.md` har inkonsistente henvisninger til epics og stories for seksjoner/kilde. Bruk én formulering uten story-numre.
14. Implementation Notes inneholder tilstandsmeta («ikke pushet»). Fjernes; manuell nettlesersjekk føres som åpent punkt.
15. README-status er utdatert («Story 1.1–1.3»). Oppdateres.

**Defer:**
- Rad-id for ingredienser og steg er ikke stabil mellom redigeringer (slettes og settes inn på nytt). Ingen funksjon bruker rad-id ennå (avkrysning er bare klienttilstand, AD-10); notert i `deferred-work.md`.
- Oppskrift med verdier utenfor `LIMITS` (mulig ved import, Epic 2) kan ikke lagres uendret. Håndteres ved import.
- Tegn med nullbredde (U+200B m.fl.) passerer `trim()` i tittel og linjer. Gjelder også «Legg inn selv», ikke en regresjon.
- Ved `not_found` under lagring peker «Avbryt» til en side som nå gir 404. Sjeldent i enbrukerapp; tas hvis det oppstår.
- Fokusflytt til første feil kan gjentas når en side gjenopprettes av Cache Components. Sjekkes i nettleseren sammen med punkt 1.

**Reject:**
- Lost update uten versjonssjekk mellom to faner: enbrukerapp, akseptert risiko.
- Lengdegrenser teller UTF-16-enheter, ikke tegn: grensene er generøse, og «Legg inn selv» fungerer likt.
- Duplisert `loadRecipe`/id-sjekk mellom visnings- og redigeringsside: tre linjer, bevisst ikke abstrahert ennå.
- Ingen test som kobler skjema og ekte action utover punkt 4: dekket av punkt 4.
- Tre funn som gjentok andre funn (seksjoner, `updatedAt`-test, `key`) er slått sammen med punkt 9, 3 og 1.

## Verification

`npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test`, `npm run build`; `git diff -- package-lock.json` tomt.
