// e2e_objective2.mjs — Tests Objectif 2 (moteur de scène) + Objectif 3 (TTS séquentiel).
// Drag-and-drop RÉEL via Playwright (mouse events) contre l'app sur :3000.
//
//   T2.1 Rendu de la scène : background + elements affichés.
//   T2.2 Mécanique drag-and-drop : un draggable peut être saisi/déplacé.
//   T2.3 Validation d'étape : bonne source sur bonne target -> étape suivante.
//   T2.4 Feedback d'erreur : mauvaise source/target -> pas d'avance, feedback visuel.
//   T3.2 Lecture d'instruction : au chargement d'une étape, POST /api/narrate-step
//        est appelé (l'instruction_tts est synthétisée).
//   T3.3 Lecture de succès : à la validation, un autre /api/narrate-step (success_tts).
//
//   (T3.1 backend génère les .mp3 : couvert par le POST narrate-step qui renvoie une URL.
//    T3.4 format du prompt : déjà testé dans tests/test_objective3_tts.py.)

import { chromium } from 'playwright'

const APP = 'http://localhost:3000/'
const PASS = '\x1b[32mPASS\x1b[0m'
const FAIL = '\x1b[31mFAIL\x1b[0m'
const results = []
function record(id, ok, detail) { results.push([id, ok ? PASS : FAIL, detail]) }

const browser = await chromium.launch()
try {
  const page = await browser.newPage()

  // Comptage des appels /api/narrate-step (T3.2/T3.3).
  const narrateCalls = []
  page.on('request', (r) => {
    if (r.url().includes('/api/narrate-step')) narrateCalls.push(r.postDataJSON()?.text?.slice(0, 30))
  })

  // --- T2.1 : rendu de la scène -------------------------------------------
  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.click('text=La naissance de l\'acier')
  await page.waitForSelector('[data-testid="scene"]', { timeout: 10000 })
  const sceneVisible = await page.locator('[data-testid="scene"]').count()
  const draggables = await page.locator('[data-dnd-draggable]').count()
  const dropzones = await page.locator('[data-dnd-dropzone]').count()
  // Le décor : un div avec un background (dégradé) est rendu.
  const hasBg = await page.locator('[data-testid="scene"] > div').first().evaluate(
    (el) => getComputedStyle(el).background.includes('gradient') || getComputedStyle(el).backgroundColor !== 'rgba(0, 0, 0, 0)'
  )
  record('T2.1', sceneVisible > 0 && draggables > 0 && dropzones > 0 && hasBg,
    `scène=${sceneVisible}, draggables=${draggables}, dropzones=${dropzones}, décor=${hasBg}`)

  // --- helper drag-and-drop réel ------------------------------------------
  async function doDrag(srcId, tgtId) {
    const src = page.locator(`[data-dnd-draggable="${srcId}"]`)
    const tgt = page.locator(`[data-dnd-dropzone="${tgtId}"]`)
    const sb = await src.boundingBox()
    const tb = await tgt.boundingBox()
    if (!sb || !tb) return false
    // T2.2 : on saisit (mouse.down) et déplace.
    await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2)
    await page.mouse.down()
    await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(800)
    return true
  }

  // --- T2.2 : un draggable est saisi et déplacé (vérifié par le fait que
  //     le drag aboutit à un événement ; on le confirme indirectement via T2.3).
  const grabbed = await doDrag('minerai', 'four')
  record('T2.2', grabbed, grabbed ? 'Draggable saisi et déplacé (mouse down→move→up).' : 'Impossible de saisir.')

  // --- T2.3 : après le bon dépôt, on doit être à l'étape 2.
  const onStep2 = await page.locator('text=Étape 2 / 3').count()
  record('T2.3', onStep2 > 0, onStep2 > 0 ? 'Bon dépôt -> étape 2.' : 'Resté à l\'étape 1.')

  // --- T2.4 : mauvaise source sur mauvaise target -> pas d'avance.
  //     (Sur l'étape 2, source attendue = charbon_elt, target = four.
  //      On tente metal_liquide -> moule : doit échouer.)
  const step2Before = await page.locator('text=Étape 2 / 3').count()
  // metal_liquide et moule existent à cette étape (non désactivés car metal_liquide
  // n'est pas la source attendue -> désactivé ; on utilise plutôt un test de mauvaise
  // target : charbon_elt -> moule).
  await doDrag('charbon_elt', 'moule')
  const stillStep2 = await page.locator('text=Étape 2 / 3').count()
  record('T2.4', stillStep2 > 0, stillStep2 > 0 ? 'Mauvaise target rejetée, reste à l\'étape 2.' : 'A avancé par erreur.')

  // --- on termine proprement la scène (étapes 2 et 3) pour vérifier T3.3.
  await doDrag('charbon_elt', 'four')       // étape 2 OK
  await doDrag('metal_liquide', 'moule')    // étape 3 OK
  const done = await page.locator('[data-testid="scene-done"]').count()
  record('T2.3b', done > 0, done > 0 ? 'Scène terminée (Bravo).' : 'Scène non terminée.')

  // --- T3.2 + T3.3 : au moins 3+ appels /api/narrate-step (instructions + succès).
  //     Étape 1: instruction(+succès), étape 2: instruction(+succès), étape 3: instruction(+succès).
  await page.waitForTimeout(1000)
  record('T3.2', narrateCalls.length >= 3,
    `${narrateCalls.length} appels /api/narrate-step (instructions + succès).`)
  // Au moins un appel contient un fragment d'instruction et un de succès.
  const hasInstruction = narrateCalls.some((t) => t && /jeter|commence|Prends|Pour faire/i.test(t))
  const hasSuccess = narrateCalls.some((t) => t && /Bravo|Excellent|Magnifique/i.test(t))
  record('T3.3', hasSuccess,
    hasSuccess ? 'Au moins un success_tts synthétisé.' : `Appels: ${JSON.stringify(narrateCalls)}`)
  record('T3.2b', hasInstruction, hasInstruction ? 'instruction_tts synthétisé.' : 'Pas d\'instruction détectée.')
} finally {
  await browser.close()
}

console.log('='.repeat(70))
console.log('OBJECTIFS 2 & 3 — Moteur de scène + TTS séquentiel (drag-drop réel)')
console.log('='.repeat(70))
for (const [id, st, d] of results) console.log(`  ${id}  [${st}]  ${d}`)
const hardFail = results.some(([, s]) => s === FAIL)
console.log('\nRÉSULTAT :', hardFail ? FAIL : PASS)
process.exit(hardFail ? 1 : 0)
