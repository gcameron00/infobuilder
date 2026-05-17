import { Hono } from 'hono'
import type { Env } from './types'
import stores from './routes/stores'
import entityTypes from './routes/entityTypes'
import relationshipTypes from './routes/relationshipTypes'
import fields from './routes/fields'

const app = new Hono<{ Bindings: Env }>()

app.get('/api/health', (c) => c.json({ ok: true }))

app.route('/api/stores', stores)
app.route('/api/entity-types', entityTypes)
app.route('/api/relationship-types', relationshipTypes)
app.route('/api/fields', fields)

export default app
