import type { Quantity } from "./types";

const FRACTION_CHARS: Readonly<Record<string, number>> = {
  "½": 1 / 2,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "⅛": 1 / 8,
};

const FRACTION_CLASS = `[${Object.keys(FRACTION_CHARS).join("")}]`;

// Rekkefølgen betyr noe: lengste form først (blandet tall før brøk før heltall).
const NUMBER = [
  `\\d+\\s*${FRACTION_CLASS}`, // 1½, 1 ½
  `\\d+\\s+\\d+\\/[1-9]\\d*`, // 1 1/2
  `\\d+\\/[1-9]\\d*`, // 1/2
  FRACTION_CLASS, // ½
  `\\d+(?:[.,]\\d+)?`, // 400, 0,5, 0.5
].join("|");

const QUANTITY_PATTERN = new RegExp(
  `^(${NUMBER})(?:\\s*[-–—]\\s*(${NUMBER})|\\s+til\\s+(${NUMBER}))?`,
  "i",
);

/** Gjør ett tall (i en av formene over) om til en verdi. */
function toNumber(token: string): number {
  const text = token.trim();

  const unicodeMixed = text.match(new RegExp(`^(\\d*)\\s*(${FRACTION_CLASS})$`));
  if (unicodeMixed) {
    const whole = unicodeMixed[1] ? Number(unicodeMixed[1]) : 0;
    return whole + FRACTION_CHARS[unicodeMixed[2]];
  }

  const slash = text.match(/^(?:(\d+)\s+)?(\d+)\/(\d+)$/);
  if (slash) {
    const whole = slash[1] ? Number(slash[1]) : 0;
    return whole + Number(slash[2]) / Number(slash[3]);
  }

  return Number(text.replace(",", "."));
}

export type QuantityMatch = { quantity: Quantity; rest: string };

/**
 * Tolker mengden i starten av teksten: heltall, desimal med komma eller punktum,
 * brøk, brøktegn, blandet tall og områder («2–3», «2-3», «2 til 3»).
 * Returnerer mengden og resten av teksten (uendret, ikke trimmet), eller `null`
 * når teksten ikke starter med en mengde.
 */
export function parseQuantity(text: string): QuantityMatch | null {
  const match = text.match(QUANTITY_PATTERN);
  if (!match) return null;

  const min = toNumber(match[1]);
  const upper = match[2] ?? match[3];
  const quantity: Quantity = upper === undefined ? { min } : { min, max: toNumber(upper) };

  return { quantity, rest: text.slice(match[0].length) };
}
