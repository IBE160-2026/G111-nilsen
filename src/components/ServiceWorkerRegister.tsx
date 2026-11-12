"use client";

import { useEffect } from "react";

/**
 * Registrerer service workeren (Story 6.16) i produksjonsbygg. Feiler registreringen (for
 * eksempel i privat modus), fungerer appen som før; den bare ikke kan installeres frakoblet.
 */
export default function ServiceWorkerRegister({ enabled }: { enabled: boolean }) {
  useEffect(() => {
    if (!enabled || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {});
  }, [enabled]);
  return null;
}
