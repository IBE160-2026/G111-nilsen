import type { ParsedLine, Quantity, ScaledLine, UnitKey } from "./types";

// Toleranse for flyttallsfeil (f.eks. 0,9 × 1,25), slik at halvdeler alltid rundes opp.
const EPSILON = 1e-9;

/** Enheter (og linjer uten enhet) som ikke kan deles: egg, løk, fedd, bokser osv. */
const INDIVISIBLE_UNITS: ReadonlySet<UnitKey> = new Set<UnitKey>([
  "stk",
  "fedd",
  "boks",
  "pk",
  "pose",
  "bunt",
  "skive",
  "glass",
  "beger",
  "can",
]);

/** Enheter der store mengder rundes til to gjeldende sifre og små til hele tall. */
const WEIGHT_VOLUME_UNITS: ReadonlySet<UnitKey> = new Set<UnitKey>(["g", "ml"]);

/** Runder til nærmeste hele tall; halvdeler rundes opp. */
function roundHalfUp(value: number): number {
  return Math.floor(value + 0.5 + EPSILON);
}

/** g/ml: fra 100 og opp to gjeldende sifre, ellers hele tall; minst 1. */
function roundWeightVolume(value: number): number {
  const whole = roundHalfUp(value);
  if (whole < 100) return Math.max(1, whole);
  const step = 10 ** (Math.floor(Math.log10(value)) - 1);
  return roundHalfUp(value / step) * step;
}

/** Udelelig: nærmeste hele tall, halvdeler opp, minst 1. */
function roundIndivisible(value: number): number {
  return Math.max(1, roundHalfUp(value));
}

function isIndivisible(unit: UnitKey | null): boolean {
  return unit === null || INDIVISIBLE_UNITS.has(unit);
}

function withRange(min: number, max: number | undefined): Quantity {
  return max !== undefined && max > min ? { min, max } : { min };
}

/**
 * Skalerer en tolket ingredienslinje med `factor` (valgt / opprinnelig porsjonsantall).
 * Regner alltid fra mengden i `line` (originalen) og endrer aldri `line`. Kaster aldri:
 * ikke tolkbare linjer, ugyldig faktor (ikke endelig eller ≤ 0) og faktor 1 gir linjen
 * uendret. Enheten beholdes alltid (ingen konvertering).
 */
export function scaleLine(line: ParsedLine, factor: number): ScaledLine {
  const unchanged: ScaledLine = { ...line, approximate: false };
  if (!line.parseable || line.quantity === null) return unchanged;
  if (!Number.isFinite(factor) || factor <= 0 || factor === 1) return unchanged;

  const rawMin = line.quantity.min * factor;
  const rawMax = line.quantity.max === undefined ? undefined : line.quantity.max * factor;

  if (isIndivisible(line.unit)) {
    const min = roundIndivisible(rawMin);
    const max = rawMax === undefined ? undefined : roundIndivisible(rawMax);
    const approximate =
      Math.abs(min - rawMin) > EPSILON ||
      (rawMax !== undefined && max !== undefined && Math.abs(max - rawMax) > EPSILON);
    return { ...line, quantity: withRange(min, max), approximate };
  }

  if (line.unit !== null && WEIGHT_VOLUME_UNITS.has(line.unit)) {
    const min = roundWeightVolume(rawMin);
    const max = rawMax === undefined ? undefined : roundWeightVolume(rawMax);
    return { ...line, quantity: withRange(min, max), approximate: false };
  }

  return { ...line, quantity: withRange(rawMin, rawMax), approximate: false };
}
