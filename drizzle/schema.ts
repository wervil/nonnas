import { pgTable, serial, text, integer, timestamp, uniqueIndex, foreignKey, boolean, pgEnum, customType } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

// Custom type for PostgreSQL tsvector
const tsvector = customType<{ data: string }>({
	dataType() {
		return "tsvector";
	},
});

export const paymentStatus = pgEnum("payment_status", ['processing', 'succeeded', 'requires_payment_method', 'requires_action', 'requires_capture', 'canceled'])


export const payments = pgTable("payments", {
	id: serial().primaryKey().notNull(),
	userId: text("user_id").notNull(),
	amount: integer().notNull(),
	status: paymentStatus().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
});

export const recipeTranslations = pgTable("recipe_translations", {
	id: serial().primaryKey().notNull(),
	recipeId: integer("recipe_id").notNull(),
	lang: text().notNull(),
	history: text(),
	geoHistory: text("geo_history"),
	recipe: text(),
	influences: text(),
}, (table) => [
	uniqueIndex("recipe_id_lang_unique").using("btree", table.recipeId.asc().nullsLast().op("int4_ops"), table.lang.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.recipeId],
			foreignColumns: [recipes.id],
			name: "recipe_translations_recipe_id_recipes_id_fk"
		}),
]);

export const recipes = pgTable("recipes", {
	id: serial().primaryKey().notNull(),
	// userId: text("user_id"),
	history: text().notNull(),
	geoHistory: text("geo_history"),
	recipe: text().notNull(),
	influences: text(),
	photo: text().array(),
	published: boolean().default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow(),
	country: text().notNull(),
	region: text(),
	recipeImage: text("recipe_image").array(),
	dishImage: text("dish_image").array(),
	releaseSignature: boolean("release_signature").default(false),
	// TODO: failed to parse database type 'tsvector'
	searchVector: tsvector("search_vector").generatedAlwaysAs(sql`to_tsvector('simple'::regconfig, ((((((((COALESCE(country, ''::text) || ' '::text) || COALESCE(region, ''::text)) || ' '::text) || COALESCE(history, ''::text)) || ' '::text) || COALESCE(recipe, ''::text)) || ' '::text) || COALESCE(geo_history, ''::text)))`),
	grandmotherTitle: text("grandmother_title").notNull(),
	firstName: text("first_name").notNull(),
	lastName: text("last_name").notNull(),
	recipeTitle: text("recipe_title").notNull(),
	traditions: text(),
	directions: text().notNull(),
});
