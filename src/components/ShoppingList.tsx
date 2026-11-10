"use client";

import { useId, useMemo, useState } from "react";
import {
  buildShoppingList,
  splitByPantry,
  type PantryItem,
  type ShoppingRecipe,
  type UnitSystem,
} from "@/domain";
import type { ActionResult, PantryActionResult } from "@/app/_shared/action-result";
import {
  fallbackMessage,
  pantryMessages as p,
  shoppingMessages as m,
  unitMessages,
} from "@/lib/messages";
import { isSelectedServings, LIMITS } from "@/lib/recipe-input";
import CheckRow from "./CheckRow";
import styles from "./ShoppingList.module.css";

/** Antallet en oppskrift starter på: sist valgt, ellers antallet den er skrevet for, ellers `null`. */
function startServings(recipe: ShoppingRecipe): number | null {
  if (isSelectedServings(recipe.selectedServings)) return recipe.selectedServings;
  const original = recipe.originalServings;
  return original !== null && Number.isInteger(original) && original >= LIMITS.servingsMin
    ? original
    : null;
}

/**
 * Handleliste (Story 5.7): velg oppskrifter og antall personer, så slås ingrediensene sammen til
 * én liste som kan krysses av i butikken. Alt er tilstand i nettleseren; ingenting lagres.
 */
type Props = {
  recipes: readonly ShoppingRecipe[];
  /** Det brukeren har hjemme, lest fra databasen. */
  pantry?: readonly PantryItem[];
  /** Legger til noe hjemme (Server Action). Uten den vises ikke «Har hjemme». */
  onAddPantry?: (name: string) => Promise<PantryActionResult>;
  /** Tar noe ut av «Har hjemme» (Server Action). */
  onRemovePantry?: (id: number) => Promise<ActionResult>;
};

export default function ShoppingList({
  recipes,
  pantry: initialPantry = [],
  onAddPantry,
  onRemovePantry,
}: Props) {
  const id = useId();
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
  const [servings, setServings] = useState<Record<number, number | null>>(() =>
    Object.fromEntries(recipes.map((recipe) => [recipe.id, startServings(recipe)])),
  );
  const [system, setSystem] = useState<UnitSystem>("original");
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set());
  const [status, setStatus] = useState("");
  const [pantry, setPantry] = useState<readonly PantryItem[]>(initialPantry);
  const [pantryName, setPantryName] = useState("");
  const [pantryError, setPantryError] = useState("");
  const [pantryPending, setPantryPending] = useState(false);

  const allItems = useMemo(
    () =>
      buildShoppingList(
        recipes
          .filter((recipe) => picked.has(recipe.id))
          .map((recipe) => ({ recipe, servings: servings[recipe.id] ?? null })),
        system,
      ),
    [recipes, picked, servings, system],
  );
  const { toBuy: items, atHome } = useMemo(
    () => splitByPantry(allItems, pantry),
    [allItems, pantry],
  );

  async function addPantry(name: string): Promise<boolean> {
    if (!onAddPantry || pantryPending) return false;
    setPantryPending(true);
    setPantryError("");
    try {
      const result = await onAddPantry(name);
      if (!result.ok) {
        setPantryError(result.message);
        return false;
      }
      setPantry((previous) =>
        previous.some((entry) => entry.id === result.item.id)
          ? previous
          : [...previous, result.item].sort((a, b) => a.name.localeCompare(b.name, "nb")),
      );
      setStatus(p.added(result.item.name));
      return true;
    } catch (error) {
      console.error("Kunne ikke legge til i «Har hjemme»", error);
      setPantryError(`${fallbackMessage.title} ${fallbackMessage.body}`);
      return false;
    } finally {
      setPantryPending(false);
    }
  }

  async function removePantry(entry: PantryItem) {
    if (!onRemovePantry || pantryPending) return;
    setPantryPending(true);
    setPantryError("");
    try {
      const result = await onRemovePantry(entry.id);
      if (!result.ok) {
        setPantryError(result.message);
        return;
      }
      setPantry((previous) => previous.filter((other) => other.id !== entry.id));
      setStatus(p.removed(entry.name));
    } catch (error) {
      console.error("Kunne ikke ta ut av «Har hjemme»", error);
      setPantryError(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setPantryPending(false);
    }
  }

  function togglePicked(recipeId: number) {
    setStatus("");
    setPicked((previous) => {
      const next = new Set(previous);
      if (!next.delete(recipeId)) next.add(recipeId);
      return next;
    });
  }
  function toggleChecked(key: string) {
    setChecked((previous) => {
      const next = new Set(previous);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }
  function changeServings(recipeId: number, text: string) {
    const value = Number(text.replace(",", "."));
    // Ugyldig inntasting beholder forrige verdi (som porsjonsvelgeren).
    if (text.trim() !== "" && isSelectedServings(value)) {
      setServings((previous) => ({ ...previous, [recipeId]: value }));
    }
  }

  async function copy() {
    const text = items
      .filter((item) => !checked.has(item.key))
      .map((item) => `- ${item.text}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setStatus(m.copied);
    } catch {
      setStatus(m.copyFailed);
    }
  }

  return (
    <div className={styles.root}>
      <section aria-labelledby={`${id}-velg`} className={styles.card}>
        <h2 id={`${id}-velg`}>{m.pickHeading}</h2>
        <ul role="list" className={styles.recipes}>
          {recipes.map((recipe) => {
            const isPicked = picked.has(recipe.id);
            const current = servings[recipe.id] ?? null;
            return (
              <li key={recipe.id} className={styles.recipe}>
                <label className={styles.pick}>
                  <input
                    type="checkbox"
                    checked={isPicked}
                    onChange={() => togglePicked(recipe.id)}
                  />
                  <span>{recipe.title}</span>
                </label>
                {isPicked && current !== null ? (
                  <label className={styles.servings}>
                    <span aria-hidden="true">{m.servingsLabel}</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      min={LIMITS.selectedServingsMin}
                      max={LIMITS.servingsMax}
                      step={0.5}
                      className={styles.number}
                      aria-label={m.servingsFor(recipe.title)}
                      defaultValue={current}
                      onChange={(event) => changeServings(recipe.id, event.target.value)}
                    />
                  </label>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby={`${id}-liste`} className={styles.card}>
        <h2 id={`${id}-liste`}>{m.listHeading}</h2>
        <label className={styles.metric}>
          <input
            type="checkbox"
            checked={system === "metric"}
            onChange={(event) => setSystem(event.target.checked ? "metric" : "original")}
          />
          <span>{unitMessages.metric}</span>
        </label>

        {items.length === 0 ? (
          <p className={styles.hint}>{m.nothingPicked}</p>
        ) : (
          <>
            <p className={styles.count}>{m.count(items.length)}</p>
            <ul role="list" className={styles.items}>
              {items.map((item) => (
                <CheckRow
                  key={item.key}
                  checked={checked.has(item.key)}
                  onToggle={() => toggleChecked(item.key)}
                  action={
                    onAddPantry ? (
                      <button
                        type="button"
                        className={styles.home}
                        aria-label={p.buttonFor(item.name)}
                        aria-disabled={pantryPending ? true : undefined}
                        onClick={() => void addPantry(item.name)}
                      >
                        {p.button}
                      </button>
                    ) : null
                  }
                >
                  <span className={styles.itemText}>{item.text}</span>
                  <span className={styles.from}>
                    {m.fromPrefix} {item.recipes.join(", ")}
                  </span>
                </CheckRow>
              ))}
            </ul>
            <button type="button" className={styles.copy} onClick={() => void copy()}>
              {m.copy}
            </button>
          </>
        )}
        <p role="status" aria-live="polite" className={styles.status}>
          {status}
        </p>
      </section>

      {onAddPantry ? (
        <section aria-labelledby={`${id}-hjemme`} className={styles.card}>
          <h2 id={`${id}-hjemme`}>{p.heading}</h2>
          <p className={styles.hint}>{p.hint}</p>
          <form
            className={styles.pantryForm}
            onSubmit={(event) => {
              event.preventDefault();
              void addPantry(pantryName).then((added) => {
                if (added) setPantryName("");
              });
            }}
          >
            <label htmlFor={`${id}-hjemme-navn`} className={styles.pantryLabel}>
              {p.fieldLabel}
            </label>
            <div className={styles.pantryRow}>
              <input
                id={`${id}-hjemme-navn`}
                type="text"
                autoComplete="off"
                className={styles.pantryInput}
                value={pantryName}
                aria-invalid={pantryError ? true : undefined}
                aria-describedby={pantryError ? `${id}-hjemme-feil` : undefined}
                onChange={(event) => setPantryName(event.target.value)}
              />
              <button
                type="submit"
                className={styles.copy}
                aria-disabled={pantryPending ? true : undefined}
              >
                {p.add}
              </button>
            </div>
            {pantryError ? (
              <p id={`${id}-hjemme-feil`} role="alert" className={styles.error}>
                {pantryError}
              </p>
            ) : null}
          </form>

          {atHome.length > 0 ? <p className={styles.count}>{p.hidden(atHome.length)}</p> : null}
          {pantry.length === 0 ? (
            <p className={styles.hint}>{p.empty}</p>
          ) : (
            <ul role="list" className={styles.pantryList}>
              {pantry.map((entry) => (
                <li key={entry.id} className={styles.pantryItem}>
                  <span>{entry.name}</span>
                  <button
                    type="button"
                    className={styles.home}
                    aria-label={p.putBackFor(entry.name)}
                    aria-disabled={pantryPending ? true : undefined}
                    onClick={() => void removePantry(entry)}
                  >
                    {p.putBack}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}
    </div>
  );
}
