"use client";

import { useMemo, useSyncExternalStore } from "react";
import {
  OFFLINE_LIST_EVENT,
  parseOfflineList,
  readOfflineListRaw,
  withChecked,
  writeOfflineList,
} from "@/lib/offline-list";
import { offlineListMessages as m } from "@/lib/messages";
import CheckRow from "./CheckRow";
import styles from "./OfflineShoppingList.module.css";

function subscribe(onChange: () => void): () => void {
  window.addEventListener(OFFLINE_LIST_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(OFFLINE_LIST_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

function formatUpdated(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("nb-NO", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Den sist sette handlelisten uten nett (Story 6.17): varene fra utdraget i nettleseren, med
 * avkrysning som huskes der. Uten utdrag står det hvordan man får det.
 */
export default function OfflineShoppingList() {
  const raw = useSyncExternalStore(subscribe, readOfflineListRaw, () => null);
  const list = useMemo(() => parseOfflineList(raw), [raw]);

  if (list === null) {
    return <p className={styles.hint}>{m.empty}</p>;
  }
  const checked = new Set(list.checked);
  const left = list.items.filter((item) => !checked.has(item.key)).length;

  return (
    <section aria-labelledby="frakoblet-handleliste" className={styles.root}>
      <h2 id="frakoblet-handleliste">
        {m.heading}
        {list.title !== "" ? ` · ${list.title}` : ""}
      </h2>
      <p className={styles.hint}>{m.lead(formatUpdated(list.savedAt))}</p>
      <p className={styles.count} role="status" aria-live="polite">
        {m.remaining(left, list.items.length)}
      </p>
      <ul role="list" className={styles.items}>
        {list.items.map((item) => (
          <CheckRow
            key={item.key}
            checked={checked.has(item.key)}
            onToggle={() => writeOfflineList(withChecked(list, item.key, !checked.has(item.key)))}
          >
            <span className={styles.itemText}>{item.text}</span>
            {item.from !== "" ? (
              <span className={styles.from}>
                {m.from} {item.from}
              </span>
            ) : null}
          </CheckRow>
        ))}
      </ul>
      <p className={styles.hint}>{m.checkHint}</p>
    </section>
  );
}
