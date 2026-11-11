import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { listPantry } from "@/server/services/pantry-service";

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

const { addToPantry, clearPantryItems, removeFromPantry } = await import("./actions");

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
