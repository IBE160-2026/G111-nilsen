"use client";

import { useId, useState } from "react";
import type { LabelActionResult } from "@/app/oppskrift/[id]/actions";
import { fallbackMessage, labelMessages as m } from "@/lib/messages";
import styles from "./RecipeLabels.module.css";

type Props = {
  labels: readonly string[];
  onAdd: (label: string) => Promise<LabelActionResult>;
  onRemove: (label: string) => Promise<LabelActionResult>;
};

const fail = `${fallbackMessage.title} ${fallbackMessage.body}`;

/**
 * Merkelapper på en lagret oppskrift (Story 6.7): hver merkelapp med en «Fjern»-knapp, og et felt
 * for å legge til en ny (Enter eller «Legg til»). Hver endring lagres med en gang.
 */
export default function RecipeLabels({ labels: initial, onAdd, onRemove }: Props) {
  const id = useId();
  const [labels, setLabels] = useState<readonly string[]>(initial);
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function run(action: () => Promise<LabelActionResult>, done: string, after?: () => void) {
    if (pending) return;
    setPending(true);
    setError("");
    setStatus("");
    try {
      const result = await action();
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setLabels(result.labels);
      setStatus(done);
      after?.();
    } catch (caught) {
      console.error("Kunne ikke lagre merkelappene", caught);
      setError(fail);
    } finally {
      setPending(false);
    }
  }

  function add() {
    const label = text.replace(/\s+/g, " ").trim();
    if (label === "") {
      setError(m.required);
      return;
    }
    void run(
      () => onAdd(label),
      m.added(label),
      () => setText(""),
    );
  }

  return (
    <section aria-labelledby={`${id}-tittel`} className={styles.root}>
      <h2 id={`${id}-tittel`} className={styles.heading}>
        {m.heading}
      </h2>
      {labels.length === 0 ? (
        <p className={styles.none}>{m.none}</p>
      ) : (
        <ul role="list" className={styles.list}>
          {labels.map((label) => (
            <li key={label} className={styles.chip}>
              <span>{label}</span>
              <button
                type="button"
                className={styles.remove}
                aria-label={m.removeFor(label)}
                aria-disabled={pending ? true : undefined}
                onClick={() => void run(() => onRemove(label), m.removed(label))}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className={styles.form}>
        <label htmlFor={`${id}-ny`} className={styles.label}>
          {m.inputLabel}
        </label>
        <div className={styles.row}>
          <input
            id={`${id}-ny`}
            type="text"
            className={styles.input}
            placeholder={m.inputHint}
            autoComplete="off"
            maxLength={30}
            value={text}
            aria-invalid={error !== "" ? true : undefined}
            aria-describedby={error !== "" ? `${id}-feil` : undefined}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                add();
              }
            }}
          />
          <button
            type="button"
            className={styles.add}
            aria-disabled={pending ? true : undefined}
            onClick={add}
          >
            {m.add}
          </button>
        </div>
        {error !== "" ? (
          <p id={`${id}-feil`} role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
      </div>
      <p role="status" aria-live="polite" className={styles.status}>
        {status}
      </p>
    </section>
  );
}
