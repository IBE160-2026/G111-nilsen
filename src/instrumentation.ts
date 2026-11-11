/** Hvor ofte oppskrifter som aldri ble lagret ryddes bort mens appen kjører. */
export const PURGE_INTERVAL_MS = 60 * 60 * 1000;

const globalForPurge = globalThis as typeof globalThis & { __recipematePurgeTimer?: unknown };

/**
 * Kjører `purge` med en gang og deretter hver time. Tidtakeren `unref()`-es, så den ikke
 * holder prosessen i live, og et flagg på `globalThis` hindrer at den registreres to ganger
 * (hot reload i utvikling). Feil logges og stopper verken appen eller senere kjøringer.
 */
export function schedulePurge(purge: () => unknown): void {
  if (globalForPurge.__recipematePurgeTimer) return;

  const run = () => {
    try {
      const result = purge();
      if (typeof result === "object" && result !== null && "ok" in result && !result.ok) {
        console.error("Kunne ikke rydde bort ulagrede oppskrifter", result);
      }
    } catch (error) {
      console.error("Kunne ikke rydde bort ulagrede oppskrifter", error);
    }
  };

  run();
  const timer = setInterval(run, PURGE_INTERVAL_MS);
  timer.unref?.();
  globalForPurge.__recipematePurgeTimer = timer;
}

/**
 * Kalles én gang når Next-serveren starter (Story 3.2). Bare i Node.js-kjøretiden, siden
 * databasen (better-sqlite3) ikke finnes i Edge. Importen er dynamisk av samme grunn.
 * Rydding skjer aldri ved visning av en side.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { purgeDeletedRecipes, purgeStaleUnsavedRecipes } =
    await import("./server/services/recipe-service");
  // Ulagrede oppskrifter etter et døgn, og slettede oppskrifter etter 7 dager (Story 6.11).
  schedulePurge(() => {
    purgeDeletedRecipes();
    return purgeStaleUnsavedRecipes();
  });
}
