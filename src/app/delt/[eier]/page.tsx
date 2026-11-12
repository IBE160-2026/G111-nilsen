import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import LoginRequired from "@/components/LoginRequired";
import RecipeTime from "@/components/RecipeTime";
import { shareMessages as m } from "@/lib/messages";
import { sourceLabel } from "@/lib/source-label";
import { listSharedCollection } from "@/server/services/share-service";
import { currentUserId } from "@/server/session";
import listStyles from "../../list-page.module.css";
import styles from "./page.module.css";

type Params = Promise<{ eier: string }>;

export const metadata: Metadata = { title: m.tabTitle };

/**
 * En delt samling, `/delt/<eier>` (Story 6.19): oppskriftene til en som deler med deg. Bare
 * lesing; kortene lenker til oppskriften, som vises uten endreknapper.
 */
export default function SharedCollectionPage({ params }: { params: Params }) {
  return (
    <div className={listStyles.root}>
      <h1>{m.theirsHeading}</h1>
      <Suspense fallback={<p className={listStyles.loading}>{m.loading}</p>}>
        <SharedLoader params={params} />
      </Suspense>
    </div>
  );
}

async function SharedLoader({ params }: { params: Params }) {
  await connection();
  const { eier } = await params;
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next={`/delt/${eier}`} />;

  const ownerId = /^\d{1,15}$/.test(eier) ? Number(eier) : null;
  const shared = ownerId === null ? null : listSharedCollection(userId, ownerId);
  // Uten godtatt deling skal siden se ut som om den ikke finnes.
  if (shared === null || !shared.ok) notFound();

  return (
    <>
      <h2>{m.collectionHeading(shared.value.email)}</h2>
      <p>
        <Link href="/delt" className={styles.back}>
          {m.back}
        </Link>
      </p>
      {shared.value.recipes.length === 0 ? (
        <p>{m.collectionEmpty}</p>
      ) : (
        <ul className={styles.list}>
          {shared.value.recipes.map((recipe) => (
            <li key={recipe.id}>
              <Link href={`/oppskrift/${recipe.id}`} className={styles.card}>
                <h3 className={styles.title}>{recipe.title}</h3>
                <p className={styles.meta}>
                  <span>{sourceLabel(recipe)}</span>
                  {recipe.totalMinutes != null ? (
                    <>
                      {" · "}
                      <RecipeTime minutes={recipe.totalMinutes} inline />
                    </>
                  ) : null}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
