CREATE TYPE "public"."thread_scope" AS ENUM('country', 'state');--> statement-breakpoint
CREATE TABLE "conversations" (
	"id" serial PRIMARY KEY NOT NULL,
	"user1_id" text NOT NULL,
	"user1_name" text,
	"user2_id" text NOT NULL,
	"user2_name" text,
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "likes" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"likeable_id" integer NOT NULL,
	"likeable_type" text NOT NULL,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"conversation_id" integer,
	"sender_id" text NOT NULL,
	"content" text,
	"attachment_url" text,
	"attachment_type" text,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" serial PRIMARY KEY NOT NULL,
	"thread_id" integer NOT NULL,
	"parent_post_id" integer,
	"user_id" text NOT NULL,
	"author_name" text,
	"content" text NOT NULL,
	"depth" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"attachments" json
);
--> statement-breakpoint
CREATE TABLE "recipe_comments" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"parent_comment_id" integer,
	"user_id" text NOT NULL,
	"author_name" text,
	"content" text NOT NULL,
	"depth" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"attachments" json
);
--> statement-breakpoint
CREATE TABLE "threads" (
	"id" serial PRIMARY KEY NOT NULL,
	"region" text NOT NULL,
	"scope" "thread_scope" NOT NULL,
	"title" text NOT NULL,
	"content" text NOT NULL,
	"user_id" text NOT NULL,
	"author_name" text,
	"view_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now(),
	"attachments" json
);
--> statement-breakpoint
ALTER TABLE "recipes" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(recipe_title, '') || ' ' || coalesce(region, '') || ' ' || coalesce(history, '') || ' ' || coalesce(recipe, '') || ' ' || coalesce(geo_history, ''))) STORED;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "user_id" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "city" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "coordinates" text;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "avatar_image" text;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_conversations_id_fk" FOREIGN KEY ("conversation_id") REFERENCES "public"."conversations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_thread_id_threads_id_fk" FOREIGN KEY ("thread_id") REFERENCES "public"."threads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_parent_post_id_posts_id_fk" FOREIGN KEY ("parent_post_id") REFERENCES "public"."posts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_comments" ADD CONSTRAINT "recipe_comments_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "recipe_comments" ADD CONSTRAINT "recipe_comments_parent_comment_id_recipe_comments_id_fk" FOREIGN KEY ("parent_comment_id") REFERENCES "public"."recipe_comments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "unique_conversation_pair" ON "conversations" USING btree ("user1_id","user2_id");