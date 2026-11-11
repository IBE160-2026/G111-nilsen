"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, variantMessages as m } from "@/lib/messages";
import styles from "./CopyVariantButton.module.css";

/**
 * «Lag egen variant» (Story 6.10): kopierer oppskriften til en ny og sender brukeren til
 * redigeringssiden for kopien. Handlingen sender videre (redirect) ved suksess og returnerer bare
 * ved feil; da vises meldingen under tittelen.
 */
export default function CopyVariantButton({
  title,
  onCopy,
}: {
  title: string;
  onCopy: () => Promise<ActionResult | void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function copy() {
    if (pending) return;
    setPending(true);
    setError("");
    try {
      const result = await onCopy();
      if (result && !result.ok) {
        setError(result.message);
        setPending(false);
      }
      // Ved suksess sender handlingen brukeren videre; knappen blir stående i «Lager …».
    } catch (caught) {
      // Et redirect kaster ikke her (Next håndterer det), så dette er en ekte feil.
      console.error("Kunne ikke lage en variant", caught);
      setError(`${fallbackMessage.title} ${fallbackMessage.body}`);
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-label={m.label(title)}
        aria-disabled={pending ? true : undefined}
        onClick={() => void copy()}
      >
        {pending ? m.working : m.button}
      </button>
      {error !== "" ? (
        <span role="alert" className={styles.error}>
          {error}
        </span>
      ) : null}
    </>
  );
}
