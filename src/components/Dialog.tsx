"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  type ComponentProps,
  type ReactNode,
} from "react";
import styles from "./Dialog.module.css";

type DialogProps = {
  /** Eieren styrer om dialogen er åpen; Escape kaller bare `onCancel`. */
  open: boolean;
  title: string;
  /** Valgfri forklaring under tittelen; kobles til dialogen med `aria-describedby`. */
  description?: string;
  /** Kalles ved Escape og når nettleseren lukker dialogen mens eieren har den åpen. */
  onCancel: () => void;
  /** Elementet som får startfokus når dialogen åpnes (kalles etter `showModal()`). */
  getInitialFocus: () => HTMLElement | null | undefined;
  children: ReactNode;
};

/**
 * Felles modal dialog (UX-DR13) på `<dialog>` med `showModal()`: nettleseren gir fokusfelle,
 * Escape og `aria-modal`. Eieren velger startfokus, og fokus går tilbake til elementet som
 * hadde det da dialogen åpnet. Trykk på bakgrunnen gjør ingenting. Brukes av `ConfirmDialog`
 * («Slette oppskriften?», «Slette mappen?») og `FolderDialog` («Lagre i mappe»).
 */
export default function Dialog({
  open,
  title,
  description,
  onCancel,
  getInitialFocus,
  children,
}: DialogProps) {
  const id = useId();
  const titleId = `${id}-tittel`;
  const descriptionId = `${id}-tekst`;
  const dialogRef = useRef<HTMLDialogElement>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  // Eieren sender gjerne en ny funksjon for hver rendering; effekten skal bare kjøre når `open` endres.
  const initialFocus = useRef(getInitialFocus);
  useLayoutEffect(() => {
    initialFocus.current = getInitialFocus;
  });

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) {
      const active = document.activeElement;
      triggerRef.current = active instanceof HTMLElement ? active : null;
      dialog.showModal();
      initialFocus.current()?.focus();
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
      aria-describedby={description === undefined ? undefined : descriptionId}
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
      {description === undefined ? null : (
        <p id={descriptionId} className={styles.description}>
          {description}
        </p>
      )}
      {children}
    </dialog>
  );
}

/** Raden med dialogens knapper, høyrejustert. */
export function DialogActions({ children }: { children: ReactNode }) {
  return <div className={styles.actions}>{children}</div>;
}

/**
 * Dialogknapp: `primary` er aksentfylt (bekreft), `secondary` har kantlinje (avbryt). Designet
 * bruker ikke rødt for tilstander.
 */
export function DialogButton({
  variant,
  ...props
}: { variant: "primary" | "secondary" } & Omit<ComponentProps<"button">, "className">) {
  return (
    <button
      type="button"
      {...props}
      className={`${styles.button} ${variant === "primary" ? styles.primary : styles.secondary}`}
    />
  );
}
