import { defineConfig, devices } from "@playwright/test";

/**
 * Ende-til-ende-tester (AD-11, NFR-2): bygger og starter appen med en midlertidig database, lagrede
 * oppskriftssider i stedet for nettet (`IMPORT_SOURCE=fixtures`) og uten språkmodellnøkkel
 * (eksempelforslag). Ingen test bruker nettverket. Port 3100, så en kjørende `npm run dev` på
 * 3000 ikke forstyrres (men `npm run build` bruker `.next`, så stopp `npm run dev` først).
 */
const PORT = 3100;
const E2E_DATABASE = ".e2e/recipemate.db";

/** Bare for maskiner der nettleseren ligger et annet sted enn Playwright forventer. */
const executablePath = process.env.E2E_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: ".e2e/resultater",
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    locale: "nb-NO",
    trace: "retain-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: "mobil-360",
      use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 780 } },
    },
    {
      name: "desktop-1280",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
  ],
  webServer: {
    command: `rm -rf .e2e && mkdir -p .e2e && npm run build && npx next start -p ${PORT} -H 127.0.0.1`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: false,
    timeout: 240_000,
    env: {
      DATABASE_PATH: E2E_DATABASE,
      IMPORT_SOURCE: "fixtures",
      LLM_API_KEY: "",
      LLM_MODEL: "",
      NODE_ENV: "production",
    },
  },
});
