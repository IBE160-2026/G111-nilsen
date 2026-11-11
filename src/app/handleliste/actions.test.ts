import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { listChecks } from "@/server/services/meal-plan-service";
import { listPantry } from "@/server/services/pantry-service";
import { insertRecipe } from "@/server/db/repositories/recipe-repository";
import { listSavedLists } from "@/server/services/shopping-list-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({
  currentUserId: async () => session.userId,
  currentUser: async () =>
    session.userId === null ? null : { id: session.userId, email: "test@example.com" },
}));

const state = vi.hoisted(() => ({ db: null as Db | null }));

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});

const {
  addToPantry,
  clearPantryItems,
  deleteShoppingList,
  removeFromPantry,
  saveShoppingList,
  setWeekItemChecked,
} = await import("./actions");

beforeEach(() => {
  state.db = createTestDb();
});

const stored = () => {
  const result = listPantry(TEST_USER_ID, state.db!);
  return result.ok ? result.value.map((item) => item.name) : [];
};

describe("addToPantry", () => {
  it("lagrer navnet og gir det tilbake med id", async () => {
    const result = await addToPantry("Salt");
    expect(result).toMatchObject({ ok: true, item: { name: "Salt" } });
    expect(stored()).toEqual(["Salt"]);
  });

  it("gir en melding under navnefeltet for tomt og for langt navn", async () => {
    expect(await addToPantry("  ")).toEqual({
      ok: false,
      field: "name",
      message: "Skriv hva du har hjemme.",
    });
    expect(await addToPantry("x".repeat(61))).toEqual({
      ok: false,
      field: "name",
      message: "Navnet kan være maks 60 tegn. Gjør det kortere.",
    });
    expect(stored()).toEqual([]);
  });

  it("avviser noe som ikke er tekst", async () => {
    expect(await addToPantry(5 as unknown as string)).toMatchObject({ ok: false, field: "name" });
  });

  it("gir en generell melding og logger når databasen feiler", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.db = null;
    const result = await addToPantry("Salt");
    expect(result.ok).toBe(false);
    expect(result.ok === false && result.field).toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("removeFromPantry", () => {
  it("fjerner oppføringen", async () => {
    const added = await addToPantry("Salt");
    if (!added.ok) throw new Error("feil");
    expect(await removeFromPantry(added.item.id)).toEqual({ ok: true });
    expect(stored()).toEqual([]);
  });

  it("gir en melding for ukjent og ugyldig id", async () => {
    for (const id of [999, 0, -3, 1.5, "1" as unknown as number]) {
      const result = await removeFromPantry(id);
      expect(result.ok).toBe(false);
    }
  });
});

describe("clearPantryItems", () => {
  it("tømmer «Har hjemme» for den innloggede", async () => {
    await addToPantry("Salt");
    await addToPantry("Olje");
    expect(await clearPantryItems()).toEqual({ ok: true });
    expect(stored()).toEqual([]);
  });

  it("ber om innlogging uten innlogging", async () => {
    session.userId = null;
    expect(await clearPantryItems()).toMatchObject({ ok: false });
    session.userId = TEST_USER_ID;
  });
});

describe("setWeekItemChecked", () => {
  it("lagrer og fjerner en avkrysning for uka", async () => {
    expect(await setWeekItemChecked("2026-11-09", "melk|dl", true)).toEqual({ ok: true });
    const stored = () => {
      const result = listChecks(TEST_USER_ID, "2026-11-09", state.db!);
      return result.ok ? result.value : [];
    };
    expect(stored()).toEqual(["melk|dl"]);
    expect(await setWeekItemChecked("2026-11-09", "melk|dl", false)).toEqual({ ok: true });
    expect(stored()).toEqual([]);
  });

  it("avviser ugyldig input og krever innlogging", async () => {
    expect(await setWeekItemChecked("i-morgen", "melk|dl", true)).toMatchObject({ ok: false });
    expect(await setWeekItemChecked("2026-11-09", "", true)).toMatchObject({ ok: false });
    session.userId = null;
    expect(await setWeekItemChecked("2026-11-09", "melk|dl", true)).toMatchObject({ ok: false });
    session.userId = TEST_USER_ID;
  });
});

describe("saveShoppingList og deleteShoppingList (Story 6.4g)", () => {
  const T = "2026-11-09T10:00:00.000Z";
  let recipeId = 0;
  beforeEach(() => {
    session.userId = TEST_USER_ID;
    revalidatePath.mockClear();
    recipeId = insertRecipe(state.db!, {
      title: "Pannekaker",
      sourceUrl: null,
      sourceName: null,
      originalServings: 4,
      selectedServings: null,
      savedAt: T,
      createdAt: T,
      updatedAt: T,
      ingredients: [],
      steps: [],
      userId: TEST_USER_ID,
    });
  });
  const lists = () => {
    const result = listSavedLists(TEST_USER_ID, state.db!);
    return result.ok ? result.value.map((list) => list.name) : [];
  };

  it("lagrer listen med navn (opprenset), gir id og navn, og oppdaterer /handleliste", async () => {
    const result = await saveShoppingList({
      name: "  Uke   46 ",
      items: [{ recipeId, servings: 3 }],
    });
    expect(result).toEqual({ ok: true, id: expect.any(Number), name: "Uke 46" });
    expect(lists()).toEqual(["Uke 46"]);
    expect(revalidatePath).toHaveBeenCalledWith("/handleliste");
  });

  it("gir egne meldinger for tomt og for langt navn, ingen oppskrifter og ugyldig antall", async () => {
    const items = [{ recipeId, servings: 3 }];
    expect(await saveShoppingList({ name: " ", items })).toEqual({
      ok: false,
      message: "Skriv et navn på listen.",
    });
    expect(await saveShoppingList({ name: "x".repeat(61), items })).toEqual({
      ok: false,
      message: "Navnet kan være opptil 60 tegn.",
    });
    expect(await saveShoppingList({ name: "Liste", items: [] })).toEqual({
      ok: false,
      message: "Velg minst én oppskrift før du lagrer.",
    });
    expect(
      (await saveShoppingList({ name: "Liste", items: [{ recipeId, servings: 99 }] })).ok,
    ).toBe(false);
    expect(lists()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("avviser feil typer, ukjent oppskrift og manglende innlogging", async () => {
    for (const input of [null, "x", { name: 5, items: [] }, { name: "a", items: "x" }]) {
      expect((await saveShoppingList(input as never)).ok).toBe(false);
    }
    expect(
      (await saveShoppingList({ name: "Liste", items: [{ recipeId: 999, servings: 2 }] })).ok,
    ).toBe(false);
    session.userId = null;
    expect((await saveShoppingList({ name: "Liste", items: [{ recipeId, servings: 2 }] })).ok).toBe(
      false,
    );
    expect(lists()).toEqual([]);
  });

  it("sletter en liste, og gir en melding for ukjent id og uten innlogging", async () => {
    const saved = await saveShoppingList({ name: "Min", items: [{ recipeId, servings: 2 }] });
    if (!saved.ok) throw new Error("feil");
    for (const id of [999, 0, -1, 1.5, "1" as unknown as number])
      expect((await deleteShoppingList(id)).ok).toBe(false);
    session.userId = null;
    expect((await deleteShoppingList(saved.id)).ok).toBe(false);
    session.userId = TEST_USER_ID;
    expect(await deleteShoppingList(saved.id)).toEqual({ ok: true });
    expect(lists()).toEqual([]);
  });
});
