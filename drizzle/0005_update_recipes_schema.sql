-- Ensure all columns exist and have correct types/defaults
ALTER TABLE "recipes" ALTER COLUMN "user_id" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "fullName" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "country" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "history" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "recipe" SET NOT NULL;
ALTER TABLE "recipes" ALTER COLUMN "release_signature" SET DEFAULT false;
ALTER TABLE "recipes" ALTER COLUMN "published" SET DEFAULT false;
ALTER TABLE "recipes" ALTER COLUMN "created_at" SET DEFAULT now();

-- Add missing columns if not exist
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='region') THEN
        ALTER TABLE "recipes" ADD COLUMN "region" text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='geo_history') THEN
        ALTER TABLE "recipes" ADD COLUMN "geo_history" text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='influences') THEN
        ALTER TABLE "recipes" ADD COLUMN "influences" text;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='photo') THEN
        ALTER TABLE "recipes" ADD COLUMN "photo" text[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='recipe_image') THEN
        ALTER TABLE "recipes" ADD COLUMN "recipe_image" text[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='recipes' AND column_name='dish_image') THEN
        ALTER TABLE "recipes" ADD COLUMN "dish_image" text[];
    END IF;
END $$; 