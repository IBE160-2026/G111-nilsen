"use client";

import { useId, useMemo, useState } from "react";
import { filterCollection, normalizeSearch, type CollectionEntry } from "@/domain";
import { collectionFilterMessages as m } from "@/lib/messages";
import RecipeCard from "./RecipeCard";
import styles from "./CollectionBrowser.module.css";

/**
 * Oppskrifter med søk og filtrering (Story 5.2). Filtrerer listen siden allerede har lest;
 * tilstanden ligger i komponenten. Rekkefølgen er som fra serveren (sist lagret først).
 */
export default function CollectionBrowser({ entries }: { entries: readonly CollectionEntry[] }) {
  const id = useId();
  const [query, setQuery] = useState("");
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [folder, setFolder] = useState<string | null>(null);
  const [label, setLabel] = useState<string | null>(null);

  const folders = useMemo(
    () =>
      [
        ...new Set(
          entries.flatMap((entry) => (entry.folderName === null ? [] : [entry.folderName])),
        ),
      ].sort((a, b) => a.localeCompare(b, "nb")),
    [entries],
  );
  // Hver merkelapp en gang, med den skrivemåten som kom først, i norsk rekkefølge.
  const labels = useMemo(() => {
    const byKey = new Map<string, string>();
    for (const entry of entries)
      for (const text of entry.labels ?? []) {
        const key = normalizeSearch(text);
        if (!byKey.has(key)) byKey.set(key, text);
      }
    return [...byKey.values()].sort((a, b) => a.localeCompare(b, "nb"));
  }, [entries]);
  const shown = useMemo(
    () => filterCollection(entries, { query, onlyFavorites, folder, label }),
    [entries, query, onlyFavorites, folder, label],
  );

  function reset() {
    setQuery("");
    setOnlyFavorites(false);
    setFolder(null);
    setLabel(null);
  }

  return (
    <div className={styles.root}>
      <form className={styles.controls} role="search" onSubmit={(event) => event.preventDefault()}>
        <div className={styles.field}>
          <label htmlFor={`${id}-sok`} className={styles.label}>
            {m.searchLabel}
          </label>
          <input
            id={`${id}-sok`}
            type="search"
            autoComplete="off"
            className={styles.input}
            placeholder={m.searchHint}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className={styles.row}>
          {folders.length > 0 ? (
            <div className={styles.field}>
              <label htmlFor={`${id}-mappe`} className={styles.label}>
                {m.folderLabel}
              </label>
              <select
                id={`${id}-mappe`}
                className={styles.input}
                value={folder ?? ""}
                onChange={(event) =>
                  setFolder(event.target.value === "" ? null : event.target.value)
                }
              >
                <option value="">{m.allFolders}</option>
                {folders.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          {labels.length > 0 ? (
            <div className={styles.field}>
              <label htmlFor={`${id}-merkelapp`} className={styles.label}>
                {m.labelLabel}
              </label>
              <select
                id={`${id}-merkelapp`}
                className={styles.input}
                value={label ?? ""}
                onChange={(event) =>
                  setLabel(event.target.value === "" ? null : event.target.value)
                }
              >
                <option value="">{m.allLabels}</option>
                {labels.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
          <label className={styles.check}>
            <input
              type="checkbox"
              checked={onlyFavorites}
              onChange={(event) => setOnlyFavorites(event.target.checked)}
            />
            {m.onlyFavorites}
          </label>
        </div>
      </form>

      <p role="status" aria-live="polite" className={styles.count}>
        {m.count(shown.length, entries.length)}
      </p>

      {shown.length === 0 ? (
        <section className={styles.none}>
          <h2 className={styles.noneTitle}>{m.noMatch}</h2>
          <p>{m.noMatchHint}</p>
          <button type="button" className={styles.reset} onClick={reset}>
            {m.reset}
          </button>
        </section>
      ) : (
        <ul className={styles.list} role="list">
          {shown.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
