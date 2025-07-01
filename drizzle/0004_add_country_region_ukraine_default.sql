-- Add country column with default value 'Ukraine'
ALTER TABLE "recipes" ADD COLUMN "country" text NOT NULL DEFAULT 'Ukraine';

-- Add region column
ALTER TABLE "recipes" ADD COLUMN "region" text; 