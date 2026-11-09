---
title: 'Story 3.4: Marker favoritter'
type: 'feature'
created: '2026-11-09'
status: 'done'
baseline_commit: '5e1d797'
route: 'dispatch'
review_loop_iteration: 0
context:
  - '{project-root}/_bmad-output/implementation-artifacts/epic-1-context.md'
  - '{project-root}/AGENTS.md'
---
<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Favoritter-siden viser bare en tom-tilstand, og det finnes ingen måte å markere en oppskrift som favoritt (FR-15, FR-16, UX-DR10, UX-DR11).

**Approach:** En ny kolonne `recipes.is_favorite` (uavhengig av mappe). Et hjerte (en av/på-knapp) står på hvert oppskriftskort i Samlingen, i mapper og i Favoritter, og i lagre-linjen på oppskriftssiden. Trykk på hjertet markerer eller avmarkerer uten at oppskriften åpnes, og markeringen vises begge steder. Favoritter-siden lister favorittene, eller en tom-tilstand.

## Boundaries & Constraints

**Always:**
- **Skjema og migrasjon** (AD-6): én ny migrasjon `drizzle/0003_*.sql` laget med `npm run db:generate` (journal og snapshot committes): `recipes.is_favorite` heltall (boolean-modus), `NOT NULL DEFAULT 0`. Eksisterende rader får 0. Testes på en database med bare 0000–0002 og data i (alt bevares, alle `is_favorite = 0`), og rerun uten feil. Kontroller at SQL-en faktisk er gyldig `ALTER TABLE ... ADD COLUMN` (drizzle-kit har tidligere utelatt deler for hånd-fiksing).
- **Domene:** `Recipe.isFavorite: boolean` og `RecipeSummary.isFavorite: boolean`. Oppdater alle fixtures. `listSavedRecipes` henter `isFavorite` uten å lese ingredienser eller steg.
- **Repository:** `setRecipeFavorite(db, id, isFavorite)` returnerer `false` hvis oppskriften ikke finnes eller ikke er lagret (`savedAt` null), ellers `true` (også når verdien ikke endres, idempotent). Rører **aldri** `updated_at` (avkrysning og valgt antall er nøklet på den). `listFavoriteRecipes(db)` gir `RecipeSummary[]` for lagrede favoritter i samme sortering som Samlingen (sist lagret først; det finnes ingen «sist åpnet» ennå, se deferred-work). `updateRecipe` (redigering), `markRecipeSaved` og mappehandlinger rører ikke `is_favorite`. Når en oppskrift slettes, forsvinner favorittmarkeringen med den. Test alt mot in-memory SQLite.
- **Tjeneste:** `setFavorite(recipeId, isFavorite, db?)` og `listFavorites(db?)` returnerer `Result<…>` (`not_found` for ukjent eller ikke lagret oppskrift).
- **Server Action** `setFavorite(recipeId, isFavorite)` i `src/app/oppskrift/[id]/actions.ts` (AD-3; id og boolean valideres med zod på nytt). Eksplisitt verdi, ikke «toggle», så gjentatte trykk og to faner ikke snur feil vei. Svar `{ ok: true }` eller `{ ok: false, message }` (`messageFor`). Ved suksess: `revalidatePath("/", "layout")`. Databasefeil gir generell melding og endrer ingenting.
- **Hjerteknapp** (ny klientkomponent `FavoriteButton`): `<button type="button" aria-pressed>` med stabil `aria-label` som nevner oppskriften («Favoritt: <tittel>»; `aria-pressed` sier tilstanden, så etiketten skal ikke skifte mellom «legg til»/«fjern»). Ikon: SVG hjerte (fylt = favoritt, omriss = ikke), `aria-hidden`, farge via tokens (`currentColor`; ingen hardkodede farger; fungerer i mørk modus og `forced-colors`; tilstanden skal ikke bare bæres av farge, så fylt vs. omriss er forskjellen). Trykkflate minst 44×44 px. Optimistisk visning (`useOptimistic`/`useTransition`): hjertet skifter umiddelbart, rulles tilbake med melding ved feil. Mens en handling pågår hindres dobbeltrykk (siste ønskede verdi vinner, ingen kappløp mellom to kall). Fokusring synlig (gjenbruk mønstre fra 3.1–3.3).
- **Hjerte på kort** (`RecipeCard`, Samlingen, mappesiden og Favoritter): kortet er i dag én lenke. Hjertet skal være en **søsken** til lenken (aldri en knapp inni en lenke), plassert øverst til høyre på kortet og uten å åpne oppskriften. Tittel og meta må ikke havne under hjertet (reserver plass; lange titler og 40-tegns mappenavn uten mellomrom bryter om, ingen horisontal scroll ved 360 px og 200 % zoom). Én trykkflate per ting: kortet åpner, hjertet markerer. Tabrekkefølge: lenke, så hjerte.
- **Hjerte i lagre-linjen** (`RecipeActions`, bare for lagret oppskrift): ved siden av mappeknappen og «Slett». For en ikke-lagret oppskrift vises ikke hjertet (må lagres først). `role="status"`-området sier «Lagt til i favoritter.» eller «Fjernet fra favoritter.» i 3 sekunder (samme regler som «Lagret.»). Markeringen skal stemme overens med kortene etter navigasjon (revalidering) og når siden er skjult i `<Activity>`; ingen utdatert tilstand etter «tilbake».
- **Favoritter-siden** (`/favoritter`, Suspense + `connection()` som Samlingen; overskrift utenfor): kort i samme rutenett som Samlingen, alle med fylt hjerte og mappenavn i meta. Ingen favoritter: `EmptyState` som i dag (tittel og tekst uendret) med knappen «Gå til samlingen». Når jeg fjerner en favoritt her, forsvinner kortet etter revalidering; fokus må ikke gå tapt (flytt til en stabil, fokuserbar plass, for eksempel overskriften med `tabIndex={-1}`, eller til neste kortets hjerte), og endringen kunngjøres i et `role="status"`-område som overlever at kortet fjernes. Siden viser riktig tilstand etter «tilbake» fra en oppskrift.
- **Tekster** (AD-7) i `src/lib/messages.ts` (`favoriteMessages`), med i testen mot utropstegn. Gjenbruk tokens og mønstre; ingen hardkodede farger.
- README: avsnitt om favoritter og oppdatert testtall. deferred-work: mer under. Ny migrasjon nevnes ikke bare i README, men må fungere ved `npm run db:migrate` og første databaseåpning.
- Ingen ny pakke. `package-lock.json` uendret.

**Never:**
- Ingen favoritt for oppskrifter som ikke er i samlingen. Ingen egen favorittmappe eller rekkefølge, ingen søk, filter eller sortering.
- Ingen endring av `updatedAt` ved favorittendring. Ingen skriving til databasen ved visning av sider.
- Ingen knapp inni lenke; ingen avhengighet av farge alene; ingen endring i tolke- eller skaleringsregler.

## I/O & Edge-Case Matrix

| Scenario | State / handling | Forventet | Feil |
|----------|------------------|-----------|------|
| Marker på kort | Trykk hjertet i Samlingen | Hjertet fylles, oppskriften åpnes ikke; også fylt på oppskriftssiden | N/A |
| Marker på oppskriftssiden | Trykk hjertet i lagre-linjen | «Lagt til i favoritter.» 3 s; fylt på kortene og i Favoritter | N/A |
| Avmarker | Trykk igjen | Omriss; «Fjernet fra favoritter.» | N/A |
| Favoritter-siden | 2 favoritter | To kort, sist lagret først, begge med fylt hjerte | N/A |
| Ingen favoritter | `/favoritter` | Tom-tilstand med forklaring og «Gå til samlingen» | N/A |
| Avmarker i Favoritter | Trykk hjertet på et kort | Kortet forsvinner; fokus ikke tapt; kunngjøres; siste favoritt gir tom-tilstand | N/A |
| Ikke lagret | Oppskrift med `savedAt = null` | Ingen hjerte; `setFavorite` gir `not_found` og endrer ingenting | not_found |
| Slettet i annen fane | Trykk hjerte på borte oppskrift | Hjertet rulles tilbake og melding fra `messageFor("not_found")` | not_found |
| Raskt dobbeltrykk | To trykk på hjertet | Ingen kappløp; sluttilstand = siste trykk | N/A |
| Databasefeil | Feil i skriving | Rulles tilbake; generell melding; ingenting endret | unknown |
| Mappe og favoritt | Favoritt i mappe, bytt mappe | Fortsatt favoritt | N/A |
| Slett mappe | Mappen med favoritter slettes | Oppskriftene beholder favoritt | N/A |
| Rediger | «Lagre endringer» | Favoritt bevart; `updatedAt` endres som før | N/A |
| Slett oppskrift | Favoritt slettes | Borte fra Favoritter | N/A |
| `updatedAt` | Marker/avmarker | `updated_at` uendret | N/A |
| Lang tittel | 120 tegn, 40-tegns ord ved 360 px | Ingen overlapp med hjertet, ingen horisontal scroll | N/A |
| Migrasjon | Database fra 0002 med oppskrifter | Alt bevart; `is_favorite = 0` | N/A |
| Tilbake | Marker, åpne oppskrift, tilbake | Riktig tilstand begge steder | N/A |

</frozen-after-approval>

## Implementation Notes

Favoritter er implementert og dekket av tester; frozen-blokken er ikke endret.

- **Skjema og migrasjon:** `recipes.isFavorite` (`integer`, boolean-modus, `NOT NULL DEFAULT false`) i `schema.ts`; `drizzle/0003_favorites.sql` er generert med `npm run db:generate -- --name favorites` (journal og snapshot kommer fra drizzle-kit). SQL-en er kontrollert: én ren `ALTER TABLE ... ADD COLUMN`, ingenting utelatt (ingen fremmednøkkel eller indeks i denne endringen). drizzle-kit skrev `DEFAULT false`; jeg endret det for hånd til `DEFAULT 0` (likt i SQLite, og som spesifikasjonen sier), med kommentar. Snapshotet sier fortsatt `false`, og et nytt `db:generate` skal ikke gi noen diff (sjekket at skjemaet og snapshotet henger sammen ved at generate bare laget 0003).
- **Migrasjonstest:** en database med bare 0000–0002 og data (mappe, tre oppskrifter, linje, steg) bevarer alt og får `is_favorite = 0`; rerun er trygg; kolonnen er `INTEGER NOT NULL DEFAULT 0` og avviser NULL; SQL-filen er testet som ren `ADD COLUMN`; mappe slettet og oppskrift slettet beholder/fjerner favoritten riktig. Eksisterende migrasjonstester og `client.test.ts` (dev-omkjøring av migrasjoner) er oppdatert for den nye kolonnen og journalen.
- **Repository og tjeneste:** `setRecipeFavorite` (`changes > 0`, så samme verdi gir `true`; `savedAt` må være satt; rører bare `is_favorite`) og `listFavoriteRecipes`. Begge lister deler nå `selectSavedSummaries` med `listSavedRecipes`, så rekkefølgen er identisk. `setFavorite`/`listFavorites` i `recipe-service.ts`; `setFavorite` gir i tillegg `validation` hvis verdien ikke er boolsk (ikke i spesifikasjonen, rent forsvar).
- **Server Action:** `setFavorite(recipeId, isFavorite)` i `oppskrift/[id]/actions.ts`, zod-validert (id og `z.boolean()`), `revalidatePath("/", "layout")` bare ved suksess. Ugyldig boolsk verdi gir `messageFor("validation")`, som er den generelle «Noe i skjemaet må rettes»-teksten (samme som `rememberServings`); den kan bare oppstå ved et direkte kall.
- **Hjerteknapp:** `FavoriteButton` (klient) bruker `useOptimistic` over en lokal «bekreftet»-verdi som følger `isFavorite` fra serveren når den endres (revalidering og `<Activity>`). Raske trykk: hvert trykk setter den optimistiske verdien med en gang, og kallene sendes **ett om gangen** i en kø (`Promise`-kjede i en ref), så det aldri er to kall på vei samtidig og siste trykk avgjør sluttilstanden. Det betyr at «hindres dobbeltrykk» er tolket som «ingen kappløp», ikke «andre trykk ignoreres»; to raske trykk gir to kall (true, så false). Ikon er SVG med `currentColor`, fylt vs. omriss, 44 × 44 px, `forced-colors`-regler.
- **Feil:** uten `onResult` vises meldingen som `role="alert"` rett under hjertet (på kortet, i flyten under kortet; kortet vokser litt). Med `onResult` (lagre-linjen) går meldingen til statusområdet og vises ikke to ganger.
- **Kort:** `RecipeCard` har en rot (`div`) med lenken og hjertet som søsken; hjertet er plassert absolutt øverst til høyre, og hele kortet har `padding-inline-end` på 44 px + 8 px, så både tittel og meta holder seg unna hjertet. `RecipeCard` importerer `setFavorite` selv og binder den til id-en (som `RecipeView` gjør), så Samlingen, mapper og Favoritter ikke trenger endring.
- **Lagre-linjen:** hjertet står først i linjen (før mappeknappen og «Slett»), bare for lagret oppskrift. Meldingene bruker samme `flash()` og 3-sekundersregel som «Lagret.».
- **Favoritter-siden:** `FavoriteFeedback` (klientkomponent) er en ramme rundt overskrift og liste med et `role="status"`-område som overlever at kortet fjernes, og `focusHeading()`. En hjerteknapp som har fokus når den avmonteres (kortet er borte) kaller `focusHeading()`, som flytter fokus til `<h1 tabIndex={-1}>`. Valget ble overskriften, ikke neste korts hjerte. `onClick` fokuserer knappen eksplisitt, siden Safari ikke fokuserer knapper ved klikk. Konstanten for 3 sekunder er duplisert i `FavoriteFeedback.tsx` (`FAVORITE_MESSAGE_MS`) for å unngå en importsyklus mot `RecipeActions`.
- **Tekster:** `favoriteMessages` i `messages.ts` (tom-tilstanden har uendret tittel og tekst); med i utropstegn-testen. Den gamle hardkodede teksten i `favoritter/page.tsx` er erstattet.
- **Tester:** repository, tjeneste, handling, migrasjon, `FavoriteButton` (aria, optimistisk visning, tilbakerulling, kastet feil, raske trykk, `<Activity>`, CSS uten hex/px og med tokens, fokus og forced-colors), `FavoriteFeedback` (status 3 s, overlever fjerning, fokusflytting), `RecipeCard` (søsken, tabrekkefølge, ingen navigasjon), `RecipeActions`, `RecipeView`, Favoritter-siden (ny `favoritter/page.test.tsx`), Samlingen og mappesiden (hjerte), `messages`. Fixtures (`Recipe`, `RecipeSummary`, `NewRecipe`-uttrekk) er oppdatert. Tellingen er 56 filer og 1107 tester (var 54 og 1001; én test lagt til i kodegjennomgangen). Ingen nye pakker; `package.json` og `package-lock.json` er uendret.
- **Nettleserkontroll:** bygget og kjørt `next start` mot en frø-database, styrt med headless Chrome via DevTools-protokollen (360 px, lys og mørk). Målt: ingen sidescroll (`scrollWidth` 360) med 60+40-tegns tittel og 40-tegns mappenavn; hjertet fylles med en gang, og tilstanden består etter revalidering; avmarkering på Favoritter fjerner kortet, fokus havner på overskriften, statusområdet sier «Fjernet fra favoritter.», og tom-tilstand vises; på oppskriftssiden sier statusområdet «Lagt til i favoritter.»; marker på oppskriftssiden, «tilbake» til Samlingen og Favoritter gir riktig tilstand (sjekket bare synlig side, siden `<Activity>` beholder skjulte sider i DOM). Skjermbilder lest for Samlingen (lys og mørk) og oppskriftssiden.
- **Avvik og usikkerhet:**
  - Ikke målt: 200 % zoom, `forced-colors` og Safari (CSS-reglene er skrevet og testet bare som tekst). Maja sjekker selv i nettleseren, som for 3.3.
  - Ikke målt: 1280 px. Rutenettet er uendret fra Samlingen, så det er lite sannsynlig å avvike.
  - To avmarkeringer på Favoritter innen 3 sekunder gir samme tekst; skjermleseren leser da ikke opp den andre (samme tekst i et `role="status"`-område leses ikke på nytt). Se deferred-work.
  - Optimistisk visning er avhengig av at revalideringen fra Server Action leverer ny `isFavorite` i samme overgang. Det virket i nettleserkontrollen (ingen blink tilbake), men det er ikke testet i jsdom (der simuleres revalidering med ny prop).
  - Sesjonsloggen (`.logs/`) og issues er ikke ført; det gjør Maja i sin egen prosess.

## Rettelser etter kodegjennomgang

- `FavoriteButton`: et trykk som er overstyrt av et nyere melder ikke selv (ingen gammel feil, ingen «Fjernet fra favoritter.» for noe som aldri ble lagt til). «Lagt til»/«Fjernet» sies bare når bekreftet verdi faktisk endres. To nye tester.
- `setFavorite` (handling) revaliderer også ved `not_found`, så et kort for en oppskrift som er slettet i en annen fane forsvinner. Tester oppdatert.
- Tidskonstanten for statusmeldinger (3 s) ligger nå i `src/lib/timing.ts` og brukes av både `RecipeActions` og `FavoriteFeedback` (ingen import-syklus, ingen duplikat).

## Review Triage Log

Tre uavhengige gjennomganger (randtilfeller og data, spesifikasjon og arkitektur, UI/tilgjengelighet/tester) ga 17 funn, ingen høye og ingen bekreftede feil i data. Triage: 4 rettes (patch), 7 utsettes (defer), 6 avvises (reject).

**Patch (rettet):**
1. Melding for overstyrt trykk: feil fra første trykk kunne komme tilbake etter andre trykk, og «Fjernet fra favoritter.» kunne sies for noe som aldri ble favoritt (to scenarier i kø).
2. `not_found` revaliderte ikke: kortet til en oppskrift slettet i annen fane ble stående, og hvert nytt trykk ga ny feil.
3. Duplisert `FAVORITE_MESSAGE_MS`/3000: delt konstant.
4. Avviket «kø i stedet for sperre» står nå tydelig som avvik fra frozen-teksten (se Implementation Notes og under).

**Defer (deferred-work.md):**
5. Feilmelding på kort lukkes ikke av seg selv og skyver rutenettet (bare Samlingen/mapper/Favoritter).
6. Layouttestene er tekst-regex og jsdom; en ekte-nettleser-test for 360 px mangler (målt manuelt i Chromium, ingen overlapp, ingen sidescroll).
7. Ingen test for «skjult Activity mens hjertet har fokus» (ikke utløst i Chromium).
8. Hjertet i lagre-linjen er uten ramme ved siden av rammede knapper (estetikk; vurderes etter Majas skjermbilder).
9. Sist brukt først tolkes som sist lagret først (ingen «sist åpnet» ennå); avviker fra ordlyden i epics.
10. Raske trykk gir like mange kall som trykk (kø); kan slås sammen senere.
11. Statusmelding to ganger innen 3 s med lik tekst blir ikke lest opp på nytt.

**Reject:**
12. Gammelt hjerte i skjult Activity-side (data riktig, visning rettes ved neste revalidering; eksplisitt verdi).
13. `setFavorite` gir `validation` for ikke-boolsk verdi (dobbelt forsvar, harmløst).
14. Snapshot `default: false` mot SQL `0` (ingen diff i `db:generate`).
15. Ingen statusmelding på kort i Samlingen/mapper (spesifikasjonen krever bare `aria-pressed`).
16. Ingen rad-sperre mot at lagret kan angres (finnes ingen slik funksjon; fremtidig risiko).
17. Safari-klikk-fokus uten test (kommentert, lav verdi).
