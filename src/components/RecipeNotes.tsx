"use client";

import Link from "next/link";
import { useId, useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, notesMessages as m } from "@/lib/messages";
import styles from "./RecipeNotes.module.css";

type CookedResult =
  { ok: true; lastCookedAt: string; cookedCount: number } | { ok: false; message: string };

type UndoResult =
  { ok: true; lastCookedAt: string | null; cookedCount: number } | { ok: false; message: string };

type Props = {
  notes: string | null;
  fitsFor: string | null;
  lastCookedAt: string | null;
  cookedCount: number;
  onSaveNotes: (notes: string) => Promise<ActionResult>;
  onSaveFitsFor: (fitsFor: string) => Promise<ActionResult>;
  onCooked: () => Promise<CookedResult>;
  /** Angrer «Laget i dag»; får datoen oppskriften hadde før (Story 6.21). */
  onUndoCooked: (previousAt: string | null) => Promise<UndoResult>;
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
  fitsFor: initialFitsFor,
  lastCookedAt: initialCooked,
  cookedCount: initialCount,
  onSaveNotes,
  onSaveFitsFor,
  onCooked,
  onUndoCooked,
}: Props) {
  const id = useId();
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [savedNotes, setSavedNotes] = useState(initialNotes ?? "");
  const [fitsFor, setFitsFor] = useState(initialFitsFor ?? "");
  const [savedFitsFor, setSavedFitsFor] = useState(initialFitsFor ?? "");
  const [cooked, setCooked] = useState({ at: initialCooked, count: initialCount });
  // Datoen før siste «Laget i dag» i denne økten; finnes bare så lenge man kan angre.
  const [undoTo, setUndoTo] = useState<{ at: string | null } | null>(null);
  const [pending, setPending] = useState<"notes" | "cooked" | "undo" | null>(null);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  async function save() {
    if (pending) return;
    setPending("notes");
    setStatus("");
    setError("");
    try {
      // Bare det som er endret lagres; en feil i det ene stopper ikke det andre.
      const messages: string[] = [];
      if (notes.trim() !== savedNotes.trim()) {
        const result = await onSaveNotes(notes);
        if (result.ok) setSavedNotes(notes.trim());
        else messages.push(result.message);
      }
      if (fitsFor.trim() !== savedFitsFor.trim()) {
        const result = await onSaveFitsFor(fitsFor);
        if (result.ok) setSavedFitsFor(fitsFor.trim());
        else messages.push(result.message);
      }
      if (messages.length === 0) setStatus(m.saved);
      else setError(messages.join(" "));
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
        setUndoTo({ at: cooked.at });
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

  async function undoCooked() {
    if (pending || !undoTo) return;
    setPending("undo");
    setStatus("");
    setError("");
    try {
      const result = await onUndoCooked(undoTo.at);
      if (result.ok) {
        setCooked({ at: result.lastCookedAt, count: result.cookedCount });
        setUndoTo(null);
        setStatus(m.undoDone);
      } else setError(result.message);
    } catch (cause) {
      console.error("Kunne ikke angre «Laget i dag»", cause);
      setError(fail);
    } finally {
      setPending(null);
    }
  }

  const unchanged = notes.trim() === savedNotes.trim() && fitsFor.trim() === savedFitsFor.trim();

  return (
    <section className={styles.card} aria-labelledby={`${id}-overskrift`}>
      <h2 id={`${id}-overskrift`}>{m.heading}</h2>

      <div className={styles.cooked}>
        <div className={styles.cookedInfo}>
          <p className={styles.cookedText}>
            {cooked.at === null ? m.never : m.lastCooked(formatCookedDate(cooked.at), cooked.count)}
          </p>
          <Link href="/statistikk" className={styles.statsLink}>
            {m.seeStats}
          </Link>
        </div>
        <div className={styles.cookedActions}>
          {undoTo ? (
            <button
              type="button"
              className={styles.secondary}
              aria-disabled={pending ? true : undefined}
              onClick={() => void undoCooked()}
            >
              {pending === "undo" ? m.cookedSaving : m.undo}
            </button>
          ) : null}
          <button
            type="button"
            className={styles.secondary}
            aria-disabled={pending ? true : undefined}
            onClick={() => void markCooked()}
          >
            {pending === "cooked" ? m.cookedSaving : m.cooked}
          </button>
        </div>
      </div>

      <div className={styles.field}>
        <label htmlFor={`${id}-passer`} className={styles.label}>
          {m.fitsForLabel}
        </label>
        <p id={`${id}-passer-hint`} className={styles.hint}>
          {m.fitsForHint}
        </p>
        <input
          id={`${id}-passer`}
          type="text"
          autoComplete="off"
          className={styles.input}
          value={fitsFor}
          aria-describedby={`${id}-passer-hint`}
          onChange={(event) => setFitsFor(event.target.value)}
        />
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
