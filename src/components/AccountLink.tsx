import Link from "next/link";
import { logOutAccount } from "@/app/account-actions";
import { accountMessages as m } from "@/lib/messages";
import { currentUser } from "@/server/session";
import styles from "./AccountLink.module.css";

/**
 * «Logg inn» eller «Logg ut» i toppmenyen (Story 5.13). Leser cookien, så den står i en egen
 * Suspense-grense i layouten.
 */
export default async function AccountLink() {
  const user = await currentUser();
  if (user === null) {
    return (
      <Link href="/logg-inn" className={styles.link}>
        {m.login}
      </Link>
    );
  }
  return (
    <form action={logOutAccount} className={styles.form}>
      <span className={styles.email} title={m.signedInAs(user.email)}>
        <span className="visually-hidden">{m.signedInAs("")}</span>
        {user.email}
      </span>
      <button type="submit" className={styles.link}>
        {m.logout}
      </button>
    </form>
  );
}
