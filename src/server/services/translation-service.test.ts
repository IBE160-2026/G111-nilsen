import { beforeEach, describe, expect, it, vi } from "vitest";
import { appError, err, ok } from "@/lib/result";
import { createTestDb, type Db, TEST_USER_ID } from "../db/client";
import type { TranslationProvider } from "../ports/translation-provider";
import { createManualRecipe, getRecipe } from "./recipe-service";
import {
  removeTranslation,
  setTranslationView,
  translateRecipe,
  translationProviderFor,
} from "./translation-service";

let db: Db;
let id: number;

const good = {
  title: "Kanelboller",
  ingredients: ["4,7 dl mel", "2,4 dl sukker"],
  steps: ["Bland mel og sukker."],
  sections: { Dough: "Deig" },
};

const providerReturning = (value: unknown): TranslationProvider => ({
  translate: async () => ok(value),
});

beforeEach(() => {
  db = createTestDb();
  const created = createManualRecipe(
    TEST_USER_ID,
    {
      title: "Cinnamon rolls",
      servings: 12,
      ingredients: ["Dough:", "2 cups flour", "1 cup sugar"],
      steps: ["Mix flour and sugar."],
    },
    db,
  );
  if (!created.ok) throw new Error("kunne ikke lagre");
  id = created.value.id;
});

const stored = () => {
  const recipe = getRecipe(id, db);
  if (!recipe.ok) throw new Error("mangler");
  return recipe.value;
};

describe("translateRecipe", () => {
  it("lagrer og returnerer den norske versjonen, og originalen er uendret", async () => {
    const result = await translateRecipe(id, db, providerReturning(good));
    expect(result).toEqual({ ok: true, value: { ...good, active: true } });
    const recipe = stored();
    expect(recipe.translation).toEqual({ ...good, active: true });
    expect(recipe.title).toBe("Cinnamon rolls");
    expect(recipe.ingredients.map((l) => l.original)).toEqual(["2 cups flour", "1 cup sugar"]);
  });

  it("uten leverandør (ingen nøkkel) er oversettelse ikke slått på", async () => {
    expect(await translateRecipe(id, db, null)).toEqual({
      ok: false,
      error: { kind: "translation_unavailable" },
    });
    expect(stored().translation).toBeNull();
  });

  it("ukjent oppskrift gir not_found", async () => {
    expect(await translateRecipe(999, db, providerReturning(good))).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  it.each([
    ["feil antall ingredienser", { ...good, ingredients: ["4,7 dl mel"] }],
    ["feil antall steg", { ...good, steps: [] }],
    ["manglende tittel", { ...good, title: "" }],
    ["ikke et objekt", "hei"],
  ])("avviser ugyldig svar: %s", async (_name, value) => {
    expect(await translateRecipe(id, db, providerReturning(value))).toEqual({
      ok: false,
      error: { kind: "translation_failed", detail: "invalid_response" },
    });
    expect(stored().translation).toBeNull();
  });

  it("feil og kast fra leverandøren gir translation_failed", async () => {
    const failing: TranslationProvider = {
      translate: async () => err(appError("translation_failed", "timeout")),
    };
    expect(await translateRecipe(id, db, failing)).toEqual({
      ok: false,
      error: { kind: "translation_failed", detail: "timeout" },
    });
    const throwing: TranslationProvider = {
      translate: vi.fn().mockRejectedValue(new Error("boom")),
    };
    expect(await translateRecipe(id, db, throwing)).toEqual({
      ok: false,
      error: { kind: "translation_failed", detail: "provider_threw" },
    });
  });

  it("en ny oversettelse erstatter den gamle", async () => {
    await translateRecipe(id, db, providerReturning(good));
    await translateRecipe(id, db, providerReturning({ ...good, title: "Boller" }));
    expect(stored().translation?.title).toBe("Boller");
  });
});

describe("setTranslationView og removeTranslation", () => {
  it("bytter mellom original og norsk, og fjerner oversettelsen", async () => {
    expect(setTranslationView(id, false, db)).toEqual({ ok: false, error: { kind: "not_found" } });
    await translateRecipe(id, db, providerReturning(good));
    expect(setTranslationView(id, false, db)).toEqual({ ok: true, value: { id } });
    expect(stored().translation?.active).toBe(false);
    expect(setTranslationView(id, true, db).ok).toBe(true);
    expect(stored().translation?.active).toBe(true);
    expect(removeTranslation(id, db)).toEqual({ ok: true, value: { id } });
    expect(stored().translation).toBeNull();
    expect(removeTranslation(id, db).ok).toBe(false);
  });
});

describe("translationProviderFor", () => {
  it("gir null uten nøkkel og en leverandør med nøkkel", () => {
    expect(translationProviderFor({ llmApiKey: undefined, llmModel: undefined })).toBeNull();
    const provider = translationProviderFor({ llmApiKey: "k", llmModel: undefined });
    expect(provider).not.toBeNull();
    expect(translationProviderFor({ llmApiKey: "k", llmModel: undefined })).toBe(provider);
  });
});
