CREATE TYPE "public"."thread_scope" AS ENUM('country', 'state');--> statement-breakpoint
ALTER TABLE "threads" ADD COLUMN "scope" "thread_scope" NOT NULL;