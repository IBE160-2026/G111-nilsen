import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import LoginRequired from "@/components/LoginRequired";
import ManualRecipeForm from "@/components/ManualRecipeForm";
import { currentUserId } from "@/server/session";
import { saveManualRecipe } from "./actions";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Legg inn selv" };

export default function NewRecipePage() {
  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <h1>Legg inn en oppskrift</h1>
        <p className={styles.lead}>
          Skriv tittel, antall porsjoner, ingredienser og steg. Oppskriften vises etterpå i fast
          format.
        </p>
      </header>
      <Suspense>
        <FormOrLogin />
      </Suspense>
    </div>
  );
}

/** Oppskriften lagres rett i samlingen, så skjemaet krever innlogging (Story 5.13). */
async function FormOrLogin() {
  await connection();
  if ((await currentUserId()) === null) return <LoginRequired next="/ny" />;
  return <ManualRecipeForm action={saveManualRecipe} />;
}
