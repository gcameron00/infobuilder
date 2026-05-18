import { Hono } from 'hono'
import type { Env, Relationship } from '../types'
import { validateFieldValues } from '../lib/validate'

const relationships = new Hono<{ Bindings: Env }>()

relationships.post('/', async (c) => {
  const body = await c.req.json<{
    relationship_type_id?: string
    source_entity_id?: string
    target_entity_id?: string
    field_values?: Record<string, unknown>
  }>()

  if (!body.relationship_type_id) return c.json({ error: 'relationship_type_id is required' }, 400)
  if (!body.source_entity_id)     return c.json({ error: 'source_entity_id is required' }, 400)
  if (!body.target_entity_id)     return c.json({ error: 'target_entity_id is required' }, 400)

  const rt = await c.env.DB.prepare('SELECT * FROM relationship_types WHERE id = ?')
    .bind(body.relationship_type_id)
    .first<{ id: string; source_entity_type_id: string; target_entity_type_id: string }>()
  if (!rt) return c.json({ error: 'relationship_type_id not found' }, 400)

  const source = await c.env.DB.prepare('SELECT id, entity_type_id FROM entities WHERE id = ?')
    .bind(body.source_entity_id).first<{ id: string; entity_type_id: string }>()
  if (!source) return c.json({ error: 'source_entity_id not found' }, 400)
  if (source.entity_type_id !== rt.source_entity_type_id)
    return c.json({ error: 'source entity type does not match this relationship type' }, 400)

  const target = await c.env.DB.prepare('SELECT id, entity_type_id FROM entities WHERE id = ?')
    .bind(body.target_entity_id).first<{ id: string; entity_type_id: string }>()
  if (!target) return c.json({ error: 'target_entity_id not found' }, 400)
  if (target.entity_type_id !== rt.target_entity_type_id)
    return c.json({ error: 'target entity type does not match this relationship type' }, 400)

  const fieldValues = body.field_values ?? {}
  const errors = await validateFieldValues(c.env.DB, 'relationship_type', body.relationship_type_id, fieldValues)
  if (errors.length) return c.json({ error: 'Validation failed', errors }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO relationships (id, relationship_type_id, source_entity_id, target_entity_id, field_values) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, body.relationship_type_id, body.source_entity_id, body.target_entity_id, JSON.stringify(fieldValues)).run()

  return c.json({ id, relationship_type_id: body.relationship_type_id, source_entity_id: body.source_entity_id, target_entity_id: body.target_entity_id, field_values: fieldValues }, 201)
})

relationships.get('/:id', async (c) => {
  const rel = await c.env.DB.prepare('SELECT * FROM relationships WHERE id = ?')
    .bind(c.req.param('id')).first<Relationship>()
  if (!rel) return c.json({ error: 'Not found' }, 404)
  return c.json({ ...rel, field_values: JSON.parse(rel.field_values) })
})

relationships.put('/:id', async (c) => {
  const rel = await c.env.DB.prepare('SELECT id, relationship_type_id FROM relationships WHERE id = ?')
    .bind(c.req.param('id')).first<Relationship>()
  if (!rel) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json<{ field_values?: Record<string, unknown> }>()
  const fieldValues = body.field_values ?? {}

  const errors = await validateFieldValues(c.env.DB, 'relationship_type', rel.relationship_type_id, fieldValues)
  if (errors.length) return c.json({ error: 'Validation failed', errors }, 400)

  await c.env.DB.prepare('UPDATE relationships SET field_values = ? WHERE id = ?')
    .bind(JSON.stringify(fieldValues), c.req.param('id')).run()

  return c.json({ id: rel.id, relationship_type_id: rel.relationship_type_id, source_entity_id: rel.source_entity_id, target_entity_id: rel.target_entity_id, field_values: fieldValues })
})

relationships.delete('/:id', async (c) => {
  const rel = await c.env.DB.prepare('SELECT id FROM relationships WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!rel) return c.json({ error: 'Not found' }, 404)

  await c.env.DB.prepare('DELETE FROM relationships WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

export default relationships
