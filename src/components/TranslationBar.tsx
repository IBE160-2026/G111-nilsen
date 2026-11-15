"use client";

import { useState, useTransition } from "react";
import type { ActionResult } from "@/app/_shared/action-result";
import { translationMessages as m } from "@/lib/messages";
import styles from "./TranslationBar.module.css";

type Props = {
  /** Finnes det en oversettelse som passer oppskriften? */
  hasTranslation: boolean;
  /** Vises den norske versjonen nå? */
  norwegian: boolean;
  onTranslate: () => Promise<ActionResult>;
  onShow: (norwegian: boolean) => Promise<ActionResult>;
};

/**
 * Språkvalget på oppskriftssiden (Story 6.36b). En oppskrift som ser engelsk ut får «Oversett til
 * norsk»; når en oversettelse finnes, byttes det mellom «Original» og «Norsk» (lagret, så ingen ny
 * oversettelse trengs). Siden revalideres av handlingene og viser den valgte versjonen. Ved feil
 * vises meldingen, og resten av siden virker som før.
 */
export default function TranslationBar({ hasTranslation, norwegian, onTranslate, onShow }: Props) {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function run(action: () => Promise<ActionResult>) {
    setMessage(null);
    startTransition(async () => {
      try {
        const result = await action();
        if (!result.ok) setMessage(result.message);
      } catch {
        setMessage("Noe gikk galt. Prøv igjen.");
      }
    });
  }

  return (
    <div className={styles.root} data-print="hide">
      {hasTranslation ? (
        <div role="group" aria-label={m.groupLabel} className={styles.group}>
          <button
            type="button"
            className={styles.option}
            aria-pressed={!norwegian}
            aria-disabled={pending}
            onClick={() => !pending && run(() => onShow(false))}
          >
            {m.original}
          </button>
          <button
            type="button"
            className={styles.option}
            aria-pressed={norwegian}
            aria-disabled={pending}
            onClick={() => !pending && run(() => onShow(true))}
          >
            {m.norwegian}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className={styles.translate}
          aria-disabled={pending}
          onClick={() => !pending && run(onTranslate)}
        >
          {m.translate}
        </button>
      )}
      <p role="status" className={styles.status}>
        {pending ? m.pending : (message ?? "")}
      </p>
    </div>
  );
}
