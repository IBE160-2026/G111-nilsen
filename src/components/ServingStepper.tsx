"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { servingStepperMessages, servingsDialogMessages } from "@/lib/messages";
import { formatServings, isSelectedServings, LIMITS } from "@/lib/recipe-input";
import styles from "./ServingStepper.module.css";

const MIN = LIMITS.servingsMin;
const MAX = LIMITS.servingsMax;
const HALF_MIN = LIMITS.selectedServingsMin;

/** «1 person» / «N personer» (halve tall med komma: «4,5 personer»). */
export function servingsText(servings: number): string {
  return servings === 1 ? "1 person" : `${formatServings(servings)} personer`;
}

/**
 * Tolker inntastet antall: helt tall innenfor 1–50, ellers `null`. Med `allowHalf` godtas også
 * halve tall med komma eller punktum (4,5 / 4.5).
 */
export function parseServings(text: string, allowHalf = false): number | null {
  const trimmed = text.trim();
  const pattern = allowHalf ? /^\d+(?:[.,]5|[.,]0)?$/ : /^\d+$/;
  if (!pattern.test(trimmed)) return null;
  const value = Number(trimmed.replace(",", "."));
  return allowHalf
    ? isSelectedServings(value)
      ? value
      : null
    : value >= MIN && value <= MAX
      ? value
      : null;
}

type Props = {
  /** Valgt antall personer (alltid gyldig, 1–50). */
  value: number;
  /** Kalles bare med gyldige verdier. */
  onChange: (value: number) => void;
  /** Antallet oppskriften er skrevet for. */
  original: number;
  /** Gir «oppr. N · endre»: kalles når brukeren vil endre det opprinnelige antallet. */
  onEditOriginal?: () => void;
  /** Bare velgeren (til dialogen): uten «oppr.», «Tilbakestill» og opplesing. */
  bare?: boolean;
  /** Kalles med gyldig antall når Enter trykkes i feltet (til dialogen: Enter lagrer). */
  onEnter?: (value: number) => void;
  /** Tillat halve porsjoner (4,5): gir «+ ½»-knapp og godtar komma i feltet (Story 5.1). */
  allowHalf?: boolean;
};

/**
 * Porsjonsvelgeren (UX-DR4). Kontrollert: forelderen eier valgt antall.
 * Inntastet tekst valideres når feltet mister fokus eller Enter trykkes; ugyldig
 * verdi gir melding under feltet, og forrige gyldige verdi beholdes. Ved 1 og 50 bruker
 * −/+ `aria-disabled` i stedet for `disabled`, så tastaturfokus blir på knappen; klikk
 * ved grensen gjør ingenting.
 */
export default function ServingStepper({
  value,
  onChange,
  original,
  onEditOriginal,
  bare = false,
  onEnter,
  allowHalf = false,
}: Props) {
  // Med halve porsjoner kan antallet gå ned til 0,5 (Story 5.3).
  const lowest = allowHalf ? HALF_MIN : MIN;
  const id = useId();
  const inputId = `${id}-antall`;
  const errorId = `${id}-feil`;
  // `null` betyr at feltet viser `value`; ellers teksten brukeren holder på å skrive.
  const [draft, setDraft] = useState<string | null>(null);
  const [error, setError] = useState(false);

  function change(next: number) {
    setDraft(null);
    setError(false);
    if (next !== value) onChange(next);
  }

  /** Returnerer det gyldige antallet feltet nå står på, eller `null` ved ugyldig tekst. */
  function commit(): number | null {
    if (draft === null) return value;
    const parsed = parseServings(draft, allowHalf);
    if (parsed === null) {
      setDraft(null);
      setError(true);
      return null;
    }
    change(parsed);
    return parsed;
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      const committed = commit();
      if (committed !== null) onEnter?.(committed);
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <div className={styles.labels}>
          <label htmlFor={inputId} className={styles.label}>
            Antall personer
          </label>
          {bare ? null : (
            <span className={styles.original}>
              oppr. {original}
              {onEditOriginal ? (
                <span data-print="hide">
                  {" · "}
                  <button
                    type="button"
                    className={styles.edit}
                    aria-label={servingsDialogMessages.editLabel}
                    onClick={onEditOriginal}
                  >
                    {servingsDialogMessages.edit}
                  </button>
                </span>
              ) : null}
            </span>
          )}
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.button}
            aria-label="Færre personer"
            aria-controls={inputId}
            aria-disabled={value <= lowest ? true : undefined}
            onClick={() => {
              if (value > lowest) change(Math.max(lowest, value - 1));
            }}
          >
            <span aria-hidden="true">−</span>
          </button>
          <input
            id={inputId}
            type="text"
            inputMode={allowHalf ? "decimal" : "numeric"}
            autoComplete="off"
            className={styles.input}
            value={draft ?? formatServings(value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={commit}
            onKeyDown={onKeyDown}
          />
          <button
            type="button"
            className={styles.button}
            aria-label="Flere personer"
            aria-controls={inputId}
            aria-disabled={value >= MAX ? true : undefined}
            onClick={() => {
              if (value < MAX) change(Math.min(MAX, value + 1));
            }}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      {allowHalf ? (
        <input
          type="range"
          className={styles.slider}
          min={HALF_MIN}
          max={MAX}
          step={0.5}
          value={value}
          aria-label={servingStepperMessages.sliderLabel}
          aria-valuetext={servingsText(value)}
          onChange={(event) => change(Number(event.target.value))}
        />
      ) : null}

      {allowHalf ? (
        <button
          type="button"
          className={styles.half}
          aria-pressed={value % 1 !== 0}
          aria-label={
            value % 1 !== 0 ? servingStepperMessages.halfOff : servingStepperMessages.halfOn
          }
          aria-disabled={value % 1 === 0 && value >= MAX ? true : undefined}
          onClick={() => {
            if (value % 1 !== 0 && value - 0.5 >= lowest) change(value - 0.5);
            else if (value < MAX) change(value + 0.5);
          }}
        >
          {servingStepperMessages.halfLabel}
        </button>
      ) : null}

      {error ? (
        <p id={errorId} role="alert" className={styles.error}>
          {allowHalf ? servingStepperMessages.invalidHalf : servingStepperMessages.invalid}
        </p>
      ) : null}

      {!bare && value !== original ? (
        <button type="button" className={styles.reset} onClick={() => change(original)}>
          Tilbakestill til {original}
        </button>
      ) : null}

      {/* Leses opp når antallet er endret, ikke for hvert tastetrykk i feltet. */}
      {bare ? null : (
        <p role="status" aria-live="polite" className="visually-hidden">
          {servingsText(value)}
        </p>
      )}
    </div>
  );
}
