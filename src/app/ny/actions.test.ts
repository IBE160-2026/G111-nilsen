import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestDb, type Db } from "@/server/db/client";
import {
  manualRecipeFieldInvalid,
  manualRecipeFieldMessages as m,
  messageFor,
} from "@/lib/messages";
import { initialManualRecipeState } from "@/components/ManualRecipeForm";

const state = vi.hoisted(() => ({
  db: null as Db | null,
  serviceResult: null as null | { ok: false; error: { kind: "validation"; detail?: string } },
}));

vi.mock("@/server/services/recipe-service", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/services/recipe-service")>();
  return {
    ...actual,
    createManualRecipe: (...args: Parameters<typeof actual.createManualRecipe>) =>
      state.serviceResult ?? actual.createManualRecipe(...args),
  };
});

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

const { saveManualRecipe } = await import("./actions");

function form(values: Record<string, string>): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(values)) data.set(key, value);
  return data;
}

function rows(table: string): number {
  return (state.db!.$client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;
}

const valid = {
  title: "Pannekaker",
  servings: "4",
  ingredients: "3 dl hvetemel\n6 dl melk\n3 egg",
  steps: "Visp sammen.\nStek.",
};

beforeEach(() => {
  state.db = createTestDb();
  state.serviceResult = null;
});

describe("saveManualRecipe", () => {
  it("lagrer og sender brukeren til /oppskrift/{id}", async () => {
    const error = await saveManualRecipe(initialManualRecipeState, form(valid)).catch((e) => e);
    expect(error).toBeInstanceOf(RedirectError);
    const id = state.db!.$client.prepare("select id from recipes").get() as { id: number };
    expect((error as RedirectError).url).toBe(`/oppskrift/${id.id}`);
    expect(rows("ingredient_lines")).toBe(3);
    expect(rows("steps")).toBe(2);
  });

  it.each([
    ["tittel mangler", { title: "  " }, { title: m.titleRequired }],
    ["ugyldig antall", { servings: "2,5" }, { servings: m.servingsInvalid }],
    ["ingen ingredienser", { ingredients: "\n \n" }, { ingredients: m.ingredientsRequired }],
    ["for langt steg", { steps: "a".repeat(2001) }, { steps: m.stepTooLong }],
  ])("%s: lagrer 0 rader og returnerer feil og skrevne verdier", async (_, change, errors) => {
    const values = { ...valid, ...change };
    const result = await saveManualRecipe(initialManualRecipeState, form(values));
    expect(result).toEqual({ fieldErrors: errors, values });
    expect(rows("recipes")).toBe(0);
    expect(rows("ingredient_lines")).toBe(0);
    expect(rows("steps")).toBe(0);
  });

  it("behandler manglende felt som tomme", async () => {
    const result = await saveManualRecipe(initialManualRecipeState, new FormData());
    expect(result.values).toEqual({ title: "", servings: "", ingredients: "", steps: "" });
    expect(Object.keys(result.fieldErrors)).toEqual(["title", "servings", "ingredients"]);
    expect(rows("recipes")).toBe(0);
  });

  it("gir reservemelding og beholder verdiene når lagringen feiler uventet", async () => {
    state.db!.$client.close();
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const result = await saveManualRecipe(initialManualRecipeState, form(valid));
    expect(result.values).toEqual(valid);
    expect(result.fieldErrors).toEqual({});
    expect(result.formError).toMatch(/^Noe gikk galt\./);
    spy.mockRestore();
  });

  it.each(["title", "servings", "ingredients", "steps"] as const)(
    "validation fra tjenesten med detail %s blir feltfeil for det feltet",
    async (field) => {
      state.serviceResult = { ok: false, error: { kind: "validation", detail: field } };
      const result = await saveManualRecipe(initialManualRecipeState, form(valid));
      expect(result).toEqual({
        fieldErrors: { [field]: manualRecipeFieldInvalid[field] },
        values: valid,
      });
    },
  );

  it("validation uten kjent felt blir skjemafeil", async () => {
    state.serviceResult = { ok: false, error: { kind: "validation", detail: "ukjent" } };
    const result = await saveManualRecipe(initialManualRecipeState, form(valid));
    const message = messageFor("validation");
    expect(result).toEqual({
      fieldErrors: {},
      values: valid,
      formError: `${message.title} ${message.body}`,
    });
  });
});
