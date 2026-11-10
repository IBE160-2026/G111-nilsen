"use server";

import { redirect } from "next/navigation";
import { messageFor } from "@/lib/messages";
import { createManualRecipe } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import { formStateForError, formStateForUnexpectedError } from "@/app/_shared/form-errors";
import type { ManualRecipeFormState } from "@/app/_shared/form-fields";
import { validateManualRecipe, valuesFromFormData } from "@/app/_shared/manual-recipe-schema";

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
  const userId = await currentUserId();
  if (userId === null) {
    const message = messageFor("login_required");
    return { fieldErrors: {}, values, formError: `${message.title} ${message.body}` };
  }

  let id: number;
  try {
    const result = createManualRecipe(userId, {
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
