CREATE TYPE "public"."payment_status" AS ENUM('processing', 'succeeded', 'requires_payment_method', 'requires_action', 'requires_capture', 'canceled');--> statement-breakpoint
DO $$ BEGIN
    CREATE TABLE "payments" (
        "id" serial PRIMARY KEY NOT NULL,
        "user_id" text NOT NULL,
        "amount" integer NOT NULL,
        "status" "payment_status" NOT NULL,
        "created_at" timestamp DEFAULT now()
    );
EXCEPTION
    WHEN duplicate_table THEN
        -- Table already exists, convert amount column type
        ALTER TABLE "payments" ALTER COLUMN "amount" TYPE integer USING amount::integer;
END $$;--> statement-breakpoint
--> statement-breakpoint
CREATE TABLE "recipe_translations" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipe_id" integer NOT NULL,
	"lang" text NOT NULL,
	"history" text,
	"geo_history" text,
	"recipe" text,
	"influences" text
);
--> statement-breakpoint
ALTER TABLE "recipe_translations" ADD CONSTRAINT "recipe_translations_recipe_id_recipes_id_fk" FOREIGN KEY ("recipe_id") REFERENCES "public"."recipes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "recipe_id_lang_unique" ON "recipe_translations" USING btree ("recipe_id","lang");