import { roundWeightVolume } from "./scale-line";
import type { ScaledLine, UnitKey } from "./types";

/** Hvilke mål mengdene vises i. `original` viser linjen slik den står (etter skalering). */
export type UnitSystem = "original" | "metric";

type Rule = {
  unit: UnitKey;
  /** Hvor mange av målenheten én original enhet tilsvarer. */
  factor: number;
  /** `true` når omregningen er avrundet nok til at mengden vises som «ca.». */
  approximate: boolean;
};

/**
 * Amerikanske mål til norske (Story 5.5). Kopp = 2,4 dl, unse = 28 g, pund = 450 g er de
 * vanlige kjøkkenverdiene. Spiseskje og teskje likestilles (15 og 5 ml), så de er ikke «ca.».
 */
const METRIC_RULES: Readonly<Partial<Record<UnitKey, Rule>>> = {
  cup: { unit: "dl", factor: 2.4, approximate: true },
  oz: { unit: "g", factor: 28.35, approximate: true },
  lb: { unit: "g", factor: 453.6, approximate: true },
  tbsp: { unit: "ss", factor: 1, approximate: false },
  tsp: { unit: "ts", factor: 1, approximate: false },
};

/** Har linjen en enhet som kan regnes om til metrisk? */
export function hasConvertibleUnit(line: { unit: UnitKey | null; parseable: boolean }): boolean {
  return line.parseable && line.unit !== null && METRIC_RULES[line.unit] !== undefined;
}

const round1 = (value: number) => Math.round(value * 10 + 1e-9) / 10;

/**
 * Regner en (skalert) linje om til valgt målsystem. Ren visning: originalen røres aldri (AD-2).
 * Ikke tolkbare linjer, linjer uten omregnbar enhet og `original` gir linjen uendret. Gram
 * over 1000 vises som kg og dl over 10 som l. Kaster aldri.
 */
export function convertLine(line: ScaledLine, system: UnitSystem): ScaledLine {
  if (system === "original" || !hasConvertibleUnit(line) || line.quantity === null) return line;
  const rule = METRIC_RULES[line.unit as UnitKey] as Rule;
  const largest = (line.quantity.max ?? line.quantity.min) * rule.factor;

  let unit = rule.unit;
  let scale = rule.factor;
  let round = (value: number) => value;
  if (rule.unit === "g") {
    round = roundWeightVolume;
    if (largest >= 1000) {
      unit = "kg";
      scale = rule.factor / 1000;
      round = round1;
    }
  } else if (rule.unit === "dl") {
    round = round1;
    if (largest >= 10) {
      unit = "l";
      scale = rule.factor / 10;
    }
  }

  const min = round(line.quantity.min * scale);
  const max = line.quantity.max === undefined ? undefined : round(line.quantity.max * scale);
  return {
    ...line,
    unit,
    quantity: max !== undefined && max > min ? { min, max } : { min },
    approximate: line.approximate || rule.approximate,
  };
}
