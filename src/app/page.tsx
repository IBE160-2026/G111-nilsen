import type { Metadata } from "next";
import Link from "next/link";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "Importer" };

export default function ImporterPage() {
  return (
    <section className={styles.intro}>
      <h1>Hent en oppskrift</h1>
      <p className={styles.lead}>
        Snart kan du lime inn en lenke til en oppskrift her. RecipeMate henter da ingrediensene og
        stegene og viser dem i et fast og ryddig format.
      </p>
      <p className={styles.manual}>
        Har du oppskriften selv?{" "}
        <Link href="/ny" className={styles.manualLink}>
          Legg inn selv
        </Link>
      </p>
    </section>
  );
}
