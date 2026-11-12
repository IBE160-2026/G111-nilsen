"use client";

import { useEffect } from "react";
import { clearOfflineList } from "@/lib/offline-list";

/**
 * Står i toppmenyen når ingen er innlogget (Story 6.17) og sletter handlelisten som er lagret i
 * nettleseren, så den ikke blir liggende på en delt telefon etter utlogging. Gjør ingenting uten
 * nett: «Du er frakoblet»-siden er lagret med menyen slik den så ut da den ble hentet (kanskje
 * utlogget), og må ikke slette listen den selv skal vise.
 */
export default function ClearOfflineListOnLogout() {
  useEffect(() => {
    if (!navigator.onLine) return;
    clearOfflineList();
  }, []);
  return null;
}
