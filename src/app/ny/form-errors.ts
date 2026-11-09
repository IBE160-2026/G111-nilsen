import { manualRecipeFieldInvalid, messageFor } from "@/lib/messages";
import type { AppError } from "@/lib/result";
import type { ManualRecipeFormState } from "./actions";
import type { ManualRecipeValues } from "./form-fields";

/**
 * Gjør en feil fra tjenesten om til skjematilstand: `validation` med kjent feltnavn
 * blir feilmelding under feltet, alt annet en melding for hele skjemaet. Skrevne
 * verdier sendes alltid tilbake. Felles for «Legg inn selv» og redigering.
 */
export function formStateForError(
  error: AppError,
  values: ManualRecipeValues,
): ManualRecipeFormState {
  const field = error.detail;
  if (error.kind === "validation" && field && Object.hasOwn(manualRecipeFieldInvalid, field)) {
    const key = field as keyof typeof manualRecipeFieldInvalid;
    return { fieldErrors: { [key]: manualRecipeFieldInvalid[key] }, values };
  }
  const message = messageFor(error.kind);
  return { fieldErrors: {}, values, formError: `${message.title} ${message.body}` };
}

/** Skjematilstand for en uventet feil (for eksempel databasen). */
export function formStateForUnexpectedError(values: ManualRecipeValues): ManualRecipeFormState {
  const message = messageFor(undefined);
  return { fieldErrors: {}, values, formError: `${message.title} ${message.body}` };
}
