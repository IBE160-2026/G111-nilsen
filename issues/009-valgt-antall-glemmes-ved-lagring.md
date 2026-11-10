# 009 – Valgt antall personer glemmes når oppskriften lagres etterpå

| | |
|---|---|
| **Status** | Åpen |
| **Funnet** | 2026-11-10, av Claude (ende-til-ende-test for UJ-1 og UJ-3, Story 4.4) |
| **Løst** | – |
| **Område** | skalering / lagring |
| **Alvorlighet** | lav |

## Hva skjedde
UJ-1 sier at Ida endrer antallet til 5 og så lagrer oppskriften, og UJ-3 sier at hun en uke senere ser at den «sist ble laget for 5 personer». Slik fungerer det ikke: valgt antall huskes bare for oppskrifter som allerede ligger i samlingen (Story 2.4). Et antall som velges *før* «Lagre» blir ikke lagret, og oppskriften åpnes igjen med antallet den er laget for. Velges antallet *etter* lagring, huskes det.

## Hvordan gjenskape
1. Importer en oppskrift (`IMPORT_SOURCE=fixtures`, for eksempel Amerikanske pannekaker).
2. Trykk «Flere personer» og så «Lagre».
3. Gå til Oppskrifter og åpne oppskriften: antallet er det opprinnelige (4), ikke 5.

## Årsak
`RecipeView` sender bare `onServingsChange` når `recipe.savedAt !== null`. `saveRecipe` tar bare oppskriftens id, så det valgte antallet i klienten følger ikke med. Bevisst valg i Story 2.4 («huskes bare for oppskrifter i samlingen»), men det dekker ikke rekkefølgen i UJ-1.

## Løsning / hva kan endres
Foreslått: la «Lagre» sende med gjeldende valgte antall, eller kall `rememberServings` rett etter vellykket lagring når antallet er endret. Krever at `RecipeView` kjenner valgt antall (i dag eies det av `IngredientList`). Ikke gjort i Story 4.4; ende-til-ende-testen velger antallet på nytt etter lagring. Oppdater i så fall spec-2-4 og PRD-kravet «Sist valgte porsjonsantall … lagres med oppskriften».

## Lærdom / prompt
Journeys i PRD bør kjøres som ende-til-ende-test tidlig, ikke først til slutt. Testen `e2e/kjerneflyt.spec.ts` (UJ-1/UJ-3) dekker oppførselen i dag; endre den når saken er løst.
