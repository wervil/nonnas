import {
  boolean,
  pgTable,
  serial,
  text,
  timestamp,
  pgEnum,
  integer,
  uniqueIndex,
  // type PgTableWithColumns,
  type PgColumn,
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

// ============================================
// PHASE C: SOCIAL FEATURES
// ============================================

// Threads table - Regional discussions
export const threads = pgTable('threads', {
  id: serial('id').primaryKey(),
  region: text('region').notNull(),
  category: text('category').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  user_id: text('user_id').notNull(),
  view_count: integer('view_count').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export type Thread = InferSelectModel<typeof threads>
export type NewThread = InferInsertModel<typeof threads>

// Posts table - Nested replies to threads
export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  thread_id: integer('thread_id')
    .notNull()
    .references(() => threads.id, { onDelete: 'cascade' }),
  parent_post_id: integer('parent_post_id').references(
    (): PgColumn => posts.id,
    {
      onDelete: 'cascade',
    }
  ),
  user_id: text('user_id').notNull(),
  content: text('content').notNull(),
  depth: integer('depth').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export type Post = InferSelectModel<typeof posts>
export type NewPost = InferInsertModel<typeof posts>

// Recipe comments table - Comments on individual recipes
export const recipe_comments = pgTable('recipe_comments', {
  id: serial('id').primaryKey(),
  recipe_id: integer('recipe_id')
    .notNull()
    .references(() => recipes.id, { onDelete: 'cascade' }),
  parent_comment_id: integer('parent_comment_id').references(
    (): PgColumn => recipe_comments.id,
    { onDelete: 'cascade' }
  ),
  user_id: text('user_id').notNull(),
  content: text('content').notNull(),
  depth: integer('depth').default(0),
  created_at: timestamp('created_at').defaultNow(),
  updated_at: timestamp('updated_at').defaultNow(),
})

export type RecipeComment = InferSelectModel<typeof recipe_comments>
export type NewRecipeComment = InferInsertModel<typeof recipe_comments>

// Likes table - Polymorphic likes for threads, posts, and comments
export const likes = pgTable('likes', {
  id: serial('id').primaryKey(),
  user_id: text('user_id').notNull(),
  likeable_id: integer('likeable_id').notNull(),
  likeable_type: text('likeable_type').notNull(), // 'thread', 'post', or 'comment'
  created_at: timestamp('created_at').defaultNow(),
})

export type Like = InferSelectModel<typeof likes>
export type NewLike = InferInsertModel<typeof likes>