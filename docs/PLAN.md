# Implementation plan

Each phase is independently shippable and builds on the previous one. Phases 0–1 are complete (static shell). Phases 2+ are the real application build.

---

## Phase 0 — Static shell (done)

- [x] README, project layout, Cloudflare Pages deployment.
- [x] Branded home page, about page, shared nav/footer, CSS design system.
- [x] `_headers` (security + asset caching) and `_redirects`.

---

## Phase 1 — Worker foundation

Stand up the Cloudflare Worker and wire it to a D1 database. No application logic yet — just proof that the stack works end to end.

- [x] Create `worker/` directory with `wrangler.toml`, `package.json`, TypeScript config.
- [x] Write a minimal Worker with a `/api/health` endpoint that returns `{ ok: true }`.
- [x] Create D1 database via `wrangler d1 create infobuilder-db`; paste the returned `database_id` into `wrangler.toml`.
- [x] Write initial migration (`migrations/0001_initial.sql`) — all tables from the schema in README.
- [x] Apply migration locally (`npm run migrate:local`) and verify with `npm run dev`.
- [x] Add `wrangler dev` instructions to README.
- [x] Auth is handled by Cloudflare Zero Trust (configured in the Cloudflare dashboard, not in this repo). No auth code needed in the Worker.

---

## Phase 2 — Schema management API

CRUD endpoints for stores, entity types, relationship types, and field definitions. No UI yet — verified with curl/Postman.

- [x] `POST /api/stores`, `GET /api/stores`, `GET /api/stores/:id`, `PUT`, `DELETE`
- [x] `POST /api/stores/:storeId/entity-types` and full CRUD
- [x] `POST /api/stores/:storeId/relationship-types` and full CRUD
- [x] `POST /api/entity-types/:typeId/fields` and full CRUD (field definitions)
- [x] `POST /api/relationship-types/:typeId/fields` and full CRUD
- [x] Validation: enforce that relationship type source/target entity types belong to the same store.
- [x] Seed script (`seed.sql`) that populates a "Contacts" demo store — run with `npm run seed:local` / `seed:remote`.

---

## Phase 3 — Schema management UI

A web UI for defining and editing store schemas. This is the meta-layer — users build their schema here before entering any data.

- [x] `/app/` — application shell page (authenticated, linked from the landing page nav).
- [x] Store list and store switcher.
- [x] Entity type editor: list types, add/edit/delete a type, manage its fields (name, data type, required, order).
- [x] Relationship type editor: list types, add/edit/delete, select source/target entity types, set directionality, manage own fields.
- [x] Client-side form generation from field definitions (reused in Phase 4+).
- [x] Security: Cloudflare Zero Trust Access on the Pages site; Worker locked to requests bearing a shared `API_SECRET` injected by a Pages Function proxy (`functions/api/[[route]].js`). Direct Worker URL calls return 401.

---

## Phase 4 — Entity & relationship data API

CRUD endpoints for actual entity and relationship instances.

- [ ] `POST /api/stores/:storeId/entities`, `GET`, `PUT`, `DELETE`
- [ ] `GET /api/entity-types/:typeId/entities` — list all entities of a type (for flat view).
- [ ] `GET /api/entities/:id/relationships` — all relationships touching an entity (for document view).
- [ ] `POST /api/relationships`, `GET`, `PUT`, `DELETE`
- [ ] Validation on save: check field values against `FieldDefinition` (required fields, data types).
- [ ] Validate relationship instances against allowed source/target types defined in `RelationshipType`.

---

## Phase 5 — Document view (priority view)

A rich entity page showing all field values and all relationships, with inline editing. This is the core daily-use UI.

- [ ] `/app/stores/:storeId/entities/:entityId` — entity document page.
- [ ] Display all field values, grouped and ordered by `display_order`.
- [ ] List all outgoing and incoming relationships, grouped by relationship type.
- [ ] Each relationship entry links to the related entity's document page.
- [ ] Inline field editing (click to edit, save on blur/submit).
- [ ] Add / remove relationship instances from the document page.
- [ ] Create new entity form (schema-driven, fields generated from `FieldDefinition`).

---

## Phase 6 — Flat / table view

A paginated, sortable table of all entities of a given type.

- [ ] `/app/stores/:storeId/entity-types/:typeId` — flat list page.
- [ ] Column headers from `FieldDefinition`, ordered by `display_order`.
- [ ] Sort by any field; paginate (server-side, `LIMIT`/`OFFSET`).
- [ ] Click a row to open the document view.
- [ ] Inline "quick add" row at the top for fast entity creation.
- [ ] Simple search/filter by field value.

---

## Phase 7 — Graph view

An interactive node-link diagram for exploring relationships visually.

- [ ] `/app/stores/:storeId/graph` — graph page.
- [ ] Load entities and relationships for the store (start with a reasonable limit, e.g. 500 nodes).
- [ ] Render with a lightweight force-directed layout library (e.g. [d3-force](https://github.com/d3/d3-force) or [Cytoscape.js](https://js.cytoscape.org/)).
- [ ] Click a node to open its document view; click an edge to see relationship details.
- [ ] Filter by entity type and/or relationship type.
- [ ] "Focus" mode: start from a selected entity and expand neighbours on demand (prevents overwhelming large stores).

---

## Phase 8 — Timeline view

Entities with date fields plotted along a time axis.

- [ ] `/app/stores/:storeId/timeline` — timeline page.
- [ ] Auto-detect entity types that have a `date` or `datetime` field.
- [ ] Plot entities as markers on a horizontal axis; group by entity type (swimlanes).
- [ ] Click a marker to open the document view.
- [ ] Zoom and pan the time axis.

---

## Phase 9 — Polish and production hardening

- [ ] Open Graph meta tags on the landing and about pages.
- [ ] `sitemap.xml` and `robots.txt`.
- [ ] Accessibility pass: focus styles, skip-link, colour-contrast audit.
- [ ] Lighthouse pass (≥95 on landing pages).
- [ ] D1 index review (add indexes on foreign keys and commonly filtered columns).
- [ ] Error handling and user-facing error messages throughout the app.
- [ ] Cloudflare Web Analytics on the landing pages (no cookies).

---

## Out of scope

- Frontend frameworks (React, Vue, Svelte).
- Static site generators.
- Multi-user / sharing / permissions — the app is built for a single authenticated owner.
- Real-time collaboration.

If any of these become necessary, revisit this plan.
