"use client";

import styles from "./RetryButton.module.css";

/**
 * «Prøv igjen» på den frakoblede siden (Story 6.16). Siden vises på adressen brukeren ba om, så en
 * full omlasting henter akkurat den siden på nytt (en lenke i appen kunne ha brukt gammel tilstand).
 */
export default function RetryButton({ label }: { label: string }) {
  return (
    <button type="button" className={styles.button} onClick={() => window.location.reload()}>
      {label}
    </button>
  );
}
