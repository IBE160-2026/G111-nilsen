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
      suggestionMode: "llm",
      databasePath: "/tmp/test.db",
      importSource: "http",
      isProduction: false,
    });
  });

  it("velger mock for forslag uten nøkkel (også med tom eller blank nøkkel), ellers llm", () => {
    expect(loadConfig({}).suggestionMode).toBe("mock");
    expect(loadConfig({ LLM_API_KEY: "" }).suggestionMode).toBe("mock");
    expect(loadConfig({ LLM_API_KEY: "   " }).suggestionMode).toBe("mock");
    expect(loadConfig({ LLM_API_KEY: "test-key" }).suggestionMode).toBe("llm");
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

  it("IMPORT_SOURCE: http er standard, fixtures velger lagrede sider, alt annet er http", () => {
    expect(loadConfig({}).importSource).toBe("http");
    expect(loadConfig({ IMPORT_SOURCE: "" }).importSource).toBe("http");
    expect(loadConfig({ IMPORT_SOURCE: "fixtures" }).importSource).toBe("fixtures");
    expect(loadConfig({ IMPORT_SOURCE: " Fixtures " }).importSource).toBe("fixtures");
    expect(loadConfig({ IMPORT_SOURCE: "http" }).importSource).toBe("http");
    expect(loadConfig({ IMPORT_SOURCE: "ukjent" }).importSource).toBe("http");
  });
});
