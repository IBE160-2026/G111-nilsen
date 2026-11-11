import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import SavedLists from "@/components/SavedLists";
import ShoppingList from "@/components/ShoppingList";
import { shoppingMessages, weekMessages } from "@/lib/messages";
import { addDays, formatWeek, isIsoDate, isoWeekNumber } from "@/domain";
import {
  listChecks,
  listWeek,
  weekShoppingSelection,
  weekStart,
} from "@/server/services/meal-plan-service";
import { listPantry } from "@/server/services/pantry-service";
import { listShoppingRecipes } from "@/server/services/recipe-service";
import { getSavedList, listSavedLists } from "@/server/services/shopping-list-service";
import { currentUserId } from "@/server/session";
import LoginRequired from "@/components/LoginRequired";
import {
  addToPantry,
  clearPantryItems,
  deleteShoppingList,
  removeFromPantry,
  saveShoppingList,
  setWeekItemChecked,
} from "./actions";
import listStyles from "../list-page.module.css";
import weekStyles from "../ukemeny/page.module.css";

export const metadata: Metadata = { title: shoppingMessages.heading };

type SearchParams = Promise<{ uke?: string | string[]; liste?: string | string[] }>;

/**
 * Handleliste, `/handleliste` (Story 5.7). Overskriften står utenfor Suspense; oppskriftene
 * leses inne i grensen, etter `connection()`, som i Oppskrifter. Uten valg er listen for denne
 * uka og bygges av ukemenyen (Story 6.4, 6.4g); `?uke=ÅÅÅÅ-MM-DD` velger en annen uke og
 * `?liste=` åpner en lagret handleliste.
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
  const { uke, liste } = await searchParams;
  const userId = await currentUserId();
  const listId = typeof liste === "string" && /^\d{1,15}$/.test(liste) ? Number(liste) : null;
  if (userId === null)
    return (
      <LoginRequired
        next={
          listId !== null
            ? `/handleliste?liste=${listId}`
            : isIsoDate(uke)
              ? `/handleliste?uke=${uke}`
              : "/handleliste"
        }
      />
    );

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

  const saved = listSavedLists(userId);
  if (!saved.ok) throw new Error(`${shoppingMessages.loadFailed} (${saved.error.kind})`);

  let selection: Record<number, number> = {};
  let monday: string | null = null;
  let checks: string[] = [];
  let openList: { id: number; name: string } | null = null;
  let notFound = false;
  let weekMeals = 0;

  if (listId !== null) {
    const found = getSavedList(userId, listId);
    if (found.ok) {
      openList = { id: found.value.id, name: found.value.name };
      selection = Object.fromEntries(
        found.value.items.map((item) => [item.recipeId, item.servings]),
      );
    } else if (found.error.kind === "not_found") {
      notFound = true;
    } else {
      throw new Error(`${shoppingMessages.loadFailed} (${found.error.kind})`);
    }
  }
  if (openList === null) {
    // Uten valgt liste er handlelisten for en uke (som standard denne uka) og følger ukemenyen.
    monday = weekStart(isIsoDate(uke) ? uke : undefined);
    const week = listWeek(userId, monday);
    if (!week.ok) throw new Error(`${shoppingMessages.loadFailed} (${week.error.kind})`);
    weekMeals = week.value.length;
    selection = weekShoppingSelection(week.value);
    const savedChecks = listChecks(userId, monday);
    if (!savedChecks.ok)
      throw new Error(`${shoppingMessages.loadFailed} (${savedChecks.error.kind})`);
    checks = savedChecks.value;
  }

  return (
    <>
      {notFound ? (
        <p role="alert" className={listStyles.loading}>
          {shoppingMessages.listNotFound}
        </p>
      ) : null}
      {monday !== null ? (
        <>
          <nav aria-label={weekMessages.heading} className={weekStyles.weekNav}>
            <Link href={`/handleliste?uke=${addDays(monday, -7)}`} className={weekStyles.navLink}>
              ← {weekMessages.previous}
            </Link>
            <p className={weekStyles.week}>{formatWeek(monday)}</p>
            <Link href={`/handleliste?uke=${addDays(monday, 7)}`} className={weekStyles.navLink}>
              {weekMessages.next} →
            </Link>
          </nav>
          <p className={listStyles.loading}>
            {weekMeals > 0
              ? weekMessages.fromWeek(formatWeek(monday))
              : shoppingMessages.weekEmptyHint}{" "}
            <Link href={`/ukemeny?uke=${monday}`}>
              {weekMeals > 0 ? weekMessages.heading : shoppingMessages.planWeek}
            </Link>
          </p>
        </>
      ) : null}
      {openList !== null ? (
        <p className={listStyles.loading}>
          {shoppingMessages.fromList(openList.name)}{" "}
          <Link href="/handleliste">{shoppingMessages.heading}</Link>
        </p>
      ) : null}
      <ShoppingList
        key={openList !== null ? `liste-${openList.id}` : `uke-${monday}`}
        recipes={result.value}
        pantry={pantry.value}
        onAddPantry={addToPantry}
        onRemovePantry={removeFromPantry}
        onClearPantry={clearPantryItems}
        onSaveList={saveShoppingList}
        listName={openList !== null ? openList.name : `Uke ${isoWeekNumber(monday!)}`}
        initialSelection={selection}
        weekChecks={
          monday === null
            ? undefined
            : { initial: checks, onChange: setWeekItemChecked.bind(null, monday) }
        }
      />
      <SavedLists
        lists={saved.value}
        currentId={openList?.id ?? null}
        onDelete={deleteShoppingList}
      />
    </>
  );
}
