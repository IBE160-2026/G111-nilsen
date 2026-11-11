import type { Metadata } from "next";
import Link from "next/link";
import { homeMessages as m } from "@/lib/messages";
import styles from "./home.module.css";

export const metadata: Metadata = { title: m.tabTitle };

/**
 * Forsiden, `/`: en kort velkomst og snarveier til delene av appen. Importer-skjemaet ligger på
 * `/importer`. Siden henter ingen data, så den virker også uten innlogging.
 */
export default function HomePage() {
  return (
    <div className={styles.root}>
      <h1>{m.heading}</h1>
      <p className={styles.lead}>{m.lead}</p>
      <section aria-label={m.sectionLabel}>
        <ul role="list" className={styles.cards}>
          {m.cards.map((card, index) => (
            <li key={card.href}>
              <Link
                href={card.href}
                className={index === 0 ? `${styles.card} ${styles.primary}` : styles.card}
              >
                <span className={styles.cardTitle}>{card.title}</span>
                <span className={styles.cardText}>{card.text}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
