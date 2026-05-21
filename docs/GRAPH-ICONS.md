# Icons in the graph view — design proposal

> Status: **Phase B implemented** (icons vendored, graph rendering, sidebar chips). Phase C pending. Tracked under issue [#3](https://github.com/gcameron00/infobuilder/issues/3).

## 1. Goal

Place a small icon at the centre of each node in the graph view (`/app/graph/`), where the icon visually communicates the **entity type** of that node. Today every node is a coloured circle (`assets/js/graph.js:67`–`93`); the colour comes from a 12-step palette indexed by entity-type order, with no icon. Adding icons should make types instantly recognisable, reduce reliance on colour alone (an accessibility win), and remain consistent with the platform the user is on.

This document is design only. No code is written here; the implementation phasing is in §10.

## 2. Current graph view, briefly

- Renderer: **Cytoscape.js** loaded from CDN (`app/graph/index.html:12`).
- Node style: 30×30 px solid-fill circle, label below, colour by entity type (`assets/js/graph.js:103`–`117`).
- Entity types are **user-defined per store** — there is no fixed list of types (`worker/migrations/0001_initial.sql`). Sample types in the seed Contacts store are `Person`, `Organisation`, `Meeting`, but any store can define anything (e.g. `Band`, `Album`, `Era`).
- The graph endpoint already returns each entity type's id, name, and `display_name`, but no icon hint (`worker/src/routes/...` via `GET /api/stores/:storeId/graph`).

Implication: **icon assignment cannot be hard-coded against a known list of types**. It has to be a per-entity-type setting that the user (or a heuristic) can populate for whatever types they have created.

## 3. Constraints and platform considerations

### 3.1 Info Builder is a web app

Info Builder ships as plain HTML/CSS/JS on Cloudflare Pages with a Workers backend (`README.md`). The "platform" a user sees is whatever **browser** they open, on whatever OS. There is no native iOS/macOS app today. Anything we choose must therefore render in every modern browser — Safari (incl. iOS), Chrome, Firefox, Edge — without per-platform code paths in the first instance.

### 3.2 SF Symbols — what is actually possible

The issue asks for SF Symbols on Apple platforms "if permitted". The honest answer is **not permitted for use in a web app**, even when viewed in Safari on macOS/iOS. Three reasons:

1. **License.** Apple's SF Symbols license restricts use of the symbols and any derivatives "in connection with the marketing, promotion, advertisement or other commercialization of Apple's products or services" *and* to "communicate availability, functionality, or compatibility of Apple products and services". Embedding the glyphs in a third-party web application UI is outside the licensed use.
2. **Distribution.** SF Symbols are not a web font and are not published on a CDN. The `.sfsymbols` files are intended for use inside Xcode-built apps via `UIImage(systemName:)` / `Image(systemName:)`. There is no supported way to ship them as a web resource.
3. **Browser surface.** Safari does not expose a system-symbols API to JavaScript or CSS. The `system-ui` / `-apple-system` font stack gives you the system **text** font, not symbol glyphs.

This means: **for the foreseeable web-only future, we cannot use SF Symbols.** We can, however, choose an open-source icon set whose style is close enough to feel native on Apple devices, and design the storage so that *if* a native Apple wrapper (e.g. a SwiftUI shell, a Catalyst port, a future iOS client) is ever built, it can substitute SF Symbols at render time without any schema migration. See §6.3.

### 3.3 User-defined entity types

Because every store has its own set of entity types, the icon system must:

- accept an **arbitrary string** identifier for the icon (not a closed enum),
- degrade gracefully when no icon is set (fall back to today's coloured dot),
- offer a way for the user to **pick** an icon, ideally with auto-suggestion based on the entity type's name.

## 4. Icon library — selection

We need a library that is (a) open-source and freely redistributable, (b) servable as SVG so it can be embedded directly in node styles, (c) reasonably comprehensive (~1000+ glyphs so common concepts like Person, Building, Calendar, Music, Book, Place are all covered), and (d) visually close to SF Symbols' line-art style so users on Apple devices don't feel jarred.

| Library | License | Style match to SF Symbols | Size | Note |
|---|---|---|---|---|
| **Lucide** | ISC | Closest — line, 24px grid, 2 px stroke | ~1500 icons | Fork of Feather, actively maintained |
| **Phosphor** | MIT | Close — multiple weights incl. "regular" line | ~1200 icons | Has Thin/Light/Bold variants |
| **Heroicons** | MIT | Close — Tailwind team, line + solid sets | ~300 icons | Smaller set may be limiting |
| **Material Symbols** | Apache 2.0 | Different — Google's style, fuller body | ~3000 icons | Largest set; least Apple-like |
| **Bootstrap Icons** | MIT | Reasonable — simpler shapes | ~2000 icons | OK fallback |

**Recommendation: Lucide.** It has the closest stylistic affinity to SF Symbols' default "regular" weight, is permissively licensed, and is shipped as both individual SVGs and a single bundle. The visual coherence with SF Symbols means an eventual native iOS client could swap to SF Symbols of the same conceptual name (`user`, `building-2`, `calendar`, `music`, `map-pin`) with minimal disruption to the user's mental model.

Material Symbols is the runner-up if breadth ever becomes the deciding factor.

### 4.1 Delivery

Two options for getting the icons into the page:

- **CDN** (e.g. `unpkg.com/lucide-static@latest/icons/<name>.svg`): zero repo footprint, no build step (matches our "no build" stance in `README.md`), but adds a third-party runtime dependency on top of Cytoscape's CDN.
- **Vendored subset**: ship only the ~50 icons we need under `assets/icons/`. Tighter (no extra origin to trust, works offline), but someone has to curate the subset when new entity types appear.

**Recommendation: vendor a curated subset under `assets/icons/lucide/`**, sized at a known viewBox (24×24), no fill — only `stroke="currentColor"` so the icon recolours via CSS. We already vendor `favicon.svg` the same way. Adding a new icon is a single committed SVG file.

### 4.2 Starting icon set (40 icons)

The set below covers the auto-suggestion vocabulary (§5.2) plus the most common entity-type concepts encountered across typical stores. It is the authoritative starting list for Phase B vendoring.

| Slug | Concept |
|---|---|
| `user` | person, contact, member |
| `users` | group, band, team |
| `building-2` | company, organisation, office |
| `map-pin` | place, location, address |
| `calendar` | event, meeting, appointment |
| `clock` | era, period, timeline |
| `music` | album, song, track, sound |
| `book-open` | book, article, publication |
| `tag` | genre, category, topic |
| `film` | movie, show, recording |
| `globe` | country, world, language |
| `landmark` | monument, institution |
| `star` | award, favourite, rating |
| `briefcase` | project, work, career |
| `layers` | stack, level, hierarchy |
| `link` | connection, relation, url |
| `hash` | number, id, reference |
| `image` | artwork, photo, visual |
| `newspaper` | news, press, article |
| `graduation-cap` | school, education, university |
| `trophy` | achievement, record, prize |
| `heart` | interest, favourite, like |
| `palette` | art, design, style |
| `tv` | show, programme, channel |
| `mail` | email, letter, message |
| `folder` | collection, archive, group |
| `flag` | country, nationality, language |
| `home` | home, residence, property |
| `leaf` | plant, nature, species |
| `shield` | law, security, protection |
| `disc` | record, release, vinyl |
| `microscope` | science, research, experiment |
| `cpu` | technology, software, system |
| `activity` | metric, data, chart |
| `compass` | navigation, exploration |
| `mountain` | geography, terrain, place |
| `flame` | trend, event, highlight |
| `scroll` | document, manuscript, text |
| `store` | shop, retail, brand |
| `circle` | fallback / no-icon placeholder |

## 5. Auto-selection vs user selection

The issue raises the question: "Maybe that could be auto selected, maybe user selection." Both have value; the right answer is **hybrid — auto-suggest, user override**.

### 5.1 Manual selection (always available)

Add an `icon` field on `entity_types`. In the schema editor (`/app/`) where the user already names a type and sets its `display_name`, add a third control: an icon picker. The picker shows a searchable grid of the vendored icons; the user clicks one. Stored as the icon's string identifier (e.g. `user`, `building-2`, `calendar`). A "None" option keeps today's plain-dot behaviour.

### 5.2 Auto-suggestion

When a user creates a new entity type, the editor pre-fills the icon picker with a best-guess icon based on the type's `name` / `display_name`. The mapping is a small lookup table of synonym → icon identifier:

| Type name contains… | Suggested icon |
|---|---|
| `person`, `people`, `user`, `contact`, `human`, `member` | `user` |
| `org`, `organisation`, `company`, `business`, `firm` | `building-2` |
| `place`, `location`, `venue`, `address`, `city`, `country` | `map-pin` |
| `event`, `meeting`, `appointment` | `calendar` |
| `era`, `period`, `age` | `clock` |
| `band`, `group`, `ensemble` | `users` |
| `album`, `song`, `track`, `music`, `recording` | `music` |
| `book`, `publication`, `article`, `paper` | `book-open` |
| `project`, `task`, `todo` | `clipboard-list` |
| `tag`, `genre`, `category`, `topic` | `tag` |
| *(no match)* | `circle` (or fall through to colour-only) |

The matcher is case-insensitive substring search over a list, evaluated in order. Critically the suggestion is just a **default in the picker** — the user can change it on the spot.

This keeps the experience zero-friction for the obvious cases ("I made a `Person` type, it picked a person icon, fine") and explicit for the unusual cases ("I made an `Era` type and want the hourglass instead of the clock").

### 5.3 Why not pure auto

Going auto-only — "we'll always derive the icon from the type name" — fails for two reasons. First, type names are arbitrary user strings, often in the user's own language or domain shorthand, so any heuristic will miss most cases. Second, the icon then becomes a *function* of the type name, so renaming a type silently changes its icon: a confusing UX. Persisting an explicit choice avoids both.

## 6. Storage and schema changes

### 6.1 New column on `entity_types`

Add to `worker/migrations/0003_entity_type_icon.sql`:

```sql
ALTER TABLE entity_types ADD COLUMN icon TEXT;
```

`NULL` means "no icon set — fall back to the plain coloured dot". A populated value is an icon identifier (a slug, e.g. `user`, `building-2`). It is **not** a path or URL — the frontend resolves the slug to an asset path at render time. This indirection is the key affordance for §6.3.

### 6.2 API changes

- `GET /api/stores/:storeId/graph` already returns `entityTypes` with `id`, `name`, `display_name`; add `icon` to that shape.
- `POST /api/stores/:storeId/entity-types` and `PUT /api/entity-types/:typeId` accept an optional `icon` field.
- Validation: icon is either `NULL` or a string of `[a-z0-9-]{1,40}`. The Worker does **not** validate that the icon exists in our vendored set — that's a frontend concern, and keeping it loose lets a future native client store its own identifiers (see §6.3) without a backend migration.

### 6.3 Native-platform future-proofing

Because the stored value is a **slug**, not a path, the frontend (or any future client) is free to resolve it however it likes. The web client resolves `user` → `/assets/icons/lucide/user.svg`. A hypothetical future SwiftUI client could resolve `user` → `Image(systemName: "person.fill")`. To make that mapping painless we should keep our slug vocabulary close to SF Symbols' conceptual names where reasonable (e.g. prefer `person` over `human`; `building` over `office`), even if Lucide names them differently. The web client's slug→file map handles the divergence.

So: **the schema does not encode an Apple-specific concept, but the slug vocabulary is chosen to map cleanly to SF Symbols if and when a native client appears**. That is the practical interpretation of "ideally SF symbols on Apple platforms if permitted" — we encode intent, not implementation.

## 7. Rendering in Cytoscape

Cytoscape nodes support a `background-image` style with `background-fit`, `background-clip`, and `background-image-opacity`. The plan:

- Look up the entity type's `icon` slug → SVG path (or fall through to no icon).
- Set `background-image: url(...)` on the node, with `background-fit: 'contain'`, `background-clip: 'none'`, and `background-image-opacity: 1`.
- Keep the background colour (today's `etColor()`) as the **fill behind** the icon. With a white-stroke icon on a coloured fill, the type colour still does the macro-grouping work; the icon does the micro-identification.
- Increase node size from `30 × 30` to `36 × 36` so the icon at ~18 px inside a coloured circle is legible without crowding labels (`assets/js/graph.js:111`–`112`).
- Vendor all SVGs with `stroke="currentColor"` unchanged. At graph init time, fetch each needed icon once, then generate **two data URIs** from the raw SVG text: one with `stroke="#ffffff"` (for use as the node background image on the coloured fill) and one with the type's palette colour substituted in (for the filter-sidebar chip). Store both in the in-memory slug map. No pre-processing step, no duplicate files. The fetch burst is ~40 small same-origin requests, completing in a single round-trip on HTTP/2.

The Cytoscape style block grows by ~5 lines; no new library is needed.

### 7.1 Filter chips, info panel, focus mode

The colour-dot in the filter sidebar (`.graph-color-dot`, `assets/css/app.css:847`) should also pick up the icon when one is set — same SVG source file, smaller (12 px), rendered using the colour-tinted data URI (the second of the two URIs generated at init time — see §7). This keeps the legend in sync with the graph and gives the filter UI a glance-readability boost.

## 8. UI for selection (schema editor)

In the entity-type create/edit form in `/app/`:

1. After the `display_name` field, add a labelled control `Icon (optional)`.
2. The control renders as a button showing the currently-selected icon (or "None"). Click opens a popover.
3. The popover contains:
   - A search box (substring match against icon slugs and synonyms).
   - A grid of the vendored icons (~6 per row, scrollable).
   - A "None" tile at the top for the colour-only behaviour.
4. Selection updates the button and closes the popover.
5. On form submit, the slug is `PUT` to the entity-type endpoint.

**Interaction model (Phase C):** click-only. Keyboard navigation (arrow keys within grid, Enter to select, Escape to close) is a follow-on task — deferred to avoid the substantial vanilla-JS grid-navigation work in the initial implementation.

When a *new* entity type is being created, the auto-suggestion (§5.2) pre-populates the button; the user can still change it before saving.

## 9. Accessibility

Icons reinforce, never replace, the entity-type label. The graph view already shows the type name in the legend; the existing node label (the entity's own name, below the dot) is untouched. The icon should improve discoverability for users who struggle to distinguish colours but must not become load-bearing for users who cannot see the icons (e.g. screen-reader users navigating the table view will still see the type name in plain text).

Concretely:

- Do **not** rely on icon alone — keep the colour fill.
- Ensure colour-vs-stroke contrast meets WCAG AA on every palette colour (the white stroke on the current 12-step palette is fine but should be checked once at vendoring time).
- The icon picker popover needs keyboard navigation: arrow keys move within the grid, Enter selects, Escape closes.

## 10. Phasing

Cleanly splittable into three commits, each independently useful:

**Phase A — schema and storage** ✅
- `worker/migrations/0003_entity_type_icon.sql` — `ALTER TABLE entity_types ADD COLUMN icon TEXT`.
- `POST /api/stores/:storeId/entity-types` and `PUT /api/entity-types/:id` accept optional `icon` (slug, validated `/^[a-z0-9-]{1,40}$/`, stored as NULL if absent/empty).
- `GET /api/stores/:storeId/graph` already uses `SELECT *` on entity types, so `icon` is included automatically once the migration is applied.
- Run `npm run migrate:local` and `npm run migrate:remote` to apply.
- No UI change. Picker shows nothing yet.

**Phase B — vendored icon set and graph rendering** ✅
- 40 SVGs vendored under `assets/icons/lucide/` (ISC licence, `stroke="currentColor"` unchanged).
- `loadIcons(entityTypes)` in `assets/js/graph.js` fetches each needed slug once at init, generates two data URIs per slug: white-stroke for node backgrounds, palette-coloured for sidebar chips. Stored in `iconData` map.
- Cytoscape node style uses `background-image: data(iconUri)` on the `node[iconUri != ""]` selector; size increased 30×30 → 36×36.
- Filter sidebar: entity types with an icon render a `.graph-icon-chip` (rounded square, tinted background, coloured-stroke icon at 12 px) instead of the plain `.graph-color-dot`.

**Phase C — icon picker UI in the schema editor**
- Picker popover with search.
- Auto-suggestion on new entity type creation (§5.2).

Each phase is shippable. Phase A on its own is invisible to users (no UI). Phase B is usable if a tech-savvy user sets icons via the API. Phase C closes the loop.

## 11. Out of scope (for now)

- **Per-entity icon overrides** (e.g. one particular Person showing a different glyph). The schema does not currently model per-instance presentation; adding it is a much larger change and not requested.
- **Custom user-uploaded icons.** Possible later (the slug is just a string — a `custom:<id>` prefix could resolve to a user-uploaded SVG), but Cloudflare Pages is statically served, so uploads would need a new R2 + Worker path. Defer.
- **Icon weight / variants.** SF Symbols' Thin/Light/Regular/Bold weights have no equivalent in Lucide's single-weight set. Skip until we have a concrete need.
- **A native SwiftUI client.** Mentioned in §6.3 only to explain why the slug indirection exists — not part of this proposal.

## 12. Resolved decisions

- **Icon set size:** vendor the curated 40-icon set from §4.2. Not the full Lucide bundle. New icons are added as single SVG commits when a concrete need arises.
- **Slug vocabulary:** left free — validated as `/^[a-z0-9-]{1,40}$/` but not checked against a closed list. Keeps the schema flexible for future clients (see §6.3).
- **Per-store override registry:** not needed. One global slug → asset path map per client is sufficient; stores remain icon-agnostic.
- **SVG colouring:** two data URIs generated at init time from a single `stroke="currentColor"` source file — one with `stroke="#ffffff"` for node backgrounds, one with the type's palette colour for sidebar chips. No pre-processing, no duplicate files. See §7.
- **Cytoscape image loading:** fetch icons at graph init as same-origin requests; embed as `data:image/svg+xml;base64,...` URIs in the slug map. Avoids Cytoscape cross-origin image issues.
- **Phase C keyboard navigation:** deferred. Click-only picker ships first.
