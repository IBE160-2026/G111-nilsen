"use client";

import Link from "next/link";
import { useId, useState, useSyncExternalStore } from "react";
import { homeMessages as m } from "@/lib/messages";
import {
  HIDDEN_SHORTCUTS_EVENT,
  parseHiddenShortcuts,
  readHiddenShortcutsRaw,
  writeHiddenShortcuts,
} from "@/lib/hidden-shortcuts";
import styles from "./HomeShortcuts.module.css";

type Shortcut = { href: string; title: string };

function subscribe(onChange: () => void): () => void {
  window.addEventListener(HIDDEN_SHORTCUTS_EVENT, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(HIDDEN_SHORTCUTS_EVENT, onChange);
    window.removeEventListener("storage", onChange);
  };
}

/**
 * «Og dessuten»-raden på forsiden (Story 6.18b, 6.31b). «Tilpass» åpner en liste med avkrysning
 * for hver snarvei; valget huskes på enheten. Serveren og første visning viser alle, så siden
 * er den samme uten JavaScript.
 */
export default function HomeShortcuts({ shortcuts }: { shortcuts: readonly Shortcut[] }) {
  const raw = useSyncExternalStore(subscribe, readHiddenShortcutsRaw, () => null);
  const hidden = parseHiddenShortcuts(raw);
  const [editing, setEditing] = useState(false);
  const panelId = useId();
  const visible = shortcuts.filter((s) => !hidden.includes(s.href));

  function toggle(href: string, show: boolean) {
    const rest = hidden.filter((h) => h !== href);
    writeHiddenShortcuts(show ? rest : [...rest, href]);
  }

  return (
    <>
      <div className={styles.head}>
        <h3 className={styles.heading}>{m.shortcutsLabel}</h3>
        <button
          type="button"
          className={styles.customize}
          aria-expanded={editing}
          aria-controls={panelId}
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? m.customizeDone : m.customize}
        </button>
      </div>
      {editing ? (
        <fieldset id={panelId} className={styles.panel}>
          <legend className={styles.legend}>{m.customizeLegend}</legend>
          {shortcuts.map((s) => (
            <label key={s.href} className={styles.option}>
              <input
                type="checkbox"
                checked={!hidden.includes(s.href)}
                onChange={(event) => toggle(s.href, event.target.checked)}
              />
              {s.title}
            </label>
          ))}
        </fieldset>
      ) : null}
      {visible.length > 0 ? (
        <ul role="list" className={styles.list}>
          {visible.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className={styles.shortcut}>
                {s.title}
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.none}>{m.noShortcuts}</p>
      )}
    </>
  );
}
