// MetaStory.jsx — Scène finale de célébration (Objectif 5 V2).
//
// T5.1 Déclenchement : n'apparaît que si >= 3 recettes sont complétées.
// T5.2 Rendu des objets : affiche graphiquement (emojis géants) au moins 2
//      objets résultant des recettes complétées.
// T5.3 Narration de synthèse : un texte TTS résumant les accomplissements
//      est généré (LLM) puis joué.

import { useEffect, useRef, useState } from 'react'
import { fetchRecipe, generateMetaStory, narrate } from '../api'

// Emoji associé à un résultat (via le graphe : on récupère l'emoji du nœud résultat).
// En fallback, un emoji générique.
const FALLBACK_EMOJI = '🎁'

export default function MetaStory({ completedIds, childName, onBack }) {
  const [objects, setObjects] = useState([]) // [{ label, emoji }]
  const [summary, setSummary] = useState('')
  const [audioUrl, setAudioUrl] = useState('')
  const [state, setState] = useState('idle') // idle | loading | ready | error
  const [error, setError] = useState('')
  const audioRef = useRef(null)

  const enough = completedIds.length >= 3

  // Charge les objets résultats des recettes complétées (T5.2).
  useEffect(() => {
    if (!enough) return
    let cancelled = false
    Promise.all(completedIds.map((id) => fetchRecipe(id).catch(() => null)))
      .then((recipes) => {
        if (cancelled) return
        // Récupère le label + emoji du nœud résultat de chaque recette.
        // Le endpoint /api/recipe/{id} renvoie la recette brute ; le résultat
        // référence des nœuds (id). On récupère l'emoji via /api/graph (une fois).
        // Plus simple : le summary LLM suffit, et pour les emojis on interroge /api/graph.
        setObjects(recipes.filter(Boolean))
      })
    return () => { cancelled = true }
  }, [completedIds, enough])

  // Charge les emojis des nœuds résultats via /api/graph.
  const [nodeEmojis, setNodeEmojis] = useState({})
  useEffect(() => {
    if (!enough) return
    fetch('/api/graph').then((r) => r.json()).then((g) => {
      const m = {}
      for (const n of g.nodes) m[n.id] = n.emoji || FALLBACK_EMOJI
      setNodeEmojis(m)
    }).catch(() => {})
  }, [enough])

  async function handleCelebrate() {
    setState('loading'); setError(''); setSummary(''); setAudioUrl('')
    try {
      // T5.3 — résumé LLM des accomplissements.
      const data = await generateMetaStory(completedIds, childName)
      setSummary(data.text)
      // T5.3 — narration TTS du résumé.
      const audio = await narrate(data.text, childName)
      setAudioUrl(audio.audio_url)
      setState('ready')
      setTimeout(() => audioRef.current?.play().catch(() => {}), 200)
    } catch (e) {
      setError(e.message); setState('error')
    }
  }

  // Calcule les objets résultats à afficher (T5.2 : au moins 2).
  const resultObjects = []
  for (const r of objects) {
    for (const res of (r.resultat || [])) {
      const id = res.id || res
      resultObjects.push({ id, label: r.titre, emoji: nodeEmojis[id] || FALLBACK_EMOJI })
    }
  }
  const showObjects = resultObjects.slice(0, 8)

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-green-700 font-bold underline">
        ← Retour aux recettes
      </button>

      <header className="mb-5">
        <h1 className="text-3xl md:text-4xl font-extrabold text-purple-700">🏆 Ma grande aventure</h1>
        <p className="text-stone-600 mt-1">
          Tu as complété <strong>{completedIds.length}</strong> recette{completedIds.length > 1 ? 's' : ''} !
        </p>
      </header>

      {!enough && (
        <div className="card border-amber-300">
          <p className="text-lg">
            ⭐ Il te faut au moins <strong>3 recettes</strong> complétées pour débloquer la grande scène finale.
            Encore {3 - completedIds.length} !
          </p>
        </div>
      )}

      {/* T5.2 — décor de célébration avec les objets créés */}
      {enough && (
        <div data-testid="celebration-scene"
             className="rounded-3xl overflow-hidden shadow-xl border-4 border-white/50 mb-5"
             style={{ background: 'linear-gradient(180deg,#1e3a8a 0%,#7c3aed 50%,#f472b6 100%)' }}>
          <div className="p-8 flex flex-col items-center">
            <p className="text-2xl font-bold text-white drop-shadow mb-1">🎉 Bravo {childName} ! 🎉</p>
            <p className="text-white/90 mb-6">Regarde tout ce que tu as fabriqué :</p>
            <div data-testid="result-objects"
                 className="flex flex-wrap items-center justify-center gap-4">
              {showObjects.map((o, i) => (
                <div key={i} data-testid={`trophy-${i}`}
                     className="flex flex-col items-center bg-white/20 rounded-2xl p-4 backdrop-blur">
                  <span className="text-7xl drop-shadow-lg">{o.emoji}</span>
                  <span className="text-xs text-white/90 mt-2 font-semibold text-center max-w-[8rem]">{o.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {enough && (
        <>
          <button className="btn-primary mb-5" onClick={handleCelebrate} disabled={state === 'loading'}>
            {state === 'loading' ? '✨ Je raconte ta grande aventure…' : '✨ Raconte ma grande aventure'}
          </button>

          {error && <p className="text-red-600 mb-3">Erreur : {error}</p>}

          {summary && (
            <article data-testid="meta-summary" className="card font-story text-xl leading-relaxed whitespace-pre-line">
              {summary}
            </article>
          )}

          {audioUrl && (
            <audio ref={audioRef} src={audioUrl} controls className="w-full mt-4" />
          )}
        </>
      )}
    </div>
  )
}
