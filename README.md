# Info Builder

A personal information management application built around a **schema-guided, user-extensible graph model**. Create and manage multiple independent information stores — each store has its own entity types, relationship types, and data — and browse them through multiple views: document, flat/table, graph, and timeline.

Info Builder is the evolution of [Infomanager](https://github.com/gcameron00/Infomanager). Where Infomanager was a single contacts/knowledge store, Info Builder generalises the concept: one application, many stores, any domain.

---

## What it does

### Information stores

Each store is an isolated workspace with its own schema. Example stores:

| Store | Sample entity types | Sample relationship types |
|---|---|---|
| Contacts / CRM | Person, Organisation, Meeting | WorksFor, Knows, MetAt |
| Historical events | Person, Event, Place, Era | ParticipatedIn, OccurredAt, PartOf |
| Music | Band, Person, Album, Genre | MemberOf, Released, InfluencedBy |

Stores are completely independent — schema changes in one store do not affect others.

### Core data model

The model has three layers (inherited from Infomanager 2.0):

**Entity types** — the kinds of things in a store, each with named, typed fields.

**Relationship types** — schema objects that define the rules for a valid connection between two entity types. Each relationship type specifies:
- Allowed source and target entity types
- Directionality (one-way or bidirectional)
- Cardinality (one-to-one, one-to-many, many-to-many)
- Own fields (e.g. `WorksFor` carries `job_title`, `start_date`)
- Inverse label (so the same link reads naturally from both ends)

**Instances** — the actual entities and relationship instances, each carrying field values validated against their type's schema.

### Views

The same data can be browsed and edited through multiple views:

| View | Best for |
|---|---|
| **Document** | Reading and editing a single entity and its immediate relationships — the primary view |
| **Flat / table** | Scanning all entities of a type in a spreadsheet-like grid |
| **Graph** | Exploring connections visually as an interactive node-link diagram |
| **Timeline** | Entities with dates plotted along a time axis |

Document view is the core; other views are progressive enhancements.

### Schema management

A dedicated schema editor lets you (as the single owner) define and modify:
- Entity types and their fields
- Relationship types, their constraints, and their own fields
- Allowed source/target entity type pairs per relationship type

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Plain HTML, CSS, vanilla JS — no framework, no build step |
| Backend | [Cloudflare Workers](https://workers.cloudflare.com/) (TypeScript) |
| Database | [Cloudflare D1](https://developers.cloudflare.com/d1/) (SQLite at the edge) |
| Hosting | [Cloudflare Pages](https://pages.cloudflare.com/) (frontend) + Workers (API) |
| Auth | Single-user gate — Cloudflare Access or a simple JWT issued at login |

The frontend is served from Cloudflare Pages. The API is a Cloudflare Worker bound to the D1 database. Both live in this repo.

---

## Database schema

```sql
-- Schema layer
Store             { id, name, description, created_at }
EntityType        { id, store_id, name, display_name }
RelationshipType  { id, store_id, name, source_entity_type_id, target_entity_type_id,
                    inverse_label, directed, config }
FieldDefinition   { id, parent_type ('entity_type'|'relationship_type'), parent_type_id,
                    name, data_type, required, display_order }

-- Data layer
Entity            { id, entity_type_id, field_values (JSON) }
Relationship      { id, relationship_type_id, source_entity_id, target_entity_id,
                    field_values (JSON) }
```

`field_values` is a flexible JSON blob; `FieldDefinition` provides the enumerable schema behind it, enabling form generation and validation on save.

---

## Project layout

```
.
├── index.html                  # Home / landing page (/)
├── about/
│   └── index.html              # About page (/about/)
├── app/                        # Application pages (future)
│   └── ...
├── assets/
│   ├── css/styles.css          # Global stylesheet
│   ├── js/main.js              # Shared client-side script
│   └── favicon.svg
├── worker/                     # Cloudflare Worker (API) — future
│   ├── src/
│   │   └── index.ts
│   ├── wrangler.toml
│   └── package.json
├── _headers                    # Cloudflare Pages response headers
├── _redirects                  # Cloudflare Pages redirect rules
├── docs/
│   └── PLAN.md                 # Implementation plan and phase tracking
└── README.md
```

---

## Local development

### Frontend (static pages)

No build step. Serve the root with any static server:

```sh
# Python 3
python3 -m http.server 8000

# Node
npx serve .
```

Open <http://localhost:8000/>.

### Worker (API)

Once the Worker directory exists:

```sh
cd worker
npm install
npx wrangler dev   # starts local Worker at http://localhost:8787
```

Wrangler provides a local D1 instance — no remote database needed for dev.

---

## Deployment

The frontend deploys from the `main` branch via Cloudflare Pages. The Worker deploys separately via Wrangler or a Pages Function binding.

| Setting | Value |
|---|---|
| Build command | *(none for frontend)* |
| Build output directory | `/` |
| Production branch | `main` |

Branches other than `main` are deployed as preview environments.

---

## Design principles

- **Schema-guided, user-extensible** — not fully rigid (like a traditional relational app) and not fully free-form (which leads to semantic drift). The schema is always user-defined, never hard-coded.
- **Relationships are first-class** — a relationship type is a schema object with its own fields and constraints, not just a label on an edge.
- **No framework on the frontend** — plain HTML, CSS, and JS. The app must remain usable with JS disabled for read-only views.
- **Single user** — the application is built for one authenticated owner. No multi-tenancy, no sharing, no permissions model beyond "logged in or not."
