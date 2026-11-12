import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";
import LoginRequired from "@/components/LoginRequired";
import ShareManager from "@/components/ShareManager";
import { shareMessages as m } from "@/lib/messages";
import { listSharesIShare, listSharesWithMe } from "@/server/services/share-service";
import { currentUserId } from "@/server/session";
import { acceptShareInvitation, invitePerson, stopSharing } from "./actions";
import styles from "../list-page.module.css";

export const metadata: Metadata = { title: m.tabTitle };

/**
 * Deling, `/delt` (Story 6.19). Overskriften står utenfor Suspense; delingene leses inne i
 * grensen, etter `connection()`.
 */
export default function SharePage() {
  return (
    <div className={styles.root}>
      <h1>{m.heading}</h1>
      <p>{m.lead}</p>
      <Suspense fallback={<p className={styles.loading}>{m.loading}</p>}>
        <ShareLoader />
      </Suspense>
    </div>
  );
}

async function ShareLoader() {
  await connection();
  const userId = await currentUserId();
  if (userId === null) return <LoginRequired next="/delt" />;

  const mine = listSharesIShare(userId);
  const theirs = listSharesWithMe(userId);
  if (!mine.ok) throw new Error(mine.error.kind);
  if (!theirs.ok) throw new Error(theirs.error.kind);

  return (
    <ShareManager
      mine={mine.value}
      theirs={theirs.value}
      onInvite={invitePerson}
      onAccept={acceptShareInvitation}
      onStop={stopSharing}
    />
  );
}
