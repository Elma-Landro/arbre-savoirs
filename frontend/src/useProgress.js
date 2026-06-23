// useProgress.js — persistance locale des recettes complétées (T4.7).
// Stockage localStorage : { completed: { recipeId: true }, inventory: { nodeId: true }, childName: "Léa" }.
//
// L'inventaire (Patch 6b) matérialise la chaîne causale : quand une recette est
// complétée, son résultat (ex : lingot_acier) est ajouté à l'inventaire. Les
// recettes suivantes peuvent alors afficher ces objets comme "déjà obtenus".

import { useCallback, useEffect, useState } from 'react'

const KEY = 'arbre-savoirs-progress-v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { completed: {}, inventory: {}, childName: 'Léa' }
    const data = JSON.parse(raw)
    return {
      completed: data.completed || {},
      inventory: data.inventory || {},
      childName: data.childName || 'Léa',
    }
  } catch {
    return { completed: {}, inventory: {}, childName: 'Léa' }
  }
}

export function useProgress() {
  const [state, setState] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  // Marque une recette comme complétée. Si `resultIds` est fourni (liste de node
  // ids de résultat), ces objets sont ajoutés à l'inventaire (chaîne causale).
  const markCompleted = useCallback((recipeId, resultIds = []) => {
    setState((s) => {
      const inventory = { ...s.inventory }
      for (const rid of resultIds) inventory[rid] = true
      return {
        ...s,
        completed: { ...s.completed, [recipeId]: true },
        inventory,
      }
    })
  }, [])

  const setChildName = useCallback((name) => {
    setState((s) => ({ ...s, childName: name || 'Léa' }))
  }, [])

  const reset = useCallback(() => {
    setState({ completed: {}, inventory: {}, childName: 'Léa' })
  }, [])

  const completedIds = Object.keys(state.completed).filter((k) => state.completed[k])
  return {
    completedIds,
    completedCount: completedIds.length,
    isCompleted: (id) => !!state.completed[id],
    // Liste des node ids d'objets possédés (ex : ['lingot_acier']).
    inventoryIds: Object.keys(state.inventory).filter((k) => state.inventory[k]),
    hasItem: (nodeId) => !!state.inventory[nodeId],
    markCompleted,
    childName: state.childName,
    setChildName,
    reset,
  }
}
