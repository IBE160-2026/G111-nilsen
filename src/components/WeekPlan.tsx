"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, weekMessages as m } from "@/lib/messages";
import { formatServings, isSelectedServings, LIMITS } from "@/lib/recipe-input";
import RecipePicker from "./RecipePicker";
import styles from "./WeekPlan.module.css";

export type WeekDay = { day: string; label: string; isToday: boolean };
export type WeekEntry = {
  id: number;
  day: string;
  servings: number;
  recipeId: number;
  title: string;
};
export type WeekRecipe = {
  id: number;
  title: string;
  originalServings: number | null;
  selectedServings: number | null;
};

type Props = {
  days: readonly WeekDay[];
  entries: readonly WeekEntry[];
  recipes: readonly WeekRecipe[];
  /** Lenke til handlelisten med ukas oppskrifter valgt. */
  shoppingHref: string;
  onAdd: (input: {
    recipeId: number;
    day: string;
    servings: number;
  }) => Promise<{ ok: true; id: number } | { ok: false; message: string }>;
  onRemove: (id: number) => Promise<ActionResult>;
};

/** Antallet en oppskrift foreslås for: sist valgt, ellers antallet den er skrevet for, ellers 4. */
function defaultServings(recipe: WeekRecipe | undefined): number {
  if (!recipe) return 4;
  if (isSelectedServings(recipe.selectedServings)) return recipe.selectedServings;
  const original = recipe.originalServings;
  return original !== null && isSelectedServings(original) ? original : 4;
}

/**
 * Ukemeny (Story 6.4): én rad per dag med oppskriftene som er lagt der, og et lite skjema for å
 * legge til en lagret oppskrift med antall porsjoner.
 */
export default function WeekPlan({
  days,
  entries: initial,
  recipes,
  shoppingHref,
  onAdd,
  onRemove,
}: Props) {
  const id = useId();
  const [entries, setEntries] = useState<readonly WeekEntry[]>(initial);
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  async function add(day: WeekDay, recipeId: number, servings: number): Promise<string | null> {
    if (pending) return null;
    const recipe = recipes.find((other) => other.id === recipeId);
    if (!recipe) return m.pickFromList;
    if (!isSelectedServings(servings)) return m.invalidServings;
    setPending(true);
    try {
      const result = await onAdd({ recipeId, day: day.day, servings });
      if (!result.ok) return result.message;
      setEntries((previous) => [
        ...previous,
        { id: result.id, day: day.day, servings, recipeId, title: recipe.title },
      ]);
      setStatus(m.added(recipe.title, day.label));
      return null;
    } catch (error) {
      console.error("Kunne ikke legge til i ukemenyen", error);
      return `${fallbackMessage.title} ${fallbackMessage.body}`;
    } finally {
      setPending(false);
    }
  }

  async function remove(entry: WeekEntry, day: WeekDay) {
    if (pending) return;
    setPending(true);
    try {
      const result = await onRemove(entry.id);
      if (!result.ok) {
        setStatus(result.message);
        return;
      }
      setEntries((previous) => previous.filter((other) => other.id !== entry.id));
      setStatus(m.removed(entry.title, day.label));
    } catch (error) {
      console.error("Kunne ikke fjerne fra ukemenyen", error);
      setStatus(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.root}>
      <ol role="list" className={styles.days}>
        {days.map((day) => {
          const dayEntries = entries.filter((entry) => entry.day === day.day);
          return (
            <li key={day.day} className={styles.day} aria-labelledby={`${id}-${day.day}`}>
              <h2 id={`${id}-${day.day}`} className={styles.dayHeading}>
                {day.label}
                {day.isToday ? <span className={styles.today}> · {m.today}</span> : null}
              </h2>
              {dayEntries.length === 0 ? (
                <p className={styles.empty}>{m.emptyDay}</p>
              ) : (
                <ul role="list" className={styles.entries}>
                  {dayEntries.map((entry) => (
                    <li key={entry.id} className={styles.entry}>
                      <Link href={`/oppskrift/${entry.recipeId}`} className={styles.title}>
                        {entry.title}
                      </Link>
                      <span className={styles.servings}>
                        {m.portions(formatServings(entry.servings))}
                      </span>
                      <button
                        type="button"
                        className={styles.remove}
                        aria-label={m.removeFor(entry.title, day.label)}
                        aria-disabled={pending ? true : undefined}
                        onClick={() => void remove(entry, day)}
                      >
                        {m.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <AddForm day={day} recipes={recipes} pending={pending} onAdd={add} />
            </li>
          );
        })}
      </ol>

      <Link href={shoppingHref} className={styles.shopping}>
        {m.shopping}
      </Link>
      <p role="status" aria-live="polite" className={styles.status}>
        {status}
      </p>
    </div>
  );
}

function AddForm({
  day,
  recipes,
  pending,
  onAdd,
}: {
  day: WeekDay;
  recipes: readonly WeekRecipe[];
  pending: boolean;
  onAdd: (day: WeekDay, recipeId: number, servings: number) => Promise<string | null>;
}) {
  const id = useId();
  const [recipeId, setRecipeId] = useState<number | null>(null);
  // Ny nøkkel tømmer søkefeltet etter at noe er lagt til.
  const [pickerKey, setPickerKey] = useState(0);
  const [servings, setServings] = useState("");
  const [error, setError] = useState("");

  return (
    <form
      className={styles.form}
      aria-label={m.addLabel(day.label)}
      onSubmit={(event) => {
        event.preventDefault();
        const recipe = recipes.find((other) => other.id === recipeId);
        const count =
          servings.trim() === "" ? defaultServings(recipe) : Number(servings.replace(",", "."));
        void onAdd(day, recipeId ?? 0, count).then((message) => {
          setError(message ?? "");
          if (message === null) {
            setRecipeId(null);
            setServings("");
            setPickerKey((key) => key + 1);
          }
        });
      }}
    >
      <label htmlFor={`${id}-oppskrift`} className={styles.label}>
        {m.recipeLabel}
      </label>
      <div className={styles.picker}>
        <RecipePicker
          key={pickerKey}
          inputId={`${id}-oppskrift`}
          label={m.recipeLabel}
          recipes={recipes}
          value={recipeId}
          invalid={Boolean(error)}
          errorId={error ? `${id}-feil` : undefined}
          onChange={(next) => {
            setRecipeId(next);
            setError("");
          }}
        />
      </div>
      <label htmlFor={`${id}-porsjoner`} className={styles.label}>
        {m.servingsLabel}
      </label>
      <input
        id={`${id}-porsjoner`}
        type="number"
        inputMode="decimal"
        min={LIMITS.selectedServingsMin}
        max={LIMITS.servingsMax}
        step={0.5}
        className={styles.number}
        placeholder={formatServings(
          defaultServings(recipes.find((recipe) => recipe.id === recipeId)),
        )}
        value={servings}
        onChange={(event) => setServings(event.target.value)}
      />
      <button type="submit" className={styles.add} aria-disabled={pending ? true : undefined}>
        {pending ? m.adding : m.add}
      </button>
      {error ? (
        <p id={`${id}-feil`} role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
