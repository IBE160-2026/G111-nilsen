# Spec 5.1: halve porsjoner

## Intent
Versjon 2, første story. Brukeren kan velge halve porsjoner (4,5 eller 6,5 porsjoner) når hun endrer antallet på en oppskrift, så mengdene regnes riktig om og valget huskes.

## Frosset
- Valgt antall (`selectedServings`) kan være hele eller halve tall fra 1 til 50. Antallet oppskriften er skrevet for (`originalServings`, «oppr.», dialogen og «Legg inn selv») er fortsatt bare hele tall.
- Én felles regel `isSelectedServings` i `src/lib/recipe-input.ts` (brukes av komponenten, Server Actions og servicen); `formatServings` viser komma («4,5»).
- Porsjonsvelgeren får valgfri `allowHalf`. Den gir knappen «+ ½» (`aria-pressed`, legger til eller fjerner en halv porsjon, deaktivert ved 50), og feltet godtar «4,5» og «4.5». −/+ går fortsatt i hele steg og beholder halvdelen (4,5 → 5,5), men stopper på 1 og 50.
- Ingen databaseendring: SQLite lagrer 4,5 i kolonnen `selected_servings` (heltallsaffinitet beholder desimalverdier). Et lagret ugyldig tall (for eksempel 2,3) gir fortsatt opprinnelig antall.
- Skaleringen er uendret (`valgt / opprinnelig`); «ca.»-regelen for stykkvarer gjelder som før.

## Matrise
| Tilfelle | Utfall |
|---|---|
| Trykk «+ ½» ved 4 | felt «4,5», opplesing «4,5 porsjoner», knappen trykket |
| Trykk «+ ½» ved 4,5 | tilbake til 4 |
| −/+ ved 4,5 | 5,5 / 3,5; ved 1,5 gir − 1 og deaktivert − |
| Ved 50 | «+ ½» deaktivert |
| Skriv «6,5» eller «6.5» | godtas |
| Skriv «6,3», «0,5», «50,5», «abc» | melding «Skriv et helt eller halvt tall …», forrige verdi beholdes |
| Lagret 6,5 | startverdi 6,5 og sendes til `onServingsChange` |
| `rememberServings`/`saveRecipe` med 4,5 | lagres; 0,5, 50,5, 2,3, NaN avvises (`validation`) |
| Dialogen «Hvor mange er oppskriften laget for?» | uendret, bare hele tall |

## Verifisering
lint, typecheck, format:check, build grønne; 79 filer og 2341 tester (28 nye/endrede). Ikke kjørt i nettleser.

## Review Triage Log
Egen gjennomgang, ingen underagenter.
- Eksisterende tester antok at 2,5 var ugyldig → byttet til 2,3 (valgt antall) og beholdt 2,5 for opprinnelig antall.
- Tabulatorrekkefølgen fikk ett ekstra stopp («+ ½»); tastaturtesten oppdatert. e2e-testene bruker feltet og −/+, ikke tabulatorrekkefølge til knappen, men må kjøres på Macen.
- Utsatt: halve porsjoner for oppr. antall og i «Legg inn selv»; enhetsvisning av brøker («2 1/4») ved halve porsjoner.
