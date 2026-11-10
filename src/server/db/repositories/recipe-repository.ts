import "server-only";
import { and, asc, desc, eq, isNotNull, isNull, lt, sql, type SQL } from "drizzle-orm";
import type {
  Quantity,
  Recipe,
  RecipeLine,
  RecipeSummary,
  Step,
  SuggestionTarget,
  UnitKey,
} from "@/domain";
import type { Db } from "../client";
import { folders, ingredientLines, recipes, steps, suggestions } from "../schema";

/** En ingredienslinje klar til lagring (tolket, ikke skalert). */
export type NewIngredientLine = Omit<RecipeLine, "id">;
export type NewStep = Omit<Step, "id">;

export type NewRecipe = {
  title: string;
  sourceUrl: string | null;
  sourceName: string | null;
  originalServings: number | null;
  selectedServings: number | null;
  savedAt: string | null;
  createdAt: string;
  updatedAt: string;
  ingredients: NewIngredientLine[];
  steps: NewStep[];
};

type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Skriver oppskrift, linjer og steg med en åpen transaksjon (eller tilkobling) og returnerer id. */
function insertRecipeRows(tx: Tx, recipe: NewRecipe): number {
  const { id } = tx
    .insert(recipes)
    .values({
      title: recipe.title,
      sourceUrl: recipe.sourceUrl,
      sourceName: recipe.sourceName,
      originalServings: recipe.originalServings,
      selectedServings: recipe.selectedServings,
      savedAt: recipe.savedAt,
      createdAt: recipe.createdAt,
      updatedAt: recipe.updatedAt,
    })
    .returning({ id: recipes.id })
    .get();

  if (recipe.ingredients.length > 0) {
    tx.insert(ingredientLines)
      .values(
        recipe.ingredients.map((line) => ({
          recipeId: id,
          position: line.position,
          section: line.section,
          originalText: line.original,
          quantityMin: line.quantity?.min ?? null,
          quantityMax: line.quantity?.max ?? null,
          unit: line.unit,
          name: line.name,
          parseable: line.parseable,
        })),
      )
      .run();
  }

  if (recipe.steps.length > 0) {
    tx.insert(steps)
      .values(
        recipe.steps.map((step) => ({
          recipeId: id,
          position: step.position,
          section: step.section,
          text: step.text,
        })),
      )
      .run();
  }

  return id;
}

/** Lagrer oppskrift, ingredienslinjer og steg i én transaksjon og returnerer ny id. */
export function insertRecipe(db: Db, recipe: NewRecipe): number {
  return db.transaction((tx) => insertRecipeRows(tx, recipe));
}

/** En eksisterende oppskrift med en gitt kilde-adresse: id og om den er i samlingen. */
export type ExistingSource = { id: number; saved: boolean };

/**
 * Finner oppskriften med nøyaktig denne `source_url` (allerede normalisert). En lagret oppskrift
 * (`savedAt` satt) går foran en ulagret; blant like går den eldste (lavest id) først.
 */
export function findRecipeBySourceUrl(db: Db | Tx, sourceUrl: string): ExistingSource | null {
  const row = db
    .select({ id: recipes.id, savedAt: recipes.savedAt })
    .from(recipes)
    .where(eq(recipes.sourceUrl, sourceUrl))
    .orderBy(sql`${recipes.savedAt} IS NULL`, asc(recipes.id))
    .limit(1)
    .get();
  return row ? { id: row.id, saved: row.savedAt !== null } : null;
}

/**
 * Setter `createdAt` til `now` for en ulagret import som brukeren åpner på nytt, så den ikke
 * ryddes bort av døgnrenholdet rett etterpå. Lagrede oppskrifter røres ikke.
 */
export function refreshUnsavedRecipe(db: Db | Tx, id: number, now: string): void {
  db.update(recipes)
    .set({ createdAt: now })
    .where(and(eq(recipes.id, id), isNull(recipes.savedAt)))
    .run();
}

/** Utfallet av `insertImportedRecipe`. */
export type ImportedInsert =
  | { kind: "inserted"; id: number }
  | { kind: "existing"; id: number }
  | { kind: "duplicate"; id: number };

/**
 * Sjekker og skriver i én transaksjon (`BEGIN IMMEDIATE`), så to samtidige importer av samme
 * adresse ikke gir to rader: finnes det allerede en lagret oppskrift med `sourceUrl`, skrives
 * ingenting (`duplicate`); finnes en ulagret, gjenbrukes den (`existing`); ellers settes den inn.
 * Feiler noe, rulles alt tilbake og feilen kastes videre.
 */
export function insertImportedRecipe(
  db: Db,
  recipe: NewRecipe & { sourceUrl: string },
): ImportedInsert {
  return db.transaction(
    (tx) => {
      const found = findRecipeBySourceUrl(tx, recipe.sourceUrl);
      if (found) return { kind: found.saved ? "duplicate" : "existing", id: found.id } as const;
      return { kind: "inserted", id: insertRecipeRows(tx, recipe) } as const;
    },
    { behavior: "immediate" },
  );
}

/** Feltene en redigering endrer. Kilde, mappe (`folderId`), `savedAt`, `createdAt` og `id` røres ikke. */
export type RecipeUpdate = {
  title: string;
  originalServings: number | null;
  updatedAt: string;
  ingredients: NewIngredientLine[];
  steps: NewStep[];
};

/**
 * Erstatter tittel, porsjonsantall, ingredienslinjer og steg i én transaksjon.
 * Endres `originalServings`, nullstilles `selectedServings`, siden et tidligere valgt
 * antall hører til den gamle oppskriften. Feiler noe, rulles alt tilbake.
 * Returnerer `false` når id-en ikke finnes (ingenting er endret).
 */
export function updateRecipe(db: Db, id: number, data: RecipeUpdate): boolean {
  return db.transaction(
    (tx) => {
      const current = tx
        .select({ originalServings: recipes.originalServings })
        .from(recipes)
        .where(eq(recipes.id, id))
        .get();
      if (!current) return false;

      tx.update(recipes)
        .set({
          title: data.title,
          originalServings: data.originalServings,
          updatedAt: data.updatedAt,
          ...(current.originalServings !== data.originalServings ? { selectedServings: null } : {}),
        })
        .where(eq(recipes.id, id))
        .run();

      tx.delete(ingredientLines).where(eq(ingredientLines.recipeId, id)).run();
      tx.delete(steps).where(eq(steps.recipeId, id)).run();

      if (data.ingredients.length > 0) {
        tx.insert(ingredientLines)
          .values(
            data.ingredients.map((line) => ({
              recipeId: id,
              position: line.position,
              section: line.section,
              originalText: line.original,
              quantityMin: line.quantity?.min ?? null,
              quantityMax: line.quantity?.max ?? null,
              unit: line.unit,
              name: line.name,
              parseable: line.parseable,
            })),
          )
          .run();
      }

      if (data.steps.length > 0) {
        tx.insert(steps)
          .values(
            data.steps.map((step) => ({
              recipeId: id,
              position: step.position,
              section: step.section,
              text: step.text,
            })),
          )
          .run();
      }

      return true;
      // BEGIN IMMEDIATE tar skrivelåsen med en gang, så lesingen først ikke gir SQLITE_BUSY ved oppgradering.
    },
    { behavior: "immediate" },
  );
}

function toQuantity(min: number | null, max: number | null): Quantity | null {
  if (min === null) return null;
  return max === null ? { min } : { min, max };
}

/** Henter en oppskrift med linjer og steg sortert på `position`, og valgte forslag (eldste først), eller `null`. */
export function findRecipeById(db: Db, id: number): Recipe | null {
  const row = db.select().from(recipes).where(eq(recipes.id, id)).get();
  if (!row) return null;

  const lines = db
    .select()
    .from(ingredientLines)
    .where(eq(ingredientLines.recipeId, id))
    .orderBy(asc(ingredientLines.position), asc(ingredientLines.id))
    .all();

  const stepRows = db
    .select()
    .from(steps)
    .where(eq(steps.recipeId, id))
    .orderBy(asc(steps.position), asc(steps.id))
    .all();

  const suggestionRows = db
    .select()
    .from(suggestions)
    .where(eq(suggestions.recipeId, id))
    .orderBy(asc(suggestions.id))
    .all();

  return {
    id: row.id,
    title: row.title,
    sourceUrl: row.sourceUrl,
    sourceName: row.sourceName,
    originalServings: row.originalServings,
    selectedServings: row.selectedServings,
    savedAt: row.savedAt,
    folderId: row.folderId,
    isFavorite: row.isFavorite,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    ingredients: lines.map((line) => ({
      id: line.id,
      position: line.position,
      section: line.section,
      original: line.originalText,
      quantity: toQuantity(line.quantityMin, line.quantityMax),
      unit: line.unit as UnitKey | null,
      name: line.name,
      parseable: line.parseable,
    })),
    steps: stepRows.map((step) => ({
      id: step.id,
      position: step.position,
      section: step.section,
      text: step.text,
    })),
    suggestions: suggestionRows.map((suggestion) => ({
      id: suggestion.id,
      text: suggestion.text,
      reason: suggestion.reason,
      appliesTo: suggestion.appliesTo as SuggestionTarget,
    })),
  };
}

/** Oppsummeringene for lagrede oppskrifter som oppfyller `extra`, sist lagret først, så høyest id. */
function selectSavedSummaries(db: Db, extra?: SQL): RecipeSummary[] {
  const saved = isNotNull(recipes.savedAt);
  return db
    .select({
      id: recipes.id,
      title: recipes.title,
      sourceName: recipes.sourceName,
      sourceUrl: recipes.sourceUrl,
      savedAt: recipes.savedAt,
      isFavorite: recipes.isFavorite,
      folderName: folders.name,
    })
    .from(recipes)
    .leftJoin(folders, eq(recipes.folderId, folders.id))
    .where(extra === undefined ? saved : and(saved, extra))
    .orderBy(desc(recipes.savedAt), desc(recipes.id))
    .all()
    .flatMap((row) => (row.savedAt === null ? [] : [{ ...row, savedAt: row.savedAt }]));
}

/**
 * Oppskriftene i samlingen (`savedAt` satt), sist lagret først og deretter høyest id først.
 * Med `folderId` bare oppskriftene i den mappen. `folderName` er mappen oppskriften ligger i.
 * Leser bare oppsummeringen; ingredienser og steg hentes ikke.
 */
export function listSavedRecipes(db: Db, folderId?: number): RecipeSummary[] {
  return selectSavedSummaries(
    db,
    folderId === undefined ? undefined : eq(recipes.folderId, folderId),
  );
}

/**
 * Ingrediensnavn for alle lagrede oppskrifter i én spørring (Story 5.2), nøklet på oppskrifts-id.
 * Brukes til søk i Samlingen; rekkefølgen følger linjene.
 */
export function listSavedIngredientNames(db: Db): Map<number, string[]> {
  const rows = db
    .select({ recipeId: ingredientLines.recipeId, name: ingredientLines.name })
    .from(ingredientLines)
    .innerJoin(recipes, eq(ingredientLines.recipeId, recipes.id))
    .where(isNotNull(recipes.savedAt))
    .orderBy(asc(ingredientLines.recipeId), asc(ingredientLines.position), asc(ingredientLines.id))
    .all();
  const names = new Map<number, string[]>();
  for (const row of rows) {
    const list = names.get(row.recipeId);
    if (list) list.push(row.name);
    else names.set(row.recipeId, [row.name]);
  }
  return names;
}

/**
 * Lagrede favoritter (Story 3.4) i samme rekkefølge som samlingen: sist lagret først.
 * Det finnes ingen «sist åpnet» ennå.
 */
export function listFavoriteRecipes(db: Db): RecipeSummary[] {
  return selectSavedSummaries(db, eq(recipes.isFavorite, true));
}

/**
 * Markerer eller avmarkerer en lagret oppskrift som favoritt (Story 3.4). Returnerer `false`
 * når id-en ikke finnes eller oppskriften ikke er lagret, ellers `true`, også når verdien
 * ikke endres (idempotent). `updatedAt` røres aldri: avkrysning og valgt antall er nøklet
 * på den. Mappe, `savedAt` og innhold røres ikke.
 */
export function setRecipeFavorite(db: Db, id: number, isFavorite: boolean): boolean {
  return (
    db
      .update(recipes)
      .set({ isFavorite })
      .where(and(eq(recipes.id, id), isNotNull(recipes.savedAt)))
      .run().changes > 0
  );
}

/**
 * Legger en oppskrift i samlingen: setter `savedAt` bare når den er `null`, så en allerede
 * lagret oppskrift beholder tidspunktet (og plassen i Samlingen). `updatedAt` røres ikke.
 * Returnerer `false` når id-en ikke finnes.
 */
export function markRecipeSaved(db: Db, id: number, savedAt: string): boolean {
  const { changes } = db
    .update(recipes)
    .set({ savedAt })
    .where(and(eq(recipes.id, id), isNull(recipes.savedAt)))
    .run();
  if (changes > 0) return true;
  return db.select({ id: recipes.id }).from(recipes).where(eq(recipes.id, id)).get() !== undefined;
}

/**
 * Sletter oppskriften. `ingredient_lines` og `steps` følger med via `ON DELETE CASCADE`
 * (fremmednøkler er slått på i `openDatabase`). Returnerer `false` når id-en ikke finnes.
 */
export function deleteRecipeById(db: Db, id: number): boolean {
  return db.delete(recipes).where(eq(recipes.id, id)).run().changes > 0;
}

/**
 * Lagrer valgt antall personer, bare for en lagret oppskrift (`savedAt` satt). `updatedAt`
 * røres ikke: avkrysning på siden er nøklet på `updatedAt`, og en endring ville nullstilt
 * den. Returnerer `false` når id-en ikke finnes eller oppskriften ikke er lagret.
 */
export function updateSelectedServings(db: Db, id: number, servings: number): boolean {
  return (
    db
      .update(recipes)
      .set({ selectedServings: servings })
      .where(and(eq(recipes.id, id), isNotNull(recipes.savedAt)))
      .run().changes > 0
  );
}

/**
 * Lagrer antallet oppskriften er skrevet for (Story 2.4), for lagret og ulagret oppskrift. Valgt
 * antall nullstilles, siden det hørte til det gamle antallet. `updatedAt` røres ikke (se
 * `updateSelectedServings`). Returnerer `false` når id-en ikke finnes.
 */
export function updateOriginalServings(db: Db, id: number, servings: number): boolean {
  return (
    db
      .update(recipes)
      .set({ originalServings: servings, selectedServings: null })
      .where(eq(recipes.id, id))
      .run().changes > 0
  );
}

/**
 * Sletter oppskrifter som aldri ble lagret i samlingen (`savedAt` er `null`) og ble laget
 * før `cutoff` (ISO-tekst). Linjer og steg følger med. Returnerer antall slettede oppskrifter.
 */
export function deleteStaleUnsavedRecipes(db: Db, cutoff: string): number {
  return db
    .delete(recipes)
    .where(and(isNull(recipes.savedAt), lt(recipes.createdAt, cutoff)))
    .run().changes;
}
