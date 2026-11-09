import "server-only";
import { extractRecipeJsonLd, normalizeRecipe, parseLine, type ImportedRecipe } from "@/domain";
import { LIMITS } from "@/lib/recipe-input";
import { appError, err, ok, type AppError, type Result } from "@/lib/result";
import { normalizeSourceUrl, validateUrl } from "@/lib/source-url";
import { truncateText } from "@/lib/truncate-text";
import { getDb, type Db } from "../db/client";
import {
  findRecipeBySourceUrl,
  insertImportedRecipe,
  refreshUnsavedRecipe,
  type NewRecipe,
} from "../db/repositories/recipe-repository";
import type { RecipeSourceFetcher } from "../ports/recipe-source-fetcher";
import { getRecipeFetcher } from "../recipe-fetcher";

/** Avhengigheter som kan byttes ut i tester. Standard kommer fra konfigurasjonen. */
export type ImportDeps = {
  fetcher?: RecipeSourceFetcher;
  db?: Db;
  now?: () => Date;
};

/**
 * Bygger det som lagres fra den leste oppskriften (AD-2): ingredienslinjer tolket med
 * `parseLine` (original tekst beholdes), steg med seksjon. Tekstene avkortes til `LIMITS`
 * (avkortet tekst ender på «…»), og bare de første `linesPerField` ingrediensene og stegene
 * beholdes.
 */
export function buildImportedContent(imported: ImportedRecipe): {
  title: string;
  sourceName: string | null;
  ingredients: NewRecipe["ingredients"];
  steps: NewRecipe["steps"];
} {
  return {
    title: truncateText(imported.title, LIMITS.titleLength),
    sourceName:
      imported.sourceName === null ? null : truncateText(imported.sourceName, LIMITS.titleLength),
    ingredients: imported.ingredients.slice(0, LIMITS.linesPerField).map((line, position) => ({
      ...parseLine(truncateText(line.text, LIMITS.ingredientLineLength)),
      position,
      section: null,
    })),
    steps: imported.steps.slice(0, LIMITS.linesPerField).map((step, position) => ({
      text: truncateText(step.text, LIMITS.stepLength),
      position,
      section: step.section === null ? null : truncateText(step.section, LIMITS.titleLength),
    })),
  };
}

/**
 * Importerer en oppskrift fra en lenke (AD-4): `validateUrl` → `normalizeSourceUrl` →
 * duplikatsjekk → henting → `extractRecipeJsonLd` → `normalizeRecipe` → `parseLine` → lagring
 * som «ikke i samlingen» (`savedAt = null`).
 *
 * - Er adressen allerede lagret i samlingen, gir tjenesten `duplicate` (`detail` = id som tekst)
 *   uten å hente noe. Finnes en ulagret import med samme adresse, gjenbrukes den uten henting.
 * - Ingenting skrives før alle stegene har lyktet; skrivingen er én transaksjon som sjekker
 *   adressen på nytt, slik at to samtidige importer ikke gir to rader.
 * - `sourceUrl` er alltid den normaliserte adressen brukeren ga, aldri sluttadressen etter
 *   omdirigeringer. Databasefeil gir `unknown` (feilen logges), aldri et unntak.
 */
export async function importRecipe(
  rawUrl: string,
  deps: ImportDeps = {},
): Promise<Result<{ id: number }, AppError>> {
  const valid = validateUrl(rawUrl);
  if (!valid.ok) return valid;
  const sourceUrl = normalizeSourceUrl(valid.value);

  try {
    const db = deps.db ?? getDb();

    const now = (deps.now ?? (() => new Date()))().toISOString();
    const known = findRecipeBySourceUrl(db, sourceUrl);
    if (known) {
      if (known.saved) return err(appError("duplicate", String(known.id)));
      refreshUnsavedRecipe(db, known.id, now);
      return ok({ id: known.id });
    }

    const fetcher = deps.fetcher ?? getRecipeFetcher();
    const page = await fetcher.fetch(sourceUrl);
    if (!page.ok) return page;

    const node = extractRecipeJsonLd(page.value.html);
    if (!node.ok) return err(appError("no_recipe"));
    const imported = normalizeRecipe(node.value);
    if (!imported.ok) return err(appError("no_recipe"));

    const content = buildImportedContent(imported.value);
    const stored = insertImportedRecipe(db, {
      title: content.title,
      sourceUrl,
      sourceName: content.sourceName,
      originalServings: imported.value.servings,
      selectedServings: null,
      savedAt: null,
      createdAt: now,
      updatedAt: now,
      ingredients: content.ingredients,
      steps: content.steps,
    });
    return stored.kind === "duplicate"
      ? err(appError("duplicate", String(stored.id)))
      : ok({ id: stored.id });
  } catch (error) {
    console.error("Import feilet uventet", error);
    return err(appError("unknown"));
  }
}
