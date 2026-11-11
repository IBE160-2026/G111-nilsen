import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { listCollection } from "@/server/services/recipe-service";

const session = vi.hoisted(() => ({ userId: 1 as number | null }));
vi.mock("@/server/session", () => ({ currentUserId: async () => session.userId }));
const state = vi.hoisted(() => ({ db: null as Db | null }));
vi.mock("@/server/db/client", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/db/client")>();
  return { ...actual, getDb: () => state.db! };
});
const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const { importBackupFile } = await import("./actions");

const recipe = {
  title: "Pannekaker",
  sourceUrl: null,
  sourceName: null,
  originalServings: 4,
  totalMinutes: null,
  isFavorite: false,
  notes: null,
  fitsFor: null,
  rating: null,
  cookedCount: 0,
  lastCookedAt: null,
  folder: null,
  labels: [],
  ingredients: [{ section: null, text: "3 egg" }],
  steps: [],
};
const backup = { format: "recipemate-backup", version: 1, recipes: [recipe] };

function form(content: string | null, name = "fil.json") {
  const data = new FormData();
  if (content !== null) data.set("file", new File([content], name, { type: "application/json" }));
  return data;
}
const idle = { status: "idle" } as const;

beforeEach(() => {
  vi.restoreAllMocks();
  revalidatePath.mockClear();
  session.userId = TEST_USER_ID;
  state.db = createTestDb();
});

describe("importBackupFile", () => {
  it("importerer filen, revaliderer og melder hvor mange", async () => {
    const result = await importBackupFile(idle, form(JSON.stringify(backup)));
    expect(result).toEqual({ status: "ok", message: "1 oppskrift ble lagt til." });
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
    const all = listCollection(TEST_USER_ID, state.db!);
    expect(all.ok && all.value.map((r) => r.title)).toEqual(["Pannekaker"]);
  });

  it("melder at oppskrifter som fantes fra før ble hoppet over", async () => {
    await importBackupFile(idle, form(JSON.stringify(backup)));
    const again = await importBackupFile(idle, form(JSON.stringify(backup)));
    expect(again).toEqual({
      status: "ok",
      message: "0 oppskrifter ble lagt til, 1 fantes fra før og ble hoppet over.",
    });
  });

  it("ber om en fil når ingen er valgt eller filen er tom", async () => {
    expect(await importBackupFile(idle, form(null))).toMatchObject({
      status: "error",
      message: "Velg en fil først.",
    });
    expect(await importBackupFile(idle, form(""))).toMatchObject({
      status: "error",
      message: "Velg en fil først.",
    });
  });

  it("avviser en for stor fil", async () => {
    const result = await importBackupFile(idle, form("x".repeat(5 * 1024 * 1024 + 1)));
    expect(result).toMatchObject({ status: "error", message: expect.stringContaining("for stor") });
  });

  it("avviser tekst som ikke er JSON, og feil format, uten å lagre noe", async () => {
    for (const content of ["ikke json", JSON.stringify({ format: "annet" })]) {
      expect(await importBackupFile(idle, form(content))).toMatchObject({
        status: "error",
        message: expect.stringContaining("kunne ikke leses"),
      });
    }
    const all = listCollection(TEST_USER_ID, state.db!);
    expect(all.ok && all.value).toHaveLength(0);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("krever innlogging", async () => {
    session.userId = null;
    const result = await importBackupFile(idle, form(JSON.stringify(backup)));
    expect(result.status).toBe("error");
    expect(result.status === "error" && result.message).toMatch(/logg inn/i);
  });

  it("gir reservemeldingen ved databasefeil", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    state.db!.$client.close();
    const result = await importBackupFile(idle, form(JSON.stringify(backup)));
    expect(result.status).toBe("error");
  });
});
