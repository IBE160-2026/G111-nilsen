import { describe, expect, it } from "vitest";
import { normalizeRecipe } from "./normalize-recipe";
import type { ImportedRecipe, RecipeNode } from "./import-types";

const BASE = { "@type": "Recipe", name: "Pannekaker", recipeIngredient: ["1 dl melk"] };

function node(extra: Record<string, unknown> = {}): RecipeNode {
  return { ...BASE, ...extra };
}

function normalize(extra: Record<string, unknown> = {}): ImportedRecipe {
  const result = normalizeRecipe(node(extra));
  if (!result.ok) throw new Error(`forventet ok, fikk ${JSON.stringify(result.error)}`);
  return result.value;
}

function expectNoRecipe(value: unknown): void {
  const result = normalizeRecipe(value as RecipeNode);
  expect(result.ok).toBe(false);
  if (!result.ok) expect(result.error.kind).toBe("no_recipe");
}

const texts = (steps: ImportedRecipe["steps"]) => steps.map((s) => s.text);

describe("normalizeRecipe: form og tittel", () => {
  it("gir nøyaktig de avtalte feltene, uten bilde, HTML eller URL", () => {
    const recipe = normalize({
      image: "https://example.com/x.jpg",
      url: "https://example.com/oppskrift",
      description: "<p>Beskrivelse</p>",
      recipeInstructions: "Stek.",
    });
    expect(Object.keys(recipe).sort()).toEqual([
      "ingredients",
      "servings",
      "sourceName",
      "steps",
      "title",
      "totalMinutes",
    ]);
    expect(JSON.stringify(recipe)).not.toMatch(/https?:|example\.com/);
  });

  it("tittelen renses", () => {
    expect(normalize({ name: "  <b>Sm&oslash;rkaker</b> &amp;  mer \n" }).title).toBe(
      "Smørkaker & mer",
    );
  });

  it("tittel fra liste: første ikke-tomme streng", () => {
    expect(normalize({ name: ["", "  ", 5, null, "Pannekaker", "Annet"] }).title).toBe(
      "Pannekaker",
    );
  });

  it.each([
    ["mangler", undefined],
    ["tom", ""],
    ["bare blanke tegn", " \n\t "],
    ["bare tagger", "<br><b></b>"],
    ["tall", 5],
    ["objekt", { text: "x" }],
    ["tom liste", []],
    ["liste uten tekst", [null, 5, {}]],
    ["null", null],
    ["boolsk", true],
  ])("tittel som er %s gir no_recipe", (_label, name) => {
    expectNoRecipe(node({ name }));
  });

  it("en skall uten ingredienser og steg gir no_recipe", () => {
    expectNoRecipe({ "@type": "Recipe", name: "Bare tittel" });
    expectNoRecipe(node({ recipeIngredient: [], recipeInstructions: [] }));
    expectNoRecipe(node({ recipeIngredient: ["", "  "], recipeInstructions: ["", " "] }));
    expectNoRecipe(node({ recipeIngredient: 5, recipeInstructions: true }));
  });

  it("tåler at noden ikke er et objekt", () => {
    for (const value of [null, undefined, "tekst", 5, true, [], [BASE]]) expectNoRecipe(value);
  });
});

describe("normalizeRecipe: kildenavn", () => {
  it("bruker publisher.name", () => {
    expect(normalize({ publisher: { "@type": "Organization", name: "Godt" } }).sourceName).toBe(
      "Godt",
    );
  });

  it("publisher vinner over author", () => {
    expect(normalize({ publisher: { name: "Godt" }, author: { name: "Ola" } }).sourceName).toBe(
      "Godt",
    );
  });

  it("bruker author når publisher mangler eller ikke har navn", () => {
    expect(normalize({ author: { name: "Ola" } }).sourceName).toBe("Ola");
    expect(normalize({ publisher: {}, author: { name: "Ola" } }).sourceName).toBe("Ola");
    expect(normalize({ publisher: { name: " " }, author: { name: "Ola" } }).sourceName).toBe("Ola");
  });

  it("author kan være streng, objekt eller liste", () => {
    expect(normalize({ author: "Kari" }).sourceName).toBe("Kari");
    expect(normalize({ author: [{ name: "A" }, { name: "B" }] }).sourceName).toBe("A");
    expect(normalize({ author: [{}, "", { name: "B" }] }).sourceName).toBe("B");
  });

  it("publisher kan også være en streng", () => {
    expect(normalize({ publisher: "Matprat" }).sourceName).toBe("Matprat");
  });

  describe("URL som navn brukes ikke", () => {
    it.each([
      "https://www.example.com",
      "http://example.com/om-oss",
      "HTTPS://EXAMPLE.COM",
      "http://localhost",
      "https://example",
      "example.com/side",
      "www.example.com/side/",
      "&lt;https://example.com&gt;",
    ])("%s", (url) => {
      expect(normalize({ publisher: url }).sourceName).toBeNull();
      expect(normalize({ publisher: { name: url } }).sourceName).toBeNull();
      expect(normalize({ author: url }).sourceName).toBeNull();
      expect(normalize({ author: [{ name: url }] }).sourceName).toBeNull();
    });

    it("prøver neste kandidat i stedet", () => {
      expect(normalize({ publisher: "https://example.com/", author: "Kari" }).sourceName).toBe(
        "Kari",
      );
      expect(
        normalize({ publisher: { name: "http://x.no" }, author: { name: "Ola" } }).sourceName,
      ).toBe("Ola");
      expect(normalize({ author: ["https://a.no/b", { name: "Per" }] }).sourceName).toBe("Per");
    });

    it.each([
      "Matprat.no",
      "Godt.no",
      "TINE Kjøkken",
      "A/S Mat",
      "Mat og drikke https://x.no",
      "Ola Nordmann",
    ])("vanlige navn beholdes: %s", (name) => {
      expect(normalize({ publisher: name }).sourceName).toBe(name);
    });
  });

  it("navnet renses", () => {
    expect(normalize({ publisher: { name: "Mat&nbsp;&amp;<i> Drikke</i>" } }).sourceName).toBe(
      "Mat & Drikke",
    );
  });

  it.each([
    undefined,
    null,
    "",
    5,
    true,
    {},
    [],
    { name: 5 },
    { name: { name: "x" } },
    [[[[[{ name: "for dypt" }]]]]],
  ])("gir null for %j", (value) => {
    expect(normalize({ author: value }).sourceName).toBeNull();
    expect(normalize({ publisher: value }).sourceName).toBeNull();
  });
});

describe("normalizeRecipe: porsjonsantall", () => {
  it.each([
    ["4 porsjoner", 4],
    ["Serves 6", 6],
    [4, 4],
    [["4", "4 porsjoner"], 4],
    ["16 servings", 16],
    ["1 PORSJONER (1 porsjon gir ca. 20 rundstykker)", 1],
    ["1 PORSJONER (1 porsjon gir 3 brød i 1.5 liters former)", 1],
    ["4-6 porsjoner", 4],
    ["4–6", 4],
    ["4 - 6", 4],
    ["4 til 6", 4],
    ["Til 4", 4],
    ["Makes 12 cookies", 12],
    ["  8  ", 8],
    ["04", 4],
    ["4.", 4],
    ["Serves 4.", 4],
    ["1", 1],
    ["50", 50],
    [50, 50],
    [1, 1],
    ["6 porsjoner", 6],
    ["<b>3</b> porsjoner", 3],
    [[4, "x"], 4],
    [["4 porsjoner", 6], 4],
    [["", "noen", "6 stk"], 6],
    [[4.5, "6 stk"], 6],
    [{ value: "8" }, 8],
    [{ value: 8 }, 8],
    [{ name: "5 porsjoner" }, 5],
    [[{ "@type": "QuantitativeValue", value: 3 }], 3],
    [[[["7"]]], 7],
    // «Ikke gjett»: tall med måleenhet, mål (x) og brøker hoppes over; letingen fortsetter.
    ["12 stk", 12],
    ["ca. 4", 4],
    ["Makes 24 buns", 24],
    ["4 gjester", 4], // «g» i begynnelsen av et ord er ikke enheten gram
    ["1 liter, 4 porsjoner", 4],
    ["1 L og 3 porsjoner", 3],
    ["3 dl deig, 8 stk", 8],
    ["180 °C, 6 porsjoner", 6],
    ["4 grader ute, 5 porsjoner", 5],
    ["2-3 dl, 5 stk", 5],
    ["2 x 6 og 8 stk", 8],
    ["1/2 liter, 1 1/2 dl, 8 porsjoner", 8],
    ["1 ½ dl melk, 10 stk", 10],
    [["3 dl", "4"], 4],
  ])("%j gir %j", (recipeYield, expected) => {
    expect(normalize({ recipeYield }).servings).toBe(expected);
  });

  it.each([
    ["mangler", undefined],
    ["tom streng", ""],
    ["blanke tegn", "  \n "],
    ["0", 0],
    ["«0»", "0"],
    ["-3", -3],
    ["«-3»", "-3"],
    ["«-3 porsjoner»", "-3 porsjoner"],
    ["4.5", 4.5],
    ["«4.5»", "4.5"],
    ["«4,5 porsjoner»", "4,5 porsjoner"],
    ["halvt tall", 0.5],
    ["«noen»", "noen"],
    ["«noen få»", "noen få"],
    ["«ca. halvannen liter»", "ca. halvannen liter"],
    ["over grensen", 120],
    ["51", 51],
    ["«51 porsjoner»", "51 porsjoner"],
    ["«350 g»", "350 g"],
    ["svært stort tall", "99999999999999999999999"],
    ["Number.MAX_SAFE_INTEGER", Number.MAX_SAFE_INTEGER],
    ["Infinity", Number.POSITIVE_INFINITY],
    ["NaN", Number.NaN],
    ["null", null],
    ["tomt objekt", {}],
    ["objekt uten tolkbar verdi", { value: "noen", name: "mange" }],
    ["true", true],
    ["tom liste", []],
    ["liste uten tolkbart", ["", "noen", null, {}, 4.5]],
    ["brøk «1/2 porsjon»", "1/2 porsjon"],
    ["brøk «1/2»", "1/2"],
    ["blandet tall «1 1/2»", "1 1/2"],
    ["blandet tall «1 ½»", "1 ½"],
    ["blandet tall «4 ½»", "4 ½"],
    ["blandet tall «1½»", "1½"],
    ["brøk med mellomrom «1 / 2»", "1 / 2"],
    ["vitenskapelig skrivemåte «1e3»", "1e3"],
    ["måleenhet «3 dl»", "3 dl"],
    ["måleenhet «2 kg»", "2 kg"],
    ["måleenhet «5 cl»", "5 cl"],
    ["måleenhet «250 ml»", "250 ml"],
    ["måleenhet «2 liter»", "2 liter"],
    ["måleenhet «4 l»", "4 l"],
    ["måleenhet «20 cm»", "20 cm"],
    ["måleenhet «5 mm»", "5 mm"],
    ["måleenhet «200 °C»", "200 °C"],
    ["måleenhet «200°C»", "200°C"],
    ["måleenhet «180 grader»", "180 grader"],
    ["område med enhet «2-3 dl»", "2-3 dl"],
    ["«2 x 6»", "2 x 6"],
    ["«2x6»", "2x6"],
    ["«2 × 6»", "2 × 6"],
    ["«20x20 cm form»", "20x20 cm form"],
    ["«20x20»", "20x20"],
    ["brøktegn «1½ porsjon»", "1½ porsjon"],
    ["brøktegn «½ porsjon»", "½ porsjon"],
    ["for dypt nestet", [[[[[["4"]]]]]]],
  ])("utolkbar: %s gir null", (_label, recipeYield) => {
    expect(normalize({ recipeYield }).servings).toBeNull();
  });

  it("tall som hoppes over (enhet, x, brøk) gjør ikke at senere tall i samme tekst blir feil", () => {
    // Siste tall er tydelig: 51 er utenfor grensene og gir null, ikke et senere gyldig tall.
    expect(normalize({ recipeYield: "3 dl, 51 stk, 4 porsjoner" }).servings).toBeNull();
  });

  it("første tydelige heltall avgjør, også når det er utenfor grensene", () => {
    expect(normalize({ recipeYield: [120, "4"] }).servings).toBeNull();
    expect(normalize({ recipeYield: ["120 stk", "4 porsjoner"] }).servings).toBeNull();
  });
});

describe("normalizeRecipe: ingredienser", () => {
  it("liste av strenger: renset, trimmet, tomme fjernet, rekkefølgen beholdt", () => {
    const { ingredients } = normalize({
      recipeIngredient: [
        " 2 dl  melk ",
        "",
        "   ",
        "3 &frac12; ss <b>sukker</b>",
        "1 egg\n",
        "2 dl  melk ",
      ],
    });
    expect(ingredients).toEqual([
      { text: "2 dl melk" },
      { text: "3 ½ ss sukker" },
      { text: "1 egg" },
      { text: "2 dl melk" },
    ]);
  });

  it("en enkelt streng, også med flere linjer", () => {
    expect(normalize({ recipeIngredient: "2 dl melk" }).ingredients).toEqual([
      { text: "2 dl melk" },
    ]);
    expect(normalize({ recipeIngredient: "2 dl melk\n1 egg<br>salt" }).ingredients).toEqual([
      { text: "2 dl melk" },
      { text: "1 egg" },
      { text: "salt" },
    ]);
  });

  it("objekter med text eller name", () => {
    expect(
      normalize({
        recipeIngredient: [
          { text: "2 dl melk" },
          { name: "1 egg" },
          { text: "", name: "salt" },
          { text: 5 },
          {},
        ],
      }).ingredients,
    ).toEqual([{ text: "2 dl melk" }, { text: "1 egg" }, { text: "salt" }]);
  });

  it("hopper over elementer av feil type", () => {
    expect(
      normalize({ recipeIngredient: [5, null, true, ["a"], "1 dl melk", undefined] }).ingredients,
    ).toEqual([{ text: "1 dl melk" }]);
  });

  it("beholder originalteksten uten å tolke mengder", () => {
    const { ingredients } = normalize({
      recipeIngredient: ["ukokt 3 dl ris , gjerne basmatiris", "0.25 ts pepper", "ca. 1 l mel"],
    });
    expect(ingredients.map((i) => i.text)).toEqual([
      "ukokt 3 dl ris , gjerne basmatiris",
      "0.25 ts pepper",
      "ca. 1 l mel",
    ]);
    expect(Object.keys(ingredients[0])).toEqual(["text"]);
  });

  it.each([5, true, null, {}, { text: "x" }, [], ""])(
    "%j gir tom liste (når steg finnes)",
    (recipeIngredient) => {
      const result = normalize({ recipeIngredient, recipeInstructions: ["Stek."] });
      expect(result.ingredients).toEqual([]);
      expect(result.steps).toHaveLength(1);
    },
  );

  it("mangler recipeIngredient, men steg finnes", () => {
    const result = normalizeRecipe({ "@type": "Recipe", name: "x", recipeInstructions: ["Stek."] });
    expect(result.ok && result.value.ingredients).toEqual([]);
  });
});

describe("normalizeRecipe: steg", () => {
  const steps = (recipeInstructions: unknown) => normalize({ recipeInstructions }).steps;

  it("liste av HowToStep, i rekkefølge", () => {
    expect(
      steps([
        { "@type": "HowToStep", text: "Bland." },
        { "@type": "HowToStep", text: "Stek." },
        { "@type": "HowToStep", text: "Server." },
      ]),
    ).toEqual([
      { text: "Bland.", section: null },
      { text: "Stek.", section: null },
      { text: "Server.", section: null },
    ]);
  });

  it("HowToStep: name brukes bare når text mangler eller er tom", () => {
    expect(
      steps([
        { "@type": "HowToStep", name: "Step 1", text: "Bland." },
        { "@type": "HowToStep", name: "Stek på middels varme" },
        { "@type": "HowToStep", name: "Server", text: " " },
      ]).map((s) => s.text),
    ).toEqual(["Bland.", "Stek på middels varme", "Server"]);
  });

  it("HowToDirection og HowToTip teller bare med når de har text", () => {
    expect(
      texts(
        steps([
          { "@type": "HowToDirection", text: "Bland." },
          { "@type": "HowToDirection", name: "Bare navn" },
          { "@type": "HowToTip", text: "Tips: bruk kald smør." },
          { "@type": "HowToTip", name: "Bare navn" },
        ]),
      ),
    ).toEqual(["Bland.", "Tips: bruk kald smør."]);
  });

  it("type med full URL eller prefiks", () => {
    expect(
      texts(
        steps([
          { "@type": "https://schema.org/HowToStep", name: "Bare navn" },
          { "@type": ["HowToStep"], name: "Annet navn" },
          { "@type": "schema:HowToTip", name: "ikke med" },
        ]),
      ),
    ).toEqual(["Bare navn", "Annet navn"]);
  });

  it("objekt uten @type men med text regnes som steg", () => {
    expect(texts(steps([{ text: "Bland." }]))).toEqual(["Bland."]);
  });

  it("liste av rene strenger", () => {
    expect(steps(["Bland.", "  Stek. ", "", "Server."])).toEqual([
      { text: "Bland.", section: null },
      { text: "Stek.", section: null },
      { text: "Server.", section: null },
    ]);
  });

  it("blanding av strenger og objekter", () => {
    expect(
      texts(steps(["Bland.", { "@type": "HowToStep", text: "Stek." }, 5, null, true])),
    ).toEqual(["Bland.", "Stek."]);
  });

  it("et enkelt HowToStep-objekt (ikke liste)", () => {
    expect(steps({ "@type": "HowToStep", text: "Bland." })).toEqual([
      { text: "Bland.", section: null },
    ]);
  });

  it("HowToSection gir section til alle stegene i seksjonen", () => {
    expect(
      steps([
        {
          "@type": "HowToSection",
          name: "Deig",
          itemListElement: [
            { "@type": "HowToStep", text: "Bland mel og vann." },
            { "@type": "HowToStep", text: "Elt." },
          ],
        },
        {
          "@type": "HowToSection",
          name: "Fyll",
          itemListElement: [{ "@type": "HowToStep", text: "Rør sammen." }],
        },
      ]),
    ).toEqual([
      { text: "Bland mel og vann.", section: "Deig" },
      { text: "Elt.", section: "Deig" },
      { text: "Rør sammen.", section: "Fyll" },
    ]);
  });

  it("itemListElement kan være ett enkelt steg eller en streng", () => {
    expect(
      steps([
        {
          "@type": "HowToSection",
          name: "A",
          itemListElement: { "@type": "HowToStep", text: "Ett." },
        },
        { "@type": "HowToSection", name: "B", itemListElement: "To." },
        { "@type": "HowToSection", name: "C", itemListElement: ["Tre.", { text: "Fire." }] },
      ]),
    ).toEqual([
      { text: "Ett.", section: "A" },
      { text: "To.", section: "B" },
      { text: "Tre.", section: "C" },
      { text: "Fire.", section: "C" },
    ]);
  });

  it("steg utenfor seksjon har section null, og seksjonsnavn renses", () => {
    expect(
      steps([
        { "@type": "HowToStep", text: "Før." },
        {
          "@type": "HowToSection",
          name: " <b>Sm&oslash;r</b> ",
          itemListElement: [{ text: "Inni." }],
        },
        { "@type": "HowToStep", text: "Etter." },
      ]),
    ).toEqual([
      { text: "Før.", section: null },
      { text: "Inni.", section: "Smør" },
      { text: "Etter.", section: null },
    ]);
  });

  it("seksjon uten navn eller steg", () => {
    expect(steps([{ "@type": "HowToSection", itemListElement: [{ text: "Inni." }] }])).toEqual([
      { text: "Inni.", section: null },
    ]);
    expect(
      steps([{ "@type": "HowToSection", name: "Tom", itemListElement: [] }, { text: "Ett." }]),
    ).toEqual([{ text: "Ett.", section: null }]);
    expect(steps([{ "@type": "HowToSection", name: "Uten liste" }, { text: "Ett." }])).toEqual([
      { text: "Ett.", section: null },
    ]);
  });

  it("nestet seksjon: innerste navn vinner, uten navn arver den ytre", () => {
    expect(
      steps([
        {
          "@type": "HowToSection",
          name: "Ytre",
          itemListElement: [
            { "@type": "HowToSection", name: "Indre", itemListElement: [{ text: "a" }] },
            { "@type": "HowToSection", itemListElement: [{ text: "b" }] },
          ],
        },
      ]),
    ).toEqual([
      { text: "a", section: "Indre" },
      { text: "b", section: "Ytre" },
    ]);
  });

  it("ItemList med steg følges uten å gi seksjonsnavn", () => {
    expect(
      steps({
        "@type": "ItemList",
        name: "Ikke en seksjon",
        itemListElement: [{ "@type": "ListItem", text: "Bland." }],
      }),
    ).toEqual([{ text: "Bland.", section: null }]);
  });

  it("HowToStep beholder text med linjeskift som ett steg", () => {
    expect(steps([{ "@type": "HowToStep", text: "Stek.\n\nServer med <b>ris</b>." }])).toEqual([
      { text: "Stek. Server med ris.", section: null },
    ]);
  });

  describe("tekstblokk", () => {
    it.each([
      ["linjeskift", "Bland.\nStek.\nServer."],
      ["Windows-linjeskift", "Bland.\r\nStek.\r\nServer."],
      ["tomme linjer mellom", "Bland.\n\n\nStek.\n \nServer.\n"],
      ["p", "<p>Bland.</p><p>Stek.</p><p>Server.</p>"],
      ["p med linjeskift", "<p>Bland.</p>\n<p>Stek.</p>\n<p>Server.</p>"],
      ["br", "Bland.<br>Stek.<br/>Server."],
      ["br med blanke tegn", "Bland.<br />\nStek.<BR>Server."],
      ["li", "<ol><li>Bland.</li><li>Stek.</li><li>Server.</li></ol>"],
      ["kodet p", "&lt;p&gt;Bland.&lt;/p&gt;&lt;p&gt;Stek.&lt;/p&gt;&lt;p&gt;Server.&lt;/p&gt;"],
    ])("deles i steg på %s", (_label, block) => {
      expect(steps(block)).toEqual([
        { text: "Bland.", section: null },
        { text: "Stek.", section: null },
        { text: "Server.", section: null },
      ]);
    });

    it("en blokk uten linjeskift blir ett steg", () => {
      expect(steps("Bland alt. Stek i 10 minutter. Server.")).toEqual([
        { text: "Bland alt. Stek i 10 minutter. Server.", section: null },
      ]);
    });

    it("en liste med akkurat én streng behandles som en blokk", () => {
      expect(texts(steps(["Bland.\nStek."]))).toEqual(["Bland.", "Stek."]);
      expect(texts(steps(["Bland.\nStek.", "Server."]))).toEqual(["Bland. Stek.", "Server."]);
    });

    it("tom blokk gir ingen steg", () => {
      expect(normalize({ recipeInstructions: "  \n " }).steps).toEqual([]);
    });
  });

  describe("nummerering", () => {
    it.each([
      ["punktum på linjer", "1. Bland\n2. Stek\n3. Server"],
      ["parentes", "1) Bland\n2) Stek\n3) Server"],
      ["Steg-prefiks", "Steg 1: Bland\nSteg 2: Stek\nSteg 3: Server"],
      ["Step-prefiks", "Step 1. Bland\nstep 2. Stek\nSTEP 3. Server"],
      ["Trinn-prefiks", "Trinn 1: Bland\nTrinn 2: Stek\nTRINN 3: Server"],
      ["Trinn-prefiks på én linje", "Trinn 1: Bland Trinn 2: Stek Trinn 3: Server"],
      ["uten mellomrom", "1.Bland\n2.Stek\n3.Server"],
      ["p-tagger", "<p>1. Bland</p><p>2. Stek</p><p>3. Server</p>"],
      ["på én linje", "1. Bland 2. Stek 3. Server"],
      ["på én linje med parentes", "1) Bland 2) Stek 3) Server"],
    ])("fjerner ledende nummerering: %s", (_label, block) => {
      expect(texts(steps(block))).toEqual(["Bland", "Stek", "Server"]);
    });

    it("deler ikke en linje der «2.» er fulgt av et tall (en mengde), ikke et ord", () => {
      expect(texts(steps("1. Bland 2. 3 dl melk"))).toEqual(["Bland 2. 3 dl melk"]);
      expect(texts(steps("1. Bland 2. Stek 3. 2 dl melk"))).toEqual(["Bland", "Stek 3. 2 dl melk"]);
    });

    it("to steg på én linje", () => {
      expect(texts(steps("1. Bland 2. Stek"))).toEqual(["Bland", "Stek"]);
    });

    it("ett nummerert steg", () => {
      expect(texts(steps("1. Bland alt"))).toEqual(["Bland alt"]);
    });

    it("delvis nummerering beholder teksten som den er", () => {
      expect(texts(steps("1. A\nB\n3. C"))).toEqual(["1. A", "B", "3. C"]);
      expect(texts(steps("1. A\n2. B\nC"))).toEqual(["1. A", "2. B", "C"]);
    });

    it.each([
      ["starter ikke på 1", "2. A\n3. B"],
      ["hopper over et nummer", "1. A\n3. B"],
      ["feil rekkefølge", "2. A\n1. B"],
      ["samme nummer to ganger", "1. A\n1. B"],
      ["mengde som ser ut som nummer", "1 dl melk\n2 dl vann"],
      ["desimaltall", "1.5 dl melk\n2.5 dl vann"],
    ])("beholder teksten når nummereringen ikke er fortløpende fra 1: %s", (_label, block) => {
      expect(texts(steps(block))).toEqual(block.split("\n"));
    });

    it("deler ikke en linje der tallene ikke er et fortløpende 1, 2, 3 …", () => {
      expect(texts(steps("Stek i 10 min. 2. runde i ovnen"))).toEqual([
        "Stek i 10 min. 2. runde i ovnen",
      ]);
      // Bare ett fortløpende nummer (1): den ledende nummereringen fjernes, resten er uendret.
      expect(texts(steps("1. Bland 3. Stek"))).toEqual(["Bland 3. Stek"]);
      expect(texts(steps("Bland 1. Stek 2. Server"))).toEqual(["Bland 1. Stek 2. Server"]);
    });

    it("fjerner ikke nummerering i liste av rene strenger (hvert element er et steg)", () => {
      expect(texts(steps(["1. A", "2. B"]))).toEqual(["1. A", "2. B"]);
    });

    it("gjelder også med seksjon", () => {
      expect(
        steps([{ "@type": "HowToSection", name: "Deig", itemListElement: "1. A\n2. B" }]),
      ).toEqual([{ text: "1. A 2. B", section: "Deig" }]);
    });
  });

  it("dupliserte tekster beholdes", () => {
    expect(texts(steps(["Rør.", "Rør.", { text: "Rør." }]))).toEqual(["Rør.", "Rør.", "Rør."]);
    expect(texts(steps("Rør.\nRør."))).toEqual(["Rør.", "Rør."]);
  });

  it("tomme steg fjernes", () => {
    expect(
      texts(
        steps([{ text: "" }, { "@type": "HowToStep" }, "", "  ", { text: "A" }, { text: "<br>" }]),
      ),
    ).toEqual(["A"]);
  });

  it("stegtekst renses", () => {
    expect(texts(steps([{ text: "Stek i&nbsp;10 <b>min</b> &amp; server" }]))).toEqual([
      "Stek i 10 min & server",
    ]);
  });

  it.each([undefined, null, true, false, 5, {}, [], [null, 5, true], "", { text: 5 }])(
    "feil type %j gir ingen steg",
    (value) => {
      expect(
        normalize({ recipeInstructions: value, recipeIngredient: ["1 dl melk"] }).steps,
      ).toEqual([]);
    },
  );

  describe("dybdegrense for seksjoner", () => {
    // `levels` seksjoner inni hverandre med ett steg innerst. Steget ligger på dybde `levels`.
    function nested(levels: number): unknown {
      let inner: unknown = { "@type": "HowToStep", text: "Innerst" };
      for (let i = 0; i < levels; i++) {
        inner = { "@type": "HowToSection", name: `s${i}`, itemListElement: inner };
      }
      return inner;
    }

    it.each([1, 5, 6])("%i nivåer leses", (levels) => {
      expect(texts(steps(nested(levels)))).toEqual(["Innerst"]);
    });

    it.each([7, 8, 20])("%i nivåer leses ikke", (levels) => {
      expect(steps(nested(levels))).toEqual([]);
    });
  });

  it("dypt nestede lister gir ikke krasj", () => {
    let deep: unknown = "bunn";
    for (let i = 0; i < 5000; i++) deep = [deep, "x"];
    expect(() => normalizeRecipe(node({ recipeInstructions: deep }))).not.toThrow();
    let deepSections: unknown = { text: "bunn" };
    for (let i = 0; i < 5000; i++)
      deepSections = { "@type": "HowToSection", name: "s", itemListElement: deepSections };
    expect(normalize({ recipeInstructions: deepSections }).steps).toEqual([]);
  });
});

describe("normalizeRecipe: skadelig tekst", () => {
  const evil = [
    '<img src=x onerror="alert(1)">Tekst',
    "<script>alert(1)</script>Tekst",
    '<a href="javascript:alert(1)">Tekst</a>',
    "<SCRIPT SRC=//evil.example/x.js></SCRIPT>Tekst",
    "&lt;img src=x onerror=alert(1)&gt;Tekst",
    "&lt;script&gt;alert(1)&lt;/script&gt;Tekst",
    "<style>*{background:url(javascript:alert(1))}</style>Tekst",
    "<!-- skjult -->Tekst",
    "<iframe src='https://evil.example'></iframe>Tekst",
  ];

  it.each(evil)("%s", (text) => {
    const result = normalize({
      name: text,
      publisher: { name: text },
      recipeYield: text,
      recipeIngredient: [text],
      recipeInstructions: [{ text }, text],
    });
    const everything = [
      result.title,
      result.sourceName ?? "",
      ...result.ingredients.map((i) => i.text),
      ...result.steps.map((s) => s.text),
    ];
    for (const value of everything) {
      expect(value).toBe("Tekst");
      expect(value).not.toMatch(/[<>]|javascript|onerror|alert|https?:|evil/i);
    }
  });

  it("tekst inni linker beholdes, men ikke taggen og URL-en", () => {
    const result = normalize({
      recipeIngredient: ['<a href="https://example.com/x?y=1">1 dl melk</a>'],
    });
    expect(result.ingredients).toEqual([{ text: "1 dl melk" }]);
  });
});

describe("normalizeRecipe: tid (Story 6.2)", () => {
  const base = { name: "Pannekaker", recipeIngredient: ["3 egg"] };
  const minutes = (extra: Record<string, unknown>) => {
    const result = normalizeRecipe({ ...base, ...extra });
    return result.ok ? result.value.totalMinutes : "feil";
  };

  it("bruker totalTime når den finnes", () => {
    expect(minutes({ totalTime: "PT1H15M", prepTime: "PT10M", cookTime: "PT20M" })).toBe(75);
  });

  it("legger sammen prepTime og cookTime når totalTime mangler eller er ugyldig", () => {
    expect(minutes({ prepTime: "PT10M", cookTime: "PT20M" })).toBe(30);
    expect(minutes({ totalTime: "snart", cookTime: "PT20M" })).toBe(20);
  });

  it("gir null uten tid eller med ugyldig tid", () => {
    expect(minutes({})).toBeNull();
    expect(minutes({ totalTime: "45 min" })).toBeNull();
    expect(minutes({ prepTime: "P1D", cookTime: "PT1H" })).toBeNull();
  });
});
