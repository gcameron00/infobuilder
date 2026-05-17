export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const { pathname, method } = { pathname: url.pathname, method: request.method };

    if (pathname === '/api/health' && method === 'GET') {
      return Response.json({ ok: true });
    }

    return new Response('Not found', { status: 404 });
  },
} satisfies ExportedHandler<Env>;
