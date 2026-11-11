import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import ShoppingList from "@/components/ShoppingList";
import { shoppingMessages, weekMessages } from "@/lib/messages";
import { formatWeek, isIsoDate } from "@/domain";
import {
  listChecks,
  listWeek,
  weekShoppingSelection,
  weekStart,
} from "@/server/services/meal-plan-service";
import { listPantry } from "@/server/services/pantry-service";
import { listShoppingRecipes } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import LoginRequired from "@/components/LoginRequired";
import { addToPantry, clearPantryItems, removeFromPantry, setWeekItemChecked } from "./actions";
import listStyles from "../list-page.module.css";

export const metadata: Metadata = { title: shoppingMessages.heading };

type SearchParams = Promise<{ uke?: string | string[] }>;

/**
 * Handleliste, `/handleliste` (Story 5.7). Overskriften står utenfor Suspense; oppskriftene
 * leses inne i grensen, etter `connection()`, som i Oppskrifter. `?uke=ÅÅÅÅ-MM-DD` velger
 * oppskriftene i ukemenyen for den uka (Story 6.4).
 */
export default function HandlelistePage({
  searchParams = Promise.resolve({}),
}: { searchParams?: SearchParams } = {}) {
  return (
    <div className={listStyles.root}>
      <h1>{shoppingMessages.heading}</h1>
      <Suspense fallback={<p className={listStyles.loading}>{shoppingMessages.loading}</p>}>
        <ShoppingLoader searchParams={searchParams} />
      </Suspense>
    </div>
  );
}

async function ShoppingLoader({ searchParams }: { searchParams: SearchParams }) {
  await connection();
  const { uke } = await searchParams;
  const userId = await currentUserId();
  if (userId === null)
    return <LoginRequired next={isIsoDate(uke) ? `/handleliste?uke=${uke}` : "/handleliste"} />;

  const result = listShoppingRecipes(userId);
  // Feil vises av error.tsx; en tom liste skal aldri skjule en databasefeil.
  if (!result.ok) throw new Error(`${shoppingMessages.loadFailed} (${result.error.kind})`);

  const pantry = listPantry(userId);
  if (!pantry.ok) throw new Error(`${shoppingMessages.loadFailed} (${pantry.error.kind})`);

  if (result.value.length === 0) {
    return (
      <EmptyState
        title={shoppingMessages.emptyTitle}
        description={shoppingMessages.emptyDescription}
        action={{ href: "/oppskrifter", label: shoppingMessages.emptyAction }}
      />
    );
  }

  let selection: Record<number, number> = {};
  let monday: string | null = null;
  let checks: string[] = [];
  if (isIsoDate(uke)) {
    monday = weekStart(uke);
    const week = listWeek(userId, monday);
    if (!week.ok) throw new Error(`${shoppingMessages.loadFailed} (${week.error.kind})`);
    selection = weekShoppingSelection(week.value);
    const saved = listChecks(userId, monday);
    if (!saved.ok) throw new Error(`${shoppingMessages.loadFailed} (${saved.error.kind})`);
    checks = saved.value;
  }

  return (
    <>
      {monday !== null ? (
        <p className={listStyles.loading}>
          {weekMessages.fromWeek(formatWeek(monday))}{" "}
          <Link href={`/ukemeny?uke=${monday}`}>{weekMessages.heading}</Link>
        </p>
      ) : null}
      <ShoppingList
        recipes={result.value}
        pantry={pantry.value}
        onAddPantry={addToPantry}
        onRemovePantry={removeFromPantry}
        onClearPantry={clearPantryItems}
        initialSelection={selection}
        weekChecks={
          monday === null
            ? undefined
            : { initial: checks, onChange: setWeekItemChecked.bind(null, monday) }
        }
      />
    </>
  );
}
