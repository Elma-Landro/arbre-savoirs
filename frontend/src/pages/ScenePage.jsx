// ScenePage.jsx — Page d'une recette : orchestre le moteur de scène (Objectif 2)
// + la narration TTS séquentielle (Objectif 3).
//
//   - Au chargement d'une étape : joue l'audio de `instruction_tts` (T3.2).
//   - À la validation d'une action : joue l'audio de `success_tts` (T3.3),
//     puis passe à l'étape suivante (qui rejoue sa propre instruction).
//
// On utilise new Audio(url) pour pouvoir enchaîner success -> instruction
// de la prochaine étape sans dépendre d'un <audio> unique.

import { useEffect, useRef, useState } from 'react'
import { fetchRecipe, narrateStep, preloadSceneAudio } from '../api'
import Scene from '../components/Scene'

export default function ScenePage({ recipe, childName, avatarConfig, onCompleted, onBack }) {
  const [fullRecipe, setFullRecipe] = useState(null) // avec scenario
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [preloadedAudios, setPreloadedAudios] = useState({})
  const [narrating, setNarrating] = useState(false)
  const [audioUnavailable, setAudioUnavailable] = useState(false)
  const [stepVersion, setStepVersion] = useState(0) // incrémenté à chaque changement d'étape
  const audioRef = useRef(null)

  // Charge la recette complète (avec scenario).
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    setFullRecipe(null)
    setPreloadedAudios({})
    fetchRecipe(recipe.id)
      .then(async (data) => {
        let audioByText = {}
        try {
          const preload = await preloadSceneAudio(recipe.id, childName)
          const steps = data.scenario?.steps || []
          audioByText = steps.reduce((acc, step) => {
            const pair = preload.audios?.[String(step.id)] || {}
            if (step.instruction_tts && pair.instruction?.audio_url) {
              acc[step.instruction_tts] = pair.instruction.audio_url
            }
            if (step.success_tts && pair.success?.audio_url) {
              acc[step.success_tts] = pair.success.audio_url
            }
            return acc
          }, {})
        } catch (e) {
          console.warn('Préchargement TTS indisponible, fallback narrate-step :', e.message)
        }
        if (!cancelled) {
          setPreloadedAudios(audioByText)
          setFullRecipe(data)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message)
          setLoading(false)
        }
      })
    return () => {
      cancelled = true
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [recipe.id, childName])

  async function playAudioUrl(url) {
    if (!url) return
    if (audioRef.current) audioRef.current.pause()
    const a = new Audio(url)
    audioRef.current = a
    setAudioUrl(url)
    // Propage l'échec d'autoplay pour activer le feedback d'indisponibilité.
    await a.play()
  }

  // Narration : lit une piste préchargée si disponible, sinon synthétise un texte court.
  async function speak(text) {
    if (!text) return
    setNarrating(true)
    // Une nouvelle tentative d'audio réinitialise le statut d'indisponibilité :
    // si la piste joue (cache ou synthèse), le message d'erreur disparaît.
    setAudioUnavailable(false)
    try {
      const cachedUrl = preloadedAudios[text]
      if (cachedUrl) {
        await playAudioUrl(cachedUrl)
        return
      }
      const data = await narrateStep(text, childName)
      await playAudioUrl(data.audio_url)
    } catch {
      // Autoplay bloqué (Safari/iOS), fichier inaccessible, ou TTS indisponible.
      setAudioUnavailable(true)
    } finally {
      setNarrating(false)
    }
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-green-700 font-bold underline">
        ← Retour aux recettes
      </button>

      <header className="mb-5">
        <p className="text-sm uppercase tracking-wide text-green-600 font-semibold">{recipe.metier}</p>
        <h1 className="text-3xl md:text-4xl font-extrabold text-amber-800">{recipe.titre}</h1>
      </header>

      {loading && <p className="text-center text-xl py-10">Préparation de la scène… 🎭</p>}
      {error && <p className="text-center text-red-600 py-10">Erreur : {error}</p>}

      {fullRecipe && (
        <>
          {/* La scène notifie ScenePage via onInstruction (nouvelle étape)
              et onSuccess (action validée) pour déclencher les TTS. */}
          <Scene
            key={fullRecipe.id}
            scenario={fullRecipe.scenario}
            childName={childName}
            avatarConfig={avatarConfig}
            resultId={fullRecipe.resultat?.[0]?.id}
            onInstruction={(text) => speak(text)}
            onSuccess={(text) => speak(text)}
            onComplete={() => onCompleted(
              fullRecipe.id,
              (fullRecipe.resultat || []).map((r) => r.id),
            )}
          />
          <p className="text-xs text-stone-400 mt-3 text-center">
            {narrating
              ? '🔊 Préparation de la voix…'
              : audioUnavailable
                ? '🔇 La voix n\'est pas disponible — lis les instructions à voix haute !'
                : audioUrl
                  ? ''
                  : 'La voix guide l\'enfant à chaque étape.'}
          </p>
        </>
      )}
    </div>
  )
}
