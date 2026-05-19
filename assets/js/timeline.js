// Info Builder — timeline view
// URL param: ?store=STORE_ID

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : ''

const LANE_H = 72  // px height of each swimlane row
const AXIS_H = 32  // px height of the date axis at the bottom

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  storeId:    null,
  store:      null,
  swimlanes:  [],
  minDate:    null,
  maxDate:    null,
  basePxPerDay: 2,
  zoom:       1,
}

// ── API helpers ───────────────────────────────────────────────────────────────

async function apiFetch(path) {
  const res  = await fetch(API + path, { headers: { 'Content-Type': 'application/json' } })
  const data = await res.json().catch(() => null)
  if (data === null) throw new Error(`Non-JSON response from ${path}`)
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`)
  return data
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function esc(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function entityLabel(fvs) {
  for (const k of ['name', 'full_name', 'title', 'label']) {
    if (fvs?.[k]) return String(fvs[k])
  }
  const first = Object.values(fvs ?? {}).find(v => v && typeof v !== 'object')
  return first ? String(first).slice(0, 40) : '?'
}

function pxPerDay() {
  return state.basePxPerDay * state.zoom
}

function dateToX(dateStr) {
  const ms = new Date(dateStr).getTime()
  return (ms - state.minDate) / 86400000 * pxPerDay()
}

function totalWidth() {
  return Math.ceil((state.maxDate - state.minDate) / 86400000 * pxPerDay())
}

// ── Date range ────────────────────────────────────────────────────────────────

function computeDateRange() {
  let min = Infinity, max = -Infinity
  for (const lane of state.swimlanes) {
    for (const e of lane.entities) {
      const t = new Date(e.field_values[lane.dateField]).getTime()
      if (!isNaN(t)) { min = Math.min(min, t); max = Math.max(max, t) }
    }
  }
  if (!isFinite(min)) { min = max = Date.now() }
  // Pad by 5% or 30 days on each side
  const pad = Math.max((max - min) * 0.08, 30 * 86400000)
  state.minDate = min - pad
  state.maxDate = max + pad
}

function computeBase() {
  const trackWidth = Math.max(400, window.innerWidth - 180)  // subtract labels column
  const days = Math.max(1, (state.maxDate - state.minDate) / 86400000)
  state.basePxPerDay = trackWidth / days
}

// ── Rendering ─────────────────────────────────────────────────────────────────

function renderAxis(w) {
  const ppd      = pxPerDay()
  const pxPerYear = ppd * 365
  const showMonths = pxPerYear >= 100
  let html = ''

  // Walk year boundaries
  const start = new Date(state.minDate)
  start.setMonth(0, 1); start.setHours(0, 0, 0, 0)
  let year = start.getFullYear()

  while (true) {
    const yearDate = new Date(year, 0, 1)
    const x = dateToX(yearDate.toISOString().slice(0, 10))
    if (x > w + 60) break
    if (x >= -60) {
      html += `<div class="axis-tick axis-tick--year" style="left:${Math.round(x)}px">${year}</div>`
    }
    if (showMonths) {
      for (let m = 1; m < 12; m++) {
        const mDate = new Date(year, m, 1)
        const mx    = dateToX(mDate.toISOString().slice(0, 10))
        if (mx >= -20 && mx <= w + 20) {
          const lbl = pxPerYear >= 400
            ? mDate.toLocaleString('default', { month: 'short' })
            : ''
          html += `<div class="axis-tick axis-tick--month" style="left:${Math.round(mx)}px">${esc(lbl)}</div>`
        }
      }
    }
    year++
    if (year > 2200) break
  }
  return html
}

function renderGridlines(w) {
  let html = ''
  const start = new Date(state.minDate)
  start.setMonth(0, 1); start.setHours(0, 0, 0, 0)
  let year = start.getFullYear()
  while (true) {
    const x = dateToX(new Date(year, 0, 1).toISOString().slice(0, 10))
    if (x > w + 1) break
    if (x >= 0) html += `<div class="timeline-gridline" style="left:${Math.round(x)}px"></div>`
    year++
    if (year > 2200) break
  }
  return html
}

function renderDots(lane) {
  return lane.entities.map(e => {
    const x   = dateToX(e.field_values[lane.dateField])
    const lbl = entityLabel(e.field_values)
    return `
      <button class="timeline-dot" data-id="${esc(e.id)}" style="left:${Math.round(x)}px"
              aria-label="${esc(lbl)}">
        <span class="timeline-dot-label">${esc(lbl)}</span>
      </button>
    `
  }).join('')
}

function renderInner() {
  const w = totalWidth()
  const totalH = state.swimlanes.length * LANE_H + AXIS_H

  const tracks = state.swimlanes.map(lane => `
    <div class="timeline-track" style="height:${LANE_H}px">
      ${renderDots(lane)}
    </div>
  `).join('')

  return `
    <div id="timeline-inner" style="position:relative; width:${w}px; height:${totalH}px; min-width:100%">
      ${renderGridlines(w)}
      ${tracks}
      <div class="timeline-axis" style="position:absolute; bottom:0; left:0; width:${w}px; height:${AXIS_H}px">
        ${renderAxis(w)}
      </div>
    </div>
  `
}

function renderPage() {
  const root = document.getElementById('timeline-root')
  if (!root) return

  if (state.swimlanes.length === 0) {
    root.innerHTML = `
      <div class="entity-main">
        <nav class="entity-breadcrumb">
          <a href="/app/">App</a><span class="breadcrumb-sep">›</span>
          <span>${esc(state.store?.name ?? '')}</span><span class="breadcrumb-sep">›</span>
          <span>Timeline</span>
        </nav>
        <div class="empty-state" style="text-align:left;padding:0">
          No entity types with <code>date</code> or <code>datetime</code> fields found in this store.
        </div>
      </div>
    `
    return
  }

  const labelRows = state.swimlanes.map(lane => `
    <div class="timeline-label-cell" style="height:${LANE_H}px">
      <span class="timeline-label-name">${esc(lane.entityType.display_name)}</span>
      <span class="timeline-label-field">${esc(lane.dateField)}</span>
    </div>
  `).join('')

  root.innerHTML = `
    <div class="timeline-toolbar">
      <nav class="entity-breadcrumb" style="margin:0">
        <a href="/app/">App</a><span class="breadcrumb-sep">›</span>
        <span>${esc(state.store?.name ?? '')}</span><span class="breadcrumb-sep">›</span>
        <span>Timeline</span>
      </nav>
      <label class="timeline-zoom-label">
        Zoom
        <input type="range" id="zoom-slider" min="0.25" max="20" step="0.25" value="1">
      </label>
      <span id="zoom-val" class="timeline-zoom-val">1×</span>
    </div>
    <div class="timeline-content">
      <div class="timeline-labels-col">
        ${labelRows}
        <div class="timeline-axis-spacer" style="height:${AXIS_H}px"></div>
      </div>
      <div class="timeline-scroll-area" id="timeline-scroll">
        ${renderInner()}
      </div>
    </div>
  `

  document.getElementById('zoom-slider').addEventListener('input', onZoom)
}

function onZoom(e) {
  const scrollEl   = document.getElementById('timeline-scroll')
  const oldW       = scrollEl.scrollWidth
  const scrollRatio = oldW > 0 ? (scrollEl.scrollLeft + scrollEl.clientWidth / 2) / oldW : 0.5

  state.zoom = parseFloat(e.target.value)
  document.getElementById('zoom-val').textContent = `${state.zoom}×`

  scrollEl.innerHTML = renderInner()

  // Restore proportional scroll so the centre of the view stays centred
  requestAnimationFrame(() => {
    const newW = scrollEl.scrollWidth
    scrollEl.scrollLeft = newW * scrollRatio - scrollEl.clientWidth / 2
  })
}

// ── Events ────────────────────────────────────────────────────────────────────

document.addEventListener('click', (e) => {
  const dot = e.target.closest('.timeline-dot[data-id]')
  if (dot) window.location.href = `/app/entity/?id=${dot.dataset.id}`
})

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  const params  = new URLSearchParams(window.location.search)
  const storeId = params.get('store')
  const root    = document.getElementById('timeline-root')

  if (!storeId) {
    root.innerHTML = '<div class="empty-state">No store specified. <a href="/app/">Go to App</a></div>'
    return
  }

  state.storeId = storeId

  try {
    const [store, data] = await Promise.all([
      apiFetch(`/api/stores/${storeId}`),
      apiFetch(`/api/stores/${storeId}/timeline`),
    ])

    state.store     = store
    state.swimlanes = data.swimlanes

    document.title = `${store.name} — Timeline — Info Builder`

    if (state.swimlanes.length > 0) {
      computeDateRange()
      computeBase()
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
