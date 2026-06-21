// useProgress.js — persistance locale des recettes complétées (T4.7).
// Stockage localStorage : { completed: { recipeId: true }, childName: "Léa" }.

import { useCallback, useEffect, useState } from 'react'

const KEY = 'arbre-savoirs-progress-v1'

function load() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { completed: {}, childName: 'Léa' }
    const data = JSON.parse(raw)
    return {
      completed: data.completed || {},
      childName: data.childName || 'Léa',
    }
  } catch {
    return { completed: {}, childName: 'Léa' }
  }
}

export function useProgress() {
  const [state, setState] = useState(load)

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(state))
  }, [state])

  const markCompleted = useCallback((recipeId) => {
    setState((s) => ({ ...s, completed: { ...s.completed, [recipeId]: true } }))
  }, [])

  const setChildName = useCallback((name) => {
    setState((s) => ({ ...s, childName: name || 'Léa' }))
  }, [])

  const reset = useCallback(() => {
    setState({ completed: {}, childName: 'Léa' })
  }, [])

  const completedIds = Object.keys(state.completed).filter((k) => state.completed[k])
  return {
    completedIds,
    completedCount: completedIds.length,
    isCompleted: (id) => !!state.completed[id],
    markCompleted,
    childName: state.childName,
    setChildName,
    reset,
  }
}
