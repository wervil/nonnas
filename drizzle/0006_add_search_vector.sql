ALTER TABLE recipes
ADD COLUMN search_vector tsvector
  GENERATED ALWAYS AS (
    to_tsvector(
      'english',
      coalesce(country, '') || ' ' ||
      coalesce(region, '') || ' ' ||
      coalesce(recipe, '') || ' ' ||
      coalesce(history, '')
    )
  ) STORED;

CREATE INDEX recipes_search_idx ON recipes USING GIN (search_vector); 