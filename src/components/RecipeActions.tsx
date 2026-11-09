"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ActionResult, FolderActionResult } from "@/app/_shared/action-result";
import type { Folder } from "@/domain";
import { deleteDialogMessages, fallbackMessage, recipeActionMessages } from "@/lib/messages";
import ConfirmDialog from "./ConfirmDialog";
import FolderDialog from "./FolderDialog";
import styles from "./RecipeActions.module.css";

/** Hvor lenge «Lagret.», «Lagret i <navn>.» og «Fjernet fra mappen.» står, i millisekunder. */
export const SAVED_MESSAGE_MS = 3000;

type Props = {
  title: string;
  /** `true` når oppskriften er i samlingen (`savedAt` satt). */
  saved: boolean;
  /** Server Action bundet til oppskriften; ok eller en norsk melding. */
  onSave: () => Promise<ActionResult>;
  /** Server Action bundet til oppskriften; ved suksess sendes brukeren videre (redirect). */
  onDelete: () => Promise<ActionResult | void>;
  /** Mappene å velge mellom i «Lagre i mappe» (Story 3.3). */
  folders: Folder[];
  /** Mappen oppskriften ligger i, eller `null`. */
  folderId: number | null;
  /** Server Action bundet til oppskriften: legger den i en mappe, eller tar den ut med `null`. */
  onMoveToFolder: (
    folderId: number | null,
  ) => Promise<FolderActionResult<{ folderName: string | null }>>;
  /** Server Action bundet til oppskriften: oppretter en mappe og legger oppskriften i den. */
  onMoveToNewFolder: (name: string) => Promise<FolderActionResult<{ folderName: string }>>;
};

function messageOf(error: unknown): string {
  console.error("Handlingen feilet", error);
  return `${fallbackMessage.title} ${fallbackMessage.body}`;
}

/**
 * Lagre-linjen nederst på oppskriftssiden (Story 3.2, UX-DR9, UX-DR12, UX-DR13):
 * «Lagre» når oppskriften ikke er i samlingen, ellers «Slett» med bekreftelsesdialog.
 * Meldingsområdet (`role="status"`) står alltid i DOM, slik at skjermleseren leser opp
 * teksten når den kommer: «Lagret.» i 3 sekunder, en feilmelding til neste forsøk.
 * For en lagret oppskrift står mappeknappen ved siden av «Slett» (Story 3.3): den viser
 * mappenavnet, eller «Lagre i mappe», og åpner dialogen «Lagre i mappe». Etter et vellykket
 * valg lukkes dialogen, fokus går til mappeknappen, og statusområdet sier «Lagret i <navn>.»
 * eller «Fjernet fra mappen.». Hjerte kommer i samme linje i Story 3.4.
 */
export default function RecipeActions({
  title,
  saved,
  onSave,
  onDelete,
  folders,
  folderId,
  onMoveToFolder,
  onMoveToNewFolder,
}: Props) {
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [folderOpen, setFolderOpen] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveButton = useRef<HTMLButtonElement>(null);
  const deleteButton = useRef<HTMLButtonElement>(null);
  const folderButton = useRef<HTMLButtonElement>(null);
  // Knappen byttes ut etter lagring og deaktiveres under lagring; begge fjerner fokus.
  // Derfor husker vi hvor fokus skal tilbake: «Slett» etter lagring, «Lagre» ved feil.
  const restoreFocus = useRef<"save" | "delete" | null>(null);

  // En skjult side (Activity) beholder tilstanden; lukk dialogene når siden skjules, slik at de
  // ikke dukker opp som ikke-modal ved retur (docs: preserving-ui-state).
  useLayoutEffect(
    () => () => {
      setConfirmOpen(false);
      setFolderOpen(false);
    },
    [],
  );

  useEffect(() => {
    if (restoreFocus.current === "delete" && saved && deleteButton.current) {
      deleteButton.current.focus();
      restoreFocus.current = null;
    } else if (restoreFocus.current === "save" && !saving && saveButton.current) {
      saveButton.current.focus();
      restoreFocus.current = null;
    }
  }, [saved, saving]);

  function clearTimer() {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  /** Viser en melding i statusområdet i 3 sekunder; en ny melding erstatter den forrige. */
  function flash(text: string) {
    clearTimer();
    setMessage(text);
    timer.current = setTimeout(() => {
      timer.current = null;
      setMessage("");
    }, SAVED_MESSAGE_MS);
  }

  async function save() {
    clearTimer();
    setMessage("");
    const hadFocus = document.activeElement === saveButton.current;
    setSaving(true);
    try {
      const result = await onSave();
      if (result.ok) {
        if (hadFocus) restoreFocus.current = "delete";
        flash(recipeActionMessages.saved);
      } else {
        if (hadFocus) restoreFocus.current = "save";
        setMessage(result.message);
      }
    } catch (error) {
      if (hadFocus) restoreFocus.current = "save";
      setMessage(messageOf(error));
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      const result = await onDelete();
      // Ved suksess redirecter handlingen; en `ok: false` betyr at oppskriften står igjen.
      if (result && !result.ok) {
        setConfirmOpen(false);
        setMessage(result.message);
      }
    } catch (error) {
      setConfirmOpen(false);
      setMessage(messageOf(error));
    } finally {
      setDeleting(false);
    }
  }

  const folderName = folders.find((folder) => folder.id === folderId)?.name ?? null;

  return (
    <div className={styles.root}>
      <div className={styles.actions}>
        {saved ? (
          <>
            <button
              ref={folderButton}
              type="button"
              className={styles.secondary}
              aria-haspopup="dialog"
              aria-label={
                folderName === null
                  ? undefined
                  : `${folderName}, ${recipeActionMessages.changeFolderSuffix}`
              }
              onClick={(event) => {
                // Safari fokuserer ikke knapper ved klikk; fokus skal kunne gå tilbake hit.
                event.currentTarget.focus();
                clearTimer();
                setMessage("");
                setFolderOpen(true);
              }}
            >
              {folderName ?? recipeActionMessages.chooseFolder}
            </button>
            <button
              ref={deleteButton}
              type="button"
              className={styles.secondary}
              aria-label={`${recipeActionMessages.delete} ${title}`}
              onClick={(event) => {
                // Safari fokuserer ikke knapper ved klikk; fokus skal kunne gå tilbake hit.
                event.currentTarget.focus();
                setMessage("");
                setConfirmOpen(true);
              }}
            >
              {recipeActionMessages.delete}
            </button>
          </>
        ) : (
          <button
            ref={saveButton}
            type="button"
            className={styles.primary}
            disabled={saving}
            onClick={(event) => {
              // Safari fokuserer ikke knapper ved klikk; vi må vite om fokus lå her.
              event.currentTarget.focus();
              void save();
            }}
          >
            {saving ? recipeActionMessages.saving : recipeActionMessages.save}
          </button>
        )}
        <p role="status" className={styles.message}>
          {message}
        </p>
      </div>

      <FolderDialog
        open={folderOpen}
        folders={folders}
        currentFolderId={folderId}
        onMove={onMoveToFolder}
        onMoveToNew={onMoveToNewFolder}
        onSaved={(name) => {
          setFolderOpen(false);
          flash(
            name === null
              ? recipeActionMessages.folderRemoved
              : `${recipeActionMessages.folderSavedPrefix}${name}${recipeActionMessages.folderSavedSuffix}`,
          );
        }}
        onError={(text) => {
          setFolderOpen(false);
          setMessage(text);
        }}
        onCancel={() => setFolderOpen(false)}
      />

      <ConfirmDialog
        open={confirmOpen}
        title={deleteDialogMessages.title}
        description={`«${title}» ${deleteDialogMessages.descriptionAfterTitle}`}
        confirmLabel={deleteDialogMessages.confirm}
        cancelLabel={deleteDialogMessages.cancel}
        pending={deleting}
        onConfirm={confirmDelete}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
