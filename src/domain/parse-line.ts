import { FRACTION_CLASS, parseQuantity } from "./parse-quantity";
import type { ParsedLine, UnitKey } from "./types";
import { normalizeUnit } from "./units";

// «ca.» fjernes bare når en mengde følger, slik at ord som «cayenne» ikke berøres.
const APPROX_PREFIX = new RegExp(`^ca\\.?\\s*(?=\\d|[.,]\\d|${FRACTION_CLASS})`, "i");

// Første ord etter mengden (eventuelt rett etter tallet, «750g»), med valgfritt
// punktum etter forkortelse. Ordet må slutte der (ikke følges av bokstav eller tall).
const LEADING_WORD = /^\s*(\p{L}+\.?)(?![\p{L}\d])/u;

// Skilletegn og mellomrom som ikke hører til navnet («400 g, finhakket løk»).
const LEADING_SEPARATORS = /^[\s,;:.]+/;

/**
 * Gjør én ingredienslinje om til mengde, enhet og navn. Kaster aldri.
 * Teksten tolkes i NFC-form; `original` er likevel alltid input, uendret.
 * Linjer uten mengde får `parseable: false` og hele teksten (trimmet) som navn.
 */
export function parseLine(text: string): ParsedLine {
  const original = text;
  const trimmed = text.normalize("NFC").trim();

  const match = parseQuantity(trimmed.replace(APPROX_PREFIX, ""));
  if (!match) {
    return { original, quantity: null, unit: null, name: trimmed, parseable: false };
  }

  let rest = match.rest;
  let unit: UnitKey | null = null;
  const word = rest.match(LEADING_WORD);
  if (word) {
    unit = normalizeUnit(word[1]);
    if (unit) rest = rest.slice(word[0].length);
  }

  const name = rest.replace(LEADING_SEPARATORS, "").trim();
  return { original, quantity: match.quantity, unit, name, parseable: true };
}
