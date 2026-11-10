# 009 – Valgt antall personer glemmes når oppskriften lagres etterpå

| | |
|---|---|
| **Status** | Løst |
| **Funnet** | 2026-11-10, av Claude (ende-til-ende-test for UJ-1 og UJ-3, Story 4.4) |
| **Løst** | 2026-11-10 |
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
Rettet: `SelectedServingsProvider` (`src/components/SelectedServings.tsx`) rundt oppskriftssiden holder det siste valgte antallet i en ref. `IngredientList` melder fra når antallet endres, og «Lagre» (`RecipeActions`) sender det med til `saveRecipe(id, servings)`, som lagrer oppskriften og så husker antallet (ugyldig antall ignoreres, lagringen lykkes likevel). Antall valgt etter lagring huskes som før. Testet i `actions.test.ts`, `RecipeActions.test.tsx`, `RecipeView.test.tsx` og e2e (UJ-1 og UJ-3 følger nå PRD). Spec 2.4 sier fortsatt «huskes bare for oppskrifter i samlingen» for endringer underveis; valget før lagring tas med ved lagring.

## Lærdom / prompt
Journeys i PRD bør kjøres som ende-til-ende-test tidlig, ikke først til slutt. Testen `e2e/kjerneflyt.spec.ts` (UJ-1/UJ-3) dekker oppførselen i dag; følger nå PRD.
