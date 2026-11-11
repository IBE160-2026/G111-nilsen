import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import LoginRequired from "@/components/LoginRequired";
import { formatDay, formatWeek, isIsoDate, mondayOf, weekDays } from "@/domain";
import { weekMessages as m } from "@/lib/messages";
import { formatServings } from "@/lib/recipe-input";
import { listWeek } from "@/server/services/meal-plan-service";
import { currentUserId } from "@/server/session";
import listStyles from "../../../list-page.module.css";
import styles from "../../page.module.css";

export const metadata: Metadata = { title: m.weekTitle };

type Params = Promise<{ uke: string }>;

/**
 * Én uke, `/ukemeny/uker/[uke]` (Story 6.4d): ukemenyen i korte trekk, dag for dag, med
 * veien videre til handlelisten for uka og til å endre uka. `[uke]` er mandagen, «ÅÅÅÅ-MM-DD».
 */
export default function WeekSummaryPage({ params }: { params: Params }) {
  return (
    <div className={listStyles.root}>
      <h1>{m.weekTitle}</h1>
      <Suspense fallback={<p className={listStyles.loading}>{m.loading}</p>}>
        <WeekSummary params={params} />
      </Suspense>
    </div>
  );
}

async function WeekSummary({ params }: { params: Params }) {
  await connection();
  const { uke } = await params;
  if (!isIsoDate(uke) || mondayOf(uke) !== uke) notFound();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next={`/ukemeny/uker/${uke}`} />;
  const entries = listWeek(userId, uke);
  if (!entries.ok) throw new Error(`${m.loadFailed} (${entries.error.kind})`);

  return (
    <>
      <Link href="/ukemeny/uker" className={styles.navLink}>
        {m.backToAllWeeks}
      </Link>
      <p className={styles.weekLabel}>{formatWeek(uke)}</p>
      {entries.value.length === 0 ? (
        <EmptyState
          title={m.weekEmpty}
          description={m.noRecipesDescription}
          action={{ href: `/ukemeny?uke=${uke}`, label: m.planWeek }}
        />
      ) : (
        <>
          <ul role="list" className={styles.summaryList}>
            {weekDays(uke).map((day) => {
              const meals = entries.value.filter((entry) => entry.day === day);
              if (meals.length === 0) return null;
              return (
                <li key={day} className={styles.summaryDay}>
                  <h2 className={styles.summaryHeading}>{formatDay(day)}</h2>
                  <ul role="list" className={styles.summaryMeals}>
                    {meals.map((entry) => (
                      <li key={entry.id}>
                        <Link href={`/oppskrift/${entry.recipeId}`}>{entry.title}</Link>
                        <span className={styles.weekMeta}>
                          {" "}
                          · {m.portions(formatServings(entry.servings))}
                        </span>
                      </li>
                    ))}
                  </ul>
                </li>
              );
            })}
          </ul>
          <Link href={`/handleliste?uke=${uke}`} className={styles.bigLink}>
            {m.seeShopping}
          </Link>
          <Link href={`/ukemeny?uke=${uke}`} className={styles.navLink}>
            {m.editWeek}
          </Link>
        </>
      )}
    </>
  );
}
