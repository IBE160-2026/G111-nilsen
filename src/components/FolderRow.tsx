"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { FolderActionResult } from "@/app/_shared/action-result";
import type { FolderSummary } from "@/domain";
import {
  deleteFolderDialogMessages as dialog,
  fallbackMessage,
  folderMessages as m,
  recipeCountLabel,
} from "@/lib/messages";
import ConfirmDialog from "./ConfirmDialog";
import FolderNameForm from "./FolderNameForm";
import styles from "./FolderRow.module.css";

type Props = {
  folder: FolderSummary;
  onRename: (id: number, name: string) => Promise<FolderActionResult>;
  onDelete: (id: number) => Promise<FolderActionResult>;
  /** Kalles etter at mappen er slettet, så eieren kan flytte fokus til et sted som finnes. */
  onDeleted?: () => void;
};

/**
 * Én rad i mappelisten (Story 3.3): lenke til mappen med navn og antall, «Gi nytt navn»
 * (bytter raden til et skjema; fokus til feltet ved åpning og tilbake til knappen ved avbryt
 * eller lagring) og «Slett» (bekreftelsesdialogen «Slette mappen?»).
 */
export default function FolderRow({ folder, onRename, onDelete, onDeleted }: Props) {
  const [editing, setEditing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const renameButton = useRef<HTMLButtonElement>(null);
  // «Gi nytt navn» byttes ut av skjemaet; husk at fokus skal tilbake når skjemaet lukkes.
  const restoreFocus = useRef(false);

  // En skjult side (Activity) beholder tilstanden; lukk dialog og skjema når siden skjules,
  // slik at dialogen ikke dukker opp som ikke-modal ved retur (docs: preserving-ui-state).
  useLayoutEffect(
    () => () => {
      setConfirmOpen(false);
      setEditing(false);
    },
    [],
  );

  useEffect(() => {
    if (!editing && restoreFocus.current) {
      restoreFocus.current = false;
      renameButton.current?.focus();
    }
  }, [editing]);

  function closeForm() {
    restoreFocus.current = true;
    setEditing(false);
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const result = await onDelete(folder.id);
      setConfirmOpen(false);
      if (result.ok) onDeleted?.();
      else setDeleteError(result.message);
    } catch (error) {
      console.error("Kunne ikke slette mappen", error);
      setConfirmOpen(false);
      setDeleteError(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <li className={styles.row}>
      {editing ? (
        <FolderNameForm
          label={m.renameField}
          initialName={folder.name}
          submitLabel={m.save}
          submitAriaLabel={`${m.saveFor} ${folder.name}`}
          pendingLabel={m.saving}
          cancel={{
            label: m.cancel,
            ariaLabel: `${m.cancelFor} ${folder.name}`,
            onCancel: closeForm,
          }}
          autoFocus
          onSubmit={(name) => onRename(folder.id, name)}
          onSuccess={closeForm}
        />
      ) : (
        <>
          <Link href={`/mapper/${folder.id}`} className={styles.link}>
            <span className={styles.name}>{folder.name}</span>{" "}
            <span className={styles.count}>{recipeCountLabel(folder.recipeCount)}</span>
          </Link>
          <div className={styles.actions}>
            <button
              ref={renameButton}
              type="button"
              className={styles.button}
              aria-label={`${m.renameFor} ${folder.name}`}
              onClick={() => {
                setDeleteError("");
                setEditing(true);
              }}
            >
              {m.rename}
            </button>
            <button
              type="button"
              className={styles.button}
              aria-label={`${m.delete} ${folder.name}`}
              onClick={(event) => {
                // Safari fokuserer ikke knapper ved klikk; fokus skal kunne gå tilbake hit.
                event.currentTarget.focus();
                setDeleteError("");
                setConfirmOpen(true);
              }}
            >
              {m.delete}
            </button>
          </div>
          {deleteError ? (
            <p role="alert" className={styles.error}>
              {deleteError}
            </p>
          ) : null}
        </>
      )}

      <ConfirmDialog
        open={confirmOpen}
        title={dialog.title}
        description={`«${folder.name}» ${dialog.descriptionAfterName}`}
        confirmLabel={dialog.confirm}
        cancelLabel={dialog.cancel}
        pending={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </li>
  );
}
