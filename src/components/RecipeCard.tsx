import Link from "next/link";
import type { RecipeSummary } from "@/domain";
import { sourceLabel } from "@/lib/source-label";
import styles from "./RecipeCard.module.css";

/**
 * Oppskriftskort i Samlingen (UX-DR10): tittel og kilde. Hele kortet er én lenke til
 * oppskriften, så det er én trykkflate og ett tabstopp per oppskrift.
 */
export default function RecipeCard({ recipe }: { recipe: RecipeSummary }) {
  return (
    <Link href={`/oppskrift/${recipe.id}`} className={styles.card}>
      <h2 className={styles.title}>{recipe.title}</h2>
      <p className={styles.meta}>{sourceLabel(recipe)}</p>
    </Link>
  );
}
