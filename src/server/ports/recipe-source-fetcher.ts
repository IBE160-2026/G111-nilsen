import type { AppError, Result } from "@/lib/result";

/** Det en henting gir: HTML-teksten og adressen den faktisk ble hentet fra (etter omdirigeringer). */
export type FetchedPage = { html: string; finalUrl: string };

/**
 * Port for å hente en oppskriftsside (AD-4). Produksjon bruker HTTP-adapteren; tester og demo
 * bruker fixture-adapteren. Porten kaster aldri. Feil er `fetch_failed` (nettverk, tidsavbrudd,
 * HTTP-status 400 og over, blokkert adresse, for mange omdirigeringer, uleselig svar) eller
 * `no_recipe` (200 OK, men svaret er ikke HTML).
 */
export interface RecipeSourceFetcher {
  fetch(url: string): Promise<Result<FetchedPage, AppError>>;
}
