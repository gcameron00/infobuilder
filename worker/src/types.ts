export interface Env {
  DB: D1Database;
  API_SECRET: string | undefined;
}

export interface Store {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
}

export interface EntityType {
  id: string;
  store_id: string;
  name: string;
  display_name: string;
}

export interface RelationshipType {
  id: string;
  store_id: string;
  name: string;
  source_entity_type_id: string;
  target_entity_type_id: string;
  inverse_label: string | null;
  directed: number;
  config: string;
}

export interface FieldDefinition {
  id: string;
  parent_type: 'entity_type' | 'relationship_type';
  parent_type_id: string;
  name: string;
  data_type: string;
  required: number;
  display_order: number;
}
