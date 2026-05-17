-- Contacts demo store seed
-- Idempotent via INSERT OR IGNORE — safe to re-run.

-- Store
INSERT OR IGNORE INTO stores (id, name, description) VALUES
  ('01900000-0000-0000-0000-000000000001', 'Contacts', 'A personal CRM — people, organisations, and meetings.');

-- Entity types
INSERT OR IGNORE INTO entity_types (id, store_id, name, display_name) VALUES
  ('01900000-0000-0000-0000-000000000010', '01900000-0000-0000-0000-000000000001', 'person',       'Person'),
  ('01900000-0000-0000-0000-000000000011', '01900000-0000-0000-0000-000000000001', 'organisation', 'Organisation'),
  ('01900000-0000-0000-0000-000000000012', '01900000-0000-0000-0000-000000000001', 'meeting',      'Meeting');

-- Relationship types
INSERT OR IGNORE INTO relationship_types
  (id, store_id, name, source_entity_type_id, target_entity_type_id, inverse_label, directed) VALUES
  ('01900000-0000-0000-0000-000000000020', '01900000-0000-0000-0000-000000000001',
   'WorksFor',
   '01900000-0000-0000-0000-000000000010',
   '01900000-0000-0000-0000-000000000011',
   'Employs', 1),
  ('01900000-0000-0000-0000-000000000021', '01900000-0000-0000-0000-000000000001',
   'Knows',
   '01900000-0000-0000-0000-000000000010',
   '01900000-0000-0000-0000-000000000010',
   'KnownBy', 0),
  ('01900000-0000-0000-0000-000000000022', '01900000-0000-0000-0000-000000000001',
   'MetAt',
   '01900000-0000-0000-0000-000000000010',
   '01900000-0000-0000-0000-000000000012',
   NULL, 1);

-- Field definitions — Person
INSERT OR IGNORE INTO field_definitions (id, parent_type, parent_type_id, name, data_type, required, display_order) VALUES
  ('01900000-0000-0000-0000-000000000030', 'entity_type', '01900000-0000-0000-0000-000000000010', 'full_name', 'string', 1, 0),
  ('01900000-0000-0000-0000-000000000031', 'entity_type', '01900000-0000-0000-0000-000000000010', 'birthday',  'date',   0, 1),
  ('01900000-0000-0000-0000-000000000032', 'entity_type', '01900000-0000-0000-0000-000000000010', 'email',     'email',  0, 2),
  ('01900000-0000-0000-0000-000000000033', 'entity_type', '01900000-0000-0000-0000-000000000010', 'phone',     'phone',  0, 3),
  ('01900000-0000-0000-0000-000000000034', 'entity_type', '01900000-0000-0000-0000-000000000010', 'notes',     'text',   0, 4);

-- Field definitions — Organisation
INSERT OR IGNORE INTO field_definitions (id, parent_type, parent_type_id, name, data_type, required, display_order) VALUES
  ('01900000-0000-0000-0000-000000000040', 'entity_type', '01900000-0000-0000-0000-000000000011', 'name',     'string', 1, 0),
  ('01900000-0000-0000-0000-000000000041', 'entity_type', '01900000-0000-0000-0000-000000000011', 'industry', 'string', 0, 1),
  ('01900000-0000-0000-0000-000000000042', 'entity_type', '01900000-0000-0000-0000-000000000011', 'website',  'url',    0, 2);

-- Field definitions — Meeting
INSERT OR IGNORE INTO field_definitions (id, parent_type, parent_type_id, name, data_type, required, display_order) VALUES
  ('01900000-0000-0000-0000-000000000050', 'entity_type', '01900000-0000-0000-0000-000000000012', 'date',     'date',   1, 0),
  ('01900000-0000-0000-0000-000000000051', 'entity_type', '01900000-0000-0000-0000-000000000012', 'topic',    'string', 0, 1),
  ('01900000-0000-0000-0000-000000000052', 'entity_type', '01900000-0000-0000-0000-000000000012', 'location', 'string', 0, 2);

-- Field definitions — WorksFor relationship
INSERT OR IGNORE INTO field_definitions (id, parent_type, parent_type_id, name, data_type, required, display_order) VALUES
  ('01900000-0000-0000-0000-000000000060', 'relationship_type', '01900000-0000-0000-0000-000000000020', 'job_title',  'string', 0, 0),
  ('01900000-0000-0000-0000-000000000061', 'relationship_type', '01900000-0000-0000-0000-000000000020', 'start_date', 'date',   0, 1),
  ('01900000-0000-0000-0000-000000000062', 'relationship_type', '01900000-0000-0000-0000-000000000020', 'end_date',   'date',   0, 2);

-- Field definitions — Knows relationship
INSERT OR IGNORE INTO field_definitions (id, parent_type, parent_type_id, name, data_type, required, display_order) VALUES
  ('01900000-0000-0000-0000-000000000070', 'relationship_type', '01900000-0000-0000-0000-000000000021', 'since',   'date',   0, 0),
  ('01900000-0000-0000-0000-000000000071', 'relationship_type', '01900000-0000-0000-0000-000000000021', 'context', 'string', 0, 1);
