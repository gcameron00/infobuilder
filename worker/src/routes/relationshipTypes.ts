import { Hono } from 'hono'
import type { Env, RelationshipType, FieldDefinition } from '../types'

const relationshipTypes = new Hono<{ Bindings: Env }>()

relationshipTypes.get('/:id', async (c) => {
  const rt = await c.env.DB.prepare('SELECT * FROM relationship_types WHERE id = ?')
    .bind(c.req.param('id')).first<RelationshipType>()
  if (!rt) return c.json({ error: 'Not found' }, 404)

  const { results: fields } = await c.env.DB.prepare(
    "SELECT * FROM field_definitions WHERE parent_type = 'relationship_type' AND parent_type_id = ? ORDER BY display_order"
  ).bind(c.req.param('id')).all<FieldDefinition>()

  return c.json({ ...rt, fields })
})

relationshipTypes.put('/:id', async (c) => {
  const existing = await c.env.DB.prepare('SELECT id, store_id FROM relationship_types WHERE id = ?')
    .bind(c.req.param('id')).first<{ id: string; store_id: string }>()
  if (!existing) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json<{
    name?: string
    source_entity_type_id?: string
    target_entity_type_id?: string
    inverse_label?: string | null
    directed?: boolean
    config?: Record<string, unknown>
  }>()

  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  if (!body.source_entity_type_id) return c.json({ error: 'source_entity_type_id is required' }, 400)
  if (!body.target_entity_type_id) return c.json({ error: 'target_entity_type_id is required' }, 400)

  const source = await c.env.DB.prepare(
    'SELECT id FROM entity_types WHERE id = ? AND store_id = ?'
  ).bind(body.source_entity_type_id, existing.store_id).first()
  if (!source) return c.json({ error: 'source_entity_type_id not found in this store' }, 400)

  const target = await c.env.DB.prepare(
    'SELECT id FROM entity_types WHERE id = ? AND store_id = ?'
  ).bind(body.target_entity_type_id, existing.store_id).first()
  if (!target) return c.json({ error: 'target_entity_type_id not found in this store' }, 400)

  await c.env.DB.prepare(
    `UPDATE relationship_types
     SET name = ?, source_entity_type_id = ?, target_entity_type_id = ?,
         inverse_label = ?, directed = ?, config = ?
     WHERE id = ?`
  ).bind(
    body.name.trim(),
    body.source_entity_type_id,
    body.target_entity_type_id,
    body.inverse_label?.trim() ?? null,
    body.directed !== false ? 1 : 0,
    JSON.stringify(body.config ?? {}),
    c.req.param('id')
  ).run()

  const updated = await c.env.DB.prepare('SELECT * FROM relationship_types WHERE id = ?')
    .bind(c.req.param('id')).first<RelationshipType>()
  return c.json(updated)
})

relationshipTypes.delete('/:id', async (c) => {
  const rt = await c.env.DB.prepare('SELECT id FROM relationship_types WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!rt) return c.json({ error: 'Not found' }, 404)

  const id = c.req.param('id')

  // field_definitions has no FK on parent_type_id — clean up manually before
  // deleting the relationship type (which cascades to relationship instances).
  await c.env.DB.prepare(
    "DELETE FROM field_definitions WHERE parent_type = 'relationship_type' AND parent_type_id = ?"
  ).bind(id).run()

  await c.env.DB.prepare('DELETE FROM relationship_types WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// ── Fields ────────────────────────────────────────────────────────────────────

relationshipTypes.get('/:id/fields', async (c) => {
  const rt = await c.env.DB.prepare('SELECT id FROM relationship_types WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!rt) return c.json({ error: 'Not found' }, 404)

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM field_definitions WHERE parent_type = 'relationship_type' AND parent_type_id = ? ORDER BY display_order"
  ).bind(c.req.param('id')).all<FieldDefinition>()
  return c.json(results)
})

relationshipTypes.post('/:id/fields', async (c) => {
  const rt = await c.env.DB.prepare('SELECT id FROM relationship_types WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!rt) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json<{
    name?: string
    data_type?: string
    required?: boolean
    display_order?: number
  }>()
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  if (!body.data_type?.trim()) return c.json({ error: 'data_type is required' }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO field_definitions (id, parent_type, parent_type_id, name, data_type, required, display_order)
     VALUES (?, 'relationship_type', ?, ?, ?, ?, ?)`
  ).bind(id, c.req.param('id'), body.name.trim(), body.data_type.trim(), body.required ? 1 : 0, body.display_order ?? 0).run()

  const field = await c.env.DB.prepare('SELECT * FROM field_definitions WHERE id = ?')
    .bind(id).first<FieldDefinition>()
  return c.json(field, 201)
})

export default relationshipTypes
