import Link from "next/link";
import type { Folder, Recipe } from "@/domain";
import {
  moveToFolder,
  moveToNewFolder,
  removeRecipe,
  rememberServings,
  saveRecipe,
  setFavorite,
} from "@/app/oppskrift/[id]/actions";
import { editRecipeMessages } from "@/lib/messages";
import { sourceLabel } from "@/lib/source-label";
import IngredientList from "./IngredientList";
import RecipeActions from "./RecipeActions";
import StepList from "./StepList";
import styles from "./RecipeView.module.css";

/**
 * Oppskriften i fast format (FR-5, UX-DR15): tittel, kilde, porsjonsvelger,
 * ingredienser per seksjon og nummererte steg. Serverkomponent; porsjonsvelger og
 * skalering ligger i klientkomponenten `IngredientList`, og stegene (med avkrysning) i
 * klientkomponenten `StepList`. Fra 768 px står
 * porsjonsvelger og ingredienser til venstre og stegene til høyre. Nederst står
 * lagre-linjen (`RecipeActions`, Story 3.2); Server Actions bindes til oppskriftens id her.
 * `folders` er mappene å velge mellom i «Lagre i mappe» (Story 3.3); oppskriftens egen mappe er
 * `recipe.folderId`.
 */
export default function RecipeView({ recipe, folders }: { recipe: Recipe; folders: Folder[] }) {
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
          selectedServings={recipe.selectedServings}
          // Valgt antall huskes bare for oppskrifter i samlingen.
          onServingsChange={
            recipe.savedAt !== null ? rememberServings.bind(null, recipe.id) : undefined
          }
        />

        <StepList key={`steg-${recipe.id}-${recipe.updatedAt}`} steps={recipe.steps} />
      </div>

      <RecipeActions
        title={recipe.title}
        saved={recipe.savedAt !== null}
        onSave={saveRecipe.bind(null, recipe.id)}
        onDelete={removeRecipe.bind(null, recipe.id)}
        folders={folders}
        folderId={recipe.folderId}
        onMoveToFolder={moveToFolder.bind(null, recipe.id)}
        onMoveToNewFolder={moveToNewFolder.bind(null, recipe.id)}
        isFavorite={recipe.isFavorite}
        onSetFavorite={setFavorite.bind(null, recipe.id)}
      />
    </article>
  );
}
