// Info Builder — flat / table view
// URL param: ?type=TYPE_ID

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : ''

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  entityTypeId: null,
  entityType: null,
  store: null,
  rows: [],
  total: 0,
  limit: 50,
  offset: 0,
  sort: '',
  dir: 'asc',
  search: '',
  quickAddVisible: false,
  searchTimer: null,
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

function formatCell(val, dataType) {
  if (val === null || val === undefined || val === '') return '<span class="cell-empty">—</span>'
  if (dataType === 'boolean') return val ? 'Yes' : 'No'
  const s = String(val)
  return esc(s.length > 100 ? s.slice(0, 100) + '…' : s)
}

function fieldInput(f, currentVal) {
  const v = esc(currentVal ?? '')
  if (f.data_type === 'text') {
    return `<textarea name="${esc(f.name)}" rows="2" class="field-edit-input">${v}</textarea>`
  }
  if (f.data_type === 'boolean') {
    return `<label class="checkbox-label">
      <input type="checkbox" name="${esc(f.name)}" ${currentVal ? 'checked' : ''}>
      ${esc(f.name)}
    </label>`
  }
  const typeMap = { date: 'date', datetime: 'datetime-local', number: 'number', email: 'email', phone: 'tel', url: 'url' }
  const inputType = typeMap[f.data_type] || 'text'
  return `<input type="${inputType}" name="${esc(f.name)}" value="${v}" class="field-edit-input">`
}

// ── Load ──────────────────────────────────────────────────────────────────────

async function loadEntities() {
  const params = new URLSearchParams({
    limit:  String(state.limit),
    offset: String(state.offset),
  })
  if (state.sort)   { params.set('sort', state.sort); params.set('dir', state.dir) }
  if (state.search) params.set('search', state.search)

  const res = await api.get(`/api/entity-types/${state.entityTypeId}/entities?${params}`)
  state.rows  = res.results
  state.total = res.total
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderPage() {
  const root = document.getElementById('entities-root')
  if (!root) return
  root.innerHTML = renderContent()
}

function renderContent() {
  const fields = state.entityType?.fields ?? []
  const storeId = state.entityType?.store_id ?? ''

  const thCells = fields.map(f => {
    const active = state.sort === f.name
    const icon   = active ? (state.dir === 'asc' ? ' ▲' : ' ▼') : ''
    return `<th class="col-sortable${active ? ' col-sorted' : ''}"
                data-action="sort-col" data-field="${esc(f.name)}"
                title="Sort by ${esc(f.name)}">${esc(f.name)}${icon}</th>`
  }).join('')

  const bodyRows = state.rows.map(e => {
    const cells = fields.map(f => `<td>${formatCell(e.field_values[f.name], f.data_type)}</td>`).join('')
    return `<tr class="entity-row" data-action="open-entity" data-id="${esc(e.id)}">${cells}</tr>`
  }).join('')

  const start   = state.total === 0 ? 0 : state.offset + 1
  const end     = Math.min(state.offset + state.limit, state.total)
  const pageInfo = state.total === 0 ? 'No entities' : `${start}–${end} of ${state.total}`
  const hasPrev  = state.offset > 0
  const hasNext  = state.offset + state.limit < state.total

  const colSpan = fields.length || 1

  return `
    <nav class="entity-breadcrumb" aria-label="Breadcrumb">
      <a href="/app/">App</a>
      <span class="breadcrumb-sep">›</span>
      ${state.store?.id
        ? `<a href="/app/?store=${esc(state.store.id)}">${esc(state.store?.name ?? '')}</a>`
        : `<span>${esc(state.store?.name ?? '')}</span>`}
      <span class="breadcrumb-sep">›</span>
      <span>${esc(state.entityType?.display_name ?? '')}</span>
    </nav>

    <div class="entities-toolbar">
      <div class="entities-toolbar-left">
        <h1 class="entities-title">
          ${esc(state.entityType?.display_name ?? '')}
          <span class="entities-count">${state.total}</span>
        </h1>
      </div>
      <div class="entities-toolbar-right">
        <input class="search-input" type="search" id="search-input"
               placeholder="Search…" value="${esc(state.search)}" aria-label="Search entities">
        <button class="btn btn--ghost btn--sm" data-action="toggle-quick-add">
          ${state.quickAddVisible ? 'Cancel' : 'Quick add'}
        </button>
        <a class="btn btn--primary btn--sm"
           href="/app/entity/?type=${esc(state.entityTypeId)}&store=${esc(storeId)}">+ New</a>
      </div>
    </div>

    ${state.quickAddVisible ? renderQuickAddForm(fields) : ''}

    <div class="entities-table-wrap">
      <table class="entities-table">
        <thead>
          <tr>${thCells || '<th>Entity</th>'}</tr>
        </thead>
        <tbody>
          ${bodyRows || `<tr><td colspan="${colSpan}" class="table-empty">No entities found.</td></tr>`}
        </tbody>
      </table>
    </div>

    <div class="entities-pagination">
      <span class="pagination-info">${pageInfo}</span>
      <div class="pagination-btns">
        <button class="btn btn--ghost btn--sm" data-action="prev-page" ${hasPrev ? '' : 'disabled'}>← Prev</button>
        <button class="btn btn--ghost btn--sm" data-action="next-page" ${hasNext ? '' : 'disabled'}>Next →</button>
      </div>
    </div>
  `
}

function renderQuickAddForm(fields) {
  const inputs = fields.map(f => `
    <div class="form-group">
      <label>${esc(f.name)}${f.required ? ' <span class="required-mark">*</span>' : ''}</label>
      ${fieldInput(f, null)}
    </div>
  `).join('')

  return `
    <div class="quick-add-form">
      <form data-action="quick-add">
        <div class="form-row">
          ${inputs || '<p class="entity-empty" style="margin:0">No fields defined for this type.</p>'}
        </div>
        <div id="quick-add-error"></div>
        <div class="form-actions" style="margin-top:var(--space-3)">
          <button class="btn btn--primary btn--sm" type="submit">Add</button>
          <button class="btn btn--ghost btn--sm" type="button" data-action="toggle-quick-add">Cancel</button>
        </div>
      </form>
    </div>
  `
}

// ── Events ────────────────────────────────────────────────────────────────────

document.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]')
  if (!btn) return
  const action = btn.dataset.action

  if (action === 'sort-col') {
    const field = btn.dataset.field
    if (state.sort === field) {
      state.dir = state.dir === 'asc' ? 'desc' : 'asc'
    } else {
      state.sort = field
      state.dir  = 'asc'
    }
    state.offset = 0
    await loadEntities()
    renderPage()
    return
  }

  if (action === 'open-entity') {
    window.location.href = `/app/entity/?id=${btn.dataset.id}`
    return
  }

  if (action === 'prev-page') {
    state.offset = Math.max(0, state.offset - state.limit)
    await loadEntities()
    renderPage()
    return
  }

  if (action === 'next-page') {
    state.offset += state.limit
    await loadEntities()
    renderPage()
    return
  }

  if (action === 'toggle-quick-add') {
    state.quickAddVisible = !state.quickAddVisible
    renderPage()
    if (state.quickAddVisible) {
      requestAnimationFrame(() => {
        document.querySelector('.quick-add-form input, .quick-add-form textarea')?.focus()
      })
    }
    return
  }
})

document.addEventListener('input', (e) => {
  if (e.target.id !== 'search-input') return
  clearTimeout(state.searchTimer)
  const val = e.target.value
  state.searchTimer = setTimeout(async () => {
    state.search = val
    state.offset = 0
    await loadEntities()
    renderPage()
    const input = document.getElementById('search-input')
    if (input) { input.focus(); input.setSelectionRange(val.length, val.length) }
  }, 350)
})

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-action]')
  if (!form) return
  e.preventDefault()
  const action = form.dataset.action

  if (action === 'quick-add') {
    const fd  = new FormData(form)
    const fvs = {}
    for (const f of (state.entityType?.fields ?? [])) {
      if (f.data_type === 'boolean') {
        fvs[f.name] = fd.get(f.name) === 'on'
      } else if (f.data_type === 'number') {
        const raw = fd.get(f.name)
        if (raw !== '' && raw !== null) fvs[f.name] = Number(raw)
      } else {
        const raw = fd.get(f.name)
        if (raw) fvs[f.name] = raw
      }
    }
    try {
      await api.post(`/api/stores/${state.entityType.store_id}/entities`, {
        entity_type_id: state.entityTypeId,
        field_values:   fvs,
      })
      state.quickAddVisible = false
      state.offset = 0
      await loadEntities()
      renderPage()
    } catch (err) {
      const errEl = document.getElementById('quick-add-error')
      if (errEl) errEl.innerHTML = `<div class="error-msg">${esc(err.message)}</div>`
    }
    return
  }
})

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  const params = new URLSearchParams(window.location.search)
  const typeId = params.get('type')

  const root = document.getElementById('entities-root')
  if (!root) return

  if (!typeId) {
    root.innerHTML = '<div class="empty-state">No entity type specified. <a href="/app/">Go to App</a></div>'
    return
  }

  try {
    state.entityTypeId = typeId
    const entityType   = await api.get(`/api/entity-types/${typeId}`)
    state.entityType   = entityType

    const [store] = await Promise.all([
      api.get(`/api/stores/${entityType.store_id}`),
      loadEntities(),
    ])
    state.store = store

    document.title = `${entityType.display_name} — Info Builder`
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
