import { defineConfig } from "drizzle-kit";

// Brukes bare av `npm run db:generate`; migrasjonene kjøres av appen og `npm run db:migrate`.
export default defineConfig({
  dialect: "sqlite",
  schema: "./src/server/db/schema.ts",
  out: "./drizzle",
});
