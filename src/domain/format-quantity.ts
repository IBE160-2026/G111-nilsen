import { FRACTION_CHARS } from "./parse-quantity";
import type { Quantity, ScaledLine } from "./types";

// Brøkdelene som kan vises med brøktegn (FR-8), med tegnet fra tolkingens tabell.
const DISPLAY_FRACTIONS: readonly (readonly [number, string])[] = ["¼", "⅓", "½", "⅔", "¾"].map(
  (char) => [FRACTION_CHARS[char], char] as const,
);

// Største tillatte avvik fra kandidaten, som andel av kandidatens verdi.
const TOLERANCE = 0.05;
const EPSILON = 1e-9;

type Candidate = { value: number; whole: number; char: string | null };

function candidatesFor(value: number): Candidate[] {
  const n = Math.floor(value);
  return [
    { value: n, whole: n, char: null },
    ...DISPLAY_FRACTIONS.map(([fraction, char]) => ({ value: n + fraction, whole: n, char })),
    { value: n + 1, whole: n + 1, char: null },
  ];
}

function formatNumber(value: number): string {
  let best: Candidate | null = null;
  for (const candidate of candidatesFor(value)) {
    if (best === null || Math.abs(value - candidate.value) < Math.abs(value - best.value)) {
      best = candidate;
    }
  }

  if (best !== null && Math.abs(value - best.value) <= TOLERANCE * best.value + EPSILON) {
    if (best.char === null) return String(best.whole);
    return best.whole === 0 ? best.char : `${best.whole} ${best.char}`;
  }

  // Én desimal med komma; «,0» utelates fordi tallet da skrives som heltall.
  const rounded = Math.round(value * 10 + EPSILON) / 10;
  return String(rounded).replace(".", ",");
}

/**
 * Formaterer en mengde for visning: brøktegn (¼ ⅓ ½ ⅔ ¾, eventuelt med heltall
 * foran) når verdien ligger innen 5 % av brøken, ellers maks én desimal med komma.
 * Områder vises som «a–b».
 */
export function formatQuantity(quantity: Quantity): string {
  const min = formatNumber(quantity.min);
  return quantity.max === undefined ? min : `${min}–${formatNumber(quantity.max)}`;
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
