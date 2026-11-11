"use client";

import { useId, useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, ratingMessages as m } from "@/lib/messages";
import styles from "./RecipeRating.module.css";

type Props = {
  rating: number | null;
  onSave: (rating: number | null) => Promise<ActionResult>;
};

const STARS = [1, 2, 3, 4, 5] as const;
const fail = `${fallbackMessage.title} ${fallbackMessage.body}`;

/**
 * Egen vurdering med fem stjerner (Story 6.8). Hver stjerne er en knapp (`aria-pressed` for den
 * som er valgt); «Fjern vurdering» tar den bort. Hver endring lagres med en gang.
 */
export default function RecipeRating({ rating: initial, onSave }: Props) {
  const id = useId();
  const [rating, setRating] = useState<number | null>(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function save(next: number | null) {
    if (pending) return;
    setPending(true);
    setError("");
    setStatus("");
    try {
      const result = await onSave(next);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setRating(next);
      setStatus(next === null ? m.cleared : m.saved(next));
    } catch (caught) {
      console.error("Kunne ikke lagre vurderingen", caught);
      setError(fail);
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby={`${id}-tittel`} className={styles.root}>
      <h2 id={`${id}-tittel`} className={styles.heading}>
        {m.heading}
      </h2>
      <div className={styles.row}>
        <div role="group" aria-labelledby={`${id}-tittel`} className={styles.stars}>
          {STARS.map((n) => (
            <button
              key={n}
              type="button"
              className={styles.star}
              data-on={rating !== null && n <= rating ? "true" : "false"}
              aria-label={m.starLabel(n)}
              aria-pressed={rating === n}
              aria-disabled={pending ? true : undefined}
              onClick={() => void save(n)}
            >
              <span aria-hidden="true">{rating !== null && n <= rating ? "★" : "☆"}</span>
            </button>
          ))}
        </div>
        {rating !== null ? (
          <button
            type="button"
            className={styles.clear}
            aria-disabled={pending ? true : undefined}
            onClick={() => void save(null)}
          >
            {m.clear}
          </button>
        ) : (
          <p className={styles.none}>{m.none}</p>
        )}
      </div>
      {error !== "" ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <p role="status" aria-live="polite" className={styles.status}>
        {status}
      </p>
    </section>
  );
}
