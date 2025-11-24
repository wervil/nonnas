import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  pgEnum,
  integer,
  uniqueIndex,
} from 'drizzle-orm/pg-core'
import { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { customType } from 'drizzle-orm/pg-core'
import { SQL, sql } from 'drizzle-orm'

export const tsvector = customType<{ data: string }>({
  dataType() {
    return 'tsvector'
  },
})

export const recipes = pgTable('recipes', {
  id: serial('id').primaryKey(),
  user_id: text('user_id'),
  grandmotherTitle: text('grandmother_title').notNull(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  recipeTitle: text('recipe_title').notNull(),
  country: text('country').notNull(),
  region: text('region'),
  history: text('history').notNull(),
  geo_history: text('geo_history'),
  recipe: text('recipe').notNull(),
  directions: text('directions').notNull(),
  traditions: text('traditions'),
  influences: text('influences'),
  photo: text('photo').array(),
  recipe_image: text('recipe_image').array(),
  dish_image: text('dish_image').array(),
  release_signature: boolean('release_signature').default(false),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  search_vector: tsvector('search_vector').generatedAlwaysAs(
    (): SQL =>
      sql`to_tsvector('simple', coalesce(recipe_title, '') || ' ' || coalesce(region, '') || ' ' || coalesce(history, '') || ' ' || coalesce(recipe, '') || ' ' || coalesce(geo_history, ''))`
  ),
})

export type Recipe = InferSelectModel<typeof recipes>

export type NewRecipe = InferInsertModel<typeof recipes>

export const paymentStatus = pgEnum('payment_status', [
  'processing',
  'succeeded',
  'requires_payment_method',
  'requires_action',
  'requires_capture',
  'canceled',
])

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  amount: integer('amount').notNull(),
  status: paymentStatus('status').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
})

export type Payment = InferSelectModel<typeof payments>

export type NewPayment = InferInsertModel<typeof payments>

export const recipe_translations = pgTable(
  'recipe_translations',
  {
    id: serial('id').primaryKey(),
    recipe_id: integer('recipe_id')
      .notNull()
      .references(() => recipes.id),
    lang: text('lang').notNull(),
    history: text('history'),
    geo_history: text('geo_history'),
    recipe: text('recipe'),
    influences: text('influences'),
  },
  (table) => [
    uniqueIndex('recipe_id_lang_unique').on(table.recipe_id, table.lang),
  ]
)

export type RecipeTranslation = InferSelectModel<typeof recipe_translations>
export type NewRecipeTranslation = InferInsertModel<typeof recipe_translations>
