// RecipeList.jsx — Page d'accueil : cartes de recettes (T4.2, T4.3, T4.6, T4.7).

import { useEffect, useState } from 'react'
import { fetchRecipes } from '../api'
import GameAsset from '../components/GameAsset'

const RECIPE_ICON_BY_ID = {
  recette_fonte: 'icon_fondeur',
  recette_forge: 'icon_forgeron',
  recette_bucheronnage: 'icon_bucheron',
  recette_charronnage: 'icon_charron',
}

export default function RecipeList({ progress, onOpen }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-center text-xl py-10">Chargement des recettes… 🌳</p>
  if (error) return <p className="text-center text-red-600 py-10">Erreur : {error}</p>

  return (
    <div>
      <header className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-extrabold text-green-700 drop-shadow-sm">
          🌳 L'Arbre des Savoirs
        </h1>
        <p className="text-lg text-amber-700 mt-2">
          Choisis une aventure pour découvrir comment on fabrique les choses !
        </p>
        <div className="mt-3 flex items-center justify-center gap-2 text-md">
          <label htmlFor="name" className="font-semibold">Je m'appelle&nbsp;:</label>
          <input
            id="name"
            value={progress.childName}
            onChange={(e) => {
              const val = e.target.value.trimStart().slice(0, 30)
              progress.setChildName(val)
            }}
            className={`rounded-xl border-2 px-3 py-1 text-center font-bold ${
              progress.childName.trim() === '' ? 'border-amber-400' : 'border-amber-200'
            }`}
            placeholder="Léa"
            maxLength={30}
          />
          {progress.childName.trim() === '' && (
            <span className="text-amber-600 text-sm">Quel est ton prénom ?</span>
          )}
          {progress.completedCount > 0 && (
            <span className="ml-3 rounded-full bg-green-100 text-green-800 px-3 py-1 font-bold">
              ⭐ {progress.completedCount} recette{progress.completedCount > 1 ? 's' : ''} complétée{progress.completedCount > 1 ? 's' : ''}
            </span>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {recipes.map((r) => {
          const done = progress.isCompleted(r.id)
          const iconAsset = RECIPE_ICON_BY_ID[r.id]
          return (
            <button
              key={r.id}
              onClick={() => onOpen(r)}
              className={`card text-left transition hover:-translate-y-1 ${
                done ? 'ring-4 ring-green-300' : ''
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3">
                  {iconAsset && (
                    <div className="shrink-0 rounded-2xl bg-amber-50 p-2 shadow" aria-hidden="true">
                      <GameAsset assetId={iconAsset} emoji="✨" label={r.metier} size="md" />
                    </div>
                  )}
                  <h2 className="text-2xl font-bold text-amber-800">{r.titre}</h2>
                </div>
                {done && <span className="text-3xl" title="Complétée">✅</span>}
              </div>
              <p className="text-sm uppercase tracking-wide text-green-600 font-semibold mt-1">
                {r.metier}
              </p>
              <p className="mt-2 text-stone-700">{r.description_pedagogique}</p>
              <div className="mt-3 text-sm text-stone-500">
                <span className="font-semibold">🧺</span> {r.ingredients.join(', ')}
                <br />
                <span className="font-semibold">✨</span> {r.resultat.join(', ')}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
