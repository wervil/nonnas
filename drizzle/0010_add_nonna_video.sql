-- Adds a dedicated column for the optional "Video of Nonna in the kitchen".
-- Backfill: existing recipes that stored a video URL inside recipe_image
-- (legacy behaviour) have it moved into nonna_video and removed from
-- recipe_image so the recipe page only renders still images.

ALTER TABLE "recipes" ADD COLUMN IF NOT EXISTS "nonna_video" text;
--> statement-breakpoint

UPDATE "recipes"
SET "nonna_video" = sub.video_url,
    "recipe_image" = (
      SELECT COALESCE(array_agg(elem), ARRAY[]::text[])
      FROM unnest("recipe_image") AS elem
      WHERE elem !~* '\.(mp4|webm|mov|m4v|ogg)(\?.*)?$'
    )
FROM (
  SELECT id,
         (
           SELECT elem
           FROM unnest("recipe_image") AS elem
           WHERE elem ~* '\.(mp4|webm|mov|m4v|ogg)(\?.*)?$'
           LIMIT 1
         ) AS video_url
  FROM "recipes"
) AS sub
WHERE "recipes".id = sub.id
  AND sub.video_url IS NOT NULL
  AND ("recipes"."nonna_video" IS NULL OR "recipes"."nonna_video" = '');
