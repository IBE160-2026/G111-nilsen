"use server";

import { redirect } from "next/navigation";
import { manualRecipeFieldInvalid, messageFor } from "@/lib/messages";
import { createManualRecipe } from "@/server/services/recipe-service";
import type { ManualRecipeFieldErrors, ManualRecipeValues } from "./form-fields";
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
    if (!result.ok) {
      const field = result.error.detail;
      if (
        result.error.kind === "validation" &&
        field &&
        Object.hasOwn(manualRecipeFieldInvalid, field)
      ) {
        const key = field as keyof typeof manualRecipeFieldInvalid;
        return { fieldErrors: { [key]: manualRecipeFieldInvalid[key] }, values };
      }
      const message = messageFor(result.error.kind);
      return { fieldErrors: {}, values, formError: `${message.title} ${message.body}` };
    }
    id = result.value.id;
  } catch (error) {
    console.error("Kunne ikke lagre oppskriften", error);
    const message = messageFor(undefined);
    return { fieldErrors: {}, values, formError: `${message.title} ${message.body}` };
  }

  // redirect() kaster et kontrollflytunntak og må ligge utenfor try/catch.
  redirect(`/oppskrift/${id}`);
}
