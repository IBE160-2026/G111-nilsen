import type { Recipe } from "@/domain";
import IngredientList from "./IngredientList";
import styles from "./RecipeView.module.css";

/** Kilden som vises: navnet, ellers vertsnavnet fra lenken, ellers «Lagt inn selv». */
export function sourceLabel(recipe: Pick<Recipe, "sourceName" | "sourceUrl">): string {
  const name = recipe.sourceName?.trim();
  if (name) return name;
  if (recipe.sourceUrl) {
    try {
      return new URL(recipe.sourceUrl).hostname.replace(/^www\./, "");
    } catch {
      // Ugyldig lenke: vis reserveteksten.
    }
  }
  return "Lagt inn selv";
}

/**
 * Oppskriften i fast format (FR-5, UX-DR15): tittel, kilde, porsjonsvelger,
 * ingredienser per seksjon og nummererte steg. Serverkomponent; porsjonsvelger og
 * skalering ligger i klientkomponenten `IngredientList`. Fra 768 px står
 * porsjonsvelger og ingredienser til venstre og stegene til høyre.
 */
export default function RecipeView({ recipe }: { recipe: Recipe }) {
  return (
    <article className={styles.root}>
      <header className={styles.header}>
        <h1>{recipe.title}</h1>
        <p className={styles.meta}>{sourceLabel(recipe)}</p>
      </header>

      <div className={styles.columns}>
        <IngredientList
          key={recipe.id}
          ingredients={recipe.ingredients}
          originalServings={recipe.originalServings}
        />

        {recipe.steps.length > 0 ? (
          <section className={styles.card} aria-labelledby="fremgangsmate">
            <h2 id="fremgangsmate">Slik gjør du</h2>
            <ol className={styles.steps}>
              {[...recipe.steps]
                .sort((a, b) => a.position - b.position)
                .map((step) => (
                  <li key={step.id}>{step.text}</li>
                ))}
            </ol>
          </section>
        ) : null}
      </div>
    </article>
  );
}
