// App.jsx — Composant racine : navigation par état (Règle 3, minimalisme).
// Pages : RecipeList (accueil), ScenePage (jeu interactif), MetaStory, Contribute.

import { useState } from 'react'
import RecipeList from './pages/RecipeList'
import ScenePage from './pages/ScenePage'
import MetaStory from './pages/MetaStory'
import Contribute from './pages/Contribute'
import AvatarSelector from './components/AvatarSelector'
import { useProgress } from './useProgress'

const AVATAR_STORAGE_KEY = 'arbre_savoirs_avatar'

function loadSavedAvatar() {
  try {
    const raw = localStorage.getItem(AVATAR_STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export default function App() {
  const [route, setRoute] = useState('home') // home | scene | meta | contribute
  const [activeRecipe, setActiveRecipe] = useState(null)
  const [avatarConfig, setAvatarConfig] = useState(loadSavedAvatar)
  const progress = useProgress()

  function openRecipe(r) {
    setActiveRecipe(r)
    setRoute('scene')
  }

  function confirmAvatar(config) {
    setAvatarConfig(config)
    setRoute('home')
  }

  if (!avatarConfig) {
    return <AvatarSelector onConfirm={confirmAvatar} />
  }

  return (
    <div className="min-h-full max-w-5xl mx-auto px-4 py-6">
      {/* Barre de navigation persistante */}
      <nav className="flex flex-wrap gap-2 justify-center mb-6">
        <NavBtn active={route === 'home'} onClick={() => setRoute('home')}>🏠 Recettes</NavBtn>
        <NavBtn active={route === 'meta'} onClick={() => setRoute('meta')}>
          🏆 Ma grande aventure
          {progress.completedCount > 0 && (
            <span className="ml-1 rounded-full bg-green-600 text-white text-xs px-2 py-0.5">
              {progress.completedCount}
            </span>
          )}
        </NavBtn>
        <NavBtn active={route === 'contribute'} onClick={() => setRoute('contribute')}>✍️ Contribuer</NavBtn>
        <NavBtn active={route === 'avatar'} onClick={() => setRoute('avatar')}>🧒 Modifier mon personnage</NavBtn>
      </nav>

      {route === 'home' && (
        <RecipeList progress={progress} onOpen={openRecipe} />
      )}
      {route === 'scene' && activeRecipe && (
        <ScenePage
          recipe={activeRecipe}
          childName={progress.childName}
          avatarConfig={avatarConfig}
          onCompleted={progress.markCompleted}
          onBack={() => setRoute('home')}
        />
      )}
      {route === 'meta' && (
        <MetaStory
          completedIds={progress.completedIds}
          childName={progress.childName}
          onBack={() => setRoute('home')}
        />
      )}
      {route === 'avatar' && (
        <AvatarSelector initialConfig={avatarConfig} onConfirm={confirmAvatar} />
      )}
      {route === 'contribute' && <Contribute onBack={() => setRoute('home')} />}

      <footer className="text-center text-stone-400 text-sm mt-10">
        L'Arbre des Savoirs — MVP interactif
      </footer>
    </div>
  )
}

function NavBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 font-bold transition ${
        active ? 'bg-green-600 text-white shadow' : 'bg-white/70 text-green-700 hover:bg-white'
      }`}
    >
      {children}
    </button>
  )
}
