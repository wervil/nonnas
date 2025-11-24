-- First, update the search_vector to use the new columns instead of fullName
ALTER TABLE "recipes" DROP COLUMN "search_vector";--> statement-breakpoint

-- Add the new search_vector column with the correct generated expression
ALTER TABLE "recipes" ADD COLUMN "search_vector" "tsvector" GENERATED ALWAYS AS (to_tsvector('simple', coalesce(country, '') || ' ' || coalesce(region, '') || ' ' || coalesce(history, '') || ' ' || coalesce(recipe, '') || ' ' || coalesce(geo_history, ''))) STORED;--> statement-breakpoint

-- Now we can safely drop the fullName column
ALTER TABLE "recipes" DROP COLUMN "fullName";--> statement-breakpoint

-- Update the published column default (if needed)
ALTER TABLE "recipes" ALTER COLUMN "published" SET DEFAULT false;
