// useProgress.js — persistance locale (T4.7).
// Stockage localStorage :
//   { completed: { recipeId: true }, childName: "Léa", inventory: { itemId: count } }
//
// L'inventaire conserve les "trésors" gagnés dans les scènes (ex. la pépite
// d'or du Mineur), disponibles pour de futures recettes (ex. l'Orfèvre).

import { useCallback, useEffect, useState } from 'react'

const KEY = 'arbre-savoirs-progress-v1'

// Métadonnées d'affichage des objets d'inventaire (emoji + libellé), pour ne
// pas dépendre du graphe côté front.
const ITEM_META = {
  pepite_or: { emoji: '✨', label: "Pépite d'or" },
}

// Trésors octroyés à la complétion d'une recette (objets "souvenirs" conservés
// dans l'inventaire, par opposition aux résultats transmis à la recette
// suivante). Extensible : chaque future recette peut déposer ses propres items.
const RECIPE_KEEPSAKES = {
  mineur_tresors_terre: ['pepite_or'],
}

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { completed: {}, childName: 'Léa', inventory: {} }
    const data = JSON.parse(raw)
    return {
      completed: data.completed || {},
      childName: data.childName || 'Léa',
      inventory: data.inventory || {},
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
  // recette ne ré-empile pas les pépites).
  const markCompleted = useCallback((recipeId) => {
    setState((s) => {
      if (s.completed[recipeId]) return s // déjà complétée : pas de re-don
      const inventory = { ...s.inventory }
      for (const itemId of RECIPE_KEEPSAKES[recipeId] || []) {
        inventory[itemId] = (inventory[itemId] || 0) + 1
      }
      return {
        ...s,
        completed: { ...s.completed, [recipeId]: true },
        inventory,
      }
    })
  }, [])

  // Ajout direct d'un objet (utile pour de futurs bonus cachés hors complétion).
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
    markCompleted,
    // Inventaire
    inventory: state.inventory || {},
    inventoryList,
    hasItem: (id) => (state.inventory?.[id] || 0) > 0,
    collectItem,
    childName: state.childName,
    setChildName,
    reset,
  }
}
