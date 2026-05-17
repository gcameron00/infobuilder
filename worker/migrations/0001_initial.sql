-- Info Builder initial schema

CREATE TABLE stores (
  id          TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  description TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE entity_types (
  id           TEXT PRIMARY KEY,
  store_id     TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  display_name TEXT NOT NULL
);

CREATE TABLE relationship_types (
  id                     TEXT PRIMARY KEY,
  store_id               TEXT NOT NULL REFERENCES stores(id) ON DELETE CASCADE,
  name                   TEXT NOT NULL,
  source_entity_type_id  TEXT NOT NULL REFERENCES entity_types(id),
  target_entity_type_id  TEXT NOT NULL REFERENCES entity_types(id),
  inverse_label          TEXT,
  directed               INTEGER NOT NULL DEFAULT 1,
  config                 TEXT NOT NULL DEFAULT '{}'
);

-- Provides the enumerable schema behind field_values on both entities and relationships.
-- parent_type is either 'entity_type' or 'relationship_type'.
CREATE TABLE field_definitions (
  id            TEXT PRIMARY KEY,
  parent_type   TEXT NOT NULL CHECK (parent_type IN ('entity_type', 'relationship_type')),
  parent_type_id TEXT NOT NULL,
  name          TEXT NOT NULL,
  data_type     TEXT NOT NULL,
  required      INTEGER NOT NULL DEFAULT 0,
  display_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE entities (
  id             TEXT PRIMARY KEY,
  entity_type_id TEXT NOT NULL REFERENCES entity_types(id) ON DELETE CASCADE,
  field_values   TEXT NOT NULL DEFAULT '{}'
);

CREATE TABLE relationships (
  id                   TEXT PRIMARY KEY,
  relationship_type_id TEXT NOT NULL REFERENCES relationship_types(id) ON DELETE CASCADE,
  source_entity_id     TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  target_entity_id     TEXT NOT NULL REFERENCES entities(id) ON DELETE CASCADE,
  field_values         TEXT NOT NULL DEFAULT '{}'
);

-- Indexes on the most common foreign key lookups
CREATE INDEX idx_entity_types_store         ON entity_types(store_id);
CREATE INDEX idx_relationship_types_store   ON relationship_types(store_id);
CREATE INDEX idx_field_definitions_parent   ON field_definitions(parent_type, parent_type_id);
CREATE INDEX idx_entities_type             ON entities(entity_type_id);
CREATE INDEX idx_relationships_type        ON relationships(relationship_type_id);
CREATE INDEX idx_relationships_source      ON relationships(source_entity_id);
CREATE INDEX idx_relationships_target      ON relationships(target_entity_id);
