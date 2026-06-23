// RecipeList.jsx — Page d'accueil : cartes de recettes (T4.2, T4.3, T4.6, T4.7).

import { useEffect, useState } from 'react'
import { fetchRecipes } from '../api'
import GameAsset from '../components/GameAsset'

const RECIPE_ICON_BY_ID = {
  mineur_tresors_terre: 'mineur_icon_recette',
  fondeur_naissance_acier: 'v2_icon_fondeur',
  forgeron_epee: 'v2_icon_forgeron',
  recette_bucheronnage: 'icon_bucheron',
  recette_charronnage: 'icon_charron',
}

export default function RecipeList({ progress, onOpen }) {
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [unlockBanner, setUnlockBanner] = useState(false)

  useEffect(() => {
    fetchRecipes()
      .then(setRecipes)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  // Gating data-driven via le champ prerequis (chaîne causale v2.0).
  // Une recette est débloquée si son prerequis est complété (ou absent).
  // Une recette déjà complétée reste accessible.
  const isUnlocked = (r) => {
    if (progress.isCompleted(r.id)) return true
    if (!r.prerequis) return true
    return progress.isCompleted(r.prerequis)
  }

  // Bannière de félicitations quand une recette à prerequis se débloque.
  const newlyUnlocked = recipes.filter(
    (r) => r.prerequis && !progress.isCompleted(r.id) && isUnlocked(r)
  )
  useEffect(() => {
    if (newlyUnlocked.length === 0) return
    setUnlockBanner(true)
    const timer = setTimeout(() => setUnlockBanner(false), 4000)
    return () => clearTimeout(timer)
  }, [newlyUnlocked.length])

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
            onChange={(e) => progress.setChildName(e.target.value)}
            onBlur={() => progress.setChildName(progress.childName.trimStart())}
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

      {/* Bannière de félicitations quand une nouvelle recette se débloque */}
      {unlockBanner && newlyUnlocked.length > 0 && (
        <div
          role="status"
          className="mb-6 animate-bounce rounded-2xl border-2 border-green-400 bg-green-100 px-6 py-4 text-center shadow-lg"
        >
          <p className="text-xl font-extrabold text-green-800">
            🎉 Bravo ! Tu as débloqué : {newlyUnlocked.map((r) => r.titre).join(', ')} ! 🎉
          </p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {recipes.map((r) => {
          const done = progress.isCompleted(r.id)
          const iconAsset = RECIPE_ICON_BY_ID[r.id]
          const unlocked = isUnlocked(r)
          return (
            <button
              key={r.id}
              onClick={() => onOpen(r)}
              disabled={!unlocked}
              aria-disabled={!unlocked}
              className={`card relative text-left transition ${
                unlocked ? 'hover:-translate-y-1 cursor-pointer' : 'opacity-50 grayscale pointer-events-none cursor-not-allowed'
              } ${done ? 'ring-4 ring-green-300' : ''}`}
            >
              {/* Overlay cadenas pour les recettes verrouillées */}
              {!unlocked && (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded-2xl">
                  <span className="text-5xl drop-shadow" aria-hidden="true">🔒</span>
                  <span className="rounded-full bg-stone-800/85 px-3 py-1 text-sm font-semibold text-white">
                    {r.prerequis ? `Complète d'abord : ${
                      recipes.find((x) => x.id === r.prerequis)?.titre || r.prerequis
                    }` : 'Complète les autres métiers pour débloquer !'}
                  </span>
                </div>
              )}
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
