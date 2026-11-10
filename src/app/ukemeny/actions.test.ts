import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { insertRecipe } from "@/server/db/repositories/recipe-repository";
import { listWeek } from "@/server/services/meal-plan-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({
  currentUserId: async () => session.userId,
}));

const state = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const { addMeal, removeMeal } = await import("./actions");

const T0 = "2026-11-09T10:00:00.000Z";
let recipeId = 0;

beforeEach(() => {
  state.db = createTestDb();
  session.userId = TEST_USER_ID;
  revalidatePath.mockClear();
  recipeId = insertRecipe(state.db, {
    title: "Pannekaker",
    sourceUrl: null,
    sourceName: null,
    originalServings: 4,
    selectedServings: null,
    savedAt: T0,
    createdAt: T0,
    updatedAt: T0,
    ingredients: [],
    steps: [],
    userId: TEST_USER_ID,
  });
});

const stored = () => {
  const result = listWeek(TEST_USER_ID, "2026-11-09", state.db!);
  return result.ok ? result.value.map((entry) => `${entry.day} ${entry.servings}`) : [];
};

describe("addMeal", () => {
  it("lagrer oppføringen, gir id-en og oppdaterer /ukemeny", async () => {
    const result = await addMeal({ recipeId, day: "2026-11-10", servings: 3 });
    expect(result).toMatchObject({ ok: true, id: expect.any(Number) });
    expect(stored()).toEqual(["2026-11-10 3"]);
    expect(revalidatePath).toHaveBeenCalledWith("/ukemeny");
  });

  it("gir egne meldinger for manglende oppskrift og ugyldig antall", async () => {
    expect(await addMeal({ recipeId: 0, day: "2026-11-10", servings: 3 })).toEqual({
      ok: false,
      message: "Velg en oppskrift først.",
    });
    expect(await addMeal({ recipeId, day: "2026-11-10", servings: 51 })).toEqual({
      ok: false,
      message: "Velg mellom 0,5 og 50 personer.",
    });
    expect(stored()).toEqual([]);
  });

  it("avviser feil typer, ukjent oppskrift og ugyldig dag", async () => {
    for (const input of [
      null,
      "x",
      { recipeId: "1", day: "2026-11-10", servings: 3 },
      { recipeId, day: 5, servings: 3 },
      { recipeId, day: "2026-11-10", servings: "3" },
      { recipeId: 999, day: "2026-11-10", servings: 3 },
      { recipeId, day: "2026-02-30", servings: 3 },
    ]) {
      const result = await addMeal(input as never);
      expect(result.ok).toBe(false);
    }
    expect(stored()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("krever innlogging", async () => {
    session.userId = null;
    const result = await addMeal({ recipeId, day: "2026-11-10", servings: 3 });
    expect(result.ok).toBe(false);
    expect(stored()).toEqual([]);
  });

  it("gir en generell melding og logger når databasen feiler", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.db = null;
    const result = await addMeal({ recipeId, day: "2026-11-10", servings: 3 });
    expect(result.ok).toBe(false);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});

describe("removeMeal", () => {
  it("fjerner oppføringen og oppdaterer /ukemeny", async () => {
    const added = await addMeal({ recipeId, day: "2026-11-10", servings: 3 });
    if (!added.ok) throw new Error("feil");
    revalidatePath.mockClear();
    expect(await removeMeal(added.id)).toEqual({ ok: true });
    expect(stored()).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledWith("/ukemeny");
  });

  it("gir en melding for ukjent og ugyldig id, og uten innlogging", async () => {
    for (const id of [999, 0, -3, 1.5, "1" as unknown as number])
      expect((await removeMeal(id)).ok).toBe(false);
    const added = await addMeal({ recipeId, day: "2026-11-10", servings: 3 });
    if (!added.ok) throw new Error("feil");
    session.userId = null;
    expect((await removeMeal(added.id)).ok).toBe(false);
    expect(stored()).toEqual(["2026-11-10 3"]);
  });
});
