import type { ReactNode } from "react";
import styles from "./ErrorMessage.module.css";

type Props = {
  /** Kobles til feltet med `aria-describedby`. */
  id?: string;
  title: string;
  body: string;
  /** Veien videre: lenker eller knapper (for eksempel «Legg inn selv»). */
  children?: ReactNode;
};

/**
 * Feilmeldingen (UX-DR8): kort med 4 px venstrekant i aksentfarge, tittel i halvfet og én
 * forklarende setning. `role="alert"` gjør at skjermleseren leser den opp når den dukker opp.
 * Ingen rød helfylt boks: kanten og teksten bærer meldingen, ikke fargen alene.
 */
export default function ErrorMessage({ id, title, body, children }: Props) {
  return (
    <div id={id} role="alert" className={styles.root}>
      <p className={styles.title}>{title}</p>
      <p className={styles.body}>{body}</p>
      {children ? <div className={styles.actions}>{children}</div> : null}
    </div>
  );
}
