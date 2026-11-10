/**
 * Typer for lesing av oppskriftsdata fra HTML (Story 2.1, AD-4 og AD-7).
 *
 * Domenet kan ikke importere fra `src/lib` (AD-1), så feiltypen er speilet her. Den er
 * strukturelt lik `AppError` og `Result` i `src/lib/result.ts` (en test låser at de kan
 * brukes om hverandre), slik at tjenestene kan returnere verdiene uendret.
 */

/**
 * Det eneste feilen fra lesing av oppskriftsdata kan være: siden har ingen brukbar oppskrift.
 *
 * `detail` (`missing_title` eller `empty_recipe` fra `normalizeRecipe`) er bare til feilsøking i
 * logger og tester. Den vises aldri for brukeren og er ikke stabilt API: verdiene kan endres uten
 * varsel. Story 2.2 skal bare bruke `kind`.
 */
export type ImportError = { kind: "no_recipe"; detail?: string };

export type ImportResult<T> = { ok: true; value: T } | { ok: false; error: ImportError };

/** Et `Recipe`-objekt slik det står i JSON-LD, før felttypene er kontrollert. */
export type RecipeNode = Record<string, unknown>;

/** Oppskriften i én fast form. Bare tekst: ingen HTML, bilder eller URL-er. */
export type ImportedRecipe = {
  title: string;
  /** Utgiver eller forfatter; `null` når kilden ikke oppgir noe (appen bruker vertsnavnet). */
  sourceName: string | null;
  /** Opprinnelig porsjonsantall, eller `null` når det ikke lar seg tolke sikkert. */
  servings: number | null;
  /** Rå originaltekst per linje; mengder tolkes senere av `parseLine`. */
  ingredients: { text: string }[];
  steps: { text: string; section: string | null }[];
  /** Tid i minutter fra `totalTime`, eller `prepTime` + `cookTime` (Story 6.2); `null` = ukjent. */
  totalMinutes?: number | null;
};

export function importOk<T>(value: T): ImportResult<T> {
  return { ok: true, value };
}

export function noRecipe(detail?: string): ImportResult<never> {
  return {
    ok: false,
    error: detail === undefined ? { kind: "no_recipe" } : { kind: "no_recipe", detail },
  };
}
