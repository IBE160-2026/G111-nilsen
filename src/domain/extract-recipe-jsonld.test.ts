import { describe, expect, it } from "vitest";
import { extractRecipeJsonLd } from "./extract-recipe-jsonld";
import type { RecipeNode } from "./import-types";

const RECIPE = { "@type": "Recipe", name: "Pannekaker" };
const OPEN = '<script type="application/ld+json">';

function block(json: unknown, open = OPEN): string {
  return `${open}${typeof json === "string" ? json : JSON.stringify(json)}</script>`;
}

function page(...blocks: string[]): string {
  return `<!doctype html><html><head><title>x</title>${blocks.join("\n")}</head><body>hei</body></html>`;
}

function expectRecipe(html: string, name = "Pannekaker"): RecipeNode {
  const result = extractRecipeJsonLd(html);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error("ikke funnet");
  expect(result.value.name).toBe(name);
  return result.value;
}

function expectNoRecipe(html: unknown): void {
  expect(extractRecipeJsonLd(html as string)).toEqual({ ok: false, error: { kind: "no_recipe" } });
}

describe("extractRecipeJsonLd: hvor Recipe står", () => {
  it("enkelt objekt", () => {
    expectRecipe(page(block(RECIPE)));
  });

  it("liste av objekter", () => {
    expectRecipe(page(block([{ "@type": "BreadcrumbList" }, RECIPE])));
  });

  it("@graph", () => {
    expectRecipe(
      page(block({ "@context": "https://schema.org", "@graph": [{ "@type": "WebSite" }, RECIPE] })),
    );
  });

  it("nestet liste i @graph", () => {
    expectRecipe(page(block({ "@graph": [{ "@type": "WebSite" }, [[RECIPE]]] })));
  });

  it("@graph inni liste", () => {
    expectRecipe(page(block([{ "@graph": [RECIPE] }])));
  });

  it("@type som liste", () => {
    expectRecipe(page(block({ ...RECIPE, "@type": ["Recipe", "NewsArticle"] })));
    expectRecipe(page(block({ ...RECIPE, "@type": ["NewsArticle", "Recipe"] })));
  });

  it.each([
    "https://schema.org/Recipe",
    "http://schema.org/Recipe",
    "https://www.schema.org/Recipe",
    "schema:Recipe",
    " Recipe ",
  ])("full type eller prefiks: %s", (type) => {
    expectRecipe(page(block({ ...RECIPE, "@type": type })));
  });

  it.each([
    "recipe",
    "Recipes",
    "RecipeBox",
    "https://example.com/Recipe",
    "xschema:Recipe",
    "",
    5,
    null,
    {},
    ["Article"],
    [5],
  ])("feil type gir ingen oppskrift: %j", (type) => {
    expectNoRecipe(page(block({ ...RECIPE, "@type": type })));
  });

  it("følger ikke @id-referanser og ikke andre felt enn @graph", () => {
    expectNoRecipe(
      page(
        block({
          "@graph": [
            { "@type": "WebPage", mainEntity: { "@id": "#oppskrift" } },
            { "@id": "#oppskrift" },
          ],
        }),
      ),
    );
    expectNoRecipe(page(block({ "@type": "WebPage", mainEntity: RECIPE })));
  });

  it("første Recipe i dokumentrekkefølge vinner", () => {
    const first = { ...RECIPE, name: "Første" };
    const second = { ...RECIPE, name: "Andre" };
    expectRecipe(page(block([first, second])), "Første");
    expectRecipe(page(block({ "@graph": [first, second] })), "Første");
    expectRecipe(page(block(first), block(second)), "Første");
  });

  it("Recipe som selv har @graph vinner over det som ligger i grafen", () => {
    expectRecipe(
      page(block({ ...RECIPE, name: "Ytre", "@graph": [{ ...RECIPE, name: "Indre" }] })),
      "Ytre",
    );
  });

  it("returnerer hele objektet med alle felt", () => {
    const node = expectRecipe(
      page(block({ ...RECIPE, recipeYield: "4", recipeIngredient: ["a"] })),
    );
    expect(node.recipeYield).toBe("4");
    expect(node.recipeIngredient).toEqual(["a"]);
  });
});

describe("extractRecipeJsonLd: «>»-søket er lineært", () => {
  // Kvadratisk løsning: hver «<script» skannet til slutten av dokumentet etter en «>». 4 MB gir
  // mange sekunder uten rettelsen og noen titalls millisekunder med den.
  it.each([
    ["<script ", "<script ".repeat(524288) + ">"],
    ["<script x", "<script x".repeat(466000) + ">"],
    ["<script ", "<script ".repeat(524288)],
  ])("4 MB med «%s» gjentatt", (_unit, html) => {
    expect(html.length).toBeGreaterThanOrEqual(4_000_000);
    const start = performance.now();
    expectNoRecipe(html);
    expect(performance.now() - start).toBeLessThan(3000);
  });

  it("finner fortsatt oppskriften bak mange ufullstendige tagger og en lang tagg", () => {
    expectRecipe(`${"<script x".repeat(1000)}>${block(RECIPE)}`);
    expectRecipe(`${"<script ".repeat(2000)}> ${block(RECIPE)}`);
  });
});

describe("extractRecipeJsonLd: script-tagger", () => {
  it.each([
    '<script type="application/ld+json">',
    "<script type='application/ld+json'>",
    "<script type=application/ld+json>",
    '<SCRIPT TYPE="APPLICATION/LD+JSON">',
    '<script id="a" data-x="1" type="application/ld+json" class="b">',
    '<script class="b" async type="application/ld+json" id="a">',
    '<script type = "application/ld+json" >',
    '<script\n  type="application/ld+json"\n>',
    '<script type="application/ld+json; charset=utf-8">',
    '<script type=" application/ld+json ">',
    '<script type="application/ld+json"/>',
  ])("godtar %j", (open) => {
    expectRecipe(page(block(RECIPE, open)));
  });

  it.each([
    '<script type="text/javascript">',
    '<script type="application/json">',
    '<script data-type="application/ld+json">',
    '<script type="application/ld+jsonx">',
    "<script>",
    '<scripts type="application/ld+json">',
    '<style type="application/ld+json">',
  ])("godtar ikke %j", (open) => {
    expectNoRecipe(page(block(RECIPE, open)));
  });

  it("godtar store og små bokstaver i avsluttende tagg", () => {
    expectRecipe(`${OPEN}${JSON.stringify(RECIPE)}</SCRIPT>`);
    expectRecipe(`${OPEN}${JSON.stringify(RECIPE)}</script >`);
  });

  it("finner blokken etter andre script-tagger", () => {
    expectRecipe(
      page('<script>var a = "<b>";</script>', '<script src="x.js"></script>', block(RECIPE)),
    );
  });

  it("hopper over en blokk som ikke avsluttes (avkortet side)", () => {
    expectNoRecipe(`<html>${OPEN}${JSON.stringify(RECIPE)}`);
    expectNoRecipe(`<html><script type="application/ld+json"`);
    expectNoRecipe("<html><script");
  });

  it("en for lang tagg tolkes ikke som script-tagg", () => {
    expectNoRecipe(
      `<script data-x="${"a".repeat(5000)}" type="application/ld+json">${JSON.stringify(RECIPE)}</script>`,
    );
  });
});

describe("extractRecipeJsonLd: flere blokker og ugyldig JSON", () => {
  it("ugyldig JSON i én blokk hopper over den blokken", () => {
    expectRecipe(page(block("{ ikke json"), block(RECIPE)));
    expectRecipe(page(block(""), block("   "), block("null"), block("42"), block(RECIPE)));
  });

  it("bare ugyldig JSON gir no_recipe", () => {
    expectNoRecipe(page(block("{ ikke json"), block("[1,2")));
  });

  it("ingen Recipe gir no_recipe", () => {
    expectNoRecipe(
      page(block({ "@type": "NewsArticle", headline: "x" }), block({ "@type": "WebSite" })),
    );
  });

  it("ingen JSON-LD gir no_recipe", () => {
    expectNoRecipe("<html><body><h1>Pannekaker</h1><p>1 dl melk</p></body></html>");
  });

  it("tolererer rå linjeskift, tabulator og andre kontrolltegn i strenger", () => {
    const raw = `{"@type":"Recipe","name":"Panne\nkaker\tmed\u0001x","recipeInstructions":"a\r\nb"}`;
    const node = expectRecipe(page(block(raw)), "Panne\nkaker\tmed\u0001x");
    expect(node.recipeInstructions).toBe("a\r\nb");
  });

  it("endrer ikke escape-sekvenser og anførselstegn i strenger ved utbedring", () => {
    const raw = `{"@type":"Recipe","name":"Si \\"hei\\" \\\\ til\nmeg"}`;
    expectRecipe(page(block(raw)), 'Si "hei" \\ til\nmeg');
  });

  it("tolererer BOM", () => {
    expectRecipe(page(block(`﻿${JSON.stringify(RECIPE)}`)));
  });

  it.each([
    ["HTML-kommentar", `<!--\n${JSON.stringify(RECIPE)}\n-->`],
    ["CDATA med linjekommentar", `//<![CDATA[\n${JSON.stringify(RECIPE)}\n//]]>`],
    ["CDATA med blokkommentar", `/*<![CDATA[*/\n${JSON.stringify(RECIPE)}\n/*]]>*/`],
    ["ren CDATA", `<![CDATA[${JSON.stringify(RECIPE)}]]>`],
    // Én innpakning per runde; opptil tre lag fjernes.
    ["to lag: kommentar og CDATA", `<!--\n//<![CDATA[\n${JSON.stringify(RECIPE)}\n//]]>\n-->`],
    ["tre lag", `<!-- <!-- <![CDATA[${JSON.stringify(RECIPE)}]]> --> -->`],
    ["blanke tegn rundt", `\n\n   ${JSON.stringify(RECIPE)}   \n`],
  ])("tolererer innpakning: %s", (_name, content) => {
    expectRecipe(page(block(content)));
  });

  it("fire lag innpakning er for mye", () => {
    expectNoRecipe(page(block(`<!-- <!-- <!-- <![CDATA[${JSON.stringify(RECIPE)}]]> --> --> -->`)));
  });

  it.each([
    ["søppel etter JSON", `${JSON.stringify(RECIPE)} søppel`],
    ["søppel før JSON", `søppel ${JSON.stringify(RECIPE)}`],
    ["enkle anførselstegn", "{'@type':'Recipe','name':'Pannekaker'}"],
    ["komma på slutten", '{"@type":"Recipe","name":"Pannekaker",}'],
    ["kommentar inni JSON", '{"@type":"Recipe", /* x */ "name":"Pannekaker"}'],
    ["to objekter etter hverandre", `${JSON.stringify(RECIPE)}${JSON.stringify(RECIPE)}`],
    ["ikke-escapet anførselstegn", '{"@type":"Recipe","name":"Si "hei" nå"}'],
  ])("godtar ikke vilkårlig søppel: %s", (_name, content) => {
    expectNoRecipe(page(block(content)));
  });
});

describe("extractRecipeJsonLd: tåler hva som helst uten å kaste", () => {
  it.each([
    "",
    " ",
    "<html",
    "<script",
    "</script>",
    "<script>>>",
    "\u0000\u0001\u0002",
    "￿\uD800",
    "�".repeat(100),
  ])("tom eller søppelinput %j", (input) => {
    expectNoRecipe(input);
  });

  it.each([undefined, null, 5, true, {}, [], ["<html>"], () => "x", Symbol("x")])(
    "ikke-streng %s",
    (input) => {
      expectNoRecipe(input);
    },
  );

  it("binærdata", () => {
    let binary = "";
    for (let i = 0; i < 20000; i++) binary += String.fromCharCode((i * 7919) % 256);
    expectNoRecipe(binary);
    expectNoRecipe(`${OPEN}${binary}</script>`);
  });

  it("svært dype JSON-strukturer", () => {
    expectNoRecipe(page(block("[".repeat(200000) + "]".repeat(200000))));
    expectNoRecipe(page(block(`{"a":`.repeat(50000) + "1" + "}".repeat(50000))));
  });

  it("@graph nestet dypere enn dybdegrensen gir no_recipe, grunnere finnes", () => {
    const nest = (levels: number): unknown => {
      let value: unknown = RECIPE;
      for (let i = 0; i < levels; i++) value = { "@graph": [value] };
      return value;
    };
    expectRecipe(page(block(nest(3))));
    expectNoRecipe(page(block(nest(40))));
    expectNoRecipe(
      page(block('{"@graph":['.repeat(4000) + '{"@type":"Recipe"}' + "]}".repeat(4000))),
    );
  });

  it("svært mange elementer i en liste", () => {
    const items = Array.from({ length: 50000 }, () => ({ "@type": "ListItem" }));
    expectRecipe(page(block([...items, RECIPE])));
  });
});
