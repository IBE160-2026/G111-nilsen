/**
 * Felles grenser og linjedeling for oppskrifter brukeren skriver selv.
 * Brukes både av zod-skjemaet i /ny og av recipe-service, så reglene er like.
 */
export const LIMITS = {
  titleLength: 200,
  servingsMin: 1,
  servingsMax: 50,
  linesPerField: 100,
  ingredientLineLength: 300,
  stepLength: 2000,
} as const;

/**
 * Gyldig valgt antall personer (Story 5.1): hele eller halve tall fra 1 til 50 (4, 4,5, 5 …).
 * Antallet oppskriften er skrevet for (`originalServings`) er fortsatt bare hele tall.
 */
export function isSelectedServings(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    Number.isInteger(value * 2) &&
    value >= LIMITS.servingsMin &&
    value <= LIMITS.servingsMax
  );
}

/** Norsk visning av et antall: «4» eller «4,5». */
export function formatServings(value: number): string {
  return String(value).replace(".", ",");
}

/** Deler tekst i linjer, trimmer hver linje og fjerner tomme. Rekkefølgen beholdes. */
export function splitLines(text: string): string[] {
  return text
    .split(/\r\n|\r|\n/)
    .map((line) => line.trim())
    .filter((line) => line !== "");
}
