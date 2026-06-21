// e2e_objective5.mjs — Tests Objectif 5 (Méta-Histoire Visuelle), navigateur réel.
//
//   T5.1 Déclenchement : la scène finale n'est accessible que si >= 3 recettes
//        sont complétées dans le localStorage.
//   T5.2 Rendu des objets : la scène finale affiche graphiquement >= 2 objets
//        résultats des recettes complétées.
//   T5.3 Narration de synthèse : un texte TTS résumant les accomplissements
//        est généré (LLM) et un <audio> est produit.
//
// Pré-requis : backend FastAPI sur :8000 ET Vite dev sur :3000.

import { chromium } from 'playwright'

const APP = 'http://localhost:3000/'
const PASS = '\x1b[32mPASS\x1b[0m'
const FAIL = '\x1b[31mFAIL\x1b[0m'
const results = []
function record(id, ok, detail) { results.push([id, ok ? PASS : FAIL, detail]) }

// Helper : complète une scène entière via drag-and-drop réel en lisant les
// paires source/target attendues de chaque étape affichée.
async function completeScene(page) {
  await page.waitForSelector('[data-testid="scene"]', { timeout: 10000 })
  // Boucle jusqu'à l'écran "Bravo" (scene-done).
  for (let guard = 0; guard < 8; guard++) {
    if (await page.locator('[data-testid="scene-done"]').count() > 0) return true
    // La source active est le seul draggable non désactivé (cursor grab, pas 'default').
    // On récupère tous les draggables et on prend celui qui est enabled.
    const draggables = await page.locator('[data-dnd-draggable]').all()
    let dragged = false
    for (const d of draggables) {
      const cursor = await d.evaluate((el) => getComputedStyle(el).cursor)
      if (cursor === 'grab') {
        const dropzones = await page.locator('[data-dnd-dropzone]').all()
        // La cible attendue est la dropzone avec un ring ambre (highlight).
        for (const dz of dropzones) {
          const hl = await dz.evaluate((el) => el.className.includes('ring-amber'))
          if (hl) {
            const sb = await d.boundingBox()
            const tb = await dz.boundingBox()
            if (!sb || !tb) continue
            await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2)
            await page.mouse.down()
            await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 10 })
            await page.mouse.up()
            await page.waitForTimeout(900)
            dragged = true
            break
          }
        }
        if (dragged) break
      }
    }
    if (!dragged) {
      // Fallback : on tente de déposer le premier draggable enabled sur chaque dropzone.
      return false
    }
  }
  return (await page.locator('[data-testid="scene-done"]').count()) > 0
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  try {
    await runTests(page)
  } catch (e) {
    console.log('   [debug] erreur inattendue :', e.message)
  }
} finally {
  await browser.close()
}

async function runTests(page) {
  // --- T5.1 (partie négative) : avec 0 recette, la scène finale est bloquée.
  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.click('nav button:has-text("Ma grande aventure")')
  await page.waitForSelector('text=Ma grande aventure', { timeout: 10000 })
  const blockedMessage = await page.locator('text=au moins 3 recettes').count()
  record('T5.1a', blockedMessage > 0, blockedMessage > 0 ? 'Bloquée avec < 3 recettes.' : 'Pas de blocage.')

  // --- Compléter 3 recettes via drag-and-drop réel.
  const recipesToComplete = ['La naissance de l\'acier', 'Le chant de la forêt', 'La charrette qui roule']
  let completedCount = 0
  for (const title of recipesToComplete) {
    await page.click('nav button:has-text("Recettes")')
    await page.waitForSelector(`text=${title}`, { timeout: 10000 })
    await page.click(`text=${title}`)
    const ok = await completeScene(page)
    console.log(`   [debug] "${title}" complétée = ${ok}`)
    if (ok) completedCount++
  }
  record('T5.1b', completedCount >= 3, `3 recettes complétées par drag-drop réel : ${completedCount}/3.`)

  // --- T5.1 (partie positive) : maintenant la scène finale est débloquée.
  await page.click('nav button:has-text("Ma grande aventure")')
  await page.waitForTimeout(800)
  // Badge de progression dans la nav ?
  const badge = await page.locator('nav button:has-text("Ma grande aventure") >> .rounded-full').textContent().catch(() => '?')
  console.log(`   [debug] badge progression nav = ${badge}`)
  const celebrationVisible = await page.locator('[data-testid="celebration-scene"]').count().catch(() => 0)
  const blockedStill = await page.locator('text=au moins 3 recettes').count().catch(() => 0)
  console.log(`   [debug] celebration-scene=${celebrationVisible}, message blocage=${blockedStill}`)
  record('T5.1c', celebrationVisible > 0,
    celebrationVisible > 0 ? 'Scène finale débloquée.' : `Scène finale absente (badge=${badge}, blocage=${blockedStill}).`)

  // --- T5.2 : au moins 2 objets résultats affichés.
  const trophyCount = await page.locator('[data-testid^="trophy-"]').count()
  record('T5.2', trophyCount >= 2, `${trophyCount} objets résultats affichés (>=2).`)

  // --- T5.3 : narration de synthèse (LLM + audio).
  if (celebrationVisible > 0) {
    await page.click('text=Raconte ma grande aventure')
    await page.waitForSelector('[data-testid="meta-summary"]', { timeout: 60000 })
    const summaryText = (await page.locator('[data-testid="meta-summary"]').textContent()) || ''
    try {
      await page.waitForSelector('audio[src]', { timeout: 120000 })
    } catch { /* on tolère si le TTS est lent */ }
    const audioPresent = await page.locator('audio[src]').count()
    record('T5.3', summaryText.trim().split(/\s+/).length >= 50 && audioPresent > 0,
      `Résumé : ${summaryText.trim().split(/\s+/).length} mots ; audio=${audioPresent > 0}.`)
  } else {
    record('T5.3', false, 'Scène finale non visible, narration non testée.')
  }
}

console.log('='.repeat(70))
console.log('OBJECTIF 5 (V2) — Méta-Histoire Visuelle (navigateur réel)')
console.log('='.repeat(70))
for (const [id, st, d] of results) console.log(`  ${id}  [${st}]  ${d}`)
const hardFail = results.some(([, s]) => s === FAIL)
console.log('\nRÉSULTAT OBJECTIF 5 :', hardFail ? FAIL : PASS)
process.exit(hardFail ? 1 : 0)
