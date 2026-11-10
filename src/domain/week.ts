/**
 * Uker og datoer for ukemenyen (Story 6.4). Datoer er tekst «YYYY-MM-DD» uten tidssone, og all
 * regning skjer i UTC, så resultatet ikke avhenger av maskinens tidssone. Uka starter mandag.
 */

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Gyldig dato «YYYY-MM-DD» (også skuddår) i årene 1900–2999, ellers `false`. */
export function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = DATE.exec(value);
  if (!match) return false;
  // Et rimelig spenn for en ukemeny; holder også «forrige/neste uke» innenfor firesifrede år.
  const year = Number(match[1]);
  if (year < 1900 || year > 2999) return false;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  return date.toISOString().slice(0, 10) === value;
}

function toDate(iso: string): Date {
  return new Date(`${iso}T00:00:00.000Z`);
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Datoen `days` dager etter (eller før, med negativt tall). */
export function addDays(iso: string, days: number): string {
  const date = toDate(iso);
  date.setUTCDate(date.getUTCDate() + days);
  return toIso(date);
}

/** Mandagen i uka datoen ligger i. */
export function mondayOf(iso: string): string {
  const weekday = (toDate(iso).getUTCDay() + 6) % 7; // mandag = 0
  return addDays(iso, -weekday);
}

/** De sju datoene i uka som starter på `monday`. */
export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index));
}

/** ISO-ukenummer (uke 1 er uka med årets første torsdag). */
export function isoWeekNumber(iso: string): number {
  const thursday = addDays(mondayOf(iso), 3);
  const yearStart = `${thursday.slice(0, 4)}-01-01`;
  const days = (toDate(thursday).getTime() - toDate(yearStart).getTime()) / 86_400_000;
  return Math.floor(days / 7) + 1;
}

const WEEKDAYS = ["mandag", "tirsdag", "onsdag", "torsdag", "fredag", "lørdag", "søndag"];
const MONTHS = [
  "januar",
  "februar",
  "mars",
  "april",
  "mai",
  "juni",
  "juli",
  "august",
  "september",
  "oktober",
  "november",
  "desember",
];

/** «mandag 9. november». */
export function formatDay(iso: string): string {
  const date = toDate(iso);
  const weekday = WEEKDAYS[(date.getUTCDay() + 6) % 7];
  return `${weekday} ${date.getUTCDate()}. ${MONTHS[date.getUTCMonth()]}`;
}

/** «Uke 46 · 9.–15. november 2026», eller over månedsskifte «Uke 49 · 30. november–6. desember 2026». */
export function formatWeek(monday: string): string {
  const sunday = addDays(monday, 6);
  const start = toDate(monday);
  const end = toDate(sunday);
  const sameMonth = start.getUTCMonth() === end.getUTCMonth();
  const from = sameMonth
    ? `${start.getUTCDate()}.`
    : `${start.getUTCDate()}. ${MONTHS[start.getUTCMonth()]}`;
  return `Uke ${isoWeekNumber(monday)} · ${from}–${end.getUTCDate()}. ${MONTHS[end.getUTCMonth()]} ${end.getUTCFullYear()}`;
}
