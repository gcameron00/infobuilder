import { Hono } from 'hono'
import type { Env, Store, EntityType, RelationshipType } from '../types'
import { validateFieldValues } from '../lib/validate'

const stores = new Hono<{ Bindings: Env }>()

// ── Stores ────────────────────────────────────────────────────────────────────

stores.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM stores ORDER BY created_at'
  ).all<Store>()
  return c.json(results)
})

stores.post('/', async (c) => {
  const body = await c.req.json<{ name?: string; description?: string }>()
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO stores (id, name, description) VALUES (?, ?, ?)'
  ).bind(id, body.name.trim(), body.description?.trim() ?? null).run()

  const store = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(id).first<Store>()
  return c.json(store, 201)
})

stores.get('/:id', async (c) => {
  const store = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?')
    .bind(c.req.param('id')).first<Store>()
  if (!store) return c.json({ error: 'Not found' }, 404)
  return c.json(store)
})

stores.put('/:id', async (c) => {
  const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!store) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json<{ name?: string; description?: string }>()
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)

  await c.env.DB.prepare(
    'UPDATE stores SET name = ?, description = ? WHERE id = ?'
  ).bind(body.name.trim(), body.description?.trim() ?? null, c.req.param('id')).run()

  const updated = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?')
    .bind(c.req.param('id')).first<Store>()
  return c.json(updated)
})

stores.delete('/:id', async (c) => {
  const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!store) return c.json({ error: 'Not found' }, 404)

  await c.env.DB.prepare('DELETE FROM stores WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

// ── Entity types (nested under store) ────────────────────────────────────────

stores.get('/:storeId/entity-types', async (c) => {
  const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?')
    .bind(c.req.param('storeId')).first()
  if (!store) return c.json({ error: 'Store not found' }, 404)

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM entity_types WHERE store_id = ? ORDER BY name'
  ).bind(c.req.param('storeId')).all<EntityType>()
  return c.json(results)
})

stores.post('/:storeId/entity-types', async (c) => {
  const storeId = c.req.param('storeId')
  const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(storeId).first()
  if (!store) return c.json({ error: 'Store not found' }, 404)

  const body = await c.req.json<{ name?: string; display_name?: string }>()
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  if (!body.display_name?.trim()) return c.json({ error: 'display_name is required' }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO entity_types (id, store_id, name, display_name) VALUES (?, ?, ?, ?)'
  ).bind(id, storeId, body.name.trim(), body.display_name.trim()).run()

  const entityType = await c.env.DB.prepare('SELECT * FROM entity_types WHERE id = ?')
    .bind(id).first<EntityType>()
  return c.json(entityType, 201)
})

// ── Relationship types (nested under store) ───────────────────────────────────

stores.get('/:storeId/relationship-types', async (c) => {
  const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?')
    .bind(c.req.param('storeId')).first()
  if (!store) return c.json({ error: 'Store not found' }, 404)

  const { results } = await c.env.DB.prepare(
    'SELECT * FROM relationship_types WHERE store_id = ? ORDER BY name'
  ).bind(c.req.param('storeId')).all<RelationshipType>()
  return c.json(results)
})

stores.post('/:storeId/relationship-types', async (c) => {
  const storeId = c.req.param('storeId')
  const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(storeId).first()
  if (!store) return c.json({ error: 'Store not found' }, 404)

  const body = await c.req.json<{
    name?: string
    source_entity_type_id?: string
    target_entity_type_id?: string
    inverse_label?: string
    directed?: boolean
    config?: Record<string, unknown>
  }>()

  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  if (!body.source_entity_type_id) return c.json({ error: 'source_entity_type_id is required' }, 400)
  if (!body.target_entity_type_id) return c.json({ error: 'target_entity_type_id is required' }, 400)

  const source = await c.env.DB.prepare(
    'SELECT id FROM entity_types WHERE id = ? AND store_id = ?'
  ).bind(body.source_entity_type_id, storeId).first()
  if (!source) return c.json({ error: 'source_entity_type_id not found in this store' }, 400)

  const target = await c.env.DB.prepare(
    'SELECT id FROM entity_types WHERE id = ? AND store_id = ?'
  ).bind(body.target_entity_type_id, storeId).first()
  if (!target) return c.json({ error: 'target_entity_type_id not found in this store' }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    `INSERT INTO relationship_types
     (id, store_id, name, source_entity_type_id, target_entity_type_id, inverse_label, directed, config)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    id,
    storeId,
    body.name.trim(),
    body.source_entity_type_id,
    body.target_entity_type_id,
    body.inverse_label?.trim() ?? null,
    body.directed !== false ? 1 : 0,
    JSON.stringify(body.config ?? {})
  ).run()

  const relType = await c.env.DB.prepare('SELECT * FROM relationship_types WHERE id = ?')
    .bind(id).first<RelationshipType>()
  return c.json(relType, 201)
})

// ── Entities (nested under store) ─────────────────────────────────────────────

stores.post('/:storeId/entities', async (c) => {
  const storeId = c.req.param('storeId')
  const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(storeId).first()
  if (!store) return c.json({ error: 'Store not found' }, 404)

  const body = await c.req.json<{
    entity_type_id?: string
    field_values?: Record<string, unknown>
  }>()
  if (!body.entity_type_id) return c.json({ error: 'entity_type_id is required' }, 400)

  const et = await c.env.DB.prepare(
    'SELECT id FROM entity_types WHERE id = ? AND store_id = ?'
  ).bind(body.entity_type_id, storeId).first()
  if (!et) return c.json({ error: 'entity_type_id not found in this store' }, 400)

  const fieldValues = body.field_values ?? {}
  const errors = await validateFieldValues(c.env.DB, 'entity_type', body.entity_type_id, fieldValues)
  if (errors.length) return c.json({ error: 'Validation failed', errors }, 400)

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO entities (id, entity_type_id, field_values) VALUES (?, ?, ?)'
  ).bind(id, body.entity_type_id, JSON.stringify(fieldValues)).run()

  return c.json({ id, entity_type_id: body.entity_type_id, field_values: fieldValues }, 201)
})

export default stores
