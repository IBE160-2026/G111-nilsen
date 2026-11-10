# Spec 6.2: tid for oppskriften

## Intent
Epic 6. Oppskriften skal vise hvor lang tid den tar, ved favoritthjertet, så man kan velge noe som passer tiden man har.

## Frosset
- **Data:** kolonnen `recipes.total_minutes` (heltall, `null` = ikke oppgitt), migrasjon `0007_recipe_time`. `Recipe.totalMinutes` er valgfri i typen.
- **Grenser:** hele minutter fra 1 til 1440 (`isRecipeMinutes`, `MAX_RECIPE_MINUTES`).
- **Import:** `totalTime` fra oppskriftsdata; ellers summen av `prepTime` og `cookTime` når minst én kan leses (`parseIsoDuration`: «PT45M», «PT1H15M», «P0DT2H», «PT90M»; sekunder rundes opp). Ugyldig, 0 eller over et døgn gir ingen tid. Eksempel: Rundstykker (Matprat) `PT80M` → 80.
- **Skjema:** «Legg inn selv» og «Rediger» har feltet «Tid (minutter)» (valgfritt, med forklaring) etter antall personer. Tomt = ingen tid. Ugyldig gir «Skriv tiden i hele minutter, fra 1 til 1440, eller la feltet stå tomt.» under feltet. Redigering fyller inn lagret tid; tømt felt fjerner den. Tjenesten validerer på nytt (`validation`, `minutes`).
- **Visning:** `RecipeTime` i lagre-linjen, rett etter hjertet (eller først når oppskriften ikke er lagret): klokke og «45 min», «1 t», «1 t 15 min» (`formatMinutes`); skjermlesere hører «Tid: 45 min». Under 400 px skjules klokka og avstandene i linjen er tettere, så hjerte, tid, mappe og slett står på én linje ved 360 px.

## Matrise
| Tilfelle | Utfall |
|---|---|
| Import med `totalTime: PT1H` | «1 t» ved hjertet |
| Import med bare `cookTime: PT30M` | «30 min» |
| Import uten tid | ingen tid vises |
| «Legg inn selv» med 45 | «45 min» |
| 0, 1441, 4,5, «en time» | feilmelding under feltet, ingenting lagres |
| Rediger: tøm feltet | tiden fjernes |

## Verifisering
lint, typecheck, format:check og build grønne; 101 filer og 2679 tester (nye: `duration.test.ts`, tid i `normalize-recipe`, skjema, `initialValuesOf`, tjeneste, import, `RecipeActions`); 18 e2e grønne i skyen (UJ-1 sjekker at tiden vises etter import). Skjermbilde ved 360 px sett.

## Review Triage Log
Egen gjennomgang.
- Første versjon brøt lagre-linjen på to linjer ved 360 px (hjerte + tid + «Lagre i mappe» + «Slett» = 344 px av 328). Løst med tettere avstand og uten klokke under 400 px.
- Oppdatering uten feltet `minutes` (eldre kall) beholder tiden; `null` fjerner den. Testet.
- Utsatt: vise tiden i Oppskrifter-listen og filtrere/sortere på tid (passer med 6.9), skille forberedelse og steketid.

## Oppfølging 2026-11-10 (etter Majas test)
Maja fant at tiden bare kom når hun skrev den inn: oppskriftene hennes var importert før 6.2, og en ny import av samme lenke gjenbruker den lagrede oppskriften uten å hente siden. Hun ville også se tiden tydeligere.
- **«Hent tid fra kilden»:** en importert oppskrift uten tid har knappen under tittelen. Handlingen `fetchTimeFromSource` (tilgangssjekk som andre handlinger) henter siden på nytt via `refreshTimeFromSource` og lagrer bare tiden; tittel, ingredienser, steg og `updatedAt` røres ikke. Uten tid på siden: «Fant ingen tid på siden. Du kan skrive den inn under «Rediger».»
- **Mer robust lesing av tid:** også «P0Y0M0DT0H30M0.000S», desimaler («PT0.5H», «PT0,5H») og uker; år og måneder godtas bare som 0.
- **Synlig flere steder:** under tittelen («Matprat · 45 min»), ved hjertet som før, og på oppskriftskortene i Oppskrifter, Mapper og Favoritter (`RecipeSummary.totalMinutes`).
- Verifisering: 2695 enhetstester og 18 e2e grønne i skyen (UJ-1 sjekker tid både under tittelen og ved hjertet); skjermbilder ved 1280 px sett.
