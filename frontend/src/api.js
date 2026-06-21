// api.js — petit client fetch vers le backend FastAPI (proxy /api en dev).

const BASE = '/api'

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
  const res = await fetch(`${BASE}/recipes`)
  return jsonOrThrow(res)
}

export async function fetchRecipe(recipeId) {
  // Récupère une recette AVEC son scenario (pour le moteur de scène).
  const res = await fetch(`${BASE}/recipe/${encodeURIComponent(recipeId)}`)
  return jsonOrThrow(res)
}

export async function generateScenario(recipeId, childName) {
  // Objectif 4 : génère un scenario par LLM.
  const res = await fetch(`${BASE}/generate-scenario`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_id: recipeId, child_name: childName }),
  })
  return jsonOrThrow(res)
}

// Narration TTS : /api/narrate (bloc) ou /api/narrate-step (une phrase courte).
export async function narrateStep(text, childName) {
  const res = await fetch(`${BASE}/narrate-step`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, child_name: childName }),
  })
  return jsonOrThrow(res)
}

export async function narrate(text, childName) {
  const res = await fetch(`${BASE}/narrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, child_name: childName }),
  })
  return jsonOrThrow(res)
}

export async function generateMetaStory(recipeIds, childName) {
  const res = await fetch(`${BASE}/meta-story`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipe_ids: recipeIds, child_name: childName }),
  })
  return jsonOrThrow(res)
}

export async function validateContribution(kind, data) {
  const res = await fetch(`${BASE}/validate-contribution`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, data }),
  })
  return jsonOrThrow(res)
}
