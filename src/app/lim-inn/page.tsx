import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import LoginRequired from "@/components/LoginRequired";
import PasteRecipe from "@/components/PasteRecipe";
import { pasteMessages as m } from "@/lib/messages";
import { currentUserId } from "@/server/session";
import { saveManualRecipe } from "../ny/actions";
import styles from "../importer/page.module.css";

export const metadata: Metadata = { title: m.tabTitle };

/**
 * Lim inn tekst, `/lim-inn` (Story 6.14). Overskriften står utenfor Suspense. Utkastet lagres med
 * den samme handlingen som «Legg inn selv», så det krever innlogging.
 */
export default function PastePage() {
  return (
    <section className={styles.intro}>
      <h1>{m.heading}</h1>
      <p className={styles.lead}>{m.lead}</p>
      <Suspense fallback={<p>{m.loading}</p>}>
        <PasteOrLogin />
      </Suspense>
    </section>
  );
}

async function PasteOrLogin() {
  await connection();
  if ((await currentUserId()) === null) return <LoginRequired next="/lim-inn" />;
  return <PasteRecipe action={saveManualRecipe} />;
}
