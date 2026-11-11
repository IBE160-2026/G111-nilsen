"use client";

import Link from "next/link";
import { useActionState, useId } from "react";
import type { BackupImportState } from "@/app/sikkerhetskopi/actions";
import { backupMessages as m } from "@/lib/messages";
import styles from "./ImportBackupForm.module.css";

type Action = (state: BackupImportState, formData: FormData) => Promise<BackupImportState>;

/** Velger en sikkerhetskopi-fil og importerer den (Story 6.15). */
export default function ImportBackupForm({ action }: { action: Action }) {
  const id = useId();
  const [state, formAction, pending] = useActionState(action, { status: "idle" });
  return (
    <form action={formAction} className={styles.form}>
      <div className={styles.field}>
        <label htmlFor={`${id}-fil`} className={styles.label}>
          {m.fileLabel}
        </label>
        <input
          id={`${id}-fil`}
          name="file"
          type="file"
          accept="application/json,.json"
          className={styles.input}
          aria-describedby={state.status === "error" ? `${id}-feil` : undefined}
          aria-invalid={state.status === "error" ? true : undefined}
        />
      </div>
      <button type="submit" className={styles.submit} aria-disabled={pending ? true : undefined}>
        {pending ? m.importing : m.importButton}
      </button>
      <div role="status" aria-live="polite">
        {state.status === "ok" ? (
          <p className={styles.ok}>
            {state.message}{" "}
            <Link href="/oppskrifter" className={styles.link}>
              {m.openRecipes}
            </Link>
          </p>
        ) : null}
      </div>
      {state.status === "error" ? (
        <p id={`${id}-feil`} role="alert" className={styles.error}>
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
