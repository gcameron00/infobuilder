import { Hono } from 'hono'
import type { Env, Store, EntityType, RelationshipType, Entity, Relationship, FieldDefinition } from '../types'
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

  const body = await c.req.json<{ name?: string; display_name?: string; icon?: string | null }>()
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  if (!body.display_name?.trim()) return c.json({ error: 'display_name is required' }, 400)

  const icon = body.icon?.trim() || null
  if (icon && !/^[a-z0-9-]{1,40}$/.test(icon)) {
    return c.json({ error: 'icon must be a lowercase alphanumeric-and-hyphen slug, max 40 characters' }, 400)
  }

  const id = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO entity_types (id, store_id, name, display_name, icon) VALUES (?, ?, ?, ?, ?)'
  ).bind(id, storeId, body.name.trim(), body.display_name.trim(), icon).run()

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

// ── Timeline data (entity types with date fields + their entities) ────────────

stores.get('/:storeId/timeline', async (c) => {
  const storeId = c.req.param('storeId')
  const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(storeId).first()
  if (!store) return c.json({ error: 'Store not found' }, 404)

  const { results: entityTypes } = await c.env.DB.prepare(
    'SELECT * FROM entity_types WHERE store_id = ? ORDER BY name'
  ).bind(storeId).all<EntityType>()

  if (entityTypes.length === 0) return c.json({ swimlanes: [] })

  // Find first date/datetime field per entity type (one query via JOIN)
  const { results: dateFields } = await c.env.DB.prepare(`
    SELECT fd.parent_type_id, fd.name, fd.data_type, fd.display_order
    FROM field_definitions fd
    JOIN entity_types et ON et.id = fd.parent_type_id
    WHERE fd.parent_type = 'entity_type'
      AND et.store_id = ?
      AND fd.data_type IN ('date', 'datetime')
    ORDER BY fd.parent_type_id, fd.display_order
  `).bind(storeId).all<FieldDefinition & { parent_type_id: string }>()

  const etDateField: Record<string, string> = {}
  for (const f of dateFields) {
    if (!etDateField[f.parent_type_id]) etDateField[f.parent_type_id] = f.name
  }

  const swimlanes = []
  for (const et of entityTypes) {
    const dateFieldName = etDateField[et.id]
    if (!dateFieldName) continue

    const { results: entities } = await c.env.DB.prepare(
      'SELECT id, field_values FROM entities WHERE entity_type_id = ? LIMIT 500'
    ).bind(et.id).all<Entity>()

    const withDates = entities
      .map(e => ({ ...e, field_values: JSON.parse(e.field_values) }))
      .filter(e => e.field_values[dateFieldName])

    if (withDates.length === 0) continue
    swimlanes.push({ entityType: et, dateField: dateFieldName, entities: withDates })
  }

  return c.json({ swimlanes })
})

// ── Graph data (all entities + relationships for a store) ─────────────────────

stores.get('/:storeId/graph', async (c) => {
  const storeId = c.req.param('storeId')
  const store = await c.env.DB.prepare('SELECT id FROM stores WHERE id = ?').bind(storeId).first()
  if (!store) return c.json({ error: 'Store not found' }, 404)

  const ENTITY_LIMIT = 500
  const REL_LIMIT    = 1000

  const [{ results: entityTypes }, { results: relationshipTypes }, { results: entities }, { results: relationships }] =
    await Promise.all([
      c.env.DB.prepare('SELECT * FROM entity_types WHERE store_id = ? ORDER BY name').bind(storeId).all<EntityType>(),
      c.env.DB.prepare('SELECT * FROM relationship_types WHERE store_id = ? ORDER BY name').bind(storeId).all<RelationshipType>(),
      c.env.DB.prepare(
        'SELECT e.id, e.entity_type_id, e.field_values FROM entities e JOIN entity_types et ON et.id = e.entity_type_id WHERE et.store_id = ? LIMIT ?'
      ).bind(storeId, ENTITY_LIMIT).all<Entity>(),
      c.env.DB.prepare(
        'SELECT r.id, r.relationship_type_id, r.source_entity_id, r.target_entity_id, r.field_values FROM relationships r JOIN entities e ON e.id = r.source_entity_id JOIN entity_types et ON et.id = e.entity_type_id WHERE et.store_id = ? LIMIT ?'
      ).bind(storeId, REL_LIMIT).all<Relationship>(),
    ])

  return c.json({
    entityTypes,
    relationshipTypes,
    entities:      entities.map(e => ({ ...e, field_values: JSON.parse(e.field_values) })),
    relationships: relationships.map(r => ({ ...r, field_values: JSON.parse(r.field_values) })),
    truncated:     entities.length >= ENTITY_LIMIT || relationships.length >= REL_LIMIT,
  })
})

export default stores
