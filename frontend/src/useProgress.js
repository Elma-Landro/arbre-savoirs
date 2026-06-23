// useProgress.js — persistance locale (T4.7).
// Stockage localStorage :
//   { completed: { recipeId: true }, childName: "Léa", inventory: { itemId: count } }
//
// L'inventaire conserve les "trésors" gagnés dans les scènes (ex. la pépite
// d'or du Mineur), disponibles pour de futures recettes (ex. l'Orfèvre).
// Il sert aussi de chaîne causale : le lingot du fondeur alimente le forgeron.

import { useCallback, useEffect, useState } from 'react'

const KEY = 'arbre-savoirs-progress-v1'

// Métadonnées d'affichage des objets d'inventaire (emoji + libellé).
const ITEM_META = {
  pepite_or: { emoji: '✨', label: "Pépite d'or" },
  lingot_acier: { emoji: '🧱', label: 'Lingot d\'acier' },
  epee_forgee: { emoji: '⚔️', label: 'Épée du chevalier' },
}

// Trésors octroyés à la complétion d'une recette (objets "souvenirs" conservés
// dans l'inventaire). Extensible : chaque future recette peut déposer ses items.
const RECIPE_KEEPSAKES = {
  mineur_tresors_terre: ['pepite_or'],
  fondeur_naissance_acier: ['lingot_acier'],
  forgeron_epee: ['epee_forgee'],
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { completed: {}, childName: 'Léa', inventory: {} }
    const data = JSON.parse(raw)
    return {
      completed: data.completed || {},
      inventory: data.inventory || {},
      childName: data.childName || 'Léa',
    }
  } catch {
    return { completed: {}, childName: 'Léa', inventory: {} }
  }
}

export function useProgress() {
  const [state, setState] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  // Complète une recette ET octroie ses trésors — une seule fois (rejouer une
  // recette ne ré-empile pas). `resultIds` (optionnel) ajoute aussi des objets
  // à l'inventaire pour la chaîne causale (ex : lingot pour le forgeron).
  const markCompleted = useCallback((recipeId, resultIds = []) => {
    setState((s) => {
      const inventory = { ...s.inventory }
      // Trésors keepsakes (une seule fois).
      if (!s.completed[recipeId]) {
        for (const itemId of RECIPE_KEEPSAKES[recipeId] || []) {
          inventory[itemId] = (inventory[itemId] || 0) + 1
        }
      }
      // Chaîne causale : les résultats explicites sont marqués possédés.
      for (const rid of resultIds) inventory[rid] = Math.max(inventory[rid] || 0, 1)
      return {
        ...s,
        completed: { ...s.completed, [recipeId]: true },
        inventory,
      }
    })
  }, [])

  // Ajout direct d'un objet (futurs bonus cachés hors complétion).
  const collectItem = useCallback((itemId, qty = 1) => {
    setState((s) => ({
      ...s,
      inventory: { ...s.inventory, [itemId]: (s.inventory[itemId] || 0) + qty },
    }))
  }, [])

  const setChildName = useCallback((name) => {
    setState((s) => ({ ...s, childName: name || 'Léa' }))
  }, [])

  const reset = useCallback(() => {
    setState({ completed: {}, childName: 'Léa', inventory: {} })
  }, [])

  const completedIds = Object.keys(state.completed).filter((k) => state.completed[k])
  const inventoryList = Object.entries(state.inventory || {})
    .filter(([, count]) => count > 0)
    .map(([id, count]) => ({
      id,
      count,
      emoji: ITEM_META[id]?.emoji || '🎁',
      label: ITEM_META[id]?.label || id,
    }))

  return {
    completedIds,
    completedCount: completedIds.length,
    isCompleted: (id) => !!state.completed[id],
    // Inventaire (countes par item).
    inventory: state.inventory || {},
    inventoryList,
    inventoryIds: Object.keys(state.inventory || {}).filter((k) => (state.inventory?.[k] || 0) > 0),
    hasItem: (id) => (state.inventory?.[id] || 0) > 0,
    markCompleted,
    collectItem,
    childName: state.childName,
    setChildName,
    reset,
  }
}
