import type { Metadata } from "next";
import RetryButton from "@/components/RetryButton";
import { pwaMessages as m } from "@/lib/messages";
import styles from "../list-page.module.css";

export const metadata: Metadata = { title: m.offlineTab };

/**
 * Siden service workeren viser når en navigasjon ikke får svar fra nettet (Story 6.16). Helt
 * statisk, så den kan lagres ferdig.
 */
export default function OfflinePage() {
  return (
    <div className={styles.root}>
      <h1>{m.offlineHeading}</h1>
      <p>{m.offlineTitle}</p>
      <p>{m.offlineDescription}</p>
      <RetryButton label={m.offlineAction} />
    </div>
  );
}
