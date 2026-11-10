/** Grensen for tid på en oppskrift: ett døgn (Story 6.2). */
export const MAX_RECIPE_MINUTES = 1440;

/** Gyldig tid i minutter: heltall fra 1 til 1440. */
export function isRecipeMinutes(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= 1 &&
    value <= MAX_RECIPE_MINUTES
  );
}

const NUMBER = "(\\d+(?:[.,]\\d+)?)";
const ISO_DURATION = new RegExp(
  `^P(?:${NUMBER}Y)?(?:${NUMBER}M)?(?:${NUMBER}W)?(?:${NUMBER}D)?` +
    `(?:T(?:${NUMBER}H)?(?:${NUMBER}M)?(?:${NUMBER}S)?)?$`,
  "i",
);

/**
 * Leser en ISO 8601-varighet fra oppskriftsdata («PT45M», «PT1H15M», «P0DT2H», «PT90M»,
 * «PT1H30M0S», «P0Y0M0DT0H30M0.000S», «PT0,5H») som minutter. Sekunder avrundes opp til hele
 * minutter. År og måneder godtas bare som 0. Ugyldig tekst, 0 og mer enn et døgn gir `null`.
 * Kaster aldri.
 */
export function parseIsoDuration(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  const match = ISO_DURATION.exec(text);
  if (!match || /^PT?$/i.test(text) || /T$/i.test(text)) return null;
  const [years, months, weeks, days, hours, minutes, seconds] = match
    .slice(1)
    .map((part) => (part === undefined ? 0 : Number(part.replace(",", "."))));
  if (years > 0 || months > 0) return null;
  const total = Math.ceil(
    weeks * 7 * 1440 + days * 1440 + hours * 60 + minutes + seconds / 60 - 1e-9,
  );
  return isRecipeMinutes(total) ? total : null;
}

/** «45 min», «1 t», «1 t 15 min», «24 t». */
export function formatMinutes(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  return rest === 0 ? `${hours} t` : `${hours} t ${rest} min`;
}
