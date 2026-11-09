import { describe, expect, it } from "vitest";
import { DEFAULT_DATABASE_PATH, loadConfig } from "./config";

describe("loadConfig", () => {
  it("fungerer uten miljøvariabler", () => {
    const config = loadConfig({});
    expect(config.llmApiKey).toBeUndefined();
    expect(config.llmModel).toBeUndefined();
    expect(config.databasePath).toBe(DEFAULT_DATABASE_PATH);
    expect(DEFAULT_DATABASE_PATH).toBe("data/recipemate.db");
  });

  it("leser verdiene når de er satt", () => {
    const config = loadConfig({
      LLM_API_KEY: "test-key",
      LLM_MODEL: "test-model",
      DATABASE_PATH: "/tmp/test.db",
    });
    expect(config).toEqual({
      llmApiKey: "test-key",
      llmModel: "test-model",
      databasePath: "/tmp/test.db",
      isProduction: false,
    });
  });

  it("vet om den kjører i produksjon", () => {
    expect(loadConfig({ NODE_ENV: "production" }).isProduction).toBe(true);
    expect(loadConfig({ NODE_ENV: "development" }).isProduction).toBe(false);
    expect(loadConfig({}).isProduction).toBe(false);
  });

  it("behandler tomme verdier som manglende", () => {
    const config = loadConfig({ LLM_API_KEY: "", LLM_MODEL: "  ", DATABASE_PATH: "" });
    expect(config.llmApiKey).toBeUndefined();
    expect(config.llmModel).toBeUndefined();
    expect(config.databasePath).toBe(DEFAULT_DATABASE_PATH);
  });
});
