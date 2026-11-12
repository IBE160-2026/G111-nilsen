import type { Metadata } from "next";
import { Suspense } from "react";
import AccountForm from "@/components/AccountForm";
import AccountFormExtras from "@/components/AccountFormExtras";
import { safeNextPath } from "@/lib/account-input";
import { accountMessages as m } from "@/lib/messages";
import { logInAccount } from "../account-actions";
import styles from "../ny/page.module.css";

export const metadata: Metadata = { title: m.loginHeading };

type SearchParams = Promise<{ neste?: string | string[] }>;

/** Innloggingssiden (Story 5.13). `?neste=/sti` sender brukeren dit etterpå. */
export default function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <h1>{m.loginHeading}</h1>
        <p className={styles.lead}>{m.loginLead}</p>
      </header>
      <AccountForm
        mode="login"
        action={logInAccount}
        extras={
          <Suspense fallback={<AccountFormExtras mode="login" next="/" />}>
            <LoginExtras searchParams={searchParams} />
          </Suspense>
        }
      />
    </div>
  );
}

/** Skjult «neste» og bytte-lenken, lest fra adressen (se `AccountFormExtras`). */
async function LoginExtras({ searchParams }: { searchParams: SearchParams }) {
  const { neste } = await searchParams;
  return <AccountFormExtras mode="login" next={safeNextPath(neste)} />;
}
