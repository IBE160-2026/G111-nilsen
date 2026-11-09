"use client";

import { useRef, useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, servingsDialogMessages as m } from "@/lib/messages";
import Dialog, { DialogActions, DialogButton } from "./Dialog";
import ServingStepper from "./ServingStepper";
import styles from "./ServingsDialog.module.css";

type Props = {
  open: boolean;
  /** Antallet som står valgt når dialogen åpnes (oppskriftens antall, ellers 4). */
  initial: number;
  /** Lagrer antallet; kalles bare med gyldige verdier (1–50). */
  onSave: (servings: number) => Promise<ActionResult>;
  /** Kalles etter vellykket lagring. */
  onSaved: (servings: number) => void;
  /** «Avbryt» og Escape. */
  onCancel: () => void;
};

/** Standardantall i dialogen når oppskriften ikke har noe. */
export const DEFAULT_SERVINGS = 4;

/**
 * «Hvor mange er oppskriften laget for?» (Story 2.4, UX-DR13) på den felles `Dialog`: fokusfelle,
 * Escape og tastaturbruk kommer derfra. Innholdet monteres bare mens dialogen er åpen, så valget
 * starter på nytt hver gang. Feil ved lagring vises i dialogen, som blir åpen.
 */
export default function ServingsDialog(props: Props) {
  const bodyRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog
      open={props.open}
      title={m.title}
      description={m.description}
      onCancel={props.onCancel}
      getInitialFocus={() => bodyRef.current?.querySelector<HTMLElement>("input")}
    >
      {props.open ? <ServingsForm {...props} bodyRef={bodyRef} /> : null}
    </Dialog>
  );
}

function ServingsForm({
  initial,
  onSave,
  onSaved,
  onCancel,
  bodyRef,
}: Props & { bodyRef: React.RefObject<HTMLDivElement | null> }) {
  const [value, setValue] = useState(initial);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await onSave(value);
      if (result.ok) onSaved(value);
      else setError(result.message);
    } catch (caught) {
      console.error("Kunne ikke lagre antallet", caught);
      setError(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <div ref={bodyRef} className={styles.body}>
      <ServingStepper bare value={value} onChange={setValue} original={initial} />
      {error ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <DialogActions>
        <DialogButton variant="secondary" onClick={onCancel}>
          {m.cancel}
        </DialogButton>
        <DialogButton variant="primary" aria-disabled={pending ? true : undefined} onClick={save}>
          {m.save}
        </DialogButton>
      </DialogActions>
    </div>
  );
}
