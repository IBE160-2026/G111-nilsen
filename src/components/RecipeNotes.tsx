"use client";

import { useId, useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, notesMessages as m } from "@/lib/messages";
import styles from "./RecipeNotes.module.css";

type CookedResult =
  { ok: true; lastCookedAt: string; cookedCount: number } | { ok: false; message: string };

type Props = {
  notes: string | null;
  lastCookedAt: string | null;
  cookedCount: number;
  onSaveNotes: (notes: string) => Promise<ActionResult>;
  onCooked: () => Promise<CookedResult>;
};

/** Dato som «10. november 2026», alltid i norsk tid, så server og nettleser gir samme tekst. */
export function formatCookedDate(iso: string): string {
  return new Date(iso).toLocaleDateString("nb-NO", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Oslo",
  });
}

const fail = `${fallbackMessage.title} ${fallbackMessage.body}`;

/**
 * Notater og «sist laget» på en lagret oppskrift (Story 6.3). Notatene lagres med «Lagre notat»
 * (ikke ved hvert tastetrykk); «Laget i dag» setter dato og teller opp. Meldinger leses opp.
 */
export default function RecipeNotes({
  notes: initialNotes,
  lastCookedAt: initialCooked,
  cookedCount: initialCount,
  onSaveNotes,
  onCooked,
}: Props) {
  const id = useId();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [cooked, setCooked] = useState({ at: initialCooked, count: initialCount });
  const [pending, setPending] = useState<"notes" | "cooked" | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function save() {
    if (pending) return;
    setPending("notes");
    setStatus("");
    setError("");
    try {
      const result = await onSaveNotes(notes);
      if (result.ok) {
        setSavedNotes(notes.trim());
        setStatus(m.saved);
      } else setError(result.message);
    } catch (cause) {
      console.error("Kunne ikke lagre notatene", cause);
      setError(fail);
    } finally {
      setPending(null);
    }
  }

  async function markCooked() {
    if (pending) return;
    setPending("cooked");
    setStatus("");
    setError("");
    try {
      const result = await onCooked();
      if (result.ok) {
        setCooked({ at: result.lastCookedAt, count: result.cookedCount });
        setStatus(m.cookedDone);
      } else setError(result.message);
    } catch (cause) {
      console.error("Kunne ikke merke oppskriften som laget", cause);
      setError(fail);
    } finally {
      setPending(null);
    }
  }

  const unchanged = notes.trim() === savedNotes.trim();

  return (
    <section className={styles.card} aria-labelledby={`${id}-overskrift`}>
      <h2 id={`${id}-overskrift`}>{m.heading}</h2>

      <div className={styles.cooked}>
        <p className={styles.cookedText}>
          {cooked.at === null ? m.never : m.lastCooked(formatCookedDate(cooked.at), cooked.count)}
        </p>
        <button
          type="button"
          className={styles.secondary}
          aria-disabled={pending ? true : undefined}
          onClick={() => void markCooked()}
        >
          {pending === "cooked" ? m.cookedSaving : m.cooked}
        </button>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-notater`} className={styles.label}>
          {m.label}
        </label>
        <p id={`${id}-hint`} className={styles.hint}>
          {m.hint}
        </p>
        <textarea
          id={`${id}-notater`}
          rows={4}
          className={styles.textarea}
          value={notes}
          aria-describedby={error ? `${id}-hint ${id}-feil` : `${id}-hint`}
          aria-invalid={error ? true : undefined}
          onChange={(event) => setNotes(event.target.value)}
        />
        {error ? (
          <p id={`${id}-feil`} role="alert" className={styles.error}>
            {error}
          </p>
        ) : null}
        <button
          type="button"
          className={styles.secondary}
          aria-disabled={pending || unchanged ? true : undefined}
          onClick={() => {
            if (!unchanged) void save();
          }}
        >
          {pending === "notes" ? m.saving : m.save}
        </button>
      </div>

      <p role="status" aria-live="polite" className={styles.status}>
        {status}
      </p>
    </section>
  );
}
