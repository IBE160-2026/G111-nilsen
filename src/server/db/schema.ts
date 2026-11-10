import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * Eneste databaseskjema i appen (AD-6). Endringer gjøres her, og migrasjonen
 * genereres med `npm run db:generate` og committes i `drizzle/`.
 *
 * Tidspunkt lagres som ISO 8601-tekst i UTC. Originalen er fasit (AD-2): hver
 * ingredienslinje lagres med originaltekst og tolkede felt, aldri skalerte verdier.
 * Kolonner som kan mangle (f.eks. porsjonsantall ved import) er valgfrie.
 */

/**
 * Kontoer (Story 5.13). `email` er normalisert (trimmet, små bokstaver) og unik. `passwordHash` er
 * scrypt med eget salt per bruker (`scrypt$<salt>$<hash>`), aldri passordet selv.
 */
export const users = sqliteTable("users", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  createdAt: text("created_at").notNull(),
});

/**
 * Innloggingsøkter (Story 5.13). Nettleseren har et tilfeldig token i en httpOnly-cookie; her
 * lagres bare SHA-256 av tokenet, så en lekket database ikke gir innlogging.
 */
export const sessions = sqliteTable(
  "sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("sessions_user_idx").on(table.userId)],
);

/**
 * Mapper (Story 3.3). `name` er navnet slik brukeren skrev det (trimmet); `nameKey` er det
 * normaliserte navnet som sammenlignes (NFC + små bokstaver), og er unikt.
 */
export const folders = sqliteTable(
  "folders",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    createdAt: text("created_at").notNull(),
    /** Eieren (Story 5.13). Navnet er unikt per bruker. */
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("folders_user_name_key_unique").on(table.userId, table.nameKey)],
);

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  originalServings: integer("original_servings"),
  selectedServings: integer("selected_servings"),
  /** `null` = ikke i samlingen. */
  savedAt: text("saved_at"),
  /** `null` = ikke i noen mappe. Sletter man mappen, settes den til `null`. */
  folderId: integer("folder_id").references(() => folders.id, { onDelete: "set null" }),
  /** Favoritt (Story 3.4), uavhengig av mappe. Bare lagrede oppskrifter kan være favoritt. */
  isFavorite: integer("is_favorite", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
  /**
   * Eieren (Story 5.13). `null` = importert uten innlogging (ulagret, synlig for alle med lenken).
   * En lagret oppskrift har alltid eier, og bare eieren ser og endrer den.
   */
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  /** Hvor lang tid oppskriften tar, i minutter (Story 6.2); `null` = ikke oppgitt. */
  totalMinutes: integer("total_minutes"),
  /** Brukerens egne notater (Story 6.3); `null` = ingen. */
  notes: text("notes"),
  /** Sist brukeren trykket «Laget i dag» (Story 6.3), ISO-tid; `null` = aldri. */
  lastCookedAt: text("last_cooked_at"),
  /** Hvor mange ganger oppskriften er laget (Story 6.3). */
  cookedCount: integer("cooked_count").notNull().default(0),
});

export const ingredientLines = sqliteTable(
  "ingredient_lines",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    section: text("section"),
    originalText: text("original_text").notNull(),
    quantityMin: real("quantity_min"),
    quantityMax: real("quantity_max"),
    unit: text("unit"),
    name: text("name").notNull(),
    parseable: integer("parseable", { mode: "boolean" }).notNull(),
  },
  (table) => [index("ingredient_lines_recipe_idx").on(table.recipeId, table.position)],
);

export const steps = sqliteTable(
  "steps",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    section: text("section"),
    text: text("text").notNull(),
  },
  (table) => [index("steps_recipe_idx").on(table.recipeId, table.position)],
);

/**
 * Valgte forslag (Story 4.2, AD-5). Bare forslag brukeren har tatt i bruk lagres; «hopp over»
 * lagres aldri. Samme tekst kan bare tas i bruk én gang per oppskrift.
 */
export const suggestions = sqliteTable(
  "suggestions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    reason: text("reason").notNull(),
    appliesTo: text("applies_to").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [uniqueIndex("suggestions_recipe_text_unique").on(table.recipeId, table.text)],
);

/**
 * Ingredienser brukeren har hjemme (Story 5.8). De vises ikke på handlelisten. `name` er navnet
 * slik brukeren skrev det (trimmet); `nameKey` er det normaliserte navnet som sammenlignes
 * (NFC + små bokstaver), og er unikt.
 */
export const pantryItems = sqliteTable(
  "pantry_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    createdAt: text("created_at").notNull(),
    /** Eieren (Story 5.13). Navnet er unikt per bruker. */
    userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [uniqueIndex("pantry_items_user_name_key_unique").on(table.userId, table.nameKey)],
);

/**
 * Ukemenyen (Story 6.4): en oppskrift på en dag, for et antall personer. Slettes med brukeren og
 * med oppskriften.
 */
export const mealPlanEntries = sqliteTable(
  "meal_plan_entries",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    /** Dato «YYYY-MM-DD». */
    day: text("day").notNull(),
    /** Antall personer, hele og halve (som valgt antall). Lagres som tall i SQLite. */
    servings: real("servings").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("meal_plan_user_day_idx").on(table.userId, table.day)],
);
