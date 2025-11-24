import { relations } from "drizzle-orm/relations";
import { recipes, recipeTranslations } from "./schema";

export const recipeTranslationsRelations = relations(recipeTranslations, ({one}) => ({
	recipe: one(recipes, {
		fields: [recipeTranslations.recipeId],
		references: [recipes.id]
	}),
}));

export const recipesRelations = relations(recipes, ({many}) => ({
	recipeTranslations: many(recipeTranslations),
}));