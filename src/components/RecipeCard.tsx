import Link from "next/link";
import { setFavorite } from "@/app/oppskrift/[id]/actions";
import type { RecipeSummary } from "@/domain";
import { sourceLabel } from "@/lib/source-label";
import FavoriteButton from "./FavoriteButton";
import styles from "./RecipeCard.module.css";

/**
 * Oppskriftskort i Samlingen, i mapper og i Favoritter (UX-DR10): tittel, kilde og mappenavn.
 * Selve kortet er én lenke til oppskriften. Hjertet (Story 3.4, UX-DR11) er en søsken til
 * lenken, aldri inni den, og står øverst til høyre; det er plass til det i kortet, så tittel
 * og meta ikke havner under. Tabrekkefølge: lenke, så hjerte.
 * `showFolder={false}` utelater mappenavnet på mappesiden, der det er likt på alle kort.
 */
export default function RecipeCard({
  recipe,
  showFolder = true,
}: {
  recipe: RecipeSummary;
  showFolder?: boolean;
}) {
  return (
    <div className={styles.root}>
      <Link href={`/oppskrift/${recipe.id}`} className={styles.card}>
        <h2 className={styles.title}>{recipe.title}</h2>
        <p className={styles.meta}>
          <span>{sourceLabel(recipe)}</span>
          {showFolder && recipe.folderName !== null ? (
            <>
              {" · "}
              <span>{recipe.folderName}</span>
            </>
          ) : null}
        </p>
      </Link>
      <FavoriteButton
        className={styles.favorite}
        title={recipe.title}
        isFavorite={recipe.isFavorite}
        onSetFavorite={setFavorite.bind(null, recipe.id)}
      />
    </div>
  );
}
