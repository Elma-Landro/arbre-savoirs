// Scene.jsx — Scène interactive "in-situ" (Refonte UX Objectif 1).
//
// Refonte Bayam-style : les objets vivent DANS le décor à des emplacements
// naturels (le charbon près du four, le minerai sur l'établi), et non plus
// dans une rangée flex-wrap centrée. Les dropzones sont des éléments du décor
// (gueule du four, enclume) avec un halo or pulsant. Chaque dépôt correct
// déclenche une transformation visuelle (flammes, étincelles, lueur) via les
// calques <SceneEffects>.
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

// Dégradés CSS de fallback (Règle 3 : pas de beaux assets pour les bgs inconnus).
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
}

// --- Registre de layout O1 ------------------------------------------------
// Positions absolues (% du décor) des éléments par clé de `background`.
// Un élément absent du layout est placé en "zone de staging" (bandeau bas)
// -> préserve les recettes LLM générées sans layout dédié (Règle 3).
//
// Convention : { left, top, w } en % de la zone décor. `w` est la largeur ;
// la hauteur est auto (ratio du sprite).
//
// Composition visée (bg_forge_enluminure.png) :
//   - atelier_forgeron / atelier_fonderie : éléments de forge à gauche
//     (four, feu, enclume), espace préparation/avatar à droite.
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
    // NB: les draggables simples (metal_liquide, minerai, charbon, tablier,
    // gants) vont en zone de staging pour éviter le chevauchement avec les
    // dropzones fixes. Seuls les éléments "both" (draggable+dropzone) restent
    // à position dédiée car ils sont aussi des pièces du décor.
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

// Zone de staging : les objets "draggables de l'étape courante" (tablier,
// lingot, charbon...) qui ne sont pas une pièce fixe du décor. On les aligne
// en bas du décor sur deux rangées maximum pour qu'ils restent visibles et
// saisissables SANS jamais se chevaucher (chevauchement = drop cassé).
function stagingLayout(index) {
  const perRow = 4     // 4 slots par rangée
  const slotW = 15     // largeur en %
  const gap = 2
  const totalW = perRow * slotW + (perRow - 1) * gap
  const startLeft = (100 - totalW) / 2
  const row = Math.floor(index / perRow)
  const col = index % perRow
  const left = startLeft + col * (slotW + gap)
  const top = 80 - row * 18  // rangée 0 à 80%, rangée 1 à 62%
  return { left: `${left}%`, top: `${top}%`, w: `${slotW}%` }
}

// Un élément est-il une "pièce fixe du décor" (dropzone/both/static) ?
// Les draggables simples vont en staging sauf s'ils ont une position dédiée.
function isStageProp(el) {
  return el.type === 'draggable'
}

function Draggable({ id, emoji, asset, label, disabled, wrong }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled })
  // Note : le transform inline reste (surchargé par DragOverlay pour le ghost).
  // On garde cursor 'grab' sur l'élément source — signal lu par e2e_objective5.
  const style = {
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    opacity: isDragging ? 0.35 : 1,
    cursor: disabled ? 'default' : 'grab',
  }
  const anim = wrong ? 'animate-wiggle ring-4 ring-red-400' : ''
  // Halo or pulsant seulement si l'élément est la source active (non disabled).
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

function Dropzone({ id, emoji, asset, label, highlight, wrong, children }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  // Token 'ring-amber' conservé : e2e_objective5:37 détecte la cible attendue
  // via className.includes('ring-amber'). On garde ce token ET on ajoute le
  // halo or pulsant pour le rendu enluminé.
  const ring = highlight ? 'ring-4 ring-amber-300 animate-pulse-gold' : ''
  // Au survol d'un objet compatible : halo vermillon + intensification.
  const over = isOver ? 'ring-4 ring-enl-vermillon scale-105' : ''
  const bad = wrong ? 'ring-4 ring-red-400 animate-wiggle' : ''
  return (
    <div
      ref={setNodeRef}
      data-testid={`elt-${id}`}
      data-dnd-dropzone={id}
      className={`relative flex flex-col items-center justify-center rounded-2xl bg-enl-ivoire/40 border-2 border-enl-or/60 p-2 shadow-lg transition ${ring} ${over} ${bad}`}
    >
      {children ? (
        children
      ) : (
        <>
          <GameAsset assetId={asset} emoji={emoji} label={label || id} />
          {label && <span className="text-xs mt-1 font-semibold text-enl-encre drop-shadow">{label}</span>}
        </>
      )}
    </div>
  )
}

// Draggable "intérieur" : pour un élément "both" (draggable + dropzone).
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

export default function Scene({ scenario, childName, avatarConfig, onComplete, onInstruction, onSuccess }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [wrongId, setWrongId] = useState(null) // id d'élément en secousse (T2.4)
  const [done, setDone] = useState(false)
  // DragOverlay : id de l'élément en cours de glissement (pour le ghost).
  const [activeId, setActiveId] = useState(null)
  const sensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })

  const step = scenario.steps[stepIdx]
  const total = scenario.steps.length

  const expectedSource = step?.action_attendue?.source
  const expectedTarget = step?.action_attendue?.target

  const bgSrc = IMAGE_BACKGROUNDS[scenario.background]
  const bgCss = BACKGROUNDS[scenario.background] || BACKGROUNDS.foret

  // Layout du décor courant + fallback staging.
  const layout = SCENE_LAYOUTS[scenario.background] || {}
  const stagedIds = useMemo(() => {
    // Les draggables sans position dédiée vont en staging ; on assigne un slot.
    const m = {}
    let stageIdx = 0
    for (const el of scenario.elements || []) {
      if (layout[el.id]) continue // position dédiée
      if (isStageProp(el)) {
        m[el.id] = stagingLayout(stageIdx++)
      }
    }
    return m
  }, [scenario.elements, layout])

  // Map finale id -> position ( dédiée | staging ).
  const posOf = (id) => layout[id] || stagedIds[id]

  // T3.2 — à chaque étape (y compris la 1re au montage), on annonce l'instruction.
  useEffect(() => {
    if (!done && step?.instruction_tts) {
      onInstruction?.(step.instruction_tts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, done])

  function handleDragEnd(ev) {
    setActiveId(null)
    const { active, over } = ev
    if (!over) return
    const src = active.id
    const tgt = over.id
    if (src === expectedSource && tgt === expectedTarget) {
      // T2.3 — succès : on lit le success_tts, puis on passe à l'étape suivante.
      setWrongId(null)
      onSuccess?.(step.success_tts)
      if (stepIdx + 1 >= total) {
        setDone(true)
        onComplete?.()
      } else {
        setStepIdx((i) => i + 1)
      }
    } else {
      // T2.4 — erreur : feedback visuel (secousse rouge), sans bloquer.
      setWrongId(`${src}>${tgt}`)
      setTimeout(() => setWrongId(null), 700)
    }
  }

  // Étapes déjà validées (pour les calques de transformation).
  const validatedSteps = (scenario.steps || []).slice(0, stepIdx)
  const effects = deriveEffects(validatedSteps)
  // Positions des ancres d'effet (layout + fallback sur la position du sprite
  // source si la cible n'a pas de slot dédié).
  const effectLayouts = {}
  for (const el of scenario.elements || []) effectLayouts[el.id] = posOf(el.id)

  // Sprite actif pour le DragOverlay (le ghost qui suit le curseur).
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
        {/* Bandeau supérieur : avatar (gauche) + compteur d'étape (droite) */}
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

        {/* Consigne (instruction_tts) affichée aussi à l'écran */}
        <div data-testid="instruction" className="card mb-4 py-3 relative z-20">
          <p className="text-lg font-story text-stone-800">🎵 {step.instruction_tts}</p>
        </div>

        {/* Calques d'effet (flammes/étincelles/lueur) sous les éléments */}
        <SceneEffects validatedSteps={validatedSteps} layouts={effectLayouts} />

        {/* Décor interactif : chaque élément positionné dans le décor. */}
        <DndContext
          sensors={[sensor]}
          onDragStart={(e) => setActiveId(e.active.id)}
          onDragCancel={() => setActiveId(null)}
          onDragEnd={handleDragEnd}
        >
          {(scenario.elements || []).map((el) => {
            const isWrongSrc = wrongId && wrongId.startsWith(`${el.id}>`)
            const isWrongTgt = wrongId && wrongId.endsWith(`>${el.id}`)
            const pos = posOf(el.id)
            // Wrapper positionné : si pas de position (fallback total), on
            // reste dans le flux via un conteneur inline bas.
            const wrapStyle = pos
              ? { position: 'absolute', left: pos.left, top: pos.top, width: pos.w, zIndex: 10 }
              : { position: 'relative', zIndex: 10 }

            const inner = (() => {
              if (el.type === 'both') {
                return (
                  <Dropzone id={el.id} emoji={el.emoji} asset={el.asset} label={el.label}
                            highlight={el.id === expectedTarget} wrong={isWrongTgt}>
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
                            highlight={el.id === expectedTarget} wrong={isWrongTgt} />
                )
              }
              return <StaticElt id={el.id} emoji={el.emoji} asset={el.asset} label={el.label} />
            })()

            return (
              <div key={el.id} style={wrapStyle}>
                {inner}
              </div>
            )
          })}

          {/* DragOverlay : ghost qui suit le curseur pendant le drag. */}
          <DragOverlay dropAnimation={null}>
            {activeEl ? (
              <div className="select-none flex flex-col items-center justify-center rounded-2xl bg-enl-ivoire/95 p-2 shadow-2xl scale-110 ring-4 ring-enl-or">
                <GameAsset assetId={activeEl.asset} emoji={activeEl.emoji} label={activeEl.label || activeEl.id} />
                {activeEl.label && (
                  <span className="text-xs mt-1 font-semibold text-enl-encre">{activeEl.label}</span>
                )}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}
