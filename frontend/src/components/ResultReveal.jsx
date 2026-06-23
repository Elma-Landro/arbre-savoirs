// ResultReveal.jsx — Révélation animée de l'objet final (Patch 7 refonte UX).
//
// Remplace le "🎉 Bravo {childName} !" texte seul par une révélation centrée
// de l'objet créé, avec animation scale 0→1.2→1 + halo or pulsant. Le resultat
// de la recette (node id) est mappé vers un asset manifest quand disponible,
// sinon fallback emoji.
//
// data-testid="scene-done" préservé sur la racine (tests E2E e2e_objective2/5).

import GameAsset from './GameAsset'

// Mapping node résultat -> asset manifest (v2 chaîne acier + anciennes recettes).
const RESULT_ASSET = {
  lingot_acier: 'v2_result_lingot_acier',
  epee_forgee: 'v2_result_epee',
  // Anciennes recettes conservées (bûcheron/charron) -> fallback emoji.
}
const RESULT_EMOJI = {
  lingot_acier: '🧱',
  epee_forgee: '⚔️',
  planche_bois: '🪵',
  charrette: '🛒',
  outil_acier: '⚒️',
}
const RESULT_LABEL = {
  lingot_acier: 'Lingot d\'acier',
  epee_forgee: 'Épée du chevalier',
  planche_bois: 'Planche de bois',
  charrette: 'Charrette',
  outil_acier: 'Outil en acier',
}

export default function ResultReveal({ childName, resultId }) {
  const asset = RESULT_ASSET[resultId]
  const emoji = RESULT_EMOJI[resultId] || '🎁'
  const label = RESULT_LABEL[resultId] || resultId || 'création'

  return (
    <div
      data-testid="scene-done"
      className="relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-3xl border-4 border-enl-or/60 bg-gradient-to-b from-enl-outremer to-enl-encre p-8 text-center shadow-xl"
    >
      {/* Étoiles d'or en fond (style enluminure) */}
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        {[...Array(12)].map((_, i) => (
          <span
            key={i}
            className="absolute text-enl-or"
            style={{
              left: `${(i * 37) % 100}%`,
              top: `${(i * 53) % 100}%`,
              fontSize: `${12 + (i % 4) * 6}px`,
            }}
          >
            ✦
          </span>
        ))}
      </div>

      {/* Halo or pulsant derrière l'objet révélé */}
      <div
        className="pointer-events-none absolute left-1/2 top-[42%] h-48 w-48 -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse-gold"
        aria-hidden="true"
      />

      {/* Objet révélé — animation scale 0→1.2→1 via keyframe Tailwind bounce-in */}
      <div
        className="relative z-10 mb-4 flex h-40 w-40 items-center justify-center"
        style={{ animation: 'resultPop 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)' }}
      >
        {asset ? (
          <GameAsset assetId={asset} emoji={emoji} label={label} size="xl" />
        ) : (
          <span className="text-8xl drop-shadow-[0_4px_8px_rgba(0,0,0,0.4)]">{emoji}</span>
        )}
      </div>

      {/* Message de félicitations */}
      <p className="relative z-10 mb-1 font-story text-3xl font-bold text-enl-or drop-shadow">
        Bravo {childName} !
      </p>
      <p className="relative z-10 mb-1 text-xl font-semibold text-enl-ivoire">
        Tu as créé : {label}
      </p>
      <p className="relative z-10 text-enl-ivoire/70">Tu as terminé cette aventure !</p>
    </div>
  )
}
