const WORKER_URL = 'https://infobuilder-worker.me-2e8.workers.dev'

export async function onRequest({ request, env }) {
  if (!env.API_SECRET) {
    return Response.json(
      { error: 'API_SECRET not configured on this Pages project' },
      { status: 500 }
    )
  }

  const url = new URL(request.url)
  const upstream = WORKER_URL + url.pathname + url.search

  const headers = new Headers(request.headers)
  headers.set('X-API-Secret', env.API_SECRET)
  headers.delete('host')

  const init = { method: request.method, headers }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body
  }

  return fetch(upstream, init)
}
