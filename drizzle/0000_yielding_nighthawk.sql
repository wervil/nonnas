CREATE TABLE "recipes" (
	"id" serial PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"history" text,
	"geo_history" text,
	"recipe" text NOT NULL,
	"influences" text,
	"created_at" timestamp DEFAULT now()
);
