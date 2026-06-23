// SceneEffects.jsx — Calques de transformation visuelle dans le décor (O1).
//
// Superpose des effets SVG/CSS par-dessus le fond de scène statique (PNG),
// activés en fonction des étapes déjà validées. Aucune modification du schéma
// YAML : on dérive l'état des `action_attendue` des étapes réussies.
//
// Règles (heuristiques sur les IDs, sans dépendre d'une recette précise) :
//   - cible contenant four|feu|forge  -> flammes animées (orange -> vermillon -> or)
//   - cible = enclume                 -> étincelles
//   - source lingot|minerai|metal dans le feu -> halo de chaleur (lueur rouge)
//
// Les recettes sans feu/enclume (bûcheron, charron) ne produisent aucun
// calque : comportement de fallback silencieux (Règle 3 du brief).

const FIRE_RE = /(four|feu|forge)/i
const ANVIL_RE = /enclume/i
const METAL_RE = /(lingot|minerai|metal)/i
const LANTERN_RE = /lanterne/i
const LANTERN_HOOK_RE = /crochet|lanterne_zone|lanterne_crochet/i

/**
 * Dérive la liste des effets actifs à partir des étapes déjà validées.
 * @param {Array} validatedSteps - les étapes dont l'action a été réussie
 *   (objet `{ action_attendue: { source, target } }`).
 * @returns {Array<{kind, anchorId}>}
 */
export function deriveEffects(validatedSteps = []) {
  const out = []
  const seen = new Set()
  const push = (kind, anchorId) => {
    const key = `${kind}:${anchorId}`
    if (seen.has(key)) return
    seen.add(key)
    out.push({ kind, anchorId })
  }
  for (const s of validatedSteps) {
    const tgt = s?.action_attendue?.target || ''
    const src = s?.action_attendue?.source || ''
    if (FIRE_RE.test(tgt)) push('flames', tgt)
    if (ANVIL_RE.test(tgt)) push('sparks', tgt)
    if (METAL_RE.test(src) && FIRE_RE.test(tgt)) push('glow', src)
    // Lanterne accrochée -> lumière bougie sur le crochet + galerie éclairée.
    if (LANTERN_RE.test(src)) push('lantern', tgt)
  }
  return out
}

function Flames({ x, y, w }) {
  // Trois flammes SVG superposées, teintes palette enluminure, flicker CSS.
  return (
    <div
      data-testid="effect-flames"
      className="pointer-events-none absolute animate-effect-fade-in"
      style={{ left: x, top: y, width: w }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 100 100" className="w-full animate-flame-flicker">
        <defs>
          <radialGradient id="enl-flame" cx="50%" cy="80%" r="70%">
            <stop offset="0%" stopColor="#D4A017" />
            <stop offset="50%" stopColor="#C0392B" />
            <stop offset="100%" stopColor="#C0392B" stopOpacity="0" />
          </radialGradient>
        </defs>
        <path d="M50 10 C70 35 80 55 50 90 C20 55 30 35 50 10 Z" fill="url(#enl-flame)" opacity="0.9" />
        <path d="M50 30 C60 50 65 65 50 85 C35 65 40 50 50 30 Z" fill="#D4A017" opacity="0.7" />
      </svg>
    </div>
  )
}

function Sparks({ x, y, w }) {
  // Étincelles : 6 petits losanges or/vermillon animés (CSS .enl-spark).
  const sparks = [
    { sx: '-30px', sy: '-40px', d: '0s', c: '#D4A017' },
    { sx: '25px', sy: '-45px', d: '0.1s', c: '#C0392B' },
    { sx: '-15px', sy: '-55px', d: '0.2s', c: '#D4A017' },
    { sx: '35px', sy: '-35px', d: '0.05s', c: '#C0392B' },
    { sx: '-40px', sy: '-30px', d: '0.15s', c: '#D4A017' },
    { sx: '15px', sy: '-60px', d: '0.25s', c: '#C0392B' },
  ]
  return (
    <div
      data-testid="effect-sparks"
      className="pointer-events-none absolute animate-effect-fade-in"
      style={{ left: x, top: y, width: w, height: w }}
      aria-hidden="true"
    >
      {sparks.map((s, i) => (
        <span
          key={i}
          className="enl-spark absolute block"
          style={{
            left: '50%', top: '50%',
            width: '8px', height: '8px',
            background: s.c, transform: 'rotate(45deg)',
            // vars lues par @keyframes spark-burst dans index.css
            '--sx': s.sx, '--sy': s.sy,
            animationDelay: s.d,
          }}
        />
      ))}
    </div>
  )
}

function Glow({ x, y, w }) {
  // Halo de chaleur rouge/or autour de la source (lingot/minerai chauffé).
  return (
    <div
      data-testid="effect-glow"
      className="pointer-events-none absolute animate-effect-fade-in"
      style={{ left: x, top: y, width: w, height: w }}
      aria-hidden="true"
    >
      <div
        className="w-full h-full rounded-full animate-pulse"
        style={{
          background: 'radial-gradient(circle, rgba(212,160,23,0.55) 0%, rgba(192,57,43,0.4) 45%, transparent 70%)',
        }}
      />
    </div>
  )
}

function Lantern({ x, y, w }) {
  // Lumière bougie : halo doré ondulant (teinte chaude) sur le crochet +
  // lueur large qui illumine la galerie. keyframe 'lantern-flicker' dans index.css.
  return (
    <>
      {/* Lueur large (illumine la galerie entière) */}
      <div
        data-testid="effect-lantern"
        className="pointer-events-none absolute enl-lantern-glow"
        style={{
          left: x, top: y, width: w, height: w,
        }}
        aria-hidden="true"
      />
    </>
  )
}

/**
 * @param {Object} props
 * @param {Array}  props.validatedSteps - étapes réussies (pour dérivation)
 * @param {Object} props.layouts        - map { elementId: { left, top, w } } du décor courant
 */
export default function SceneEffects({ validatedSteps, layouts = {} }) {
  const effects = deriveEffects(validatedSteps)
  return effects.map(({ kind, anchorId }) => {
    const pos = layouts[anchorId]
    if (!pos) return null // fallback : pas de position connue -> pas de calque
    if (kind === 'flames') return <Flames key={`${kind}-${anchorId}`} x={pos.left} y={pos.top} w={pos.w} />
    if (kind === 'sparks') return <Sparks key={`${kind}-${anchorId}`} x={pos.left} y={pos.top} w={pos.w} />
    if (kind === 'glow') return <Glow key={`${kind}-${anchorId}`} x={pos.left} y={pos.top} w={pos.w} />
    if (kind === 'lantern') return <Lantern key={`${kind}-${anchorId}`} x={pos.left} y={pos.top} w={pos.w} />
    return null
  })
}
