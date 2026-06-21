// e2e_preload_audio_static.mjs — contrat statique du préchargement audio côté frontend.
// Vérifie que ScenePage utilise l'API de préchargement avant de retomber sur
// narrateStep, afin d'éviter une attente gTTS entre chaque étape.

import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const apiPath = path.join(root, 'src', 'api.js')
const scenePagePath = path.join(root, 'src', 'pages', 'ScenePage.jsx')
const api = fs.readFileSync(apiPath, 'utf8')
const scenePage = fs.readFileSync(scenePagePath, 'utf8')

const checks = [
  [api.includes('function preloadSceneAudio') || api.includes('const preloadSceneAudio'), 'api.js exporte preloadSceneAudio'],
  [api.includes('/preload-scene-audio'), 'api.js appelle /preload-scene-audio'],
  [scenePage.includes('preloadSceneAudio'), 'ScenePage importe/utilise preloadSceneAudio'],
  [scenePage.includes('preloadedAudios'), 'ScenePage stocke les audios préchargés'],
  [scenePage.includes('playAudioUrl'), 'ScenePage sait jouer une URL déjà générée'],
]

let ok = true
console.log('='.repeat(70))
console.log('PRIORITÉ UX — Contrat frontend de préchargement audio')
console.log('='.repeat(70))
for (const [passed, label] of checks) {
  ok = ok && passed
  console.log(`  [${passed ? 'PASS' : 'FAIL'}] ${label}`)
}
console.log(`\nRÉSULTAT FRONTEND PRELOAD : ${ok ? 'PASS' : 'FAIL'}`)
process.exit(ok ? 0 : 1)
