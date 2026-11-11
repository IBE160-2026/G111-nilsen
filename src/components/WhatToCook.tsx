"use client";

import Link from "next/link";
import { useId, useMemo, useState } from "react";
import type { ActionResult, PantryActionResult } from "@/app/_shared/action-result";
import { matchPantry, type PantryItem, type PantryMatch, type PantryRecipe } from "@/domain";
import { fallbackMessage, whatToCookMessages as m } from "@/lib/messages";
import styles from "./WhatToCook.module.css";

type Props = {
  recipes: readonly PantryRecipe[];
  pantry: readonly PantryItem[];
  onAddPantry: (name: string) => Promise<PantryActionResult>;
  onRemovePantry: (id: number) => Promise<ActionResult>;
};

const GENERIC = `${fallbackMessage.title} ${fallbackMessage.body}`;

/**
 * «Hva kan jeg lage?» (Story 6.12): det brukeren har hjemme (samme liste som på handlelisten) og
 * oppskriftene som passer, gruppert i «Kan lages nå», «Mangler 1–2 ting» og «Mangler flere ting».
 * Treffene regnes ut i nettleseren, så de oppdateres med en gang noe legges til eller fjernes.
 */
export default function WhatToCook({
  recipes,
  pantry: initial,
  onAddPantry,
  onRemovePantry,
}: Props) {
  const id = useId();
  const [pantry, setPantry] = useState<readonly PantryItem[]>(initial);
  // Følger listen fra serveren når den endres (en skjult side beholder ellers en gammel liste).
  const signature = JSON.stringify(initial);
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setPantry(initial);
  }
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [pending, setPending] = useState(false);

  const matches = useMemo(() => matchPantry(recipes, pantry), [recipes, pantry]);
  const groups = useMemo(
    () =>
      [
        { title: m.groupReady, items: matches.filter((x) => x.missing.length === 0) },
        {
          title: m.groupFew,
          items: matches.filter((x) => x.missing.length >= 1 && x.missing.length <= 2),
        },
        { title: m.groupMore, items: matches.filter((x) => x.missing.length > 2) },
      ].filter((group) => group.items.length > 0),
    [matches],
  );

  async function add() {
    if (pending) return;
    setPending(true);
    setError("");
    setStatus("");
    try {
      const result = await onAddPantry(name);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPantry((previous) =>
        previous.some((entry) => entry.id === result.item.id)
          ? previous
          : [...previous, result.item].sort((a, b) => a.name.localeCompare(b.name, "nb")),
      );
      setName("");
      setStatus(m.added(result.item.name));
    } catch (caught) {
      console.error("Kunne ikke legge til noe hjemme", caught);
      setError(GENERIC);
    } finally {
      setPending(false);
    }
  }

  async function remove(entry: PantryItem) {
    if (pending) return;
    setPending(true);
    setError("");
    setStatus("");
    try {
      const result = await onRemovePantry(entry.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setPantry((previous) => previous.filter((other) => other.id !== entry.id));
      setStatus(m.removed(entry.name));
    } catch (caught) {
      console.error("Kunne ikke fjerne noe hjemme", caught);
      setError(GENERIC);
    } finally {
      setPending(false);
    }
  }

  return (
    <div className={styles.root}>
      <section aria-labelledby={`${id}-hjemme`} className={styles.pantry}>
        <h2 id={`${id}-hjemme`} className={styles.heading}>
          {m.pantryHeading}
        </h2>
        <form
          className={styles.form}
          onSubmit={(event) => {
            event.preventDefault();
            void add();
          }}
        >
          <div className={styles.field}>
            <label htmlFor={`${id}-navn`} className={styles.label}>
              {m.fieldLabel}
            </label>
            <input
              id={`${id}-navn`}
              type="text"
              autoComplete="off"
              className={styles.input}
              placeholder={m.fieldHint}
              value={name}
              aria-invalid={error !== "" ? true : undefined}
              aria-describedby={error !== "" ? `${id}-feil` : undefined}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <button type="submit" className={styles.add} aria-disabled={pending ? true : undefined}>
            {m.add}
          </button>
        </form>
        {error !== "" ? (
          <p id={`${id}-feil`} role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        {pantry.length > 0 ? (
          <ul role="list" className={styles.chips}>
            {pantry.map((entry) => (
              <li key={entry.id} className={styles.chip}>
                <span>{entry.name}</span>
                <button
                  type="button"
                  className={styles.remove}
                  aria-label={m.removeFor(entry.name)}
                  aria-disabled={pending ? true : undefined}
                  onClick={() => void remove(entry)}
                >
                  <span aria-hidden="true">×</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className={styles.muted}>{m.noneAtHome}</p>
        )}
        <p role="status" aria-live="polite" className={styles.muted}>
          {status}
        </p>
        <p className={styles.muted}>{m.sameList}</p>
      </section>

      {pantry.length === 0 ? (
        <p className={styles.hint}>{m.startHint}</p>
      ) : matches.length === 0 ? (
        <section className={styles.none}>
          <h2 className={styles.heading}>{m.noMatch}</h2>
          <p>{m.noMatchHint}</p>
        </section>
      ) : (
        <>
          <p className={styles.count} aria-live="polite">
            {m.count(matches.length)}
          </p>
          {groups.map((group) => (
            <section key={group.title} aria-label={group.title} className={styles.group}>
              <h2 className={styles.heading}>{group.title}</h2>
              <ul role="list" className={styles.list}>
                {group.items.map((match) => (
                  <li key={match.id}>
                    <MatchCard match={match} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function MatchCard({ match }: { match: PantryMatch }) {
  const total = match.have.length + match.missing.length;
  return (
    <Link href={`/oppskrift/${match.id}`} className={styles.card}>
      <h3 className={styles.cardTitle}>{match.title}</h3>
      <p className={styles.meta}>{m.haveCount(match.have.length, total)}</p>
      <p className={styles.missing}>
        {match.missing.length === 0 ? m.nothingMissing : m.missingList(match.missing)}
      </p>
    </Link>
  );
}
