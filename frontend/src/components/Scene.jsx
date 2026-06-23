// Scene.jsx — Scène interactive "in-situ" (Refonte UX Objectif 1).
//
// Architecture Sacha/Bayam (v2) :
//   • Zone de jeu 16:9 avec fond peint en <img> (ratio strict).
//   • Recettes v2 (recipeId dans sceneLayouts) : dropzones invisibles alignées
//     sur le décor peint (HotspotDropzone), props dans le rail inventaire bas.
//   • Recettes legacy : sprite-based layout conservé (aucune régression).
//
// Invariants moteur préservés (zéro régression — cf. e2e_objective2/5/assets) :
//   - testids DOM : scene, scene-done, instruction, elt-${el.id}, asset-img-*
//   - hooks DnD  : data-dnd-draggable, data-dnd-dropzone (+ valeurs d'id)
//   - signaux tests : cursor 'grab' sur source active, token 'ring-amber' sur
//     la dropzone attendue, texte 'Étape N / M'
//   - validation exacte source+target, source unique enabled, wiggle 700ms
//   - 4 callbacks TTS (onInstruction/onSuccess/onComplete)

import { useEffect, useMemo, useState } from 'react'
import {
  DndContext, DragOverlay, useDraggable, useDroppable, PointerSensor, useSensor,
} from '@dnd-kit/core'
import GameAsset from './GameAsset'
import AvatarPreview from './AvatarPreview'
import SceneEffects, { deriveEffects } from './SceneEffects'
import sceneLayouts from './sceneLayouts'

// Dégradés CSS de fallback (recettes legacy sans fond peint dédié).
const BACKGROUNDS = {
  atelier_fonderie: 'linear-gradient(180deg,#7f1d1d 0%,#b91c1c 50%,#f59e0b 100%)',
  atelier_forgeron: 'linear-gradient(180deg,#451a03 0%,#92400e 50%,#fbbf24 100%)',
  foret: 'linear-gradient(180deg,#14532d 0%,#16a34a 60%,#86efac 100%)',
  atelier_charron: 'linear-gradient(180deg,#78350f 0%,#a16207 50%,#fde68a 100%)',
  celebration: 'linear-gradient(180deg,#1e3a8a 0%,#7c3aed 50%,#f472b6 100%)',
}
const IMAGE_BACKGROUNDS = {
  foret_bucheron: '/assets/zones/bg_foret_bucheron.svg',
  atelier_forgeron: '/assets/zones/bg_forge_enluminure.png',
  atelier_fonderie: '/assets/zones/bg_forge_enluminure.png',
  fondeur_bg_atelier: '/assets/chaine_acier/fondeur_bg_atelier.png',
  forgeron_bg_atelier: '/assets/chaine_acier/forgeron_bg_atelier.png',
}

// --- Layout legacy (recettes sans sceneLayouts) ----------------------------
const SCENE_LAYOUTS = {
  atelier_forgeron: {
    feu_forge:        { left: '6%',  top: '48%', w: '24%' },
    enclume:          { left: '33%', top: '52%', w: '20%' },
    zone_preparation: { left: '64%', top: '14%', w: '26%' },
    outil:            { left: '68%', top: '50%', w: '20%' },
  },
  atelier_fonderie: {
    four:             { left: '6%',  top: '46%', w: '26%' },
    moule:            { left: '38%', top: '54%', w: '20%' },
    zone_preparation: { left: '66%', top: '14%', w: '26%' },
  },
  fondeur_bg_atelier: {
    four_haut_fourneau: { left: '8%',  top: '40%', w: '22%' },
    moule_lingot:       { left: '40%', top: '52%', w: '18%' },
    zone_livraison:     { left: '66%', top: '60%', w: '20%' },
  },
  forgeron_bg_atelier: {
    forge_feu:   { left: '6%',  top: '40%', w: '22%' },
    enclume:     { left: '34%', top: '54%', w: '18%' },
    seau_eau:    { left: '52%', top: '58%', w: '16%' },
    avatar_zone: { left: '68%', top: '30%', w: '24%' },
    metal_chaud: { left: '36%', top: '40%', w: '16%' },
  },
  foret: {
    billot:           { left: '10%', top: '54%', w: '22%' },
    tronc:            { left: '40%', top: '50%', w: '22%' },
    zone_preparation: { left: '68%', top: '16%', w: '24%' },
  },
  atelier_charron: {
    chassis:          { left: '30%', top: '52%', w: '28%' },
    zone_preparation: { left: '66%', top: '16%', w: '24%' },
  },
}

function stagingLayout(index) {
  const perRow = 4
  const slotW = 15
  const gap = 2
  const totalW = perRow * slotW + (perRow - 1) * gap
  const startLeft = (100 - totalW) / 2
  const row = Math.floor(index / perRow)
  const col = index % perRow
  return {
    left: `${startLeft + col * (slotW + gap)}%`,
    top: `${80 - row * 18}%`,
    w: `${slotW}%`,
  }
}

function isStageProp(el) {
  return el.type === 'draggable'
}

// --- Composants partagés ---------------------------------------------------

function DragOverlayGhost({ el }) {
  if (!el) return null
  return (
    <div className="select-none flex flex-col items-center justify-center rounded-2xl bg-enl-ivoire/95 p-2 shadow-2xl scale-110 ring-4 ring-enl-or">
      <GameAsset assetId={el.asset} emoji={el.emoji} label={el.label || el.id} />
      {el.label && <span className="text-xs mt-1 font-semibold text-enl-encre">{el.label}</span>}
    </div>
  )
}

// --- Mode v2 : hotspot + rail inventaire -----------------------------------

// Dropzone invisible alignée sur le fond peint, révèle un halo au survol.
function HotspotDropzone({ id, layout, highlight, wrong, successFlash }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const ring = highlight ? 'ring-4 ring-amber-300 animate-pulse-gold' : ''
  const over = isOver ? 'bg-amber-400/20' : 'bg-transparent'
  const bad = wrong ? 'ring-4 ring-red-400 animate-wiggle' : ''
  const flash = successFlash ? 'animate-drop-success' : ''
  return (
    <div
      ref={setNodeRef}
      data-testid={`elt-${id}`}
      data-dnd-dropzone={id}
      className={`absolute rounded-xl transition ${ring} ${over} ${bad} ${flash}`}
      style={{ top: layout.top, left: layout.left, width: layout.width, height: layout.height }}
    />
  )
}

// Prop draggable dans le rail inventaire (mode v2).
function InventoryItem({ id, emoji, asset, label, disabled, wrong }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled })
  const style = {
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: disabled ? 'default' : 'grab',
  }
  const halo = !disabled ? 'animate-pulse-gold ring-2 ring-enl-or' : 'opacity-40'
  const anim = wrong ? 'animate-wiggle ring-4 ring-red-400' : ''
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`elt-${id}`}
      data-dnd-draggable={id}
      className={`select-none flex flex-col items-center justify-center rounded-2xl bg-enl-ivoire/90 p-2 shadow-lg transition ${halo} ${anim}`}
    >
      <GameAsset assetId={asset} emoji={emoji} label={label || id} size="md" />
      {label && <span className="text-xs mt-1 font-semibold text-enl-encre drop-shadow">{label}</span>}
    </div>
  )
}

// --- Mode legacy : sprite-based --------------------------------------------

function Draggable({ id, emoji, asset, label, disabled, wrong }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled })
  const style = {
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: disabled ? 'default' : 'grab',
  }
  const anim = wrong ? 'animate-wiggle ring-4 ring-red-400' : ''
  const halo = !disabled ? 'animate-pulse-gold ring-2 ring-enl-or' : 'opacity-40'
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`elt-${id}`}
      data-dnd-draggable={id}
      className={`select-none flex flex-col items-center justify-center rounded-2xl bg-enl-ivoire/85 p-2 shadow-lg transition ${halo} ${anim}`}
    >
      <GameAsset assetId={asset} emoji={emoji} label={label || id} />
      {label && <span className="text-xs mt-1 font-semibold text-enl-encre drop-shadow">{label}</span>}
    </div>
  )
}

function Dropzone({ id, emoji, asset, label, highlight, wrong, successFlash, children }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const ring = highlight ? 'ring-4 ring-amber-300 animate-pulse-gold' : ''
  const over = isOver ? 'ring-4 ring-enl-vermillon scale-105' : ''
  const bad = wrong ? 'ring-4 ring-red-400 animate-wiggle' : ''
  const flash = successFlash ? 'animate-drop-success' : ''
  return (
    <div
      ref={setNodeRef}
      data-testid={`elt-${id}`}
      data-dnd-dropzone={id}
      className={`relative flex flex-col items-center justify-center rounded-2xl bg-enl-ivoire/40 border-2 border-enl-or/60 p-2 shadow-lg transition ${ring} ${over} ${bad} ${flash}`}
    >
      {children ? children : (
        <>
          <GameAsset assetId={asset} emoji={emoji} label={label || id} />
          {label && <span className="text-xs mt-1 font-semibold text-enl-encre drop-shadow">{label}</span>}
        </>
      )}
    </div>
  )
}

function DraggableInner({ id, emoji, asset, disabled, wrong }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled })
  const style = {
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: disabled ? 'default' : 'grab',
  }
  const anim = wrong ? 'animate-wiggle ring-4 ring-red-400' : ''
  const halo = !disabled ? 'animate-pulse-gold ring-2 ring-enl-or' : 'opacity-50'
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`elt-${id}`}
      data-dnd-draggable={id}
      className={`select-none rounded-xl bg-enl-ivoire/85 p-2 shadow transition ${halo} ${anim}`}
    >
      <GameAsset assetId={asset} emoji={emoji} label={id} size="md" />
    </div>
  )
}

function StaticElt({ id, emoji, asset, label }) {
  return (
    <div data-testid={`elt-${id}`} className="flex flex-col items-center justify-center p-2">
      <GameAsset assetId={asset} emoji={emoji} label={label || id} />
      {label && <span className="text-xs mt-1 font-semibold text-enl-ivoire/90 drop-shadow">{label}</span>}
    </div>
  )
}

// --- Composant principal ---------------------------------------------------

export default function Scene({ recipeId, scenario, childName, avatarConfig, onComplete, onInstruction, onSuccess }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [wrongId, setWrongId] = useState(null)
  const [done, setDone] = useState(false)
  const [activeId, setActiveId] = useState(null)
  const [successTargetId, setSuccessTargetId] = useState(null)
  const sensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })

  const step = scenario.steps[stepIdx]
  const total = scenario.steps.length
  const expectedSource = step?.action_attendue?.source
  const expectedTarget = step?.action_attendue?.target

  // Détermine si cette recette utilise le mode v2 (hotspots invisibles).
  const layoutV2 = recipeId ? sceneLayouts[recipeId] : null
  const hasV2Layout = !!layoutV2

  const bgSrc = hasV2Layout
    ? layoutV2.background
    : IMAGE_BACKGROUNDS[scenario.background]
  const bgCss = BACKGROUNDS[scenario.background] || BACKGROUNDS.foret

  // Layout legacy (mode sprite).
  const legacyLayout = SCENE_LAYOUTS[scenario.background] || {}
  const stagedIds = useMemo(() => {
    if (hasV2Layout) return {}
    const m = {}
    let idx = 0
    for (const el of scenario.elements || []) {
      if (legacyLayout[el.id]) continue
      if (isStageProp(el)) m[el.id] = stagingLayout(idx++)
    }
    return m
  }, [scenario.elements, legacyLayout, hasV2Layout])

  const posOf = (id) => legacyLayout[id] || stagedIds[id]

  useEffect(() => {
    if (!done && step?.instruction_tts) onInstruction?.(step.instruction_tts)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, done])

  function handleDragEnd(ev) {
    setActiveId(null)
    const { active, over } = ev
    if (!over) return
    const src = active.id
    const tgt = over.id
    if (src === expectedSource && tgt === expectedTarget) {
      setWrongId(null)
      setSuccessTargetId(tgt)
      setTimeout(() => setSuccessTargetId(null), 600)
      onSuccess?.(step.success_tts)
      if (stepIdx + 1 >= total) {
        setDone(true)
        onComplete?.()
      } else {
        setStepIdx((i) => i + 1)
      }
    } else {
      setWrongId(`${src}>${tgt}`)
      setTimeout(() => setWrongId(null), 700)
    }
  }

  const validatedSteps = (scenario.steps || []).slice(0, stepIdx)
  const effects = deriveEffects(validatedSteps)
  const effectLayouts = {}
  for (const el of scenario.elements || []) {
    if (hasV2Layout) {
      const dz = layoutV2.dropzones[el.id]
      // SceneEffects attend { left, top, w } ; sceneLayouts utilise { left, top, width, height }.
      effectLayouts[el.id] = dz ? { left: dz.left, top: dz.top, w: dz.width } : undefined
    } else {
      effectLayouts[el.id] = posOf(el.id)
    }
  }

  const activeEl = (scenario.elements || []).find((e) => e.id === activeId)

  if (done) {
    return (
      <div data-testid="scene-done" className="card text-center">
        <p className="text-4xl mb-2">🎉</p>
        <p className="text-2xl font-bold text-enl-malachite">Bravo {childName} !</p>
        <p className="text-stone-600">Tu as terminé cette aventure !</p>
      </div>
    )
  }

  // ── Mode v2 : fond peint + hotspots invisibles + rail inventaire ──────────
  if (hasV2Layout) {
    const draggableEls = (scenario.elements || []).filter((el) => el.type === 'draggable' || el.type === 'both')
    const hotspotEls = (scenario.elements || []).filter((el) => el.type === 'dropzone' || el.type === 'both')
    const staticEls = (scenario.elements || []).filter((el) => el.type === 'static')

    return (
      <div data-testid="scene" className="rounded-3xl overflow-hidden shadow-xl border-4 border-enl-or/40">
        <DndContext
          sensors={[sensor]}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          {/* Zone de jeu 16:9 */}
          <div className="relative w-full overflow-hidden" style={{ aspectRatio: '16/9' }}>
            {/* Fond peint */}
            <img
              src={bgSrc}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-cover"
            />

            {/* Calques d'effet */}
            <SceneEffects validatedSteps={validatedSteps} layouts={effectLayouts} />

            {/* Compteur d'étape — coin supérieur droit */}
            <span className="absolute top-2 right-2 z-20 rounded-full bg-enl-encre/70 text-enl-ivoire px-3 py-1 text-sm font-bold">
              Étape {stepIdx + 1} / {total}
            </span>

            {/* Avatar — coin supérieur gauche */}
            <div
              className="absolute top-2 left-2 z-20 flex h-14 w-14 items-center justify-center rounded-full border-4 border-enl-or bg-enl-ivoire/75 shadow-lg"
              title={childName}
            >
              {avatarConfig ? (
                <AvatarPreview config={avatarConfig} size={48} />
              ) : (
                <span className="text-4xl drop-shadow">{scenario.avatar || '👧'}</span>
              )}
            </div>

            {/* Hotspots invisibles — alignés sur le fond peint */}
            {hotspotEls.map((el) => {
              const dzLayout = layoutV2.dropzones[el.id]
              if (!dzLayout) return null
              const isWrongTgt = wrongId?.endsWith(`>${el.id}`)
              return (
                <HotspotDropzone
                  key={el.id}
                  id={el.id}
                  layout={dzLayout}
                  highlight={el.id === expectedTarget}
                  wrong={isWrongTgt}
                  successFlash={el.id === successTargetId}
                />
              )
            })}

            {/* Éléments statiques dans la scène */}
            {staticEls.map((el) => {
              const pos = layoutV2.dropzones[el.id]
              if (!pos) return null
              return (
                <div key={el.id} className="absolute z-10" style={{ top: pos.top, left: pos.left, width: pos.width }}>
                  <StaticElt id={el.id} emoji={el.emoji} asset={el.asset} label={el.label} />
                </div>
              )
            })}

            {/* GuideBubble — bulle d'instruction en bas de la scène */}
            <div
              data-testid="instruction"
              className="absolute bottom-2 left-1/2 z-20 -translate-x-1/2 w-[90%] rounded-2xl bg-enl-encre/80 px-4 py-2 text-center backdrop-blur-sm"
            >
              <p className="text-base font-story text-enl-ivoire leading-snug">🎵 {step.instruction_tts}</p>
            </div>

            <DragOverlay dropAnimation={null}>
              <DragOverlayGhost el={activeEl} />
            </DragOverlay>
          </div>

          {/* Rail inventaire — props draggables sous la scène */}
          <div className="flex flex-wrap gap-3 p-3 bg-enl-encre/85 justify-center min-h-[80px]">
            {draggableEls.map((el) => {
              const isWrongSrc = wrongId?.startsWith(`${el.id}>`)
              return (
                <div key={el.id} className="w-16">
                  <InventoryItem
                    id={el.id}
                    emoji={el.emoji}
                    asset={el.asset}
                    label={el.label}
                    disabled={el.id !== expectedSource}
                    wrong={isWrongSrc}
                  />
                </div>
              )
            })}
          </div>
        </DndContext>
      </div>
    )
  }

  // ── Mode legacy : sprite-based layout -------------------------------------
  return (
    <div data-testid="scene" className="rounded-3xl overflow-hidden shadow-xl border-4 border-enl-or/40">
      <div
        className="relative p-4 min-h-[460px]"
        style={
          bgSrc
            ? { backgroundImage: `url(${bgSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#1A3A8F' }
            : { background: bgCss }
        }
      >
        <div className="relative z-20 flex items-center justify-between mb-3">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-enl-or bg-enl-ivoire/75 shadow-lg"
            title={childName}
          >
            {avatarConfig ? (
              <AvatarPreview config={avatarConfig} size={56} />
            ) : (
              <span className="text-5xl drop-shadow">{scenario.avatar || '👧'}</span>
            )}
          </div>
          <span className="rounded-full bg-enl-encre/70 text-enl-ivoire px-3 py-1 text-sm font-bold">
            Étape {stepIdx + 1} / {total}
          </span>
        </div>

        <div data-testid="instruction" className="card mb-4 py-3 relative z-20">
          <p className="text-lg font-story text-stone-800">🎵 {step.instruction_tts}</p>
        </div>

        <SceneEffects validatedSteps={validatedSteps} layouts={effectLayouts} />

        <DndContext
          sensors={[sensor]}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          {(scenario.elements || []).map((el) => {
            const isWrongSrc = wrongId?.startsWith(`${el.id}>`)
            const isWrongTgt = wrongId?.endsWith(`>${el.id}`)
            const pos = posOf(el.id)
            const wrapStyle = pos
              ? { position: 'absolute', left: pos.left, top: pos.top, width: pos.w, zIndex: 10 }
              : { position: 'relative', zIndex: 10 }

            const inner = (() => {
              if (el.type === 'both') {
                return (
                  <Dropzone id={el.id} emoji={el.emoji} asset={el.asset} label={el.label}
                            highlight={el.id === expectedTarget} wrong={isWrongTgt}
                            successFlash={el.id === successTargetId}>
                    <DraggableInner id={el.id} emoji={el.emoji} asset={el.asset}
                                    disabled={el.id !== expectedSource} wrong={isWrongSrc} />
                  </Dropzone>
                )
              }
              if (el.type === 'draggable') {
                return (
                  <Draggable key={el.id} id={el.id} emoji={el.emoji} asset={el.asset} label={el.label}
                             disabled={el.id !== expectedSource} wrong={isWrongSrc} />
                )
              }
              if (el.type === 'dropzone') {
                return (
                  <Dropzone id={el.id} emoji={el.emoji} asset={el.asset} label={el.label}
                            highlight={el.id === expectedTarget} wrong={isWrongTgt}
                            successFlash={el.id === successTargetId} />
                )
              }
              return <StaticElt id={el.id} emoji={el.emoji} asset={el.asset} label={el.label} />
            })()

            return <div key={el.id} style={wrapStyle}>{inner}</div>
          })}

          <DragOverlay dropAnimation={null}>
            <DragOverlayGhost el={activeEl} />
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
