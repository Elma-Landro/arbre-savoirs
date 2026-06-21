// Contribute.jsx — Outil de contribution V2 (Objectif 6).
// Formulaire pour créer une RECETTE avec son SCENARIO interactif :
//   - infos générales (id, titre, métier, ingrédients, résultats)
//   - décor (background) + avatar
//   - éléments (id, emoji, type)
//   - ÉDITEUR D'ÉTAPES DYNAMIQUE (T6.1) : bouton "Ajouter une étape" ->
//     chaque étape a Instruction / Source / Cible / Texte de succès.
// Bouton "Générer" -> YAML téléchargeable conforme au schéma scène (T6.2).
// Bouton "Valider" -> vérification côté backend (KnowledgeGraph.validate).

import { useState } from 'react'
import yaml from 'js-yaml'
import { validateContribution } from '../api'

const BACKGROUNDS = ['atelier_fonderie', 'atelier_forgeron', 'foret', 'atelier_charron', 'celebration']

const EMPTY = {
  id: '', titre: '', metier: '',
  ingredients: 'minerai_fer', resultat: 'lingot_acier',
  background: 'foret', avatar: '👧',
  elements: 'marteau, 🔨, draggable\nenclume, ⚙️, dropzone',
  steps: [
    { instruction: 'Prends le marteau !', source: 'marteau', target: 'enclume', success: 'Bravo !' },
  ],
}

function parseElements(text) {
  // Format : "id, emoji, type" par ligne.
  return text.split('\n').map((l) => l.trim()).filter(Boolean).map((line) => {
    const parts = line.split(',').map((s) => s.trim())
    return { id: parts[0], emoji: parts[1] || '❓', type: parts[2] || 'static' }
  })
}

function toIds(text) {
  return text.split(/[,\n]/).map((s) => s.trim()).filter(Boolean).map((id) => ({ id, quantite: 1 }))
}

export default function Contribute({ onBack }) {
  const [form, setForm] = useState(EMPTY)
  const [validation, setValidation] = useState(null)
  const [busy, setBusy] = useState(false)

  function setField(field, value) {
    setForm((f) => ({ ...f, [field]: value }))
    setValidation(null)
  }
  function setStep(i, field, value) {
    setForm((f) => {
      const steps = f.steps.map((s, idx) => (idx === i ? { ...s, [field]: value } : s))
      return { ...f, steps }
    })
    setValidation(null)
  }
  function addStep() {
    setForm((f) => ({ ...f, steps: [...f.steps, { instruction: '', source: '', target: '', success: '' }] }))
  }
  function removeStep(i) {
    setForm((f) => ({ ...f, steps: f.steps.filter((_, idx) => idx !== i) }))
  }

  function buildData() {
    return {
      id: form.id,
      titre: form.titre,
      metier: form.metier,
      ingredients: toIds(form.ingredients),
      resultat: toIds(form.resultat),
      scenario: {
        background: form.background,
        avatar: form.avatar,
        elements: parseElements(form.elements),
        steps: form.steps.map((s, idx) => ({
          id: idx + 1,
          instruction_tts: s.instruction,
          action_attendue: { type: 'drag_and_drop', source: s.source, target: s.target },
          success_tts: s.success,
        })),
      },
    }
  }

  async function handleValidate() {
    setBusy(true); setValidation(null)
    try {
      const res = await validateContribution('recipe', buildData())
      setValidation({ valid: true })
    } catch (e) {
      setValidation({ error: e.message })
    } finally { setBusy(false) }
  }

  function handleDownload() {
    const data = buildData()
    const text = yaml.dump({ recipes: [data] }, { allowUnicode: true, sortKeys: false })
    const blob = new Blob([text], { type: 'text/yaml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `contribution_${data.id || 'nouveau'}.yaml`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div>
      <button onClick={onBack} className="mb-4 text-green-700 font-bold underline">
        ← Retour aux recettes
      </button>

      <header className="mb-5">
        <h1 className="text-3xl md:text-4xl font-extrabold text-indigo-700">✍️ Crée ta scène interactive</h1>
        <p className="text-stone-600 mt-1">
          Définis une recette, son décor, ses éléments et les étapes que l'enfant devra accomplir.
        </p>
      </header>

      <div className="card space-y-3">
        <h2 className="font-bold text-amber-800">1. La recette</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <F label="id" value={form.id} onChange={(v) => setField('id', v)} placeholder="recette_verre" tid="rec-id" />
          <F label="Titre" value={form.titre} onChange={(v) => setField('titre', v)} placeholder="La magie du verre" tid="rec-titre" />
          <F label="Métier" value={form.metier} onChange={(v) => setField('metier', v)} placeholder="Verrier" tid="rec-metier" />
          <F label="Avatar (emoji)" value={form.avatar} onChange={(v) => setField('avatar', v)} placeholder="👧" tid="rec-avatar" />
          <F label="Ingrédients (ids)" value={form.ingredients} onChange={(v) => setField('ingredients', v)} placeholder="sable_silice" tid="rec-ing" />
          <F label="Résultats (ids)" value={form.resultat} onChange={(v) => setField('resultat', v)} placeholder="objet_verre" tid="rec-res" />
        </div>
        <div>
          <label className="font-semibold">Décor (background)</label>
          <select data-testid="rec-bg" value={form.background} onChange={(e) => setField('background', e.target.value)} className="ml-2 rounded-xl border-2 border-amber-200 px-2 py-1">
            {BACKGROUNDS.map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      <div className="card space-y-3 mt-4">
        <h2 className="font-bold text-amber-800">2. Les éléments (id, emoji, type)</h2>
        <p className="text-xs text-stone-500">Un par ligne. Type : draggable / dropzone / static.</p>
        <textarea data-testid="rec-elements" value={form.elements} onChange={(e) => setField('elements', e.target.value)} rows={4} className="w-full rounded-xl border-2 border-amber-200 px-3 py-2 font-mono text-sm" />
      </div>

      {/* T6.1 — éditeur d'étapes dynamique */}
      <div className="card space-y-3 mt-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-amber-800">3. Les étapes ({form.steps.length})</h2>
          <button data-testid="add-step" onClick={addStep} className="btn-secondary !py-2 !px-4 !text-base">+ Ajouter une étape</button>
        </div>
        {form.steps.map((s, i) => (
          <div key={i} data-testid={`step-block-${i}`} className="rounded-xl border-2 border-amber-100 p-3 space-y-2 bg-amber-50/50">
            <div className="flex items-center justify-between">
              <span className="font-bold text-sm">Étape {i + 1}</span>
              {form.steps.length > 1 && (
                <button onClick={() => removeStep(i)} className="text-red-500 text-sm">✕ Retirer</button>
              )}
            </div>
            <F label="Instruction (consigne à dire)" value={s.instruction} onChange={(v) => setStep(i, 'instruction', v)} placeholder="Prends le marteau et tape !" tid={`step-inst-${i}`} />
            <div className="grid grid-cols-2 gap-2">
              <F label="Source (id élément à glisser)" value={s.source} onChange={(v) => setStep(i, 'source', v)} placeholder="marteau" tid={`step-src-${i}`} />
              <F label="Cible (id élément cible)" value={s.target} onChange={(v) => setStep(i, 'target', v)} placeholder="enclume" tid={`step-tgt-${i}`} />
            </div>
            <F label="Texte de succès (félicitation)" value={s.success} onChange={(v) => setStep(i, 'success', v)} placeholder="Bravo, l'acier prend forme !" tid={`step-ok-${i}`} />
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mt-5">
        <button data-testid="validate" className="btn-primary" onClick={handleValidate} disabled={busy}>✔️ Valider</button>
        <button className="btn-secondary" onClick={handleDownload} disabled={!validation?.valid}>⬇️ Générer le YAML</button>
      </div>
      {validation?.error && <p className="text-red-600 mt-3" data-testid="val-error">❌ {validation.error}</p>}
      {validation?.valid && <p className="text-green-700 mt-3 font-semibold" data-testid="val-ok">✅ Scène valide ! Tu peux télécharger le YAML.</p>}
    </div>
  )
}

function F({ label, value, onChange, placeholder, tid }) {
  return (
    <div>
      <label className="font-semibold text-sm">{label}</label>
      <input data-testid={tid} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="w-full mt-1 rounded-xl border-2 border-amber-200 px-3 py-2" />
    </div>
  )
}
