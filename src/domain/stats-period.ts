/**
 * Perioder på statistikksiden (Story 6.24b). Ren funksjon uten klokke: `now` sendes inn, så
 * grensene kan testes. «I år» begynner 1. januar kl. 00 norsk tid (vintertid, UTC+1).
 */

export const STATS_PERIODS = ["alt", "30", "aar"] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];

/** Perioden fra adressen (`?periode=`); ukjent eller manglende verdi gir «alt». */
export function parseStatsPeriod(value: unknown): StatsPeriod {
  const first = Array.isArray(value) ? value[0] : value;
  return STATS_PERIODS.find((period) => period === first) ?? "alt";
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Året akkurat nå i Norge. */
function osloYear(now: Date): number {
  return Number(
    new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Oslo", year: "numeric" }).format(now),
  );
}

/** ISO-tidspunktet perioden begynner, eller `null` for «alt». */
export function periodStart(period: StatsPeriod, now: Date): string | null {
  if (period === "alt") return null;
  if (period === "30") return new Date(now.getTime() - 30 * DAY_MS).toISOString();
  return `${osloYear(now) - 1}-12-31T23:00:00.000Z`;
}
