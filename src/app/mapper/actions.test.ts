import { beforeEach, describe, expect, it, vi } from "vitest";
import { messageFor } from "@/lib/messages";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { listFolders } from "@/server/services/folder-service";

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

const revalidatePath = vi.hoisted(() => vi.fn());
vi.mock("next/cache", () => ({ revalidatePath }));

const { createFolder, deleteFolder, renameFolder } = await import("./actions");

const failure = (kind: string | undefined) => {
  const message = messageFor(kind);
  return { ok: false, message: `${message.title} ${message.body}` };
};
const nameError = (message: string) => ({ ok: false, field: "name", message });

function folders() {
  const result = listFolders(TEST_USER_ID, state.db!);
  if (!result.ok) throw new Error("kunne ikke liste mapper");
  return result.value;
}

function breakDatabase() {
  vi.spyOn(console, "error").mockImplementation(() => {});
  state.db!.$client.close();
}

beforeEach(() => {
  vi.restoreAllMocks();
  revalidatePath.mockClear();
  state.db = createTestDb();
});

describe("createFolder", () => {
  it("oppretter mappen og revaliderer hele appen (layout)", async () => {
    expect(await createFolder("Hverdag")).toEqual({ ok: true, id: 1 });
    expect(folders()).toEqual([{ id: 1, name: "Hverdag", recipeCount: 0 }]);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it("lagrer navnet trimmet og med blanke tegn slått sammen", async () => {
    await createFolder("  Ny   helg  ");
    expect(folders()[0].name).toBe("Ny helg");
  });

  it.each([
    ["", "Skriv et navn på mappen."],
    ["   ", "Skriv et navn på mappen."],
    ["a".repeat(41), "Navnet kan være maks 40 tegn. Gjør det kortere."],
    ["🍝".repeat(41), "Navnet kan være maks 40 tegn. Gjør det kortere."],
  ])("%j gir melding under feltet, og ingenting lagres", async (name, message) => {
    expect(await createFolder(name)).toEqual(nameError(message));
    expect(folders()).toEqual([]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("40 emoji godtas", async () => {
    expect((await createFolder("🍝".repeat(40))).ok).toBe(true);
  });

  it.each([
    ["hverdag", "Hverdag"],
    ["ÆRLIG", "ærlig"],
  ])(
    "«%s» når «%s» finnes: «Du har allerede en mappe med dette navnet.»",
    async (taken, existing) => {
      await createFolder(existing);
      revalidatePath.mockClear();
      expect(await createFolder(taken)).toEqual(
        nameError("Du har allerede en mappe med dette navnet."),
      );
      expect(folders()).toHaveLength(1);
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it.each([undefined, null, 5, {}])("ikke-tekst %j gir melding under feltet", async (bad) => {
    expect(await createFolder(bad as unknown as string)).toMatchObject({
      ok: false,
      field: "name",
    });
    expect(folders()).toEqual([]);
  });

  it("databasefeil: reservemelding fra messageFor(undefined), feilen logges, ingen revalidering", async () => {
    breakDatabase();
    expect(await createFolder("Hverdag")).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("renameFolder", () => {
  beforeEach(async () => {
    await createFolder("Hverdag");
    await createFolder("Helg");
    revalidatePath.mockClear();
  });

  it("gir nytt navn og revaliderer", async () => {
    expect(await renameFolder(1, "Hverdagsmat")).toEqual({ ok: true });
    expect(folders().map((f) => f.name)).toEqual(["Helg", "Hverdagsmat"]);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it("endre bare store og små bokstaver godtas", async () => {
    expect(await renameFolder(1, "HVERDAG")).toEqual({ ok: true });
    expect(folders().map((f) => f.name)).toContain("HVERDAG");
  });

  it("navnet til en annen mappe: melding under feltet, ingenting endres", async () => {
    expect(await renameFolder(1, "helg")).toEqual(
      nameError("Du har allerede en mappe med dette navnet."),
    );
    expect(folders().map((f) => f.name)).toEqual(["Helg", "Hverdag"]);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("tomt navn og for langt navn gir melding under feltet", async () => {
    expect(await renameFolder(1, " ")).toEqual(nameError("Skriv et navn på mappen."));
    expect(await renameFolder(1, "a".repeat(41))).toMatchObject({ ok: false, field: "name" });
  });

  it.each([999, 0, -1, 1.5, NaN, 2 ** 53, "1" as unknown as number])(
    "ukjent eller ugyldig id %s: not_found",
    async (bad) => {
      expect(await renameFolder(bad, "Navn")).toEqual(failure("not_found"));
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("databasefeil: reservemelding", async () => {
    breakDatabase();
    expect(await renameFolder(1, "Nytt")).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
  });
});

describe("deleteFolder", () => {
  it("sletter mappen og revaliderer", async () => {
    await createFolder("Hverdag");
    revalidatePath.mockClear();
    expect(await deleteFolder(1)).toEqual({ ok: true });
    expect(folders()).toEqual([]);
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it("slettet i en annen fane: not_found", async () => {
    expect(await deleteFolder(1)).toEqual(failure("not_found"));
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it.each([0, -1, 1.5, NaN, 2 ** 53])("ugyldig id %s: not_found", async (bad) => {
    expect(await deleteFolder(bad)).toEqual(failure("not_found"));
  });

  it("databasefeil: reservemelding", async () => {
    breakDatabase();
    expect(await deleteFolder(1)).toEqual(failure(undefined));
    expect(console.error).toHaveBeenCalled();
  });
});
