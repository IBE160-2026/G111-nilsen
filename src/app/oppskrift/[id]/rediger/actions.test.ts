import { beforeEach, describe, expect, it, vi } from "vitest";
import { initialManualRecipeState } from "@/components/ManualRecipeForm";
import { manualRecipeFieldMessages as m, messageFor } from "@/lib/messages";
import { createTestDb, type Db, TEST_USER_ID } from "@/server/db/client";
import { createManualRecipe, getRecipe } from "@/server/services/recipe-service";

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

class RedirectError extends Error {
  constructor(public url: string) {
    super(`NEXT_REDIRECT ${url}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new RedirectError(url);
  },
}));

const { saveRecipeEdits } = await import("./actions");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

const valid = {
  title: "Vafler",
  servings: "6",
  ingredients: "1 ts salt\n4 egg",
  steps: "Rør.",
};

let id: number;

function stored() {
  const result = getRecipe(id, state.db!);
  if (!result.ok) throw new Error("fant ikke oppskriften");
  return result.value;
}

beforeEach(() => {
  state.db = createTestDb();
  const created = createManualRecipe(
    TEST_USER_ID,
    {
      title: "Pannekaker",
      servings: 4,
      ingredients: ["0,5 ts salt", "3 egg"],
      steps: ["Visp.", "Tips: bruk smør."],
    },
    state.db,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  id = created.value.id;
});

beforeEach(() => revalidatePath.mockClear());

describe("saveRecipeEdits", () => {
  it("valideringsfeil: skrevne verdier (ikke de lagrede) kommer tilbake, og lagret oppskrift er uendret", async () => {
    const before = stored();
    const values = { ...valid, title: "Halvskrevet", servings: "x" };
    const result = await saveRecipeEdits(id, initialManualRecipeState, form(values));
    expect(result.values).toEqual(values);
    expect(result.fieldErrors).toEqual({ servings: m.servingsInvalid });
    expect(stored()).toEqual(before);
  });

  it("lagrer endringene og sender brukeren tilbake til /oppskrift/{id}", async () => {
    const error = await saveRecipeEdits(id, initialManualRecipeState, form(valid)).catch((e) => e);
    expect(error).toBeInstanceOf(RedirectError);
    expect((error as RedirectError).url).toBe(`/oppskrift/${id}`);
    expect(stored()).toMatchObject({ title: "Vafler", originalServings: 6 });
    expect(stored().ingredients.map((l) => l.original)).toEqual(["1 ts salt", "4 egg"]);
    expect(stored().steps.map((s) => s.text)).toEqual(["Rør."]);
    // Tittelen står på kort i Samlingen og i mapper; skjulte sider må oppdateres.
    expect(revalidatePath).toHaveBeenCalledExactlyOnceWith("/", "layout");
  });

  it.each([
    ["tittel mangler", { title: "  " }, { title: m.titleRequired }],
    ["ugyldig antall", { servings: "" }, { servings: m.servingsInvalid }],
    ["ingen ingredienser", { ingredients: "\n " }, { ingredients: m.ingredientsRequired }],
  ])("%s: ingenting lagres, verdiene beholdes", async (_, change, errors) => {
    const before = stored();
    const values = { ...valid, ...change };
    const result = await saveRecipeEdits(id, initialManualRecipeState, form(values));
    expect(result).toEqual({ fieldErrors: errors, values });
    expect(stored()).toEqual(before);
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("id som er slettet: melding fra messageFor(not_found), ingenting lagres", async () => {
    state.db!.$client.prepare("delete from recipes where id = ?").run(id);
    const result = await saveRecipeEdits(id, initialManualRecipeState, form(valid));
    const message = messageFor("not_found");
    expect(result).toEqual({
      fieldErrors: {},
      values: valid,
      formError: `${message.title} ${message.body}`,
    });
    expect(state.db!.$client.prepare("select count(*) as n from recipes").get()).toEqual({ n: 0 });
  });

  it("databasefeil: reservemelding, verdiene beholdes og oppskriften er uendret", async () => {
    const before = stored();
    state.db!.$client.exec(
      "create trigger fail_steps before insert on steps begin select raise(abort, 'feil'); end",
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await saveRecipeEdits(id, initialManualRecipeState, form(valid));
    spy.mockRestore();
    expect(result.values).toEqual(valid);
    expect(result.formError).toMatch(/^Noe gikk galt\./);
    expect(stored()).toEqual(before);
  });
});
