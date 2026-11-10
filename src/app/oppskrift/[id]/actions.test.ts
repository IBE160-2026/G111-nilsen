import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { messageFor } from "@/lib/messages";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { createFolder, listFolders } from "@/server/services/folder-service";
import { createManualRecipe, getRecipe } from "@/server/services/recipe-service";

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

const {
  applySuggestion,
  changeOriginalServings,
  moveToFolder,
  moveToNewFolder,
  removeRecipe,
  removeSuggestion,
  rememberServings,
  requestSuggestions,
  saveRecipe,
  setFavorite,
} = await import("./actions");

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
    TEST_USER_ID,
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
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it("husker antallet som ble valgt før lagring (issue 009)", async () => {
    unsave();
    expect(await saveRecipe(id, 6)).toEqual({ ok: true });
    expect(stored().savedAt).not.toBeNull();
    expect(stored().selectedServings).toBe(6);
  });

  it.each([0, 51, 1.3, NaN, "5" as unknown as number])(
    "ugyldig antall %s: oppskriften lagres, antallet ignoreres",
    async (bad) => {
      unsave();
      expect(await saveRecipe(id, bad)).toEqual({ ok: true });
      expect(stored().savedAt).not.toBeNull();
      expect(stored().selectedServings).toBeNull();
    },
  );

  it("uten antall: selectedServings er uendret", async () => {
    unsave();
    expect(await saveRecipe(id)).toEqual({ ok: true });
    expect(stored().selectedServings).toBeNull();
  });

  it("allerede lagret: beholder tidspunktet", async () => {
    const before = stored().savedAt;
    expect(await saveRecipe(id)).toEqual({ ok: true });
    expect(stored().savedAt).toBe(before);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 2 ** 53, "1" as unknown as number])(
    "ugyldig id %s: not_found, ingenting endres, ingen revalidering",
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
  it("sletter oppskriften med linjer og steg og sender brukeren til /oppskrifter", async () => {
    const error = await removeRecipe(id).catch((e) => e);
    expect(error).toBeInstanceOf(RedirectError);
    expect((error as RedirectError).url).toBe("/oppskrifter");
    expect(getRecipe(id, state.db!).ok).toBe(false);
    expect(count("recipes")).toBe(0);
    expect(count("ingredient_lines")).toBe(0);
    expect(count("steps")).toBe(0);
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
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

describe("changeOriginalServings", () => {
  it("lagrer antallet, også for ulagret oppskrift, og revaliderer", async () => {
    unsave();
    expect(await changeOriginalServings(id, 6)).toEqual({ ok: true });
    expect(stored()).toMatchObject({ originalServings: 6, selectedServings: null });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it.each([0, 51, 2.5, -1, NaN, "6" as unknown as number])(
    "ugyldig antall %s: validation, ingenting lagres",
    async (bad) => {
      const before = stored().originalServings;
      expect(await changeOriginalServings(id, bad)).toEqual(failure("validation"));
      expect(stored().originalServings).toBe(before);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it.each([999, 0, 1.5])("ukjent eller ugyldig id %s: not_found", async (bad) => {
    expect(await changeOriginalServings(bad, 6)).toEqual(failure("not_found"));
  });
});

describe("rememberServings", () => {
  it("lagrer antallet for en lagret oppskrift uten å revalidere eller endre updatedAt", async () => {
    const before = stored().updatedAt;
    expect(await rememberServings(id, 6)).toEqual({ ok: true });
    expect(stored()).toMatchObject({ selectedServings: 6, updatedAt: before });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([0.5, 4.5, 6.5, 1.5, 49.5])("halvt antall %s lagres (Story 5.1)", async (half) => {
    expect(await rememberServings(id, half)).toEqual({ ok: true });
    expect(stored().selectedServings).toBe(half);
  });

  it.each([0, 0.4, 50.5, 51, 2.3, -1, NaN, Infinity, "6" as unknown as number])(
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

describe("moveToFolder (Story 3.3)", () => {
  beforeEach(() => {
    createFolder(TEST_USER_ID, "Hverdag", state.db!);
    createFolder(TEST_USER_ID, "Helg", state.db!);
  });

  it("legger oppskriften i mappen, gir mappenavnet og revaliderer hele appen", async () => {
    const before = stored().updatedAt;
    expect(await moveToFolder(id, 1)).toEqual({ ok: true, folderName: "Hverdag" });
    expect(stored()).toMatchObject({ folderId: 1, updatedAt: before });
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it("bytter mappe og tar oppskriften ut av mappen med null", async () => {
    await moveToFolder(id, 1);
    expect(await moveToFolder(id, 2)).toEqual({ ok: true, folderName: "Helg" });
    expect(stored().folderId).toBe(2);
    expect(await moveToFolder(id, null)).toEqual({ ok: true, folderName: null });
    expect(stored().folderId).toBeNull();
  });

  it("ulagret oppskrift: not_found, ingenting endres, ingen revalidering", async () => {
    unsave();
    expect(await moveToFolder(id, 1)).toEqual(failure("not_found"));
    expect(stored().folderId).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([
    ["ukjent oppskrift", 999, 1],
    ["ugyldig oppskrift", 0, 1],
    ["ugyldig oppskrift", 1.5, 1],
    ["ukjent mappe", 1, 999],
    ["ugyldig mappe", 1, 0],
    ["ugyldig mappe", 1, -1],
    ["ugyldig mappe", 1, NaN],
    ["mappe som tekst", 1, "1" as unknown as number],
  ])("%s: not_found", async (_, recipeId, folderId) => {
    expect(await moveToFolder(recipeId, folderId)).toEqual(failure("not_found"));
    expect(stored().folderId).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("databasefeil: reservemelding", async () => {
    breakDatabase();
    expect(await moveToFolder(id, 1)).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
  });
});

describe("moveToNewFolder (Story 3.3)", () => {
  const folderNames = () => {
    const result = listFolders(TEST_USER_ID, state.db!);
    return result.ok ? result.value.map((f) => f.name) : [];
  };

  it("oppretter mappen og flytter oppskriften, og revaliderer hele appen", async () => {
    expect(await moveToNewFolder(id, "  Fest  ")).toEqual({ ok: true, folderName: "Fest" });
    expect(folderNames()).toEqual(["Fest"]);
    expect(stored().folderId).toBe(1);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it.each([
    ["", "Skriv et navn på mappen."],
    ["a".repeat(41), "Navnet kan være maks 40 tegn. Gjør det kortere."],
  ])("%j: melding under feltet, ingen mappe opprettes", async (name, message) => {
    expect(await moveToNewFolder(id, name)).toEqual({ ok: false, field: "name", message });
    expect(folderNames()).toEqual([]);
    expect(stored().folderId).toBeNull();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("opptatt navn: melding under feltet, oppskriften blir der den var", async () => {
    createFolder(TEST_USER_ID, "Fest", state.db!);
    expect(await moveToNewFolder(id, "FEST")).toEqual({
      ok: false,
      field: "name",
      message: "Du har allerede en mappe med dette navnet.",
    });
    expect(folderNames()).toEqual(["Fest"]);
    expect(stored().folderId).toBeNull();
  });

  it("ulagret oppskrift: not_found, og ingen mappe opprettes", async () => {
    unsave();
    expect(await moveToNewFolder(id, "Fest")).toEqual(failure("not_found"));
    expect(folderNames()).toEqual([]);
  });

  it.each([999, 0, -1, 1.5, NaN])("ugyldig eller ukjent oppskrift %s: not_found", async (bad) => {
    expect(await moveToNewFolder(bad, "Fest")).toEqual(failure("not_found"));
    expect(folderNames()).toEqual([]);
  });

  it("databasefeil: reservemelding", async () => {
    breakDatabase();
    expect(await moveToNewFolder(id, "Fest")).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
  });
});

describe("setFavorite (Story 3.4)", () => {
  it("markerer og avmarkerer med eksplisitt verdi, og revaliderer alle sider", async () => {
    expect(await setFavorite(id, true)).toEqual({ ok: true });
    expect(stored().isFavorite).toBe(true);
    expect(revalidatePath).toHaveBeenLastCalledWith("/", "layout");
    expect(await setFavorite(id, false)).toEqual({ ok: true });
    expect(stored().isFavorite).toBe(false);
    expect(revalidatePath).toHaveBeenCalledTimes(2);
  });

  it("gjentatte kall med samme verdi snur ikke tilstanden", async () => {
    await setFavorite(id, true);
    await setFavorite(id, true);
    expect(stored().isFavorite).toBe(true);
  });

  it("endrer ikke updatedAt", async () => {
    const before = stored().updatedAt;
    await setFavorite(id, true);
    expect(stored().updatedAt).toBe(before);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 2 ** 53, "1" as unknown as number])(
    "ugyldig id %s: not_found, ingenting endres, ingen revalidering",
    async (bad) => {
      expect(await setFavorite(bad, true)).toEqual(failure("not_found"));
      expect(stored().isFavorite).toBe(false);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it.each(["true", 1, 0, null, undefined])(
    "verdien %j er ikke boolsk: validation, ingenting endres",
    async (bad) => {
      expect(await setFavorite(id, bad as unknown as boolean)).toEqual(failure("validation"));
      expect(stored().isFavorite).toBe(false);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("ukjent id 999: not_found, ingenting endres, men sidene revalideres", async () => {
    expect(await setFavorite(999, true)).toEqual(failure("not_found"));
    expect(stored().isFavorite).toBe(false);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it("oppskrift som ikke er lagret: not_found og ingenting endres", async () => {
    unsave();
    expect(await setFavorite(id, true)).toEqual(failure("not_found"));
    expect(stored().isFavorite).toBe(false);
    // Sidene oppdateres likevel, så et gammelt kort ikke blir stående.
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it("slettet oppskrift (annen fane): not_found", async () => {
    await removeRecipe(id).catch(() => {});
    revalidatePath.mockClear();
    expect(await setFavorite(id, true)).toEqual(failure("not_found"));
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it("databasefeil: reservemelding, feilen logges og ingenting revalideres", async () => {
    breakDatabase();
    expect(await setFavorite(id, true)).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("requestSuggestions (Story 4.1)", () => {
  it("gir eksempelforslag uten nøkkel, uten å lagre eller revalidere", async () => {
    const before = [count("recipes"), count("ingredient_lines"), count("steps")];
    const result = await requestSuggestions(id);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isExample).toBe(true);
    expect(result.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(result.suggestions.length).toBeLessThanOrEqual(3);
    for (const suggestion of result.suggestions) {
      expect(suggestion.text).not.toBe("");
      expect(suggestion.reason).not.toBe("");
    }
    expect([count("recipes"), count("ingredient_lines"), count("steps")]).toEqual(before);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("virker også for en oppskrift som ikke er i samlingen", async () => {
    unsave();
    expect((await requestSuggestions(id)).ok).toBe(true);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 2 ** 53, "1" as unknown as number])(
    "ugyldig id %s: ok: false",
    async (bad) => {
      expect(await requestSuggestions(bad)).toEqual({ ok: false });
    },
  );

  it("ukjent oppskrift: ok: false", async () => {
    expect(await requestSuggestions(id + 100)).toEqual({ ok: false });
  });

  it("databasefeil: ok: false, og feilen logges", async () => {
    breakDatabase();
    expect(await requestSuggestions(id)).toEqual({ ok: false });
    expect(console.error).toHaveBeenCalled();
  });
});

describe("applySuggestion og removeSuggestion (Story 4.2)", () => {
  const suggestion = { text: "Tilsett sitron.", reason: "Gir friskhet.", appliesTo: "recipe" };

  it("tar i bruk: lagrer med oppskriften, gir forslaget tilbake og revaliderer", async () => {
    const before = stored();
    const result = await applySuggestion(id, suggestion);
    expect(result).toEqual({ ok: true, suggestion: { id: expect.any(Number), ...suggestion } });
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
    const after = stored();
    expect(after.suggestions).toEqual([result.ok && result.suggestion]);
    // Ingredienser, steg og updatedAt endres ikke (avkrysning er nøklet på updatedAt).
    expect(after.ingredients).toEqual(before.ingredients);
    expect(after.steps).toEqual(before.steps);
    expect(after.updatedAt).toBe(before.updatedAt);
  });

  it("virker også for en oppskrift som ikke er i samlingen", async () => {
    unsave();
    expect((await applySuggestion(id, suggestion)).ok).toBe(true);
  });

  it("tatt i bruk to ganger: én rad", async () => {
    await applySuggestion(id, suggestion);
    await applySuggestion(id, { ...suggestion });
    expect(stored().suggestions).toHaveLength(1);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 2 ** 53, "1" as unknown as number])(
    "ugyldig oppskrifts-id %s: not_found, ingenting lagres, ingen revalidering",
    async (bad) => {
      expect(await applySuggestion(bad, suggestion)).toEqual(failure("not_found"));
      expect(count("suggestions")).toBe(0);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, "forslag", { text: "a" }, { ...suggestion, appliesTo: "alt" }])(
    "ugyldig forslag %j: validation, ingenting lagres, ingen revalidering",
    async (bad) => {
      expect(await applySuggestion(id, bad)).toEqual(failure("validation"));
      expect(count("suggestions")).toBe(0);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("ukjent oppskrift: not_found", async () => {
    expect(await applySuggestion(id + 100, suggestion)).toEqual(failure("not_found"));
  });

  it("databasefeil: reservemelding og feilen logges", async () => {
    breakDatabase();
    expect(await applySuggestion(id, suggestion)).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("fjerner: sletter bare det valgte forslaget og revaliderer", async () => {
    const a = await applySuggestion(id, suggestion);
    await applySuggestion(id, { ...suggestion, text: "Annet." });
    revalidatePath.mockClear();
    if (!a.ok) throw new Error("kunne ikke ta i bruk");

    expect(await removeSuggestion(id, a.suggestion.id)).toEqual({ ok: true });

    expect(stored().suggestions.map((s) => s.text)).toEqual(["Annet."]);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it("fjerner et forslag som allerede er borte: not_found, og sidene oppdateres", async () => {
    expect(await removeSuggestion(id, 9999)).toEqual(failure("not_found"));
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it.each([0, -1, 1.5, NaN, "1" as unknown as number])(
    "fjerner med ugyldig id %s: not_found, ingen revalidering",
    async (bad) => {
      await applySuggestion(id, suggestion);
      revalidatePath.mockClear();
      expect(await removeSuggestion(id, bad)).toEqual(failure("not_found"));
      expect(await removeSuggestion(bad, 1)).toEqual(failure("not_found"));
      expect(stored().suggestions).toHaveLength(1);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("fjerner: databasefeil gir reservemelding", async () => {
    breakDatabase();
    expect(await removeSuggestion(id, 1)).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
  });
});

describe("innlogging og eierskap (Story 5.13)", () => {
  function otherUser(): number {
    return Number(
      state
        .db!.$client.prepare(
          "insert into users (email, password_hash, created_at) values ('b@b.no', 'x', 'x')",
        )
        .run().lastInsertRowid,
    );
  }

  afterEach(() => {
    session.userId = TEST_USER_ID;
  });

  it("lagring uten innlogging gir «Du må logge inn» og lagrer ingenting", async () => {
    unsave();
    session.userId = null;
    expect(await saveRecipe(id)).toEqual({
      ok: false,
      message: "Du må logge inn. Logg inn eller lag en konto for å lagre oppskrifter.",
    });
    expect(stored().savedAt).toBeNull();
  });

  it("mapper uten innlogging gir «Du må logge inn»", async () => {
    session.userId = null;
    expect(await moveToFolder(id, null)).toMatchObject({ ok: false });
    expect(await moveToNewFolder(id, "Ny")).toMatchObject({
      ok: false,
      message: expect.stringContaining("Du må logge inn"),
    });
  });

  it("en annens oppskrift behandles som ukjent i alle handlinger", async () => {
    session.userId = otherUser();
    const notFound = { ok: false, message: expect.stringContaining("Vi fant ikke oppskriften") };
    expect(await rememberServings(id, 6)).toEqual(notFound);
    expect(await changeOriginalServings(id, 6)).toEqual(notFound);
    expect(await setFavorite(id, true)).toEqual(notFound);
    expect(await removeRecipe(id)).toEqual(notFound);
    expect(await requestSuggestions(id)).toEqual({ ok: false });
    expect(
      await applySuggestion(id, { text: "Salt.", reason: "Smak.", appliesTo: "recipe" }),
    ).toEqual(notFound);
    expect(await saveRecipe(id)).toEqual(notFound);
    expect(stored()).toMatchObject({ originalServings: 4, isFavorite: false });
  });

  it("en import uten eier kan endres uten innlogging, men ikke lagres", async () => {
    state.db!.$client.prepare("update recipes set user_id = null, saved_at = null").run();
    session.userId = null;
    expect(await changeOriginalServings(id, 6)).toEqual({ ok: true });
    expect(await saveRecipe(id)).toMatchObject({ ok: false });
    session.userId = TEST_USER_ID;
    expect(await saveRecipe(id)).toEqual({ ok: true });
    expect(
      state.db!.$client.prepare("select user_id as u from recipes where id = ?").get(id),
    ).toEqual({ u: TEST_USER_ID });
  });
});
