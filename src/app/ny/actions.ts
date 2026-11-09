"use server";

import { redirect } from "next/navigation";
import { createManualRecipe } from "@/server/services/recipe-service";
import type { ManualRecipeFieldErrors, ManualRecipeValues } from "./form-fields";
import { formStateForError, formStateForUnexpectedError } from "./form-errors";
import { validateManualRecipe, valuesFromFormData } from "./manual-recipe-schema";

export type ManualRecipeFormState = {
  fieldErrors: ManualRecipeFieldErrors;
  values: ManualRecipeValues;
  /** Melding når lagringen feilet av en annen grunn enn feil i feltene. */
  formError?: string;
};

/**
 * Server Action for «Legg inn selv» (AD-3). Validerer med zod, lagrer via
 * recipe-service og sender brukeren til oppskriften. Ved feil lagres ingenting,
 * og skrevne verdier sendes tilbake slik at skjemaet beholder dem.
 */
export async function saveManualRecipe(
  _previous: ManualRecipeFormState,
  formData: FormData,
): Promise<ManualRecipeFormState> {
  const values = valuesFromFormData(formData);
  const validated = validateManualRecipe(values);
  if (!validated.ok) return { fieldErrors: validated.fieldErrors, values };

  let id: number;
  try {
    const result = createManualRecipe({
      title: validated.data.title,
      servings: validated.data.servings,
      ingredients: validated.data.ingredients,
      steps: validated.data.steps,
    });
    if (!result.ok) return formStateForError(result.error, values);
    id = result.value.id;
  } catch (error) {
    console.error("Kunne ikke lagre oppskriften", error);
    return formStateForUnexpectedError(values);
  }

  // redirect() kaster et kontrollflytunntak og må ligge utenfor try/catch.
  redirect(`/oppskrift/${id}`);
}
