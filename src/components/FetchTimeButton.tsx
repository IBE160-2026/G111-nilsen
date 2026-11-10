"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { fallbackMessage, recipeTimeMessages as m } from "@/lib/messages";
import styles from "./FetchTimeButton.module.css";

/**
 * «Hent tid fra kilden» (Story 6.2) for en importert oppskrift uten tid, for eksempel importert
 * før tid ble lest. Ved suksess revaliderer handlingen siden, så tiden dukker opp; ellers vises
 * meldingen her.
 */
export default function FetchTimeButton({ onFetch }: { onFetch: () => Promise<ActionResult> }) {
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function fetchTime() {
    if (pending) return;
    setPending(true);
    setMessage("");
    try {
      const result = await onFetch();
      if (!result.ok) setMessage(result.message);
    } catch (error) {
      console.error("Kunne ikke hente tid fra kilden", error);
      setMessage(`${fallbackMessage.title} ${fallbackMessage.body}`);
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className={styles.button}
        aria-disabled={pending ? true : undefined}
        onClick={() => void fetchTime()}
      >
        {pending ? m.fetching : m.fetch}
      </button>
      <span role="status" className={styles.message}>
        {message}
      </span>
    </>
  );
}
