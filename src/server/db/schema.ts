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
  /** Brukerens egen vurdering av hvem oppskriften passer til, for eksempel «2 sultne» (Story 6.6b); `null` = ingen. */
  fitsFor: text("fits_for"),
  /** Brukerens egen vurdering, 1–5 stjerner (Story 6.8); `null` = ikke vurdert. */
  rating: integer("rating"),
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
 * Ukemenyen (Story 6.4): en oppskrift på en dag, for et antall porsjoner. Slettes med brukeren og
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
    /** Antall porsjoner, hele og halve (som valgt antall). Lagres som tall i SQLite. */
    servings: real("servings").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [index("meal_plan_user_day_idx").on(table.userId, table.day)],
);

/**
 * Avkrysninger i handlelisten for en uke i ukemenyen (Story 6.4c): hvilke varer (`key`, som i
 * handlelisten) brukeren har krysset av for uka som starter på `week` (mandag, «YYYY-MM-DD»).
 */
export const weekChecks = sqliteTable(
  "week_checks",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    week: text("week").notNull(),
    itemKey: text("item_key").notNull(),
  },
  (table) => [uniqueIndex("week_checks_unique_idx").on(table.userId, table.week, table.itemKey)],
);

/**
 * Lagret handleliste (Story 6.4g): et navn og de valgte oppskriftene med porsjoner. Samme navn
 * (etter normalisering) per bruker er samme liste og erstattes ved ny lagring.
 */
export const shoppingLists = sqliteTable(
  "shopping_lists",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameKey: text("name_key").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("shopping_lists_user_name_key_unique").on(table.userId, table.nameKey)],
);

/** Oppskriftene i en lagret handleliste. Slettes med listen og med oppskriften. */
export const shoppingListItems = sqliteTable(
  "shopping_list_items",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    listId: integer("list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    servings: real("servings").notNull(),
  },
  (table) => [uniqueIndex("shopping_list_items_unique_idx").on(table.listId, table.recipeId)],
);

/**
 * Nylig slettede oppskrifter (Story 6.11): et øyeblikksbilde (`snapshot`, JSON) av oppskriften med
 * innhold, mappe, merkelapper, forslag og plass i ukemeny og handlelister. Slettes av eieren, etter
 * en uke og med brukeren.
 */
export const deletedRecipes = sqliteTable(
  "deleted_recipes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: integer("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    deletedAt: text("deleted_at").notNull(),
    snapshot: text("snapshot").notNull(),
  },
  (table) => [index("deleted_recipes_user_idx").on(table.userId, table.deletedAt)],
);

/**
 * Merkelapper på en lagret oppskrift (Story 6.7), for eksempel «hverdag» eller «vegetar».
 * `labelKey` er navnet normalisert (NFC + små bokstaver); samme merkelapp finnes bare én gang per
 * oppskrift. Slettes med oppskriften.
 */
export const recipeLabels = sqliteTable(
  "recipe_labels",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    labelKey: text("label_key").notNull(),
  },
  (table) => [uniqueIndex("recipe_labels_unique_idx").on(table.recipeId, table.labelKey)],
);

/**
 * Deling av samlingen (Story 6.19): eieren inviterer en annen konto, som ser oppskriftene når
 * invitasjonen er godtatt. `status` er «pending» til mottakeren svarer. Raden slettes når en av
 * kontoene slettes, og samme par finnes bare én gang.
 */
export const shares = sqliteTable(
  "shares",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    ownerId: integer("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().$type<"pending" | "accepted">(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("shares_owner_member_unique").on(table.ownerId, table.memberId),
    index("shares_member_idx").on(table.memberId, table.status),
  ],
);

/**
 * Hver gang en oppskrift er laget (Story 6.24b): ett tidspunkt per trykk på «Laget i dag», så
 * statistikken kan vise en periode. `cookedCount` og `lastCookedAt` på oppskriften er fortsatt
 * sannheten for «i alt»; denne loggen følger dem, og slettes sammen med oppskriften.
 */
export const cookedLog = sqliteTable(
  "cooked_log",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    recipeId: integer("recipe_id")
      .notNull()
      .references(() => recipes.id, { onDelete: "cascade" }),
    cookedAt: text("cooked_at").notNull(),
  },
  (table) => [
    index("cooked_log_recipe_idx").on(table.recipeId),
    index("cooked_log_at_idx").on(table.cookedAt),
  ],
);
