import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import LoginRequired from "@/components/LoginRequired";
import { collectionStats, type NameCount, type RankedRecipe } from "@/domain";
import { dinnerMessages, statsMessages as m } from "@/lib/messages";
import { sourceLabel } from "@/lib/source-label";
import { listPlannedTitles } from "@/server/services/meal-plan-service";
import { listCollection } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import listStyles from "../list-page.module.css";
import styles from "./page.module.css";

export const metadata: Metadata = { title: m.tabTitle };

/** Dato som «10. november 2026», uten klokkeslett. */
function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("nb-NO", { day: "numeric", month: "long", year: "numeric" });
}

/**
 * Statistikk, `/statistikk` (Story 6.20b). Overskriften står utenfor Suspense; tallene regnes
 * ut inne i grensen, etter `connection()`. Alt bygger på data som allerede finnes: «Laget i dag»,
 * vurderinger, mapper, merkelapper, kilder og ukemenyen.
 */
export default function StatsPage() {
  return (
    <div className={styles.root}>
      <h1>{m.heading}</h1>
      <Suspense fallback={<p className={listStyles.loading}>{m.loading}</p>}>
        <StatsLoader />
      </Suspense>
    </div>
  );
}

async function StatsLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/statistikk" />;

  const recipes = listCollection(userId);
  if (!recipes.ok) throw new Error(recipes.error.kind);
  if (recipes.value.length === 0) {
    return (
      <EmptyState
        title={m.emptyTitle}
        description={m.emptyBody}
        action={{ href: "/oppskrifter", label: m.emptyAction }}
      />
    );
  }

  const planned = listPlannedTitles(userId);
  const stats = collectionStats(
    recipes.value.map((recipe) => ({
      id: recipe.id,
      title: recipe.title,
      source: sourceLabel(recipe),
      folderName: recipe.folderName,
      isFavorite: recipe.isFavorite,
      cookedCount: recipe.cookedCount ?? 0,
      lastCookedAt: recipe.lastCookedAt ?? null,
      rating: recipe.rating ?? null,
      totalMinutes: recipe.totalMinutes ?? null,
      labels: recipe.labels ?? [],
    })),
    planned.ok ? planned.value : [],
    dinnerMessages.noFolder,
  );

  return (
    <>
      <p className={styles.lead}>{m.lead}</p>

      <ul className={styles.keyFigures} aria-label={m.keyHeading}>
        <KeyFigure value={stats.total} label={stats.total === 1 ? m.recipesOne : m.recipes} />
        <KeyFigure
          value={stats.cookedTotal}
          label={stats.cookedTotal === 1 ? m.cookedTotalOne : m.cookedTotal}
        />
        <KeyFigure
          value={stats.favorites}
          label={stats.favorites === 1 ? m.favoritesOne : m.favorites}
        />
        <KeyFigure
          value={stats.plannedMeals}
          label={stats.plannedMeals === 1 ? m.plannedOne : m.planned}
        />
      </ul>

      <p className={styles.note}>
        {[
          stats.averageRating === null
            ? null
            : `${m.averageRating(stats.averageRating)} (${m.ratedCount(stats.rated, stats.total)})`,
          stats.averageMinutes === null ? null : m.averageMinutes(stats.averageMinutes),
        ]
          .filter((part) => part !== null)
          .join(" · ")}
      </p>

      <div className={styles.cards}>
        <RecipeCard
          title={m.mostCooked}
          rows={stats.mostCooked}
          value={(row) => m.times(row.value)}
          note={stats.neverCooked > 0 ? m.neverCooked(stats.neverCooked) : m.neverCookedNone}
          hint={m.neverCookedHint}
        />
        <RecipeCard
          title={m.recentlyCooked}
          rows={stats.recentlyCooked}
          value={(row) => (row.date == null ? "" : formatDate(row.date))}
        />
        <RecipeCard
          title={m.topRated}
          rows={stats.topRated}
          value={(row) => m.stars(row.value)}
          rating
        />
        <NameCard title={m.folders} rows={stats.folders} />
        <NameCard title={m.labels} rows={stats.labels} />
        <NameCard title={m.sources} rows={stats.sources} />
        {stats.mostPlanned.length > 0 ? (
          <NameCard title={m.mostPlanned} rows={stats.mostPlanned} planned />
        ) : null}
      </div>
    </>
  );
}

function KeyFigure({ value, label }: { value: number; label: string }) {
  return (
    <li className={styles.keyFigure}>
      <span className={styles.figure}>{value}</span>
      <span className={styles.figureLabel}>{label}</span>
    </li>
  );
}

/** Et kort med oppskrifter: tittelen lenker til oppskriften. */
function RecipeCard({
  title,
  rows,
  value,
  rating = false,
  note,
  hint,
}: {
  title: string;
  rows: readonly RankedRecipe[];
  value: (row: RankedRecipe) => string;
  rating?: boolean;
  note?: string;
  hint?: string;
}) {
  return (
    <section aria-label={title} className={styles.card}>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className={styles.empty}>{m.nothingYet}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.id} className={styles.row}>
              <Link href={`/oppskrift/${row.id}`} className={styles.rowName}>
                {row.title}
              </Link>
              <span className={rating ? styles.rating : styles.rowValue}>{value(row)}</span>
            </li>
          ))}
        </ul>
      )}
      {note !== undefined ? <p className={styles.note}>{note}</p> : null}
      {hint !== undefined ? <p className={styles.note}>{hint}</p> : null}
    </section>
  );
}

/** Et kort med navn og antall: mapper, merkelapper, kilder og ukemenyen. */
function NameCard({
  title,
  rows,
  note,
  planned = false,
}: {
  title: string;
  rows: readonly NameCount[];
  note?: string;
  planned?: boolean;
}) {
  return (
    <section aria-label={title} className={styles.card}>
      <h2>{title}</h2>
      {rows.length === 0 ? (
        <p className={styles.empty}>{m.nothingYet}</p>
      ) : (
        <ul className={styles.list}>
          {rows.map((row) => (
            <li key={row.name} className={styles.row}>
              <span className={styles.rowName}>{row.name}</span>
              <span className={styles.rowValue}>
                {planned ? m.plannedCount(row.count) : m.count(row.count)}
              </span>
            </li>
          ))}
        </ul>
      )}
      {note !== undefined ? <p className={styles.note}>{note}</p> : null}
    </section>
  );
}
