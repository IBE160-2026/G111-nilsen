"use client";

import { useEffect, useId, useRef } from "react";
import styles from "./ConfirmDialog.module.css";

type Props = {
  /** Eieren styrer om dialogen er åpen; Escape og «Avbryt» kaller bare `onCancel`. */
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  /** Mens handlingen pågår, er bekreftelsesknappen deaktivert. */
  pending?: boolean;
};

/**
 * Bekreftelsesdialog (UX-DR13) på `<dialog>` med `showModal()`: nettleseren gir
 * fokusfelle, Escape og `aria-modal`. Startfokus på «Avbryt» (den trygge handlingen), og
 * fokus går tilbake til knappen som åpnet dialogen. Trykk på bakgrunnen gjør ingenting.
 * Brukes for «Slette oppskriften?» (Story 3.2) og «Slette mappen?» (Story 3.3).
 */
export default function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
  pending = false,
}: Props) {
  const id = useId();
  const titleId = `${id}-tittel`;
  const descriptionId = `${id}-tekst`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const active = document.activeElement;
      triggerRef.current = active instanceof HTMLElement ? active : null;
      dialog.showModal();
      cancelRef.current?.focus();
    } else if (!open && dialog.open) {
      dialog.close();
      triggerRef.current?.focus();
      triggerRef.current = null;
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className={styles.dialog}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      // Escape: eieren bestemmer. Standardhandlingen (lukke selv) stoppes, så `open` og
      // dialogen ikke kommer ut av takt.
      onCancel={(event) => {
        event.preventDefault();
        onCancel();
      }}
      // Lukkes dialogen likevel (for eksempel av nettleseren) mens eieren har den åpen, tolkes det som «Avbryt».
      onClose={() => {
        if (open) onCancel();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      <p id={descriptionId} className={styles.description}>
        {description}
      </p>
      <div className={styles.actions}>
        <button type="button" ref={cancelRef} className={styles.cancel} onClick={onCancel}>
          {cancelLabel}
        </button>
        <button type="button" className={styles.confirm} disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </dialog>
  );
}
