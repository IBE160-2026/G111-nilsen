import type { Quantity } from "./types";

export const FRACTION_CHARS: Readonly<Record<string, number>> = {
  "½": 1 / 2,
  "⅓": 1 / 3,
  "⅔": 2 / 3,
  "¼": 1 / 4,
  "¾": 3 / 4,
  "⅕": 1 / 5,
  "⅖": 2 / 5,
  "⅗": 3 / 5,
  "⅘": 4 / 5,
  "⅙": 1 / 6,
  "⅚": 5 / 6,
  "⅛": 1 / 8,
  "⅜": 3 / 8,
  "⅝": 5 / 8,
  "⅞": 7 / 8,
};

/** Tegnklasse (regex-kilde) for brøktegnene over. */
export const FRACTION_CLASS = `[${Object.keys(FRACTION_CHARS).join("")}]`;

// Skråstrek eller brøkstrek (U+2044).
const SLASH = "[/⁄]";

// Rekkefølgen betyr noe: lengste form først (blandet tall før brøk før heltall).
const NUMBER = [
  `\\d+\\s*${FRACTION_CLASS}`, // 1½, 1 ½
  `\\d+\\s+\\d+${SLASH}[1-9]\\d*`, // 1 1/2
  `\\d+${SLASH}[1-9]\\d*`, // 1/2, 1⁄2
  FRACTION_CLASS, // ½
  `\\d+(?:[.,]\\d+)?`, // 400, 0,5, 0.5
  `[.,]\\d+`, // .5, ,5
].join("|");

// Områdeskille: bindestrek, tankestrek, lang tankestrek, minustegn (U+2212).
const RANGE_DASH = "[-–—−]";

const QUANTITY_PATTERN = new RegExp(
  `^(${NUMBER})(?:\\s*${RANGE_DASH}\\s*(${NUMBER})|\\s+til\\s+(${NUMBER}))?`,
  "i",
);

const PURE_FRACTION = new RegExp(`^(?:\\d+${SLASH}\\d+|${FRACTION_CLASS})$`);

/** Gjør ett tall (i en av formene over) om til en verdi. */
function toNumber(token: string): number {
  const text = token.trim().replace(/⁄/g, "/");

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
 *
 * «1-1/2» (heltall, strek, brøk under 1) er et blandet tall, ikke et område.
 * Et «område» der øvre verdi ikke er større enn nedre («3–2») gir bare nedre verdi.
 */
export function parseQuantity(text: string): QuantityMatch | null {
  const match = text.match(QUANTITY_PATTERN);
  if (!match) return null;

  const min = toNumber(match[1]);
  const rest = text.slice(match[0].length);

  if (match[2] !== undefined) {
    const upper = toNumber(match[2]);
    if (/^\d+$/.test(match[1]) && PURE_FRACTION.test(match[2].trim()) && upper < 1) {
      return { quantity: { min: min + upper }, rest };
    }
  }

  const upperToken = match[2] ?? match[3];
  if (upperToken === undefined) return { quantity: { min }, rest };

  const max = toNumber(upperToken);
  return { quantity: max > min ? { min, max } : { min }, rest };
}
