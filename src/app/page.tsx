import styles from "./page.module.css";

export default function ImporterPage() {
  return (
    <section className={styles.intro}>
      <h1>Hent en oppskrift</h1>
      <p className={styles.lead}>
        Lim inn en lenke til en oppskrift, så henter RecipeMate ingrediensene og stegene og viser
        dem i et fast og ryddig format. Der kan du velge hvor mange personer du lager mat til.
      </p>
    </section>
  );
}
