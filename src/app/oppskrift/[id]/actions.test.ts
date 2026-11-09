import { beforeEach, describe, expect, it, vi } from "vitest";
import { messageFor } from "@/lib/messages";
import { createTestDb, type Db } from "@/server/db/client";
import { createManualRecipe, getRecipe } from "@/server/services/recipe-service";

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

const { removeRecipe, rememberServings, saveRecipe } = await import("./actions");

const failure = (kind: string | undefined) => {
  const message = messageFor(kind);
  return { ok: false, message: `${message.title} ${message.body}` };
};

let id: number;

function stored() {
  const result = getRecipe(id, state.db!);
  if (!result.ok) throw new Error("fant ikke oppskriften");
  return result.value;
}

const count = (table: string) =>
  (state.db!.$client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;

/** Gjør en ferdig lagret manuell oppskrift om til en som ikke er i samlingen. */
function unsave() {
  state.db!.$client.prepare("update recipes set saved_at = null where id = ?").run(id);
}

function breakDatabase() {
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.db!.$client.close();
}

beforeEach(() => {
  vi.restoreAllMocks();
  revalidatePath.mockClear();
  state.db = createTestDb();
  const created = createManualRecipe(
    { title: "Pannekaker", servings: 4, ingredients: ["3 egg"], steps: ["Visp."] },
    state.db,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  id = created.value.id;
});

describe("saveRecipe", () => {
  it("legger oppskriften i samlingen og revaliderer oppskriftssiden", async () => {
    unsave();
    expect(await saveRecipe(id)).toEqual({ ok: true });
    expect(stored().savedAt).not.toBeNull();
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith(`/oppskrift/${id}`);
  });

  it("allerede lagret: beholder tidspunktet", async () => {
    const before = stored().savedAt;
    expect(await saveRecipe(id)).toEqual({ ok: true });
    expect(stored().savedAt).toBe(before);
  });

  it.each([999, 0, -1, 1.5, NaN, Infinity, 2 ** 53, "1" as unknown as number])(
    "ukjent eller ugyldig id %s: not_found, ingenting endres, ingen revalidering",
    async (bad) => {
      unsave();
      expect(await saveRecipe(bad)).toEqual(failure("not_found"));
      expect(stored().savedAt).toBeNull();
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("databasefeil: reservemelding fra messageFor(undefined) og feilen logges", async () => {
    breakDatabase();
    expect(await saveRecipe(id)).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("removeRecipe", () => {
  it("sletter oppskriften med linjer og steg og sender brukeren til /samlingen", async () => {
    const error = await removeRecipe(id).catch((e) => e);
    expect(error).toBeInstanceOf(RedirectError);
    expect((error as RedirectError).url).toBe("/samlingen");
    expect(getRecipe(id, state.db!).ok).toBe(false);
    expect(count("recipes")).toBe(0);
    expect(count("ingredient_lines")).toBe(0);
    expect(count("steps")).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith("/samlingen");
  });

  it("slett to ganger: andre gang gir not_found uten redirect", async () => {
    await removeRecipe(id).catch(() => {});
    expect(await removeRecipe(id)).toEqual(failure("not_found"));
  });

  it.each([0, -1, 1.5, NaN, 2 ** 53])(
    "ugyldig id %s: not_found, ingenting slettes",
    async (bad) => {
      expect(await removeRecipe(bad)).toEqual(failure("not_found"));
      expect(count("recipes")).toBe(1);
    },
  );

  it("databasefeil: reservemelding, ingen redirect (feilen svelges ikke som redirect)", async () => {
    breakDatabase();
    expect(await removeRecipe(id)).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
  });
});

describe("rememberServings", () => {
  it("lagrer antallet for en lagret oppskrift uten å revalidere eller endre updatedAt", async () => {
    const before = stored().updatedAt;
    expect(await rememberServings(id, 6)).toEqual({ ok: true });
    expect(stored()).toMatchObject({ selectedServings: 6, updatedAt: before });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([0, 51, 2.5, -1, NaN, Infinity, "6" as unknown as number])(
    "ugyldig antall %s: validation, ingenting lagres",
    async (bad) => {
      expect(await rememberServings(id, bad)).toEqual(failure("validation"));
      expect(stored().selectedServings).toBeNull();
    },
  );

  it("ulagret oppskrift: not_found og ingenting lagres", async () => {
    unsave();
    expect(await rememberServings(id, 6)).toEqual(failure("not_found"));
    expect(stored().selectedServings).toBeNull();
  });

  it.each([999, 0, 1.5, 2 ** 53])("ukjent eller ugyldig id %s: not_found", async (bad) => {
    expect(await rememberServings(bad, 6)).toEqual(failure("not_found"));
  });

  it("databasefeil: reservemelding", async () => {
    breakDatabase();
    expect(await rememberServings(id, 6)).toEqual(failure(undefined));
  });
});
