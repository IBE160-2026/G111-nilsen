import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { createManualRecipe } from "@/server/services/recipe-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({ currentUserId: async () => session.userId }));
const state = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});

const { GET } = await import("./route");

beforeEach(() => {
  session.userId = TEST_USER_ID;
  state.db = createTestDb();
});

describe("GET /sikkerhetskopi/eksport", () => {
  it("gir en JSON-fil til nedlasting uten mellomlager", async () => {
    createManualRecipe(
      TEST_USER_ID,
      { title: "Pannekaker", servings: 4, ingredients: ["3 egg"], steps: ["Visp."] },
      state.db!,
    );
    const response = await GET();
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Disposition")).toMatch(
      /^attachment; filename="recipemate-oppskrifter-\d{4}-\d{2}-\d{2}\.json"$/,
    );
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    const body = JSON.parse(await response.text());
    expect(body).toMatchObject({ format: "recipemate-backup", version: 1 });
    expect(body.recipes.map((r: { title: string }) => r.title)).toEqual(["Pannekaker"]);
  });

  it("krever innlogging", async () => {
    session.userId = null;
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.text()).toMatch(/logg inn/i);
  });
});
