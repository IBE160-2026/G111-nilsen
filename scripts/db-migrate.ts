/**
 * `npm run db:migrate`: oppretter databasen (og mappen) ved behov og kjører
 * migrasjonene i `drizzle/`. Appen gjør det samme automatisk ved første bruk.
 */
import { config } from "../src/server/config";
import { openDatabase } from "../src/server/db/migrate";

const db = openDatabase(config.databasePath);
db.$client.close();
console.log(`Databasen er klar: ${config.databasePath}`);
