import "server-only";
import type { RecipeSummary } from "@/domain";
import { isValidEmail, normalizeEmail } from "@/lib/account-input";
import { appError, err, ok, type Result } from "@/lib/result";
import { getDb, type Db } from "../db/client";
import { listSavedRecipes } from "../db/repositories/recipe-repository";
import {
  acceptShare,
  deleteShare,
  findShareById,
  hasAcceptedShare,
  insertShare,
  listSharesByMember,
  listSharesByOwner,
} from "../db/repositories/share-repository";
import { findUserByEmail, findUserById } from "../db/repositories/user-repository";

/**
 * Deling av samlingen mellom kontoer (Story 6.19). Eieren inviterer en annen konto med e-post;
 * mottakeren godtar og kan da se oppskriftene, men ikke endre dem. Begge kan avslutte delingen.
 */

/** Hvor mange delinger én konto kan invitere til. */
export const SHARES_MAX = 20;

/** En deling slik sidene viser den. */
export type Share = {
  id: number;
  /** E-posten til den andre parten. */
  email: string;
  status: "pending" | "accepted";
  /** Id-en til eieren, så mottakeren kan åpne samlingen. */
  ownerId: number;
};

/**
 * Inviterer kontoen med denne e-posten til å se samlingen. Ugyldig e-post gir `validation`
 * (`email`), egen e-post `validation` (`self`), ukjent konto `not_found`, en invitasjon som
 * finnes fra før `duplicate`, og over 20 delinger `validation` (`limit`).
 */
export function inviteToCollection(
  ownerId: number,
  email: unknown,
  db: Db = getDb(),
  now: Date = new Date(),
): Result<Share> {
  if (typeof email !== "string") return err(appError("validation", "email"));
  const clean = normalizeEmail(email);
  if (!isValidEmail(clean)) return err(appError("validation", "email"));

  const owner = findUserById(db, ownerId);
  if (owner !== null && normalizeEmail(owner.email) === clean) {
    return err(appError("validation", "self"));
  }
  if (listSharesByOwner(db, ownerId).length >= SHARES_MAX) {
    return err(appError("validation", "limit"));
  }

  const member = findUserByEmail(db, clean);
  if (member === null) return err(appError("not_found"));

  const id = insertShare(db, { ownerId, memberId: member.id, createdAt: now.toISOString() });
  if (id === null) return err(appError("duplicate"));
  return ok({ id, email: member.email, status: "pending", ownerId });
}

/** Delingene brukeren har invitert til (eldste først). */
export function listSharesIShare(ownerId: number, db: Db = getDb()): Result<Share[]> {
  return ok(
    listSharesByOwner(db, ownerId).map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      ownerId: row.ownerId,
    })),
  );
}

/** Delingene brukeren er invitert til (eldste først). */
export function listSharesWithMe(memberId: number, db: Db = getDb()): Result<Share[]> {
  return ok(
    listSharesByMember(db, memberId).map((row) => ({
      id: row.id,
      email: row.email,
      status: row.status,
      ownerId: row.ownerId,
    })),
  );
}

/** Godtar en invitasjon. Ukjent, en annens eller allerede godtatt invitasjon gir `not_found`. */
export function acceptInvitation(
  memberId: number,
  id: unknown,
  db: Db = getDb(),
): Result<{ ownerId: number }> {
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) return err(appError("not_found"));
  const share = findShareById(db, id);
  if (share === null || share.memberId !== memberId || share.status === "accepted") {
    return err(appError("not_found"));
  }
  return acceptShare(db, memberId, id)
    ? ok({ ownerId: share.ownerId })
    : err(appError("not_found"));
}

/** Avslutter delingen (eller avslår invitasjonen). Begge parter kan gjøre det. */
export function endShare(userId: number, id: unknown, db: Db = getDb()): Result<{ id: number }> {
  if (typeof id !== "number" || !Number.isInteger(id) || id < 1) return err(appError("not_found"));
  return deleteShare(db, userId, id) ? ok({ id }) : err(appError("not_found"));
}

/** Oppskriftene eieren deler med `memberId`. Uten godtatt deling gir den `not_found`. */
export function listSharedCollection(
  memberId: number,
  ownerId: unknown,
  db: Db = getDb(),
): Result<{ email: string; recipes: RecipeSummary[] }> {
  if (typeof ownerId !== "number" || !Number.isInteger(ownerId) || ownerId < 1) {
    return err(appError("not_found"));
  }
  if (!hasAcceptedShare(db, ownerId, memberId)) return err(appError("not_found"));
  const owner = findUserById(db, ownerId);
  if (owner === null) return err(appError("not_found"));
  return ok({ email: owner.email, recipes: listSavedRecipes(db, ownerId) });
}

/** Om `viewer` kan se en oppskrift eid av `ownerId` fordi eieren deler samlingen sin. */
export function mayViewShared(
  viewer: number | null,
  ownerId: number | null,
  db: Db = getDb(),
): boolean {
  if (viewer === null || ownerId === null) return false;
  return hasAcceptedShare(db, ownerId, viewer);
}
