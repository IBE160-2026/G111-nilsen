import "server-only";
import { and, asc, eq } from "drizzle-orm";
import type { Db } from "../client";
import { shares, users } from "../schema";

/** En deling slik den vises: hvem den gjelder, og om den er godtatt (Story 6.19). */
export type ShareRow = {
  id: number;
  ownerId: number;
  memberId: number;
  status: "pending" | "accepted";
  createdAt: string;
};

/** En deling med e-posten til den andre parten. */
export type ShareWithEmail = ShareRow & { email: string };

export function insertShare(
  db: Db,
  share: { ownerId: number; memberId: number; createdAt: string },
): number | null {
  const existing = db
    .select({ id: shares.id })
    .from(shares)
    .where(and(eq(shares.ownerId, share.ownerId), eq(shares.memberId, share.memberId)))
    .get();
  if (existing) return null;
  return db
    .insert(shares)
    .values({ ...share, status: "pending" })
    .returning({ id: shares.id })
    .get().id;
}

export function findShareById(db: Db, id: number): ShareRow | null {
  return db.select().from(shares).where(eq(shares.id, id)).get() ?? null;
}

/** Delingene eieren har invitert til, eldste først, med mottakerens e-post. */
export function listSharesByOwner(db: Db, ownerId: number): ShareWithEmail[] {
  return db
    .select({
      id: shares.id,
      ownerId: shares.ownerId,
      memberId: shares.memberId,
      status: shares.status,
      createdAt: shares.createdAt,
      email: users.email,
    })
    .from(shares)
    .innerJoin(users, eq(users.id, shares.memberId))
    .where(eq(shares.ownerId, ownerId))
    .orderBy(asc(shares.id))
    .all();
}

/** Delingene brukeren er invitert til, med eierens e-post. */
export function listSharesByMember(db: Db, memberId: number): ShareWithEmail[] {
  return db
    .select({
      id: shares.id,
      ownerId: shares.ownerId,
      memberId: shares.memberId,
      status: shares.status,
      createdAt: shares.createdAt,
      email: users.email,
    })
    .from(shares)
    .innerJoin(users, eq(users.id, shares.ownerId))
    .where(eq(shares.memberId, memberId))
    .orderBy(asc(shares.id))
    .all();
}

/** Setter delingen til godtatt. `false` når den ikke finnes eller ikke er mottakerens. */
export function acceptShare(db: Db, memberId: number, id: number): boolean {
  return (
    db
      .update(shares)
      .set({ status: "accepted" })
      .where(and(eq(shares.id, id), eq(shares.memberId, memberId)))
      .run().changes > 0
  );
}

/** Sletter delingen når brukeren er eier eller mottaker. */
export function deleteShare(db: Db, userId: number, id: number): boolean {
  const share = findShareById(db, id);
  if (share === null || (share.ownerId !== userId && share.memberId !== userId)) return false;
  return db.delete(shares).where(eq(shares.id, id)).run().changes > 0;
}

/** Om `memberId` har godtatt deling fra `ownerId`. */
export function hasAcceptedShare(db: Db, ownerId: number, memberId: number): boolean {
  return (
    db
      .select({ id: shares.id })
      .from(shares)
      .where(
        and(
          eq(shares.ownerId, ownerId),
          eq(shares.memberId, memberId),
          eq(shares.status, "accepted"),
        ),
      )
      .get() !== undefined
  );
}
