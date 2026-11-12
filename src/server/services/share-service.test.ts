import { beforeEach, describe, expect, it } from "vitest";
import { createTestDb, TEST_USER_ID, type Db } from "../db/client";
import { createManualRecipe, getRecipeFor, copySharedRecipe } from "./recipe-service";
import {
  acceptInvitation,
  endShare,
  inviteToCollection,
  listSharedCollection,
  listSharesIShare,
  listSharesWithMe,
  mayViewShared,
  SHARES_MAX,
} from "./share-service";

const IDA = TEST_USER_ID; // test@example.com
const PER = 2;
let db: Db;

function addUser(id: number, email: string) {
  db.$client
    .prepare(
      "insert into users (id, email, password_hash, created_at) values (?, ?, 'x', '2026-01-01T00:00:00.000Z')",
    )
    .run(id, email);
}

function recipe(userId: number, title: string): number {
  const created = createManualRecipe(
    userId,
    { title, servings: 2, ingredients: ["2 egg"], steps: ["Stek."] },
    db,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  return created.value.id;
}

beforeEach(() => {
  db = createTestDb();
  addUser(PER, "per@eksempel.no");
});

describe("inviteToCollection", () => {
  it("inviterer en konto og setter den som ventende hos begge", () => {
    const result = inviteToCollection(IDA, "Per@Eksempel.no ", db);
    expect(result).toMatchObject({
      ok: true,
      value: { email: "per@eksempel.no", status: "pending" },
    });
    expect(listSharesIShare(IDA, db)).toMatchObject({
      ok: true,
      value: [{ email: "per@eksempel.no", status: "pending" }],
    });
    expect(listSharesWithMe(PER, db)).toMatchObject({
      ok: true,
      value: [{ email: "test@example.com", status: "pending", ownerId: IDA }],
    });
  });

  it("avviser ugyldig e-post, seg selv, ukjent konto og dobbel invitasjon", () => {
    expect(inviteToCollection(IDA, "ikke-epost", db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "email" },
    });
    expect(inviteToCollection(IDA, 42, db)).toMatchObject({ ok: false });
    expect(inviteToCollection(IDA, "test@example.com", db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "self" },
    });
    expect(inviteToCollection(IDA, "ukjent@eksempel.no", db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    inviteToCollection(IDA, "per@eksempel.no", db);
    expect(inviteToCollection(IDA, "per@eksempel.no", db)).toEqual({
      ok: false,
      error: { kind: "duplicate" },
    });
  });

  it("stopper på 20 delinger", () => {
    for (let i = 0; i < SHARES_MAX; i++) {
      addUser(100 + i, `nr${i}@eksempel.no`);
      expect(inviteToCollection(IDA, `nr${i}@eksempel.no`, db).ok).toBe(true);
    }
    expect(inviteToCollection(IDA, "per@eksempel.no", db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "limit" },
    });
  });
});

describe("godta, se og avslutte", () => {
  it("først etter at invitasjonen er godtatt, ser mottakeren oppskriftene", () => {
    const id = recipe(IDA, "Pannekaker");
    const invited = inviteToCollection(IDA, "per@eksempel.no", db);
    if (!invited.ok) throw new Error("feilet");

    expect(listSharedCollection(PER, IDA, db)).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(mayViewShared(PER, IDA, db)).toBe(false);
    expect(getRecipeFor(PER, id, db)).toEqual({ ok: false, error: { kind: "not_found" } });

    expect(acceptInvitation(PER, invited.value.id, db)).toEqual({
      ok: true,
      value: { ownerId: IDA },
    });
    expect(mayViewShared(PER, IDA, db)).toBe(true);
    const shared = listSharedCollection(PER, IDA, db);
    expect(shared).toMatchObject({ ok: true, value: { email: "test@example.com" } });
    expect(shared.ok && shared.value.recipes.map((r) => r.title)).toEqual(["Pannekaker"]);

    // Lesetilgang, med eierens e-post på oppskriften.
    const seen = getRecipeFor(PER, id, db);
    expect(seen).toMatchObject({
      ok: true,
      value: { title: "Pannekaker", sharedBy: "test@example.com" },
    });
    // Eieren ser sin egen uten «delt av».
    const own = getRecipeFor(IDA, id, db);
    expect(own.ok && own.value.sharedBy).toBeUndefined();
  });

  it("bare mottakeren kan godta, og bare én gang", () => {
    const invited = inviteToCollection(IDA, "per@eksempel.no", db);
    if (!invited.ok) throw new Error("feilet");
    expect(acceptInvitation(IDA, invited.value.id, db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(acceptInvitation(PER, 9999, db)).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(acceptInvitation(PER, "x", db)).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(acceptInvitation(PER, invited.value.id, db).ok).toBe(true);
    expect(acceptInvitation(PER, invited.value.id, db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  it("begge parter kan avslutte, og tilgangen forsvinner", () => {
    const id = recipe(IDA, "Pannekaker");
    const invited = inviteToCollection(IDA, "per@eksempel.no", db);
    if (!invited.ok) throw new Error("feilet");
    acceptInvitation(PER, invited.value.id, db);

    expect(endShare(3, invited.value.id, db)).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(endShare(PER, invited.value.id, db)).toEqual({
      ok: true,
      value: { id: invited.value.id },
    });
    expect(getRecipeFor(PER, id, db)).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(listSharesIShare(IDA, db)).toEqual({ ok: true, value: [] });

    const again = inviteToCollection(IDA, "per@eksempel.no", db);
    if (!again.ok) throw new Error("feilet");
    acceptInvitation(PER, again.value.id, db);
    expect(endShare(IDA, again.value.id, db).ok).toBe(true);
    expect(listSharesWithMe(PER, db)).toEqual({ ok: true, value: [] });
  });

  it("en annens samling er ikke synlig, og en ukjent eier gir not_found", () => {
    expect(listSharedCollection(PER, 999, db)).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(listSharedCollection(PER, "x", db)).toEqual({ ok: false, error: { kind: "not_found" } });
  });
});

describe("copySharedRecipe", () => {
  it("kopierer til egen samling uten mappe, notater og favoritt", () => {
    const id = recipe(IDA, "Pannekaker");
    const invited = inviteToCollection(IDA, "per@eksempel.no", db);
    if (!invited.ok) throw new Error("feilet");
    acceptInvitation(PER, invited.value.id, db);

    const copy = copySharedRecipe(PER, id, "Kopi av ", db);
    if (!copy.ok) throw new Error("feilet");
    const mine = getRecipeFor(PER, copy.value.id, db);
    expect(mine).toMatchObject({
      ok: true,
      value: { title: "Kopi av Pannekaker", folderId: null, isFavorite: false },
    });
    expect(mine.ok && mine.value.ingredients.map((line) => line.original)).toEqual(["2 egg"]);
    // Originalen er urørt, og eieren ser bare sin egen.
    const theirs = listSharedCollection(PER, IDA, db);
    expect(theirs.ok && theirs.value.recipes).toHaveLength(1);
  });

  it("kan ikke kopiere sin egen, en ukjent eller en udelt oppskrift", () => {
    const mine = recipe(PER, "Min");
    const theirs = recipe(IDA, "Deres");
    expect(copySharedRecipe(PER, mine, "Kopi av ", db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(copySharedRecipe(PER, theirs, "Kopi av ", db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(copySharedRecipe(PER, 0, "Kopi av ", db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });
});
