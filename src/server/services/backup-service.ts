import "server-only";
import { z } from "zod";
import { MAX_RECIPE_MINUTES, parseLine } from "@/domain";
import {
  cleanFolderName,
  folderNameKey,
  FOLDER_NAME_MAX_LENGTH,
  folderNameLength,
} from "@/lib/folder-name";
import { LIMITS } from "@/lib/recipe-input";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  insertBackupItems,
  readRecipesForExport,
  type ExportedRecipe,
  type ImportItem,
} from "../db/repositories/backup-repository";
import {
  FITS_FOR_MAX_LENGTH,
  LABEL_MAX_LENGTH,
  LABELS_MAX,
  NOTES_MAX_LENGTH,
} from "./recipe-service";

/**
 * Sikkerhetskopi (Story 6.15): eksport av alle lagrede oppskrifter til en JSON-fil, og import av
 * en slik fil. Formatet har ingen id-er; mappe og merkelapper går på navn. Ingrediensene tolkes
 * på nytt ved import, så mengder og enheter alltid følger dagens regler.
 */

export const BACKUP_FORMAT = "recipemate-backup";
export const BACKUP_VERSION = 1;
/** Største antall oppskrifter i én fil, og største filstørrelse i byte. */
export const BACKUP_MAX_RECIPES = 1000;
export const BACKUP_MAX_BYTES = 5 * 1024 * 1024;

const text = (max: number) => z.string().max(max);
const section = z.string().max(LIMITS.titleLength).nullable();

const recipeSchema = z.object({
  title: z.string().trim().min(1).max(LIMITS.titleLength),
  sourceUrl: text(2048).nullable(),
  sourceName: text(200).nullable(),
  originalServings: z.number().int().min(LIMITS.servingsMin).max(LIMITS.servingsMax).nullable(),
  totalMinutes: z.number().int().min(1).max(MAX_RECIPE_MINUTES).nullable(),
  isFavorite: z.boolean(),
  notes: text(NOTES_MAX_LENGTH).nullable(),
  fitsFor: text(FITS_FOR_MAX_LENGTH).nullable(),
  rating: z.number().int().min(1).max(5).nullable(),
  cookedCount: z.number().int().min(0).max(1_000_000),
  lastCookedAt: text(40).nullable(),
  folder: text(200).nullable(),
  labels: z.array(z.string().trim().min(1).max(LABEL_MAX_LENGTH)).max(LABELS_MAX),
  ingredients: z
    .array(z.object({ section, text: z.string().trim().min(1).max(LIMITS.ingredientLineLength) }))
    .min(1)
    .max(LIMITS.linesPerField),
  steps: z
    .array(z.object({ section, text: z.string().trim().min(1).max(LIMITS.stepLength) }))
    .max(LIMITS.linesPerField),
});

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.literal(BACKUP_VERSION),
  exportedAt: z.string().optional(),
  recipes: z.array(recipeSchema).max(BACKUP_MAX_RECIPES),
});

export type BackupFile = {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  recipes: ExportedRecipe[];
};

/** Brukerens lagrede oppskrifter som en sikkerhetskopi. */
export function exportBackup(
  userId: number,
  db: Db = getDb(),
  now: Date = new Date(),
): Result<BackupFile> {
  return ok({
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: now.toISOString(),
    recipes: readRecipesForExport(db, userId),
  });
}

/**
 * Importerer en sikkerhetskopi (allerede lest som JSON). Ugyldig innhold gir `validation`
 * (`backup_invalid`) og ingenting lagres. Oppskrifter brukeren allerede har (samme tittel og kilde)
 * hoppes over. Svarer med antall satt inn og hoppet over.
 */
export function importBackup(
  userId: number,
  input: unknown,
  db: Db = getDb(),
  now: Date = new Date(),
): Result<{ imported: number; skipped: number }> {
  const parsed = backupSchema.safeParse(input);
  if (!parsed.success) return err(appError("validation", "backup_invalid"));

  const stamp = now.toISOString();
  const items: ImportItem[] = [];
  for (const recipe of parsed.data.recipes) {
    const folderName = recipe.folder === null ? "" : cleanFolderName(recipe.folder);
    if (folderNameLength(folderName) > FOLDER_NAME_MAX_LENGTH)
      return err(appError("validation", "backup_invalid"));
    const seen = new Set<string>();
    const labels = recipe.labels
      .map((label) => label.normalize("NFC").replace(/\s+/g, " ").trim())
      .map((label) => ({ label, labelKey: label.toLocaleLowerCase("nb") }))
      .filter((entry) => !seen.has(entry.labelKey) && seen.add(entry.labelKey));
    items.push({
      recipe: {
        title: recipe.title,
        sourceUrl: recipe.sourceUrl,
        sourceName: recipe.sourceName,
        originalServings: recipe.originalServings,
        selectedServings: null,
        savedAt: stamp,
        createdAt: stamp,
        updatedAt: stamp,
        totalMinutes: recipe.totalMinutes,
        ingredients: recipe.ingredients.map((line, position) => {
          const parsedLine = parseLine(line.text);
          return {
            position,
            section: line.section,
            original: parsedLine.original,
            quantity: parsedLine.quantity,
            unit: parsedLine.unit,
            name: parsedLine.name,
            parseable: parsedLine.parseable,
          };
        }),
        steps: recipe.steps.map((step, position) => ({
          position,
          section: step.section,
          text: step.text,
        })),
      },
      isFavorite: recipe.isFavorite,
      notes: recipe.notes,
      fitsFor: recipe.fitsFor,
      rating: recipe.rating,
      cookedCount: recipe.cookedCount,
      lastCookedAt: recipe.lastCookedAt,
      folder: folderName === "" ? null : { name: folderName, nameKey: folderNameKey(folderName) },
      labels,
    });
  }
  return ok(insertBackupItems(db, userId, items, stamp));
}
