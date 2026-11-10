"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { AccountFormState } from "@/app/_shared/account-form";
import { safeNextPath } from "@/lib/account-input";
import { accountMessages as m, fallbackMessage } from "@/lib/messages";
import type { AppError } from "@/lib/result";
import { logIn as logInUser, register as registerUser } from "@/server/services/auth-service";
import { endSession, startSession } from "@/server/session";

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Gjør en feil fra kontotjenesten om til skjematilstand: under riktig felt, eller for skjemaet. */
function stateFor(error: AppError, email: string): AccountFormState {
  const detail = error.detail;
  if (error.kind === "validation" && detail) {
    if (detail === "email_invalid" || detail === "email_taken") {
      return { email, emailError: m.fieldErrors[detail] };
    }
    if (detail === "password_too_short" || detail === "password_too_long") {
      return { email, passwordError: m.fieldErrors[detail] };
    }
    if (detail === "wrong_credentials") return { email, formError: m.fieldErrors[detail] };
  }
  return { email, formError: `${fallbackMessage.title} ${fallbackMessage.body}` };
}

/**
 * Lager en konto og logger inn (Story 5.13). Ved feil blir brukeren på siden med meldingen under
 * feltet; e-posten beholdes, passordet ikke. Ved suksess sendes brukeren til `neste` (bare stier i
 * appen) eller forsiden.
 */
export async function registerAccount(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const email = text(formData, "email");
  try {
    const result = registerUser(email, text(formData, "password"));
    if (!result.ok) return stateFor(result.error, email);
    await startSession(result.value);
  } catch (error) {
    console.error("Kunne ikke lage kontoen", error);
    return { email, formError: `${fallbackMessage.title} ${fallbackMessage.body}` };
  }
  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("neste")));
}

/** Logger inn (Story 5.13). Feil e-post eller passord gir én felles melding. */
export async function logInAccount(
  _previous: AccountFormState,
  formData: FormData,
): Promise<AccountFormState> {
  const email = text(formData, "email");
  try {
    const result = logInUser(email, text(formData, "password"));
    if (!result.ok) return stateFor(result.error, email);
    await startSession(result.value);
  } catch (error) {
    console.error("Kunne ikke logge inn", error);
    return { email, formError: `${fallbackMessage.title} ${fallbackMessage.body}` };
  }
  revalidatePath("/", "layout");
  redirect(safeNextPath(formData.get("neste")));
}

/** Logger ut og sender brukeren til forsiden. */
export async function logOutAccount(): Promise<void> {
  try {
    await endSession();
  } catch (error) {
    console.error("Kunne ikke logge ut", error);
  }
  revalidatePath("/", "layout");
  redirect("/");
}
