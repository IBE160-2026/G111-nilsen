import { describe, expect, it } from "vitest";
import { SUGGESTION_LIMITS, suggestionSchema, suggestionsSchema } from "./suggestion-provider";

const valid = { text: "Tilsett sitron.", reason: "Gir friskhet.", appliesTo: "recipe" };

describe("suggestionSchema", () => {
  it.each(["ingredients", "steps", "recipe"])("godtar appliesTo «%s»", (appliesTo) => {
    expect(suggestionSchema.safeParse({ ...valid, appliesTo }).success).toBe(true);
  });

  it("avviser ukjent appliesTo, manglende felt og feil typer", () => {
    expect(suggestionSchema.safeParse({ ...valid, appliesTo: "alt" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ text: "a", reason: "b" }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, reason: undefined }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, text: 5 }).success).toBe(false);
    expect(suggestionSchema.safeParse(null).success).toBe(false);
    expect(suggestionSchema.safeParse("forslag").success).toBe(false);
  });

  it("trimmer tekst og avviser tom eller for lang tekst", () => {
    expect(suggestionSchema.parse({ ...valid, text: "  Hei  " }).text).toBe("Hei");
    expect(suggestionSchema.safeParse({ ...valid, text: "   " }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, reason: "" }).success).toBe(false);
    const longText = "a".repeat(SUGGESTION_LIMITS.textLength + 1);
    const longReason = "a".repeat(SUGGESTION_LIMITS.reasonLength + 1);
    expect(suggestionSchema.safeParse({ ...valid, text: longText }).success).toBe(false);
    expect(suggestionSchema.safeParse({ ...valid, reason: longReason }).success).toBe(false);
    const atLimit = "a".repeat(SUGGESTION_LIMITS.textLength);
    expect(suggestionSchema.safeParse({ ...valid, text: atLimit }).success).toBe(true);
  });

  it("fjerner ukjente felt", () => {
    expect(suggestionSchema.parse({ ...valid, extra: "x" })).toEqual(valid);
  });
});

describe("suggestionsSchema", () => {
  it("godtar 1–3 forslag", () => {
    for (const n of [1, 2, 3]) {
      expect(suggestionsSchema.safeParse(Array.from({ length: n }, () => valid)).success).toBe(
        true,
      );
    }
  });

  it("avviser ingen, fire eller flere, og alt som ikke er en liste", () => {
    expect(suggestionsSchema.safeParse([]).success).toBe(false);
    expect(suggestionsSchema.safeParse(Array.from({ length: 4 }, () => valid)).success).toBe(false);
    expect(suggestionsSchema.safeParse(valid).success).toBe(false);
    expect(suggestionsSchema.safeParse(undefined).success).toBe(false);
  });

  it("avviser hele listen når ett element er ugyldig", () => {
    expect(suggestionsSchema.safeParse([valid, { ...valid, appliesTo: "x" }]).success).toBe(false);
  });
});
