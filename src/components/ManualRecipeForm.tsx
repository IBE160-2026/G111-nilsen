"use client";

import { useActionState, useEffect, useRef } from "react";
import type { ManualRecipeFormState } from "@/app/ny/actions";
import { MANUAL_RECIPE_FIELDS, type ManualRecipeField } from "@/app/ny/form-fields";
import styles from "./ManualRecipeForm.module.css";

type FormAction = (
  state: ManualRecipeFormState,
  formData: FormData,
) => ManualRecipeFormState | Promise<ManualRecipeFormState>;

export const initialManualRecipeState: ManualRecipeFormState = {
  fieldErrors: {},
  values: { title: "", servings: "", ingredients: "", steps: "" },
};

/**
 * Skjemaet «Legg inn selv». Feltene er ukontrollerte med `defaultValue` fra
 * action-tilstanden, så skrevne verdier beholdes når serveren svarer med feil.
 * Ved feil flyttes fokus til første felt med feil (UX-DR16, UX-DR17).
 */
export default function ManualRecipeForm({ action }: { action: FormAction }) {
  const [state, formAction, pending] = useActionState(action, initialManualRecipeState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const first = MANUAL_RECIPE_FIELDS.find((field) => state.fieldErrors[field]);
    const element = first ? formRef.current?.elements.namedItem(first) : null;
    if (element instanceof HTMLElement) element.focus();
  }, [state]);

  const describedBy = (field: ManualRecipeField, hint?: boolean) =>
    [hint ? `${field}-hint` : null, state.fieldErrors[field] ? `${field}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const error = (field: ManualRecipeField) =>
    state.fieldErrors[field] ? (
      <p id={`${field}-error`} className={styles.error}>
        {state.fieldErrors[field]}
      </p>
    ) : null;

  const fieldProps = (field: ManualRecipeField, hint?: boolean) => ({
    id: field,
    name: field,
    defaultValue: state.values[field],
    "aria-invalid": state.fieldErrors[field] ? true : undefined,
    "aria-describedby": describedBy(field, hint),
  });

  return (
    <form ref={formRef} action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor="title" className={styles.label}>
          Tittel
        </label>
        <input
          type="text"
          autoComplete="off"
          className={styles.input}
          aria-required="true"
          {...fieldProps("title")}
        />
        {error("title")}
      </div>

      <div className={styles.field}>
        <label htmlFor="servings" className={styles.label}>
          Antall personer
        </label>
        <p id="servings-hint" className={styles.hint}>
          Hvor mange oppskriften er til, et helt tall fra 1 til 50.
        </p>
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          className={`${styles.input} ${styles.servings}`}
          aria-required="true"
          {...fieldProps("servings", true)}
        />
        {error("servings")}
      </div>

      <div className={styles.field}>
        <label htmlFor="ingredients" className={styles.label}>
          Ingredienser
        </label>
        <p id="ingredients-hint" className={styles.hint}>
          Én ingrediens per linje, for eksempel «400 g mel» eller «2 egg».
        </p>
        <textarea
          rows={8}
          className={styles.textarea}
          aria-required="true"
          {...fieldProps("ingredients", true)}
        />
        {error("ingredients")}
      </div>

      <div className={styles.field}>
        <label htmlFor="steps" className={styles.label}>
          Steg (valgfritt)
        </label>
        <p id="steps-hint" className={styles.hint}>
          Ett steg per linje. Stegene nummereres automatisk.
        </p>
        <textarea rows={8} className={styles.textarea} {...fieldProps("steps", true)} />
        {error("steps")}
      </div>

      <div aria-live="polite" className={styles.formError}>
        {state.formError ? <p className={styles.error}>{state.formError}</p> : null}
      </div>

      <div>
        <button type="submit" className={styles.submit} disabled={pending}>
          Lagre oppskrift
        </button>
      </div>
    </form>
  );
}
