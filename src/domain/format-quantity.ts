import { FRACTION_CHARS } from "./parse-quantity";
import type { Quantity, ScaledLine } from "./types";

// Brøkdelene som kan vises med brøktegn (FR-8), med tegnet fra tolkingens tabell.
export const DISPLAY_FRACTIONS: readonly (readonly [number, string])[] = [
  "¼",
  "⅓",
  "½",
  "⅔",
  "¾",
].map((char) => [FRACTION_CHARS[char], char] as const);

// Største tillatte avvik fra brøken, som andel av selve brøken (beslutning 2026-11-09).
const TOLERANCE = 0.05;
const EPSILON = 1e-9;

function formatNumber(value: number): string {
  const whole = Math.floor(value);
  const part = value - whole;

  for (const [fraction, char] of DISPLAY_FRACTIONS) {
    if (Math.abs(part - fraction) <= TOLERANCE * fraction + EPSILON) {
      return whole === 0 ? char : `${whole} ${char}`;
    }
  }

  // Én desimal med komma; «,0» utelates fordi tallet da skrives som heltall.
  const oneDecimal = Math.round(value * 10 + EPSILON) / 10;
  if (oneDecimal !== 0 || value <= 0) return String(oneDecimal).replace(".", ",");

  // Små positive mengder vises aldri som «0»: to desimaler, minst 0,01.
  const twoDecimals = Math.max(0.01, Math.round(value * 100 + EPSILON) / 100);
  return String(twoDecimals).replace(".", ",");
}

/**
 * Formaterer en mengde for visning: brøktegn (¼ ⅓ ½ ⅔ ¾, eventuelt med heltall
 * foran) når brøkdelen ligger innen 5 % av selve brøken, ellers maks én desimal med
 * komma (to desimaler for små mengder som ellers ville blitt «0»). Områder vises som
 * «a–b», eller som én verdi når endene formateres likt.
 */
export function formatQuantity(quantity: Quantity): string {
  const min = formatNumber(quantity.min);
  if (quantity.max === undefined) return min;
  const max = formatNumber(quantity.max);
  return max === min ? min : `${min}–${max}`;
}

/**
 * Formaterer en (skalert) ingredienslinje: mengde, enhet og navn med ett mellomrom,
 * pluss « (ca.)» når mengden er avrundet. Ikke tolkbare linjer vises som originalen.
 */
export function formatLine(line: ScaledLine): string {
  if (!line.parseable || line.quantity === null) return line.original;
  const text = [formatQuantity(line.quantity), line.unit ?? "", line.name]
    .filter((part) => part !== "")
    .join(" ");
  return line.approximate ? `${text} (ca.)` : text;
}
