import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import LoginRequired from "@/components/LoginRequired";
import WeekPlan from "@/components/WeekPlan";
import { addDays, formatDay, formatWeek, weekDays } from "@/domain";
import { weekMessages as m } from "@/lib/messages";
import {
  listPlannable,
  listPlannedWeeks,
  listWeek,
  todayInOslo,
  weekStart,
} from "@/server/services/meal-plan-service";
import { currentUserId } from "@/server/session";
import { addMeal, removeMeal } from "./actions";
import listStyles from "../list-page.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = { title: m.heading };

type SearchParams = Promise<{ uke?: string | string[] }>;

/**
 * Ukemeny, `/ukemeny` (Story 6.4): lagrede oppskrifter på dagene i en uke, og handleliste for hele
 * uka. `?uke=ÅÅÅÅ-MM-DD` velger uka (hvilken som helst dag i den); uten gjelder denne uka.
 */
export default function UkemenyPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className={listStyles.root}>
      <h1>{m.heading}</h1>
      <Suspense fallback={<p className={listStyles.loading}>{m.loading}</p>}>
        <WeekLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function WeekLoader({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { uke } = await searchParams;
  const monday = weekStart(uke);
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next={`/ukemeny?uke=${monday}`} />;

  const recipes = listPlannable(userId);
  if (!recipes.ok) throw new Error(`${m.loadFailed} (${recipes.error.kind})`);
  const entries = listWeek(userId, monday);
  if (!entries.ok) throw new Error(`${m.loadFailed} (${entries.error.kind})`);

  const weeks = listPlannedWeeks(userId);
  if (!weeks.ok) throw new Error(`${m.loadFailed} (${weeks.error.kind})`);

  const today = todayInOslo();
  const thisMonday = weekStart(undefined);

  return (
    <>
      <nav aria-label={m.heading} className={styles.weekNav}>
        <Link href={`/ukemeny?uke=${addDays(monday, -7)}`} className={styles.navLink}>
          ← {m.previous}
        </Link>
        <p className={styles.week}>{formatWeek(monday)}</p>
        <Link href={`/ukemeny?uke=${addDays(monday, 7)}`} className={styles.navLink}>
          {m.next} →
        </Link>
      </nav>
      {monday !== thisMonday ? (
        <Link href="/ukemeny" className={styles.navLink}>
          {m.thisWeek}
        </Link>
      ) : null}

      {recipes.value.length === 0 ? (
        <EmptyState
          title={m.noRecipesTitle}
          description={m.noRecipesDescription}
          action={{ href: "/oppskrifter", label: m.noRecipesAction }}
        />
      ) : (
        <WeekPlan
          key={monday}
          days={weekDays(monday).map((day) => ({
            day,
            label: formatDay(day),
            isToday: day === today,
          }))}
          entries={entries.value}
          recipes={recipes.value}
          shoppingHref={`/handleliste?uke=${monday}`}
          onAdd={addMeal}
          onRemove={removeMeal}
        />
      )}

      {weeks.value.length > 0 ? (
        <section aria-labelledby="dine-uker" className={styles.weeks}>
          <h2 id="dine-uker">{m.weeksHeading}</h2>
          <p className={styles.weeksHint}>{m.weeksHint}</p>
          <ul role="list" className={styles.weekList}>
            {weeks.value.map((week) => (
              <li key={week.monday}>
                <Link
                  href={`/ukemeny?uke=${week.monday}`}
                  className={styles.weekLink}
                  aria-current={week.monday === monday ? "page" : undefined}
                >
                  <span>{formatWeek(week.monday)}</span>
                  <span className={styles.weekMeta}>
                    {m.weekMeals(week.meals)}
                    {week.monday === monday ? ` · ${m.currentWeek}` : ""}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}
