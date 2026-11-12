import type { Metadata } from "next";
import { Suspense } from "react";
import AccountForm from "@/components/AccountForm";
import AccountFormExtras from "@/components/AccountFormExtras";
import { safeNextPath } from "@/lib/account-input";
import { accountMessages as m } from "@/lib/messages";
import { registerAccount } from "../account-actions";
import styles from "../ny/page.module.css";

export const metadata: Metadata = { title: m.registerHeading };

type SearchParams = Promise<{ neste?: string | string[] }>;

/** Siden «Lag en konto» (Story 5.13). `?neste=/sti` sender brukeren dit etterpå. */
export default function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className={styles.root}>
      <header className={styles.intro}>
        <h1>{m.registerHeading}</h1>
        <p className={styles.lead}>{m.registerLead}</p>
      </header>
      <AccountForm
        mode="register"
        action={registerAccount}
        extras={
          <Suspense fallback={<AccountFormExtras mode="register" next="/" />}>
            <RegisterExtras searchParams={searchParams} />
          </Suspense>
        }
      />
    </div>
  );
}

/** Skjult «neste» og bytte-lenken, lest fra adressen (se `AccountFormExtras`). */
async function RegisterExtras({ searchParams }: { searchParams: SearchParams }) {
  const { neste } = await searchParams;
  return <AccountFormExtras mode="register" next={safeNextPath(neste)} />;
}
