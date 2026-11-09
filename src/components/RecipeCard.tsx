import Link from "next/link";
import type { RecipeSummary } from "@/domain";
import { sourceLabel } from "@/lib/source-label";
import styles from "./RecipeCard.module.css";

/**
 * Oppskriftskort i Samlingen og i mapper (UX-DR10): tittel, kilde og mappenavn. Hele kortet
 * er én lenke til oppskriften, så det er én trykkflate og ett tabstopp per oppskrift.
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
  );
}
