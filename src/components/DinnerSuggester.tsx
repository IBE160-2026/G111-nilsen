"use client";

import Link from "next/link";
import { useId, useMemo, useState, useSyncExternalStore } from "react";
import {
  dinnerCandidates,
  dinnerFolders,
  formatMinutes,
  pickDinner,
  type DinnerCandidate,
} from "@/domain";
import {
  DINNER_FILTER_EVENT,
  parseDinnerFilter,
  readDinnerFilterRaw,
  writeDinnerFilter,
  type DinnerFilterChoice,
} from "@/lib/dinner-filter";
import { dinnerMessages as m, ratingMessages } from "@/lib/messages";
import styles from "./DinnerSuggester.module.css";

/** En oppskrift i trekningen, med det kortet viser. */
export type DinnerRecipe = DinnerCandidate & {
  rating?: number | null;
  labels?: readonly string[];
};

type Props = { recipes: readonly DinnerRecipe[] };

const TIMES = [
  { value: null, label: m.timeAll },
  { value: 30, label: m.timeShort },
  { value: 60, label: m.timeMedium },
] as const;

function subscribe(onChange: () => void): () => void {
  window.addEventListener(DINNER_FILTER_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(DINNER_FILTER_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * Tilfeldig middagsforslag (Story 6.13): trekker en oppskrift fra samlingen, eventuelt bare
 * favoritter og opptil en gitt tid. Trekningen skjer ved klikk, ikke ved visning, så siden er
 * ren å rendre. Forslaget vises i et stort kort som er sidens midtpunkt.
 */
export default function DinnerSuggester({ recipes }: Props) {
  const id = useId();
  // Filteret huskes i nettleseren (Story 6.22b). Før lageret er lest (og på serveren) gjelder
  // standardvalget, så første visning er den samme overalt.
  const raw = useSyncExternalStore(subscribe, readDinnerFilterRaw, () => null);
  const stored = useMemo(() => parseDinnerFilter(raw), [raw]);
  const { onlyFavorites, maxMinutes } = stored;
  const [picked, setPicked] = useState<DinnerRecipe | null>(null);
  // Teller opp for hver trekning, så kortet kan tones inn på nytt selv om samme rett kommer igjen.
  const [draws, setDraws] = useState(0);

  const folderOptions = useMemo(() => dinnerFolders(recipes), [recipes]);
  // Mappene det trekkes fra (Story 6.13b). Tom = alle. Mapper som er slettet siden sist, droppes.
  const folders = useMemo(
    () => stored.folders.filter((name) => folderOptions.includes(name)),
    [stored.folders, folderOptions],
  );
  const candidates = useMemo(
    () => dinnerCandidates(recipes, { onlyFavorites, maxMinutes, folders }),
    [recipes, onlyFavorites, maxMinutes, folders],
  );
  // Forslaget gjelder bare så lenge det fortsatt passer filteret og finnes i samlingen.
  const shown = picked !== null && candidates.some((c) => c.id === picked.id) ? picked : null;
  const empty = candidates.length === 0;

  function choose(change: Partial<DinnerFilterChoice>) {
    writeDinnerFilter({ onlyFavorites, maxMinutes, folders, ...change });
  }

  function toggleFolder(name: string | null) {
    choose({
      folders: folders.includes(name)
        ? folders.filter((other) => other !== name)
        : [...folders, name],
    });
  }

  function suggest() {
    setPicked(pickDinner(candidates, shown?.id ?? null));
    setDraws((n) => n + 1);
  }

  return (
    <div className={styles.root}>
      <div className={styles.filters}>
        <input
          id={`${id}-fav`}
          type="checkbox"
          className={styles.toggleInput}
          checked={onlyFavorites}
          onChange={(event) => choose({ onlyFavorites: event.target.checked })}
        />
        <label htmlFor={`${id}-fav`} className={styles.toggle}>
          {m.onlyFavorites}
        </label>

        <fieldset className={styles.times}>
          <legend className={styles.legend}>{m.timeLabel}</legend>
          {TIMES.map((time) => {
            const value = time.value === null ? "alle" : String(time.value);
            return (
              <div key={value} className={styles.timeChoice}>
                <input
                  id={`${id}-tid-${value}`}
                  type="radio"
                  name={`${id}-tid`}
                  className={styles.toggleInput}
                  checked={maxMinutes === time.value}
                  onChange={() => choose({ maxMinutes: time.value })}
                />
                <label htmlFor={`${id}-tid-${value}`} className={styles.toggle}>
                  {time.label}
                </label>
              </div>
            );
          })}
        </fieldset>
      </div>

      {folderOptions.length > 1 ? (
        <fieldset className={styles.filters}>
          <legend className={styles.legend}>{m.foldersLabel}</legend>
          <div className={styles.timeChoice}>
            <input
              id={`${id}-mapper-alle`}
              type="checkbox"
              className={styles.toggleInput}
              checked={folders.length === 0}
              onChange={() => choose({ folders: [] })}
            />
            <label htmlFor={`${id}-mapper-alle`} className={styles.toggle}>
              {m.allFolders}
            </label>
          </div>
          {folderOptions.map((folder, index) => {
            const name = folder ?? m.noFolder;
            return (
              <div key={folder ?? "\u0000"} className={styles.timeChoice}>
                <input
                  id={`${id}-mappe-${index}`}
                  type="checkbox"
                  className={styles.toggleInput}
                  checked={folders.includes(folder)}
                  onChange={() => toggleFolder(folder)}
                />
                <label htmlFor={`${id}-mappe-${index}`} className={styles.toggle}>
                  {name}
                </label>
              </div>
            );
          })}
        </fieldset>
      ) : null}

      <p className={styles.count} aria-live="polite">
        {empty ? m.noMatch : m.count(candidates.length)}
      </p>

      <div role="status" aria-live="polite" className={styles.stage}>
        {empty ? (
          <section className={styles.card}>
            <p className={styles.kicker}>{m.resultHeading}</p>
            <h2 className={styles.title}>{m.noMatch}</h2>
            <p className={styles.lead}>{m.noMatchHint}</p>
          </section>
        ) : shown === null ? (
          <section className={`${styles.card} ${styles.waiting}`}>
            <span aria-hidden="true" className={styles.deck}>
              <span />
              <span />
              <span />
            </span>
            <h2 className={styles.title}>{m.placeholderTitle}</h2>
            <p className={styles.lead}>{m.placeholderBody}</p>
          </section>
        ) : (
          <section
            key={draws}
            aria-label={m.resultHeading}
            className={`${styles.card} ${styles.result}`}
          >
            <p className={styles.kicker}>{m.resultHeading}</p>
            <h2 className={styles.title}>{shown.title}</h2>
            <p className={styles.meta}>
              {[
                shown.totalMinutes !== null ? formatMinutes(shown.totalMinutes) : null,
                shown.folderName ?? null,
              ]
                .filter((part) => part !== null)
                .join(" · ")}
              {shown.rating != null ? (
                <span
                  className={styles.rating}
                  role="img"
                  aria-label={ratingMessages.summary(shown.rating)}
                >
                  {"★".repeat(shown.rating)}
                  {"☆".repeat(5 - shown.rating)}
                </span>
              ) : null}
            </p>
            {shown.labels !== undefined && shown.labels.length > 0 ? (
              <ul className={styles.labels}>
                {shown.labels.map((label) => (
                  <li key={label} className={styles.label}>
                    {label}
                  </li>
                ))}
              </ul>
            ) : null}
            {candidates.length === 1 ? <p className={styles.lead}>{m.onlyOne}</p> : null}
            <Link href={`/oppskrift/${shown.id}`} className={styles.open}>
              {m.open}
            </Link>
          </section>
        )}
      </div>

      {empty ? null : (
        <button type="button" className={styles.suggest} onClick={suggest}>
          {shown === null ? m.suggest : m.another}
        </button>
      )}
    </div>
  );
}
