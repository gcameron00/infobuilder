-- Covering index for the per-field-name lookup used when validating sort parameters
CREATE INDEX IF NOT EXISTS idx_field_definitions_lookup
  ON field_definitions(parent_type, parent_type_id, name);

-- Speeds up the timeline endpoint which filters field_definitions by data_type
CREATE INDEX IF NOT EXISTS idx_field_definitions_data_type
  ON field_definitions(parent_type, data_type);
