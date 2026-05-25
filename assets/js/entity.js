// Info Builder — entity document view & create form
// URL params:
//   ?id=ENTITY_ID              → view/edit existing entity
//   ?type=TYPE_ID&store=STORE_ID → create new entity

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : ''

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  mode: null,
  storeId: null,
  entityTypeId: null,
  entityId: null,
  entity: null,
  entityType: null,
  store: null,
  allEntityTypes: [],
  relationshipTypes: [],
  relationships: [],
  editingField: null,
  addRelVisible: false,
  addRelTypeId: null,
  addRelType: null,
  addRelEntityList: [],
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(method, path, body) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } }
  if (body !== undefined) opts.body = JSON.stringify(body)
  const res = await fetch(API + path, opts)
  const data = await res.json().catch(() => null)
  if (data === null) throw new Error(`Non-JSON response from ${path} (status ${res.status})`)
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

const api = {
  get:  (path)       => apiFetch('GET',    path),
  post: (path, body) => apiFetch('POST',   path, body),
  put:  (path, body) => apiFetch('PUT',    path, body),
  del:  (path)       => apiFetch('DELETE', path),
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function entityLabel(fvs, fields) {
  const TITLE_FIELDS = ['name', 'full_name', 'title', 'label']
  for (const key of TITLE_FIELDS) {
    if (fvs?.[key]) return String(fvs[key])
  }
  if (fields) {
    for (const f of fields) {
      if (fvs?.[f.name]) return String(fvs[f.name])
    }
  }
  return '—'
}

function formatPartialDate(str) {
  const parts = str.split('-')
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  if (parts.length === 2) return `${months[parseInt(parts[1], 10) - 1] ?? parts[1]} ${parts[0]}`
  if (parts.length === 3) return `${parseInt(parts[2], 10)} ${months[parseInt(parts[1], 10) - 1] ?? parts[1]} ${parts[0]}`
  return str
}

function formatValue(val, dataType) {
  if (val === null || val === undefined || val === '') {
    return '<span class="field-empty">—</span>'
  }
  if (dataType === 'boolean') return val ? 'Yes' : 'No'
  if (dataType === 'partial_date') return esc(formatPartialDate(String(val)))
  if (dataType === 'url') {
    return `<a href="${esc(String(val))}" target="_blank" rel="noopener">${esc(String(val))}</a>`
  }
  return esc(String(val))
}

function fieldInput(f, currentVal) {
  const v = esc(currentVal ?? '')
  if (f.data_type === 'text') {
    return `<textarea name="${esc(f.name)}" rows="3" class="field-edit-input">${v}</textarea>`
  }
  if (f.data_type === 'boolean') {
    return `<label class="checkbox-label">
      <input type="checkbox" name="${esc(f.name)}" class="field-edit-checkbox" ${currentVal ? 'checked' : ''}>
      ${esc(f.name)}
    </label>`
  }
  if (f.data_type === 'partial_date') {
    const parts = currentVal ? String(currentVal).split('-') : []
    const y = esc(parts[0] ?? '')
    const m = esc(parts[1] ? String(parseInt(parts[1], 10)) : '')
    const d = esc(parts[2] ? String(parseInt(parts[2], 10)) : '')
    return `<div class="partial-date-input">
      <input type="number" name="${esc(f.name)}__year"  class="field-edit-input partial-date-year"  placeholder="YYYY" min="1" max="9999" value="${y}">
      <span class="partial-date-sep">–</span>
      <input type="number" name="${esc(f.name)}__month" class="field-edit-input partial-date-month" placeholder="MM"   min="1" max="12"   value="${m}">
      <span class="partial-date-sep">–</span>
      <input type="number" name="${esc(f.name)}__day"   class="field-edit-input partial-date-day"   placeholder="DD"   min="1" max="31"   value="${d}">
    </div>`
  }
  const typeMap = { date: 'date', datetime: 'datetime-local', number: 'number', email: 'email', phone: 'tel', url: 'url' }
  const inputType = typeMap[f.data_type] || 'text'
  return `<input type="${inputType}" name="${esc(f.name)}" value="${v}" class="field-edit-input">`
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderBreadcrumb() {
  const storeId  = state.storeId ?? ''
  const storeName = esc(state.store?.name ?? '')
  const typeName  = esc(state.entityType?.display_name ?? '')
  return `
    <nav class="entity-breadcrumb" aria-label="Breadcrumb">
      <a href="/app/">App</a>
      <span class="breadcrumb-sep">›</span>
      ${storeId
        ? `<a href="/app/?store=${esc(storeId)}">${storeName}</a>`
        : `<span>${storeName}</span>`}
      ${typeName ? `<span class="breadcrumb-sep">›</span><span>${typeName}</span>` : ''}
    </nav>
  `
}

function renderCreateForm() {
  const fields = state.entityType?.fields ?? []

  const fieldInputs = fields.map(f => `
    <div class="form-group">
      <label for="cf-${esc(f.name)}">${esc(f.name)}${f.required ? ' <span class="required-mark">*</span>' : ''}</label>
      ${fieldInput(f, null)}
    </div>
  `).join('')

  return `
    ${renderBreadcrumb()}
    <div class="entity-header">
      <h1 class="entity-title">New ${esc(state.entityType?.display_name ?? 'Entity')}</h1>
    </div>
    <div class="entity-body">
      <form class="entity-create-form" data-action="create-entity">
        ${fieldInputs || '<p class="entity-empty">No fields defined for this entity type. Add fields in the schema editor first.</p>'}
        <div id="create-entity-error"></div>
        <div class="form-actions" style="margin-top:var(--space-2)">
          <button class="btn btn--primary" type="submit">Create</button>
          <button class="btn btn--ghost" type="button" onclick="history.back()">Cancel</button>
        </div>
      </form>
    </div>
  `
}

function renderViewMode() {
  const label = entityLabel(state.entity?.field_values, state.entityType?.fields)
  return `
    ${renderBreadcrumb()}
    <div class="entity-header">
      <h1 class="entity-title">${esc(label)}</h1>
      <div class="entity-header-actions">
        <span class="entity-type-badge">${esc(state.entityType?.display_name ?? '')}</span>
        <button class="btn btn--danger btn--sm" data-action="delete-entity">Delete</button>
      </div>
    </div>
    <div class="entity-body">
      <section class="entity-section">
        <h2 class="entity-section-title">Details</h2>
        ${renderFields()}
      </section>
      <section class="entity-section">
        <h2 class="entity-section-title">Relationships</h2>
        ${renderRelationships()}
      </section>
    </div>
  `
}

function renderFields() {
  const fields = state.entityType?.fields ?? []
  const fvs    = state.entity?.field_values ?? {}

  if (fields.length === 0) {
    return '<p class="entity-empty">No fields defined. Add fields in the schema editor.</p>'
  }

  const rows = fields.map(f => {
    if (state.editingField === f.name) {
      return `
        <div class="field-view-row field-view-row--editing">
          <div class="field-view-label">${esc(f.name)}${f.required ? ' <span class="required-mark">*</span>' : ''}</div>
          <form class="field-edit-form" data-action="save-field" data-field="${esc(f.name)}">
            <div class="field-edit-controls">
              ${fieldInput(f, fvs[f.name])}
              <button class="btn btn--primary btn--sm" type="submit">Save</button>
              <button class="btn btn--ghost btn--sm" type="button" data-action="cancel-edit-field">Cancel</button>
            </div>
          </form>
        </div>
      `
    }
    return `
      <div class="field-view-row" data-action="edit-field" data-field="${esc(f.name)}" title="Click to edit">
        <div class="field-view-label">${esc(f.name)}</div>
        <div class="field-view-value">${formatValue(fvs[f.name], f.data_type)}</div>
        <div class="field-view-type">${esc(f.data_type)}</div>
      </div>
    `
  }).join('')

  return `<div class="field-view-list">${rows}</div>`
}

function renderRelationships() {
  const rels  = state.relationships
  const etMap = Object.fromEntries(state.allEntityTypes.map(et => [et.id, et]))
  let html    = ''

  if (rels.length > 0) {
    const groups = {}
    for (const r of rels) {
      const label = r.direction === 'outgoing'
        ? r.rel_type_name
        : (r.inverse_label || `← ${r.rel_type_name}`)
      if (!groups[label]) groups[label] = []
      groups[label].push(r)
    }

    for (const [label, items] of Object.entries(groups)) {
      const rows = items.map(r => {
        const relEtFields = etMap[r.related_entity_type_id]?.fields ?? null
        const relLabel    = entityLabel(r.related_entity_field_values, relEtFields)
        const relTypeName = etMap[r.related_entity_type_id]?.display_name ?? '?'
        const fvEntries   = Object.entries(r.field_values ?? {}).filter(([, v]) => v !== '' && v !== null && v !== undefined)
        const fvHtml      = fvEntries.length > 0
          ? `<dl class="rel-field-values">${fvEntries.map(([k, v]) =>
              `<div class="rel-fv-pair"><dt>${esc(k)}</dt><dd>${esc(String(v))}</dd></div>`
            ).join('')}</dl>`
          : ''
        return `
          <div class="rel-row">
            <div class="rel-row-top">
              <a class="rel-entity-link" href="/app/entity/?id=${esc(r.related_entity_id)}">${esc(relLabel)}</a>
              <span class="rel-type-badge">${esc(relTypeName)}</span>
              <button class="btn-icon btn-icon--danger" data-action="delete-rel" data-id="${esc(r.id)}">×</button>
            </div>
            ${fvHtml}
          </div>
        `
      }).join('')

      html += `
        <div class="rel-group">
          <div class="rel-group-label">${esc(label)}</div>
          <div class="rel-group-rows">${rows}</div>
        </div>
      `
    }
  } else {
    html = '<p class="entity-empty">No relationships yet.</p>'
  }

  html += renderAddRelSection()
  return html
}

function renderAddRelSection() {
  const validRelTypes = state.relationshipTypes.filter(rt =>
    rt.source_entity_type_id === state.entityTypeId ||
    rt.target_entity_type_id === state.entityTypeId
  )

  if (!state.addRelVisible) {
    if (validRelTypes.length === 0) return ''
    return `<button class="btn btn--ghost btn--sm" style="margin-top:var(--space-4)" data-action="show-add-rel">+ Add relationship</button>`
  }

  const rtOptions = validRelTypes
    .map(rt => `<option value="${esc(rt.id)}"${rt.id === state.addRelTypeId ? ' selected' : ''}>${esc(rt.name)}</option>`)
    .join('')

  let entitySelect  = ''
  let relFieldInputs = ''
  const rt = state.addRelType

  if (state.addRelTypeId && rt) {
    const isSource  = rt.source_entity_type_id === state.entityTypeId
    const isTarget  = rt.target_entity_type_id === state.entityTypeId
    const isSelfRef = isSource && isTarget

    if (isSelfRef) {
      entitySelect += `
        <div class="form-group" style="flex:0 0 9rem">
          <label>My role</label>
          <select name="self_role">
            <option value="source">Source (→)</option>
            <option value="target">Target (←)</option>
          </select>
        </div>
      `
    }

    if (state.addRelEntityList.length > 0) {
      const options = state.addRelEntityList.map(e => {
        const lbl = entityLabel(e.field_values, null)
        return `<option value="${esc(e.id)}">${esc(lbl)}</option>`
      }).join('')
      entitySelect += `
        <div class="form-group">
          <label>Related entity</label>
          <select name="other_entity_id" required>${options}</select>
        </div>
      `
    } else {
      entitySelect += `<div class="form-group"><p class="entity-empty" style="margin:var(--space-2) 0 0">No entities of that type yet.</p></div>`
    }

    if (rt.fields?.length) {
      relFieldInputs = `<div class="form-row" style="margin-top:var(--space-3)">` +
        rt.fields.map(f => `
          <div class="form-group">
            <label>${esc(f.name)}${f.required ? ' <span class="required-mark">*</span>' : ''}</label>
            ${fieldInput(f, null)}
          </div>
        `).join('') +
        `</div>`
    }
  }

  return `
    <div class="add-rel-form">
      <form data-action="add-rel">
        <div class="form-row" style="align-items:flex-end">
          <div class="form-group">
            <label>Relationship type</label>
            <select name="relationship_type_id" id="add-rel-type" required>
              <option value="">— select —</option>
              ${rtOptions}
            </select>
          </div>
          ${entitySelect}
        </div>
        ${relFieldInputs}
        <div id="add-rel-error"></div>
        <div class="form-actions" style="margin-top:var(--space-3)">
          <button class="btn btn--primary btn--sm" type="submit"${!state.addRelTypeId ? ' disabled' : ''}>Add</button>
          <button class="btn btn--ghost btn--sm" type="button" data-action="cancel-add-rel">Cancel</button>
        </div>
      </form>
    </div>
  `
}

// ── DOM helpers ───────────────────────────────────────────────────────────────

function setHtml(id, html) {
  const el = document.getElementById(id)
  if (el) el.innerHTML = html
}

function showError(id, msg) {
  setHtml(id, `<div class="error-msg">${esc(msg)}</div>`)
}

function renderPage() {
  const root = document.getElementById('entity-root')
  if (!root) return
  root.innerHTML = state.mode === 'create' ? renderCreateForm() : renderViewMode()
}

// ── Load helpers ──────────────────────────────────────────────────────────────

async function reloadRelationships() {
  state.relationships = await api.get(`/api/entities/${state.entityId}/relationships`)
}

async function loadAddRelEntities(rtId) {
  const rt       = await api.get(`/api/relationship-types/${rtId}`)
  state.addRelType = rt
  const isSource  = rt.source_entity_type_id === state.entityTypeId
  const isTarget  = rt.target_entity_type_id === state.entityTypeId
  const otherTypeId = (isSource && !isTarget)
    ? rt.target_entity_type_id
    : rt.source_entity_type_id
  const res = await api.get(`/api/entity-types/${otherTypeId}/entities?limit=200`)
  state.addRelEntityList = res.results ?? []
}

// ── Events ────────────────────────────────────────────────────────────────────

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]')
  if (!btn) return
  const action = btn.dataset.action

  if (action === 'edit-field') {
    state.editingField = btn.dataset.field
    renderPage()
    requestAnimationFrame(() => {
      const input = document.querySelector('.field-edit-input, .field-edit-checkbox')
      if (input) input.focus()
    })
    return
  }

  if (action === 'cancel-edit-field') {
    state.editingField = null
    renderPage()
    return
  }

  if (action === 'delete-entity') {
    if (!confirm('Delete this entity? This will also remove all its relationships.')) return
    try {
      await api.del(`/api/entities/${state.entityId}`)
      window.location.href = '/app/'
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    return
  }

  if (action === 'delete-rel') {
    if (!confirm('Remove this relationship?')) return
    try {
      await api.del(`/api/relationships/${btn.dataset.id}`)
      await reloadRelationships()
      renderPage()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    return
  }

  if (action === 'show-add-rel') {
    state.addRelVisible   = true
    state.addRelTypeId    = null
    state.addRelType      = null
    state.addRelEntityList = []
    renderPage()
    return
  }

  if (action === 'cancel-add-rel') {
    state.addRelVisible   = false
    state.addRelTypeId    = null
    state.addRelType      = null
    state.addRelEntityList = []
    renderPage()
    return
  }
})

document.addEventListener('change', async (e) => {
  if (e.target.id !== 'add-rel-type') return
  const rtId = e.target.value
  if (!rtId) {
    state.addRelTypeId    = null
    state.addRelType      = null
    state.addRelEntityList = []
    renderPage()
    return
  }
  state.addRelTypeId = rtId
  await loadAddRelEntities(rtId)
  renderPage()
  const sel = document.getElementById('add-rel-type')
  if (sel) sel.value = rtId
})

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-action]')
  if (!form) return
  e.preventDefault()
  const action = form.dataset.action
  const fd     = new FormData(form)

  if (action === 'save-field') {
    const fieldName = form.dataset.field
    const field     = state.entityType.fields.find(f => f.name === fieldName)
    if (!field) return

    const fvs = { ...state.entity.field_values }
    let val
    if (field.data_type === 'boolean') {
      val = fd.get(fieldName) === 'on'
    } else if (field.data_type === 'number') {
      const raw = fd.get(fieldName)
      val = raw !== '' && raw !== null ? Number(raw) : null
    } else if (field.data_type === 'partial_date') {
      const y = (fd.get(`${fieldName}__year`) ?? '').trim()
      const m = (fd.get(`${fieldName}__month`) ?? '').trim()
      const d = (fd.get(`${fieldName}__day`) ?? '').trim()
      if (y) {
        val = y
        if (m) {
          val += '-' + m.padStart(2, '0')
          if (d) val += '-' + d.padStart(2, '0')
        }
      }
    } else {
      val = fd.get(fieldName) || null
    }

    if (val === null || val === undefined) {
      delete fvs[fieldName]
    } else {
      fvs[fieldName] = val
    }

    try {
      const updated    = await api.put(`/api/entities/${state.entityId}`, { field_values: fvs })
      state.entity     = updated
      state.editingField = null
      renderPage()
    } catch (err) {
      alert(`Error: ${err.message}`)
    }
    return
  }

  if (action === 'create-entity') {
    const fvs = {}
    for (const f of state.entityType.fields) {
      if (f.data_type === 'boolean') {
        fvs[f.name] = fd.get(f.name) === 'on'
      } else if (f.data_type === 'number') {
        const raw = fd.get(f.name)
        if (raw !== '' && raw !== null) fvs[f.name] = Number(raw)
      } else if (f.data_type === 'partial_date') {
        const y = (fd.get(`${f.name}__year`) ?? '').trim()
        const m = (fd.get(`${f.name}__month`) ?? '').trim()
        const d = (fd.get(`${f.name}__day`) ?? '').trim()
        if (y) {
          let val = y
          if (m) {
            val += '-' + m.padStart(2, '0')
            if (d) val += '-' + d.padStart(2, '0')
          }
          fvs[f.name] = val
        }
      } else {
        const raw = fd.get(f.name)
        if (raw) fvs[f.name] = raw
      }
    }
    try {
      const entity = await api.post(`/api/stores/${state.storeId}/entities`, {
        entity_type_id: state.entityTypeId,
        field_values: fvs,
      })
      window.location.href = `/app/entity/?id=${entity.id}`
    } catch (err) {
      showError('create-entity-error', err.message)
    }
    return
  }

  if (action === 'add-rel') {
    const rtId        = fd.get('relationship_type_id') || state.addRelTypeId
    const otherEntity = fd.get('other_entity_id')
    if (!rtId || !otherEntity) {
      showError('add-rel-error', 'Select a relationship type and entity.')
      return
    }
    const rt       = state.addRelType
    const isSource  = rt.source_entity_type_id === state.entityTypeId
    const isTarget  = rt.target_entity_type_id === state.entityTypeId
    const isSelfRef = isSource && isTarget

    let sourceId, targetId
    if (isSelfRef) {
      const role = fd.get('self_role') || 'source'
      sourceId = role === 'source' ? state.entityId : otherEntity
      targetId = role === 'source' ? otherEntity    : state.entityId
    } else if (isSource) {
      sourceId = state.entityId
      targetId = otherEntity
    } else {
      sourceId = otherEntity
      targetId = state.entityId
    }

    const relFvs = {}
    for (const f of (rt.fields ?? [])) {
      if (f.data_type === 'boolean') {
        relFvs[f.name] = fd.get(f.name) === 'on'
      } else {
        const raw = fd.get(f.name)
        if (raw) relFvs[f.name] = raw
      }
    }

    try {
      await api.post('/api/relationships', {
        relationship_type_id: rtId,
        source_entity_id:     sourceId,
        target_entity_id:     targetId,
        field_values:         relFvs,
      })
      state.addRelVisible   = false
      state.addRelTypeId    = null
      state.addRelType      = null
      state.addRelEntityList = []
      await reloadRelationships()
      renderPage()
    } catch (err) {
      showError('add-rel-error', err.message)
    }
    return
  }
})

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  const params   = new URLSearchParams(window.location.search)
  const entityId = params.get('id')
  const typeId   = params.get('type')
  const storeId  = params.get('store')

  const root = document.getElementById('entity-root')
  if (!root) return

  try {
    if (entityId) {
      state.mode     = 'view'
      state.entityId = entityId

      const entity     = await api.get(`/api/entities/${entityId}`)
      const entityType = await api.get(`/api/entity-types/${entity.entity_type_id}`)

      state.entity      = entity
      state.entityType  = entityType
      state.entityTypeId = entityType.id
      state.storeId     = entityType.store_id

      const [store, relTypes, allEntityTypes, relationships] = await Promise.all([
        api.get(`/api/stores/${entityType.store_id}`),
        api.get(`/api/stores/${entityType.store_id}/relationship-types`),
        api.get(`/api/stores/${entityType.store_id}/entity-types`),
        api.get(`/api/entities/${entityId}/relationships`),
      ])

      state.store             = store
      state.relationshipTypes = relTypes
      state.allEntityTypes    = allEntityTypes
      state.relationships     = relationships

      document.title = `${entityLabel(entity.field_values, entityType.fields)} — Info Builder`

    } else if (typeId && storeId) {
      state.mode        = 'create'
      state.entityTypeId = typeId
      state.storeId     = storeId

      const [entityType, store] = await Promise.all([
        api.get(`/api/entity-types/${typeId}`),
        api.get(`/api/stores/${storeId}`),
      ])

      state.entityType = entityType
      state.store      = store

      document.title = `New ${entityType.display_name} — Info Builder`

    } else {
      root.innerHTML = '<div class="empty-state">No entity specified. <a href="/app/">Go to App</a></div>'
      return
    }

    renderPage()
  } catch (err) {
    root.innerHTML = `<div class="empty-state">Failed to load: ${esc(err.message)}<br><a href="/app/">Go to App</a></div>`
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
