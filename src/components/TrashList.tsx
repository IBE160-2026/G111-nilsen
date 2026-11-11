"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, trashMessages as m } from "@/lib/messages";
import ConfirmDialog from "./ConfirmDialog";
import EmptyState from "./EmptyState";
import styles from "./TrashList.module.css";

export type TrashItem = {
  id: number;
  title: string;
  /** Ferdig formaterte tekster («Slettet 11. november», «Borte for godt om 6 dager»). */
  deletedLabel: string;
  expiresLabel: string;
};

type Props = {
  items: readonly TrashItem[];
  /** Henter tilbake; sender brukeren videre ved suksess og returnerer bare ved feil. */
  onRestore: (id: number) => Promise<ActionResult | void>;
  onDeleteForGood: (id: number) => Promise<ActionResult>;
};

/**
 * Listen på «Nylig slettet» (Story 6.11): hver oppskrift med «Hent tilbake» og «Slett for godt»
 * (med bekreftelse). En oppskrift som slettes for godt forsvinner fra listen med en melding. Listen
 * og den tomme tilstanden er samme komponent, så meldingen står igjen når den siste er borte.
 */
export default function TrashList({ items: initial, onRestore, onDeleteForGood }: Props) {
  const [items, setItems] = useState(initial);
  // Følger listen fra serveren når den endres (en side som har vært skjult beholder ellers
  // en gammel liste, med oppskrifter som allerede er hentet tilbake), uten å miste meldingen.
  const signature = JSON.stringify(initial);
  const [seen, setSeen] = useState(signature);
  if (signature !== seen) {
    setSeen(signature);
    setItems(initial);
  }
  const [busy, setBusy] = useState<number | null>(null);
  const [confirming, setConfirming] = useState<TrashItem | null>(null);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");

  async function restore(item: TrashItem) {
    if (busy !== null) return;
    setBusy(item.id);
    setError("");
    setStatus("");
    try {
      const result = await onRestore(item.id);
      if (result && !result.ok) {
        setError(result.message);
        setBusy(null);
      }
    } catch (caught) {
      console.error("Kunne ikke hente tilbake oppskriften", caught);
      setError(`${fallbackMessage.title} ${fallbackMessage.body}`);
      setBusy(null);
    }
  }

  async function deleteForGood(item: TrashItem) {
    setBusy(item.id);
    setError("");
    try {
      const result = await onDeleteForGood(item.id);
      if (!result.ok) {
        setError(result.message);
        return;
      }
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setStatus(m.deletedForGood(item.title));
    } catch (caught) {
      console.error("Kunne ikke slette oppskriften for godt", caught);
      setError(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setBusy(null);
      setConfirming(null);
    }
  }

  return (
    <div className={styles.root}>
      {items.length > 0 ? <p className={styles.lead}>{m.lead}</p> : null}
      {items.length > 0 ? (
        <ul role="list" className={styles.list}>
          {items.map((item) => (
            <li key={item.id} className={styles.item}>
              <div className={styles.text}>
                <h2 className={styles.title}>{item.title}</h2>
                <p className={styles.meta}>
                  {item.deletedLabel} · {item.expiresLabel}
                </p>
              </div>
              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.restore}
                  aria-label={m.restoreFor(item.title)}
                  aria-disabled={busy !== null ? true : undefined}
                  onClick={() => void restore(item)}
                >
                  {busy === item.id ? m.restoring : m.restore}
                </button>
                <button
                  type="button"
                  className={styles.forGood}
                  aria-label={m.deleteForGoodFor(item.title)}
                  aria-disabled={busy !== null ? true : undefined}
                  onClick={() => busy === null && setConfirming(item)}
                >
                  {m.deleteForGood}
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      {items.length === 0 ? (
        <EmptyState
          title={m.emptyTitle}
          description={m.emptyDescription}
          action={{ href: "/oppskrifter", label: m.emptyAction }}
        />
      ) : null}
      {error !== "" ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
      <p role="status" aria-live="polite" className={styles.status}>
        {status}
      </p>
      <ConfirmDialog
        open={confirming !== null}
        title={m.confirmTitle}
        description={confirming ? `«${confirming.title}» ${m.confirmAfterTitle}` : ""}
        confirmLabel={m.confirmYes}
        cancelLabel={m.cancel}
        pending={busy !== null}
        onConfirm={() => confirming && void deleteForGood(confirming)}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}
