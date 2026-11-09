import { index, integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Eneste databaseskjema i appen (AD-6). Endringer gjøres her, og migrasjonen
 * genereres med `npm run db:generate` og committes i `drizzle/`.
 *
 * Tidspunkt lagres som ISO 8601-tekst i UTC. Originalen er fasit (AD-2): hver
 * ingredienslinje lagres med originaltekst og tolkede felt, aldri skalerte verdier.
 * Kolonner som kan mangle (f.eks. porsjonsantall ved import) er valgfrie.
 */

export const recipes = sqliteTable("recipes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  title: text("title").notNull(),
  sourceUrl: text("source_url"),
  sourceName: text("source_name"),
  originalServings: integer("original_servings"),
  selectedServings: integer("selected_servings"),
  /** `null` = ikke i samlingen. */
  savedAt: text("saved_at"),
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
