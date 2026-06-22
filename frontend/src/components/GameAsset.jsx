// GameAsset.jsx — rend un SVG de jeu si disponible, sinon conserve l'emoji.
// Le fallback emoji est volontairement local au composant : un asset cassé ne
// doit jamais bloquer l'expérience de jeu.

import { useState } from 'react'
import assetManifest from '../assets/assets_manifest.json'

const SIZE_CLASS = {
  sm: 'w-10 h-10',
  md: 'w-14 h-14',
  lg: 'w-16 h-16',
  xl: 'w-20 h-20',
}

// Tailles de texte alignées sur SIZE_CLASS pour que le fallback emoji garde
// un rendu visuellement cohérent avec le SVG (pas de saut de taille).
const TEXT_SIZE_CLASS = {
  sm: 'text-3xl',
  md: 'text-4xl',
  lg: 'text-5xl',
  xl: 'text-6xl',
}

export default function GameAsset({ assetId, emoji, label, size = 'lg' }) {
  const [failed, setFailed] = useState(false)
  const asset = assetId ? assetManifest[assetId] : null
  const text = label || asset?.label || assetId || 'élément'
  const dimensions = SIZE_CLASS[size] || SIZE_CLASS.lg
  const textSize = TEXT_SIZE_CLASS[size] || TEXT_SIZE_CLASS.lg

  if (!asset?.svg || failed) {
    return (
      <span
        data-testid={`asset-emoji-${assetId || 'fallback'}`}
        className={`${textSize} leading-none`}
        role="img"
        aria-label={text}
        title={text}
      >
        {emoji}
      </span>
    )
  }

  return (
    <img
      data-testid={`asset-img-${assetId}`}
      src={asset.svg}
      alt={text}
      title={text}
      onError={() => setFailed(true)}
      className={`${dimensions} object-contain select-none drop-shadow-[2px_3px_4px_rgba(92,58,33,0.30)]`}
      draggable="false"
    />
  )
}
