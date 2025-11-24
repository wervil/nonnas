ALTER TABLE recipes DROP COLUMN search_vector;

ALTER TABLE recipes ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'simple',
      coalesce(fullName, '') || ' ' ||
      coalesce(country, '') || ' ' ||
      coalesce(region, '') || ' ' ||
      coalesce(history, '') || ' ' ||
      coalesce(recipe, '')
    )
  ) STORED;

CREATE INDEX recipes_search_idx ON recipes USING GIN (search_vector); 