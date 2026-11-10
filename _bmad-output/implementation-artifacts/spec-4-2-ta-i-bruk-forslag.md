# Spec 4.2: Ta i bruk forslag

## Intent
Brukeren velger hvilke forslag som skal bli en del av oppskriften sin (FR-11, UX-DR7, AD-5). «Ta i bruk» flytter forslaget til «Dine valgte forslag», merket «Tatt i bruk», og lagrer det med oppskriften. «Hopp over» skjuler det uten å lagre. «Fjern» sletter et valgt forslag. Valgte forslag vises hver gang oppskriften åpnes. Ingredienslinjer og steg endres aldri.

## Frosset
- Bare valgte forslag lagres (AD-5): tabellen `suggestions` har ingen «hoppet over»-rader. «Hopp over» er ren klienttilstand og glemmes ved ny lasting.
- Tabell `suggestions`: `id`, `recipe_id` (FK, `ON DELETE CASCADE`), `text`, `reason`, `applies_to`, `created_at`; unik på (`recipe_id`, `text`), så samme forslag ikke kan tas i bruk to ganger (gjentatt trykk, to faner). Migrasjon `0004_suggestions`.
- `Recipe.suggestions` er de valgte forslagene (`AppliedSuggestion` = `Suggestion` + `id`), eldste først.
- «Ta i bruk» og «Fjern» rører ikke `recipes.updatedAt`, `selected_servings`, ingredienser eller steg. Avkrysning på siden er nøklet på `updatedAt`, og en endring ville nullstilt den (samme grunn som i Story 2.4).
- Server Action `applySuggestion(recipeId, suggestion)` er et offentlig endepunkt: id og forslag valideres på nytt med `suggestionSchema` (tekstgrenser, kjent `appliesTo`). Ukjente felt fjernes. Tatt i bruk to ganger gir samme rad og `ok`.
- Fungerer også for en oppskrift som ikke er i samlingen ennå; forslagene følger oppskriften og slettes med den (også når ulagrede importer ryddes bort).
- Forslagsdelen eier listen over valgte forslag i klienttilstand (startverdi fra siden) og oppdaterer den fra svaret, så den ikke hopper ved revalidering. Sidene revalideres likevel, så en ny åpning viser det lagrede.
- Et hentet forslag med samme tekst som et valgt forslag vises ikke som nytt.
- Etter hver handling får brukeren en kort statusmelding og fokus går til «Forslag»-overskriften (knappen som ble trykket er borte).
- Ikke i denne storyen: grense for antall valgte forslag per oppskrift (utsatt), språkmodell (4.3).

## Atferd
- «Dine valgte forslag» står øverst i forslagsdelen når det finnes valgte forslag, også før «Få forslag» er trykket. Hvert valgt forslag viser forslaget i halvfet, begrunnelsen, merket «Tatt i bruk» og knappen «Fjern».
- Hvert hentet forslag har «Ta i bruk» (primær) og «Hopp over» (sekundær). Knappenes tilgjengelige navn inneholder forslagsteksten.
- Alle hentede forslag er tatt i bruk eller hoppet over: «Du har tatt stilling til alle forslagene.»
- Feil (ukjent oppskrift, databasefeil, avvist kall): meldingen fra `messages.ts` i statusfeltet; forslaget blir stående der det var.
- Knapper for samme forslag er låst mens kallet pågår (ett kall per forslag).

## Matrise
| Tilfelle | Utfall | Test |
|---|---|---|
| Migrasjon 0004 | tabell, indeks og FK; journal og snapshot | `migrate.test.ts` |
| Repo: sett inn, dobbelt, liste, slett | lagres uten å røre `updatedAt`; duplikat gir samme id; slett gir `false` for annen oppskrift | `suggestion-repository.test.ts` |
| `findRecipeById` | `suggestions` med id, eldste først; slettes med oppskriften | `recipe-repository.test.ts` |
| Service: ta i bruk | validerer, `not_found`, `validation`, ingredienser/steg/`updatedAt` uendret | `suggestion-service.test.ts` |
| Service: fjern | sletter; ukjent id eller annen oppskrift gir `not_found` | `suggestion-service.test.ts` |
| Action: ta i bruk, fjern | `ok`, revaliderer; ugyldig id/forslag/databasefeil gir melding | `actions.test.ts` |
| Komponent: valgte forslag fra start | overskrift, «Tatt i bruk», «Fjern» | `SuggestionsSection.test.tsx` |
| Komponent: ta i bruk | flyttes til valgte, fokus og status, ikke lenger blant nye | `SuggestionsSection.test.tsx` |
| Komponent: hopp over | skjules, ingen kall | `SuggestionsSection.test.tsx` |
| Komponent: fjern | forsvinner, fokus og status | `SuggestionsSection.test.tsx` |
| Komponent: feil og dobbeltklikk | melding, forslaget står; ett kall | `SuggestionsSection.test.tsx` |
| Oppskriftssiden | valgte forslag og handlinger bundet til oppskriftens id | `RecipeView.test.tsx` |

## Verifisering
lint, typecheck, format:check og build grønne (build uten advarsler); 78 filer og 2286 tester (65 nye); `package.json` og `package-lock.json` uendret. Kjørt mot ekte kode i skymiljøet: `npm run db:migrate` på en ny database (migrasjon 0004), et valgt forslag lagt inn, og `next start` viste «Dine valgte forslag», forslaget, «Tatt i bruk» og «Fjern» i den ferdig tegnede siden. Ikke kjørt i nettleser (ingen i skymiljøet): klikk på «Ta i bruk», «Hopp over» og «Fjern» er testet med jsdom og Server Actions mot SQLite i minnet, og nettleserkontroll gjøres av Maja.

## Review Triage Log
Gjort med egen gjennomgang langs de tre linjene, ingen underagenter, for å spare økta. Funn:
- Data/arkitektur: `updatedAt` røres ikke (avkrysning er nøklet på den; testet i repo, service og action). Unik indeks og `onConflictDoNothing` gjør at to faner eller dobbeltklikk gir én rad. Sletting av oppskriften tar forslagene med (cascade, testet i repo og migrasjon). `client.test.ts` («spol tilbake») måtte også slippe den nye tabellen; forventet endring, ikke en feil i koden.
- Sikkerhet: «Ta i bruk» tar tekst fra klienten, så den valideres på nytt med `suggestionSchema` (lengdegrenser, kjent `appliesTo`, ukjente felt fjernes) og vises bare som tekst. Ingen grense for antall valgte forslag per oppskrift (utsatt).
- UI/tilgjengelighet: ett felles statusfelt står alltid i dokumentet og leser opp «Lager forslag …» og resultatet av hver handling. Knappene beholder fokus mens kallet pågår (aria-disabled), og fokus går til overskriften når knappen som ble trykket forsvinner. Knappenavnene inneholder forslagsteksten («Ta i bruk: …»).
- Utsatt: grense for antall valgte forslag; delen eier listen i klienttilstand, så en endring gjort i en annen fane vises først ved ny åpning; «Hopp over» huskes ikke etter omlasting (avtalt); ingen uavhengige reviews og ingen nettleserkontroll.
