import { describe, expect, it } from "vitest";
import { parseLine } from "@/domain";
import { createTestDb, TEST_USER_ID } from "../db/client";
import { insertRecipe } from "../db/repositories/recipe-repository";
import {
  canAccessRecipe,
  createManualRecipe,
  markRecipeCooked,
  undoRecipeCooked,
  listCookedInPeriod,
  setRecipeFitsFor,
  addRecipeLabel,
  deleteDeletedRecipeForGood,
  getDeletedRecipe,
  listDeletedRecipes,
  purgeDeletedRecipes,
  restoreDeletedRecipe,
  TRASH_DAYS,
  copyRecipeAsVariant,
  setRecipeRating,
  removeRecipeLabel,
  LABELS_MAX,
  setRecipeNotes,
  listShoppingRecipes,
  getRecipeFor,
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
  const created = createManualRecipe(TEST_USER_ID, { ...input, ...values }, db);
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
    expect(createManualRecipe(TEST_USER_ID, { ...input, title: "  " }, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "title" },
    });
    expect(createManualRecipe(TEST_USER_ID, { ...input, ingredients: [" "] }, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "ingredients" },
    });
    expect(createManualRecipe(TEST_USER_ID, { ...input, servings: 0 }, db).ok).toBe(false);
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
    expect(createManualRecipe(TEST_USER_ID, { ...input, ...change }, db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: field },
    });
    expect(count(db, "recipes")).toBe(0);
  });

  it("godtar verdiene akkurat på grensene", () => {
    const db = createTestDb();
    const result = createManualRecipe(
      TEST_USER_ID,
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
      TEST_USER_ID,
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
    expect(listCollection(TEST_USER_ID, createTestDb())).toEqual({ ok: true, value: [] });
  });

  it("viser nye manuelle oppskrifter, sist lagret først", () => {
    const db = createTestDb();
    const first = createManualRecipe(TEST_USER_ID, { ...input, title: "Først" }, db);
    const second = createManualRecipe(TEST_USER_ID, { ...input, title: "Sist" }, db);
    if (!first.ok || !second.ok) throw new Error("kunne ikke lagre");

    const result = listCollection(TEST_USER_ID, db);
    if (!result.ok) throw new Error("forventet ok");
    expect(result.value.map((r) => r.id)).toEqual([second.value.id, first.value.id]);
    expect(result.value[0]).toMatchObject({ title: "Sist", sourceName: null, sourceUrl: null });
  });

  it("endrer ikke savedAt eller plassering når en oppskrift redigeres", () => {
    const db = createTestDb();
    const first = createManualRecipe(TEST_USER_ID, { ...input, title: "Først" }, db);
    const second = createManualRecipe(TEST_USER_ID, { ...input, title: "Sist" }, db);
    if (!first.ok || !second.ok) throw new Error("kunne ikke lagre");
    const before = listCollection(TEST_USER_ID, db);

    updateManualRecipe(first.value.id, { ...input, title: "Endret" }, db);

    const after = listCollection(TEST_USER_ID, db);
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
      TEST_USER_ID,
      { ...input, title: "Blåbærsuppe", ingredients: ["2 dl Blåbær", "1 ss sukker"] },
      db,
    );
    const b = createManualRecipe(
      TEST_USER_ID,
      { ...input, title: "Vafler", ingredients: ["3 egg"] },
      db,
    );
    if (!a.ok || !b.ok) throw new Error("kunne ikke lagre");

    const result = listCollection(TEST_USER_ID, db);
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
    expect(listCollection(TEST_USER_ID, db)).toEqual({ ok: true, value: [] });
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
      userId: TEST_USER_ID,
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
      expect(saveRecipeToCollection(TEST_USER_ID, id, db)).toEqual({ ok: true, value: { id } });
      const after = read(db, id);
      expect(after.savedAt).not.toBeNull();
      expect(after.updatedAt).toBe(before.updatedAt);
      const list = listCollection(TEST_USER_ID, db);
      expect(list.ok && list.value.map((r) => r.id)).toEqual([id]);
    });

    it("beholder tidspunktet når oppskriften allerede er lagret", () => {
      const db = createTestDb();
      const id = stored(db, "2026-11-09T11:00:00.000Z");
      expect(saveRecipeToCollection(TEST_USER_ID, id, db).ok).toBe(true);
      expect(read(db, id).savedAt).toBe("2026-11-09T11:00:00.000Z");
    });

    it.each([999, ...BAD_IDS])("id %s gir not_found", (id) => {
      expect(saveRecipeToCollection(TEST_USER_ID, id, createTestDb())).toEqual({
        ok: false,
        error: { kind: "not_found" },
      });
    });
  });

  describe("deleteRecipe", () => {
    it("sletter oppskriften med ingredienser og steg", () => {
      const db = createTestDb();
      const id = stored(db, "2026-11-09T11:00:00.000Z");
      expect(deleteRecipe(id, db)).toEqual({
        ok: true,
        value: { id, trashId: expect.any(Number) },
      });
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
    const created = createManualRecipe(TEST_USER_ID, input, db);
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
    expect(listFavorites(TEST_USER_ID, db)).toEqual({ ok: true, value: [] });
    const a = createManualRecipe(TEST_USER_ID, { ...input, title: "A" }, db);
    const b = createManualRecipe(TEST_USER_ID, { ...input, title: "B" }, db);
    createManualRecipe(TEST_USER_ID, { ...input, title: "C" }, db);
    if (!a.ok || !b.ok) throw new Error("kunne ikke lagre");
    // Lik savedAt avgjøres av høyest id, så rekkefølgen er B før A.
    setFavorite(a.value.id, true, db);
    setFavorite(b.value.id, true, db);
    const result = listFavorites(TEST_USER_ID, db);
    expect(result.ok && result.value.map((r) => r.title)).toEqual(["B", "A"]);
    expect(result.ok && result.value.every((r) => r.isFavorite)).toBe(true);
  });

  it("redigering beholder favoritten, og sletting fjerner den fra favorittene", () => {
    const { db, id } = seed();
    setFavorite(id, true, db);
    expect(updateManualRecipe(id, { ...input, title: "Nytt navn" }, db).ok).toBe(true);
    expect(recipeOf(db, id)).toMatchObject({ title: "Nytt navn", isFavorite: true });
    deleteRecipe(id, db);
    expect(listFavorites(TEST_USER_ID, db)).toEqual({ ok: true, value: [] });
  });
});

describe("listShoppingRecipes med forslag (Story 5.11)", () => {
  it("tar med ingrediensforslag som har mengde, men ikke tekstforslag eller steg", async () => {
    const { applySuggestion } = await import("./suggestion-service");
    const { listShoppingRecipes } = await import("./recipe-service");
    const db = createTestDb();
    const created = createManualRecipe(
      TEST_USER_ID,
      { title: "Pannekaker", servings: 4, ingredients: ["3 dl melk"], steps: ["Stek."] },
      db,
    );
    if (!created.ok) throw new Error("feil");
    const id = created.value.id;
    saveRecipeToCollection(TEST_USER_ID, id, db);
    for (const suggestion of [
      {
        text: "Ha en teskje vaniljesukker eller kardemomme i røren.",
        reason: "x",
        appliesTo: "ingredients",
      },
      { text: "Bytt litt melk med kefir.", reason: "x", appliesTo: "ingredients" },
      {
        text: "La røren hvile i 20–30 minutter før du begynner å steke.",
        reason: "x",
        appliesTo: "steps",
      },
    ]) {
      expect(applySuggestion(id, suggestion, db).ok).toBe(true);
    }
    const result = listShoppingRecipes(TEST_USER_ID, db);
    if (!result.ok) throw new Error("feil");
    expect(result.value[0].ingredients.map((line) => line.original)).toEqual([
      "3 dl melk",
      "1 ts vaniljesukker eller kardemomme",
    ]);
  });
});

describe("eierskap (Story 5.13)", () => {
  function secondUser(db: ReturnType<typeof createTestDb>): number {
    return Number(
      db.$client
        .prepare("insert into users (email, password_hash, created_at) values ('b@b.no', 'x', 'x')")
        .run().lastInsertRowid,
    );
  }

  it("canAccessRecipe: eieren og alle for en import uten eier; ikke andre", () => {
    const db = createTestDb();
    const other = secondUser(db);
    const created = createManualRecipe(TEST_USER_ID, input, db);
    if (!created.ok) throw new Error("feil");
    const mine = created.value.id;
    expect(canAccessRecipe(TEST_USER_ID, mine, db)).toBe(true);
    expect(canAccessRecipe(other, mine, db)).toBe(false);
    expect(canAccessRecipe(null, mine, db)).toBe(false);
    const anonymous = insertRecipe(db, {
      title: "Uten eier",
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
    expect(canAccessRecipe(null, anonymous, db)).toBe(true);
    expect(canAccessRecipe(other, anonymous, db)).toBe(true);
    expect(canAccessRecipe(TEST_USER_ID, 999, db)).toBe(false);
    expect(canAccessRecipe(TEST_USER_ID, 0, db)).toBe(false);
  });

  it("getRecipeFor gir not_found for en annens oppskrift", () => {
    const db = createTestDb();
    const other = secondUser(db);
    const created = createManualRecipe(TEST_USER_ID, input, db);
    if (!created.ok) throw new Error("feil");
    expect(getRecipeFor(TEST_USER_ID, created.value.id, db).ok).toBe(true);
    expect(getRecipeFor(other, created.value.id, db)).toEqual({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  it("samlingen, favoritter og handlelisten viser bare brukerens egne", () => {
    const db = createTestDb();
    const other = secondUser(db);
    createManualRecipe(TEST_USER_ID, input, db);
    createManualRecipe(other, { ...input, title: "Deres" }, db);
    const titles = (userId: number) => {
      const result = listCollection(userId, db);
      return result.ok ? result.value.map((r) => r.title) : [];
    };
    expect(titles(TEST_USER_ID)).toEqual([input.title.trim()]);
    expect(titles(other)).toEqual(["Deres"]);
    const shopping = listShoppingRecipes(other, db);
    expect(shopping.ok && shopping.value.map((r) => r.title)).toEqual(["Deres"]);
  });
});

describe("tid i minutter (Story 6.2)", () => {
  it("lagres ved ny oppskrift og ved redigering, og kan fjernes", () => {
    const db = createTestDb();
    const created = createManualRecipe(TEST_USER_ID, { ...input, minutes: 45 }, db);
    if (!created.ok) throw new Error("feil");
    const id = created.value.id;
    expect(getRecipe(id, db)).toMatchObject({ ok: true, value: { totalMinutes: 45 } });
    expect(updateManualRecipe(id, { ...input, minutes: 90 }, db).ok).toBe(true);
    expect(getRecipe(id, db)).toMatchObject({ ok: true, value: { totalMinutes: 90 } });
    // Uten feltet (for eksempel eldre kall) beholdes tiden; null fjerner den.
    expect(updateManualRecipe(id, input, db).ok).toBe(true);
    expect(getRecipe(id, db)).toMatchObject({ ok: true, value: { totalMinutes: 90 } });
    expect(updateManualRecipe(id, { ...input, minutes: null }, db).ok).toBe(true);
    expect(getRecipe(id, db)).toMatchObject({ ok: true, value: { totalMinutes: null } });
  });

  it("ugyldig tid gir validation på feltet minutes og lagrer ingenting", () => {
    const db = createTestDb();
    for (const minutes of [0, 1441, 4.5]) {
      expect(createManualRecipe(TEST_USER_ID, { ...input, minutes }, db)).toEqual({
        ok: false,
        error: { kind: "validation", detail: "minutes" },
      });
    }
    expect(db.$client.prepare("select count(*) as n from recipes").get()).toEqual({ n: 0 });
  });
});

describe("notater og sist laget (Story 6.3)", () => {
  function saved(db: ReturnType<typeof createTestDb>): number {
    const created = createManualRecipe(TEST_USER_ID, input, db);
    if (!created.ok) throw new Error("feil");
    return created.value.id;
  }

  it("lagrer notater trimmet, fjerner dem med tom tekst, og rører ikke updatedAt", () => {
    const db = createTestDb();
    const id = saved(db);
    const before = getRecipe(id, db);
    expect(setRecipeNotes(id, "  Halv sukker.\r\nStek kortere.  ", db)).toEqual({
      ok: true,
      value: { notes: "Halv sukker.\nStek kortere." },
    });
    const after = getRecipe(id, db);
    expect(after.ok && after.value.notes).toBe("Halv sukker.\nStek kortere.");
    expect(after.ok && before.ok && after.value.updatedAt).toBe(
      before.ok && before.value.updatedAt,
    );
    expect(setRecipeNotes(id, "   ", db)).toEqual({ ok: true, value: { notes: null } });
  });

  it("for lange notater, ulagret og ukjent oppskrift avvises", () => {
    const db = createTestDb();
    const id = saved(db);
    expect(setRecipeNotes(id, "x".repeat(2001), db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "notes" },
    });
    expect(setRecipeNotes(id, "x".repeat(2000), db).ok).toBe(true);
    db.$client.prepare("update recipes set saved_at = null").run();
    expect(setRecipeNotes(id, "a", db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
    expect(setRecipeNotes(999, "a", db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
  });

  it("«Passer til» lagres trimmet, tom tekst fjerner den, og for lang eller ulagret avvises", () => {
    const db = createTestDb();
    const id = saved(db);
    expect(setRecipeFitsFor(id, "  2   sultne ", db)).toEqual({
      ok: true,
      value: { fitsFor: "2 sultne" },
    });
    const read = getRecipe(id, db);
    expect(read.ok && read.value.fitsFor).toBe("2 sultne");
    expect(setRecipeFitsFor(id, "  ", db)).toEqual({ ok: true, value: { fitsFor: null } });
    expect(setRecipeFitsFor(id, "x".repeat(61), db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "fitsFor" },
    });
    expect(setRecipeFitsFor(id, "x".repeat(60), db).ok).toBe(true);
    db.$client.prepare("update recipes set saved_at = null").run();
    expect(setRecipeFitsFor(id, "a", db)).toMatchObject({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(setRecipeFitsFor(999, "a", db)).toMatchObject({ ok: false });
  });

  it("«Laget i dag» setter dato og teller opp", () => {
    const db = createTestDb();
    const id = saved(db);
    const day1 = () => new Date("2026-11-09T18:00:00.000Z");
    const day2 = () => new Date("2026-11-10T18:00:00.000Z");
    expect(markRecipeCooked(id, db, day1)).toEqual({
      ok: true,
      value: { lastCookedAt: "2026-11-09T18:00:00.000Z", cookedCount: 1 },
    });
    expect(markRecipeCooked(id, db, day2)).toMatchObject({ ok: true, value: { cookedCount: 2 } });
    const recipe = getRecipe(id, db);
    expect(recipe.ok && [recipe.value.lastCookedAt, recipe.value.cookedCount]).toEqual([
      "2026-11-10T18:00:00.000Z",
      2,
    ]);
    expect(markRecipeCooked(999, db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
  });

  it("«Angre» teller ned og setter datoen tilbake (Story 6.21)", () => {
    const db = createTestDb();
    const id = saved(db);
    const day1 = () => new Date("2026-11-09T18:00:00.000Z");
    const day2 = () => new Date("2026-11-10T18:00:00.000Z");
    markRecipeCooked(id, db, day1);
    markRecipeCooked(id, db, day2);
    expect(undoRecipeCooked(id, "2026-11-09T18:00:00.000Z", db)).toEqual({
      ok: true,
      value: { lastCookedAt: "2026-11-09T18:00:00.000Z", cookedCount: 1 },
    });
    // Siste angring: aldri laget igjen, og datoen forsvinner uansett hva som sendes inn.
    expect(undoRecipeCooked(id, "2026-11-09T18:00:00.000Z", db)).toEqual({
      ok: true,
      value: { lastCookedAt: null, cookedCount: 0 },
    });
    const recipe = getRecipe(id, db);
    expect(recipe.ok && [recipe.value.lastCookedAt, recipe.value.cookedCount]).toEqual([null, 0]);
  });

  it("loggen gir antall og siste gang i en periode, og «Angre» fjerner siste loggrad (Story 6.24b)", () => {
    const db = createTestDb();
    const id = saved(db);
    const other = saved(db);
    markRecipeCooked(id, db, () => new Date("2026-10-01T18:00:00.000Z"));
    markRecipeCooked(id, db, () => new Date("2026-11-05T18:00:00.000Z"));
    markRecipeCooked(id, db, () => new Date("2026-11-09T18:00:00.000Z"));
    markRecipeCooked(other, db, () => new Date("2026-09-01T18:00:00.000Z"));
    expect(listCookedInPeriod(TEST_USER_ID, "2026-11-01T00:00:00.000Z", db)).toEqual({
      ok: true,
      value: [{ recipeId: id, count: 2, last: "2026-11-09T18:00:00.000Z" }],
    });
    undoRecipeCooked(id, "2026-11-05T18:00:00.000Z", db);
    expect(listCookedInPeriod(TEST_USER_ID, "2026-11-01T00:00:00.000Z", db)).toEqual({
      ok: true,
      value: [{ recipeId: id, count: 1, last: "2026-11-05T18:00:00.000Z" }],
    });
    expect(listCookedInPeriod(TEST_USER_ID, "2020-01-01T00:00:00.000Z", db)).toMatchObject({
      value: expect.arrayContaining([expect.objectContaining({ recipeId: other, count: 1 })]),
    });
    // En annen konto ser ikke loggen.
    expect(listCookedInPeriod(TEST_USER_ID + 1, "2020-01-01T00:00:00.000Z", db)).toEqual({
      ok: true,
      value: [],
    });
  });

  it("«Angre» går ikke under null og avviser ukjent oppskrift og ugyldig dato", () => {
    const db = createTestDb();
    const id = saved(db);
    expect(undoRecipeCooked(id, null, db)).toMatchObject({
      ok: false,
      error: { kind: "not_found" },
    });
    expect(undoRecipeCooked(999, null, db)).toMatchObject({ ok: false });
    markRecipeCooked(id, db);
    expect(undoRecipeCooked(id, "ikke en dato", db)).toMatchObject({
      ok: false,
      error: { kind: "validation" },
    });
  });
});

describe("merkelapper (Story 6.7)", () => {
  function saved(db: ReturnType<typeof createTestDb>): number {
    const created = createManualRecipe(TEST_USER_ID, input, db);
    if (!created.ok) throw new Error("feil");
    return created.value.id;
  }

  it("legger til trimmet, uten dobbelt (uavhengig av store og små bokstaver), og i rekkefølge", () => {
    const db = createTestDb();
    const id = saved(db);
    expect(addRecipeLabel(id, "  Hverdag ", db)).toEqual({
      ok: true,
      value: { labels: ["Hverdag"] },
    });
    expect(addRecipeLabel(id, "ekstra   god", db)).toEqual({
      ok: true,
      value: { labels: ["Hverdag", "ekstra god"] },
    });
    expect(addRecipeLabel(id, "HVERDAG", db)).toEqual({
      ok: true,
      value: { labels: ["Hverdag", "ekstra god"] },
    });
    const read = getRecipe(id, db);
    expect(read.ok && read.value.labels).toEqual(["Hverdag", "ekstra god"]);
  });

  it("avviser tom, for lang og ikke-tekst, og for mange merkelapper", () => {
    const db = createTestDb();
    const id = saved(db);
    for (const label of ["", "   ", 5, null])
      expect(addRecipeLabel(id, label, db)).toEqual({
        ok: false,
        error: { kind: "validation", detail: "label_required" },
      });
    expect(addRecipeLabel(id, "x".repeat(31), db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "label_too_long" },
    });
    expect(addRecipeLabel(id, "x".repeat(30), db).ok).toBe(true);
    for (let i = 1; i < LABELS_MAX; i++) expect(addRecipeLabel(id, `m${i}`, db).ok).toBe(true);
    expect(addRecipeLabel(id, "en for mye", db)).toEqual({
      ok: false,
      error: { kind: "validation", detail: "limit" },
    });
    // En som finnes fra før gir ikke feil selv om oppskriften er full.
    expect(addRecipeLabel(id, "M1", db).ok).toBe(true);
  });

  it("gir not_found for ukjent eller ulagret oppskrift", () => {
    const db = createTestDb();
    const id = saved(db);
    expect(addRecipeLabel(999, "a", db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
    expect(addRecipeLabel(0, "a", db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
    db.$client.prepare("update recipes set saved_at = null").run();
    expect(addRecipeLabel(id, "a", db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
  });

  it("fjerner en merkelapp (uavhengig av store og små bokstaver), og ukjent skjer ingenting", () => {
    const db = createTestDb();
    const id = saved(db);
    addRecipeLabel(id, "Hverdag", db);
    addRecipeLabel(id, "Vegetar", db);
    expect(removeRecipeLabel(id, "hverdag", db)).toEqual({
      ok: true,
      value: { labels: ["Vegetar"] },
    });
    expect(removeRecipeLabel(id, "finnes ikke", db)).toEqual({
      ok: true,
      value: { labels: ["Vegetar"] },
    });
    expect(removeRecipeLabel(0, "a", db)).toMatchObject({ ok: false });
  });

  it("merkelappene er med i samlingen og i søketeksten, og følger oppskriften når den slettes", () => {
    const db = createTestDb();
    const id = saved(db);
    addRecipeLabel(id, "Vegetar", db);
    const collection = listCollection(TEST_USER_ID, db);
    expect(collection.ok && collection.value[0]).toMatchObject({
      labels: ["Vegetar"],
      searchText: expect.stringContaining("vegetar"),
    });
    db.$client.prepare("delete from recipes where id = ?").run(id);
    expect(db.$client.prepare("select count(*) as n from recipe_labels").get()).toEqual({ n: 0 });
  });
});

describe("vurdering (Story 6.8)", () => {
  function saved(db: ReturnType<typeof createTestDb>): number {
    const created = createManualRecipe(TEST_USER_ID, input, db);
    if (!created.ok) throw new Error("feil");
    return created.value.id;
  }

  it("lagrer 1–5, kan endres og fjernes, og kommer med i oppskriften og samlingen", () => {
    const db = createTestDb();
    const id = saved(db);
    const first = getRecipe(id, db);
    expect(first.ok && first.value.rating).toBeNull();
    expect(setRecipeRating(id, 4, db)).toEqual({ ok: true, value: { rating: 4 } });
    const read = getRecipe(id, db);
    expect(read.ok && read.value.rating).toBe(4);
    const list = listCollection(TEST_USER_ID, db);
    expect(list.ok && list.value[0]?.rating).toBe(4);
    expect(setRecipeRating(id, 1, db)).toEqual({ ok: true, value: { rating: 1 } });
    expect(setRecipeRating(id, null, db)).toEqual({ ok: true, value: { rating: null } });
    const cleared = getRecipe(id, db);
    expect(cleared.ok && cleared.value.rating).toBeNull();
  });

  it("avviser alt annet enn hele tall fra 1 til 5", () => {
    const db = createTestDb();
    const id = saved(db);
    for (const bad of [0, 6, -1, 2.5, NaN, "3", undefined, true])
      expect(setRecipeRating(id, bad, db)).toEqual({
        ok: false,
        error: { kind: "validation", detail: "rating" },
      });
  });

  it("gir not_found for ukjent eller ulagret oppskrift", () => {
    const db = createTestDb();
    const id = saved(db);
    expect(setRecipeRating(999, 3, db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
    expect(setRecipeRating(0, 3, db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
    db.$client.prepare("update recipes set saved_at = null").run();
    expect(setRecipeRating(id, 3, db)).toMatchObject({ ok: false, error: { kind: "not_found" } });
  });
});

describe("copyRecipeAsVariant (Story 6.10)", () => {
  it("lager en lagret kopi med prefiks i tittelen, og originalen står uendret", () => {
    const db = createTestDb();
    const created = createManualRecipe(TEST_USER_ID, input, db);
    if (!created.ok) throw new Error("feil");
    const copy = copyRecipeAsVariant(created.value.id, "Kopi av ", db);
    expect(copy.ok).toBe(true);
    if (!copy.ok) return;
    expect(copy.value.id).not.toBe(created.value.id);
    const read = getRecipe(copy.value.id, db);
    expect(read.ok && read.value.title).toBe(`Kopi av ${input.title}`);
    expect(read.ok && read.value.savedAt).not.toBeNull();
    const list = listCollection(TEST_USER_ID, db);
    expect(list.ok && list.value).toHaveLength(2);
  });

  it("avkorter tittelen til grensen på 200 tegn", () => {
    const db = createTestDb();
    const created = createManualRecipe(TEST_USER_ID, { ...input, title: "x".repeat(200) }, db);
    if (!created.ok) throw new Error("feil");
    const copy = copyRecipeAsVariant(created.value.id, "Kopi av ", db);
    const read = copy.ok ? getRecipe(copy.value.id, db) : null;
    expect(read?.ok && read.value.title).toHaveLength(200);
  });

  it("gir not_found for ugyldig, ukjent og ulagret oppskrift", () => {
    const db = createTestDb();
    const created = createManualRecipe(TEST_USER_ID, input, db);
    if (!created.ok) throw new Error("feil");
    for (const bad of [0, -1, 1.5, 999])
      expect(copyRecipeAsVariant(bad, "Kopi av ", db)).toMatchObject({
        ok: false,
        error: { kind: "not_found" },
      });
    db.$client.prepare("update recipes set saved_at = null").run();
    expect(copyRecipeAsVariant(created.value.id, "Kopi av ", db)).toMatchObject({
      ok: false,
      error: { kind: "not_found" },
    });
  });
});

describe("nylig slettet (Story 6.11)", () => {
  const DAY = 24 * 60 * 60 * 1000;
  const T = new Date("2026-11-11T12:00:00.000Z");

  function savedRecipe(db: ReturnType<typeof createTestDb>, title = input.title): number {
    const created = createManualRecipe(TEST_USER_ID, { ...input, title }, db);
    if (!created.ok) throw new Error("feil");
    return created.value.id;
  }

  it("en lagret oppskrift legges i «Nylig slettet», en ulagret slettes rett", () => {
    const db = createTestDb();
    const id = savedRecipe(db);
    const deleted = deleteRecipe(id, db, T);
    expect(deleted).toEqual({ ok: true, value: { id, trashId: expect.any(Number) } });
    expect(getRecipe(id, db).ok).toBe(false);
    const list = listDeletedRecipes(TEST_USER_ID, db, T);
    expect(list.ok && list.value).toEqual([
      {
        id: deleted.ok ? deleted.value.trashId : -1,
        title: input.title,
        deletedAt: T.toISOString(),
        expiresAt: new Date(T.getTime() + TRASH_DAYS * DAY).toISOString(),
        daysLeft: 7,
      },
    ]);

    const other = savedRecipe(db, "Ulagret");
    db.$client.prepare("update recipes set saved_at = null where id = ?").run(other);
    expect(deleteRecipe(other, db, T)).toEqual({ ok: true, value: { id: other, trashId: null } });
    expect(count(db, "deleted_recipes")).toBe(1);
  });

  it("henter tilbake med nytt id, og andre gang gir not_found", () => {
    const db = createTestDb();
    const id = savedRecipe(db);
    const deleted = deleteRecipe(id, db, T);
    const trashId = deleted.ok ? deleted.value.trashId! : -1;
    const back = restoreDeletedRecipe(TEST_USER_ID, trashId, db, new Date(T.getTime() + DAY));
    expect(back.ok).toBe(true);
    const read = back.ok ? getRecipe(back.value.id, db) : null;
    expect(read?.ok && read.value.title).toBe(input.title);
    expect(restoreDeletedRecipe(TEST_USER_ID, trashId, db, T)).toMatchObject({
      ok: false,
      error: { kind: "not_found" },
    });
  });

  it("dager igjen teller ned, og etter 7 dager er den borte (liste, oppslag og gjenoppretting)", () => {
    const db = createTestDb();
    const deleted = deleteRecipe(savedRecipe(db), db, T);
    const trashId = deleted.ok ? deleted.value.trashId! : -1;
    const at = (days: number) => new Date(T.getTime() + days * DAY - 1000);
    const left = (days: number) => {
      const found = getDeletedRecipe(TEST_USER_ID, trashId, db, at(days));
      return found.ok ? found.value.daysLeft : null;
    };
    expect(left(0)).toBe(7);
    expect(left(1)).toBe(6);
    expect(left(7)).toBe(0);
    const gone = new Date(T.getTime() + 7 * DAY + 1000);
    expect(listDeletedRecipes(TEST_USER_ID, db, gone)).toEqual({ ok: true, value: [] });
    expect(getDeletedRecipe(TEST_USER_ID, trashId, db, gone)).toMatchObject({ ok: false });
    expect(restoreDeletedRecipe(TEST_USER_ID, trashId, db, gone)).toMatchObject({ ok: false });
  });

  it("en annen bruker ser og henter ingenting, og id-en må være gyldig", () => {
    const db = createTestDb();
    db.$client.exec(
      "insert into users (id, email, password_hash, created_at) values (2, 'b@example.com', 'x', '2026-01-01T00:00:00.000Z')",
    );
    const deleted = deleteRecipe(savedRecipe(db), db, T);
    const trashId = deleted.ok ? deleted.value.trashId! : -1;
    expect(listDeletedRecipes(2, db, T)).toEqual({ ok: true, value: [] });
    expect(getDeletedRecipe(2, trashId, db, T)).toMatchObject({ ok: false });
    expect(restoreDeletedRecipe(2, trashId, db, T)).toMatchObject({ ok: false });
    expect(deleteDeletedRecipeForGood(2, trashId, db)).toMatchObject({ ok: false });
    for (const bad of [0, -1, 1.5, NaN]) {
      expect(getDeletedRecipe(TEST_USER_ID, bad, db, T)).toMatchObject({ ok: false });
      expect(restoreDeletedRecipe(TEST_USER_ID, bad, db, T)).toMatchObject({ ok: false });
      expect(deleteDeletedRecipeForGood(TEST_USER_ID, bad, db)).toMatchObject({ ok: false });
    }
  });

  it("sletter for godt, og rydder bort det som er eldre enn 7 dager", () => {
    const db = createTestDb();
    const first = deleteRecipe(savedRecipe(db, "Eldst"), db, new Date(T.getTime() - 8 * DAY));
    const second = deleteRecipe(savedRecipe(db, "Midt"), db, new Date(T.getTime() - 2 * DAY));
    const third = deleteRecipe(savedRecipe(db, "Ny"), db, T);
    expect(purgeDeletedRecipes(T, db)).toEqual({ ok: true, value: { deleted: 1 } });
    expect(count(db, "deleted_recipes")).toBe(2);
    const secondId = second.ok ? second.value.trashId! : -1;
    expect(deleteDeletedRecipeForGood(TEST_USER_ID, secondId, db)).toEqual({
      ok: true,
      value: { id: secondId },
    });
    expect(deleteDeletedRecipeForGood(TEST_USER_ID, secondId, db)).toMatchObject({ ok: false });
    expect(first.ok && third.ok).toBe(true);
    expect(count(db, "deleted_recipes")).toBe(1);
  });
});
