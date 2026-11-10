import { afterEach, describe, expect, it, vi } from "vitest";
import { LIMITS } from "@/lib/recipe-input";
import { appError, err, ok } from "@/lib/result";
import { createTestDb, TEST_USER_ID } from "../db/client";
import { createFixtureFetcher } from "../adapters/fixture-fetcher";
import type { RecipeSourceFetcher } from "../ports/recipe-source-fetcher";
import { buildImportedContent, importRecipe } from "./import-service";
import { getRecipe, saveRecipeToCollection } from "./recipe-service";

const NOW = new Date("2026-11-09T12:00:00.000Z");
const deps = (extra: Parameters<typeof importRecipe>[1] = {}) => ({
  db: createTestDb(),
  fetcher: createFixtureFetcher(),
  now: () => NOW,
  userId: TEST_USER_ID,
  ...extra,
});

afterEach(() => vi.restoreAllMocks());

function ld(recipe: Record<string, unknown>): string {
  return `<html><head><script type="application/ld+json">${JSON.stringify({
    "@context": "https://schema.org",
    "@type": "Recipe",
    ...recipe,
  })}</script></head><body></body></html>`;
}

/** En fetcher som svarer med fast HTML og teller kall. */
function staticFetcher(html: string, finalUrl?: string) {
  const fetch = vi.fn(async (url: string) => ok({ html, finalUrl: finalUrl ?? url }));
  return { fetch } satisfies RecipeSourceFetcher;
}

/** En fetcher som feiler hvis den kalles. */
const forbiddenFetcher = {
  fetch: vi.fn(async () => {
    throw new Error("fetcher skal ikke kalles");
  }),
} satisfies RecipeSourceFetcher;

function count(db: ReturnType<typeof createTestDb>, table: string): number {
  return (db.$client.prepare(`select count(*) as n from ${table}`).get() as { n: number }).n;
}

function read(d: ReturnType<typeof deps>, id: number) {
  const result = getRecipe(id, d.db);
  if (!result.ok) throw new Error("fant ikke oppskriften");
  return result.value;
}

describe("importRecipe: lagrede sider via fixture-adapteren (røyktest av hele rørledningen)", () => {
  it("Tine: tittel, kilde, porsjoner, tolkede ingredienser, steg og ulagret", async () => {
    const d = deps();
    const url =
      "https://www.tine.no/oppskrifter/middag-og-hovedretter/kjott/kjottboller-i-tomatsaus";
    const result = await importRecipe(url, d);
    expect(result).toEqual({ ok: true, value: { id: 1 } });
    const recipe = read(d, 1);
    expect(recipe).toMatchObject({
      title: "Kjøttboller i tomatsaus",
      sourceName: "TINE Kjøkken",
      sourceUrl: url,
      originalServings: 16,
      selectedServings: null,
      savedAt: null,
      folderId: null,
      isFavorite: false,
      createdAt: NOW.toISOString(),
      updatedAt: NOW.toISOString(),
    });
    expect(recipe.ingredients).toHaveLength(10);
    expect(recipe.ingredients[0]).toMatchObject({
      position: 0,
      section: null,
      original: "ukokt 3 dl ris , gjerne basmatiris",
    });
    expect(recipe.ingredients.at(-1)).toMatchObject({
      original: "200 g hodekål",
      quantity: { min: 200 },
      unit: "g",
      name: "hodekål",
      parseable: true,
    });
    expect(recipe.steps).toHaveLength(4);
    expect(recipe.steps.map((s) => s.position)).toEqual([0, 1, 2, 3]);
    expect(recipe.steps[0].text.startsWith("Kok ris som anvist på pakken.")).toBe(true);
  });

  it("Matprat: kildenavn og porsjoner slik 2.1 leser dem", async () => {
    const d = deps();
    const url = "https://www.matprat.no/oppskrifter/familien/rundstykker/";
    expect(await importRecipe(url, d)).toEqual({ ok: true, value: { id: 1 } });
    const recipe = read(d, 1);
    expect(recipe).toMatchObject({
      title: "Rundstykker",
      sourceName: "Matprat",
      sourceUrl: url,
      originalServings: 1,
      savedAt: null,
    });
    expect(recipe.ingredients).toHaveLength(10);
    expect(recipe.ingredients.at(-1)?.original).toBe("0,5 egg til pensling");
    expect(recipe.ingredients.at(-1)?.quantity).toEqual({ min: 0.5 });
    expect(recipe.steps).toHaveLength(4);
  });

  it("Godt: parseLine gir mengde, enhet og navn", async () => {
    const d = deps();
    const url = "https://www.godt.no/oppskrifter/pannekaker-og-vafler/8749/grove-middagspannekaker";
    expect(await importRecipe(url, d)).toEqual({ ok: true, value: { id: 1 } });
    const recipe = read(d, 1);
    expect(recipe).toMatchObject({
      title: "Grove pannekaker - Perfekt middag",
      sourceName: "Godt.no",
      originalServings: 6,
    });
    expect(recipe.ingredients).toHaveLength(7);
    expect(recipe.ingredients[0]).toMatchObject({
      original: "4 stk egg",
      quantity: { min: 4 },
      unit: "stk",
      name: "egg",
      parseable: true,
    });
    expect(recipe.steps).toHaveLength(2);
    expect(recipe.steps[1].text.endsWith("Serveres nystekte!")).toBe(true);
  });

  it("fem sider med oppskrift importeres, fem uten gir no_recipe, og ingenting delvis lagres", async () => {
    const d = deps();
    const withRecipe = [
      "https://www.tine.no/oppskrifter/middag-og-hovedretter/kjott/kjottboller-i-tomatsaus",
      "https://www.matprat.no/oppskrifter/familien/rundstykker/",
      "https://www.matprat.no/oppskrifter/rask/enkel-brodoppskrift/",
      "https://www.godt.no/oppskrifter/pannekaker-og-vafler/155/amerikanske-pannekaker",
      "https://www.godt.no/oppskrifter/pannekaker-og-vafler/8749/grove-middagspannekaker",
    ];
    for (const url of withRecipe) expect((await importRecipe(url, d)).ok, url).toBe(true);
    expect(count(d.db, "recipes")).toBe(5);

    const without = [
      "https://www.klikk.no/mat/spise/oppskrift-pa-farikal-2530170",
      "https://northwildkitchen.com/norwegian-brown-cheese-meatballs-kjottkaker-med-brunost/",
      "https://www.matoppskrift.no/oppskrift/pannekaker-grunnoppskrift",
      "https://www.matoppskrift.no/oppskrift/kjoettkaker-3",
      "https://www.bbcgoodfoodme.com/recipes/classic-lasagne-0/",
    ];
    for (const url of without) {
      expect(await importRecipe(url, d), url).toEqual({ ok: false, error: { kind: "no_recipe" } });
    }
    expect(count(d.db, "recipes")).toBe(5);
  });

  it("siden mangler porsjonsantall: originalServings er null og alt annet lagres", async () => {
    const d = deps({
      fetcher: staticFetcher(ld({ name: "Uten porsjoner", recipeIngredient: ["2 egg"] })),
    });
    const result = await importRecipe("https://a.no/x", d);
    expect(result.ok).toBe(true);
    const recipe = read(d, 1);
    expect(recipe.originalServings).toBeNull();
    expect(recipe.ingredients[0]).toMatchObject({ quantity: { min: 2 }, name: "egg" });
    expect(recipe.steps).toEqual([]);
  });
});

describe("importRecipe: adresser", () => {
  it("lagrer og henter den normaliserte adressen, aldri sluttadressen etter omdirigering", async () => {
    const fetcher = staticFetcher(
      ld({ name: "X", recipeIngredient: ["1 egg"] }),
      "https://helt-annen.no/nytt/sted",
    );
    const d = deps({ fetcher });
    const result = await importRecipe("  www.A.no/Sti/?utm_source=x&b=1#del  ", d);
    expect(result.ok).toBe(true);
    expect(fetcher.fetch).toHaveBeenCalledExactlyOnceWith("https://www.a.no/Sti/?b=1");
    expect(read(d, 1).sourceUrl).toBe("https://www.a.no/Sti/?b=1");
  });

  it.each(["", "hei", "ftp://a.no", "javascript:alert(1)", "http://", "https://u:p@a.no"])(
    "ugyldig lenke %j gir invalid_url uten henting eller lagring",
    async (url) => {
      const d = deps({ fetcher: forbiddenFetcher });
      expect(await importRecipe(url, d)).toEqual({ ok: false, error: { kind: "invalid_url" } });
      expect(count(d.db, "recipes")).toBe(0);
    },
  );

  it("IP-former normaliseres og sendes videre til adapteren, som avviser dem", async () => {
    const fetcher = { fetch: vi.fn(async () => err(appError("fetch_failed", "blocked"))) };
    const d = deps({ fetcher });
    expect((await importRecipe("http://2130706433/", d)).ok).toBe(false);
    expect(fetcher.fetch).toHaveBeenCalledWith("http://127.0.0.1/");
  });
});

describe("importRecipe: duplikat (FR-13)", () => {
  const url = "https://www.matprat.no/oppskrifter/familien/rundstykker/";

  it("lagret oppskrift med samme adresse (annet fragment og sporing) gir duplicate uten henting", async () => {
    const d = deps();
    const first = await importRecipe(url, d);
    expect(first.ok).toBe(true);
    if (!first.ok) return;
    expect(saveRecipeToCollection(TEST_USER_ID, first.value.id, d.db).ok).toBe(true);

    forbiddenFetcher.fetch.mockClear();
    const again = await importRecipe(`${url}?utm_source=nyhetsbrev&fbclid=1#fremgangsmate`, {
      ...d,
      fetcher: forbiddenFetcher,
    });
    expect(again).toEqual({
      ok: false,
      error: { kind: "duplicate", detail: String(first.value.id) },
    });
    expect(forbiddenFetcher.fetch).not.toHaveBeenCalled();
    expect(count(d.db, "recipes")).toBe(1);
  });

  it("ulagret import med samme adresse gjenbrukes: samme id, ingen ny rad, ingen ny henting", async () => {
    const fetcher = staticFetcher(ld({ name: "X", recipeIngredient: ["1 egg"] }));
    const d = deps({ fetcher });
    const first = await importRecipe("https://a.no/x", d);
    const second = await importRecipe("https://a.no/x#igjen", d);
    expect(first).toEqual({ ok: true, value: { id: 1 } });
    expect(second).toEqual({ ok: true, value: { id: 1 } });
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
    expect(count(d.db, "recipes")).toBe(1);
  });

  it("gjenbruk av ulagret import fornyer createdAt, så den ikke ryddes bort", async () => {
    const fetcher = staticFetcher(ld({ name: "X", recipeIngredient: ["1 egg"] }));
    const first = deps({ fetcher, now: () => new Date("2026-01-01T10:00:00.000Z") });
    await importRecipe("https://a.no/x", first);
    await importRecipe("https://a.no/x", {
      ...first,
      now: () => new Date("2026-01-02T09:00:00.000Z"),
    });
    const row = first.db.$client.prepare("select created_at as c from recipes").get() as {
      c: string;
    };
    expect(row.c).toBe("2026-01-02T09:00:00.000Z");
  });

  it("ulike stier og http mot https er ulike oppskrifter", async () => {
    const fetcher = staticFetcher(ld({ name: "X", recipeIngredient: ["1 egg"] }));
    const d = deps({ fetcher });
    for (const url of ["https://a.no/a", "https://a.no/A", "https://a.no/a/", "http://a.no/a"]) {
      expect((await importRecipe(url, d)).ok, url).toBe(true);
    }
    expect(count(d.db, "recipes")).toBe(4);
  });

  it("https://a.no og https://a.no/ er samme adresse", async () => {
    const fetcher = staticFetcher(ld({ name: "X", recipeIngredient: ["1 egg"] }));
    const d = deps({ fetcher });
    await importRecipe("https://a.no", d);
    await importRecipe("https://a.no/", d);
    expect(count(d.db, "recipes")).toBe(1);
    expect(fetcher.fetch).toHaveBeenCalledTimes(1);
  });

  it("race: to samtidige importer av samme adresse gir én rad", async () => {
    let release!: () => void;
    const gate = new Promise<void>((done) => (release = done));
    const html = ld({ name: "X", recipeIngredient: ["1 egg"] });
    const fetcher = {
      fetch: vi.fn(async (url: string) => {
        await gate;
        return ok({ html, finalUrl: url });
      }),
    };
    const d = deps({ fetcher });
    const both = Promise.all([
      importRecipe("https://a.no/x", d),
      importRecipe("https://a.no/x", d),
    ]);
    release();
    const [a, b] = await both;
    expect(a).toEqual({ ok: true, value: { id: 1 } });
    expect(b).toEqual({ ok: true, value: { id: 1 } });
    expect(count(d.db, "recipes")).toBe(1);
    expect(count(d.db, "ingredient_lines")).toBe(1);
  });

  it("race: noen lagrer oppskriften mens vi henter, så får vi duplicate og ingen ny rad", async () => {
    const d = deps();
    const html = ld({ name: "X", recipeIngredient: ["1 egg"] });
    const fetcher = {
      fetch: vi.fn(async (url: string) => {
        // Samtidig import fra en annen fane som lagres i samlingen mens denne henter.
        const other = await importRecipe("https://a.no/x", { ...d, fetcher: staticFetcher(html) });
        if (other.ok) saveRecipeToCollection(TEST_USER_ID, other.value.id, d.db);
        return ok({ html, finalUrl: url });
      }),
    };
    const result = await importRecipe("https://a.no/x", { ...d, fetcher });
    expect(result).toEqual({ ok: false, error: { kind: "duplicate", detail: "1" } });
    expect(count(d.db, "recipes")).toBe(1);
  });
});

describe("importRecipe: feil", () => {
  it("fetch_failed fra adapteren gis videre, og ingenting lagres", async () => {
    const fetcher = { fetch: vi.fn(async () => err(appError("fetch_failed", "blocked"))) };
    const d = deps({ fetcher });
    expect(await importRecipe("https://a.no/x", d)).toEqual({
      ok: false,
      error: { kind: "fetch_failed", detail: "blocked" },
    });
    expect(count(d.db, "recipes")).toBe(0);
  });

  it("no_recipe fra adapteren (ikke HTML) gis videre", async () => {
    const fetcher = { fetch: vi.fn(async () => err(appError("no_recipe", "not_html"))) };
    const d = deps({ fetcher });
    const result = await importRecipe("https://a.no/x", d);
    expect(!result.ok && result.error.kind).toBe("no_recipe");
  });

  it.each([
    ["oversiktsside uten Recipe", "<html><body><h1>Oppskrifter</h1></body></html>"],
    ["ugyldig JSON-LD", '<script type="application/ld+json">{ikke json</script>'],
    ["Recipe uten tittel", ld({ recipeIngredient: ["1 egg"] })],
    ["Recipe uten ingredienser og steg", ld({ name: "Tom" })],
    ["tom side", ""],
  ])("%s gir no_recipe uten lagring", async (_name, html) => {
    const d = deps({ fetcher: staticFetcher(html) });
    expect(await importRecipe("https://a.no/x", d)).toEqual({
      ok: false,
      error: { kind: "no_recipe" },
    });
    expect(count(d.db, "recipes")).toBe(0);
  });

  it("databasefeil midt i skrivingen: alt rulles tilbake og tjenesten gir unknown", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const d = deps({
      fetcher: staticFetcher(
        ld({ name: "X", recipeIngredient: ["1 egg"], recipeInstructions: ["Stek."] }),
      ),
    });
    d.db.$client.exec(
      "create trigger stopp before insert on steps begin select raise(abort, 'database full'); end",
    );
    const result = await importRecipe("https://a.no/x", d);
    expect(result).toEqual({ ok: false, error: { kind: "unknown" } });
    expect(count(d.db, "recipes")).toBe(0);
    expect(count(d.db, "ingredient_lines")).toBe(0);
    expect(count(d.db, "steps")).toBe(0);
    expect(consoleError).toHaveBeenCalled();
  });

  it("lukket database gir unknown, ikke unntak", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const d = deps();
    d.db.$client.close();
    expect(await importRecipe("https://a.no/x", d)).toEqual({
      ok: false,
      error: { kind: "unknown" },
    });
  });

  it("en adapter som kaster (bryter porten) gir unknown, ikke unntak", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const d = deps({ fetcher: forbiddenFetcher });
    expect(await importRecipe("https://a.no/x", d)).toEqual({
      ok: false,
      error: { kind: "unknown" },
    });
    expect(count(d.db, "recipes")).toBe(0);
  });
});

describe("importRecipe: grenser fra LIMITS", () => {
  it("tittel 500 tegn, steg 5000 tegn og 150 ingredienser avkortes", async () => {
    const html = ld({
      name: "T".repeat(500),
      author: { name: "K".repeat(400) },
      recipeYield: 4,
      recipeIngredient: Array.from({ length: 150 }, (_, i) => `${i + 1} g mel ${"x".repeat(400)}`),
      recipeInstructions: [
        "S".repeat(5000),
        ...Array.from({ length: 149 }, (_, i) => `Steg ${i + 2}`),
      ],
    });
    const d = deps({ fetcher: staticFetcher(html) });
    expect((await importRecipe("https://a.no/x", d)).ok).toBe(true);
    const recipe = read(d, 1);

    expect(recipe.title).toHaveLength(LIMITS.titleLength);
    expect(recipe.title.endsWith("…")).toBe(true);
    expect(recipe.sourceName?.length).toBeLessThanOrEqual(LIMITS.titleLength);

    expect(recipe.ingredients).toHaveLength(LIMITS.linesPerField);
    for (const line of recipe.ingredients) {
      expect(line.original.length).toBeLessThanOrEqual(LIMITS.ingredientLineLength);
      expect(line.original.endsWith("…")).toBe(true);
    }
    expect(recipe.ingredients[0]).toMatchObject({ position: 0, quantity: { min: 1 }, unit: "g" });
    expect(recipe.ingredients.at(-1)?.position).toBe(99);

    expect(recipe.steps).toHaveLength(LIMITS.linesPerField);
    expect(recipe.steps[0].text).toHaveLength(LIMITS.stepLength);
    expect(recipe.steps[0].text.endsWith("…")).toBe(true);
    expect(recipe.steps[1].text).toBe("Steg 2");
  });

  it("tekster innenfor grensene røres ikke, og akkurat 100 linjer beholdes", async () => {
    const html = ld({
      name: "T".repeat(LIMITS.titleLength),
      recipeIngredient: Array.from({ length: 100 }, () => "1 egg"),
      recipeInstructions: Array.from({ length: 100 }, (_, i) => `Steg ${i}`),
    });
    const d = deps({ fetcher: staticFetcher(html) });
    await importRecipe("https://a.no/x", d);
    const recipe = read(d, 1);
    expect(recipe.title).toBe("T".repeat(LIMITS.titleLength));
    expect(recipe.ingredients).toHaveLength(100);
    expect(recipe.steps).toHaveLength(100);
  });
});

describe("buildImportedContent", () => {
  it("beholder seksjonsnavn på steg og setter seksjon på ingredienser til null", () => {
    const content = buildImportedContent({
      title: "X",
      sourceName: null,
      servings: null,
      ingredients: [{ text: "2 dl melk" }],
      steps: [
        { text: "Rør.", section: "Deig" },
        { text: "Stek.", section: null },
      ],
    });
    expect(content.sourceName).toBeNull();
    expect(content.ingredients[0]).toMatchObject({
      section: null,
      original: "2 dl melk",
      unit: "dl",
    });
    expect(content.steps).toEqual([
      { text: "Rør.", position: 0, section: "Deig" },
      { text: "Stek.", position: 1, section: null },
    ]);
  });
});

describe("importRecipe og eierskap (Story 5.13)", () => {
  const url = "https://www.matprat.no/oppskrifter/familien/rundstykker/";
  it("en import uten innlogging har ingen eier, og en innlogget import blir brukerens", async () => {
    const d = deps({ userId: null });
    const anonymous = await importRecipe(url, d);
    expect(anonymous.ok).toBe(true);
    if (!anonymous.ok) return;
    const owner = d.db.$client
      .prepare("select user_id from recipes where id = ?")
      .get(anonymous.value.id) as { user_id: number | null };
    expect(owner.user_id).toBeNull();

    const mine = await importRecipe(url, { ...d, userId: TEST_USER_ID });
    expect(mine.ok && mine.value.id !== anonymous.value.id).toBe(true);
  });

  it("en annens lagrede oppskrift med samme adresse gir ikke duplicate", async () => {
    const d = deps();
    const first = await importRecipe(url, d);
    if (!first.ok) throw new Error("feil");
    expect(saveRecipeToCollection(TEST_USER_ID, first.value.id, d.db).ok).toBe(true);
    const anonymous = await importRecipe(url, { ...d, userId: null });
    expect(anonymous.ok).toBe(true);
  });
});

describe("importRecipe: tid (Story 6.2)", () => {
  it("lagrer tiden fra kilden (totalTime PT80M på Rundstykker)", async () => {
    const d = deps();
    const result = await importRecipe(
      "https://www.matprat.no/oppskrifter/familien/rundstykker/",
      d,
    );
    if (!result.ok) throw new Error("feil");
    const row = d.db.$client
      .prepare("select total_minutes as m from recipes where id = ?")
      .get(result.value.id);
    expect(row).toEqual({ m: 80 });
  });
});
