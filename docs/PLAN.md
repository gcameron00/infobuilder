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

- [x] `POST /api/stores/:storeId/entities`, `GET /api/entities/:id`, `PUT`, `DELETE`
- [x] `GET /api/entity-types/:typeId/entities` — paginated list of entities of a type (for flat view).
- [x] `GET /api/entities/:id/relationships` — all relationships touching an entity with type and related-entity data (for document view).
- [x] `POST /api/relationships`, `GET /api/relationships/:id`, `PUT`, `DELETE`
- [x] Validation on save: required fields and basic data-type checks via `src/lib/validate.ts`.
- [x] Validate relationship instances against allowed source/target entity types.

---

## Phase 5 — Document view (priority view)

A rich entity page showing all field values and all relationships, with inline editing. This is the core daily-use UI.

- [x] `/app/entity/` — entity document page (query params: `?id=ENTITY_ID` or `?type=TYPE_ID&store=STORE_ID`).
- [x] Display all field values, ordered by `display_order`.
- [x] List all outgoing and incoming relationships, grouped by relationship type.
- [x] Each relationship entry links to the related entity's document page.
- [x] Inline field editing (click to edit, save on submit).
- [x] Add / remove relationship instances from the document page.
- [x] Create new entity form (schema-driven, fields generated from `FieldDefinition`).
- [x] "New entity" link on each entity type card in the schema editor.

---

## Phase 6 — Flat / table view

A paginated, sortable table of all entities of a given type.

- [x] `/app/entities/` — flat list page (query param: `?type=TYPE_ID`).
- [x] Column headers from `FieldDefinition`, ordered by `display_order`.
- [x] Sort by any field (server-side `json_extract`); paginate (server-side `LIMIT`/`OFFSET`).
- [x] Click a row to open the document view.
- [x] "Quick add" form for fast entity creation.
- [x] Search/filter by field value (server-side substring match on `field_values` JSON).
- [x] "View" and "+ New" links on each entity type card in the schema editor.

---

## Phase 7 — Graph view

An interactive node-link diagram for exploring relationships visually.

- [x] `/app/graph/` — graph page (query param: `?store=STORE_ID`).
- [x] New Worker endpoint `GET /api/stores/:storeId/graph` — returns all entities, relationships, and type metadata (capped at 500/1000).
- [x] Rendered with Cytoscape.js (CDN) using the `cose` force-directed layout; nodes coloured by entity type.
- [x] Click a node → entity document view; click an edge → info panel with links to both endpoint entities.
- [x] Filter by entity type and/or relationship type (show/hide checkboxes).
- [x] Focus mode: pick any entity from a select → shows only it and its direct neighbours, animates to fit.
- [x] Fit and Re-layout buttons; entity/relationship count in controls panel.
- [x] "Graph →" link in the schema editor sidebar when a store is selected.

---

## Phase 8 — Timeline view

Entities with date fields plotted along a time axis.

- [x] `/app/timeline/` — timeline page (query param: `?store=STORE_ID`).
- [x] New Worker endpoint `GET /api/stores/:storeId/timeline` — auto-detects entity types with date/datetime fields and returns only entities that have a value for that field.
- [x] Entities plotted as dots on a horizontal track; grouped into swimlanes by entity type.
- [x] Click a dot → entity document view; hover shows a tooltip label.
- [x] Zoom slider (0.25×–20×) with proportional scroll preservation; native horizontal scroll for pan.
- [x] Year gridlines and axis tick marks; month ticks visible at higher zoom levels.
- [x] Graph and Timeline links in the schema editor sidebar when a store is selected.

---

## Phase 9 — Polish and production hardening

- [x] Open Graph meta tags (`og:title`, `og:description`, `og:type`) on home and about pages.
- [x] `sitemap.xml` (public pages only) and `robots.txt` (disallows `/app/*`).
- [x] Favicon redesigned as a 3-node graph triangle in SVG with dark-mode `prefers-color-scheme` support; brand mark updated across all 7 HTML files.
- [x] Landing page and about page copy updated to accurately describe the application.
- [x] Missing CSS variables `--space-5` and `--space-10` added to `styles.css`.
- [x] D1 migration `0002_indexes.sql` — covering index for field sort validation; index on `field_definitions(parent_type, data_type)` for timeline queries. Run `npm run migrate:local` and `npm run migrate:remote` to apply.
- [x] Cloudflare Web Analytics placeholder comment on home and about pages — uncomment and replace `TOKEN` after enabling in the CF dashboard.
- [x] Error handling: all app pages display inline error messages with links back to `/app/` on API failure.

---

## Out of scope

- Frontend frameworks (React, Vue, Svelte).
- Static site generators.
- Multi-user / sharing / permissions — the app is built for a single authenticated owner.
- Real-time collaboration.

If any of these become necessary, revisit this plan.
