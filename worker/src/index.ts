import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { Env } from './types'
import stores from './routes/stores'
import entityTypes from './routes/entityTypes'
import relationshipTypes from './routes/relationshipTypes'
import fields from './routes/fields'

const app = new Hono<{ Bindings: Env }>()

// In production requests arrive from the Pages Function (server-to-server), so CORS is
// only needed for local dev where the browser calls the Worker directly.
app.use('/api/*', cors({
  origin: (origin) => origin?.includes('localhost') ? origin : null,
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type'],
}))

// Validate the shared secret on every API request.
// When API_SECRET is unset (local dev), the check is skipped so dev works without secrets.
app.use('/api/*', async (c, next) => {
  if (c.env.API_SECRET && c.req.header('X-API-Secret') !== c.env.API_SECRET) {
    return c.json({ error: 'Unauthorized' }, 401)
  }
  await next()
})

app.get('/api/health', (c) => c.json({ ok: true }))

app.route('/api/stores', stores)
app.route('/api/entity-types', entityTypes)
app.route('/api/relationship-types', relationshipTypes)
app.route('/api/fields', fields)

export default app
