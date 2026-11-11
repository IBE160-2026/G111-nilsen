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

const { saveWeekPlan } = await import("./actions");

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

const WEEK = "2026-11-09";

describe("saveWeekPlan", () => {
  it("lagrer uka, erstatter det som var der og oppdaterer /ukemeny og /ukemeny/uker", async () => {
    const first = await saveWeekPlan({
      week: WEEK,
      items: [
        { recipeId, day: "2026-11-10", servings: 3 },
        { recipeId, day: "2026-11-12", servings: 2 },
      ],
    });
    expect(first).toEqual({ ok: true });
    expect(stored()).toEqual(["2026-11-10 3", "2026-11-12 2"]);
    expect(revalidatePath).toHaveBeenCalledWith("/ukemeny");
    expect(revalidatePath).toHaveBeenCalledWith("/ukemeny/uker");
    expect(
      await saveWeekPlan({ week: WEEK, items: [{ recipeId, day: WEEK, servings: 4 }] }),
    ).toEqual({ ok: true });
    expect(stored()).toEqual(["2026-11-09 4"]);
    expect(await saveWeekPlan({ week: WEEK, items: [] })).toEqual({ ok: true });
    expect(stored()).toEqual([]);
  });

  it("gir en egen melding for ugyldig antall", async () => {
    expect(
      await saveWeekPlan({ week: WEEK, items: [{ recipeId, day: WEEK, servings: 51 }] }),
    ).toEqual({ ok: false, message: "Velg mellom 0,5 og 50 porsjoner." });
    expect(stored()).toEqual([]);
  });

  it("avviser feil typer, ukjent oppskrift, dag utenfor uka og ugyldig uke", async () => {
    for (const input of [
      null,
      "x",
      { week: WEEK, items: "x" },
      { week: 5, items: [] },
      { week: WEEK, items: [{ recipeId: "1", day: WEEK, servings: 3 }] },
      { week: WEEK, items: [{ recipeId: 999, day: WEEK, servings: 3 }] },
      { week: WEEK, items: [{ recipeId, day: "2026-11-16", servings: 3 }] },
      { week: "2026-02-30", items: [] },
    ]) {
      const result = await saveWeekPlan(input as never);
      expect(result.ok).toBe(false);
    }
    expect(stored()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("beholder den gamle uka når noe i den nye er ugyldig", async () => {
    await saveWeekPlan({ week: WEEK, items: [{ recipeId, day: WEEK, servings: 4 }] });
    const result = await saveWeekPlan({
      week: WEEK,
      items: [
        { recipeId, day: WEEK, servings: 2 },
        { recipeId: 999, day: WEEK, servings: 2 },
      ],
    });
    expect(result.ok).toBe(false);
    expect(stored()).toEqual(["2026-11-09 4"]);
  });

  it("krever innlogging", async () => {
    session.userId = null;
    const result = await saveWeekPlan({
      week: WEEK,
      items: [{ recipeId, day: WEEK, servings: 3 }],
    });
    expect(result.ok).toBe(false);
    expect(stored()).toEqual([]);
  });

  it("gir en generell melding og logger når databasen feiler", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    state.db = null;
    const result = await saveWeekPlan({ week: WEEK, items: [] });
    expect(result.ok).toBe(false);
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
