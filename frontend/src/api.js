// api.js — petit client fetch vers le backend FastAPI (proxy /api en dev).

const BASE = '/api'
const TIMEOUT_MS = 10_000

function fetchWithTimeout(url, options = {}) {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS)
  return fetch(url, { ...options, signal: ctrl.signal })
    .finally(() => clearTimeout(timer))
    .catch((err) => {
      if (err.name === 'AbortError') throw new Error('Le serveur ne répond pas. Réessaie dans un moment.')
      throw err
    })
}

async function jsonOrThrow(res) {
  const text = await res.text()
  let data
  try {
    data = text ? JSON.parse(text) : {}
  } catch {
    throw new Error(`Réponse non-JSON (HTTP ${res.status})`)
  }
  if (!res.ok) {
    const msg = data.detail?.msg || data.detail || `HTTP ${res.status}`
    throw new Error(typeof msg === 'string' ? msg : JSON.stringify(msg))
  }
  return data
}

export async function fetchRecipes() {
  const res = await fetchWithTimeout(`${BASE}/recipes`)
  return jsonOrThrow(res)
}

export async function fetchRecipe(recipeId) {
  const res = await fetchWithTimeout(`${BASE}/recipe/${encodeURIComponent(recipeId)}`)
  return jsonOrThrow(res)
}

export async function generateScenario(recipeId, childName) {
  const res = await fetchWithTimeout(`${BASE}/generate-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_id: recipeId, child_name: childName }),
  })
  return jsonOrThrow(res)
}

export async function narrateStep(text, childName) {
  const res = await fetchWithTimeout(`${BASE}/narrate-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, child_name: childName }),
  })
  return jsonOrThrow(res)
}

export async function narrate(text, childName) {
  const res = await fetchWithTimeout(`${BASE}/narrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, child_name: childName }),
  })
  return jsonOrThrow(res)
}

export async function generateMetaStory(recipeIds, childName) {
  const res = await fetchWithTimeout(`${BASE}/meta-story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_ids: recipeIds, child_name: childName }),
  })
  return jsonOrThrow(res)
}

export async function validateContribution(kind, data) {
  const res = await fetchWithTimeout(`${BASE}/validate-contribution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, data }),
  })
  return jsonOrThrow(res)
}
