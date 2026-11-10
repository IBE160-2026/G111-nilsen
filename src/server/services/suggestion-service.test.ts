import { beforeEach, describe, expect, it, vi } from "vitest";
import { appError, err, ok } from "@/lib/result";
import { createTestDb, type Db } from "../db/client";
import type { SuggestionProvider } from "../ports/suggestion-provider";
import { createManualRecipe } from "./recipe-service";
import { getSuggestions, providerFor } from "./suggestion-service";

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
  it("gir en leverandør for begge moduser (mock til språkmodell-adapteren kommer)", async () => {
    for (const mode of ["mock", "llm"] as const) {
      const created = createManualRecipe(
        { title: "Suppe", servings: 2, ingredients: ["1 løk"], steps: ["Kok."] },
        db,
      );
      if (!created.ok) throw new Error("kunne ikke lage oppskrift");
      const result = await getSuggestions(created.value.id, db, providerFor(mode));
      expect(result.ok && result.value.isExample).toBe(true);
    }
  });
});
