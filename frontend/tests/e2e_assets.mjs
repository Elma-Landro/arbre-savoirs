// e2e_assets.mjs — Tests Session Assets 1 (SVG + fallback emoji).
// Pré-requis pour la partie navigateur : backend :8000 et Vite :3000.

import fs from 'node:fs'
import path from 'node:path'
import yaml from 'js-yaml'
import { chromium } from 'playwright'

const ROOT = path.resolve(process.cwd(), '..')
const GRAPH_PATH = path.join(ROOT, 'knowledge_graph.yaml')
const MANIFEST_PATH = path.join(process.cwd(), 'public/assets/manifest/assets_manifest.json')
const APP = 'http://localhost:3000/'
const PASS = '\x1b[32mPASS\x1b[0m'
const FAIL = '\x1b[31mFAIL\x1b[0m'
const results = []
function record(id, ok, detail) { results.push([id, ok ? PASS : FAIL, detail]) }

const EXPECTED_ASSETS = [
  'prop_minerai_fer',
  'prop_charbon',
  'prop_metal_liquide',
  'zone_four_fonderie',
  'zone_moule_lingot',
  'prop_lingot_acier',
  'zone_feu_forge',
  'zone_enclume',
  'prop_marteau',
  'result_outil_acier',
  'icon_fondeur',
  'icon_forgeron',
]

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
}

function readGraph() {
  return yaml.load(fs.readFileSync(GRAPH_PATH, 'utf8'))
}

// --- A1 : manifest complet + fichiers SVG présents -------------------------
const manifest = readManifest()
record('A1.1', !!manifest, manifest ? 'assets_manifest.json présent.' : 'Manifest absent.')
if (manifest) {
  const missing = EXPECTED_ASSETS.filter((id) => !manifest[id])
  const missingFields = EXPECTED_ASSETS.filter((id) => {
    const a = manifest[id]
    return !a || !a.svg || !a.emoji || !a.label || !a.status
  })
  const missingFiles = EXPECTED_ASSETS.filter((id) => {
    const a = manifest[id]
    if (!a?.svg) return true
    const filePath = path.join(process.cwd(), 'public', a.svg.replace(/^\//, ''))
    return !fs.existsSync(filePath)
  })
  record('A1.2', missing.length === 0, missing.length ? `Assets manquants: ${missing.join(', ')}` : '12 assets déclarés.')
  record('A1.3', missingFields.length === 0, missingFields.length ? `Champs incomplets: ${missingFields.join(', ')}` : 'Champs id/svg/emoji/label/status OK.')
  record('A1.4', missingFiles.length === 0, missingFiles.length ? `SVG absents: ${missingFiles.join(', ')}` : 'Tous les SVG existent.')
}

// --- A2 : graphe enrichi sans suppression emoji -----------------------------
const graph = readGraph()
const assetRecipes = ['recette_fonte', 'recette_forge']
const recipesById = Object.fromEntries(graph.recipes.map((r) => [r.id, r]))
const assetElements = assetRecipes.flatMap((id) => recipesById[id]?.scenario?.elements || [])
const withoutEmoji = assetElements.filter((el) => !el.emoji)
const withoutAsset = assetElements.filter((el) => !el.asset)
record('A2.1', withoutEmoji.length === 0, withoutEmoji.length ? `Emoji supprimés: ${withoutEmoji.map((e) => e.id).join(', ')}` : 'Tous les emojis sont conservés.')
record('A2.2', withoutAsset.length === 0, withoutAsset.length ? `Asset manquant sur: ${withoutAsset.map((e) => e.id).join(', ')}` : 'Fonte + forge reliées à des assets.')
const nonCovered = recipesById.recette_bucheronnage?.scenario?.elements || []
record('A2.3', nonCovered.some((el) => el.emoji && !el.asset), 'Recette non couverte conserve le rendu emoji/fallback.')

// --- A3 : palette SVG stricte -----------------------------------------------
if (manifest) {
  const allowed = new Set(['#D99A2B', '#B35435', '#2E4F3B', '#F4EFE6', '#5C3A21', '#FF6B1A', '#6B7280'])
  const violations = []
  for (const id of EXPECTED_ASSETS) {
    const svgRel = manifest[id]?.svg
    if (!svgRel) continue
    const filePath = path.join(process.cwd(), 'public', svgRel.replace(/^\//, ''))
    if (!fs.existsSync(filePath)) continue
    const text = fs.readFileSync(filePath, 'utf8')
    for (const match of text.matchAll(/#[0-9A-Fa-f]{6}\b/g)) {
      const color = match[0].toUpperCase()
      if (!allowed.has(color)) violations.push(`${id}:${match[0]}`)
    }
  }
  record('A3.1', violations.length === 0, violations.length ? `Couleurs hors palette: ${violations.join(', ')}` : 'Palette stricte respectée.')
}

// --- A4 : rendu navigateur SVG + fallback emoji -----------------------------
let browser
try {
  browser = await chromium.launch()
  const page = await browser.newPage()
  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.click('text=La naissance de l\'acier')
  await page.waitForSelector('[data-testid="scene"]', { timeout: 10000 })
  const imgCount = await page.locator('img[data-testid^="asset-img-"]').count()
  const mineraiVisible = await page.locator('[data-testid="asset-img-prop_minerai_fer"]').count()
  record('A4.1', imgCount >= 5 && mineraiVisible === 1, `Images SVG scène fonte: ${imgCount}, minerai=${mineraiVisible}`)

  await page.click('text=← Retour aux recettes')
  await page.click('text=Le chant de la forêt')
  await page.waitForSelector('[data-testid="scene"]', { timeout: 10000 })
  const forestEmoji = await page.locator('[data-testid^="asset-emoji-"]').count()
  record('A4.2', forestEmoji >= 1, `Fallback emoji recette non couverte: ${forestEmoji}`)
} catch (e) {
  record('A4', false, `Navigateur non vérifié: ${e.message}`)
} finally {
  if (browser) await browser.close()
}

console.log('='.repeat(70))
console.log('SESSION ASSETS 1 — SVG + fallback emoji')
console.log('='.repeat(70))
for (const [id, st, d] of results) console.log(`  ${id}  [${st}]  ${d}`)
const hardFail = results.some(([, s]) => s === FAIL)
console.log('\nRÉSULTAT ASSETS 1 :', hardFail ? FAIL : PASS)
process.exit(hardFail ? 1 : 0)
