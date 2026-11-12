import "server-only";
import { and, eq, gt, isNotNull, isNull, lt } from "drizzle-orm";
import type { Db } from "../client";
import { folders, pantryItems, recipes, sessions, users } from "../schema";

export type UserRow = { id: number; email: string; passwordHash: string };
export type User = { id: number; email: string };

export function findUserByEmail(db: Db, email: string): UserRow | null {
  return (
    db
      .select({ id: users.id, email: users.email, passwordHash: users.passwordHash })
      .from(users)
      .where(eq(users.email, email))
      .get() ?? null
  );
}

/**
 * Oppretter brukeren i én transaksjon. Er det den første kontoen, overtar den alt som fantes fra
 * før uten eier: lagrede oppskrifter, mapper og «Har hjemme» (Story 5.13). Ulagrede importer
 * forblir uten eier. Returnerer `null` når e-posten allerede er i bruk.
 */
export function insertUser(
  db: Db,
  user: { email: string; passwordHash: string; createdAt: string },
): User | null {
  return db.transaction(
    (tx) => {
      if (tx.select({ id: users.id }).from(users).where(eq(users.email, user.email)).get()) {
        return null;
      }
      const first = tx.select({ id: users.id }).from(users).limit(1).get() === undefined;
      const { id } = tx.insert(users).values(user).returning({ id: users.id }).get();
      if (first) {
        tx.update(recipes)
          .set({ userId: id })
          .where(and(isNull(recipes.userId), isNotNull(recipes.savedAt)))
          .run();
        tx.update(folders).set({ userId: id }).where(isNull(folders.userId)).run();
        tx.update(pantryItems).set({ userId: id }).where(isNull(pantryItems.userId)).run();
      }
      return { id, email: user.email };
    },
    { behavior: "immediate" },
  );
}

export function insertSession(
  db: Db,
  session: { tokenHash: string; userId: number; expiresAt: string; createdAt: string },
): void {
  db.insert(sessions).values(session).run();
}

/** Brukeren for en gyldig (ikke utløpt) økt, eller `null`. */
export function findSessionUser(db: Db, tokenHash: string, now: string): User | null {
  return (
    db
      .select({ id: users.id, email: users.email })
      .from(sessions)
      .innerJoin(users, eq(sessions.userId, users.id))
      .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
      .get() ?? null
  );
}

export function deleteSession(db: Db, tokenHash: string): void {
  db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run();
}

/** Rydder bort utløpte økter. Returnerer antall slettede. */
export function deleteExpiredSessions(db: Db, now: string): number {
  return db.delete(sessions).where(lt(sessions.expiresAt, now)).run().changes;
}

/** Brukeren med denne id-en, eller `null` (Story 6.19). */
export function findUserById(db: Db, id: number): User | null {
  return (
    db.select({ id: users.id, email: users.email }).from(users).where(eq(users.id, id)).get() ??
    null
  );
}
