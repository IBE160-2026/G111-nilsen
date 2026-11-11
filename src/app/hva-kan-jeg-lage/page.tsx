import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import { addToPantry, removeFromPantry } from "@/app/handleliste/actions";
import { ingredientLabel } from "@/domain";
import EmptyState from "@/components/EmptyState";
import LoginRequired from "@/components/LoginRequired";
import WhatToCook from "@/components/WhatToCook";
import { collectionMessages, whatToCookMessages as m } from "@/lib/messages";
import { listPantry } from "@/server/services/pantry-service";
import { listShoppingRecipes } from "@/server/services/recipe-service";
import { currentUserId } from "@/server/session";
import styles from "../list-page.module.css";

export const metadata: Metadata = { title: m.heading };

/**
 * Hva kan jeg lage?, `/hva-kan-jeg-lage` (Story 6.12). Overskriften står utenfor Suspense; data
 * leses inne i grensen, etter `connection()`, som i Oppskrifter.
 */
export default function WhatToCookPage() {
  return (
    <div className={styles.root}>
      <h1>{m.heading}</h1>
      <Suspense fallback={<p className={styles.loading}>{m.loading}</p>}>
        <WhatToCookLoader />
      </Suspense>
    </div>
  );
}

async function WhatToCookLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/hva-kan-jeg-lage" />;

  const recipes = listShoppingRecipes(userId);
  if (!recipes.ok) throw new Error(`${m.loadFailed} (${recipes.error.kind})`);
  const pantry = listPantry(userId);
  if (!pantry.ok) throw new Error(`${m.loadFailed} (${pantry.error.kind})`);

  if (recipes.value.length === 0) {
    return (
      <EmptyState
        title={collectionMessages.emptyTitle}
        description={collectionMessages.emptyDescription}
        action={{ href: "/ny", label: collectionMessages.emptyManualAction }}
        secondaryAction={{ href: "/importer", label: collectionMessages.emptyImportAction }}
      />
    );
  }

  return (
    <>
      <p>{m.lead}</p>
      <WhatToCook
        recipes={recipes.value.map((recipe) => ({
          id: recipe.id,
          title: recipe.title,
          ingredients: recipe.ingredients.map(ingredientLabel),
        }))}
        pantry={pantry.value}
        onAddPantry={addToPantry}
        onRemovePantry={removeFromPantry}
      />
    </>
  );
}
