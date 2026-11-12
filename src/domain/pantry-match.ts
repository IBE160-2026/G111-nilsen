import { normalizeSearch } from "./filter-collection";
import type { ParsedLine } from "./types";

/** En oppskrift slik «Hva kan jeg lage?» trenger den: ingrediensene som tekster (se `ingredientLabel`). */
export type PantryRecipe = { id: number; title: string; ingredients: readonly string[] };

/** Hvor godt en oppskrift passer med det brukeren har hjemme. */
export type PantryMatch = {
  id: number;
  title: string;
  /** Ingredienser (navn) brukeren har hjemme, i oppskriftens rekkefølge. */
  have: string[];
  /** Ingredienser (navn) som mangler. */
  missing: string[];
};

/**
 * Teksten en ingrediens matches og vises med: navnet uten mengde («melk») når linjen er tolket,
 * ellers linjen slik den er skrevet.
 */
export function ingredientLabel(line: Pick<ParsedLine, "parseable" | "name" | "original">): string {
  const name = line.name.trim();
  return line.parseable && name !== "" ? name : line.original.trim();
}

/** Ord i en tekst: små bokstaver, uten tegnsetting. */
function words(text: string): string[] {
  return normalizeSearch(text)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word !== "");
}

/**
 * Ord i ingredienser som regnes som at man alltid har dem: vann, salt og pepper (Story 6.26b).
 * En ingrediens der alle ordene er slike («salt», «salt og pepper», «kokende vann») verken teller
 * som hjemme eller som mangler, med mindre brukeren selv har skrevet den inn.
 */
const BASIC_WORDS = new Set([
  "vann",
  "salt",
  "pepper",
  "og",
  "svart",
  "malt",
  "kokende",
  "kaldt",
  "lunkent",
]);

function isBasic(labelWords: ReadonlySet<string>): boolean {
  return labelWords.size > 0 && [...labelWords].every((word) => BASIC_WORDS.has(word));
}

/**
 * Finner hvilke oppskrifter som kan lages av det brukeren har hjemme (Story 6.12). En ingrediens
 * er hjemme når alle ordene i noe brukeren har hjemme står i ingrediensen («smør» passer til
 * «usaltet smør», men «mel» passer ikke til «melis», og «melk» ikke til «kokosmelk»). Hver
 * ingrediens teller én gang per oppskrift (uavhengig av store og små bokstaver). Vann, salt og
 * pepper regnes som at man alltid har dem og mangler aldri. Oppskrifter
 * uten ingredienser eller uten noen ingrediens hjemme tas ikke med. Sortert på færrest som
 * mangler, så flest hjemme, så tittel (norsk rekkefølge). Ren funksjon.
 */
export function matchPantry(
  recipes: readonly PantryRecipe[],
  pantry: readonly { name: string }[],
): PantryMatch[] {
  const owned = pantry.map((entry) => words(entry.name)).filter((entry) => entry.length > 0);
  if (owned.length === 0) return [];

  const matches: PantryMatch[] = [];
  for (const recipe of recipes) {
    const seen = new Set<string>();
    const have: string[] = [];
    const missing: string[] = [];
    for (const label of recipe.ingredients) {
      const key = normalizeSearch(label);
      if (key === "" || seen.has(key)) continue;
      seen.add(key);
      const labelWords = new Set(words(label));
      const atHome = owned.some((entry) => entry.every((word) => labelWords.has(word)));
      if (atHome) have.push(label);
      else if (!isBasic(labelWords)) missing.push(label);
    }
    if (have.length > 0) matches.push({ id: recipe.id, title: recipe.title, have, missing });
  }
  return matches.sort(
    (a, b) =>
      a.missing.length - b.missing.length ||
      b.have.length - a.have.length ||
      a.title.localeCompare(b.title, "nb", { sensitivity: "base" }) ||
      a.id - b.id,
  );
}
