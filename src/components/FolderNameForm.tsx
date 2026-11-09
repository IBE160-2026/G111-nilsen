"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import type { FolderActionResult } from "@/app/_shared/action-result";
import { fallbackMessage } from "@/lib/messages";
import styles from "./FolderNameForm.module.css";

type Props = {
  label: string;
  /** Tekst som forklarer feltet (valgfri); kobles til feltet med `aria-describedby`. */
  hint?: string;
  initialName?: string;
  submitLabel: string;
  /** Teksten mens handlingen pågår. */
  pendingLabel: string;
  /** Tilgjengelig navn på knappene når den synlige teksten trenger mappenavnet (valgfritt). */
  submitAriaLabel?: string;
  /** Hvis satt, vises «Avbryt», og Escape i feltet avbryter. */
  cancel?: { label: string; ariaLabel?: string; onCancel: () => void };
  /** Tømmer feltet etter en vellykket handling (ny mappe). */
  clearOnSuccess?: boolean;
  /** Flytter fokus til feltet når skjemaet monteres. */
  autoFocus?: boolean;
  onSubmit: (name: string) => Promise<FolderActionResult>;
  onSuccess?: () => void;
};

/**
 * Navnefeltet for en mappe (Story 3.3): brukes for «Ny mappe» og «Gi nytt navn». Feil vises
 * under feltet, koblet med `aria-describedby` og `aria-invalid`, og fokus går til feltet.
 * Både feil fra tjenesten (tomt, for langt, opptatt navn) og generelle feil vises der.
 */
export default function FolderNameForm({
  label,
  hint,
  initialName = "",
  submitLabel,
  pendingLabel,
  submitAriaLabel,
  cancel,
  clearOnSuccess = false,
  autoFocus = false,
  onSubmit,
  onSuccess,
}: Props) {
  const id = useId();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  // Telles opp ved feil, slik at fokus flyttes til feltet også når feilen er den samme som sist.
  const [errorCount, setErrorCount] = useState(0);

  useEffect(() => {
    if (autoFocus) input.current?.focus();
  }, [autoFocus]);

  useEffect(() => {
    if (errorCount > 0) input.current?.focus();
  }, [errorCount]);

  const [focusAfterSuccess, setFocusAfterSuccess] = useState(0);
  useEffect(() => {
    if (focusAfterSuccess > 0) input.current?.focus();
  }, [focusAfterSuccess]);

  const hintId = `${id}-hint`;
  const errorId = `${id}-feil`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const result = await onSubmit(name);
      if (result.ok) {
        setError("");
        if (clearOnSuccess) {
          setName("");
          // Knappen er deaktivert under lagring og mister fokus; la skrivingen fortsette i feltet.
          setFocusAfterSuccess((n) => n + 1);
        }
        onSuccess?.();
      } else {
        setError(result.message);
        setErrorCount((n) => n + 1);
      }
    } catch (caught) {
      console.error("Mappehandlingen feilet", caught);
      setError(`${fallbackMessage.title} ${fallbackMessage.body}`);
      setErrorCount((n) => n + 1);
    } finally {
      setPending(false);
    }
  }

  function onKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape" && cancel) {
      event.preventDefault();
      cancel.onCancel();
    }
  }

  return (
    <form onSubmit={submit} onKeyDown={onKeyDown} noValidate className={styles.form}>
      <div className={styles.field}>
        <label htmlFor={`${id}-navn`} className={styles.label}>
          {label}
        </label>
        {hint ? (
          <p id={hintId} className={styles.hint}>
            {hint}
          </p>
        ) : null}
        <input
          ref={input}
          id={`${id}-navn`}
          type="text"
          autoComplete="off"
          className={styles.input}
          value={name}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            [hint ? hintId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined
          }
          onChange={(event) => {
            setName(event.target.value);
            setError("");
          }}
        />
        {error ? (
          <p id={errorId} className={styles.error}>
            {error}
          </p>
        ) : null}
      </div>
      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submit}
          disabled={pending}
          aria-label={pending ? undefined : submitAriaLabel}
        >
          {pending ? pendingLabel : submitLabel}
        </button>
        {cancel ? (
          <button
            type="button"
            className={styles.cancel}
            aria-label={cancel.ariaLabel}
            disabled={pending}
            onClick={cancel.onCancel}
          >
            {cancel.label}
          </button>
        ) : null}
      </div>
    </form>
  );
}
