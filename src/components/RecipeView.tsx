import Link from "next/link";
import type { Recipe } from "@/domain";
import { editRecipeMessages } from "@/lib/messages";
import { sourceLabel } from "@/lib/source-label";
import IngredientList from "./IngredientList";
import StepList from "./StepList";
import styles from "./RecipeView.module.css";

/**
 * Oppskriften i fast format (FR-5, UX-DR15): tittel, kilde, porsjonsvelger,
 * ingredienser per seksjon og nummererte steg. Serverkomponent; porsjonsvelger og
 * skalering ligger i klientkomponenten `IngredientList`, og stegene (med avkrysning) i
 * klientkomponenten `StepList`. Fra 768 px står
 * porsjonsvelger og ingredienser til venstre og stegene til høyre.
 */
export default function RecipeView({ recipe }: { recipe: Recipe }) {
  return (
    <article className={styles.root}>
      <header className={styles.header}>
        <div className={styles.titleRow}>
          <h1>{recipe.title}</h1>
          <Link
            href={`/oppskrift/${recipe.id}/rediger`}
            className={styles.edit}
            aria-label={`${editRecipeMessages.editLink} ${recipe.title}`}
          >
            {editRecipeMessages.editLink}
          </Link>
        </div>
        <p className={styles.meta}>{sourceLabel(recipe)}</p>
      </header>

      <div className={styles.columns}>
        <IngredientList
          key={`ingredienser-${recipe.id}-${recipe.updatedAt}`}
          ingredients={recipe.ingredients}
          originalServings={recipe.originalServings}
        />

        <StepList key={`steg-${recipe.id}-${recipe.updatedAt}`} steps={recipe.steps} />
      </div>
    </article>
  );
}
