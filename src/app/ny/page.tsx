import type { Metadata } from "next";
import ManualRecipeForm from "@/components/ManualRecipeForm";
import { saveManualRecipe } from "./actions";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Legg inn selv" };

export default function NewRecipePage() {
  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <h1>Legg inn en oppskrift</h1>
        <p className={styles.lead}>
          Skriv tittel, antall personer, ingredienser og steg. Oppskriften vises etterpå i fast
          format.
        </p>
      </header>
      <ManualRecipeForm action={saveManualRecipe} />
    </div>
  );
}
