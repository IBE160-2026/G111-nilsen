"use client";

import { useEffect, useRef, useState } from "react";
import type { FolderActionResult } from "@/app/_shared/action-result";
import type { FolderRestore } from "@/app/mapper/actions";
import type { FolderSummary } from "@/domain";
import { folderMessages as m } from "@/lib/messages";
import EmptyState from "./EmptyState";
import FolderNameForm from "./FolderNameForm";
import FolderRow from "./FolderRow";
import UndoFolderBanner from "./UndoFolderBanner";
import styles from "./FolderManager.module.css";

type Props = {
  folders: FolderSummary[];
  /** Server Actions fra `src/app/mapper/actions.ts`. */
  onCreate: (name: string) => Promise<FolderActionResult>;
  onRename: (id: number, name: string) => Promise<FolderActionResult>;
  onDelete: (id: number) => Promise<FolderActionResult<{ restore?: FolderRestore }>>;
  /** Angrer en sletting (Story 6.30b); uten den vises ingen «Angre». */
  onUndoDelete?: (
    name: string,
    recipeIds: number[],
  ) => Promise<FolderActionResult<{ name: string; restored: number }>>;
};

/**
 * Innholdet på Mapper-siden (Story 3.3): skjemaet «Ny mappe» og listen over mapper, eller
 * tom-tilstanden under skjemaet når det ikke finnes mapper. Etter sletting flyttes fokus til
 * navnefeltet i «Ny mappe», siden knappen som åpnet dialogen er borte.
 */
export default function FolderManager({
  folders,
  onCreate,
  onRename,
  onDelete,
  onUndoDelete,
}: Props) {
  const [focusCreate, setFocusCreate] = useState(0);
  const createSection = useRef<HTMLElement>(null);
  // Mappen som ble slettet sist, så den kan gjenopprettes (Story 6.30b).
  const [deleted, setDeleted] = useState<FolderRestore | null>(null);

  // Effekten ligger i forelderen, så den kjører etter at dialogen i raden har gitt fokus tilbake
  // til en knapp som snart er borte.
  useEffect(() => {
    if (focusCreate > 0) createSection.current?.querySelector("input")?.focus();
  }, [focusCreate]);

  return (
    <div className={styles.root}>
      <section ref={createSection} className={styles.create}>
        <FolderNameForm
          label={m.newFolderLabel}
          hint={m.newFolderHint}
          submitLabel={m.createButton}
          pendingLabel={m.creating}
          clearOnSuccess
          onSubmit={onCreate}
        />
      </section>

      {deleted !== null && onUndoDelete ? (
        <UndoFolderBanner key={deleted.name} restore={deleted} onUndo={onUndoDelete} />
      ) : null}

      {folders.length === 0 ? (
        <EmptyState
          title={m.emptyTitle}
          description={m.emptyDescription}
          action={{ href: "/oppskrifter", label: m.emptyAction }}
        />
      ) : (
        <ul className={styles.list} role="list">
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onRename={onRename}
              onDelete={onDelete}
              onDeleted={(restore) => {
                setFocusCreate((n) => n + 1);
                setDeleted(restore ?? null);
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
