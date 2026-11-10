/** Grenser for kontoer (Story 5.13). */
export const ACCOUNT_LIMITS = {
  emailMaxLength: 254,
  passwordMinLength: 8,
  passwordMaxLength: 200,
} as const;

/** Trimmer og gjør e-posten om til små bokstaver, så «Maja@Eksempel.no » og «maja@eksempel.no» er like. */
export function normalizeEmail(email: string): string {
  return email.normalize("NFC").trim().toLowerCase();
}

/** Enkel sjekk: noe@noe.noe, uten mellomrom, innenfor lengden. */
export function isValidEmail(email: string): boolean {
  return email.length <= ACCOUNT_LIMITS.emailMaxLength && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Hvor brukeren sendes etter innlogging. Bare stier i appen («/oppskrifter»), aldri en annen side
 * («//evil.no», «https://…»). Alt annet gir forsiden.
 */
export function safeNextPath(next: unknown): string {
  if (typeof next !== "string") return "/";
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  if (/[\r\n]/.test(next)) return "/";
  return next;
}
