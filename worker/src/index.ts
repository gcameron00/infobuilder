import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import stores from './routes/stores'
import entityTypes from './routes/entityTypes'
import relationshipTypes from './routes/relationshipTypes'
import fields from './routes/fields'

const app = new Hono<{ Bindings: Env }>()

// Allow cross-origin requests from localhost dev servers (prod is same-origin via _redirects proxy)
app.use('/api/*', cors({
  origin: (origin) => origin?.startsWith('http://localhost') ? origin : null,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type'],
}))

app.get('/api/health', (c) => c.json({ ok: true }))

app.route('/api/stores', stores)
app.route('/api/entity-types', entityTypes)
app.route('/api/relationship-types', relationshipTypes)
app.route('/api/fields', fields)

export default app
