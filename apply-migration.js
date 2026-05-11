const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function applyMigration() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Add country and region columns
    await client.query(`
      ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "country" text NOT NULL DEFAULT 'Ukraine';
    `);
    console.log('Added country column');

    await client.query(`
      ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "region" text;
    `);
    console.log('Added region column');

    // --- Soft-delete support ---
    await client.query(`
      ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "deleted_at" timestamp;
    `);
    console.log('Added deleted_at column');

    await client.query(`
      ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "deleted_by" text;
    `);
    console.log('Added deleted_by column');

    // Index for fast trash queries
    await client.query(`
      CREATE INDEX IF NOT EXISTS "recipes_deleted_at_idx" ON "recipes" ("deleted_at");
    `);
    console.log('Created deleted_at index');

    // --- Draft support ---
    await client.query(`
      ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "is_draft" boolean DEFAULT false;
    `);
    console.log('Added is_draft column');

    // --- Dedicated "Video of Nonna in the kitchen" support ---
    await client.query(`
      ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "nonna_video" text;
    `);
    console.log('Added nonna_video column');

    // Backfill: move any legacy video URL out of recipe_image into nonna_video
    await client.query(`
      UPDATE "recipes"
      SET "nonna_video" = sub.video_url,
          "recipe_image" = (
            SELECT COALESCE(array_agg(elem), ARRAY[]::text[])
            FROM unnest("recipe_image") AS elem
            WHERE elem !~* '\\.(mp4|webm|mov|m4v|ogg)(\\?.*)?$'
          )
      FROM (
        SELECT id,
               (
                 SELECT elem
                 FROM unnest("recipe_image") AS elem
                 WHERE elem ~* '\\.(mp4|webm|mov|m4v|ogg)(\\?.*)?$'
                 LIMIT 1
               ) AS video_url
        FROM "recipes"
      ) AS sub
      WHERE "recipes".id = sub.id
        AND sub.video_url IS NOT NULL
        AND ("recipes"."nonna_video" IS NULL OR "recipes"."nonna_video" = '');
    `);
    console.log('Backfilled nonna_video from legacy recipe_image entries');

    console.log('Migration applied successfully!');
  } catch (error) {
    console.error('Error applying migration:', error);
  } finally {
    await client.end();
  }
}

applyMigration(); 