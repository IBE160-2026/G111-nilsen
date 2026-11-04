/**
 * Feil som verdier (AD-7). Tjenester returnerer Result<T, AppError> i stedet for å kaste.
 * Norske brukermeldinger hentes fra src/lib/messages.ts basert på `kind`.
 */

export type ErrorKind =
  | "invalid_url"
  | "fetch_failed"
  | "no_recipe"
  | "duplicate"
  | "validation"
  | "not_found"
  | "suggestion_failed";

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
