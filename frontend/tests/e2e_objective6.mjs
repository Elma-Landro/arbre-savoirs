// e2e_objective6.mjs — Tests Objectif 6 (Outil de contribution visuel), navigateur réel.
//
//   T6.1 Interface de création d'étapes : le formulaire permet d'ajouter
//        dynamiquement plusieurs étapes (Action, Source, Cible, Texte).
//   T6.2 Génération du YAML : "Valider" puis "Générer" produit un fichier YAML
//        téléchargeable respectant le schéma du moteur de scène (background,
//        elements, steps valides).
//
// Pré-requis : backend FastAPI sur :8000 ET Vite dev sur :3000.

import { chromium } from 'playwright'
import yaml from 'js-yaml'
import fs from 'fs'
import path from 'path'
import os from 'os'

const APP = 'http://localhost:3000/'
const PASS = '\x1b[32mPASS\x1b[0m'
const FAIL = '\x1b[31mFAIL\x1b[0m'
const results = []
function record(id, ok, detail) { results.push([id, ok ? PASS : FAIL, detail]) }

const browser = await chromium.launch()
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dl-'))

try {
  const page = await browser.newPage()
  // Capturer les téléchargements.
  const downloads = []
  page.on('download', async (d) => {
    const p = path.join(tmpDir, d.suggestedFilename())
    await d.saveAs(p)
    downloads.push(p)
  })

  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.click('nav button:has-text("Contribuer")')
  await page.waitForSelector('text=Crée ta scène interactive', { timeout: 10000 })

  // --- Remplir la recette (avec ids de nœuds existants pour la validation) ---
  await page.getByTestId('rec-id').fill('recette_test')
  await page.getByTestId('rec-titre').fill('Scène de test')
  await page.getByTestId('rec-metier').fill('Testeur')
  await page.getByTestId('rec-ing').fill('minerai_fer')
  await page.getByTestId('rec-res').fill('lingot_acier')
  await page.getByTestId('rec-elements').fill('marteau, 🔨, draggable\nenclume, ⚙️, dropzone')

  // --- T6.1 : ajouter dynamiquement des étapes ---
  // Une étape existe déjà par défaut. On en ajoute 2 de plus (total 3).
  const before = await page.locator('[data-testid^="step-block-"]').count()
  await page.getByTestId('add-step').click()
  await page.getByTestId('add-step').click()
  const after = await page.locator('[data-testid^="step-block-"]').count()
  record('T6.1', after === before + 2,
    `${before} -> ${after} étapes (ajout dynamique de ${after - before} étapes).`)

  // Remplir les étapes : (instruction, source, cible, succès)
  const steps = [
    ['Prends le marteau !', 'marteau', 'enclume', 'Bravo !'],
    ['Tape encore !', 'marteau', 'enclume', 'Super !'],
    ['Une dernière fois !', 'marteau', 'enclume', 'Magnifique !'],
  ]
  for (let i = 0; i < steps.length; i++) {
    await page.getByTestId(`step-inst-${i}`).fill(steps[i][0])
    await page.getByTestId(`step-src-${i}`).fill(steps[i][1])
    await page.getByTestId(`step-tgt-${i}`).fill(steps[i][2])
    await page.getByTestId(`step-ok-${i}`).fill(steps[i][3])
  }

  // --- T6.2 : valider puis générer le YAML ---
  await page.getByTestId('validate').click()
  await page.waitForSelector('[data-testid="val-ok"]', { timeout: 15000 })
  const validOk = await page.locator('[data-testid="val-ok"]').count()
  record('T6.2a', validOk > 0, validOk > 0 ? 'Scène validée par le backend.' : 'Validation échouée.')

  // Télécharger le YAML.
  await page.locator('button:has-text("Générer le YAML")').click()
  await page.waitForTimeout(1500)
  record('T6.2b', downloads.length >= 1, `${downloads.length} fichier(s) téléchargé(s).`)

  // Vérifier le contenu du YAML téléchargé (schéma scène).
  let yamlOk = false
  let detail = 'Aucun YAML téléchargé.'
  if (downloads.length) {
    try {
      const doc = yaml.load(fs.readFileSync(downloads[0], 'utf-8'))
      const r = doc?.recipes?.[0]
      const sc = r?.scenario
      yamlOk = r && sc
        && typeof sc.background === 'string'
        && Array.isArray(sc.elements) && sc.elements.length >= 1
        && Array.isArray(sc.steps) && sc.steps.length >= 2
        && sc.steps.every((s) => s.instruction_tts && s.action_attendue?.source && s.success_tts)
      detail = yamlOk
        ? `YAML valide : ${r.id}, ${sc.elements.length} elements, ${sc.steps.length} steps.`
        : `YAML non conforme : ${JSON.stringify(r).slice(0, 150)}`
    } catch (e) {
      detail = `YAML non parsable : ${e.message}`
    }
  }
  record('T6.2c', yamlOk, detail)
} finally {
  await browser.close()
  fs.rmSync(tmpDir, { recursive: true, force: true })
}

console.log('='.repeat(70))
console.log('OBJECTIF 6 (V2) — Outil de contribution visuel (navigateur réel)')
console.log('='.repeat(70))
for (const [id, st, d] of results) console.log(`  ${id}  [${st}]  ${d}`)
const hardFail = results.some(([, s]) => s === FAIL)
console.log('\nRÉSULTAT OBJECTIF 6 :', hardFail ? FAIL : PASS)
process.exit(hardFail ? 1 : 0)
