import { describe, expect, it } from "vitest";
import { parseLine } from "@/domain";
import { createTestDb } from "../db/client";
import { insertRecipe } from "../db/repositories/recipe-repository";
import {
  createManualRecipe,
  getRecipe,
  listCollection,
  updateManualRecipe,
  type ManualRecipeInput,
} from "./recipe-service";

const input: ManualRecipeInput = {
  title: "Pannekaker",
  servings: 4,
  ingredients: ["3 dl hvetemel", "6 dl melk", "3 egg"],
  steps: ["Visp sammen.", "Stek tynne pannekaker."],
};

function count(db: ReturnType<typeof createTestDb>, table: string): number {
  return (db.$client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;
}

function saveAndRead(values: Partial<ManualRecipeInput>) {
  const db = createTestDb();
  const created = createManualRecipe({ ...input, ...values }, db);
  if (!created.ok) throw new Error(`forventet ok, fikk ${created.error.kind}`);
  const read = getRecipe(created.value.id, db);
  if (!read.ok) throw new Error("fant ikke oppskriften");
  return read.value;
}

describe("recipe-service", () => {
  it("Gyldig: lagrer tittel, antall, tolkede linjer og steg", () => {
    const recipe = saveAndRead({});
    expect(recipe).toMatchObject({
      title: "Pannekaker",
      originalServings: 4,
      sourceName: null,
      sourceUrl: null,
    });
    expect(recipe.ingredients.map((l) => [l.original, l.quantity, l.unit, l.name])).toEqual([
      ["3 dl hvetemel", { min: 3 }, "dl", "hvetemel"],
      ["6 dl melk", { min: 6 }, "dl", "melk"],
      ["3 egg", { min: 3 }, null, "egg"],
    ]);
    expect(recipe.ingredients.map((l) => l.position)).toEqual([0, 1, 2]);
    expect(recipe.steps.map((s) => s.text)).toEqual(["Visp sammen.", "Stek tynne pannekaker."]);
  });

  it("lagres rett i samlingen: savedAt = createdAt = updatedAt (ISO i UTC)", () => {
    const recipe = saveAndRead({});
    expect(recipe.savedAt).toBe(recipe.createdAt);
    expect(recipe.createdAt).toMatch(/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/);
    expect(recipe.updatedAt).toBe(recipe.createdAt);
  });

  it("Tomme linjer: trimmes og fjernes, rekkefølgen beholdes", () => {
    const recipe = saveAndRead({
      title: "  Pannekaker ",
      ingredients: ["  2 egg ", "", "   ", "1 dl melk"],
      steps: [" ", " Rør "],
    });
    expect(recipe.title).toBe("Pannekaker");
    expect(recipe.ingredients.map((l) => l.original)).toEqual(["2 egg", "1 dl melk"]);
    expect(recipe.steps.map((s) => s.text)).toEqual(["Rør"]);
  });

  it("Utolkbar linje: lagres med parseable = false og originaltekst", () => {
    const [line] = saveAndRead({ ingredients: ["salt og pepper"] }).ingredients;
    expect(line).toMatchObject({
      original: "salt og pepper",
      parseable: false,
      quantity: null,
      unit: null,
    });
  });

  it("Mengde uten navn: «2 ss» lagres med tomt navn og parseable = true", () => {
    const [line] = saveAndRead({ ingredients: ["2 ss"] }).ingredients;
    expect(line).toMatchObject({ name: "", parseable: true, quantity: { min: 2 }, unit: "ss" });
  });

  it("Uten steg: lagres", () => {
    expect(saveAndRead({ steps: [] }).steps).toEqual([]);
  });

  it("avviser input uten tittel eller ingredienser, og lagrer ingenting", () => {
    const db = createTestDb();
    expect(createManualRecipe({ ...input, title: "  " }, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "title" },
    });
    expect(createManualRecipe({ ...input, ingredients: [" "] }, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "ingredients" },
    });
    expect(createManualRecipe({ ...input, servings: 0 }, db).ok).toBe(false);
    expect(count(db, "recipes")).toBe(0);
  });

  it.each<[string, Partial<ManualRecipeInput>, string]>([
    ["tittel over 200 tegn", { title: "a".repeat(201) }, "title"],
    ["antall over 50", { servings: 51 }, "servings"],
    ["antall som ikke er heltall", { servings: 2.5 }, "servings"],
    ["over 100 ingredienslinjer", { ingredients: Array(101).fill("1 egg") }, "ingredients"],
    ["ingredienslinje over 300 tegn", { ingredients: ["a".repeat(301)] }, "ingredients"],
    ["over 100 steg", { steps: Array(101).fill("Rør") }, "steps"],
    ["steg over 2000 tegn", { steps: ["a".repeat(2001)] }, "steps"],
    [
      "linjeskift inne i en linje teller som flere linjer",
      { steps: [Array(101).fill("Rør").join("\n")] },
      "steps",
    ],
  ])("håndhever grensene: %s gir validation med feltnavn", (_, change, field) => {
    const db = createTestDb();
    expect(createManualRecipe({ ...input, ...change }, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: field },
    });
    expect(count(db, "recipes")).toBe(0);
  });

  it("godtar verdiene akkurat på grensene", () => {
    const db = createTestDb();
    const result = createManualRecipe(
      {
        title: "a".repeat(200),
        servings: 50,
        ingredients: Array(100).fill("a".repeat(300)),
        steps: Array(100).fill("a".repeat(2000)),
      },
      db,
    );
    expect(result.ok).toBe(true);
  });

  it("deler linjer på samme måte som skjemaet (linjeskift, trimming, tomme linjer)", () => {
    const recipe = saveAndRead({ ingredients: [" 2 egg \r\n\n 1 dl melk "], steps: ["Rør\rStek"] });
    expect(recipe.ingredients.map((l) => l.original)).toEqual(["2 egg", "1 dl melk"]);
    expect(recipe.steps.map((s) => s.text)).toEqual(["Rør", "Stek"]);
  });

  it.each([999999, 0, -1, 1.5, Number.NaN])("Ukjent oppskrift: id %s gir not_found", (id) => {
    expect(getRecipe(id, createTestDb())).toEqual({ ok: false, error: { kind: "not_found" } });
  });
});

describe("updateManualRecipe", () => {
  function created(values: Partial<ManualRecipeInput> = {}) {
    const db = createTestDb();
    const result = createManualRecipe(
      { ...input, ingredients: ["0,5 ts salt", "3 egg"], ...values },
      db,
    );
    if (!result.ok) throw new Error("kunne ikke lagre");
    return { db, id: result.value.id };
  }

  function read(db: ReturnType<typeof createTestDb>, id: number) {
    const result = getRecipe(id, db);
    if (!result.ok) throw new Error("fant ikke oppskriften");
    return result.value;
  }

  it("Lagre endret ingrediens: «0,5 ts salt» → «1 ts salt» tolkes på nytt", () => {
    const { db, id } = created();
    expect(updateManualRecipe(id, { ...input, ingredients: ["1 ts salt", "3 egg"] }, db)).toEqual({
      ok: true,
      value: { id },
    });
    const [salt] = read(db, id).ingredients;
    expect(salt).toMatchObject({ original: "1 ts salt", quantity: { min: 1 }, unit: "ts" });
  });

  it("Fjern «Tips» fra steg: oppskriften får ett steg færre", () => {
    const { db, id } = created({ steps: ["Visp.", "Stek.", "Tips: bruk smør."] });
    expect(read(db, id).steps).toHaveLength(3);
    updateManualRecipe(id, { ...input, steps: ["Visp.", "Stek."] }, db);
    expect(read(db, id).steps.map((s) => s.text)).toEqual(["Visp.", "Stek."]);
  });

  it("Endre porsjoner: 4 → 6 nullstiller selectedServings", () => {
    const { db, id } = created();
    db.$client.prepare("update recipes set selected_servings = 8 where id = ?").run(id);
    updateManualRecipe(id, { ...input, servings: 6 }, db);
    expect(read(db, id)).toMatchObject({ originalServings: 6, selectedServings: null });
  });

  it("Uendret: samme innhold, strengt nyere updatedAt, resten uendret", () => {
    const { db, id } = created();
    db.$client
      .prepare("update recipes set updated_at = '2020-01-01T00:00:00.000Z' where id = ?")
      .run(id);
    const before = read(db, id);
    updateManualRecipe(id, { ...input, ingredients: ["0,5 ts salt", "3 egg"] }, db);
    const after = read(db, id);
    expect(after.updatedAt > before.updatedAt).toBe(true);
    expect({ ...after, updatedAt: "", ingredients: [], steps: [] }).toEqual({
      ...before,
      updatedAt: "",
      ingredients: [],
      steps: [],
    });
    const withoutId = <T extends { id: number }>(items: T[]) =>
      items.map((item) => ({ ...item, id: undefined }));
    expect(withoutId(after.ingredients)).toEqual(withoutId(before.ingredients));
    expect(withoutId(after.steps)).toEqual(withoutId(before.steps));
  });

  it("seksjoner forsvinner ved redigering (akseptert til seksjoner kan redigeres)", () => {
    const db = createTestDb();
    const id = insertRecipe(db, {
      title: "Pannekaker",
      sourceUrl: null,
      sourceName: null,
      originalServings: 4,
      selectedServings: null,
      savedAt: null,
      createdAt: "2026-11-09T10:00:00.000Z",
      updatedAt: "2026-11-09T10:00:00.000Z",
      ingredients: [{ ...parseLine("1 dl melk"), position: 0, section: "Saus" }],
      steps: [{ position: 0, section: "Saus", text: "Kok." }],
    });
    expect(read(db, id).ingredients[0].section).toBe("Saus");
    updateManualRecipe(id, { ...input, ingredients: ["1 dl melk"], steps: ["Kok."] }, db);
    expect(read(db, id).ingredients[0].section).toBeNull();
    expect(read(db, id).steps[0].section).toBeNull();
  });

  it("grenser: akkurat på grensene godtas, over gir validation", () => {
    const { db, id } = created();
    const atLimits = {
      title: "a".repeat(200),
      servings: 50,
      ingredients: Array(100).fill("a".repeat(300)),
      steps: Array(100).fill("a".repeat(2000)),
    };
    expect(updateManualRecipe(id, atLimits, db).ok).toBe(true);
    expect(read(db, id).ingredients).toHaveLength(100);
    for (const [change, field] of [
      [{ title: "a".repeat(201) }, "title"],
      [{ ingredients: Array(101).fill("1 egg") }, "ingredients"],
      [{ ingredients: ["a".repeat(301)] }, "ingredients"],
    ] as [Partial<ManualRecipeInput>, string][]) {
      expect(updateManualRecipe(id, { ...atLimits, ...change }, db)).toEqual({
        ok: false,
        error: { kind: "validation", detail: field },
      });
    }
    expect(read(db, id).title).toBe("a".repeat(200));
  });

  it("deler linjer som skjemaet: CRLF og linjer med bare mellomrom", () => {
    const { db, id } = created();
    updateManualRecipe(
      id,
      {
        ...input,
        ingredients: ["2 egg\r\n   \r\n1 dl melk\r\n"],
        steps: ["  \r\nRør\r\n \t \r\nStek"],
      },
      db,
    );
    const recipe = read(db, id);
    expect(recipe.ingredients.map((l) => l.original)).toEqual(["2 egg", "1 dl melk"]);
    expect(recipe.steps.map((st) => st.text)).toEqual(["Rør", "Stek"]);
  });

  it("beholder kilde, savedAt og createdAt", () => {
    const { db, id } = created();
    db.$client
      .prepare(
        "update recipes set source_url = 'https://a.no/x', source_name = 'A', saved_at = 'nå' where id = ?",
      )
      .run(id);
    const before = read(db, id);
    updateManualRecipe(id, { ...input, title: "Nytt navn" }, db);
    expect(read(db, id)).toMatchObject({
      title: "Nytt navn",
      sourceUrl: "https://a.no/x",
      sourceName: "A",
      savedAt: "nå",
      createdAt: before.createdAt,
    });
  });

  it.each<[string, Partial<ManualRecipeInput>, string]>([
    ["tom tittel", { title: "  " }, "title"],
    ["ugyldig antall", { servings: 0 }, "servings"],
    ["tom ingrediensliste", { ingredients: [" "] }, "ingredients"],
    ["for langt steg", { steps: ["a".repeat(2001)] }, "steps"],
  ])("%s gir validation og lagrer ingenting", (_, change, field) => {
    const { db, id } = created();
    const before = read(db, id);
    expect(updateManualRecipe(id, { ...input, ...change }, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: field },
    });
    expect(read(db, id)).toEqual(before);
  });

  it.each([999999, 0, -1, 1.5, Number.NaN, Infinity, 2 ** 53])(
    "ukjent eller ugyldig id %s gir not_found",
    (id) => {
      const db = createTestDb();
      expect(updateManualRecipe(id, input, db)).toEqual({
        ok: false,
        error: { kind: "not_found" },
      });
      expect(count(db, "recipes")).toBe(0);
    },
  );

  it("databasefeil midt i: oppskriften er uendret og feilen kastes", () => {
    const { db, id } = created();
    const before = read(db, id);
    db.$client.exec(
      "create trigger fail_steps before insert on steps begin select raise(abort, 'feil'); end",
    );
    expect(() => updateManualRecipe(id, { ...input, title: "Annet" }, db)).toThrow();
    expect(read(db, id)).toEqual(before);
  });
});

describe("listCollection", () => {
  it("er tom for en tom database", () => {
    expect(listCollection(createTestDb())).toEqual({ ok: true, value: [] });
  });

  it("viser nye manuelle oppskrifter, sist lagret først", () => {
    const db = createTestDb();
    const first = createManualRecipe({ ...input, title: "Først" }, db);
    const second = createManualRecipe({ ...input, title: "Sist" }, db);
    if (!first.ok || !second.ok) throw new Error("kunne ikke lagre");

    const result = listCollection(db);
    if (!result.ok) throw new Error("forventet ok");
    expect(result.value.map((r) => r.id)).toEqual([second.value.id, first.value.id]);
    expect(result.value[0]).toMatchObject({ title: "Sist", sourceName: null, sourceUrl: null });
  });

  it("endrer ikke savedAt eller plassering når en oppskrift redigeres", () => {
    const db = createTestDb();
    const first = createManualRecipe({ ...input, title: "Først" }, db);
    const second = createManualRecipe({ ...input, title: "Sist" }, db);
    if (!first.ok || !second.ok) throw new Error("kunne ikke lagre");
    const before = listCollection(db);

    updateManualRecipe(first.value.id, { ...input, title: "Endret" }, db);

    const after = listCollection(db);
    if (!before.ok || !after.ok) throw new Error("forventet ok");
    expect(after.value.map((r) => [r.id, r.savedAt])).toEqual(
      before.value.map((r) => [r.id, r.savedAt]),
    );
    expect(after.value[1].title).toBe("Endret");
  });
});
