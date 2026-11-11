"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { normalizeSearch } from "@/domain";
import { weekMessages as m } from "@/lib/messages";
import styles from "./RecipePicker.module.css";

export type PickerRecipe = { id: number; title: string };

/** Oppskriftene der alle søkeordene finnes i tittelen, i rekkefølgen de kommer i. */
export function matchRecipes<T extends PickerRecipe>(recipes: readonly T[], query: string): T[] {
  const words = normalizeSearch(query).split(" ").filter(Boolean);
  return recipes.filter((recipe) => {
    const title = normalizeSearch(recipe.title);
    return words.every((word) => title.includes(word));
  });
}

type Props = {
  recipes: readonly PickerRecipe[];
  /** Valgt oppskrift, eller `null`. */
  value: number | null;
  onChange: (id: number | null) => void;
  /** Kalles når en oppskrift velges fra listen (klikk eller Enter), ikke når tittelen bare skrives. */
  onPick?: (id: number) => void;
  /** Feilmelding som hører til feltet (id-en til meldingen). */
  errorId?: string;
  invalid?: boolean;
  /** id-en til feltet, så en synlig `<label htmlFor>` kan peke på det. */
  inputId: string;
  /** Navnet på listen (samme tekst som etiketten). */
  label: string;
};

/**
 * Søkbart valg av lagret oppskrift (Story 6.4): skriv for å filtrere, velg med pil og Enter eller
 * med klikk. Følger ARIA-mønsteret «combobox med listboks».
 */
export default function RecipePicker({
  recipes,
  value,
  onChange,
  onPick,
  errorId,
  invalid,
  inputId,
  label,
}: Props) {
  const id = useId();
  const selected = recipes.find((recipe) => recipe.id === value) ?? null;
  const [query, setQuery] = useState(selected?.title ?? "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  // Etter et valg fra listen vises alle igjen ved neste åpning, til man skriver noe nytt.
  const [showAll, setShowAll] = useState(selected !== null);

  const matches = useMemo(
    () => (showAll ? [...recipes] : matchRecipes(recipes, query)),
    [recipes, query, showAll],
  );
  const listId = `${id}-liste`;
  const optionId = (index: number) => `${id}-valg-${index}`;
  const showList = open && recipes.length > 0;

  function choose(recipe: PickerRecipe) {
    onChange(recipe.id);
    onPick?.(recipe.id);
    setQuery(recipe.title);
    setShowAll(true);
    setOpen(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((index) =>
        matches.length === 0 ? 0 : (index + step + matches.length) % matches.length,
      );
    } else if (event.key === "Enter" && open && matches[active]) {
      // Enter i en åpen liste velger, og sender ikke skjemaet.
      event.preventDefault();
      choose(matches[active]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className={styles.root}>
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={showList}
        aria-controls={listId}
        aria-activedescendant={showList && matches[active] ? optionId(active) : undefined}
        aria-invalid={invalid ? true : undefined}
        aria-describedby={errorId}
        autoComplete="off"
        placeholder={m.searchPlaceholder}
        className={styles.input}
        value={query}
        onChange={(event) => {
          const text = event.target.value;
          setQuery(text);
          setShowAll(false);
          setActive(0);
          setOpen(true);
          // Skrevet helt likt én tittel: regnes som valgt, også uten å trykke i listen.
          const exact = recipes.filter(
            (recipe) => normalizeSearch(recipe.title) === normalizeSearch(text),
          );
          const next = exact.length === 1 ? exact[0].id : null;
          if (next !== value) onChange(next);
        }}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <ul id={listId} role="listbox" aria-label={label} className={styles.list} hidden={!showList}>
        {matches.map((recipe, index) => (
          <li
            key={recipe.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            className={styles.option}
            // Musen skal ikke ta fokus fra feltet før valget er gjort.
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => choose(recipe)}
            onMouseMove={() => setActive(index)}
          >
            {recipe.title}
          </li>
        ))}
      </ul>
      {showList && matches.length === 0 ? (
        <p className={styles.none} role="status">
          {m.noMatch(query.trim())}
        </p>
      ) : null}
    </div>
  );
}
