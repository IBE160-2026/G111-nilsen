"use client";

import { useActionState, useEffect, useId, useRef, type ReactNode } from "react";
import { EMPTY_ACCOUNT_FORM, type AccountFormState } from "@/app/_shared/account-form";
import { accountMessages as m } from "@/lib/messages";
import styles from "./ManualRecipeForm.module.css";

type Props = {
  mode: "login" | "register";
  action: (state: AccountFormState, formData: FormData) => Promise<AccountFormState>;
  /**
   * Det som avhenger av adressen (skjult «neste»-felt og lenken til den andre siden), se
   * `AccountFormExtras`. Kan strømmes inn, så skjemaet selv står i den ferdige siden.
   */
  extras: ReactNode;
};

/**
 * Skjemaene «Logg inn» og «Lag konto» (Story 5.13). E-posten beholdes ved feil, passordet ikke.
 * Feil står under feltet (eller over knappen for «feil e-post eller passord»), og fokus flyttes dit.
 */
export default function AccountForm({ mode, action, extras }: Props) {
  const [state, formAction, pending] = useActionState(action, EMPTY_ACCOUNT_FORM);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const register = mode === "register";
  // Unike id-er: forrige side kan ligge skjult i DOM-en (Activity), med sitt eget skjema.
  const uid = useId();
  const ids = {
    email: `${uid}-email`,
    emailError: `${uid}-email-error`,
    password: `${uid}-password`,
    passwordHint: `${uid}-password-hint`,
    passwordError: `${uid}-password-error`,
  };

  useEffect(() => {
    if (state.emailError) emailRef.current?.focus();
    else if (state.passwordError) passwordRef.current?.focus();
    else if (state.formError) formErrorRef.current?.focus();
  }, [state]);

  return (
    <form action={formAction} className={styles.form} noValidate>
      <div className={styles.field}>
        <label htmlFor={ids.email} className={styles.label}>
          {m.email}
        </label>
        <input
          ref={emailRef}
          id={ids.email}
          name="email"
          type="email"
          autoComplete="email"
          className={styles.input}
          defaultValue={state.email}
          key={`email-${state.email}`}
          aria-required="true"
          aria-invalid={state.emailError ? true : undefined}
          aria-describedby={state.emailError ? ids.emailError : undefined}
        />
        {state.emailError ? (
          <p id={ids.emailError} className={styles.error}>
            {state.emailError}
          </p>
        ) : null}
      </div>

      <div className={styles.field}>
        <label htmlFor={ids.password} className={styles.label}>
          {m.password}
        </label>
        {register ? (
          <p id={ids.passwordHint} className={styles.hint}>
            {m.passwordHint}
          </p>
        ) : null}
        <input
          ref={passwordRef}
          id={ids.password}
          name="password"
          type="password"
          autoComplete={register ? "new-password" : "current-password"}
          className={styles.input}
          aria-required="true"
          aria-invalid={state.passwordError ? true : undefined}
          aria-describedby={
            [register ? ids.passwordHint : null, state.passwordError ? ids.passwordError : null]
              .filter(Boolean)
              .join(" ") || undefined
          }
        />
        {state.passwordError ? (
          <p id={ids.passwordError} className={styles.error}>
            {state.passwordError}
          </p>
        ) : null}
      </div>

      <div ref={formErrorRef} aria-live="polite" tabIndex={-1} className={styles.formError}>
        {state.formError ? <p className={styles.error}>{state.formError}</p> : null}
      </div>

      <button type="submit" className={styles.submit} disabled={pending}>
        {pending
          ? register
            ? m.registerPending
            : m.loginPending
          : register
            ? m.register
            : m.login}
      </button>

      {extras}
    </form>
  );
}
