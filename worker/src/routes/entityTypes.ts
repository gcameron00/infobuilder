import { Hono } from 'hono'
import type { Env, EntityType, FieldDefinition, Entity } from '../types'

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

  const id = c.req.param('id')

  // field_definitions has no FK on parent_type_id, so clean up manually.
  // relationship_types references entity_types without ON DELETE CASCADE, so
  // we must delete those first (they cascade to relationship instances).
  await c.env.DB.prepare(`
    DELETE FROM field_definitions
    WHERE parent_type = 'relationship_type'
      AND parent_type_id IN (
        SELECT id FROM relationship_types
        WHERE source_entity_type_id = ? OR target_entity_type_id = ?
      )
  `).bind(id, id).run()

  await c.env.DB.prepare(
    'DELETE FROM relationship_types WHERE source_entity_type_id = ? OR target_entity_type_id = ?'
  ).bind(id, id).run()

  await c.env.DB.prepare(
    "DELETE FROM field_definitions WHERE parent_type = 'entity_type' AND parent_type_id = ?"
  ).bind(id).run()

  await c.env.DB.prepare('DELETE FROM entity_types WHERE id = ?').bind(id).run()
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

// ── Entities (list by type, for flat view) ─────────────────────────────────────

entityTypes.get('/:id/entities', async (c) => {
  const et = await c.env.DB.prepare('SELECT id FROM entity_types WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!et) return c.json({ error: 'Not found' }, 404)

  const limit   = Math.min(parseInt(c.req.query('limit')  ?? '50',  10), 200)
  const offset  = Math.max(parseInt(c.req.query('offset') ?? '0',   10), 0)
  const search  = c.req.query('search')?.trim() ?? ''
  const sortRaw = c.req.query('sort') ?? ''
  const sortDir = c.req.query('dir') === 'desc' ? 'DESC' : 'ASC'

  // Validate sort field name (alphanum/underscore only) then confirm it exists in schema.
  let orderClause = 'rowid'
  if (sortRaw && /^[a-zA-Z0-9_]+$/.test(sortRaw)) {
    const fieldOk = await c.env.DB.prepare(
      "SELECT id FROM field_definitions WHERE parent_type = 'entity_type' AND parent_type_id = ? AND name = ? LIMIT 1"
    ).bind(c.req.param('id'), sortRaw).first()
    if (fieldOk) orderClause = `json_extract(field_values, '$.${sortRaw}')`
  }

  const searchClause = search ? ' AND field_values LIKE ?' : ''
  const baseBinds: unknown[] = [c.req.param('id')]
  if (search) baseBinds.push(`%${search}%`)

  const { results } = await c.env.DB.prepare(
    `SELECT * FROM entities WHERE entity_type_id = ?${searchClause} ORDER BY ${orderClause} ${sortDir} LIMIT ? OFFSET ?`
  ).bind(...baseBinds, limit, offset).all<Entity>()

  const count = await c.env.DB.prepare(
    `SELECT COUNT(*) AS n FROM entities WHERE entity_type_id = ?${searchClause}`
  ).bind(...baseBinds).first<{ n: number }>()

  return c.json({
    results: results.map(e => ({ ...e, field_values: JSON.parse(e.field_values) })),
    total: count?.n ?? 0,
    limit,
    offset,
  })
})

export default entityTypes
