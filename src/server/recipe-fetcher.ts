import "server-only";
import { createFixtureFetcher } from "./adapters/fixture-fetcher";
import { createHttpFetcher } from "./adapters/http-fetcher";
import { config } from "./config";
import type { RecipeSourceFetcher } from "./ports/recipe-source-fetcher";

/**
 * Velger adapter for henting av oppskriftssider (AD-9): `IMPORT_SOURCE=fixtures` gir de lagrede
 * sidene (demo og ende-til-ende-tester), ellers den ekte HTTP-henteren. Henteren lages uten
 * valg, så adressebeskyttelsen kan ikke skrus av herfra.
 */
export function getRecipeFetcher(importSource: string = config.importSource): RecipeSourceFetcher {
  return importSource === "fixtures" ? createFixtureFetcher() : createHttpFetcher();
}
