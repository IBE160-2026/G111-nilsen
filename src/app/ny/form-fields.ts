/** Feltene i skjemaet «Legg inn selv», i den rekkefølgen de vises. */
export const MANUAL_RECIPE_FIELDS = ["title", "servings", "ingredients", "steps"] as const;
export type ManualRecipeField = (typeof MANUAL_RECIPE_FIELDS)[number];

export type ManualRecipeValues = Record<ManualRecipeField, string>;
export type ManualRecipeFieldErrors = Partial<Record<ManualRecipeField, string>>;
