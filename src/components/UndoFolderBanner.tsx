"use client";

import { useState } from "react";
import type { FolderActionResult } from "@/app/_shared/action-result";
import type { FolderRestore } from "@/app/mapper/actions";
import { fallbackMessage, folderMessages as m } from "@/lib/messages";
import styles from "./UndoFolderBanner.module.css";

/**
 * Meldingen på Mapper-siden rett etter at en mappe er slettet (Story 6.30b): «Mappen … er slettet»
 * med «Angre». Angre lager mappen på nytt og legger oppskriftene tilbake; etterpå står det at den er
 * gjenopprettet. Er navnet tatt i mellomtiden, vises meldingen og man kan prøve igjen.
 */
export default function UndoFolderBanner({
  restore,
  onUndo,
}: {
  restore: FolderRestore;
  onUndo: (
    name: string,
    recipeIds: number[],
  ) => Promise<FolderActionResult<{ name: string; restored: number }>>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [restored, setRestored] = useState<{ name: string; count: number } | null>(null);

  async function undo() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await onUndo(restore.name, restore.recipeIds);
      if (result.ok) setRestored({ name: result.name, count: result.restored });
      else setError(result.message);
    } catch (caught) {
      console.error("Kunne ikke angre slettingen av mappen", caught);
      setError(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <section className={styles.root} aria-label={m.undo}>
      <p role="status" className={styles.text}>
        {restored
          ? m.restored(restored.name, restored.count)
          : m.deletedBanner(restore.name, restore.recipeIds.length)}
      </p>
      {restored ? null : (
        <div className={styles.actions}>
          <button
            type="button"
            className={styles.undo}
            aria-label={m.undoFor(restore.name)}
            aria-disabled={pending ? true : undefined}
            onClick={() => void undo()}
          >
            {pending ? m.restoring : m.undo}
          </button>
        </div>
      )}
      {error !== "" ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
