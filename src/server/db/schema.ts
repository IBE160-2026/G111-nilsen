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
  },
  (table) => [uniqueIndex("folders_name_key_unique").on(table.nameKey)],
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
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
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
