"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, shoppingMessages as m } from "@/lib/messages";
import ConfirmDialog from "./ConfirmDialog";
import styles from "./SavedLists.module.css";

export type SavedListItem = { id: number; name: string; recipes: number };

type Props = {
  lists: readonly SavedListItem[];
  /** Id-en til listen som er åpnet nå, om noen. */
  currentId?: number | null;
  /** Sletter en lagret liste (Server Action). */
  onDelete: (id: number) => Promise<ActionResult>;
};

/**
 * «Lagrede handlelister» (Story 6.4g): hver lagret liste med navn og antall oppskrifter, en lenke
 * som åpner den og en «Slett» som spør først.
 */
export default function SavedLists({ lists: initial, currentId = null, onDelete }: Props) {
  const [lists, setLists] = useState<readonly SavedListItem[]>(initial);
  // Følger listene fra serveren når de endres (etter lagring og sletting), uten å miste meldingen.
  const signature = JSON.stringify(initial);
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setLists(initial);
  }
  const [deleting, setDeleting] = useState<SavedListItem | null>(null);
  const [pending, setPending] = useState(false);
  const [status, setStatus] = useState("");

  async function confirmDelete() {
    if (!deleting || pending) return;
    const target = deleting;
    setPending(true);
    try {
      const result = await onDelete(target.id);
      if (!result.ok) {
        setStatus(result.message);
        return;
      }
      setLists((previous) => previous.filter((list) => list.id !== target.id));
      setStatus(m.deleted(target.name));
    } catch (error) {
      console.error("Kunne ikke slette handlelisten", error);
      setStatus(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setPending(false);
      setDeleting(null);
    }
  }

  return (
    <section aria-labelledby="saved-lists" className={styles.root}>
      <h2 id="saved-lists">{m.savedHeading}</h2>
      {lists.length === 0 ? (
        <p className={styles.empty}>{m.savedEmpty}</p>
      ) : (
        <ul role="list" className={styles.list}>
          {lists.map((list) => (
            <li key={list.id} className={styles.item}>
              <Link
                href={`/handleliste?liste=${list.id}`}
                className={styles.open}
                aria-label={m.openList(list.name)}
                aria-current={list.id === currentId ? "page" : undefined}
              >
                <span className={styles.name}>{list.name}</span>
                <span className={styles.meta}>{m.savedRecipes(list.recipes)}</span>
              </Link>
              <button
                type="button"
                className={styles.delete}
                aria-label={m.deleteList(list.name)}
                onClick={() => setDeleting(list)}
              >
                {m.deleteConfirm}
              </button>
            </li>
          ))}
        </ul>
      )}
      <p role="status" aria-live="polite" className={styles.status}>
        {status}
      </p>
      <ConfirmDialog
        open={deleting !== null}
        title={m.deleteTitle}
        description={deleting ? m.deleteBody(deleting.name) : ""}
        confirmLabel={m.deleteConfirm}
        cancelLabel={m.deleteCancel}
        pending={pending}
        onConfirm={() => void confirmDelete()}
        onCancel={() => setDeleting(null)}
      />
    </section>
  );
}
