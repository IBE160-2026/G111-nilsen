"use client";

import { useId, useState } from "react";
import type { ManualRecipeFormState } from "@/app/_shared/form-fields";
import { parseRecipeText, type RecipeDraft } from "@/domain";
import { pasteMessages as m } from "@/lib/messages";
import ManualRecipeForm from "./ManualRecipeForm";
import styles from "./PasteRecipe.module.css";

type FormAction = (
  state: ManualRecipeFormState,
  formData: FormData,
) => ManualRecipeFormState | Promise<ManualRecipeFormState>;

/**
 * Lim inn tekst (Story 6.14): teksten tolkes i nettleseren til et utkast som fylles inn i det
 * vanlige skjemaet «Legg inn selv». Ingenting lagres før brukeren har sett over og trykket lagre.
 */
export default function PasteRecipe({ action }: { action: FormAction }) {
  const id = useId();
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<{ values: RecipeDraft; n: number } | null>(null);

  function makeDraft() {
    if (text.trim() === "") {
      setError(m.empty);
      return;
    }
    setError("");
    setDraft((previous) => ({ values: parseRecipeText(text), n: (previous?.n ?? 0) + 1 }));
  }

  return (
    <div className={styles.root}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          makeDraft();
        }}
      >
        <div className={styles.field}>
          <label htmlFor={`${id}-tekst`} className={styles.label}>
            {m.label}
          </label>
          <span id={`${id}-hint`} className={styles.hint}>
            {m.hint}
          </span>
          <textarea
            id={`${id}-tekst`}
            className={styles.input}
            rows={10}
            value={text}
            aria-invalid={error !== "" ? true : undefined}
            aria-describedby={error !== "" ? `${id}-hint ${id}-feil` : `${id}-hint`}
            onChange={(event) => setText(event.target.value)}
          />
          {error !== "" ? (
            <p id={`${id}-feil`} role="alert" className={styles.error}>
              {error}
            </p>
          ) : null}
        </div>
        <button type="submit" className={styles.submit}>
          {m.submit}
        </button>
      </form>

      {draft !== null ? (
        <section aria-labelledby={`${id}-utkast`} className={styles.draft}>
          <h2 id={`${id}-utkast`}>{m.draftHeading}</h2>
          <p>{m.draftLead}</p>
          {draft.values.title === "" ? <p role="status">{m.noTitle}</p> : null}
          {draft.values.ingredients === "" ? <p role="status">{m.noIngredients}</p> : null}
          <ManualRecipeForm
            key={draft.n}
            action={action}
            initialValues={draft.values}
            submitLabel={m.saveLabel}
          />
        </section>
      ) : null}
    </div>
  );
}
