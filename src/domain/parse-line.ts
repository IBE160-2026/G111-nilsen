import { parseQuantity } from "./parse-quantity";
import type { ParsedLine, UnitKey } from "./types";
import { normalizeUnit } from "./units";

// «ca.» fjernes bare når en mengde følger, slik at ord som «cayenne» ikke berøres.
const APPROX_PREFIX = /^ca\.?\s*(?=[\d½¼¾⅓⅔⅛])/i;

// Første ord etter mengden (eventuelt rett etter tallet, «750g»), med valgfritt
// punktum etter forkortelse. Ordet må slutte der (ikke følges av bokstav eller tall).
const LEADING_WORD = /^\s*(\p{L}+\.?)(?![\p{L}\d])/u;

/**
 * Gjør én ingredienslinje om til mengde, enhet og navn. Kaster aldri.
 * Linjer uten mengde får `parseable: false` og hele teksten (trimmet) som navn.
 */
export function parseLine(text: string): ParsedLine {
  const original = text;
  const trimmed = text.trim();

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

  return { original, quantity: match.quantity, unit, name: rest.trim(), parseable: true };
}
