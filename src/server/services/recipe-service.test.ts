import { describe, expect, it } from "vitest";
import { parseLine } from "@/domain";
import { createTestDb } from "../db/client";
import { insertRecipe } from "../db/repositories/recipe-repository";
import {
  createManualRecipe,
  deleteRecipe,
  getRecipe,
  listCollection,
  listFavorites,
  purgeStaleUnsavedRecipes,
  saveRecipeToCollection,
  setFavorite,
  setOriginalServings,
  setSelectedServings,
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

describe("listCollection: søketekst (Story 5.2)", () => {
  it("har tittel og ingrediensnavn i små bokstaver, for hver oppskrift", () => {
    const db = createTestDb();
    const a = createManualRecipe(
      { ...input, title: "Blåbærsuppe", ingredients: ["2 dl Blåbær", "1 ss sukker"] },
      db,
    );
    const b = createManualRecipe({ ...input, title: "Vafler", ingredients: ["3 egg"] }, db);
    if (!a.ok || !b.ok) throw new Error("kunne ikke lagre");

    const result = listCollection(db);
    if (!result.ok) throw new Error("forventet ok");
    const byId = new Map(result.value.map((r) => [r.id, r.searchText]));
    expect(byId.get(a.value.id)).toContain("blåbærsuppe");
    expect(byId.get(a.value.id)).toContain("blåbær");
    expect(byId.get(a.value.id)).toContain("sukker");
    expect(byId.get(a.value.id)).not.toContain("egg");
    expect(byId.get(b.value.id)).toContain("egg");
  });

  it("ulagrede oppskrifter er ikke med", () => {
    const db = createTestDb();
    insertRecipe(db, {
      title: "Ulagret",
      sourceUrl: null,
      sourceName: null,
      originalServings: 4,
      selectedServings: null,
      savedAt: null,
      createdAt: "2026-11-09T10:00:00.000Z",
      updatedAt: "2026-11-09T10:00:00.000Z",
      ingredients: [],
      steps: [],
    });
    expect(listCollection(db)).toEqual({ ok: true, value: [] });
  });
});

describe("lagre, slette og rydde (Story 3.2)", () => {
  const stored = (
    db: ReturnType<typeof createTestDb>,
    savedAt: string | null,
    createdAt?: string,
  ) =>
    insertRecipe(db, {
      title: "Vafler",
      sourceUrl: null,
      sourceName: null,
      originalServings: 4,
      selectedServings: null,
      savedAt,
      createdAt: createdAt ?? "2026-11-09T10:00:00.000Z",
      updatedAt: "2026-11-09T10:00:00.000Z",
      ingredients: [{ position: 0, section: null, ...parseLine("2 egg") }],
      steps: [{ position: 0, section: null, text: "Rør." }],
    });
  const read = (db: ReturnType<typeof createTestDb>, id: number) => {
    const result = getRecipe(id, db);
    if (!result.ok) throw new Error("fant ikke oppskriften");
    return result.value;
  };
  const BAD_IDS = [0, -1, 1.5, NaN, Infinity, 2 ** 53];

  describe("saveRecipeToCollection", () => {
    it("legger en ulagret oppskrift i samlingen, så den vises der", () => {
      const db = createTestDb();
      const id = stored(db, null);
      const before = read(db, id);
      expect(saveRecipeToCollection(id, db)).toEqual({ ok: true, value: { id } });
      const after = read(db, id);
      expect(after.savedAt).not.toBeNull();
      expect(after.updatedAt).toBe(before.updatedAt);
      const list = listCollection(db);
      expect(list.ok && list.value.map((r) => r.id)).toEqual([id]);
    });

    it("beholder tidspunktet når oppskriften allerede er lagret", () => {
      const db = createTestDb();
      const id = stored(db, "2026-11-09T11:00:00.000Z");
      expect(saveRecipeToCollection(id, db).ok).toBe(true);
      expect(read(db, id).savedAt).toBe("2026-11-09T11:00:00.000Z");
    });

    it.each([999, ...BAD_IDS])("id %s gir not_found", (id) => {
      expect(saveRecipeToCollection(id, createTestDb())).toEqual({
        ok: false,
        error: { kind: "not_found" },
      });
    });
  });

  describe("deleteRecipe", () => {
    it("sletter oppskriften med ingredienser og steg", () => {
      const db = createTestDb();
      const id = stored(db, "2026-11-09T11:00:00.000Z");
      expect(deleteRecipe(id, db)).toEqual({ ok: true, value: { id } });
      expect(getRecipe(id, db).ok).toBe(false);
      expect(count(db, "recipes")).toBe(0);
      expect(count(db, "ingredient_lines")).toBe(0);
      expect(count(db, "steps")).toBe(0);
    });

    it.each([999, ...BAD_IDS])("id %s gir not_found", (id) => {
      expect(deleteRecipe(id, createTestDb())).toEqual({
        ok: false,
        error: { kind: "not_found" },
      });
    });

    it("sletting to ganger gir not_found andre gang", () => {
      const db = createTestDb();
      const id = stored(db, "2026-11-09T11:00:00.000Z");
      deleteRecipe(id, db);
      expect(deleteRecipe(id, db)).toEqual({ ok: false, error: { kind: "not_found" } });
    });
  });

  describe("setOriginalServings", () => {
    it.each([1, 4, 50])("lagrer %s også for en ulagret oppskrift", (n) => {
      const db = createTestDb();
      const id = stored(db, null);
      expect(setOriginalServings(id, n, db)).toEqual({ ok: true, value: { id } });
      expect(read(db, id)).toMatchObject({ originalServings: n, selectedServings: null });
    });

    it.each([0, 51, 2.5, -3, NaN, Infinity])("antall %s gir validation (servings)", (n) => {
      const db = createTestDb();
      const id = stored(db, "2026-11-09T11:00:00.000Z");
      expect(setOriginalServings(id, n, db)).toEqual({
        ok: false,
        error: { kind: "validation", detail: "servings" },
      });
    });

    it.each([999, 0, 1.5])("ukjent eller ugyldig id %s gir not_found", (id) => {
      expect(setOriginalServings(id, 4, createTestDb())).toEqual({
        ok: false,
        error: { kind: "not_found" },
      });
    });
  });

  describe("setSelectedServings", () => {
    it.each([0.5, 1, 1.5, 4.5, 6, 49.5, 50])(
      "lagrer %s for en lagret oppskrift uten å endre updatedAt",
      (n) => {
        const db = createTestDb();
        const id = stored(db, "2026-11-09T11:00:00.000Z");
        expect(setSelectedServings(id, n, db)).toEqual({ ok: true, value: { id } });
        expect(read(db, id)).toMatchObject({
          selectedServings: n,
          updatedAt: "2026-11-09T10:00:00.000Z",
        });
      },
    );

    it.each([0, 51, 2.3, -3, NaN, Infinity])("antall %s gir validation (servings)", (n) => {
      const db = createTestDb();
      const id = stored(db, "2026-11-09T11:00:00.000Z");
      expect(setSelectedServings(id, n, db)).toEqual({
        ok: false,
        error: { kind: "validation", detail: "servings" },
      });
      expect(read(db, id).selectedServings).toBeNull();
    });

    it("ikke-lagret oppskrift gir not_found og lagrer ingenting", () => {
      const db = createTestDb();
      const id = stored(db, null);
      expect(setSelectedServings(id, 6, db)).toEqual({ ok: false, error: { kind: "not_found" } });
      expect(read(db, id).selectedServings).toBeNull();
    });

    it.each([999, ...BAD_IDS])("id %s gir not_found", (id) => {
      expect(setSelectedServings(id, 6, createTestDb())).toEqual({
        ok: false,
        error: { kind: "not_found" },
      });
    });
  });

  describe("purgeStaleUnsavedRecipes", () => {
    const now = new Date("2026-11-10T12:00:00.000Z");

    it("sletter ulagrede eldre enn 24 timer og beholder resten", () => {
      const db = createTestDb();
      const old = stored(db, null, "2026-11-09T11:59:59.000Z");
      const recent = stored(db, null, "2026-11-09T12:00:01.000Z");
      const savedOld = stored(db, "2026-11-01T00:00:00.000Z", "2026-11-01T00:00:00.000Z");

      expect(purgeStaleUnsavedRecipes(now, db)).toEqual({ ok: true, value: { deleted: 1 } });
      expect(getRecipe(old, db).ok).toBe(false);
      expect(getRecipe(recent, db).ok).toBe(true);
      expect(getRecipe(savedOld, db).ok).toBe(true);
      expect(count(db, "ingredient_lines")).toBe(2);
      expect(count(db, "steps")).toBe(2);
    });

    it("bruker nåtid når now utelates", () => {
      const db = createTestDb();
      stored(db, null, "2000-01-01T00:00:00.000Z");
      expect(purgeStaleUnsavedRecipes(undefined, db)).toEqual({ ok: true, value: { deleted: 1 } });
    });
  });
});

describe("favoritter (Story 3.4)", () => {
  function seed() {
    const db = createTestDb();
    const created = createManualRecipe(input, db);
    if (!created.ok) throw new Error("kunne ikke lagre");
    return { db, id: created.value.id };
  }
  const recipeOf = (db: ReturnType<typeof createTestDb>, id: number) => {
    const read = getRecipe(id, db);
    if (!read.ok) throw new Error("fant ikke oppskriften");
    return read.value;
  };

  it("setFavorite markerer og avmarkerer med eksplisitt verdi, og gjentatte kall gir samme resultat", () => {
    const { db, id } = seed();
    expect(setFavorite(id, true, db)).toEqual({ ok: true, value: { id, isFavorite: true } });
    expect(setFavorite(id, true, db)).toEqual({ ok: true, value: { id, isFavorite: true } });
    expect(recipeOf(db, id).isFavorite).toBe(true);
    expect(setFavorite(id, false, db)).toEqual({ ok: true, value: { id, isFavorite: false } });
    expect(recipeOf(db, id).isFavorite).toBe(false);
  });

  it("endrer ikke updatedAt", () => {
    const { db, id } = seed();
    const before = recipeOf(db, id).updatedAt;
    setFavorite(id, true, db);
    setFavorite(id, false, db);
    expect(recipeOf(db, id).updatedAt).toBe(before);
  });

  it.each([999, 0, -1, 1.5, NaN, 2 ** 53])("ugyldig eller ukjent id %s gir not_found", (bad) => {
    const { db } = seed();
    expect(setFavorite(bad, true, db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  it("en oppskrift som ikke er i samlingen gir not_found og endres ikke", () => {
    const { db, id } = seed();
    db.$client.prepare("update recipes set saved_at = null where id = ?").run(id);
    expect(setFavorite(id, true, db)).toEqual({ ok: false, error: { kind: "not_found" } });
    expect(recipeOf(db, id).isFavorite).toBe(false);
  });

  it("en verdi som ikke er boolsk gir validation", () => {
    const { db, id } = seed();
    const result = setFavorite(id, "ja" as unknown as boolean, db);
    expect(result).toMatchObject({ ok: false, error: { kind: "validation" } });
    expect(recipeOf(db, id).isFavorite).toBe(false);
  });

  it("listFavorites gir favorittene sist lagret først, og tom liste uten favoritter", () => {
    const db = createTestDb();
    expect(listFavorites(db)).toEqual({ ok: true, value: [] });
    const a = createManualRecipe({ ...input, title: "A" }, db);
    const b = createManualRecipe({ ...input, title: "B" }, db);
    createManualRecipe({ ...input, title: "C" }, db);
    if (!a.ok || !b.ok) throw new Error("kunne ikke lagre");
    // Lik savedAt avgjøres av høyest id, så rekkefølgen er B før A.
    setFavorite(a.value.id, true, db);
    setFavorite(b.value.id, true, db);
    const result = listFavorites(db);
    expect(result.ok && result.value.map((r) => r.title)).toEqual(["B", "A"]);
    expect(result.ok && result.value.every((r) => r.isFavorite)).toBe(true);
  });

  it("redigering beholder favoritten, og sletting fjerner den fra favorittene", () => {
    const { db, id } = seed();
    setFavorite(id, true, db);
    expect(updateManualRecipe(id, { ...input, title: "Nytt navn" }, db).ok).toBe(true);
    expect(recipeOf(db, id)).toMatchObject({ title: "Nytt navn", isFavorite: true });
    deleteRecipe(id, db);
    expect(listFavorites(db)).toEqual({ ok: true, value: [] });
  });
});
