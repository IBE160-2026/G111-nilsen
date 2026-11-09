# Spec 2.4: Oppgi porsjonsantall når kilden mangler det

## Intent
Når en oppskrift ikke har tolkbart porsjonsantall, spørres brukeren «Hvor mange er oppskriften laget for?» før skalering er mulig (FR-3, UX-DR13). Det opprinnelige antallet kan endres via «oppr. N · endre», og alle mengder regnes om fra det.

## Atferd
- `IngredientList` åpner `ServingsDialog` ved visning når `originalServings` mangler (og lagrefunksjon er bundet). Dialogen er bygget på den felles `Dialog` (fokusfelle, Escape, tastatur) med `ServingStepper bare` (−/+ og skrevet tall, 1–50, standard 4). Startfokus er antallsfeltet.
- «Lagre» kaller Server Action `changeOriginalServings(id, n)`: zod-validering, `setOriginalServings` (service) → `updateOriginalServings` (repo). Gjelder lagret og ulagret oppskrift. `selectedServings` nullstilles, `updatedAt` røres ikke (avkrysning er nøklet på den). Alle sider revalideres.
- «Avbryt» eller Escape lar oppskriften stå uskalert; knappen «Oppgi antall personer» åpner dialogen igjen.
- Med antall vises «oppr. N · endre». «endre» åpner samme dialog med antallet valgt. Etter lagring regnes mengdene fra det nye antallet, og valgt antall = nytt opprinnelig antall.
- Feil ved lagring vises i dialogen (`role="alert"`), som blir åpen. Dobbeltklikk gir én lagring.
- `Dialog` lukker en åpen modal stille når siden skjules av `<Activity>` (eller i strict mode) og åpner den igjen når siden vises, ellers ville resten av dokumentet bli stående utilgjengelig.

## Matrise
| Tilfelle | Utfall | Test |
|---|---|---|
| Antall mangler | dialog åpen med fokus i feltet | `IngredientList.original.test.tsx`, `RecipeView.test.tsx`, Chromium |
| Lagre | `changeOriginalServings(id, n)`, «oppr. n» | samme + `actions.test.ts` |
| Avbryt/Escape | uskalert, «Oppgi antall personer» | `IngredientList.original.test.tsx`, `ServingsDialog.test.tsx` |
| «endre» | dialog med antallet, nytt antall regner om | `IngredientList.original.test.tsx` |
| Ugyldig antall/id | `validation`/`not_found`, ingenting lagres | `actions.test.ts`, `recipe-service.test.ts`, `recipe-repository.test.ts` |
| Siden skjules mens dialogen er åpen | lukkes stille, åpnes igjen | `Dialog.test.tsx` |

## Verifisering
lint, typecheck, format:check og build grønne; 73 filer og 2164 tester; lock-filene uendret. Kjørt i Chromium mot dev-server (`IMPORT_SOURCE=fixtures`, strict mode): dialogen åpner med fokus i feltet, Escape lukker, «Oppgi antall personer» åpner igjen, lagring gir «oppr. 6» som består etter omlasting, «endre» åpner med 6, ingen konsollfeil.

## Review Triage Log
Gjort med egen gjennomgang (ingen underagenter, for å spare økta). Funn: dialogen som åpner av seg selv kunne bli stående modal når siden skjules av Activity → rettet i `Dialog` med test. Utsatt: redigeringsskjemaet krever fortsatt antall (feltet står tomt for importerte uten antall); ingen uavhengige reviews for 2.4.
- Enter i antallsfeltet i dialogen lagrer valgt antall (ugyldig tekst gir melding og lagrer ikke).
