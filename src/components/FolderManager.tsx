"use client";

import { useEffect, useRef, useState } from "react";
import type { FolderActionResult } from "@/app/_shared/action-result";
import type { FolderSummary } from "@/domain";
import { folderMessages as m } from "@/lib/messages";
import EmptyState from "./EmptyState";
import FolderNameForm from "./FolderNameForm";
import FolderRow from "./FolderRow";
import styles from "./FolderManager.module.css";

type Props = {
  folders: FolderSummary[];
  /** Server Actions fra `src/app/mapper/actions.ts`. */
  onCreate: (name: string) => Promise<FolderActionResult>;
  onRename: (id: number, name: string) => Promise<FolderActionResult>;
  onDelete: (id: number) => Promise<FolderActionResult>;
};

/**
 * Innholdet på Mapper-siden (Story 3.3): skjemaet «Ny mappe» og listen over mapper, eller
 * tom-tilstanden under skjemaet når det ikke finnes mapper. Etter sletting flyttes fokus til
 * navnefeltet i «Ny mappe», siden knappen som åpnet dialogen er borte.
 */
export default function FolderManager({ folders, onCreate, onRename, onDelete }: Props) {
  const [focusCreate, setFocusCreate] = useState(0);
  const createSection = useRef<HTMLElement>(null);

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

      {folders.length === 0 ? (
        <EmptyState
          title={m.emptyTitle}
          description={m.emptyDescription}
          action={{ href: "/samlingen", label: m.emptyAction }}
        />
      ) : (
        <ul className={styles.list} role="list">
          {folders.map((folder) => (
            <FolderRow
              key={folder.id}
              folder={folder}
              onRename={onRename}
              onDelete={onDelete}
              onDeleted={() => setFocusCreate((n) => n + 1)}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
