import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import LoginRequired from "@/components/LoginRequired";
import { formatWeek } from "@/domain";
import { weekMessages as m } from "@/lib/messages";
import { listPlannedWeeks, weekStart } from "@/server/services/meal-plan-service";
import { currentUserId } from "@/server/session";
import listStyles from "../../list-page.module.css";
import styles from "../page.module.css";

export const metadata: Metadata = { title: m.weeksTitle };

/**
 * Alle uker, `/ukemeny/uker` (Story 6.4c): hver uke brukeren har planlagt (Uke 38, Uke 39 …) med
 * rettene. Hver uke lenker til en egen side med ukemenyen i korte trekk og veien videre til
 * handlelisten (`/ukemeny/uker/[uke]`).
 */
export default function AllWeeksPage() {
  return (
    <div className={listStyles.root}>
      <h1>{m.weeksHeading}</h1>
      <Suspense fallback={<p className={listStyles.loading}>{m.loading}</p>}>
        <WeeksLoader />
      </Suspense>
    </div>
  );
}

async function WeeksLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/ukemeny/uker" />;
  const weeks = listPlannedWeeks(userId);
  if (!weeks.ok) throw new Error(`${m.loadFailed} (${weeks.error.kind})`);
  const thisMonday = weekStart(undefined);

  return (
    <>
      <Link href="/ukemeny" className={styles.navLink}>
        ← {m.heading}
      </Link>
      {weeks.value.length === 0 ? (
        <EmptyState
          title={m.weeksEmpty}
          description={m.noRecipesDescription}
          action={{ href: "/ukemeny", label: m.weeksEmptyAction }}
        />
      ) : (
        <section aria-label={m.weeksHeading} className={styles.weeks}>
          <p className={styles.weeksHint}>{m.weeksHint}</p>
          <ul role="list" className={styles.weekList}>
            {weeks.value.map((week) => (
              <li key={week.monday} className={styles.weekItem}>
                <Link
                  href={`/ukemeny/uker/${week.monday}`}
                  className={styles.weekLink}
                  aria-current={week.monday === thisMonday ? "date" : undefined}
                >
                  <span>{formatWeek(week.monday)}</span>
                  <span className={styles.weekMeta}>
                    {m.weekMeals(week.meals)}
                    {week.monday === thisMonday ? ` · ${m.thisWeekShort}` : ""}
                  </span>
                </Link>
                <p className={styles.weekTitles}>{week.titles.join(", ")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}
