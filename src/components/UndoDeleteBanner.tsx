"use client";

import Link from "next/link";
import { useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, trashMessages as m } from "@/lib/messages";
import styles from "./UndoDeleteBanner.module.css";

/**
 * Meldingen øverst i Oppskrifter rett etter en sletting (Story 6.11): «Oppskriften … er slettet»
 * med «Angre». Handlingen sender brukeren til den gjenopprettede oppskriften ved suksess og
 * returnerer bare ved feil; da vises meldingen.
 */
export default function UndoDeleteBanner({
  title,
  onUndo,
}: {
  title: string;
  onUndo: () => Promise<ActionResult | void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function undo() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await onUndo();
      if (result && !result.ok) {
        setError(result.message);
        setPending(false);
      }
    } catch (caught) {
      console.error("Kunne ikke angre slettingen", caught);
      setError(`${fallbackMessage.title} ${fallbackMessage.body}`);
      setPending(false);
    }
  }

  return (
    <section className={styles.root} aria-label={m.heading}>
      <p role="status" className={styles.text}>
        {m.bannerDeleted(title)}
      </p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.undo}
          aria-label={m.undoFor(title)}
          aria-disabled={pending ? true : undefined}
          onClick={() => void undo()}
        >
          {pending ? m.restoring : m.undo}
        </button>
        <Link href="/nylig-slettet" className={styles.link}>
          {m.seeAll}
        </Link>
      </div>
      {error !== "" ? (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      ) : null}
    </section>
  );
}
