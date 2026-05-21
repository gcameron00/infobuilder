-- Add optional icon slug to entity types.
-- NULL means no icon set — the graph view falls back to the plain coloured dot.
-- The value is a slug identifier (e.g. "user", "building-2"), not a path or URL.
-- The frontend resolves the slug to an asset at render time.

ALTER TABLE entity_types ADD COLUMN icon TEXT;
