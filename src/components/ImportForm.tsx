"use client";

import Link from "next/link";
import {
  useActionState,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { initialImportState, type ImportFormState } from "@/app/_shared/import-form";
import { importMessages } from "@/lib/messages";
import ErrorMessage from "./ErrorMessage";
import styles from "./ImportForm.module.css";

type ImportAction = (state: ImportFormState, formData: FormData) => Promise<ImportFormState>;

function ImportFormInner({ action }: { action: ImportAction }) {
  const [state, formAction, pending] = useActionState(action, initialImportState);
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  // Hindrer to hentinger ved dobbeltklikk, også før React har tegnet «pending».
  const submitting = useRef(false);

  // Fokus i lenkefeltet når siden åpnes (UX: lenkefeltet fokuseres automatisk).
  useEffect(() => {
    input.current?.focus();
  }, []);

  // Etter en feil blir fokus i feltet (knappen mister det mens den er deaktivert).
  useEffect(() => {
    if (state.attempt > 0 && state.error) input.current?.focus();
  }, [state]);

  useEffect(() => {
    if (!pending) submitting.current = false;
  }, [pending]);

  function onSubmit(event: FormEvent) {
    if (pending || submitting.current) {
      event.preventDefault();
      return;
    }
    submitting.current = true;
  }

  const hintId = `${id}-hint`;
  const errorId = `${id}-feil`;
  const error = pending ? undefined : state.error;

  return (
    <form action={formAction} onSubmit={onSubmit} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor={`${id}-url`} className={styles.label}>
          {importMessages.label}
        </label>
        <p id={hintId} className={styles.hint}>
          {importMessages.hint}
        </p>
        <input
          ref={input}
          id={`${id}-url`}
          name="url"
          type="text"
          inputMode="url"
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          className={styles.input}
          defaultValue={state.url}
          readOnly={pending}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${hintId} ${errorId}` : hintId}
        />
        {error ? (
          <ErrorMessage id={errorId} title={error.title} body={error.body}>
            {error.kind === "duplicate" && error.recipeId !== undefined ? (
              <Link href={`/oppskrift/${error.recipeId}`} className={styles.primaryLink}>
                {importMessages.openRecipe}
              </Link>
            ) : (
              <Link href="/ny" className={styles.secondaryLink}>
                {importMessages.enterManually}
              </Link>
            )}
          </ErrorMessage>
        ) : null}
      </div>

      <div className={styles.actions}>
        <button
          type="submit"
          className={styles.submit}
          aria-disabled={pending ? true : undefined}
          onClick={(event) => {
            if (pending) event.preventDefault();
          }}
        >
          {pending ? importMessages.pending : importMessages.submit}
        </button>
      </div>

      {/* Står alltid i DOM-en, så skjermleseren leser opp teksten når den kommer. */}
      <p role="status" className="visually-hidden">
        {pending ? importMessages.pending : ""}
      </p>
    </form>
  );
}

/**
 * Importer-skjemaet (Story 2.2): lenkefelt, «Hent oppskrift» og feilvisning. Skjemaet bruker en
 * Server Action som `action`, så det virker også uten JavaScript. Med Cache Components skjuler
 * Next.js siden med `<Activity>` når man navigerer bort, og tilstanden blir stående. Opprydningen
 * i `useLayoutEffect` kjører da, og en ny `key` gir et nytt, tomt skjema ved retur.
 */
export default function ImportForm({ action }: { action: ImportAction }) {
  const [generation, setGeneration] = useState(0);
  useLayoutEffect(() => {
    return () => setGeneration((n) => n + 1);
  }, []);
  return <ImportFormInner key={generation} action={action} />;
}
