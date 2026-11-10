import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import ShoppingList from "@/components/ShoppingList";
import { shoppingMessages } from "@/lib/messages";
import { listPantry } from "@/server/services/pantry-service";
import { listShoppingRecipes } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import LoginRequired from "@/components/LoginRequired";
import { addToPantry, removeFromPantry } from "./actions";
import listStyles from "../list-page.module.css";

export const metadata: Metadata = { title: shoppingMessages.heading };

/**
 * Handleliste, `/handleliste` (Story 5.7). Overskriften står utenfor Suspense; oppskriftene
 * leses inne i grensen, etter `connection()`, som i Oppskrifter.
 */
export default function HandlelistePage() {
  return (
    <div className={listStyles.root}>
      <h1>{shoppingMessages.heading}</h1>
      <Suspense fallback={<p className={listStyles.loading}>{shoppingMessages.loading}</p>}>
        <ShoppingLoader />
      </Suspense>
    </div>
  );
}

async function ShoppingLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/handleliste" />;

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

  return (
    <ShoppingList
      recipes={result.value}
      pantry={pantry.value}
      onAddPantry={addToPantry}
      onRemovePantry={removeFromPantry}
    />
  );
}
