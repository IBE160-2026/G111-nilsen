import { beforeEach, describe, expect, it, vi } from "vitest";
import { appError, err, ok } from "@/lib/result";
import { createTestDb, type Db } from "../db/client";
import type { SuggestionProvider } from "../ports/suggestion-provider";
import { createManualRecipe } from "./recipe-service";
import { getRecipe } from "./recipe-service";
import {
  applySuggestion,
  getSuggestions,
  providerFor,
  removeAppliedSuggestion,
} from "./suggestion-service";

let db: Db;
let id: number;

const valid = [{ text: "Tilsett sitron.", reason: "Gir friskhet.", appliesTo: "recipe" }];

function providerReturning(value: unknown, isExample: unknown = false): SuggestionProvider {
  return { suggest: async () => ok({ suggestions: value, isExample: isExample as boolean }) };
}

beforeEach(() => {
  db = createTestDb();
  const created = createManualRecipe(
    { title: "Pannekaker", servings: 4, ingredients: ["3 egg"], steps: ["Visp."] },
    db,
  );
  if (!created.ok) throw new Error("kunne ikke lage oppskrift");
  id = created.value.id;
});

describe("getSuggestions", () => {
  it("gir validerte forslag og isExample fra leverandøren", async () => {
    expect(await getSuggestions(id, db, providerReturning(valid, true))).toEqual({
      ok: true,
      value: { suggestions: valid, isExample: true },
    });
    const real = await getSuggestions(id, db, providerReturning(valid, false));
    expect(real.ok && real.value.isExample).toBe(false);
  });

  it("fjerner ukjente felt i forslagene", async () => {
    const result = await getSuggestions(id, db, providerReturning([{ ...valid[0], ekstra: 1 }]));
    expect(result).toEqual({ ok: true, value: { suggestions: valid, isExample: false } });
  });

  it("sender hele oppskriften til leverandøren", async () => {
    const suggest = vi.fn().mockResolvedValue(ok({ suggestions: valid, isExample: true }));
    await getSuggestions(id, db, { suggest });
    expect(suggest).toHaveBeenCalledTimes(1);
    const sent = suggest.mock.calls[0][0];
    expect(sent.id).toBe(id);
    expect(sent.title).toBe("Pannekaker");
    expect(sent.ingredients).toHaveLength(1);
    expect(sent.steps).toHaveLength(1);
  });

  it("gir not_found for ukjent oppskrift uten å spørre leverandøren", async () => {
    const suggest = vi.fn();
    expect(await getSuggestions(9999, db, { suggest })).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(await getSuggestions(0, db, { suggest })).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(suggest).not.toHaveBeenCalled();
  });

  it.each([
    ["ingen forslag", []],
    ["fire forslag", Array.from({ length: 4 }, () => valid[0])],
    ["feil form", { text: "a" }],
    ["manglende begrunnelse", [{ text: "a", appliesTo: "recipe" }]],
    ["ukjent appliesTo", [{ ...valid[0], appliesTo: "alt" }]],
    ["tekst i stedet for liste", "forslag"],
    ["undefined", undefined],
  ])("avviser ugyldig svar (%s) med suggestion_failed", async (_name, value) => {
    expect(await getSuggestions(id, db, providerReturning(value))).toEqual({
      ok: false,
      error: { kind: "suggestion_failed", detail: "invalid_response" },
    });
  });

  it("avviser svar der isExample ikke er boolsk", async () => {
    const result = await getSuggestions(id, db, providerReturning(valid, "ja"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe("suggestion_failed");
  });

  it("gir suggestion_failed når leverandøren feiler", async () => {
    const provider: SuggestionProvider = {
      suggest: async () => err(appError("suggestion_failed", "timeout")),
    };
    expect(await getSuggestions(id, db, provider)).toEqual({
      ok: false,
      error: { kind: "suggestion_failed", detail: "timeout" },
    });
  });

  it("gir suggestion_failed når leverandøren kaster", async () => {
    const provider: SuggestionProvider = {
      suggest: async () => {
        throw new Error("brå stopp");
      },
    };
    expect(await getSuggestions(id, db, provider)).toEqual({
      ok: false,
      error: { kind: "suggestion_failed", detail: "provider_threw" },
    });
  });

  it("gir eksempelforslag med standardleverandøren, uten nøkkel", async () => {
    const result = await getSuggestions(id, db);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.isExample).toBe(true);
    expect(result.value.suggestions.length).toBeGreaterThanOrEqual(1);
    expect(result.value.suggestions.length).toBeLessThanOrEqual(3);
  });
});

describe("providerFor", () => {
  it("gir mock-leverandøren uten nøkkel, også hvis modus sier llm", async () => {
    for (const mode of ["mock", "llm"] as const) {
      const provider = providerFor(mode, { llmApiKey: undefined, llmModel: undefined });
      const result = await getSuggestions(id, db, provider);
      expect(result.ok && result.value.isExample).toBe(true);
    }
  });

  it("gir mock i modus mock selv om en nøkkel er satt", async () => {
    const provider = providerFor("mock", { llmApiKey: "test-key", llmModel: undefined });
    const result = await getSuggestions(id, db, provider);
    expect(result.ok && result.value.isExample).toBe(true);
  });

  it("gir språkmodell-leverandøren med nøkkel, og samme objekt for samme innstillinger", () => {
    const settings = { llmApiKey: "test-key", llmModel: "test-modell" };
    const a = providerFor("llm", settings);
    expect(providerFor("llm", settings)).toBe(a);
    expect(providerFor("llm", { ...settings, llmModel: "annen" })).not.toBe(a);
  });
});

describe("applySuggestion (Story 4.2)", () => {
  const suggestion = valid[0];
  const at = () => new Date("2026-11-10T09:00:00.000Z");

  it("lagrer forslaget med oppskriften og gir det tilbake med id", () => {
    const result = applySuggestion(id, suggestion, db, at);
    expect(result).toEqual({ ok: true, value: { id: expect.any(Number), ...suggestion } });
    const recipe = getRecipe(id, db);
    expect(recipe.ok && recipe.value.suggestions).toEqual([result.ok && result.value]);
  });

  it("endrer ikke ingredienser, steg, valgt antall eller updatedAt", () => {
    const before = getRecipe(id, db);
    applySuggestion(id, suggestion, db, at);
    const after = getRecipe(id, db);
    if (!before.ok || !after.ok) throw new Error("fant ikke oppskriften");
    expect(after.value.ingredients).toEqual(before.value.ingredients);
    expect(after.value.steps).toEqual(before.value.steps);
    expect(after.value.updatedAt).toBe(before.value.updatedAt);
    expect(after.value.selectedServings).toBe(before.value.selectedServings);
  });

  it("samme forslag to ganger gir samme rad", () => {
    const first = applySuggestion(id, suggestion, db, at);
    const again = applySuggestion(id, { ...suggestion }, db, at);
    expect(again).toEqual(first);
    const recipe = getRecipe(id, db);
    expect(recipe.ok && recipe.value.suggestions).toHaveLength(1);
  });

  it("trimmer teksten og fjerner ukjente felt", () => {
    const result = applySuggestion(
      id,
      { ...suggestion, text: "  Tilsett sitron.  ", ekstra: 1 },
      db,
    );
    expect(result).toEqual({ ok: true, value: { id: expect.any(Number), ...suggestion } });
  });

  it.each([
    ["ingenting", undefined],
    ["tekst", "forslag"],
    ["tom tekst", { ...valid[0], text: "  " }],
    ["manglende begrunnelse", { text: "a", appliesTo: "recipe" }],
    ["ukjent appliesTo", { ...valid[0], appliesTo: "alt" }],
    ["for lang tekst", { ...valid[0], text: "a".repeat(301) }],
  ])("avviser ugyldig forslag (%s) med validation, og lagrer ingenting", (_name, input) => {
    expect(applySuggestion(id, input, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "suggestion" },
    });
    const recipe = getRecipe(id, db);
    expect(recipe.ok && recipe.value.suggestions).toEqual([]);
  });

  it("gir not_found for ukjent oppskrift", () => {
    expect(applySuggestion(9999, suggestion, db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(applySuggestion(0, suggestion, db)).toEqual({ ok: false, error: { kind: "not_found" } });
  });
});

describe("removeAppliedSuggestion (Story 4.2)", () => {
  it("sletter forslaget fra oppskriften", () => {
    const applied = applySuggestion(id, valid[0], db);
    if (!applied.ok) throw new Error("kunne ikke ta i bruk");
    expect(removeAppliedSuggestion(id, applied.value.id, db)).toEqual({
      ok: true,
      value: { id: applied.value.id },
    });
    const recipe = getRecipe(id, db);
    expect(recipe.ok && recipe.value.suggestions).toEqual([]);
  });

  it.each([9999, 0, -1, 1.5, NaN])("ukjent eller ugyldig id %s gir not_found", (bad) => {
    applySuggestion(id, valid[0], db);
    expect(removeAppliedSuggestion(id, bad, db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
    const recipe = getRecipe(id, db);
    expect(recipe.ok && recipe.value.suggestions).toHaveLength(1);
  });

  it("sletter ikke et forslag som hører til en annen oppskrift", () => {
    const applied = applySuggestion(id, valid[0], db);
    if (!applied.ok) throw new Error("kunne ikke ta i bruk");
    expect(removeAppliedSuggestion(id + 1, applied.value.id, db).ok).toBe(false);
    const recipe = getRecipe(id, db);
    expect(recipe.ok && recipe.value.suggestions).toHaveLength(1);
  });
});
