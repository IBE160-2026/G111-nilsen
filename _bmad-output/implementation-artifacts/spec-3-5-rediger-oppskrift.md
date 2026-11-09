---
title: 'Story 3.5: Rediger en oppskrift'
type: 'feature'
created: '2026-11-09'
status: 'in-progress'
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
- [ ] `updateRecipe` i repository med transaksjon, test mot ekte in-memory SQLite (rollback ved feil, uendret kilde/savedAt/createdAt).
- [ ] `updateManualRecipe` i service med tester (matrise over).
- [ ] `ManualRecipeForm` med startverdier, knappetekst og «Avbryt»; eksisterende tester for `/ny` skal fortsatt passere.
- [ ] Server Action og redigeringsside med forhåndsutfylling, 404 og fanetittel.
- [ ] «Rediger»-lenke i `RecipeView` (testet).
- [ ] README og deferred-work.

**Acceptance Criteria:**
- Given en lagret oppskrift, when jeg trykker «Rediger», then vises samme skjema forhåndsutfylt med tittel, antall personer, ingredienser og steg (FR-18).
- Given endringer, when jeg trykker «Lagre endringer», then lagres de med samme validering og tolking som ny oppskrift, og jeg sendes tilbake til oppskriften.
- Given en valideringsfeil eller «Avbryt», then er den lagrede oppskriften uendret, og skrevne verdier beholdes ved feil.
- Alle eksisterende tester passerer; lint, typecheck, format:check og build er grønne; `package-lock.json` uendret.

## Implementation Notes

## Spec Change Log

## Review Triage Log

## Verification

`npm run lint`, `npm run typecheck`, `npm run format:check`, `npm test`, `npm run build`; `git diff -- package-lock.json` tomt.
