import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import { loginHref } from "@/components/LoginRequired";
import { accountMessages, homeMessages as m } from "@/lib/messages";
import { currentUserId } from "@/server/session";
import styles from "./home.module.css";

export const metadata: Metadata = { title: m.tabTitle };

/**
 * Forsiden, `/`: en kort velkomst og snarveier til delene av appen. Importer-skjemaet ligger på
 * `/importer`. Uten innlogging står det øverst at man må lage konto eller logge inn.
 */
export default function HomePage() {
  return (
    <div className={styles.root}>
      <h1>{m.heading}</h1>
      <p className={styles.lead}>{m.lead}</p>
      <Suspense fallback={null}>
        <GuestNotice />
      </Suspense>
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

/** Vises bare når ingen er logget inn: forklarer at det trengs konto, med knapper til begge. */
async function GuestNotice() {
  await connection();
  if ((await currentUserId()) !== null) return null;
  return (
    <EmptyState
      title={m.guestTitle}
      description={m.guestBody}
      action={{ href: loginHref("/"), label: accountMessages.login }}
      secondaryAction={{ href: loginHref("/", "/ny-konto"), label: accountMessages.register }}
    />
  );
}
