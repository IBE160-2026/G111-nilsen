import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { cache, Suspense } from "react";
import EmptyState from "@/components/EmptyState";
import LoginRequired from "@/components/LoginRequired";
import RecipeCard from "@/components/RecipeCard";
import { folderMessages } from "@/lib/messages";
import { parseRecipeId } from "@/lib/recipe-id";
import { getFolderWithRecipes } from "@/server/services/folder-service";
import { currentUserId } from "@/server/session";
import styles from "../../list-page.module.css";

type Params = Promise<{ id: string }>;

/** Leser mappen én gang per forespørsel, selv om både metadata og side trenger den. */
const loadFolder = cache(async (rawId: string) => {
  const id = parseRecipeId(rawId);
  if (id === null) return null;
  // Uten innlogging, eller en annens mappe: som en ukjent mappe (Story 5.13).
  const userId = await currentUserId();
  return userId === null ? null : getFolderWithRecipes(userId, id);
});

/** Fanetittel «<navn> · RecipeMate» (malen ligger i rotlayouten). */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { id } = await params;
  await connection();
  const result = await loadFolder(id);
  return { title: result?.ok ? result.value.folder.name : folderMessages.folderDefaultTitle };
}

/**
 * Mappesiden (Story 3.3): oppskriftene i mappen, eller en tom-tilstand. Data hentes inne i
 * Suspense-grensen, etter `connection()`, som på oppskriftssiden.
 */
export default function FolderPage({ params }: { params: Params }) {
  return (
    <Suspense fallback={<p className={styles.loading}>{folderMessages.folderLoading}</p>}>
      <FolderLoader params={params} />
    </Suspense>
  );
}

async function FolderLoader({ params }: { params: Params }) {
  const { id } = await params;
  await connection();
  if ((await currentUserId()) === null) return <LoginRequired next={`/mapper/${id}`} />;

  const result = await loadFolder(id);
  if (result === null) notFound();
  if (!result.ok) {
    if (result.error.kind === "not_found") notFound();
    // Andre feil er uventede og vises av error.tsx.
    throw new Error(`${folderMessages.folderLoadFailed} (${result.error.kind})`);
  }

  const { folder, recipes } = result.value;
  return (
    <div className={styles.root}>
      <h1>{folder.name}</h1>
      <Link href="/mapper" className={styles.backLink}>
        {folderMessages.allFolders}
      </Link>
      {recipes.length === 0 ? (
        <EmptyState
          title={folderMessages.folderEmptyTitle}
          description={folderMessages.folderEmptyDescription}
          action={{ href: "/oppskrifter", label: folderMessages.emptyAction }}
        />
      ) : (
        <ul className={styles.list} role="list">
          {recipes.map((recipe) => (
            <li key={recipe.id}>
              <RecipeCard recipe={recipe} showFolder={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
