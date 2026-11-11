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
 * Forsiden, `/`: en kort tekst som forklarer hva RecipeMate gjør, hvordan det virker og hva mer
 * appen kan, med en stor «Hent en oppskrift»-knapp, og snarveier til delene av appen. Importer-skjemaet ligger på
 * `/importer`. Uten innlogging står det øverst at man må lage konto eller logge inn.
 */
export default function HomePage() {
  return (
    <div className={styles.root}>
      <header className={styles.hero}>
        <h1 className={styles.heading}>{m.heading}</h1>
        <p className={styles.lead}>{m.lead}</p>
        <Link href="/importer" className={styles.cta}>
          {m.cta}
        </Link>
        <p className={styles.ctaHint}>{m.ctaHint}</p>
      </header>

      <Suspense fallback={null}>
        <GuestNotice />
      </Suspense>

      <section aria-labelledby="how-heading" className={styles.section}>
        <h2 id="how-heading">{m.howHeading}</h2>
        <ol role="list" className={styles.steps}>
          {m.steps.map((step) => (
            <li key={step.title} className={styles.step}>
              <h3 className={styles.itemTitle}>{step.title}</h3>
              <p className={styles.itemText}>{step.text}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="more-heading" className={styles.section}>
        <h2 id="more-heading">{m.moreHeading}</h2>
        <ul role="list" className={styles.features}>
          {m.features.map((feature) => (
            <li key={feature.title} className={styles.feature}>
              <h3 className={styles.itemTitle}>{feature.title}</h3>
              <p className={styles.itemText}>{feature.text}</p>
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={m.sectionLabel} className={styles.section}>
        <h2>{m.sectionLabel}</h2>
        <ul role="list" className={styles.cards}>
          {m.cards.map((card) => (
            <li key={card.href}>
              <Link href={card.href} className={styles.card}>
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
