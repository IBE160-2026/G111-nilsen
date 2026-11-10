import "server-only";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { logOut, userForToken, type SignedIn, type User } from "./services/auth-service";

/** Navnet på innloggingscookien. Verdien er et tilfeldig token; databasen har bare hashen. */
export const SESSION_COOKIE = "recipemate_session";

/**
 * Den innloggede brukeren for denne forespørselen, eller `null` (Story 5.13). Leser cookien, så
 * den gjør siden dynamisk; kall den inne i en Suspense-grense eller i en Server Action.
 */
export async function currentUser(): Promise<User | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  // Økten sjekkes mot klokka; `connection()` sier fra at dette bare skjer ved en ekte forespørsel,
  // aldri i en forhåndsrendring.
  await connection();
  return userForToken(token);
}

/** Id-en til den innloggede brukeren, eller `null`. */
export async function currentUserId(): Promise<number | null> {
  return (await currentUser())?.id ?? null;
}

/**
 * Setter innloggingscookien: httpOnly (JavaScript kan ikke lese den), SameSite=Lax (sendes ikke
 * med skjemaer fra andre sider) og Secure når siden er servert over https.
 */
export async function startSession(signedIn: SignedIn): Promise<void> {
  const secure = (await headers()).get("x-forwarded-proto") === "https";
  (await cookies()).set(SESSION_COOKIE, signedIn.token, {
    httpOnly: true,
    sameSite: "lax",
    secure,
    path: "/",
    expires: signedIn.expiresAt,
  });
}

/** Logger ut: sletter økten i databasen og cookien i nettleseren. */
export async function endSession(): Promise<void> {
  const store = await cookies();
  logOut(store.get(SESSION_COOKIE)?.value);
  store.delete(SESSION_COOKIE);
}
