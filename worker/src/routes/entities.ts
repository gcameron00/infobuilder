import { Hono } from 'hono'
import type { Env, Entity } from '../types'
import { validateFieldValues } from '../lib/validate'

const entities = new Hono<{ Bindings: Env }>()

entities.get('/:id', async (c) => {
  const entity = await c.env.DB.prepare('SELECT * FROM entities WHERE id = ?')
    .bind(c.req.param('id')).first<Entity>()
  if (!entity) return c.json({ error: 'Not found' }, 404)
  return c.json({ ...entity, field_values: JSON.parse(entity.field_values) })
})

entities.put('/:id', async (c) => {
  const entity = await c.env.DB.prepare('SELECT id, entity_type_id FROM entities WHERE id = ?')
    .bind(c.req.param('id')).first<Entity>()
  if (!entity) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json<{ field_values?: Record<string, unknown> }>()
  const fieldValues = body.field_values ?? {}

  const errors = await validateFieldValues(c.env.DB, 'entity_type', entity.entity_type_id, fieldValues)
  if (errors.length) return c.json({ error: 'Validation failed', errors }, 400)

  await c.env.DB.prepare('UPDATE entities SET field_values = ? WHERE id = ?')
    .bind(JSON.stringify(fieldValues), c.req.param('id')).run()

  return c.json({ id: entity.id, entity_type_id: entity.entity_type_id, field_values: fieldValues })
})

entities.delete('/:id', async (c) => {
  const entity = await c.env.DB.prepare('SELECT id FROM entities WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!entity) return c.json({ error: 'Not found' }, 404)

  const id = c.req.param('id')
  await c.env.DB.prepare(
    'DELETE FROM relationships WHERE source_entity_id = ? OR target_entity_id = ?'
  ).bind(id, id).run()
  await c.env.DB.prepare('DELETE FROM entities WHERE id = ?').bind(id).run()
  return c.json({ ok: true })
})

// All relationships touching this entity, with type info and the related entity's data.
// Used by the document view to show the full neighbourhood of an entity.
entities.get('/:id/relationships', async (c) => {
  const entity = await c.env.DB.prepare('SELECT id FROM entities WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!entity) return c.json({ error: 'Not found' }, 404)

  const id = c.req.param('id')

  const { results } = await c.env.DB.prepare(`
    SELECT
      r.id,
      r.relationship_type_id,
      r.source_entity_id,
      r.target_entity_id,
      r.field_values,
      rt.name            AS rel_type_name,
      rt.inverse_label,
      rt.directed,
      CASE WHEN r.source_entity_id = ?1 THEN 'outgoing' ELSE 'incoming' END AS direction,
      CASE WHEN r.source_entity_id = ?1 THEN r.target_entity_id ELSE r.source_entity_id END AS related_entity_id,
      e.entity_type_id   AS related_entity_type_id,
      e.field_values     AS related_entity_field_values
    FROM relationships r
    JOIN relationship_types rt ON rt.id = r.relationship_type_id
    JOIN entities e ON e.id = CASE WHEN r.source_entity_id = ?1 THEN r.target_entity_id ELSE r.source_entity_id END
    WHERE r.source_entity_id = ?1 OR r.target_entity_id = ?1
    ORDER BY rt.name
  `).bind(id).all<Record<string, unknown>>()

  const parsed = results.map(row => ({
    ...row,
    field_values: JSON.parse((row.field_values as string) || '{}'),
    related_entity_field_values: JSON.parse((row.related_entity_field_values as string) || '{}'),
  }))

  return c.json(parsed)
})

export default entities
