import { Hono } from 'hono'
import type { Env, FieldDefinition } from '../types'

const fields = new Hono<{ Bindings: Env }>()

fields.put('/:id', async (c) => {
  const field = await c.env.DB.prepare('SELECT id FROM field_definitions WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!field) return c.json({ error: 'Not found' }, 404)

  const body = await c.req.json<{
    name?: string
    data_type?: string
    required?: boolean
    display_order?: number
  }>()
  if (!body.name?.trim()) return c.json({ error: 'name is required' }, 400)
  if (!body.data_type?.trim()) return c.json({ error: 'data_type is required' }, 400)

  await c.env.DB.prepare(
    'UPDATE field_definitions SET name = ?, data_type = ?, required = ?, display_order = ? WHERE id = ?'
  ).bind(body.name.trim(), body.data_type.trim(), body.required ? 1 : 0, body.display_order ?? 0, c.req.param('id')).run()

  const updated = await c.env.DB.prepare('SELECT * FROM field_definitions WHERE id = ?')
    .bind(c.req.param('id')).first<FieldDefinition>()
  return c.json(updated)
})

fields.delete('/:id', async (c) => {
  const field = await c.env.DB.prepare('SELECT id FROM field_definitions WHERE id = ?')
    .bind(c.req.param('id')).first()
  if (!field) return c.json({ error: 'Not found' }, 404)

  await c.env.DB.prepare('DELETE FROM field_definitions WHERE id = ?').bind(c.req.param('id')).run()
  return c.json({ ok: true })
})

export default fields
