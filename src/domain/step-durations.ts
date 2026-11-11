/** En tid som er nevnt i en stegtekst, klar til å bli en tidtaker (Story 6.5). */
export type StepDuration = {
  /** Teksten slik den står i steget, for eksempel «10–15 minutter». */
  text: string;
  /** Tidtakerens lengde i sekunder. Ved et spenn er det den korteste tiden. */
  seconds: number;
};

/** Lengste tid en tidtaker kan ha: ett døgn. */
export const MAX_TIMER_SECONDS = 24 * 3600;

const NUMBER = String.raw`\d+(?:[.,]\d+)?`;
const RANGE_SEPARATOR = String.raw`\s*(?:[-–—]|til)\s*`;
const HOURS = String.raw`(?:timer|time|t)`;
const MINUTES = String.raw`(?:minutter|minutt|min)`;
const SECONDS = String.raw`(?:sekunder|sekund|sek)`;
// Ikke midt i et annet ord (for eksempel «minst», «timeglass» eller «10 time»).
const END = String.raw`(?![\p{L}\d])`;
const START = String.raw`(?<![\p{L}\d.,])`;

const PATTERN = new RegExp(
  [
    // «en halv time», «et kvarter»
    String.raw`(?<half>en\s+halv\s+time|halvtimes?)`,
    String.raw`(?<quarter>et\s+kvarter)`,
    // «1 time og 30 minutter», «1 t 30 min», «1,5 timer»
    String.raw`(?<h1>${NUMBER})(?:${RANGE_SEPARATOR}(?<h2>${NUMBER}))?\s*${HOURS}\.?(?:\s*(?:og\s*)?(?<hm>${NUMBER})\s*${MINUTES}\.?)?`,
    // «10–15 minutter», «20 min»
    String.raw`(?<m1>${NUMBER})(?:${RANGE_SEPARATOR}(?<m2>${NUMBER}))?\s*${MINUTES}\.?`,
    // «30 sekunder»
    String.raw`(?<s1>${NUMBER})(?:${RANGE_SEPARATOR}(?<s2>${NUMBER}))?\s*${SECONDS}\.?`,
  ]
    .map((part) => `${START}${part}${END}`)
    .join("|"),
  "giu",
);

const toNumber = (value: string) => Number(value.replace(",", "."));

/**
 * Tidene som er nevnt i en stegtekst, i den rekkefølgen de står: «Stek i 10–15 minutter» gir
 * 10 minutter, «Kok i 1 time og 30 minutter» gir 90 minutter. Samme lengde nevnt flere ganger gir
 * én tidtaker. Tider under ett sekund eller over ett døgn hoppes over.
 */
export function findStepDurations(text: string): StepDuration[] {
  const found: StepDuration[] = [];
  for (const match of text.matchAll(PATTERN)) {
    const g = match.groups ?? {};
    let seconds: number;
    if (g.half) seconds = 30 * 60;
    else if (g.quarter) seconds = 15 * 60;
    else if (g.h1) seconds = toNumber(g.h1) * 3600 + (g.hm ? toNumber(g.hm) * 60 : 0);
    else if (g.m1) seconds = toNumber(g.m1) * 60;
    else if (g.s1) seconds = toNumber(g.s1);
    else continue;
    seconds = Math.round(seconds);
    if (!(seconds >= 1 && seconds <= MAX_TIMER_SECONDS)) continue;
    if (found.some((other) => other.seconds === seconds)) continue;
    found.push({ text: match[0].replace(/[\s.]+$/, ""), seconds });
  }
  return found;
}

/** «1 t 30 min», «10 min», «30 sek». Til knapper og beskrivelser. */
export function formatTimerLabel(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  if (whole < 60) return `${whole} sek`;
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = whole % 60;
  const parts = [
    hours > 0 ? `${hours} t` : "",
    minutes > 0 ? `${minutes} min` : "",
    rest > 0 ? `${rest} sek` : "",
  ];
  return parts.filter(Boolean).join(" ");
}

/** Nedtellingen slik den vises: «9:05», og «1:30:00» fra én time. */
export function formatCountdown(seconds: number): string {
  const whole = Math.max(0, Math.ceil(seconds));
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const rest = String(whole % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${rest}` : `${minutes}:${rest}`;
}
