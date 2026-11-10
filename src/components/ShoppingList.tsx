"use client";

import { useId, useMemo, useState } from "react";
import { buildShoppingList, type ShoppingRecipe, type UnitSystem } from "@/domain";
import { shoppingMessages as m, unitMessages } from "@/lib/messages";
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
export default function ShoppingList({ recipes }: { recipes: readonly ShoppingRecipe[] }) {
  const id = useId();
  const [picked, setPicked] = useState<ReadonlySet<number>>(() => new Set());
  const [servings, setServings] = useState<Record<number, number | null>>(() =>
    Object.fromEntries(recipes.map((recipe) => [recipe.id, startServings(recipe)])),
  );
  const [system, setSystem] = useState<UnitSystem>("original");
  const [checked, setChecked] = useState<ReadonlySet<string>>(() => new Set());
  const [status, setStatus] = useState("");

  const items = useMemo(
    () =>
      buildShoppingList(
        recipes
          .filter((recipe) => picked.has(recipe.id))
          .map((recipe) => ({ recipe, servings: servings[recipe.id] ?? null })),
        system,
      ),
    [recipes, picked, servings, system],
  );

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
    </div>
  );
}
