/**
 * `npm run db:migrate`: oppretter databasen (og mappen) ved behov og kjører
 * migrasjonene i `drizzle/`. Appen gjør det samme automatisk ved første bruk.
 *
 * `.env` og `.env.local` lastes først, slik Next gjør, så `DATABASE_PATH` gjelder
 * også her. Config importeres derfor dynamisk, etter at miljøet er lastet.
 */
import { loadEnvConfig } from "@next/env";

async function main() {
  loadEnvConfig(process.cwd());
  const { config } = await import("../src/server/config");
  const { openDatabase } = await import("../src/server/db/migrate");

  const db = openDatabase(config.databasePath);
  db.$client.close();
  console.log(`Databasen er klar: ${config.databasePath}`);
}

main().catch((error) => {
  console.error("Kunne ikke migrere databasen:", error);
  process.exitCode = 1;
});
