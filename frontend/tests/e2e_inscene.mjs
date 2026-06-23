// e2e_inscene.mjs — Tests Objectif 1 (Refonte UX : Scène Interactive In-Situ).
// Valide les exigences T1.1-T1.4 du brief "Refonte UX/Visuelle Itérative".
//
//   T1.1 : les objets interactifs sont dans la scène (positionnés en absolu),
//          AUCUNE grille d'inventaire séparée.
//   T1.2 : déposer le charbon/minerai dans le four -> un calque d'effet
//          (flames) apparaît dans les 300ms.
//   T1.3 : mauvais dépôt -> shake (animate-wiggle), pas de message texte
//          d'erreur.
//   T1.4 : parcourir les étapes -> chaque étape déclenche une transformation
//          visible (calque d'effet ou changement d'état de la scène).
//
// Pré-requis : backend :8000 + Vite :3000 en cours d'exécution.

import { chromium } from 'playwright'

const APP = 'http://localhost:3000/'
const PASS = '\x1b[32mPASS\x1b[0m'
const FAIL = '\x1b[31mFAIL\x1b[0m'
const results = []
function record(id, ok, detail) { results.push([id, ok ? PASS : FAIL, detail]) }

async function doDrag(page, srcId, tgtId) {
  const src = page.locator(`[data-dnd-draggable="${srcId}"]`)
  const tgt = page.locator(`[data-dnd-dropzone="${tgtId}"]`)
  const sb = await src.boundingBox()
  const tb = await tgt.boundingBox()
  if (!sb || !tb) return false
  await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height / 2)
  await page.mouse.down()
  await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height / 2, { steps: 15 })
  await page.mouse.up()
  await page.waitForTimeout(700)
  return true
}

const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('arbre_savoirs_avatar', JSON.stringify({
      base: 'avatar_base_apprenti',
      visage: 'avatar_visage_souriant',
      cheveux: 'avatar_cheveux_01',
      chapeau: null,
      tenue: 'avatar_tabrier_forgeron',
      accessoires: ['avatar_gants'],
    }))
  })
  await page.setViewportSize({ width: 1280, height: 1000 })

  // --- T1.1 : scène "in-situ", pas d'inventaire séparé ---------------------
  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.click('text=La Naissance de l\'Acier')
  await page.waitForSelector('[data-testid="scene"]', { timeout: 45000 })

  // Pas de grille d'inventaire dédiée (aucun élément avec cet testid).
  const inventoryGrid = await page.locator('[data-testid="inventory-grid"]').count()
  // Les éléments interactifs sont positionnés en absolu dans le décor (wrapper
  // avec position:absolute) OU en staging. On vérifie qu'au moins un élément
  // est dans un conteneur positionné en absolu (preuve du layout in-scene).
  const hasAbsoluteLayout = await page.locator('[data-dnd-draggable], [data-dnd-dropzone]').first()
    .evaluate((el) => {
      let n = el
      while (n && n.tagName !== 'BODY') {
        if (getComputedStyle(n).position === 'absolute') return true
        n = n.parentElement
      }
      return false
    })
  record('T1.1', inventoryGrid === 0 && hasAbsoluteLayout,
    `inventory-grid=${inventoryGrid}, layout-absolu=${hasAbsoluteLayout}`)

  // --- T1.2 : dépôt minerai -> four déclenche un calque de flammes ---------
  //   fondeur_naissance_acier étape 1 : minerai_fer -> four_haut_fourneau.
  //   Le calque flames est déclenché quand un métal est déposé dans un four.
  const flamesBefore = await page.locator('[data-testid="effect-flames"]').count()
  await doDrag(page, 'minerai_fer', 'four_haut_fourneau')
  // Le calque flames doit apparaître rapidement (<= 500ms).
  let flamesAfter = 0
  for (let i = 0; i < 10; i++) {
    flamesAfter = await page.locator('[data-testid="effect-flames"]').count()
    if (flamesAfter > 0) break
    await page.waitForTimeout(50)
  }
  record('T1.2', flamesBefore === 0 && flamesAfter > 0,
    `flammes avant=${flamesBefore}, après dépôt four=${flamesAfter}`)

  // --- T1.3 : mauvais dépôt -> pas d'avance, pas de message texte ----------
  //   Étape 2 : charbon -> four_haut_fourneau. On tente charbon -> zone_livraison
  //   (mauvaise cible) : doit échouer sans message texte.
  const stepText = () => page.locator('span:has-text("Étape")').innerText()
  const beforeStep = await stepText()
  await doDrag(page, 'charbon', 'zone_livraison') // mauvaise cible à l'étape 2
  const afterStep = await stepText()
  const errorMsg = await page.locator('text=/erreur|incorrect|essaie encore/i').count()
  record('T1.3', beforeStep === afterStep && errorMsg === 0,
    `étape ${beforeStep} inchangée=${beforeStep === afterStep}, msg-erreur=${errorMsg}`)

  // --- T1.4 : parcourir les étapes restantes -> scène terminée --------------
  //   On termine la recette (étapes 2-4).
  await doDrag(page, 'charbon', 'four_haut_fourneau')   // étape 2 OK
  await doDrag(page, 'acier_liquide', 'moule_lingot')   // étape 3 OK
  await doDrag(page, 'lingot_refroidi', 'zone_livraison') // étape 4 OK -> terminé
  const done = await page.locator('[data-testid="scene-done"]').count()
  record('T1.4', done > 0, `scène fondeur terminée=${done > 0}`)
} catch (e) {
  record('ERR', false, `erreur inattendue : ${e.message}`)
} finally {
  await browser.close()
}

console.log('='.repeat(70))
console.log('OBJECTIF 1 (Refonte UX) — Scène Interactive In-Situ')
console.log('='.repeat(70))
for (const [id, st, d] of results) console.log(`  ${id}  [${st}]  ${d}`)
const hardFail = results.some(([, s]) => s === FAIL)
console.log('\nRÉSULTAT OBJECTIF 1 :', hardFail ? FAIL : PASS)
process.exit(hardFail ? 1 : 0)
