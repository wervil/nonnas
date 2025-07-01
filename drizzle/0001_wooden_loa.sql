ALTER TABLE "recipes" ALTER COLUMN "history" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "user_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "fullName" text NOT NULL;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "photo" text[];--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "recipe_image" text[];--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "dish_image" text[];--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "release_signature" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "recipes" ADD COLUMN "published" boolean DEFAULT true;--> statement-breakpoint
ALTER TABLE "recipes" DROP COLUMN "title";