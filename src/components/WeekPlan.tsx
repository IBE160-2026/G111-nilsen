"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
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
  /** Lagrer hele uka: alle oppføringene erstattes med de som sendes (Server Action). */
  onSave: (input: {
    week: string;
    items: { recipeId: number; day: string; servings: number }[];
  }) => Promise<ActionResult>;
  /** Mandagen i uka som vises. */
  week: string;
};

/** En nøkkel for innholdet i uka, uavhengig av rekkefølge og id, til å se om noe er endret. */
function contentKey(entries: readonly WeekEntry[]): string {
  return entries
    .map((entry) => `${entry.day}|${entry.recipeId}|${entry.servings}`)
    .sort()
    .join(";");
}

/** Antallet en oppskrift foreslås for: sist valgt, ellers antallet den er skrevet for, ellers 4. */
function defaultServings(recipe: WeekRecipe | undefined): number {
  if (!recipe) return 4;
  if (isSelectedServings(recipe.selectedServings)) return recipe.selectedServings;
  const original = recipe.originalServings;
  return original !== null && isSelectedServings(original) ? original : 4;
}

/**
 * Ukemeny (Story 6.4): én rad per dag med oppskriftene som er lagt der, og et lite skjema for å
 * legge til en lagret oppskrift med antall porsjoner. Endringene samles i siden til Ida trykker
 * «Lagre uka»; så lagres hele uka på en gang. Ulagrede endringer vises, og nettleseren spør før
 * siden lukkes.
 */
export default function WeekPlan({
  days,
  entries: initial,
  recipes,
  shoppingHref,
  onSave,
  week,
}: Props) {
  const id = useId();
  const [entries, setEntries] = useState<readonly WeekEntry[]>(initial);
  const [savedKey, setSavedKey] = useState(() => contentKey(initial));
  const [status, setStatus] = useState("");
  const [saving, setSaving] = useState(false);
  // Nye oppføringer får negative id-er, så de ikke kolliderer med lagrede.
  const nextId = useRef(-1);
  const dirty = contentKey(entries) !== savedKey;

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  /** Legger oppskriften på dagen i utkastet. Returnerer en melding ved feil, ellers `null`. */
  function add(day: WeekDay, recipeId: number, servings: number): string | null {
    const recipe = recipes.find((other) => other.id === recipeId);
    if (!recipe) return m.pickFromList;
    if (!isSelectedServings(servings)) return m.invalidServings;
    setEntries((previous) => [
      ...previous,
      { id: nextId.current--, day: day.day, servings, recipeId, title: recipe.title },
    ]);
    setStatus(m.added(recipe.title, day.label));
    return null;
  }

  function remove(entry: WeekEntry, day: WeekDay) {
    setEntries((previous) => previous.filter((other) => other.id !== entry.id));
    setStatus(m.removed(entry.title, day.label));
  }

  async function save() {
    if (saving) return;
    if (!dirty) {
      setStatus(m.nothingToSave);
      return;
    }
    setSaving(true);
    try {
      const result = await onSave({
        week,
        items: entries.map(({ recipeId, day, servings }) => ({ recipeId, day, servings })),
      });
      if (!result.ok) {
        setStatus(result.message);
        return;
      }
      setSavedKey(contentKey(entries));
      setStatus(m.saved);
    } catch (error) {
      console.error("Kunne ikke lagre ukemenyen", error);
      setStatus(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className={styles.root}>
      <p className={styles.hint}>{m.addHint}</p>
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
                        onClick={() => remove(entry, day)}
                      >
                        {m.remove}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <AddForm day={day} recipes={recipes} onAdd={add} />
            </li>
          );
        })}
      </ol>

      <div className={styles.saveBar}>
        <button
          type="button"
          className={styles.save}
          aria-disabled={saving || !dirty ? true : undefined}
          onClick={() => void save()}
        >
          {saving ? m.saving : m.save}
        </button>
        <p className={dirty ? styles.unsaved : styles.savedNote}>{dirty ? m.unsaved : m.saved}</p>
      </div>
      <Link
        href={shoppingHref}
        className={styles.shopping}
        onClick={(event) => {
          // Handlelisten lages av det som er lagret, så ulagrede endringer må lagres først.
          if (dirty) {
            event.preventDefault();
            setStatus(m.saveFirst);
          }
        }}
      >
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
  onAdd,
}: {
  day: WeekDay;
  recipes: readonly WeekRecipe[];
  onAdd: (day: WeekDay, recipeId: number, servings: number) => string | null;
}) {
  const id = useId();
  const [recipeId, setRecipeId] = useState<number | null>(null);
  // Ny nøkkel tømmer søkefeltet etter at noe er lagt til.
  const [pickerKey, setPickerKey] = useState(0);
  const [servings, setServings] = useState("");
  const [error, setError] = useState("");

  /** Legger oppskriften på dagen med det som står i antallfeltet, ellers oppskriftens eget antall. */
  function submit(chosen: number | null) {
    const recipe = recipes.find((other) => other.id === chosen);
    const count =
      servings.trim() === "" ? defaultServings(recipe) : Number(servings.replace(",", "."));
    const message = onAdd(day, chosen ?? 0, count);
    setError(message ?? "");
    if (message === null) {
      setRecipeId(null);
      setServings("");
      setPickerKey((key) => key + 1);
    }
  }

  return (
    <form
      className={styles.form}
      aria-label={m.addLabel(day.label)}
      onSubmit={(event) => {
        event.preventDefault();
        submit(recipeId);
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
          // Å velge fra listen legger oppskriften til med en gang.
          onPick={submit}
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
        value={servings}
        onChange={(event) => setServings(event.target.value)}
        onKeyDown={(event) => {
          // Enter i antallfeltet legger til den valgte oppskriften (to felt gir ellers ingen Enter-sending).
          if (event.key === "Enter") {
            event.preventDefault();
            if (recipeId !== null) submit(recipeId);
            else setError(m.pickFromList);
          }
        }}
      />
      {error ? (
        <p id={`${id}-feil`} role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </form>
  );
}
