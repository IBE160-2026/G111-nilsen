import { formatQuantity, type Recipe, type RecipeLine } from "@/domain";
import styles from "./RecipeView.module.css";

function servingsText(servings: number): string {
  return servings === 1 ? "1 person" : `${servings} personer`;
}

function LineText({ line }: { line: RecipeLine }) {
  if (!line.parseable || line.quantity === null) {
    return <span className={styles.unparsed}>{line.original}</span>;
  }
  const amount = [formatQuantity(line.quantity), line.unit ?? ""].filter(Boolean).join(" ");
  return (
    <>
      <span className={styles.amount}>{amount}</span> <span>{line.name}</span>
    </>
  );
}

export default function RecipeView({ recipe }: { recipe: Recipe }) {
  return (
    <article className={styles.root}>
      <header className={styles.header}>
        <h1>{recipe.title}</h1>
        <p className={styles.meta}>
          {recipe.sourceName ?? "Lagt inn selv"}
          {recipe.originalServings !== null ? (
            <> · {servingsText(recipe.originalServings)}</>
          ) : null}
        </p>
      </header>

      <section className={styles.card} aria-labelledby="ingredienser">
        <h2 id="ingredienser">Ingredienser</h2>
        <ul className={styles.lines}>
          {recipe.ingredients.map((line) => (
            <li key={line.id} className={styles.line}>
              <LineText line={line} />
            </li>
          ))}
        </ul>
      </section>

      {recipe.steps.length > 0 ? (
        <section className={styles.card} aria-labelledby="fremgangsmate">
          <h2 id="fremgangsmate">Slik gjør du</h2>
          <ol className={styles.steps}>
            {recipe.steps.map((step) => (
              <li key={step.id}>{step.text}</li>
            ))}
          </ol>
        </section>
      ) : null}
    </article>
  );
}
