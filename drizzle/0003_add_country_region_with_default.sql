-- Add country column with default value 'UA'
ALTER TABLE "recipes" ADD COLUMN "country" text NOT NULL DEFAULT 'UA';

-- Add region column
ALTER TABLE "recipes" ADD COLUMN "region" text; 