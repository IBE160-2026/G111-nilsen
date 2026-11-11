import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messageFor } from "@/lib/messages";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import {
  createManualRecipe,
  deleteRecipe,
  getDeletedRecipe,
  getRecipe,
} from "@/server/services/recipe-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({
  currentUserId: async () => session.userId,
  currentUser: async () =>
    session.userId === null ? null : { id: session.userId, email: "test@example.com" },
}));

const state = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));
vi.mock("next/cache", () => ({ revalidatePath }));

const { deleteDeletedForGood, restoreDeleted } = await import("./actions");

const failure = (kind: string | undefined) => {
  const message = messageFor(kind);
  return { ok: false, message: `${message.title} ${message.body}` };
};

let recipeId: number;
let trashId: number;

beforeEach(() => {
  vi.restoreAllMocks();
  revalidatePath.mockClear();
  session.userId = TEST_USER_ID;
  state.db = createTestDb();
  const created = createManualRecipe(
    TEST_USER_ID,
    { title: "Pannekaker", servings: 4, ingredients: ["3 egg"], steps: ["Visp."] },
    state.db,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  recipeId = created.value.id;
  const deleted = deleteRecipe(recipeId, state.db);
  if (!deleted.ok || deleted.value.trashId === null) throw new Error("kunne ikke slette");
  trashId = deleted.value.trashId;
});

afterEach(() => {
  session.userId = TEST_USER_ID;
});

describe("restoreDeleted", () => {
  it("henter tilbake, revaliderer alt og sender brukeren til oppskriften", async () => {
    const error = await restoreDeleted(trashId).catch((e) => e);
    expect(error).toBeInstanceOf(RedirectError);
    const url = (error as RedirectError).url;
    expect(url).toMatch(/^\/oppskrift\/\d+$/);
    const newId = Number(url.split("/").pop());
    const read = getRecipe(newId, state.db!);
    expect(read.ok && read.value.title).toBe("Pannekaker");
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    expect(getDeletedRecipe(TEST_USER_ID, trashId, state.db!).ok).toBe(false);
  });

  it("andre gang gir not_found uten redirect, og oppdaterer listen", async () => {
    await restoreDeleted(trashId).catch(() => {});
    revalidatePath.mockClear();
    expect(await restoreDeleted(trashId)).toEqual(failure("not_found"));
    expect(revalidatePath).toHaveBeenCalledWith("/nylig-slettet");
  });

  it.each([0, -1, 1.5, NaN, 2 ** 53])("ugyldig id %s: not_found", async (bad) => {
    expect(await restoreDeleted(bad)).toEqual(failure("not_found"));
  });

  it("uten innlogging: login_required, og ingenting hentes tilbake", async () => {
    session.userId = null;
    expect(await restoreDeleted(trashId)).toEqual(failure("login_required"));
    expect(getDeletedRecipe(TEST_USER_ID, trashId, state.db!).ok).toBe(true);
  });

  it("en annens slettede oppskrift gir not_found", async () => {
    session.userId = 99;
    expect(await restoreDeleted(trashId)).toEqual(failure("not_found"));
    expect(getDeletedRecipe(TEST_USER_ID, trashId, state.db!).ok).toBe(true);
  });

  it("databasefeil: reservemelding, ingen redirect", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.db!.$client.close();
    expect(await restoreDeleted(trashId)).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
  });
});

describe("deleteDeletedForGood", () => {
  it("sletter for godt og oppdaterer siden", async () => {
    expect(await deleteDeletedForGood(trashId)).toEqual({ ok: true });
    expect(revalidatePath).toHaveBeenCalledWith("/nylig-slettet");
    expect(getDeletedRecipe(TEST_USER_ID, trashId, state.db!).ok).toBe(false);
    expect(await deleteDeletedForGood(trashId)).toEqual(failure("not_found"));
  });

  it("ugyldig id, uten innlogging og en annens gir feil uten å slette", async () => {
    expect(await deleteDeletedForGood(0)).toEqual(failure("not_found"));
    session.userId = 99;
    expect(await deleteDeletedForGood(trashId)).toEqual(failure("not_found"));
    session.userId = null;
    expect(await deleteDeletedForGood(trashId)).toEqual(failure("login_required"));
    expect(getDeletedRecipe(TEST_USER_ID, trashId, state.db!).ok).toBe(true);
  });

  it("databasefeil: reservemelding", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.db!.$client.close();
    expect(await deleteDeletedForGood(trashId)).toEqual(failure(undefined));
  });
});
