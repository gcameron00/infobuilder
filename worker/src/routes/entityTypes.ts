import { Hono } from 'hono'
import type { Env, EntityType, FieldDefinition } from '../types'

const entityTypes = new Hono<{ Bindings: Env }>()

entityTypes.get('/:id', async (c) => {
  const et = await c.env.DB.prepare('SELECT * FROM entity_types WHERE id = ?')
    .bind(c.req.param('id')).first<EntityType>()
  if (!et) return c.json({ error: 'Not found' }, 404)

  const { results: fields } = await c.env.DB.prepare(
    "SELECT * FROM field_definitions WHERE parent_type = 'entity_type' AND parent_type_id = ? ORDER BY display_order"
  ).bind(c.req.param('id')).all<FieldDefinition>()

  return c.json({ ...et, fields })
})

entityTypes.put('/:id', async (c) => {
  const et = await c.env.DB.prepare('SELECT id FROM entity_types WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!et) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json<{ name?: string; display_name?: string }>()
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  if (!body.display_name?.trim()) return c.json({ error: 'display_name is required' }, 400)

  await c.env.DB.prepare(
    'UPDATE entity_types SET name = ?, display_name = ? WHERE id = ?'
  ).bind(body.name.trim(), body.display_name.trim(), c.req.param('id')).run()

  const updated = await c.env.DB.prepare('SELECT * FROM entity_types WHERE id = ?')
    .bind(c.req.param('id')).first<EntityType>()
  return c.json(updated)
})

entityTypes.delete('/:id', async (c) => {
  const et = await c.env.DB.prepare('SELECT id FROM entity_types WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!et) return c.json({ error: 'Not found' }, 404)

  await c.env.DB.prepare('DELETE FROM entity_types WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ── Fields ────────────────────────────────────────────────────────────────────

entityTypes.get('/:id/fields', async (c) => {
  const et = await c.env.DB.prepare('SELECT id FROM entity_types WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!et) return c.json({ error: 'Not found' }, 404)

  const { results } = await c.env.DB.prepare(
    "SELECT * FROM field_definitions WHERE parent_type = 'entity_type' AND parent_type_id = ? ORDER BY display_order"
  ).bind(c.req.param('id')).all<FieldDefinition>()
  return c.json(results)
})

entityTypes.post('/:id/fields', async (c) => {
  const et = await c.env.DB.prepare('SELECT id FROM entity_types WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!et) return c.json({ error: 'Not found' }, 404)

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
     VALUES (?, 'entity_type', ?, ?, ?, ?, ?)`
  ).bind(id, c.req.param('id'), body.name.trim(), body.data_type.trim(), body.required ? 1 : 0, body.display_order ?? 0).run()

  const field = await c.env.DB.prepare('SELECT * FROM field_definitions WHERE id = ?')
    .bind(id).first<FieldDefinition>()
  return c.json(field, 201)
})

export default entityTypes
