// Scene.jsx — Moteur de Scène interactif (Objectif 2).
//
// Rend une scène visuelle : décor (dégradé CSS par `background`), avatar de
// l'enfant, et éléments (draggable / dropzone / static). Gère la logique de
// drag-and-drop (via @dnd-kit) étape par étape :
//   T2.1 rendu du background + elements
//   T2.2 un élément draggable peut être saisi et déplacé
//   T2.3 déposer la bonne source sur la bonne target -> succès + étape suivante
//   T2.4 mauvaise source/cible -> feedback visuel (secousse + retour) sans blocage
//
// Les textes TTS sont annoncés au parent via les callbacks onInstruction(text)
// et onSuccess(text) — la lecture audio effective est gérée par ScenePage.

import { useEffect, useMemo, useState } from 'react'
import { DndContext, useDraggable, useDroppable, PointerSensor, useSensor } from '@dnd-kit/core'
import GameAsset from './GameAsset'
import AvatarPreview from './AvatarPreview'

// Dégradés CSS associés aux clés de `background` (Règle 3 : pas de beaux assets).
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

function Draggable({ id, emoji, asset, label, disabled, wrong }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled })
  const style = {
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    cursor: disabled ? 'default' : 'grab',
  }
  // Animation de "secousse rouge" si on vient de se tromper (T2.4).
  const anim = wrong ? 'animate-wiggle ring-4 ring-red-400' : ''
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`elt-${id}`}
      data-dnd-draggable={id}
      className={`select-none flex flex-col items-center justify-center rounded-2xl bg-white/85 p-3 shadow-lg ${anim}`}
    >
      <GameAsset assetId={asset} emoji={emoji} label={label || id} />
      {label && <span className="text-xs mt-1 font-semibold text-stone-600">{label}</span>}
    </div>
  )
}

function Dropzone({ id, emoji, asset, label, highlight, wrong, children }) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const ring = highlight ? 'ring-4 ring-amber-300' : ''
  const over = isOver ? 'ring-4 ring-green-400 scale-105' : ''
  const bad = wrong ? 'ring-4 ring-red-400 animate-wiggle' : ''
  return (
    <div
      ref={setNodeRef}
      data-testid={`elt-${id}`}
      data-dnd-dropzone={id}
      className={`relative flex flex-col items-center justify-center rounded-2xl bg-white/40 border-4 border-white/60 p-3 shadow-lg ${ring} ${over} ${bad}`}
    >
      {children ? (
        children
      ) : (
        <>
          <GameAsset assetId={asset} emoji={emoji} label={label || id} />
          {label && <span className="text-xs mt-1 font-semibold text-white drop-shadow">{label}</span>}
        </>
      )}
    </div>
  )
}

// Draggable "intérieur" : pour un élément "both", on rend un draggable à
// l'intérieur d'une dropzone (l'enfant peut le saisir ET y déposer).
function DraggableInner({ id, emoji, asset, disabled, wrong }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id, disabled })
  const style = {
    transform: transform ? `translate3d(${transform.x}px,${transform.y}px,0)` : undefined,
    opacity: isDragging ? 0.6 : 1,
    cursor: disabled ? 'default' : 'grab',
  }
  const anim = wrong ? 'animate-wiggle ring-4 ring-red-400' : ''
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      data-testid={`elt-${id}`}
      data-dnd-draggable={id}
      className={`select-none rounded-xl bg-white/85 p-2 shadow ${anim}`}
    >
      <GameAsset assetId={asset} emoji={emoji} label={id} size="md" />
    </div>
  )
}

function StaticElt({ id, emoji, asset, label }) {
  return (
    <div data-testid={`elt-${emoji}`} className="flex flex-col items-center justify-center p-3">
      <GameAsset assetId={asset} emoji={emoji} label={label || id} />
      {label && <span className="text-xs mt-1 font-semibold text-white/80 drop-shadow">{label}</span>}
    </div>
  )
}

export default function Scene({ scenario, childName, avatarConfig, onComplete, onInstruction, onSuccess }) {
  const [stepIdx, setStepIdx] = useState(0)
  const [wrongId, setWrongId] = useState(null) // id d'élément en secousse (T2.4)
  const [done, setDone] = useState(false)
  const sensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } })

  const step = scenario.steps[stepIdx]
  const total = scenario.steps.length

  // La source attendue pour l'étape courante : on la rend "non désactivée",
  // les autres draggables sont désactivés pour guider l'enfant.
  const expectedSource = step?.action_attendue?.source
  const expectedTarget = step?.action_attendue?.target

  const bgSrc = IMAGE_BACKGROUNDS[scenario.background]
  const bgCss = BACKGROUNDS[scenario.background] || BACKGROUNDS.foret

  // T3.2 — à chaque étape (y compris la 1re au montage), on annonce l'instruction.
  useEffect(() => {
    if (!done && step?.instruction_tts) {
      onInstruction?.(step.instruction_tts)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepIdx, done])

  function handleDragEnd(ev) {
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

  if (done) {
    return (
      <div data-testid="scene-done" className="card text-center">
        <p className="text-4xl mb-2">🎉</p>
        <p className="text-2xl font-bold text-green-700">Bravo {childName} !</p>
        <p className="text-stone-600">Tu as terminé cette aventure !</p>
      </div>
    )
  }

  return (
    <div data-testid="scene" className="rounded-3xl overflow-hidden shadow-xl border-4 border-white/50">
      {/* Décor (T2.1) */}
      <div
        className="relative p-6 min-h-[420px] flex flex-col"
        style={
          bgSrc
            ? { backgroundImage: `url(${bgSrc})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#1A3A8F' }
            : { background: bgCss }
        }
      >
        <div className="flex items-center justify-between mb-4">
          {/* Avatar de l'enfant — coin supérieur gauche, avec fallback emoji */}
          <div
            className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-amber-300 bg-white/75 shadow-lg"
            title={childName}
          >
            {avatarConfig ? (
              <AvatarPreview config={avatarConfig} size={56} />
            ) : (
              <span className="text-5xl drop-shadow">{scenario.avatar || '👧'}</span>
            )}
          </div>
          <span className="rounded-full bg-black/30 text-white px-3 py-1 text-sm font-bold">
            Étape {stepIdx + 1} / {total}
          </span>
        </div>

        {/* Consigne (instruction_tts) affichée aussi à l'écran */}
        <div data-testid="instruction" className="card mb-5 py-3">
          <p className="text-lg font-story text-stone-800">🎵 {step.instruction_tts}</p>
        </div>

        <DndContext sensors={[sensor]} onDragEnd={handleDragEnd}>
          <div className="flex flex-wrap items-center justify-center gap-4 flex-1">
            {scenario.elements.map((el) => {
              const isWrongSrc = wrongId && wrongId.startsWith(`${el.id}>`)
              const isWrongTgt = wrongId && wrongId.endsWith(`>${el.id}`)
              // Un élément "both" (draggable + dropzone) est rendu comme une
              // cible qui contient un draggable, afin d'être à la fois saisi
              // et déposable (utile p.ex. pour reprendre un objet déjà posé).
              if (el.type === 'both') {
                return (
                  <Dropzone key={el.id} id={el.id} emoji={el.emoji} asset={el.asset} label={el.label}
                            highlight={el.id === expectedTarget} wrong={isWrongTgt}>
                    <DraggableInner id={el.id} emoji={el.emoji} asset={el.asset}
                                    disabled={el.id !== expectedSource} wrong={isWrongSrc} />
                  </Dropzone>
                )
              }
              if (el.type === 'draggable') {
                return (
                  <Draggable
                    key={el.id} id={el.id} emoji={el.emoji} asset={el.asset}
                    disabled={el.id !== expectedSource} wrong={isWrongSrc}
                  />
                )
              }
              if (el.type === 'dropzone') {
                return (
                  <Dropzone key={el.id} id={el.id} emoji={el.emoji} asset={el.asset} label={el.label}
                            highlight={el.id === expectedTarget} wrong={isWrongTgt} />
                )
              }
              return <StaticElt key={el.id} id={el.id} emoji={el.emoji} asset={el.asset} />
            })}
          </div>
        </DndContext>
      </div>
    </div>
  )
}
