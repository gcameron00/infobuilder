// Info Builder — graph view (Cytoscape.js)
// URL param: ?store=STORE_ID

const API = window.location.hostname === 'localhost'
  ? 'http://localhost:8787'
  : ''

const ICON_BASE_PATH = '/assets/icons/lucide/'

// ── State ─────────────────────────────────────────────────────────────────────

const state = {
  storeId: null,
  store: null,
  data: null,
  cy: null,
  hiddenEtIds: new Set(),
  hiddenRtIds: new Set(),
  focusId: null,
}

const PALETTE = [
  '#6366f1', '#f59e0b', '#10b981', '#ef4444',
  '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6',
  '#f97316', '#06b6d4', '#84cc16', '#a855f7',
]

const iconData = {} // slug → { svgText, whiteUri }

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

function etColor(etId) {
  const idx = state.data.entityTypes.findIndex(et => et.id === etId)
  return PALETTE[idx % PALETTE.length] ?? '#94a3b8'
}

function entityLabel(e) {
  const fvs = e.field_values ?? {}
  for (const k of ['name', 'full_name', 'title', 'label']) {
    if (fvs[k]) return String(fvs[k])
  }
  const firstVal = Object.values(fvs).find(v => v)
  return firstVal ? String(firstVal).slice(0, 20) : e.id.slice(0, 8)
}

function rtName(rtId) {
  return state.data.relationshipTypes.find(rt => rt.id === rtId)?.name ?? ''
}

function etName(etId) {
  return state.data.entityTypes.find(et => et.id === etId)?.display_name ?? '?'
}

function svgToUri(svg) {
  return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svg)))
}

// ── Icons ─────────────────────────────────────────────────────────────────────

async function loadIcons(entityTypes) {
  const slugs = [...new Set(entityTypes.map(et => et.icon).filter(Boolean))]
  await Promise.all(slugs.map(async slug => {
    try {
      const res = await fetch(`${ICON_BASE_PATH}${slug}.svg`)
      if (!res.ok) return
      const svg = await res.text()
      iconData[slug] = {
        svgText:  svg,
        whiteUri: svgToUri(svg.replace(/stroke="currentColor"/g, 'stroke="#ffffff"')),
      }
    } catch {}
  }))
}

// ── Graph ─────────────────────────────────────────────────────────────────────

function buildElements() {
  const nodes = state.data.entities.map(e => {
    const et      = state.data.entityTypes.find(x => x.id === e.entity_type_id)
    const iconUri = (et?.icon && iconData[et.icon]?.whiteUri) || ''
    return {
      data: {
        id:      e.id,
        label:   entityLabel(e),
        color:   etColor(e.entity_type_id),
        etId:    e.entity_type_id,
        iconUri,
      },
    }
  })

  const edges = state.data.relationships.map(r => {
    const rt = state.data.relationshipTypes.find(x => x.id === r.relationship_type_id)
    return {
      data: {
        id:          r.id,
        source:      r.source_entity_id,
        target:      r.target_entity_id,
        rtId:        r.relationship_type_id,
        label:       rt?.name ?? '',
        arrow:       rt?.directed ? 'triangle' : 'none',
        relId:       r.id,
      },
    }
  })

  return [...nodes, ...edges]
}

function initGraph() {
  const container = document.getElementById('cy')

  state.cy = cytoscape({
    container,
    elements: buildElements(),
    style: [
      {
        selector: 'node',
        style: {
          'background-color':    'data(color)',
          'label':               'data(label)',
          'font-size':           11,
          'text-valign':         'bottom',
          'text-margin-y':       6,
          'text-max-width':      90,
          'text-wrap':           'ellipsis',
          'width':               36,
          'height':              36,
          'color':               '#374151',
          'cursor':              'pointer',
          'border-width':        0,
        },
      },
      {
        selector: 'node[iconUri != ""]',
        style: {
          'background-image':         'data(iconUri)',
          'background-fit':           'contain',
          'background-image-opacity': 1,
          'background-clip':          'none',
        },
      },
      {
        selector: 'node:selected',
        style: {
          'border-width': 3,
          'border-color': '#6366f1',
        },
      },
      {
        selector: 'edge',
        style: {
          'line-color':              '#cbd5e1',
          'width':                   1.5,
          'label':                   'data(label)',
          'font-size':               9,
          'color':                   '#6b7280',
          'text-background-color':   '#ffffff',
          'text-background-opacity': 0.75,
          'text-background-padding': '2px',
          'curve-style':             'bezier',
          'target-arrow-shape':      'data(arrow)',
          'target-arrow-color':      '#cbd5e1',
        },
      },
      {
        selector: 'edge:selected',
        style: {
          'line-color':         '#6366f1',
          'target-arrow-color': '#6366f1',
        },
      },
      {
        selector: '.faded',
        style: { opacity: 0.15 },
      },
    ],
    layout: { name: 'preset' },  // positions will be set by the layout below
    minZoom: 0.1,
    maxZoom: 4,
  })

  // Tell Cytoscape the container may have just been sized and run the layout
  state.cy.resize()

  const hasEdges   = state.data.relationships.length > 0
  const layoutName = state.data.entities.length <= 1 ? 'grid'
    : hasEdges ? 'cose' : 'grid'

  const layout = state.cy.layout({
    name:            layoutName,
    animate:         state.data.entities.length < 200,
    randomize:       true,
    nodeRepulsion:   () => 400000,
    idealEdgeLength: () => 90,
    gravity:         60,
    numIter:         1000,
    coolingFactor:   0.99,
    minTemp:         1.0,
  })

  layout.on('layoutstop', () => state.cy.fit(undefined, 50))
  layout.run()

  // Click node → navigate to entity document
  state.cy.on('tap', 'node', (e) => {
    window.location.href = `/app/entity/?id=${e.target.id()}`
  })

  // Click edge → show info panel
  state.cy.on('tap', 'edge', (e) => {
    showEdgeInfo(e.target.data())
  })

  // Click background → hide info panel
  state.cy.on('tap', (e) => {
    if (e.target === state.cy) {
      document.getElementById('graph-info').hidden = true
    }
  })
}

function applyFilters() {
  if (!state.cy) return

  state.cy.elements().show()

  for (const etId of state.hiddenEtIds) {
    const nodes = state.cy.nodes(`[etId = "${etId}"]`)
    nodes.hide()
    nodes.connectedEdges().hide()
  }

  for (const rtId of state.hiddenRtIds) {
    state.cy.edges(`[rtId = "${rtId}"]`).hide()
  }

  if (state.focusId) {
    const focus = state.cy.getElementById(state.focusId)
    const neighbourhood = focus.closedNeighborhood()
    state.cy.elements().not(neighbourhood).hide()
    neighbourhood.show()
    // Re-apply entity type filters inside the neighbourhood
    for (const etId of state.hiddenEtIds) {
      neighbourhood.nodes(`[etId = "${etId}"]`).hide()
    }
  }
}

function showEdgeInfo(data) {
  const panel  = document.getElementById('graph-info')
  const srcEnt = state.data.entities.find(e => e.id === data.source)
  const tgtEnt = state.data.entities.find(e => e.id === data.target)
  const srcLbl = srcEnt ? entityLabel(srcEnt) : data.source
  const tgtLbl = tgtEnt ? entityLabel(tgtEnt) : data.target

  panel.innerHTML = `
    <button class="graph-info-close" id="close-info" aria-label="Close">×</button>
    <div class="graph-info-title">${esc(data.label)}</div>
    <div class="graph-info-row">
      <a href="/app/entity/?id=${esc(data.source)}">${esc(srcLbl)}</a>
      <span class="graph-info-arrow">→</span>
      <a href="/app/entity/?id=${esc(data.target)}">${esc(tgtLbl)}</a>
    </div>
  `
  panel.hidden = false

  document.getElementById('close-info').addEventListener('click', () => {
    panel.hidden = true
  })
}

// ── Controls ──────────────────────────────────────────────────────────────────

function renderControls() {
  const etRows = state.data.entityTypes.map((et, i) => {
    const color   = PALETTE[i % PALETTE.length]
    const checked = !state.hiddenEtIds.has(et.id)
    let dotHtml
    if (et.icon && iconData[et.icon]) {
      const coloredSvg = iconData[et.icon].svgText.replace(/stroke="currentColor"/g, `stroke="${color}"`)
      const coloredUri = svgToUri(coloredSvg)
      dotHtml = `<span class="graph-icon-chip" style="background:${color}20"><img src="${coloredUri}" width="12" height="12" alt=""></span>`
    } else {
      dotHtml = `<span class="graph-color-dot" style="background:${color}"></span>`
    }
    return `
      <label class="graph-filter-row">
        <input type="checkbox" data-filter="et" data-id="${esc(et.id)}" ${checked ? 'checked' : ''}>
        ${dotHtml}
        <span>${esc(et.display_name)}</span>
      </label>
    `
  }).join('')

  const rtRows = state.data.relationshipTypes.map(rt => {
    const checked = !state.hiddenRtIds.has(rt.id)
    return `
      <label class="graph-filter-row">
        <input type="checkbox" data-filter="rt" data-id="${esc(rt.id)}" ${checked ? 'checked' : ''}>
        <span>${esc(rt.name)}</span>
      </label>
    `
  }).join('')

  const focusOptions = state.data.entities
    .map(e => `<option value="${esc(e.id)}"${e.id === state.focusId ? ' selected' : ''}>${esc(entityLabel(e))} (${esc(etName(e.entity_type_id))})</option>`)
    .join('')

  const panel = document.getElementById('graph-controls')
  panel.innerHTML = `
    <nav class="entity-breadcrumb graph-breadcrumb" aria-label="Breadcrumb">
      <a href="/app/">App</a>
      <span class="breadcrumb-sep">›</span>
      <a href="/app/?store=${esc(state.storeId ?? '')}">${esc(state.store?.name ?? '')}</a>
      <span class="breadcrumb-sep">›</span>
      <span>Graph</span>
    </nav>

    ${state.data.entityTypes.length > 0 ? `
      <div class="graph-filter-group">
        <span class="graph-filter-label">Entity types</span>
        ${etRows}
      </div>
    ` : ''}

    ${state.data.relationshipTypes.length > 0 ? `
      <div class="graph-filter-group">
        <span class="graph-filter-label">Relationships</span>
        ${rtRows}
      </div>
    ` : ''}

    <div class="graph-filter-group">
      <span class="graph-filter-label">Focus on entity</span>
      <select id="focus-select" class="graph-focus-select">
        <option value="">— show all —</option>
        ${focusOptions}
      </select>
    </div>

    <div class="graph-controls-actions">
      <button class="btn btn--ghost btn--sm" id="fit-btn">Fit</button>
      <button class="btn btn--ghost btn--sm" id="relayout-btn">Re-layout</button>
    </div>

    <div class="graph-stats">${state.data.entities.length} entities · ${state.data.relationships.length} relationships</div>
  `

  // Filter checkboxes
  panel.querySelectorAll('input[data-filter]').forEach(cb => {
    cb.addEventListener('change', () => {
      const { filter, id } = cb.dataset
      const set = filter === 'et' ? state.hiddenEtIds : state.hiddenRtIds
      cb.checked ? set.delete(id) : set.add(id)
      applyFilters()
    })
  })

  // Focus select
  document.getElementById('focus-select').addEventListener('change', (e) => {
    state.focusId = e.target.value || null
    applyFilters()
    if (state.focusId) {
      const node = state.cy.getElementById(state.focusId)
      if (node.length) state.cy.animate({ fit: { eles: node.closedNeighborhood(), padding: 60 }, duration: 400 })
    } else {
      state.cy.animate({ fit: { padding: 40 }, duration: 400 })
    }
  })

  // Fit button
  document.getElementById('fit-btn').addEventListener('click', () => {
    state.cy.animate({ fit: { padding: 40 }, duration: 300 })
  })

  // Re-layout button
  document.getElementById('relayout-btn').addEventListener('click', () => {
    state.cy.layout({ name: 'cose', animate: true, randomize: false, nodeRepulsion: () => 400000, idealEdgeLength: () => 90, gravity: 60 }).run()
  })
}

// ── Boot ──────────────────────────────────────────────────────────────────────

async function init() {
  const params  = new URLSearchParams(window.location.search)
  const storeId = params.get('store')
  const panel   = document.getElementById('graph-controls')

  if (!storeId) {
    panel.innerHTML = '<div class="empty-state" style="padding:var(--space-4)">No store specified. <a href="/app/">Go to App</a></div>'
    return
  }

  state.storeId = storeId

  try {
    const [store, graphData] = await Promise.all([
      apiFetch(`/api/stores/${storeId}`),
      apiFetch(`/api/stores/${storeId}/graph`),
    ])

    state.store = store
    state.data  = graphData

    document.title = `${store.name} — Graph — Info Builder`

    if (graphData.truncated) {
      document.getElementById('graph-truncated').hidden = false
    }

    if (graphData.entities.length === 0) {
      panel.innerHTML = `<div style="padding:var(--space-4)">
        <nav class="entity-breadcrumb graph-breadcrumb"><a href="/app/">App</a><span class="breadcrumb-sep">›</span><a href="/app/?store=${esc(storeId)}">${esc(store.name)}</a></nav>
        <p class="entity-empty">No entities in this store yet.</p>
        <a class="btn btn--ghost btn--sm" href="/app/">← Back</a>
      </div>`
      return
    }

    await loadIcons(graphData.entityTypes)
    initGraph()
    renderControls()
  } catch (err) {
    panel.innerHTML = `<div style="padding:var(--space-4)">Failed to load: ${esc(err.message)}<br><a href="/app/">Go to App</a></div>`
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init)
} else {
  init()
}
