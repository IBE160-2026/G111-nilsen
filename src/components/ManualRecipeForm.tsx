"use client";

import Link from "next/link";
import { useActionState, useEffect, useId, useRef } from "react";
import {
  MANUAL_RECIPE_FIELDS,
  type ManualRecipeField,
  type ManualRecipeFormState,
  type ManualRecipeValues,
} from "@/app/_shared/form-fields";
import { editRecipeMessages } from "@/lib/messages";
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
 * Ved feil flyttes fokus til første felt med feil (UX-DR16, UX-DR17). Redigering
 * gjenbruker skjemaet med startverdier, egen knappetekst og en «Avbryt»-lenke.
 */
export default function ManualRecipeForm({
  action,
  initialValues,
  submitLabel = "Lagre oppskrift",
  cancelHref,
}: {
  action: FormAction;
  initialValues?: ManualRecipeValues;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction, pending] = useActionState(
    action,
    initialValues
      ? { ...initialManualRecipeState, values: initialValues }
      : initialManualRecipeState,
  );
  const formRef = useRef<HTMLFormElement>(null);
  // Unike id-er: forrige side kan ligge skjult i DOM-en (Activity) med samme skjema (issue 010).
  const uid = useId();
  const idOf = (field: ManualRecipeField) => `${uid}-${field}`;
  const formErrorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const first = MANUAL_RECIPE_FIELDS.find((field) => state.fieldErrors[field]);
    const element = first ? formRef.current?.elements.namedItem(first) : null;
    if (element instanceof HTMLElement) element.focus();
    else if (state.formError) formErrorRef.current?.focus();
  }, [state]);

  const describedBy = (field: ManualRecipeField, hint?: boolean) =>
    [hint ? `${idOf(field)}-hint` : null, state.fieldErrors[field] ? `${idOf(field)}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;

  const error = (field: ManualRecipeField) =>
    state.fieldErrors[field] ? (
      <p id={`${idOf(field)}-error`} className={styles.error}>
        {state.fieldErrors[field]}
      </p>
    ) : null;

  const fieldProps = (field: ManualRecipeField, hint?: boolean) => ({
    id: idOf(field),
    name: field,
    defaultValue: state.values[field],
    "aria-invalid": state.fieldErrors[field] ? true : undefined,
    "aria-describedby": describedBy(field, hint),
  });

  return (
    <form ref={formRef} action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor={idOf("title")} className={styles.label}>
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
        <label htmlFor={idOf("servings")} className={styles.label}>
          Antall personer
        </label>
        <p id={`${idOf("servings")}-hint`} className={styles.hint}>
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
        <label htmlFor={idOf("ingredients")} className={styles.label}>
          Ingredienser
        </label>
        <p id={`${idOf("ingredients")}-hint`} className={styles.hint}>
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
        <label htmlFor={idOf("steps")} className={styles.label}>
          Steg (valgfritt)
        </label>
        <p id={`${idOf("steps")}-hint`} className={styles.hint}>
          Ett steg per linje. Stegene nummereres automatisk.
        </p>
        <textarea rows={8} className={styles.textarea} {...fieldProps("steps", true)} />
        {error("steps")}
      </div>

      {/* Live-regionen står alltid i DOM-en, så skjermlesere fanger opp nye meldinger. */}
      <div ref={formErrorRef} aria-live="polite" tabIndex={-1} className={styles.formError}>
        {state.formError ? <p className={styles.error}>{state.formError}</p> : null}
      </div>

      <div className={styles.actions}>
        <button type="submit" className={styles.submit} disabled={pending}>
          {submitLabel}
        </button>
        {cancelHref ? (
          <Link
            href={cancelHref}
            className={styles.cancel}
            aria-disabled={pending ? "true" : undefined}
            tabIndex={pending ? -1 : undefined}
            onClick={(event) => {
              // Under lagring skal «Avbryt» ikke kunne navigere bort fra en pågående lagring.
              if (pending) event.preventDefault();
            }}
          >
            {editRecipeMessages.cancel}
          </Link>
        ) : null}
      </div>
    </form>
  );
}
