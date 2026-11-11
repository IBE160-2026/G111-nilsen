import "server-only";
import {
  buildSearchText,
  normalizeSearch,
  isRecipeMinutes,
  parseLine,
  type CollectionEntry,
  type Recipe,
  type RecipeSummary,
  type ShoppingRecipe,
  withAppliedSuggestions,
} from "@/domain";
import { isSelectedServings, LIMITS, splitLines } from "@/lib/recipe-input";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  copyRecipe,
  deleteRecipeById,
  deleteRecipeLabel,
  deleteStaleUnsavedRecipes,
  findRecipeById,
  findRecipeOwner,
  insertRecipe,
  insertRecipeLabel,
  listFavoriteRecipes,
  listRecipeLabels,
  listSavedIngredientNames,
  listSavedRecipes,
  markCooked,
  markRecipeSaved,
  setRecipeFavorite,
  updateRecipe,
  updateFitsFor,
  updateRating,
  updateNotes,
  updateOriginalServings,
  updateSelectedServings,
  type NewIngredientLine,
  type NewStep,
} from "../db/repositories/recipe-repository";

/** Ferdig validert input fra skjemaet «Legg inn selv». */
export type ManualRecipeInput = {
  title: string;
  servings: number;
  ingredients: string[];
  steps: string[];
  /** Tid i minutter, 1–1440 (Story 6.2); `null` = ingen tid, utelatt = ikke en del av skjemaet. */
  minutes?: number | null;
};

type ManualRecipeField = "title" | "servings" | "minutes" | "ingredients" | "steps";

function linesOf(texts: string[]): string[] {
  return texts.flatMap(splitLines);
}

function tooLong(lines: string[], max: number): boolean {
  return lines.length > LIMITS.linesPerField || lines.some((line) => line.length > max);
}

/** Finner første felt som bryter grensene i `LIMITS`, eller `null`. */
function invalidField(
  title: string,
  servings: number,
  ingredients: string[],
  steps: string[],
): ManualRecipeField | null {
  if (title === "" || title.length > LIMITS.titleLength) return "title";
  if (
    !Number.isInteger(servings) ||
    servings < LIMITS.servingsMin ||
    servings > LIMITS.servingsMax
  ) {
    return "servings";
  }
  if (ingredients.length === 0 || tooLong(ingredients, LIMITS.ingredientLineLength)) {
    return "ingredients";
  }
  if (tooLong(steps, LIMITS.stepLength)) return "steps";
  return null;
}

type RecipeContent = { title: string; ingredients: NewIngredientLine[]; steps: NewStep[] };

/**
 * Validerer og bygger innholdet som skal lagres: tittel, tolkede ingredienslinjer og
 * steg. Brukes både ved ny oppskrift og ved redigering, så reglene er de samme.
 */
function buildContent(input: ManualRecipeInput): Result<RecipeContent> {
  const title = input.title.trim();
  const ingredients = linesOf(input.ingredients);
  const stepTexts = linesOf(input.steps);

  const invalid = invalidField(title, input.servings, ingredients, stepTexts);
  if (invalid) return err(appError("validation", invalid));
  if (input.minutes != null && !isRecipeMinutes(input.minutes)) {
    return err(appError("validation", "minutes"));
  }

  return ok({
    title,
    ingredients: ingredients.map((text, position) => ({
      ...parseLine(text),
      position,
      section: null,
    })),
    steps: stepTexts.map((text, position) => ({ text, position, section: null })),
  });
}

/**
 * Lagrer en oppskrift brukeren har skrevet selv. Hver ingredienslinje tolkes med
 * `parseLine` og lagres med originaltekst (trimmet) og tolkede felt (AD-2).
 * Oppskriften legges rett i samlingen: `savedAt` settes til lagringstidspunktet.
 */
export function createManualRecipe(
  userId: number,
  input: ManualRecipeInput,
  db: Db = getDb(),
): Result<{ id: number }> {
  const content = buildContent(input);
  if (!content.ok) return content;

  const now = new Date().toISOString();
  const id = insertRecipe(db, {
    title: content.value.title,
    sourceUrl: null,
    sourceName: null,
    originalServings: input.servings,
    selectedServings: null,
    savedAt: now,
    createdAt: now,
    updatedAt: now,
    ingredients: content.value.ingredients,
    steps: content.value.steps,
    userId,
    totalMinutes: input.minutes ?? null,
  });
  return ok({ id });
}

/**
 * Lagrer redigeringer av en oppskrift (Story 3.5). Samme validering og tolking som ved
 * ny oppskrift; ingredienser og steg erstattes. Kilde og samlingsstatus røres ikke.
 * Ukjent eller ugyldig id gir `not_found`, og ingenting lagres.
 */
export function updateManualRecipe(
  id: number,
  input: ManualRecipeInput,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!Number.isSafeInteger(id) || id < 1) return err(appError("not_found"));

  const content = buildContent(input);
  if (!content.ok) return content;

  const updated = updateRecipe(db, id, {
    title: content.value.title,
    originalServings: input.servings,
    updatedAt: new Date().toISOString(),
    ingredients: content.value.ingredients,
    steps: content.value.steps,
    ...(input.minutes !== undefined ? { totalMinutes: input.minutes } : {}),
  });
  return updated ? ok({ id }) : err(appError("not_found"));
}

function isRecipeId(id: number): boolean {
  return Number.isSafeInteger(id) && id >= 1;
}

/**
 * Legger en oppskrift i brukerens samling (Story 3.2, 5.13). En allerede lagret oppskrift beholder
 * sitt tidspunkt. Ugyldig eller ukjent id, og en annen brukers oppskrift, gir `not_found`.
 */
export function saveRecipeToCollection(
  userId: number,
  id: number,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  return markRecipeSaved(db, id, new Date().toISOString(), userId)
    ? ok({ id })
    : err(appError("not_found"));
}

/**
 * Lager en egen variant av en lagret oppskrift (Story 6.10): en ny, lagret oppskrift med tittelen
 * `titlePrefix` foran originalens tittel (avkortet til tittelgrensen) og samme innhold, som kan endres uten å røre
 * originalen. Ukjent eller ulagret oppskrift gir `not_found`.
 */
export function copyRecipeAsVariant(
  id: number,
  titlePrefix: string,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  const original = findRecipeById(db, id);
  if (original === null || original.savedAt === null) return err(appError("not_found"));
  const title = `${titlePrefix}${original.title}`.slice(0, LIMITS.titleLength).trim();
  const newId = copyRecipe(db, id, title, new Date().toISOString());
  return newId === null ? err(appError("not_found")) : ok({ id: newId });
}

/** Sletter oppskriften med ingredienser og steg. Ugyldig eller ukjent id gir `not_found`. */
export function deleteRecipe(id: number, db: Db = getDb()): Result<{ id: number }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  return deleteRecipeById(db, id) ? ok({ id }) : err(appError("not_found"));
}

/**
 * Husker valgt antall porsjoner for en lagret oppskrift. Gyldig er hele og halve tall fra 1 til
 * 50 (Story 5.1); alt annet gir `validation` (felt `servings`). Ukjent id gir `not_found`.
 */
export function setSelectedServings(
  id: number,
  servings: number,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  if (!isSelectedServings(servings)) return err(appError("validation", "servings"));
  return updateSelectedServings(db, id, servings) ? ok({ id }) : err(appError("not_found"));
}

/**
 * Lagrer antallet oppskriften er skrevet for (Story 2.4, FR-3). Antall utenfor 1–50 eller ikke
 * heltall gir `validation` (felt `servings`); ukjent id gir `not_found`. Gjelder også ulagrede.
 */
export function setOriginalServings(
  id: number,
  servings: number,
  db: Db = getDb(),
): Result<{ id: number }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  if (
    !Number.isInteger(servings) ||
    servings < LIMITS.servingsMin ||
    servings > LIMITS.servingsMax
  ) {
    return err(appError("validation", "servings"));
  }
  return updateOriginalServings(db, id, servings) ? ok({ id }) : err(appError("not_found"));
}

/** Oppskrifter som aldri ble lagret ryddes bort etter så lang tid. */
export const UNSAVED_RECIPE_MAX_AGE_MS = 24 * 60 * 60 * 1000;

/**
 * Sletter oppskrifter som ikke er i samlingen og er eldre enn et døgn (regnet fra `now`).
 * Lagrede oppskrifter røres aldri. Returnerer antall slettede.
 */
export function purgeStaleUnsavedRecipes(
  now: Date = new Date(),
  db: Db = getDb(),
): Result<{ deleted: number }> {
  const cutoff = new Date(now.getTime() - UNSAVED_RECIPE_MAX_AGE_MS).toISOString();
  return ok({ deleted: deleteStaleUnsavedRecipes(db, cutoff) });
}

/** Henter en oppskrift, eller `not_found` når id-en ikke finnes. */
export function getRecipe(id: number, db: Db = getDb()): Result<Recipe> {
  if (!Number.isSafeInteger(id) || id < 1) return err(appError("not_found"));
  const recipe = findRecipeById(db, id);
  return recipe ? ok(recipe) : err(appError("not_found"));
}

/**
 * Oppskriftene i samlingen, sist lagret først, hver med søketekst (Story 5.2): tittel, kilde,
 * mappe, merkelapper (Story 6.7) og ingrediensnavn.
 */
export function listCollection(userId: number, db: Db = getDb()): Result<CollectionEntry[]> {
  const names = listSavedIngredientNames(db, userId);
  return ok(
    listSavedRecipes(db, userId).map((recipe) => ({
      ...recipe,
      searchText: buildSearchText([
        recipe.title,
        recipe.sourceName,
        recipe.folderName,
        ...(recipe.labels ?? []),
        ...(names.get(recipe.id) ?? []),
      ]),
    })),
  );
}

/**
 * Lagrede oppskrifter med ingredienser, til handlelisten (Story 5.7). Sist lagret først, som i
 * samlingen. Ingrediensforslag som er tatt i bruk og har mengde er med (Story 5.11).
 */
export function listShoppingRecipes(userId: number, db: Db = getDb()): Result<ShoppingRecipe[]> {
  const recipes: ShoppingRecipe[] = [];
  for (const summary of listSavedRecipes(db, userId)) {
    const recipe = findRecipeById(db, summary.id);
    if (!recipe) continue;
    recipes.push({
      id: recipe.id,
      title: recipe.title,
      originalServings: recipe.originalServings,
      selectedServings: recipe.selectedServings,
      // Ingrediensforslag som er tatt i bruk tas med når de har mengde (Story 5.11).
      ingredients: withAppliedSuggestions(
        recipe.ingredients,
        recipe.steps,
        recipe.suggestions,
      ).ingredients.filter((line) => !line.suggested || (line.parseable && line.quantity !== null)),
    });
  }
  return ok(recipes);
}

/**
 * Markerer eller avmarkerer en lagret oppskrift som favoritt (Story 3.4). Eksplisitt verdi,
 * ikke «bytt», så gjentatte kall gir samme resultat. Ugyldig eller ukjent id og oppskrift som
 * ikke er i samlingen gir `not_found`, og ingenting endres.
 */
export function setFavorite(
  recipeId: number,
  isFavorite: boolean,
  db: Db = getDb(),
): Result<{ id: number; isFavorite: boolean }> {
  if (!isRecipeId(recipeId)) return err(appError("not_found"));
  if (typeof isFavorite !== "boolean") return err(appError("validation", "isFavorite"));
  return setRecipeFavorite(db, recipeId, isFavorite)
    ? ok({ id: recipeId, isFavorite })
    : err(appError("not_found"));
}

/** Favorittene i samlingen, sist lagret først. */
export function listFavorites(userId: number, db: Db = getDb()): Result<RecipeSummary[]> {
  return ok(listFavoriteRecipes(db, userId));
}

/**
 * Om `viewer` (innlogget bruker, eller `null`) kan se og endre oppskriften (Story 5.13): eieren kan
 * det, og en import uten eier (ulagret, uten innlogging) kan alle med lenken. Ukjent id gir `false`.
 */
export function canAccessRecipe(viewer: number | null, id: number, db: Db = getDb()): boolean {
  if (!isRecipeId(id)) return false;
  const owner = findRecipeOwner(db, id);
  return owner !== null && (owner.userId === null || owner.userId === viewer);
}

/** Henter oppskriften for `viewer`, eller `not_found` når den ikke finnes eller er en annens. */
export function getRecipeFor(viewer: number | null, id: number, db: Db = getDb()): Result<Recipe> {
  if (!canAccessRecipe(viewer, id, db)) return err(appError("not_found"));
  return getRecipe(id, db);
}

/** Hvor lange notatene kan være (Story 6.3). */
export const NOTES_MAX_LENGTH = 2000;

/** Hvor lang «Passer til» kan være. */
export const FITS_FOR_MAX_LENGTH = 60;

/**
 * Lagrer «Passer til» på en lagret oppskrift: brukerens egen vurdering, for eksempel «2 sultne».
 * Teksten trimmes (flere mellomrom blir ett); tom tekst fjerner den. Over 60 tegn gir
 * `validation` (felt `fitsFor`). Ukjent eller ulagret oppskrift gir `not_found`.
 */
export function setRecipeFitsFor(
  id: number,
  fitsFor: string,
  db: Db = getDb(),
): Result<{ fitsFor: string | null }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  if (typeof fitsFor !== "string") return err(appError("validation", "fitsFor"));
  const clean = fitsFor.replace(/\s+/g, " ").trim();
  if (clean.length > FITS_FOR_MAX_LENGTH) return err(appError("validation", "fitsFor"));
  const value = clean === "" ? null : clean;
  return updateFitsFor(db, id, value) ? ok({ fitsFor: value }) : err(appError("not_found"));
}

/**
 * Lagrer egen vurdering (Story 6.8): et helt tall fra 1 til 5, eller `null` for å fjerne den.
 * Alt annet gir `validation` (felt `rating`). Ukjent eller ulagret oppskrift gir `not_found`.
 */
export function setRecipeRating(
  id: number,
  rating: unknown,
  db: Db = getDb(),
): Result<{ rating: number | null }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  const valid =
    rating === null ||
    (typeof rating === "number" && Number.isInteger(rating) && rating >= 1 && rating <= 5);
  if (!valid) return err(appError("validation", "rating"));
  return updateRating(db, id, rating as number | null)
    ? ok({ rating: rating as number | null })
    : err(appError("not_found"));
}

/**
 * Lagrer notatene på en lagret oppskrift (Story 6.3). Teksten trimmes; tom tekst fjerner
 * notatene. Over 2000 tegn gir `validation` (felt `notes`). Ukjent eller ulagret oppskrift gir
 * `not_found`.
 */
export function setRecipeNotes(
  id: number,
  notes: string,
  db: Db = getDb(),
): Result<{ notes: string | null }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  if (typeof notes !== "string") return err(appError("validation", "notes"));
  const clean = notes.replace(/\r\n?/g, "\n").trim();
  if (clean.length > NOTES_MAX_LENGTH) return err(appError("validation", "notes"));
  const value = clean === "" ? null : clean;
  return updateNotes(db, id, value) ? ok({ notes: value }) : err(appError("not_found"));
}

/**
 * «Laget i dag» (Story 6.3): setter sist laget til `now` og øker antallet. Ukjent eller ulagret
 * oppskrift gir `not_found`.
 */
export function markRecipeCooked(
  id: number,
  db: Db = getDb(),
  now: () => Date = () => new Date(),
): Result<{ lastCookedAt: string; cookedCount: number }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  const at = now().toISOString();
  const count = markCooked(db, id, at);
  return count === null ? err(appError("not_found")) : ok({ lastCookedAt: at, cookedCount: count });
}

/** Lengste merkelapp og flest merkelapper på én oppskrift (Story 6.7). */
export const LABEL_MAX_LENGTH = 30;
export const LABELS_MAX = 10;

/**
 * Legger en merkelapp på en lagret oppskrift (Story 6.7). Teksten trimmes (flere mellomrom blir
 * ett). Tom tekst gir `validation` (`label_required`), over 30 tegn `label_too_long`, og en
 * oppskrift med 10 merkelapper `limit`. Samme merkelapp (uavhengig av store og små bokstaver)
 * en gang til endrer ingenting. Ukjent eller ulagret oppskrift gir `not_found`. Svarer med alle
 * merkelappene.
 */
export function addRecipeLabel(
  id: number,
  label: unknown,
  db: Db = getDb(),
): Result<{ labels: string[] }> {
  if (!isRecipeId(id)) return err(appError("not_found"));
  if (typeof label !== "string") return err(appError("validation", "label_required"));
  const clean = label.normalize("NFC").replace(/\s+/g, " ").trim();
  if (clean === "") return err(appError("validation", "label_required"));
  if (clean.length > LABEL_MAX_LENGTH) return err(appError("validation", "label_too_long"));
  const outcome = insertRecipeLabel(db, id, clean, normalizeSearch(clean), LABELS_MAX);
  if (outcome === "missing") return err(appError("not_found"));
  if (outcome === "limit") return err(appError("validation", "limit"));
  return ok({ labels: listRecipeLabels(db, id) });
}

/** Tar en merkelapp av en oppskrift (Story 6.7). Svarer med de som er igjen. */
export function removeRecipeLabel(
  id: number,
  label: unknown,
  db: Db = getDb(),
): Result<{ labels: string[] }> {
  if (!isRecipeId(id) || typeof label !== "string") return err(appError("not_found"));
  deleteRecipeLabel(db, id, normalizeSearch(label));
  return ok({ labels: listRecipeLabels(db, id) });
}
