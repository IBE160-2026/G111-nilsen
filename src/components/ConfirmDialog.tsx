"use client";

import { useRef } from "react";
import Dialog, { DialogActions, DialogButton } from "./Dialog";

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
 * Bekreftelsesdialog (UX-DR13) på den felles `Dialog`: startfokus på «Avbryt» (den trygge
 * handlingen), Escape og lukking utenfra tolkes som «Avbryt», og fokus går tilbake til
 * knappen som åpnet dialogen. Brukes for «Slette oppskriften?» (Story 3.2) og «Slette
 * mappen?» (Story 3.3).
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
  const cancelRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open={open}
      title={title}
      description={description}
      onCancel={onCancel}
      getInitialFocus={() => cancelRef.current}
    >
      <DialogActions>
        <DialogButton variant="secondary" ref={cancelRef} onClick={onCancel}>
          {cancelLabel}
        </DialogButton>
        <DialogButton variant="primary" disabled={pending} onClick={onConfirm}>
          {confirmLabel}
        </DialogButton>
      </DialogActions>
    </Dialog>
  );
}
