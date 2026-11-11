"use client";

import { printMessages as m } from "@/lib/messages";
import styles from "./PrintButton.module.css";

/**
 * «Skriv ut» (Story 6.6): åpner utskriftsdialogen i nettleseren. Selve utskriften styres av
 * utskriftsstilene i `globals.css` og `RecipeView.module.css`, som skjuler menyer og knapper.
 */
export default function PrintButton({ title }: { title: string }) {
  return (
    <button
      type="button"
      className={styles.button}
      aria-label={m.label(title)}
      onClick={() => window.print()}
    >
      {m.button}
    </button>
  );
}
