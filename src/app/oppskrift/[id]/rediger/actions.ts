"use server";

import { redirect } from "next/navigation";
import type { ManualRecipeFormState } from "@/app/ny/actions";
import { formStateForError, formStateForUnexpectedError } from "@/app/ny/form-errors";
import { validateManualRecipe, valuesFromFormData } from "@/app/ny/manual-recipe-schema";
import { updateManualRecipe } from "@/server/services/recipe-service";

/**
 * Server Action for «Rediger» (Story 3.5). Binds til oppskriftens id på siden
 * (`saveRecipeEdits.bind(null, id)`). Validerer med samme zod-skjema som «Legg inn selv»,
 * og tjenesten sjekker at oppskriften finnes. Ved feil lagres ingenting, og skrevne
 * verdier sendes tilbake slik at skjemaet beholder dem.
 */
export async function saveRecipeEdits(
  id: number,
  _previous: ManualRecipeFormState,
  formData: FormData,
): Promise<ManualRecipeFormState> {
  const values = valuesFromFormData(formData);
  const validated = validateManualRecipe(values);
  if (!validated.ok) return { fieldErrors: validated.fieldErrors, values };

  try {
    const result = updateManualRecipe(id, {
      title: validated.data.title,
      servings: validated.data.servings,
      ingredients: validated.data.ingredients,
      steps: validated.data.steps,
    });
    if (!result.ok) return formStateForError(result.error, values);
  } catch (error) {
    console.error("Kunne ikke lagre endringene", error);
    return formStateForUnexpectedError(values);
  }

  // redirect() kaster et kontrollflytunntak og må ligge utenfor try/catch.
  redirect(`/oppskrift/${id}`);
}
