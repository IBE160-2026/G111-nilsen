import { z } from "zod";
import { manualRecipeFieldMessages as m } from "@/lib/messages";

import type { ManualRecipeField, ManualRecipeFieldErrors, ManualRecipeValues } from "./form-fields";

export const LIMITS = {
  titleLength: 200,
  servingsMin: 1,
  servingsMax: 50,
  linesPerField: 100,
  ingredientLineLength: 300,
  stepLength: 2000,
} as const;

/** Deler tekst i linjer, trimmer hver linje og fjerner tomme. Rekkefølgen beholdes. */
export function splitLines(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}

const lines = (maxLines: string, lineTooLong: string, maxLength: number) =>
  z
    .string()
    .transform(splitLines)
    .pipe(
      z
        .array(z.string().max(maxLength, { error: lineTooLong }))
        .max(LIMITS.linesPerField, { error: maxLines }),
    );

export const manualRecipeSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, { error: m.titleRequired })
    .max(LIMITS.titleLength, { error: m.titleTooLong }),
  servings: z
    .string()
    .trim()
    .regex(/^\d{1,3}$/, { error: m.servingsInvalid })
    .transform(Number)
    .pipe(
      z
        .number()
        .int()
        .min(LIMITS.servingsMin, { error: m.servingsInvalid })
        .max(LIMITS.servingsMax, { error: m.servingsInvalid }),
    ),
  ingredients: lines(
    m.ingredientsTooMany,
    m.ingredientLineTooLong,
    LIMITS.ingredientLineLength,
  ).pipe(z.array(z.string()).min(1, { error: m.ingredientsRequired })),
  steps: lines(m.stepsTooMany, m.stepTooLong, LIMITS.stepLength),
});

export type ManualRecipeData = z.output<typeof manualRecipeSchema>;

export type ValidationResult =
  { ok: true; data: ManualRecipeData } | { ok: false; fieldErrors: ManualRecipeFieldErrors };

/** Henter skjemaverdiene som tekst; manglende eller ikke-tekstlige felt blir "". */
export function valuesFromFormData(formData: FormData): ManualRecipeValues {
  const get = (name: ManualRecipeField) => {
    const value = formData.get(name);
    return typeof value === "string" ? value : "";
  };
  return {
    title: get("title"),
    servings: get("servings"),
    ingredients: get("ingredients"),
    steps: get("steps"),
  };
}

/** Validerer skjemaverdiene. Ved feil gis første melding per felt. */
export function validateManualRecipe(values: ManualRecipeValues): ValidationResult {
  const parsed = manualRecipeSchema.safeParse(values);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: ManualRecipeFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as ManualRecipeField;
    fieldErrors[field] ??= issue.message;
  }
  return { ok: false, fieldErrors };
}
