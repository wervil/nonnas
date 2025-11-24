ALTER TABLE "recipes" ALTER COLUMN "user_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" drop column "search_vector";--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(recipeTitle, '') || ' ' || coalesce(region, '') || ' ' || coalesce(history, '') || ' ' || coalesce(recipe, '') || ' ' || coalesce(geo_history, ''))) STORED;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "directions" text NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "traditions" text;