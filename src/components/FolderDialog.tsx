"use client";

import { Fragment, useEffect, useId, useRef, useState, type FormEvent } from "react";
import type { FolderActionResult } from "@/app/_shared/action-result";
import type { Folder } from "@/domain";
import { fallbackMessage, folderDialogMessages as m } from "@/lib/messages";
import Dialog, { DialogActions, DialogButton } from "./Dialog";
import styles from "./FolderDialog.module.css";

type Props = {
  open: boolean;
  /** Mappene å velge mellom, i den rekkefølgen de vises. */
  folders: Folder[];
  /** Mappen oppskriften ligger i nå, eller `null`. Den er forhåndsvalgt. */
  currentFolderId: number | null;
  /** Legger oppskriften i en mappe, eller tar den ut av mappen med `null`. */
  onMove: (folderId: number | null) => Promise<FolderActionResult<{ folderName: string | null }>>;
  /** Oppretter en mappe og legger oppskriften i den. */
  onMoveToNew: (name: string) => Promise<FolderActionResult<{ folderName: string }>>;
  /** Vellykket valg som endret noe; `folderName` er `null` når oppskriften ble tatt ut av mappen. */
  onSaved: (folderName: string | null) => void;
  /** Feil som ikke hører til navnefeltet; eieren lukker dialogen og viser meldingen. */
  onError: (message: string) => void;
  /** «Avbryt», Escape, og valg av mappen oppskriften allerede ligger i (ingenting endres). */
  onCancel: () => void;
};

type Choice = "none" | "new" | number;

/**
 * «Lagre i mappe» (Story 3.3, UX-DR13): en radiogruppe med «Ingen mappe», hver mappe og
 * «Ny mappe» (som viser et navnefelt), bygget på den felles `Dialog`. Startfokus er det valgte
 * alternativet. Feil i navnet vises under feltet, og dialogen blir åpen. Innholdet monteres
 * bare mens dialogen er åpen, så valget starter på nytt ved hver åpning.
 */
export default function FolderDialog(props: Props) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <Dialog
      open={props.open}
      title={m.title}
      onCancel={props.onCancel}
      getInitialFocus={() =>
        formRef.current?.querySelector<HTMLElement>("input[type=radio]:checked")
      }
    >
      {props.open ? <FolderForm {...props} formRef={formRef} /> : null}
    </Dialog>
  );
}

function FolderForm({
  folders,
  currentFolderId,
  onMove,
  onMoveToNew,
  onSaved,
  onError,
  onCancel,
  formRef,
}: Props & { formRef: React.RefObject<HTMLFormElement | null> }) {
  const id = useId();
  const [choice, setChoice] = useState<Choice>(currentFolderId ?? "none");
  const [name, setName] = useState("");
  const [nameError, setNameError] = useState("");
  const [pending, setPending] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  // Fokus skal til navnefeltet når «Ny mappe» velges og ved feil; feltet finnes først etter rendering.
  const [focusName, setFocusName] = useState(0);

  useEffect(() => {
    if (focusName > 0) nameRef.current?.focus();
  }, [focusName]);

  const errorId = `${id}-feil`;

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (pending) return;

    if (choice === (currentFolderId ?? "none")) {
      onCancel();
      return;
    }

    setPending(true);
    try {
      const result =
        choice === "new"
          ? await onMoveToNew(name)
          : await onMove(choice === "none" ? null : choice);
      if (result.ok) {
        onSaved(result.folderName);
      } else if (result.field === "name" && choice === "new") {
        setNameError(result.message);
        setFocusName((n) => n + 1);
      } else {
        onError(result.message);
      }
    } catch (error) {
      console.error("Kunne ikke lagre mappevalget", error);
      onError(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setPending(false);
    }
  }

  const radio = (value: Choice, label: string) => (
    <label className={styles.option}>
      <input
        type="radio"
        name={`${id}-mappe`}
        className={styles.radio}
        checked={choice === value}
        onChange={() => {
          setChoice(value);
          setNameError("");
          if (value === "new") setFocusName((n) => n + 1);
        }}
      />
      <span className={styles.optionLabel}>{label}</span>
    </label>
  );

  return (
    <form ref={formRef} onSubmit={submit} noValidate className={styles.form}>
      <fieldset className={styles.group}>
        <legend className={styles.legend}>{m.legend}</legend>
        {radio("none", m.noFolder)}
        {folders.map((folder) => (
          <Fragment key={folder.id}>{radio(folder.id, folder.name)}</Fragment>
        ))}
        {radio("new", m.newFolder)}
        {choice === "new" ? (
          <div className={styles.field}>
            <label htmlFor={`${id}-navn`} className={styles.fieldLabel}>
              {m.newFolderLabel}
            </label>
            <input
              ref={nameRef}
              id={`${id}-navn`}
              type="text"
              autoComplete="off"
              className={styles.input}
              value={name}
              aria-invalid={nameError ? true : undefined}
              aria-describedby={nameError ? errorId : undefined}
              onChange={(event) => {
                setName(event.target.value);
                setNameError("");
              }}
            />
            {nameError ? (
              <p id={errorId} className={styles.error}>
                {nameError}
              </p>
            ) : null}
          </div>
        ) : null}
      </fieldset>

      <DialogActions>
        <DialogButton variant="secondary" onClick={onCancel}>
          {m.cancel}
        </DialogButton>
        <DialogButton variant="primary" type="submit" disabled={pending}>
          {m.save}
        </DialogButton>
      </DialogActions>
    </form>
  );
}
