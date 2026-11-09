"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { servingStepperMessages } from "@/lib/messages";
import { LIMITS } from "@/lib/recipe-input";
import styles from "./ServingStepper.module.css";

const MIN = LIMITS.servingsMin;
const MAX = LIMITS.servingsMax;

/** «1 person» / «N personer». */
export function servingsText(servings: number): string {
  return servings === 1 ? "1 person" : `${servings} personer`;
}

/** Tolker inntastet antall: helt tall innenfor 1–50, ellers `null`. */
export function parseServings(text: string): number | null {
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return value >= MIN && value <= MAX ? value : null;
}

type Props = {
  /** Valgt antall personer (alltid gyldig, 1–50). */
  value: number;
  /** Kalles bare med gyldige verdier. */
  onChange: (value: number) => void;
  /** Antallet oppskriften er skrevet for. */
  original: number;
};

/**
 * Porsjonsvelgeren (UX-DR4). Kontrollert: forelderen eier valgt antall.
 * Inntastet tekst valideres når feltet mister fokus eller Enter trykkes; ugyldig
 * verdi gir melding under feltet, og forrige gyldige verdi beholdes.
 */
export default function ServingStepper({ value, onChange, original }: Props) {
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

  function commit() {
    if (draft === null) return;
    const parsed = parseServings(draft);
    if (parsed === null) {
      setDraft(null);
      setError(true);
      return;
    }
    change(parsed);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }
  }

  return (
    <div className={styles.root}>
      <div className={styles.row}>
        <div className={styles.labels}>
          <label htmlFor={inputId} className={styles.label}>
            Antall personer
          </label>
          <span className={styles.original}>oppr. {original}</span>
        </div>
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.button}
            aria-label="Færre personer"
            aria-controls={inputId}
            disabled={value <= MIN}
            onClick={() => change(Math.max(MIN, value - 1))}
          >
            <span aria-hidden="true">−</span>
          </button>
          <input
            id={inputId}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            className={styles.input}
            value={draft ?? String(value)}
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
            disabled={value >= MAX}
            onClick={() => change(Math.min(MAX, value + 1))}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
      </div>

      {error ? (
        <p id={errorId} className={styles.error}>
          {servingStepperMessages.invalid}
        </p>
      ) : null}

      {value !== original ? (
        <button type="button" className={styles.reset} onClick={() => change(original)}>
          Tilbakestill til {original}
        </button>
      ) : null}

      {/* Leses opp når antallet er endret, ikke for hvert tastetrykk i feltet. */}
      <p role="status" aria-live="polite" className="visually-hidden">
        {servingsText(value)}
      </p>
    </div>
  );
}
