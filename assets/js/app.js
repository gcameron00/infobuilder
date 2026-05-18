// Info Builder — schema management app
// Runs only on /app/. Assumes the Worker API is accessible.

// ── Config ────────────────────────────────────────────────────────────────────

// Dev: use the local Worker directly.
// Prod: call the Worker URL directly (CORS allows the Pages domain; Zero Trust protects access).
const API = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : 'https://infobuilder-worker.me-2e8.workers.dev'

const DATA_TYPES = ['string', 'text', 'number', 'date', 'datetime', 'boolean', 'email', 'phone', 'url']

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
      <button class="btn btn--ghost btn--sm" data-action="show-new-store">+ New store</button>
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
            <strong>${esc(et.display_name)}</strong>
            <code>${esc(et.name)}</code>
          </div>
          <div class="type-card__actions">
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

  const typeOptions = DATA_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')

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
  const typeOptions = DATA_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')
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
  const btn = e.target.closest('[data-action]')
  if (!btn) return
  const action = btn.dataset.action

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

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  try {
    state.stores = await api.get('/api/stores')
    if (state.stores.length > 0) await loadStore(state.stores[0].id)
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
