// Info Builder — schema management app
// Runs only on /app/. Assumes the Worker API is accessible.

// ── Config ────────────────────────────────────────────────────────────────────

// Dev: call the local Worker directly (no Pages Function in dev).
// Prod: use relative paths — the Pages Function at /api/* proxies to the Worker with the secret.
const API = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : ''

const DATA_TYPES = ['string', 'text', 'number', 'date', 'datetime', 'partial_date', 'boolean', 'email', 'phone', 'url']
const DATA_TYPE_LABELS = { partial_date: 'partial date' }

const ICONS = [
  'activity','book-open','briefcase','building-2','calendar','circle',
  'clock','compass','cpu','disc','film','flag','flame','folder',
  'globe','graduation-cap','hash','heart','home','image','landmark',
  'layers','leaf','link','mail','map-pin','microscope','mountain',
  'music','newspaper','palette','scroll','shield','star','store',
  'tag','trophy','tv','user','users',
]

const ICON_SUGGESTIONS = [
  [['person','people','user','contact','human','member'], 'user'],
  [['org','organisation','organization','company','business','firm'], 'building-2'],
  [['place','location','venue','address','city','country'], 'map-pin'],
  [['event','meeting','appointment'], 'calendar'],
  [['era','period','age'], 'clock'],
  [['band','group','ensemble','team'], 'users'],
  [['album','song','track','music','recording','sound'], 'music'],
  [['book','publication','article','paper'], 'book-open'],
  [['tag','genre','category','topic'], 'tag'],
  [['film','movie','cinema'], 'film'],
  [['show','programme','program','channel'], 'tv'],
  [['disc','record','vinyl','release'], 'disc'],
  [['award','prize','trophy','achievement'], 'trophy'],
  [['label','store','shop','brand','retail'], 'store'],
]

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  stores: [],
  storeId: null,
  entityTypes: [],
  relationshipTypes: [],
  tab: 'entity-types',
  expandedId: null,
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(API + path, opts)
  const data = await res.json().catch(() => null)
  if (data === null) throw new Error(`Non-JSON response from ${path} (status ${res.status}) — check the API proxy URL`)
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const api = {
  get:  (path)       => apiFetch('GET',    path),
  post: (path, body) => apiFetch('POST',   path, body),
  put:  (path, body) => apiFetch('PUT',    path, body),
  del:  (path)       => apiFetch('DELETE', path),
}

// ── Escaping ──────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Icon picker ───────────────────────────────────────────────────────────────

function suggestIcon(name) {
  const lower = name.toLowerCase()
  for (const [terms, slug] of ICON_SUGGESTIONS) {
    if (terms.some(t => lower.includes(t))) return slug
  }
  return ''
}

function iconPickerHtml(selectedIcon) {
  const sel = selectedIcon || ''
  const tiles = ICONS.map(slug => `
    <button type="button" class="icon-tile${slug === sel ? ' icon-tile--selected' : ''}"
            data-action="select-icon" data-slug="${slug}" title="${slug}">
      <img src="/assets/icons/lucide/${slug}.svg" width="18" height="18" alt="">
      <span>${slug}</span>
    </button>
  `).join('')

  const triggerInner = sel
    ? `<img src="/assets/icons/lucide/${esc(sel)}.svg" width="14" height="14" alt=""> <span>${esc(sel)}</span>`
    : '<span>None</span>'

  return `
    <div class="form-group icon-picker-wrap">
      <label>Icon <span class="field-optional">(optional)</span></label>
      <input type="hidden" name="icon" value="${esc(sel)}">
      <button type="button" class="icon-picker-trigger" data-action="toggle-icon-picker">
        ${triggerInner} <span class="icon-picker-caret">▾</span>
      </button>
      <div class="icon-picker-popover" hidden>
        <input type="text" class="icon-picker-search" placeholder="Search icons…" autocomplete="off">
        <div class="icon-picker-grid">
          <button type="button" class="icon-tile icon-tile--none${!sel ? ' icon-tile--selected' : ''}"
                  data-action="select-icon" data-slug="" title="None">
            <span class="icon-tile-dash">—</span>
            <span>none</span>
          </button>
          ${tiles}
        </div>
      </div>
    </div>
  `
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderSidebar() {
  const items = state.stores.map(s => `
    <button class="store-item${s.id === state.storeId ? ' store-item--active' : ''}"
            data-action="select-store" data-id="${s.id}">
      ${esc(s.name)}
    </button>
  `).join('')

  return `
    <div class="sidebar__label">Stores</div>
    <div class="sidebar__stores">
      ${items || '<p class="empty-state" style="padding:0;text-align:left;font-size:.85rem;">No stores yet.</p>'}
    </div>
    <div id="new-store-slot"></div>
    <div class="sidebar__footer">
      ${state.storeId ? `
        <div style="display:flex;gap:var(--space-2)">
          <a class="btn btn--ghost btn--sm" href="/app/graph/?store=${state.storeId}" style="flex:1;text-align:center;text-decoration:none">Graph</a>
          <a class="btn btn--ghost btn--sm" href="/app/timeline/?store=${state.storeId}" style="flex:1;text-align:center;text-decoration:none">Timeline</a>
        </div>
        <div style="display:flex;gap:var(--space-2)">
          <button class="btn btn--ghost btn--sm" data-action="export-store" style="flex:1">Export</button>
          <button class="btn btn--sm btn--danger-outline" data-action="delete-store" style="flex:1">Delete</button>
        </div>
      ` : ''}
      <div style="display:flex;gap:var(--space-2)">
        <button class="btn btn--ghost btn--sm" data-action="show-new-store" style="flex:1">+ New store</button>
        <button class="btn btn--ghost btn--sm" data-action="import-store" style="flex:1">Import</button>
      </div>
      <input type="file" id="import-file-input" accept=".json" style="display:none">
    </div>
  `
}

function renderSchemaContent() {
  if (!state.storeId) {
    return '<div class="empty-state">Select a store, or create one to get started.</div>'
  }
  return `
    <div class="tab-bar">
      <button class="tab${state.tab === 'entity-types' ? ' tab--active' : ''}"
              data-action="switch-tab" data-tab="entity-types">Entity Types</button>
      <button class="tab${state.tab === 'relationship-types' ? ' tab--active' : ''}"
              data-action="switch-tab" data-tab="relationship-types">Relationship Types</button>
    </div>
    <div class="tab-content">
      ${state.tab === 'entity-types' ? renderEntityTypes() : renderRelationshipTypes()}
    </div>
  `
}

function renderEntityTypes() {
  const cards = state.entityTypes.map(et => {
    const expanded = state.expandedId === et.id
    return `
      <div class="type-card">
        <div class="type-card__header">
          <div class="type-card__title">
            ${et.icon ? `<img src="/assets/icons/lucide/${esc(et.icon)}.svg" width="16" height="16" class="et-card-icon" alt="">` : ''}
            <strong>${esc(et.display_name)}</strong>
            <code>${esc(et.name)}</code>
          </div>
          <div class="type-card__actions">
            <a class="btn-icon" href="/app/entities/?type=${et.id}">View</a>
            <a class="btn-icon" href="/app/entity/?type=${et.id}&store=${state.storeId}">+ New</a>
            <button class="btn-icon" data-action="toggle-fields"
                    data-id="${et.id}" data-parent="entity_type"
                    aria-expanded="${expanded}">${expanded ? '▲' : '▼'} Fields</button>
            <button class="btn-icon" data-action="edit-entity-type" data-id="${et.id}">Edit</button>
            <button class="btn-icon btn-icon--danger" data-action="delete-entity-type" data-id="${et.id}">Delete</button>
          </div>
        </div>
        ${expanded ? `<div class="type-card__body" id="fields-panel-${et.id}"><em>Loading…</em></div>` : ''}
      </div>
    `
  }).join('')

  return `
    ${cards}
    <div id="new-entity-type-slot"></div>
    <button class="btn btn--ghost btn--sm mt-4" data-action="show-new-entity-type">+ Add entity type</button>
  `
}

function renderRelationshipTypes() {
  const etMap = Object.fromEntries(state.entityTypes.map(et => [et.id, et]))

  const cards = state.relationshipTypes.map(rt => {
    const src = etMap[rt.source_entity_type_id]?.display_name ?? '?'
    const tgt = etMap[rt.target_entity_type_id]?.display_name ?? '?'
    const arrow = rt.directed ? '→' : '↔'
    const expanded = state.expandedId === rt.id
    return `
      <div class="type-card">
        <div class="type-card__header">
          <div class="type-card__title">
            <strong>${esc(rt.name)}</strong>
            <span class="type-meta">${esc(src)} ${arrow} ${esc(tgt)}</span>
            ${rt.inverse_label ? `<code>${esc(rt.inverse_label)}</code>` : ''}
          </div>
          <div class="type-card__actions">
            <button class="btn-icon" data-action="toggle-fields"
                    data-id="${rt.id}" data-parent="relationship_type"
                    aria-expanded="${expanded}">${expanded ? '▲' : '▼'} Fields</button>
            <button class="btn-icon" data-action="edit-relationship-type" data-id="${rt.id}">Edit</button>
            <button class="btn-icon btn-icon--danger" data-action="delete-relationship-type" data-id="${rt.id}">Delete</button>
          </div>
        </div>
        ${expanded ? `<div class="type-card__body" id="fields-panel-${rt.id}"><em>Loading…</em></div>` : ''}
      </div>
    `
  }).join('')

  const etOptions = state.entityTypes
    .map(et => `<option value="${et.id}">${esc(et.display_name)}</option>`)
    .join('')

  return `
    ${cards}
    <div id="new-rel-type-slot"></div>
    <button class="btn btn--ghost btn--sm mt-4" data-action="show-new-relationship-type"
            ${state.entityTypes.length < 2 ? 'disabled title="Add at least two entity types first"' : ''}>
      + Add relationship type
    </button>
    <template id="et-options">${etOptions}</template>
  `
}

function renderFieldsPanel(fields, typeId, parentType) {
  const apiBase = parentType === 'entity_type'
    ? `/api/entity-types/${typeId}`
    : `/api/relationship-types/${typeId}`

  const rows = fields.map(f => `
    <div class="field-row">
      <span class="field-name">${esc(f.name)}</span>
      <span class="field-type">${esc(f.data_type)}</span>
      <span class="field-required">${f.required ? 'required' : ''}</span>
      <span class="field-order" style="color:var(--color-muted);font-size:.75rem;">order: ${f.display_order}</span>
      <div style="display:flex;gap:var(--space-1)">
        <button class="btn-icon btn-icon--danger" data-action="delete-field"
                data-id="${f.id}" data-type-id="${typeId}" data-parent="${parentType}">×</button>
      </div>
    </div>
  `).join('')

  const typeOptions = DATA_TYPES.map(t => `<option value="${t}">${DATA_TYPE_LABELS[t] || t}</option>`).join('')

  return `
    <div class="field-list">${rows || '<p style="color:var(--color-muted);font-size:.85rem;margin:0">No fields yet.</p>'}</div>
    <div id="new-field-slot-${typeId}"></div>
    <button class="btn btn--ghost btn--sm" data-action="show-new-field"
            data-type-id="${typeId}" data-parent="${parentType}"
            data-api="${apiBase}/fields">+ Add field</button>
  `
}

// ── Forms ─────────────────────────────────────────────────────────────────────

function newStoreForm() {
  return `
    <form class="inline-form" data-action="create-store" style="margin-top:var(--space-2)">
      <h3>New store</h3>
      <div class="form-group">
        <label for="ns-name">Name</label>
        <input id="ns-name" name="name" required placeholder="e.g. Contacts" autofocus>
      </div>
      <div class="form-group">
        <label for="ns-desc">Description</label>
        <input id="ns-desc" name="description" placeholder="Optional">
      </div>
      <div id="new-store-error"></div>
      <div class="form-actions">
        <button class="btn btn--primary btn--sm" type="submit">Create</button>
        <button class="btn btn--ghost btn--sm" type="button" data-action="cancel-new-store">Cancel</button>
      </div>
    </form>
  `
}

function newEntityTypeForm() {
  return `
    <form class="inline-form" data-action="create-entity-type">
      <h3>New entity type</h3>
      <div class="form-row">
        <div class="form-group">
          <label for="net-name">Internal name</label>
          <input id="net-name" name="name" required placeholder="e.g. person" autofocus>
        </div>
        <div class="form-group">
          <label for="net-display">Display name</label>
          <input id="net-display" name="display_name" required placeholder="e.g. Person">
        </div>
      </div>
      ${iconPickerHtml('')}
      <div id="new-et-error"></div>
      <div class="form-actions">
        <button class="btn btn--primary btn--sm" type="submit">Create</button>
        <button class="btn btn--ghost btn--sm" type="button" data-action="cancel-form" data-slot="new-entity-type-slot">Cancel</button>
      </div>
    </form>
  `
}

function editEntityTypeForm(et) {
  return `
    <form class="inline-form" data-action="update-entity-type" data-id="${et.id}">
      <h3>Edit entity type</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Internal name</label>
          <input name="name" required value="${esc(et.name)}">
        </div>
        <div class="form-group">
          <label>Display name</label>
          <input name="display_name" required value="${esc(et.display_name)}">
        </div>
      </div>
      ${iconPickerHtml(et.icon ?? '')}
      <div id="edit-et-error"></div>
      <div class="form-actions">
        <button class="btn btn--primary btn--sm" type="submit">Save</button>
        <button class="btn btn--ghost btn--sm" type="button" data-action="cancel-edit-et">Cancel</button>
      </div>
    </form>
  `
}

function newRelationshipTypeForm() {
  const etOptions = state.entityTypes
    .map(et => `<option value="${et.id}">${esc(et.display_name)}</option>`)
    .join('')

  return `
    <form class="inline-form" data-action="create-relationship-type">
      <h3>New relationship type</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Name</label>
          <input name="name" required placeholder="e.g. WorksFor" autofocus>
        </div>
        <div class="form-group">
          <label>Inverse label</label>
          <input name="inverse_label" placeholder="e.g. Employs (optional)">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Source entity type</label>
          <select name="source_entity_type_id" required>${etOptions}</select>
        </div>
        <div class="form-group">
          <label>Target entity type</label>
          <select name="target_entity_type_id" required>${etOptions}</select>
        </div>
        <div class="form-group form-group--checkbox" style="flex:none">
          <input type="checkbox" id="nrt-directed" name="directed" checked>
          <label for="nrt-directed">Directed (→)</label>
        </div>
      </div>
      <div id="new-rt-error"></div>
      <div class="form-actions">
        <button class="btn btn--primary btn--sm" type="submit">Create</button>
        <button class="btn btn--ghost btn--sm" type="button" data-action="cancel-form" data-slot="new-rel-type-slot">Cancel</button>
      </div>
    </form>
  `
}

function editRelationshipTypeForm(rt) {
  const etOptions = (selected) => state.entityTypes
    .map(et => `<option value="${et.id}"${et.id === selected ? ' selected' : ''}>${esc(et.display_name)}</option>`)
    .join('')

  return `
    <form class="inline-form" data-action="update-relationship-type" data-id="${rt.id}">
      <h3>Edit relationship type</h3>
      <div class="form-row">
        <div class="form-group">
          <label>Name</label>
          <input name="name" required value="${esc(rt.name)}">
        </div>
        <div class="form-group">
          <label>Inverse label</label>
          <input name="inverse_label" value="${esc(rt.inverse_label ?? '')}">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Source entity type</label>
          <select name="source_entity_type_id" required>${etOptions(rt.source_entity_type_id)}</select>
        </div>
        <div class="form-group">
          <label>Target entity type</label>
          <select name="target_entity_type_id" required>${etOptions(rt.target_entity_type_id)}</select>
        </div>
        <div class="form-group form-group--checkbox" style="flex:none">
          <input type="checkbox" id="ert-directed" name="directed" ${rt.directed ? 'checked' : ''}>
          <label for="ert-directed">Directed (→)</label>
        </div>
      </div>
      <div id="edit-rt-error"></div>
      <div class="form-actions">
        <button class="btn btn--primary btn--sm" type="submit">Save</button>
        <button class="btn btn--ghost btn--sm" type="button" data-action="cancel-edit-rt">Cancel</button>
      </div>
    </form>
  `
}

function newFieldForm(typeId, parentType, apiPath) {
  const typeOptions = DATA_TYPES.map(t => `<option value="${t}">${DATA_TYPE_LABELS[t] || t}</option>`).join('')
  return `
    <form class="inline-form" data-action="create-field"
          data-type-id="${typeId}" data-parent="${parentType}" data-api="${apiPath}"
          style="margin-top:var(--space-2)">
      <div class="form-row">
        <div class="form-group">
          <label>Field name</label>
          <input name="name" required placeholder="e.g. full_name" autofocus>
        </div>
        <div class="form-group" style="flex:0 0 8rem">
          <label>Data type</label>
          <select name="data_type">${typeOptions}</select>
        </div>
        <div class="form-group form-group--checkbox" style="flex:none">
          <input type="checkbox" name="required" id="nf-req-${typeId}">
          <label for="nf-req-${typeId}">Required</label>
        </div>
        <div class="form-group" style="flex:0 0 5rem">
          <label>Order</label>
          <input type="number" name="display_order" value="0" min="0" style="width:5rem">
        </div>
      </div>
      <div id="new-field-error-${typeId}"></div>
      <div class="form-actions">
        <button class="btn btn--primary btn--sm" type="submit">Add field</button>
        <button class="btn btn--ghost btn--sm" type="button"
                data-action="cancel-form" data-slot="new-field-slot-${typeId}">Cancel</button>
      </div>
    </form>
  `
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function setHtml(id, html) {
  const el = document.getElementById(id)
  if (el) el.innerHTML = html
}

function showError(slotId, msg) {
  setHtml(slotId, `<div class="error-msg">${esc(msg)}</div>`)
}

// ── Actions ───────────────────────────────────────────────────────────────────

async function loadStore(storeId) {
  state.storeId = storeId
  state.expandedId = null
  const [ets, rts] = await Promise.all([
    api.get(`/api/stores/${storeId}/entity-types`),
    api.get(`/api/stores/${storeId}/relationship-types`),
  ])
  state.entityTypes = ets
  state.relationshipTypes = rts
}

async function loadFields(typeId, parentType) {
  const path = parentType === 'entity_type'
    ? `/api/entity-types/${typeId}/fields`
    : `/api/relationship-types/${typeId}/fields`
  const fields = await api.get(path)
  setHtml(`fields-panel-${typeId}`, renderFieldsPanel(fields, typeId, parentType))
}

// ── Event delegation ──────────────────────────────────────────────────────────

document.addEventListener('click', async (e) => {
  // Close any open icon picker when clicking outside a picker wrap
  if (!e.target.closest('.icon-picker-wrap')) {
    document.querySelectorAll('.icon-picker-popover:not([hidden])').forEach(p => { p.hidden = true })
  }

  const btn = e.target.closest('[data-action]')
  if (!btn) return
  const action = btn.dataset.action

  if (action === 'toggle-icon-picker') {
    const wrap = btn.closest('.icon-picker-wrap')
    const popover = wrap.querySelector('.icon-picker-popover')
    const wasOpen = !popover.hidden
    document.querySelectorAll('.icon-picker-popover:not([hidden])').forEach(p => { p.hidden = true })
    if (!wasOpen) {
      const rect = btn.getBoundingClientRect()
      popover.style.top  = (rect.bottom + 4) + 'px'
      popover.style.left = rect.left + 'px'
      popover.hidden = false
      popover.querySelector('.icon-picker-search')?.focus()
    }
    return
  }

  if (action === 'select-icon') {
    const wrap = btn.closest('.icon-picker-wrap')
    const slug = btn.dataset.slug
    const hiddenInput = wrap.querySelector('input[name="icon"]')
    hiddenInput.value = slug
    hiddenInput.dataset.userSelected = '1'
    const trigger = wrap.querySelector('.icon-picker-trigger')
    trigger.innerHTML = slug
      ? `<img src="/assets/icons/lucide/${esc(slug)}.svg" width="14" height="14" alt=""> <span>${esc(slug)}</span> <span class="icon-picker-caret">▾</span>`
      : '<span>None</span> <span class="icon-picker-caret">▾</span>'
    wrap.querySelectorAll('.icon-tile').forEach(t =>
      t.classList.toggle('icon-tile--selected', t.dataset.slug === slug)
    )
    wrap.querySelector('.icon-picker-popover').hidden = true
    return
  }

  if (action === 'delete-store') {
    const store = state.stores.find(s => s.id === state.storeId)
    if (!store) return
    if (!confirm(`Delete "${store.name}"?\n\nThis permanently removes all entity types, entities, and relationships. This cannot be undone.`)) return
    try {
      await api.del(`/api/stores/${state.storeId}`)
      state.stores = state.stores.filter(s => s.id !== state.storeId)
      state.storeId = null
      state.entityTypes = []
      state.relationshipTypes = []
      if (state.stores.length > 0) await loadStore(state.stores[0].id)
      setHtml('sidebar', renderSidebar())
      setHtml('schema-content', renderSchemaContent())
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    return
  }

  if (action === 'export-store') {
    try {
      const data  = await api.get(`/api/stores/${state.storeId}/export`)
      const blob  = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url   = URL.createObjectURL(blob)
      const a     = document.createElement('a')
      const name  = (state.stores.find(s => s.id === state.storeId)?.name ?? 'store')
        .toLowerCase().replace(/\s+/g, '-')
      a.href     = url
      a.download = `${name}-export.json`
      a.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      alert(`Export failed: ${err.message}`)
    }
    return
  }

  if (action === 'import-store') {
    document.getElementById('import-file-input')?.click()
    return
  }

  if (action === 'select-store') {
    await loadStore(btn.dataset.id)
    setHtml('schema-content', renderSchemaContent())
    setHtml('sidebar', renderSidebar())
    return
  }

  if (action === 'show-new-store') {
    setHtml('new-store-slot', newStoreForm())
    document.getElementById('ns-name')?.focus()
    return
  }

  if (action === 'cancel-new-store') {
    setHtml('new-store-slot', '')
    return
  }

  if (action === 'switch-tab') {
    state.tab = btn.dataset.tab
    state.expandedId = null
    setHtml('schema-content', renderSchemaContent())
    return
  }

  if (action === 'show-new-entity-type') {
    setHtml('new-entity-type-slot', newEntityTypeForm())
    document.getElementById('net-name')?.focus()
    return
  }

  if (action === 'show-new-relationship-type') {
    setHtml('new-rel-type-slot', newRelationshipTypeForm())
    return
  }

  if (action === 'cancel-form') {
    setHtml(btn.dataset.slot, '')
    return
  }

  if (action === 'toggle-fields') {
    const id = btn.dataset.id
    const parentType = btn.dataset.parent
    if (state.expandedId === id) {
      state.expandedId = null
      setHtml('schema-content', renderSchemaContent())
    } else {
      state.expandedId = id
      setHtml('schema-content', renderSchemaContent())
      await loadFields(id, parentType)
    }
    return
  }

  if (action === 'show-new-field') {
    const { typeId, parent, api: apiPath } = btn.dataset
    setHtml(`new-field-slot-${typeId}`, newFieldForm(typeId, parent, apiPath))
    return
  }

  if (action === 'edit-entity-type') {
    const et = state.entityTypes.find(x => x.id === btn.dataset.id)
    if (!et) return
    // Replace the type card temporarily with the edit form
    const card = btn.closest('.type-card')
    card.innerHTML = editEntityTypeForm(et)
    return
  }

  if (action === 'cancel-edit-et') {
    setHtml('schema-content', renderSchemaContent())
    return
  }

  if (action === 'delete-entity-type') {
    if (!confirm(`Delete this entity type? This will also delete all its entities and relationships.`)) return
    try {
      await api.del(`/api/entity-types/${btn.dataset.id}`)
      state.entityTypes = state.entityTypes.filter(x => x.id !== btn.dataset.id)
      state.expandedId = null
      setHtml('schema-content', renderSchemaContent())
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    return
  }

  if (action === 'edit-relationship-type') {
    const rt = state.relationshipTypes.find(x => x.id === btn.dataset.id)
    if (!rt) return
    const card = btn.closest('.type-card')
    card.innerHTML = editRelationshipTypeForm(rt)
    return
  }

  if (action === 'cancel-edit-rt') {
    setHtml('schema-content', renderSchemaContent())
    return
  }

  if (action === 'delete-relationship-type') {
    if (!confirm('Delete this relationship type? This will also delete all its instances.')) return
    try {
      await api.del(`/api/relationship-types/${btn.dataset.id}`)
      state.relationshipTypes = state.relationshipTypes.filter(x => x.id !== btn.dataset.id)
      state.expandedId = null
      setHtml('schema-content', renderSchemaContent())
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    return
  }

  if (action === 'delete-field') {
    if (!confirm('Delete this field?')) return
    const { id, typeId, parent } = btn.dataset
    try {
      await api.del(`/api/fields/${id}`)
      await loadFields(typeId, parent)
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    return
  }
})

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-action]')
  if (!form) return
  e.preventDefault()
  const action = form.dataset.action
  const data = Object.fromEntries(new FormData(form))

  if (action === 'create-store') {
    try {
      const store = await api.post('/api/stores', { name: data.name, description: data.description || undefined })
      state.stores.push(store)
      await loadStore(store.id)
      setHtml('sidebar', renderSidebar())
      setHtml('schema-content', renderSchemaContent())
    } catch (err) {
      showError('new-store-error', err.message)
    }
    return
  }

  if (action === 'create-entity-type') {
    try {
      const et = await api.post(`/api/stores/${state.storeId}/entity-types`, {
        name: data.name,
        display_name: data.display_name,
        icon: data.icon || undefined,
      })
      state.entityTypes.push(et)
      state.expandedId = null
      setHtml('schema-content', renderSchemaContent())
    } catch (err) {
      showError('new-et-error', err.message)
    }
    return
  }

  if (action === 'update-entity-type') {
    try {
      const updated = await api.put(`/api/entity-types/${form.dataset.id}`, {
        name: data.name,
        display_name: data.display_name,
        icon: data.icon || null,
      })
      state.entityTypes = state.entityTypes.map(x => x.id === updated.id ? updated : x)
      setHtml('schema-content', renderSchemaContent())
    } catch (err) {
      showError('edit-et-error', err.message)
    }
    return
  }

  if (action === 'create-relationship-type') {
    try {
      const rt = await api.post(`/api/stores/${state.storeId}/relationship-types`, {
        name: data.name,
        source_entity_type_id: data.source_entity_type_id,
        target_entity_type_id: data.target_entity_type_id,
        inverse_label: data.inverse_label || undefined,
        directed: 'directed' in data,
      })
      state.relationshipTypes.push(rt)
      state.expandedId = null
      setHtml('schema-content', renderSchemaContent())
    } catch (err) {
      showError('new-rt-error', err.message)
    }
    return
  }

  if (action === 'update-relationship-type') {
    try {
      const updated = await api.put(`/api/relationship-types/${form.dataset.id}`, {
        name: data.name,
        source_entity_type_id: data.source_entity_type_id,
        target_entity_type_id: data.target_entity_type_id,
        inverse_label: data.inverse_label || undefined,
        directed: 'directed' in data,
      })
      state.relationshipTypes = state.relationshipTypes.map(x => x.id === updated.id ? updated : x)
      setHtml('schema-content', renderSchemaContent())
    } catch (err) {
      showError('edit-rt-error', err.message)
    }
    return
  }

  if (action === 'create-field') {
    const { typeId, parent, api: apiPath } = form.dataset
    try {
      await api.post(apiPath, {
        name: data.name,
        data_type: data.data_type,
        required: 'required' in data,
        display_order: parseInt(data.display_order, 10) || 0,
      })
      await loadFields(typeId, parent)
    } catch (err) {
      showError(`new-field-error-${typeId}`, err.message)
    }
    return
  }
})

document.addEventListener('change', async (e) => {
  if (e.target.id !== 'import-file-input') return
  const file = e.target.files?.[0]
  if (!file) return
  e.target.value = ''
  try {
    const json     = JSON.parse(await file.text())
    const newStore = await api.post('/api/stores/import', json)
    state.stores.push(newStore)
    await loadStore(newStore.id)
    setHtml('sidebar', renderSidebar())
    setHtml('schema-content', renderSchemaContent())
  } catch (err) {
    alert(`Import failed: ${err.message}`)
  }
})

document.addEventListener('input', (e) => {
  // Filter icon tiles by search query
  if (e.target.matches('.icon-picker-search')) {
    const q = e.target.value.toLowerCase()
    const grid = e.target.closest('.icon-picker-popover').querySelector('.icon-picker-grid')
    grid.querySelectorAll('.icon-tile').forEach(tile => {
      tile.hidden = q ? !tile.dataset.slug.includes(q) : false
    })
    return
  }

  // Auto-suggest icon when typing the internal name in the new entity type form
  if (e.target.matches('#net-name')) {
    const wrap = e.target.closest('form')?.querySelector('.icon-picker-wrap')
    if (!wrap) return
    const hiddenInput = wrap.querySelector('input[name="icon"]')
    if (hiddenInput.dataset.userSelected) return
    const suggested = suggestIcon(e.target.value)
    hiddenInput.value = suggested
    const trigger = wrap.querySelector('.icon-picker-trigger')
    trigger.innerHTML = suggested
      ? `<img src="/assets/icons/lucide/${suggested}.svg" width="14" height="14" alt=""> <span>${suggested}</span> <span class="icon-picker-caret">▾</span>`
      : '<span>None</span> <span class="icon-picker-caret">▾</span>'
    wrap.querySelectorAll('.icon-tile').forEach(t =>
      t.classList.toggle('icon-tile--selected', t.dataset.slug === suggested)
    )
  }
})

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  try {
    const params     = new URLSearchParams(window.location.search)
    const storeParam = params.get('store')
    state.stores = await api.get('/api/stores')
    const initial = storeParam
      ? (state.stores.find(s => s.id === storeParam) ?? state.stores[0])
      : state.stores[0]
    if (initial) await loadStore(initial.id)
    setHtml('sidebar', renderSidebar())
    setHtml('schema-content', renderSchemaContent())
  } catch (err) {
    setHtml('schema-content', `<div class="empty-state">Could not connect to the API: ${esc(err.message)}</div>`)
    setHtml('sidebar', '<div class="empty-state" style="padding:var(--space-4)">Offline</div>')
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
