/**
 * Eneste sted i appen som leser miljøvariabler (AD-9).
 * Appen skal starte uten .env; alle verdier har trygge standarder eller er valgfrie.
 */

export type ImportSource = "http" | "fixtures";

/** Hvilken leverandør som lager forslag (AD-5): `mock` uten nøkkel, ellers `llm`. */
export type SuggestionMode = "mock" | "llm";

export type Config = {
  /** API-nøkkel (Anthropic) for forslag (Epic 4). Valgfri – kjernefunksjonene virker uten. */
  llmApiKey: string | undefined;
  /** Modellnavn for forslag. Valgfri; adapteren har en billig standardmodell. */
  llmModel: string | undefined;
  /** `mock` når `LLM_API_KEY` mangler, ellers `llm`. */
  suggestionMode: SuggestionMode;
  /** Sti til SQLite-fila. */
  databasePath: string;
  /**
   * Hvor oppskriftssider hentes fra: `http` (standard, nettet) eller `fixtures` (lagrede sider i
   * `test/fixtures/`, for demo og ende-til-ende-tester). Alt annet er `http`.
   */
  importSource: ImportSource;
  /** True i produksjonsbygg (`NODE_ENV=production`). */
  isProduction: boolean;
};

export const DEFAULT_DATABASE_PATH = "data/recipemate.db";

type Env = Record<string, string | undefined>;

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function loadConfig(env: Env = process.env): Config {
  const llmApiKey = optional(env.LLM_API_KEY);
  return {
    llmApiKey,
    llmModel: optional(env.LLM_MODEL),
    suggestionMode: llmApiKey ? "llm" : "mock",
    databasePath: optional(env.DATABASE_PATH) ?? DEFAULT_DATABASE_PATH,
    importSource: optional(env.IMPORT_SOURCE)?.toLowerCase() === "fixtures" ? "fixtures" : "http",
    isProduction: env.NODE_ENV === "production",
  };
}

export const config: Config = loadConfig();
