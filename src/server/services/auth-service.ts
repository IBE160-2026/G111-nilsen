import "server-only";
import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { ACCOUNT_LIMITS, isValidEmail, normalizeEmail } from "@/lib/account-input";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import {
  deleteExpiredSessions,
  deleteSession,
  findSessionUser,
  findUserByEmail,
  insertSession,
  insertUser,
  type User,
} from "../db/repositories/user-repository";

export type { User };

/** Hvor lenge en innlogging varer. */
export const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

/** Feilkoder i `detail` (`validation`). */
export const ACCOUNT_ERRORS = [
  "email_invalid",
  "email_taken",
  "password_too_short",
  "password_too_long",
  "wrong_credentials",
] as const;

const SCRYPT_KEY_LENGTH = 64;

/** Hasher passordet med scrypt og et tilfeldig salt: `scrypt$<salt>$<hash>` (base64url). */
export function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(password.normalize("NFC"), salt, SCRYPT_KEY_LENGTH);
  return `scrypt$${salt.toString("base64url")}$${hash.toString("base64url")}`;
}

/** Sjekker passordet mot en lagret hash i konstant tid. Ugyldig format gir `false`. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, saltText, hashText] = stored.split("$");
  if (scheme !== "scrypt" || !saltText || !hashText) return false;
  const expected = Buffer.from(hashText, "base64url");
  if (expected.length !== SCRYPT_KEY_LENGTH) return false;
  const actual = scryptSync(
    password.normalize("NFC"),
    Buffer.from(saltText, "base64url"),
    SCRYPT_KEY_LENGTH,
  );
  return timingSafeEqual(actual, expected);
}

/** SHA-256 av tokenet: det som lagres i databasen. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("base64url");
}

// Brukes når e-posten ikke finnes, så innlogging tar like lang tid uansett.
const DUMMY_HASH = hashPassword("ikke-et-ekte-passord");

function newSession(db: Db, userId: number, now: Date): { token: string; expiresAt: Date } {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_MAX_AGE_MS);
  insertSession(db, {
    tokenHash: hashToken(token),
    userId,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
  });
  return { token, expiresAt };
}

export type SignedIn = { user: User; token: string; expiresAt: Date };

/**
 * Lager en konto og logger inn (Story 5.13). Ugyldig e-post, brukt e-post og passord under 8 eller
 * over 200 tegn gir `validation` med årsak i `detail`. Den første kontoen overtar det som fantes fra
 * før (se `insertUser`).
 */
export function register(
  email: string,
  password: string,
  db: Db = getDb(),
  now: () => Date = () => new Date(),
): Result<SignedIn> {
  const clean = normalizeEmail(typeof email === "string" ? email : "");
  if (!isValidEmail(clean)) return err(appError("validation", "email_invalid"));
  if (typeof password !== "string" || password.length < ACCOUNT_LIMITS.passwordMinLength) {
    return err(appError("validation", "password_too_short"));
  }
  if (password.length > ACCOUNT_LIMITS.passwordMaxLength) {
    return err(appError("validation", "password_too_long"));
  }
  const time = now();
  const user = insertUser(db, {
    email: clean,
    passwordHash: hashPassword(password),
    createdAt: time.toISOString(),
  });
  if (!user) return err(appError("validation", "email_taken"));
  return ok({ user, ...newSession(db, user.id, time) });
}

/**
 * Logger inn med e-post og passord. Feil e-post og feil passord gir samme svar
 * (`wrong_credentials`), så man ikke kan finne ut hvilke e-poster som har konto.
 */
export function logIn(
  email: string,
  password: string,
  db: Db = getDb(),
  now: () => Date = () => new Date(),
): Result<SignedIn> {
  const clean = normalizeEmail(typeof email === "string" ? email : "");
  const pass = typeof password === "string" ? password : "";
  const row = findUserByEmail(db, clean);
  const matches = verifyPassword(
    pass.slice(0, ACCOUNT_LIMITS.passwordMaxLength),
    row?.passwordHash ?? DUMMY_HASH,
  );
  if (!row || !matches) return err(appError("validation", "wrong_credentials"));
  const time = now();
  deleteExpiredSessions(db, time.toISOString());
  return ok({ user: { id: row.id, email: row.email }, ...newSession(db, row.id, time) });
}

/** Brukeren for tokenet i cookien, eller `null` når det mangler, er ukjent eller er utløpt. */
export function userForToken(
  token: string | undefined,
  db: Db = getDb(),
  now: () => Date = () => new Date(),
): User | null {
  if (!token) return null;
  return findSessionUser(db, hashToken(token), now().toISOString());
}

/** Avslutter økten (logg ut). Ukjent token gjør ingenting. */
export function logOut(token: string | undefined, db: Db = getDb()): void {
  if (token) deleteSession(db, hashToken(token));
}
