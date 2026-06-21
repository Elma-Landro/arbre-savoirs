// AvatarSelector.jsx — Écran de personnalisation de l'avatar enfant.
//
// L'enfant choisit ses cheveux, son chapeau, sa tenue et ses accessoires, puis
// valide. La config est conservée dans localStorage sous la clé
// 'arbre_savoirs_avatar' pour être rechargée aux prochaines visites.
//
// Props :
//   onConfirm    : callback appelé avec la config finale au clic sur « C'est moi ! »
//   initialConfig: config de pré-remplissage (priorité la plus haute)
//
// Config produite :
//   {
//     base: 'avatar_base_apprenti',         // toujours présent
//     visage: 'avatar_visage_souriant',     // toujours présent
//     cheveux: 'avatar_cheveux_01' | 'avatar_cheveux_02' | null,
//     chapeau: 'avatar_chapeau_bucheron' | null,
//     tenue: 'avatar_tablier_forgeron' | null,
//     accessoires: string[]                 // sous-ensemble des accessoires
//   }

import { useEffect, useState } from 'react'
import AvatarPreview from './AvatarPreview'

const STORAGE_KEY = 'arbre_savoirs_avatar'

// Base + visage sont fixes : l'avatar est toujours un apprenti souriant.
const FIXED_BASE = 'avatar_base_apprenti'
const FIXED_VISAGE = 'avatar_visage_souriant'

// Options de choix (ID d'asset + emoji de secours pour la pastille « sans »).
const CHEVEUX_OPTIONS = [
  { id: 'avatar_cheveux_01', emoji: '🟤' },
  { id: 'avatar_cheveux_02', emoji: '⚫' },
]
const CHAPEAU_OPTIONS = [
  { id: 'avatar_chapeau_bucheron', emoji: '🧢' },
]
const TENUE_OPTIONS = [
  { id: 'avatar_tablier_forgeron', emoji: '🥋' },
]
const ACCESSOIRES_OPTIONS = [
  { id: 'avatar_gants', emoji: '🧤' },
  { id: 'avatar_bottes', emoji: '🥾' },
  { id: 'avatar_accessoire_marteau', emoji: '🔨' },
  { id: 'avatar_accessoire_loupe', emoji: '🔍' },
]

// Construit la config par défaut (aucun choix cosmétique).
function defaultConfig() {
  return {
    base: FIXED_BASE,
    visage: FIXED_VISAGE,
    cheveux: null,
    chapeau: null,
    tenue: null,
    accessoires: [],
  }
}

// Fusionne proprement une config stockée/entrée en garantissant la forme.
function normalizeConfig(partial) {
  if (!partial || typeof partial !== 'object') return defaultConfig()
  return {
    ...defaultConfig(),
    ...partial,
    base: FIXED_BASE,
    visage: FIXED_VISAGE,
    accessoires: Array.isArray(partial.accessoires) ? partial.accessoires.filter(Boolean) : [],
  }
}

// Pastille de choix cliquable. Affiche le SVG de l'asset, ou un emoji pour
// l'option « sans ». La sélection se voit par un anneau doré (ring-amber-400).
function ChoicePill({ assetId, emoji, selected, onClick, label }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      data-testid={`pill-${assetId || 'none'}`}
      title={label}
      className={[
        'flex h-16 w-16 items-center justify-center rounded-full bg-white/80 shadow-md transition',
        'hover:scale-105 focus:outline-none focus-visible:ring-4 focus-visible:ring-green-400',
        selected ? 'ring-4 ring-amber-400' : '',
      ].join(' ')}
    >
      {assetId ? (
        <img
          src={`/assets/avatar/${assetId}.svg`}
          alt={label}
          draggable="false"
          className="h-12 w-12 object-contain pointer-events-none"
        />
      ) : (
        <span className="text-3xl leading-none" role="img" aria-label={label}>
          {emoji}
        </span>
      )}
    </button>
  )
}

// Bloc de choix : titre + grille de pastilles.
function ChoiceSection({ title, children }) {
  return (
    <section className="card flex flex-col items-center gap-3 py-4">
      <h3 className="text-base font-bold text-green-800">{title}</h3>
      <div className="flex flex-wrap items-center justify-center gap-3">{children}</div>
    </section>
  )
}

export default function AvatarSelector({ onConfirm, initialConfig }) {
  const [config, setConfig] = useState(defaultConfig)

  // Pré-remplissage : initialConfig prioritaire, sinon localStorage.
  useEffect(() => {
    let loaded = null
    if (initialConfig) {
      loaded = initialConfig
    } else {
      try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (raw) loaded = JSON.parse(raw)
      } catch {
        // localStorage indisponible ou JSON corrompu : on reste sur défaut.
      }
    }
    if (loaded) setConfig(normalizeConfig(loaded))
  }, [initialConfig])

  function setCheveux(id) {
    setConfig((c) => ({ ...c, cheveux: c.cheveux === id ? null : id }))
  }
  function setChapeau(id) {
    setConfig((c) => ({ ...c, chapeau: c.chapeau === id ? null : id }))
  }
  function setTenue(id) {
    setConfig((c) => ({ ...c, tenue: c.tenue === id ? null : id }))
  }
  function toggleAccessoire(id) {
    setConfig((c) => {
      const has = c.accessoires.includes(id)
      return {
        ...c,
        accessoires: has
          ? c.accessoires.filter((a) => a !== id)
          : [...c.accessoires, id],
      }
    })
  }

  function handleConfirm() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
    } catch {
      // Écriture impossible (mode privé, quota…) : on continue quand même.
    }
    onConfirm?.(config)
  }

  return (
    <div
      data-testid="avatar-selector"
      className="min-h-screen w-full p-6"
      style={{ backgroundColor: '#F4EFE6' }}
    >
      <div className="mx-auto flex max-w-3xl flex-col items-center gap-6">
        {/* Titre */}
        <header className="text-center">
          <h1 className="text-2xl font-bold text-green-800">Qui es-tu ?</h1>
          <p className="text-lg text-stone-600">Choisis ton aventurier !</p>
        </header>

        {/* Aperçu central */}
        <div className="flex items-center justify-center rounded-3xl bg-white/50 p-4 shadow-lg">
          <AvatarPreview config={config} size={180} />
        </div>

        {/* Cheveux */}
        <ChoiceSection title="Cheveux">
          <ChoicePill
            label="Sans cheveux"
            emoji="🚫"
            selected={config.cheveux === null}
            onClick={() => setConfig((c) => ({ ...c, cheveux: null }))}
          />
          {CHEVEUX_OPTIONS.map((opt) => (
            <ChoicePill
              key={opt.id}
              assetId={opt.id}
              emoji={opt.emoji}
              label={opt.id}
              selected={config.cheveux === opt.id}
              onClick={() => setCheveux(opt.id)}
            />
          ))}
        </ChoiceSection>

        {/* Chapeau */}
        <ChoiceSection title="Chapeau">
          <ChoicePill
            label="Sans chapeau"
            emoji="🚫"
            selected={config.chapeau === null}
            onClick={() => setConfig((c) => ({ ...c, chapeau: null }))}
          />
          {CHAPEAU_OPTIONS.map((opt) => (
            <ChoicePill
              key={opt.id}
              assetId={opt.id}
              emoji={opt.emoji}
              label={opt.id}
              selected={config.chapeau === opt.id}
              onClick={() => setChapeau(opt.id)}
            />
          ))}
        </ChoiceSection>

        {/* Tenue */}
        <ChoiceSection title="Tenue">
          <ChoicePill
            label="Sans tenue"
            emoji="🚫"
            selected={config.tenue === null}
            onClick={() => setConfig((c) => ({ ...c, tenue: null }))}
          />
          {TENUE_OPTIONS.map((opt) => (
            <ChoicePill
              key={opt.id}
              assetId={opt.id}
              emoji={opt.emoji}
              label={opt.id}
              selected={config.tenue === opt.id}
              onClick={() => setTenue(opt.id)}
            />
          ))}
        </ChoiceSection>

        {/* Accessoires (multi-choix) */}
        <ChoiceSection title="Accessoires">
          {ACCESSOIRES_OPTIONS.map((opt) => (
            <ChoicePill
              key={opt.id}
              assetId={opt.id}
              emoji={opt.emoji}
              label={opt.id}
              selected={config.accessoires.includes(opt.id)}
              onClick={() => toggleAccessoire(opt.id)}
            />
          ))}
        </ChoiceSection>

        {/* Bouton de confirmation — style étiquette kraft */}
        <button
          type="button"
          onClick={handleConfirm}
          data-testid="avatar-confirm"
          className="mt-2 min-h-[44px] rounded-xl bg-stone-800 px-6 py-3 text-lg font-bold text-amber-50 shadow-lg transition hover:bg-stone-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-400"
        >
          C'est moi !
        </button>
      </div>
    </div>
  )
}
