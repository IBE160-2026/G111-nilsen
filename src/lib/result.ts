/**
 * Feil som verdier (AD-7). Tjenester returnerer Result<T, AppError> i stedet for å kaste.
 * Norske brukermeldinger hentes fra src/lib/messages.ts basert på `kind`.
 */

/** Alle faste feiltyper. Hver har en norsk melding i `src/lib/messages.ts`. */
export const ERROR_KINDS = [
  "invalid_url",
  "fetch_failed",
  "no_recipe",
  "duplicate",
  "validation",
  "not_found",
  "suggestion_failed",
  /** Handlingen krever innlogging (Story 5.13). */
  "login_required",
  /** Uventet feil (for eksempel databasen). Brukeren får reservemeldingen. */
  "unknown",
] as const;

export type ErrorKind = (typeof ERROR_KINDS)[number];

export type AppError = {
  kind: ErrorKind;
  detail?: string;
};

export type Ok<T> = { ok: true; value: T };
export type Err<E> = { ok: false; error: E };
export type Result<T, E = AppError> = Ok<T> | Err<E>;

export function ok<T>(value: T): Ok<T> {
  return { ok: true, value };
}

export function err<E = AppError>(error: E): Err<E> {
  return { ok: false, error };
}

export function appError(kind: ErrorKind, detail?: string): AppError {
  return detail === undefined ? { kind } : { kind, detail };
}
