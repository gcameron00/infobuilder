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

  const id = c.req.param('id')
  await c.env.DB.prepare(`DELETE FROM field_definitions WHERE parent_type = 'relationship_type' AND parent_type_id IN (SELECT id FROM relationship_types WHERE store_id = ?)`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM relationships WHERE relationship_type_id IN (SELECT id FROM relationship_types WHERE store_id = ?)`).bind(id).run()
  await c.env.DB.prepare('DELETE FROM relationship_types WHERE store_id = ?').bind(id).run()
  await c.env.DB.prepare(`DELETE FROM field_definitions WHERE parent_type = 'entity_type' AND parent_type_id IN (SELECT id FROM entity_types WHERE store_id = ?)`).bind(id).run()
  await c.env.DB.prepare(`DELETE FROM entities WHERE entity_type_id IN (SELECT id FROM entity_types WHERE store_id = ?)`).bind(id).run()
  await c.env.DB.prepare('DELETE FROM entity_types WHERE store_id = ?').bind(id).run()
  await c.env.DB.prepare('DELETE FROM stores WHERE id = ?').bind(id).run()
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

// ── Export ────────────────────────────────────────────────────────────────────

stores.get('/:storeId/export', async (c) => {
  const storeId = c.req.param('storeId')
  const store = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first<Store>()
  if (!store) return c.json({ error: 'Store not found' }, 404)

  const [
    { results: entityTypes },
    { results: relationshipTypes },
    { results: entityFields },
    { results: relFields },
    { results: entities },
    { results: relationships },
  ] = await Promise.all([
    c.env.DB.prepare('SELECT * FROM entity_types WHERE store_id = ? ORDER BY name').bind(storeId).all<EntityType>(),
    c.env.DB.prepare('SELECT * FROM relationship_types WHERE store_id = ? ORDER BY name').bind(storeId).all<RelationshipType>(),
    c.env.DB.prepare(`SELECT fd.* FROM field_definitions fd JOIN entity_types et ON et.id = fd.parent_type_id WHERE fd.parent_type = 'entity_type' AND et.store_id = ? ORDER BY fd.parent_type_id, fd.display_order`).bind(storeId).all<FieldDefinition>(),
    c.env.DB.prepare(`SELECT fd.* FROM field_definitions fd JOIN relationship_types rt ON rt.id = fd.parent_type_id WHERE fd.parent_type = 'relationship_type' AND rt.store_id = ? ORDER BY fd.parent_type_id, fd.display_order`).bind(storeId).all<FieldDefinition>(),
    c.env.DB.prepare(`SELECT e.* FROM entities e JOIN entity_types et ON et.id = e.entity_type_id WHERE et.store_id = ?`).bind(storeId).all<Entity>(),
    c.env.DB.prepare(`SELECT r.* FROM relationships r JOIN relationship_types rt ON rt.id = r.relationship_type_id WHERE rt.store_id = ?`).bind(storeId).all<Relationship>(),
  ])

  const etById = Object.fromEntries(entityTypes.map(et => [et.id, et]))
  const rtById = Object.fromEntries(relationshipTypes.map(rt => [rt.id, rt]))

  const etFieldsMap: Record<string, FieldDefinition[]> = {}
  for (const f of entityFields) {
    ;(etFieldsMap[f.parent_type_id] ??= []).push(f)
  }
  const rtFieldsMap: Record<string, FieldDefinition[]> = {}
  for (const f of relFields) {
    ;(rtFieldsMap[f.parent_type_id] ??= []).push(f)
  }

  const mapFields = (fs: FieldDefinition[]) => fs.map(f => ({
    name: f.name, data_type: f.data_type, required: !!f.required, display_order: f.display_order,
  }))

  return c.json({
    version: 1,
    exportedAt: new Date().toISOString(),
    store: { name: store.name, description: store.description },
    entityTypes: entityTypes.map(et => ({
      name: et.name, display_name: et.display_name, icon: et.icon,
      fields: mapFields(etFieldsMap[et.id] ?? []),
    })),
    relationshipTypes: relationshipTypes.map(rt => ({
      name: rt.name,
      source_entity_type: etById[rt.source_entity_type_id]?.name ?? '',
      target_entity_type: etById[rt.target_entity_type_id]?.name ?? '',
      directed: !!rt.directed,
      inverse_label: rt.inverse_label ?? null,
      fields: mapFields(rtFieldsMap[rt.id] ?? []),
    })),
    entities: entities.map(e => ({
      _id: e.id,
      entity_type: etById[e.entity_type_id]?.name ?? '',
      field_values: JSON.parse(e.field_values),
    })),
    relationships: relationships.map(r => ({
      relationship_type: rtById[r.relationship_type_id]?.name ?? '',
      source_entity_id: r.source_entity_id,
      target_entity_id: r.target_entity_id,
      field_values: JSON.parse(r.field_values),
    })),
  })
})

// ── Import (creates a new store from a version-1 export file) ────────────────

stores.post('/import', async (c) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const body = await c.req.json<any>()
  if (!body || body.version !== 1) return c.json({ error: 'Invalid format — expected a version 1 export file' }, 400)
  if (!body.store?.name?.trim()) return c.json({ error: 'Export file is missing store name' }, 400)

  // Create a fresh store so there is never an entity-type name conflict
  const storeId = crypto.randomUUID()
  await c.env.DB.prepare(
    'INSERT INTO stores (id, name, description) VALUES (?, ?, ?)'
  ).bind(storeId, body.store.name.trim(), body.store.description ?? null).run()

  const importETs:    any[] = body.entityTypes    ?? []
  const importRTs:    any[] = body.relationshipTypes ?? []
  const importEnts:   any[] = body.entities        ?? []
  const importRels:   any[] = body.relationships   ?? []

  // Insert entity types + their fields
  const etNameToId: Record<string, string> = {}
  for (const et of importETs) {
    const id = crypto.randomUUID()
    etNameToId[et.name] = id
    const icon = (typeof et.icon === 'string' && /^[a-z0-9-]{1,40}$/.test(et.icon)) ? et.icon : null
    await c.env.DB.prepare(
      'INSERT INTO entity_types (id, store_id, name, display_name, icon) VALUES (?, ?, ?, ?, ?)'
    ).bind(id, storeId, et.name, et.display_name ?? et.name, icon).run()
    for (const f of (et.fields ?? [])) {
      await c.env.DB.prepare(
        `INSERT INTO field_definitions (id, parent_type, parent_type_id, name, data_type, required, display_order) VALUES (?, 'entity_type', ?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), id, f.name, f.data_type, f.required ? 1 : 0, f.display_order ?? 0).run()
    }
  }

  // Insert relationship types + their fields
  const rtNameToId: Record<string, string> = {}
  for (const rt of importRTs) {
    const srcId = etNameToId[rt.source_entity_type]
    const tgtId = etNameToId[rt.target_entity_type]
    if (!srcId || !tgtId) continue
    const id = crypto.randomUUID()
    rtNameToId[rt.name] = id
    await c.env.DB.prepare(
      `INSERT INTO relationship_types (id, store_id, name, source_entity_type_id, target_entity_type_id, inverse_label, directed, config) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(id, storeId, rt.name, srcId, tgtId, rt.inverse_label ?? null, rt.directed !== false ? 1 : 0, '{}').run()
    for (const f of (rt.fields ?? [])) {
      await c.env.DB.prepare(
        `INSERT INTO field_definitions (id, parent_type, parent_type_id, name, data_type, required, display_order) VALUES (?, 'relationship_type', ?, ?, ?, ?, ?)`
      ).bind(crypto.randomUUID(), id, f.name, f.data_type, f.required ? 1 : 0, f.display_order ?? 0).run()
    }
  }

  // Insert entities, building old-ID → new-ID map for relationships
  const entityIdMap: Record<string, string> = {}
  for (const e of importEnts) {
    const etId = etNameToId[e.entity_type]
    if (!etId) continue
    const newId = crypto.randomUUID()
    if (e._id) entityIdMap[e._id] = newId
    await c.env.DB.prepare(
      'INSERT INTO entities (id, entity_type_id, field_values) VALUES (?, ?, ?)'
    ).bind(newId, etId, JSON.stringify(e.field_values ?? {})).run()
  }

  // Insert relationships
  for (const r of importRels) {
    const rtId  = rtNameToId[r.relationship_type]
    const srcId = entityIdMap[r.source_entity_id]
    const tgtId = entityIdMap[r.target_entity_id]
    if (!rtId || !srcId || !tgtId) continue
    await c.env.DB.prepare(
      'INSERT INTO relationships (id, relationship_type_id, source_entity_id, target_entity_id, field_values) VALUES (?, ?, ?, ?, ?)'
    ).bind(crypto.randomUUID(), rtId, srcId, tgtId, JSON.stringify(r.field_values ?? {})).run()
  }

  const newStore = await c.env.DB.prepare('SELECT * FROM stores WHERE id = ?').bind(storeId).first<Store>()
  return c.json(newStore, 201)
})

export default stores
