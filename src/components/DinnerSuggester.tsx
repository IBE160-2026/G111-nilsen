"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import { dinnerCandidates, formatMinutes, pickDinner, type DinnerCandidate } from "@/domain";
import { dinnerMessages as m } from "@/lib/messages";
import styles from "./DinnerSuggester.module.css";

type Props = { recipes: readonly DinnerCandidate[] };

const TIMES = [30, 60] as const;

/**
 * Tilfeldig middagsforslag (Story 6.13): trekker en oppskrift fra samlingen, eventuelt bare
 * favoritter og opptil en gitt tid. Trekningen skjer ved klikk, ikke ved visning.
 */
export default function DinnerSuggester({ recipes }: Props) {
  const id = useId();
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [maxMinutes, setMaxMinutes] = useState<number | null>(null);
  const [picked, setPicked] = useState<DinnerCandidate | null>(null);

  const candidates = useMemo(
    () => dinnerCandidates(recipes, { onlyFavorites, maxMinutes }),
    [recipes, onlyFavorites, maxMinutes],
  );
  // Forslaget gjelder bare så lenge det fortsatt passer filteret og finnes i samlingen.
  const shown = picked !== null && candidates.some((c) => c.id === picked.id) ? picked : null;

  function suggest() {
    setPicked(pickDinner(candidates, shown?.id ?? null));
  }

  return (
    <div className={styles.root}>
      <div className={styles.filters}>
        <label className={styles.check}>
          <input
            type="checkbox"
            checked={onlyFavorites}
            onChange={(event) => setOnlyFavorites(event.target.checked)}
          />
          <span>{m.onlyFavorites}</span>
        </label>
        <div className={styles.field}>
          <label htmlFor={`${id}-tid`} className={styles.label}>
            {m.timeLabel}
          </label>
          <select
            id={`${id}-tid`}
            className={styles.select}
            value={maxMinutes === null ? "" : String(maxMinutes)}
            onChange={(event) =>
              setMaxMinutes(event.target.value === "" ? null : Number(event.target.value))
            }
          >
            <option value="">{m.timeAny}</option>
            {TIMES.map((minutes) => (
              <option key={minutes} value={minutes}>
                {m.timeUpTo(minutes)}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className={styles.meta} aria-live="polite">
        {m.count(candidates.length)}
      </p>

      {candidates.length === 0 ? (
        <section className={styles.card}>
          <h2 className={styles.heading}>{m.noMatch}</h2>
          <p>{m.noMatchHint}</p>
        </section>
      ) : (
        <button type="button" className={styles.suggest} onClick={suggest}>
          {shown === null ? m.suggest : m.another}
        </button>
      )}

      <div role="status" aria-live="polite">
        {shown !== null ? (
          <section aria-label={m.resultHeading} className={styles.card}>
            <h2 className={styles.heading}>{shown.title}</h2>
            {shown.totalMinutes !== null ? (
              <p className={styles.meta}>{formatMinutes(shown.totalMinutes)}</p>
            ) : null}
            {candidates.length === 1 ? <p className={styles.meta}>{m.onlyOne}</p> : null}
            <Link href={`/oppskrift/${shown.id}`} className={styles.open}>
              {m.open}
            </Link>
          </section>
        ) : null}
      </div>
    </div>
  );
}
