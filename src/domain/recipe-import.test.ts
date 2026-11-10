import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ERROR_KINDS, type AppError, type Result } from "../lib/result";
import { LIMITS } from "../lib/recipe-input";
import { extractRecipeJsonLd, normalizeRecipe, parseLine } from "./index";
import type { ImportedRecipe, RecipeNode } from "./index";

// Tester for hele lesingen: lagrede sider (AD-4, AD-11), ytelse, aldri-kaster og kontrakten mot Result.
// Testfiler er unntatt renhetstesten, så de kan lese filer. Ingen test bruker nettverket.
const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), "../../test/fixtures/html");

function readFixture(name: string): string {
  return readFileSync(join(fixtureDir, `${name}.html`), "utf8");
}

function importFixture(name: string): ImportedRecipe {
  const extracted = extractRecipeJsonLd(readFixture(name));
  if (!extracted.ok) throw new Error(`${name}: ${extracted.error.kind}`);
  const normalized = normalizeRecipe(extracted.value);
  if (!normalized.ok) throw new Error(`${name}: ${normalized.error.kind}`);
  return normalized.value;
}

type Expected = {
  title: string;
  sourceName: string;
  servings: number;
  ingredientCount: number;
  firstIngredient: string;
  lastIngredient: string;
  stepCount: number;
  firstStepStart: string;
  lastStepStart: string;
  lastStepEnd: string;
};

// Verdiene er lest av filene i test/fixtures/html/.
const WITH_RECIPE: Record<string, Expected> = {
  "tine-kjottboller": {
    title: "Kjøttboller i tomatsaus",
    sourceName: "TINE Kjøkken",
    servings: 16,
    ingredientCount: 10,
    firstIngredient: "ukokt 3 dl ris , gjerne basmatiris",
    lastIngredient: "200 g hodekål",
    stepCount: 4,
    firstStepStart: "Kok ris som anvist på pakken.",
    lastStepStart: "Rens og skjær kål i grove biter.",
    lastStepEnd: "med ris ved siden av.",
  },
  // Matprat: servings 1 kommer fra kildens «1 PORSJONER (1 porsjon gir ca. 20 rundstykker)»-tekst.
  // Det er ikke et reelt antall porsjoner, bare det første tydelige heltallet i teksten.
  "matprat-rundstykker": {
    title: "Rundstykker",
    sourceName: "Matprat",
    servings: 1,
    ingredientCount: 10,
    firstIngredient: "ca. 1 l hvetemel (550 g)",
    lastIngredient: "0,5 egg til pensling",
    stepCount: 4,
    firstStepStart: "Ha mel, gjær, vann, melk, salt, sukker og egg",
    lastStepStart: "Sett inn stekebrettet midterste rille",
    lastStepEnd: "Avkjøl på rist.",
  },
  // Samme som over: servings 1 kommer fra «1 PORSJONER (…)»-teksten, ikke et reelt antall.
  "matprat-enkel-brodoppskrift": {
    title: "Enkel brødoppskrift",
    sourceName: "Matprat",
    servings: 1,
    ingredientCount: 5,
    firstIngredient: "1 l hvetemel",
    lastIngredient: "14 dl vann",
    stepCount: 3,
    firstStepStart: "Rør sammen mel, salt og gjær.",
    lastStepStart: "Sett brødene inn i kald stekeovn",
    lastStepEnd: "Avkjøles på rist.",
  },
  "godt-amerikanske-pannekaker": {
    title: "Amerikanske pannekaker - Perfekt helgefrokost",
    sourceName: "Godt.no",
    servings: 4,
    ingredientCount: 10,
    firstIngredient: "50 g smør",
    lastIngredient: "bringebær",
    stepCount: 3,
    firstStepStart: "Smelt smøret og la det avkjøles litt",
    lastStepStart: "Smelt litt smør i stekepannen",
    lastStepEnd: "server med ønsket tilbehør.",
  },
  "godt-grove-middagspannekaker": {
    title: "Grove pannekaker - Perfekt middag",
    sourceName: "Godt.no",
    servings: 6,
    ingredientCount: 7,
    firstIngredient: "4 stk egg",
    lastIngredient: "1 dl havregryn",
    stepCount: 2,
    firstStepStart: "Pisk sammen egg, sukker, smeltet smør",
    lastStepStart: "Stek tynne pannekaker i stekepanne",
    lastStepEnd: "Serveres nystekte!",
  },
};

const WITHOUT_RECIPE = [
  "klikk-farikal",
  "northwild-kjottkaker",
  "matoppskrift-pannekaker",
  "matoppskrift-kjottkaker",
  "bbcgoodfood-lasagne",
];

describe("lagrede oppskriftssider med Recipe", () => {
  it.each(Object.entries(WITH_RECIPE))("%s", (name, expected) => {
    const recipe = importFixture(name);
    expect(recipe.title).toBe(expected.title);
    expect(recipe.sourceName).toBe(expected.sourceName);
    expect(recipe.servings).toBe(expected.servings);
    expect(recipe.ingredients).toHaveLength(expected.ingredientCount);
    expect(recipe.ingredients[0].text).toBe(expected.firstIngredient);
    expect(recipe.ingredients.at(-1)?.text).toBe(expected.lastIngredient);
    expect(recipe.steps).toHaveLength(expected.stepCount);
    expect(recipe.steps[0].text.startsWith(expected.firstStepStart)).toBe(true);
    expect(recipe.steps.at(-1)?.text.startsWith(expected.lastStepStart)).toBe(true);
    expect(recipe.steps.at(-1)?.text.endsWith(expected.lastStepEnd)).toBe(true);
  });

  it.each(Object.keys(WITH_RECIPE))(
    "%s: bare ren tekst, ingen URL-er og ingen seksjoner",
    (name) => {
      const recipe = importFixture(name);
      const everything = [
        recipe.title,
        recipe.sourceName ?? "",
        ...recipe.ingredients.map((i) => i.text),
        ...recipe.steps.map((s) => s.text),
      ];
      for (const text of everything) {
        expect(text).toBe(text.trim());
        expect(text).not.toMatch(/[<>]|&[a-z]+;|&#|https?:|\s{2}|[\n\t]/);
      }
      expect(recipe.steps.every((s) => s.section === null)).toBe(true);
      expect(Object.keys(recipe).sort()).toEqual([
        "ingredients",
        "servings",
        "sourceName",
        "steps",
        "title",
        "totalMinutes",
      ]);
    },
  );

  it("TINE: steg 4 er ett steg selv om kilden har tomme linjer inni", () => {
    expect(importFixture("tine-kjottboller").steps[3].text).toBe(
      "Rens og skjær kål i grove biter. Stek den raskt i resten av smøret i en stekepanne. Server kjøttboller og kål i tomatsaus, med ris ved siden av.",
    );
  });

  it("Matprat: blanke tegn rundt og inni ingredienser er ryddet", () => {
    const { ingredients } = importFixture("matprat-rundstykker");
    expect(ingredients[1].text).toBe("25 g gjær");
    expect(ingredients[9].text).toBe("0,5 egg til pensling");
  });

  it("ingredienslinjene kan sendes videre til parseLine", () => {
    const parsed = importFixture("tine-kjottboller").ingredients.map((i) => parseLine(i.text));
    expect(parsed[1]).toMatchObject({
      quantity: { min: 500 },
      unit: "g",
      name: "kjøttdeig",
      parseable: true,
    });
    const grove = importFixture("godt-grove-middagspannekaker").ingredients.map((i) =>
      parseLine(i.text),
    );
    expect(grove[4]).toMatchObject({
      quantity: { min: 2.5 },
      unit: "dl",
      name: "fint sammalt hvetemel",
    });
    expect(grove.every((line) => line.parseable)).toBe(true);
    const godt = importFixture("godt-amerikanske-pannekaker").ingredients.map((i) =>
      parseLine(i.text),
    );
    expect(godt[7]).toMatchObject({ parseable: false, name: "rips" });
  });
});

describe("lagrede sider uten Recipe", () => {
  it.each(WITHOUT_RECIPE)("%s gir no_recipe", (name) => {
    expect(extractRecipeJsonLd(readFixture(name))).toEqual({
      ok: false,
      error: { kind: "no_recipe" },
    });
  });

  it("alle lagrede sider er dekket av testene", () => {
    const onDisk = readdirSync(fixtureDir)
      .filter((file) => file.endsWith(".html"))
      .map((file) => file.replace(/\.html$/, ""))
      .sort();
    expect(onDisk).toEqual([...Object.keys(WITH_RECIPE), ...WITHOUT_RECIPE].sort());
  });
});

describe("kontrakt mot Result og LIMITS", () => {
  it("resultatene kan brukes som Result<T, AppError> fra src/lib/result.ts", () => {
    const extracted: Result<RecipeNode, AppError> = extractRecipeJsonLd(
      readFixture("tine-kjottboller"),
    );
    expect(extracted.ok).toBe(true);
    const failed: Result<RecipeNode, AppError> = extractRecipeJsonLd("");
    expect(failed.ok).toBe(false);
    if (!failed.ok) expect(ERROR_KINDS).toContain(failed.error.kind);
    const normalized: Result<ImportedRecipe, AppError> = normalizeRecipe({ "@type": "Recipe" });
    expect(normalized.ok).toBe(false);
    if (!normalized.ok) expect(ERROR_KINDS).toContain(normalized.error.kind);
  });

  it("porsjonsgrensene er de samme som LIMITS", () => {
    const servings = (recipeYield: number) => {
      const result = normalizeRecipe({ name: "x", recipeIngredient: ["a"], recipeYield });
      return result.ok ? result.value.servings : "feil";
    };
    expect(servings(LIMITS.servingsMin)).toBe(LIMITS.servingsMin);
    expect(servings(LIMITS.servingsMin - 1)).toBeNull();
    expect(servings(LIMITS.servingsMax)).toBe(LIMITS.servingsMax);
    expect(servings(LIMITS.servingsMax + 1)).toBeNull();
  });
});

const MEGABYTE = 1024 * 1024;
const OPEN = '<script type="application/ld+json">';

// Gjentar hele enheter (ingen avkorting midt i en tagg), minst `bytes` tegn.
function repeatTo(unit: string, bytes: number): string {
  return unit.repeat(Math.ceil(bytes / unit.length));
}

function timed<T>(fn: () => T): { value: T; ms: number } {
  const start = performance.now();
  const value = fn();
  return { value, ms: performance.now() - start };
}

// Kravet er under 1 s på vanlig maskin. Terskelen har slingringsmonn for trege CI-maskiner og
// parallelle workers; en kvadratisk løsning bruker uansett flere sekunder på 2 MB.
const MAX_MS = 3000;
const SLOW_TEST_TIMEOUT = 60_000;

describe("ytelse: 2 MB HTML tas på under ett sekund (terskel 3 s)", () => {
  const size = 2 * MEGABYTE;
  const recipeBlock = `${OPEN}{"@type":"Recipe","name":"Sist","recipeIngredient":["1 dl melk"]}</script>`;

  const pages: [string, string, boolean][] = [
    [
      "vanlig HTML uten oppskrift",
      repeatTo("<div class='a'><p>Hei &amp; hå</p></div>\n", size),
      false,
    ],
    [
      "mange JSON-LD-blokker uten oppskrift",
      repeatTo(`${OPEN}{"@type":"WebSite","name":"x"}</script>\n`, size),
      false,
    ],
    [
      "mange blokker, oppskriften til slutt",
      repeatTo(`${OPEN}{"@type":"WebSite","name":"x"}</script>\n`, size) + recipeBlock,
      true,
    ],
    [
      "mange blokker med ugyldig JSON, oppskriften til slutt",
      repeatTo(`${OPEN}{ugyldig</script>\n`, size) + recipeBlock,
      true,
    ],
    [
      "én enorm JSON-LD-blokk uten oppskrift",
      `${OPEN}[${repeatTo('{"@type":"ListItem","position":1},', size)}{}]</script>`,
      false,
    ],
    ["én enorm blokk med ugyldig JSON", `${OPEN}{${repeatTo("a", size)}</script>`, false],
    ["«<script» uten slutt", repeatTo("<script ", size), false],
    ["«<script » gjentatt, én «>» til slutt", "<script ".repeat(262144) + ">", false],
    ["«<script x» gjentatt, én «>» til slutt", "<script x".repeat(262144) + ">", false],
    ["«<script » i grupper på 500 med «>»", repeatTo(`${"<script ".repeat(500)}>`, size), false],
    ["script med annen type", repeatTo('<script type="x">a', size), false],
    ["ulukkede JSON-LD-tagger", repeatTo(OPEN, size), false],
    ["bare «<»", repeatTo("<", size), false],
    ["bare «<script>» uten type", repeatTo("<script>x", size), false],
    ["lange tagger uten «>»", repeatTo('<script data-x="', size), false],
    [
      "rå kontrolltegn i store strenger (utbedring)",
      `${OPEN}{"a":"${repeatTo("x\n", size)}"}</script>`,
      false,
    ],
    [
      "binærdata",
      repeatTo(String.fromCharCode(...Array.from({ length: 256 }, (_, i) => i)), size),
      false,
    ],
  ];

  it.each(pages)(
    "%s",
    (_name, html, found) => {
      expect(html.length).toBeGreaterThanOrEqual(size);
      const { value, ms } = timed(() => extractRecipeJsonLd(html));
      expect(value.ok).toBe(found);
      expect(ms).toBeLessThan(MAX_MS);
    },
    SLOW_TEST_TIMEOUT,
  );

  // Én test per felt, slik at en feil sier hvilket felt som er tregt. Hver tekst er 2 MB.
  const messyTexts: [string, string][] = [
    ["<a ", repeatTo("<a ", size)],
    ["<a x", repeatTo("<a x", size)],
    ["<b>x</b>&amp;", repeatTo("<b>x</b>&amp;", size)],
    ['<a href="x">', repeatTo('<a href="x">', size)],
    ["&", repeatTo("&", size)],
    ["<script>", repeatTo("<script>", size)],
    ["<<", repeatTo("<<", size)],
    ["<b><", repeatTo("<b><", size)],
    ["&lt;a ", repeatTo("&lt;a ", size)],
    ["&amp;lt;", repeatTo("&amp;lt;", size)],
    ["1. a ", repeatTo("1. a ", size)],
    ["1. a 2. a ", repeatTo("1. a 2. a ", size)],
    ["Steg 1: a ", repeatTo("Steg 1: a ", size)],
    ["a\n", repeatTo("a\n", size)],
    // Tall som hoppes over i porsjonstolkingen (enhet, brøk, x) er mange og gir ingen treff.
    ["1 dl ", repeatTo("1 dl ", size)],
    ["1 1/2 ", repeatTo("1 1/2 ", size)],
    ["2 x ", repeatTo("2 x ", size)],
    ["1-2 dl ", repeatTo("1-2 dl ", size)],
    ["1 ", repeatTo("1 ", size)],
  ];

  const fields: [string, (text: string) => Record<string, unknown>][] = [
    ["name", (text) => ({ name: text, recipeIngredient: ["a"] })],
    ["recipeIngredient (liste)", (text) => ({ name: "x", recipeIngredient: [text] })],
    ["recipeIngredient (streng)", (text) => ({ name: "x", recipeIngredient: text })],
    ["recipeInstructions (streng)", (text) => ({ name: "x", recipeInstructions: text })],
    [
      "recipeInstructions (HowToStep)",
      (text) => ({ name: "x", recipeInstructions: [{ "@type": "HowToStep", text }] }),
    ],
    ["recipeYield", (text) => ({ name: "x", recipeIngredient: ["a"], recipeYield: text })],
    ["author", (text) => ({ name: "x", recipeIngredient: ["a"], author: text })],
    ["publisher", (text) => ({ name: "x", recipeIngredient: ["a"], publisher: { name: text } })],
  ];

  it.each(fields)(
    "normalisering av svært lange og rotete tekster i %s",
    (field, build) => {
      for (const [label, text] of messyTexts) {
        const { value, ms } = timed(() => normalizeRecipe(build(text)));
        // Tekster som blir tomme etter rensing gir no_recipe; poenget her er tid og at det ikke kaster.
        expect(typeof value.ok).toBe("boolean");
        expect(ms, `${field} med «${label}» tok ${Math.round(ms)} ms`).toBeLessThan(MAX_MS);
      }
    },
    SLOW_TEST_TIMEOUT,
  );

  it("hele rørledningen på en 2 MB-side med oppskrift", () => {
    const html = repeatTo("<p>fyll</p>\n", size) + recipeBlock;
    const { value, ms } = timed(() => {
      const extracted = extractRecipeJsonLd(html);
      return extracted.ok ? normalizeRecipe(extracted.value) : extracted;
    });
    expect(value.ok && value.value.title).toBe("Sist");
    expect(ms).toBeLessThan(MAX_MS);
  });
});

// Enkel, deterministisk tilfeldighet slik at en feil kan gjentas.
function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 2 ** 32;
  };
}

describe("aldri-kaster-egenskap", () => {
  const FRAGMENTS = [
    OPEN,
    "</script>",
    "<script",
    "<",
    ">",
    "{",
    "}",
    "[",
    "]",
    '"',
    "'",
    ":",
    ",",
    "\\",
    "\\u00",
    "\n",
    "\t",
    "\u0000",
    '"@type"',
    '"Recipe"',
    '"@graph"',
    '"recipeIngredient"',
    '"recipeInstructions"',
    '"name"',
    '"HowToStep"',
    '"HowToSection"',
    '"itemListElement"',
    '"text"',
    "null",
    "true",
    "5",
    "-3",
    "4.5",
    "<!--",
    "-->",
    "//<![CDATA[",
    "]]>",
    "﻿",
    "&amp;",
    "&#",
    "&nbsp;",
    "<br>",
    "<p>",
    "</p>",
    "1. ",
    "2) ",
    "Steg 3: ",
    "åæø",
    "😀",
    "\uD800",
  ];

  function randomText(next: () => number): string {
    let out = "";
    for (let i = Math.floor(next() * 40); i > 0; i--)
      out += FRAGMENTS[Math.floor(next() * FRAGMENTS.length)];
    return out;
  }

  function randomValue(next: () => number, depth: number): unknown {
    const pick = Math.floor(next() * (depth > 4 ? 6 : 10));
    switch (pick) {
      case 0:
        return null;
      case 1:
        return Math.floor(next() * 200) - 50;
      case 2:
        return next() * 10;
      case 3:
        return next() < 0.5;
      case 4:
        return randomText(next);
      case 5:
        return undefined;
      case 6:
      case 7:
        return Array.from({ length: Math.floor(next() * 5) }, () => randomValue(next, depth + 1));
      default: {
        const keys = [
          "@type",
          "name",
          "text",
          "value",
          "publisher",
          "author",
          "recipeYield",
          "recipeIngredient",
          "recipeInstructions",
          "itemListElement",
          "@graph",
        ];
        const obj: Record<string, unknown> = {};
        for (let i = Math.floor(next() * 6); i > 0; i--) {
          const key = keys[Math.floor(next() * keys.length)];
          obj[key] =
            key === "@type" && next() < 0.7
              ? ["Recipe", "HowToStep", "HowToSection"][Math.floor(next() * 3)]
              : randomValue(next, depth + 1);
        }
        return obj;
      }
    }
  }

  it("extractRecipeJsonLd med tilfeldig tekst og tilfeldig JSON i blokker", () => {
    const next = random(1);
    for (let i = 0; i < 3000; i++) {
      const html =
        next() < 0.5
          ? randomText(next)
          : `${OPEN}${randomText(next)}</script>${OPEN}${JSON.stringify(randomValue(next, 0)) ?? ""}</script>`;
      const result = extractRecipeJsonLd(html);
      expect(typeof result.ok).toBe("boolean");
      if (!result.ok) expect(result.error.kind).toBe("no_recipe");
    }
  });

  it("normalizeRecipe med tilfeldige verdier i alle felt", () => {
    const next = random(2);
    for (let i = 0; i < 5000; i++) {
      const value = randomValue(next, 0) as RecipeNode;
      const result = normalizeRecipe(value);
      if (result.ok) {
        const recipe = result.value;
        expect(recipe.title).not.toBe("");
        expect(recipe.ingredients.length + recipe.steps.length).toBeGreaterThan(0);
        expect(recipe.servings === null || Number.isInteger(recipe.servings)).toBe(true);
        for (const text of [
          recipe.title,
          ...recipe.ingredients.map((x) => x.text),
          ...recipe.steps.map((s) => s.text),
        ]) {
          expect(text).toBe(text.trim());
          expect(text).not.toBe("");
        }
      } else {
        expect(result.error.kind).toBe("no_recipe");
      }
    }
  });

  it("normalizeRecipe gir alltid ok når tittel og ingrediens er gyldige, uansett øvrige felt", () => {
    // `normalizeRecipe` fanger alle unntak og gir da `no_recipe`; kravet om `ok` avslører et skjult unntak.
    const next = random(4);
    for (let i = 0; i < 5000; i++) {
      const result = normalizeRecipe({
        "@type": "Recipe",
        name: "Tittel",
        recipeIngredient: ["1 dl melk", randomValue(next, 1)],
        recipeInstructions: randomValue(next, 1),
        recipeYield: randomValue(next, 2),
        publisher: randomValue(next, 2),
        author: randomValue(next, 2),
      });
      expect(result.ok, `iterasjon ${i}`).toBe(true);
      if (result.ok) {
        expect(result.value.title).toBe("Tittel");
        expect(result.value.ingredients[0]).toEqual({ text: "1 dl melk" });
      }
    }
  });

  it("hele rørledningen med tilfeldig innhold som ender i en Recipe", () => {
    const next = random(3);
    for (let i = 0; i < 3000; i++) {
      const recipe = {
        "@type": "Recipe",
        name: "x",
        recipeIngredient: randomValue(next, 1),
        recipeInstructions: randomValue(next, 1),
        recipeYield: randomValue(next, 2),
        publisher: randomValue(next, 2),
        author: randomValue(next, 2),
      };
      // «<» skrives som \u003c slik at tekst med «</script>» ikke avslutter blokken.
      const html = `${OPEN}${JSON.stringify(recipe).replace(/</g, "\\u003c")}</script>`;
      const extracted = extractRecipeJsonLd(html);
      expect(extracted.ok).toBe(true);
      if (extracted.ok) expect(() => normalizeRecipe(extracted.value)).not.toThrow();
    }
  });

  it("alle enkle kodepunkter i tittel og ingredienser", () => {
    for (let code = 0; code < 0x3000; code += 1) {
      const text = String.fromCharCode(code, 0x61, code);
      // «a» står alltid igjen etter rensing, så oppskriften er gyldig og må gi ok.
      const result = normalizeRecipe({
        name: text,
        recipeIngredient: [text],
        recipeInstructions: text,
      });
      expect(result.ok, `kodepunkt ${code}`).toBe(true);
    }
  });
});
