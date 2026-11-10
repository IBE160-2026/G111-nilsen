import { convertLine, type UnitSystem } from "./convert-units";
import { formatLine } from "./format-quantity";
import { normalizeSearch } from "./filter-collection";
import { scaleLine } from "./scale-line";
import type { RecipeLine, ScaledLine, UnitKey } from "./types";

/** En lagret oppskrift med det handlelisten trenger. */
export type ShoppingRecipe = {
  id: number;
  title: string;
  /** Antallet oppskriften er skrevet for; `null` eller ugyldig gir uskalerte mengder. */
  originalServings: number | null;
  /** Sist valgte antall (lagret), ellers `null`. */
  selectedServings: number | null;
  ingredients: RecipeLine[];
};

/** En valgt oppskrift og antallet personer den skal lages til. */
export type ShoppingSelection = { recipe: ShoppingRecipe; servings: number | null };

/** Noe brukeren har hjemme (Story 5.8). */
export type PantryItem = { id: number; name: string };

export type ShoppingItem = {
  /** Stabil nøkkel (navn og enhet), brukes til avkrysning. */
  key: string;
  /** Navnet uten mengde («melk»), slik det vises ved «Har hjemme». */
  name: string;
  /** Normalisert navn; en vare skjules når dette er likt navnet på noe man har hjemme. */
  nameKey: string;
  /** Ferdig tekst: «6 dl melk», «salt og pepper». */
  text: string;
  /** Titlene på oppskriftene linjen kommer fra, i valgt rekkefølge. */
  recipes: string[];
};

type Sum = {
  name: string;
  unit: UnitKey | null;
  min: number;
  max: number;
  hasRange: boolean;
  approximate: boolean;
  recipes: string[];
};

function factorFor({ recipe, servings }: ShoppingSelection): number {
  const original = recipe.originalServings;
  if (original === null || !Number.isInteger(original) || original < 1) return 1;
  return servings !== null && servings > 0 ? servings / original : 1;
}

/**
 * Slår sammen ingrediensene fra de valgte oppskriftene til én handleliste (Story 5.7). Hver
 * linje skaleres til valgt antall og regnes eventuelt om til metrisk før den slås sammen. Linjer
 * med samme navn og samme enhet legges sammen («2 dl melk» + «4 dl melk» = «6 dl melk»); ulike
 * enheter står hver for seg. Linjer uten mengde eller som ikke kan tolkes står som de er, én gang
 * per tekst. Sortert på navn. Ren funksjon: originalene røres aldri, og den kaster aldri.
 */
export function buildShoppingList(
  selections: readonly ShoppingSelection[],
  system: UnitSystem = "original",
): ShoppingItem[] {
  const sums = new Map<string, Sum>();
  const plain = new Map<string, ShoppingItem>();

  for (const selection of selections) {
    const factor = factorFor(selection);
    const lines = [...selection.recipe.ingredients].sort((a, b) => a.position - b.position);
    for (const line of lines) {
      const scaled: ScaledLine = convertLine(scaleLine(line, factor), system);
      const title = selection.recipe.title;
      if (scaled.parseable && scaled.quantity !== null && scaled.name.trim() !== "") {
        const key = `${normalizeSearch(scaled.name)}|${scaled.unit ?? ""}`;
        const sum = sums.get(key) ?? {
          name: scaled.name,
          unit: scaled.unit,
          min: 0,
          max: 0,
          hasRange: false,
          approximate: false,
          recipes: [],
        };
        sum.min += scaled.quantity.min;
        sum.max += scaled.quantity.max ?? scaled.quantity.min;
        sum.hasRange ||= scaled.quantity.max !== undefined;
        sum.approximate ||= scaled.approximate;
        if (!sum.recipes.includes(title)) sum.recipes.push(title);
        sums.set(key, sum);
      } else {
        const text = scaled.original.trim();
        const key = `${normalizeSearch(text)}|`;
        const item = plain.get(key) ?? {
          key,
          name: text,
          nameKey: normalizeSearch(text),
          text,
          recipes: [],
        };
        if (!item.recipes.includes(title)) item.recipes.push(title);
        plain.set(key, item);
      }
    }
  }

  const sorted: { sortKey: string; item: ShoppingItem }[] = [
    ...[...sums.entries()].map(([key, sum]) => ({
      sortKey: normalizeSearch(sum.name),
      item: {
        key,
        name: sum.name,
        nameKey: normalizeSearch(sum.name),
        text: formatLine({
          original: sum.name,
          quantity:
            sum.hasRange && sum.max > sum.min ? { min: sum.min, max: sum.max } : { min: sum.min },
          unit: sum.unit,
          name: sum.name,
          parseable: true,
          approximate: sum.approximate,
        }),
        recipes: sum.recipes,
      },
    })),
    ...[...plain.values()].map((item) => ({ sortKey: normalizeSearch(item.text), item })),
  ];
  return sorted
    .sort(
      (a, b) => a.sortKey.localeCompare(b.sortKey, "nb") || a.item.key.localeCompare(b.item.key),
    )
    .map(({ item }) => item);
}

/**
 * Deler handlelisten i det som må kjøpes og det brukeren har hjemme (Story 5.8). En vare regnes
 * som hjemme når det normaliserte navnet er helt likt navnet på noe i `pantry` (uavhengig av
 * store og små bokstaver og av enhet). Rekkefølgen beholdes i begge listene.
 */
export function splitByPantry(
  items: readonly ShoppingItem[],
  pantry: readonly PantryItem[],
): { toBuy: ShoppingItem[]; atHome: ShoppingItem[] } {
  const home = new Set(pantry.map((entry) => normalizeSearch(entry.name)));
  const toBuy: ShoppingItem[] = [];
  const atHome: ShoppingItem[] = [];
  for (const item of items) (home.has(item.nameKey) ? atHome : toBuy).push(item);
  return { toBuy, atHome };
}
