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
  'prop_tronc',
  'zone_billot',
  'prop_hache',
  'prop_scie',
  'result_planche',
  'icon_bucheron',
  'prop_planche_bois',
  'prop_clou',
  'prop_roue_bois',
  'zone_chassis_charrette',
  'result_charrette',
  'icon_charron',
  'zone_preparation',
  'avatar_base_apprenti',
  'avatar_visage_souriant',
  'avatar_cheveux_01',
  'avatar_cheveux_02',
  'avatar_chapeau_bucheron',
  'avatar_tablier_forgeron',
  'avatar_gants',
  'avatar_bottes',
  'avatar_accessoire_marteau',
  'avatar_accessoire_loupe',
]

function readManifest() {
  if (!fs.existsSync(MANIFEST_PATH)) return null
  return JSON.parse(fs.readFileSync(MANIFEST_PATH, 'utf8'))
}

function readGraph() {
  return yaml.load(fs.readFileSync(GRAPH_PATH, 'utf8'))
}

// --- A1 : manifest complet + fichiers présents (src PNG ou svg) -------------
const manifest = readManifest()
record('A1.1', !!manifest, manifest ? 'assets_manifest.json présent.' : 'Manifest absent.')
if (manifest) {
  const missing = EXPECTED_ASSETS.filter((id) => !manifest[id])
  const missingFields = EXPECTED_ASSETS.filter((id) => {
    const a = manifest[id]
    // src (PNG enluminuré) OU svg (fallback) suffit ; emoji/label/status requis.
    return !a || !(a.src || a.svg) || !a.emoji || !a.label || !a.status
  })
  const missingFiles = EXPECTED_ASSETS.filter((id) => {
    const a = manifest[id]
    const rel = a?.src || a?.svg
    if (!rel) return true
    const filePath = path.join(process.cwd(), 'public', rel.replace(/^\//, ''))
    return !fs.existsSync(filePath)
  })
  record('A1.2', missing.length === 0, missing.length ? `Assets manquants: ${missing.join(', ')}` : `${EXPECTED_ASSETS.length} assets déclarés.`)
  record('A1.3', missingFields.length === 0, missingFields.length ? `Champs incomplets: ${missingFields.join(', ')}` : 'Champs src|svg/emoji/label/status OK.')
  record('A1.4', missingFiles.length === 0, missingFiles.length ? `Fichiers absents: ${missingFiles.join(', ')}` : 'Tous les fichiers assets existent (PNG ou SVG).')
}

// --- A2 : graphe enrichi sans suppression emoji -----------------------------
const graph = readGraph()
const assetRecipes = ['recette_fonte', 'recette_forge', 'recette_bucheronnage', 'recette_charronnage']
const recipesById = Object.fromEntries(graph.recipes.map((r) => [r.id, r]))
const assetElements = assetRecipes.flatMap((id) => recipesById[id]?.scenario?.elements || [])
const withoutEmoji = assetElements.filter((el) => !el.emoji)
const withoutAsset = assetElements.filter((el) => !el.asset)
record('A2.1', withoutEmoji.length === 0, withoutEmoji.length ? `Emoji supprimés: ${withoutEmoji.map((e) => e.id).join(', ')}` : 'Tous les emojis sont conservés.')
record('A2.2', withoutAsset.length === 0, withoutAsset.length ? `Asset manquant sur: ${withoutAsset.map((e) => e.id).join(', ')}` : 'Les 4 recettes sont reliées à des assets.')
const unknownAssets = assetElements
  .map((el) => el.asset)
  .filter((assetId) => assetId && !manifest?.[assetId])
record('A2.3', unknownAssets.length === 0, unknownAssets.length ? `Assets inconnus dans le graphe: ${unknownAssets.join(', ')}` : 'Tous les asset IDs du graphe existent dans le manifest.')

// --- A3 : palette SVG stricte (uniquement les .svg ; les PNG enluminurés
//         sont des pixels, non vérifiables par regex texte) -------------------
// Palette canonique enluminure (cf. brief migration) :
//   Vermillon #C0392B | Outremer #1A3A8F | Or chaud #D4A017 | Malachite #2D7A4F
//   Terre d'ombre #6B3A2A | Ivoire #F5EDD6 | Noir d'encre #1A1A1A | Gris acier #5A6472
//
// NB : la palette stricte n'est exigée QUE sur les assets forge/fonte déjà
// migrés (périmètre de cette session). Les assets bûcheron/charrette/avatar
// conservent l'ancienne palette SVG "pilot" et seront migrés dans une session
// ultérieure — on ne les fait pas échouer ici.
if (manifest) {
  const ENLUMINURE_ASSETS = [
    'prop_minerai_fer', 'prop_charbon', 'prop_lingot_acier', 'prop_metal_liquide',
    'prop_marteau', 'zone_four_fonderie', 'zone_moule_lingot', 'zone_feu_forge',
    'zone_enclume', 'result_outil_acier', 'icon_forgeron', 'icon_fondeur',
  ]
  const allowed = new Set(['#C0392B', '#1A3A8F', '#D4A017', '#2D7A4F', '#6B3A2A', '#F5EDD6', '#1A1A1A', '#5A6472'])
  const violations = []
  for (const id of ENLUMINURE_ASSETS) {
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
  record('A3.1', violations.length === 0, violations.length ? `Couleurs hors palette (SVG forge/fonte): ${violations.slice(0,5).join(', ')}${violations.length>5?'…':''}` : 'Palette enluminure stricte respectée sur les 12 SVG forge/fonte.')

  // A3.2 — les 12 assets forge/fonte migrés sont déclarés enluminure_validated.
  const ENLUMINURE_EXPECTED = [
    'prop_minerai_fer', 'prop_charbon', 'prop_lingot_acier', 'prop_metal_liquide',
    'prop_marteau', 'zone_four_fonderie', 'zone_moule_lingot', 'zone_feu_forge',
    'zone_enclume', 'result_outil_acier', 'icon_forgeron', 'icon_fondeur',
  ]
  const notValidated = ENLUMINURE_EXPECTED.filter((id) => manifest[id]?.status !== 'enluminure_validated')
  record('A3.2', notValidated.length === 0,
    notValidated.length ? `Non validés: ${notValidated.join(', ')}` : '12 assets forge/fonte au statut enluminure_validated.')

  // A3.3 — chaque asset enluminure_validated pointe vers un PNG existant.
  const missingPng = ENLUMINURE_EXPECTED.filter((id) => {
    const src = manifest[id]?.src
    if (!src) return true
    const filePath = path.join(process.cwd(), 'public', src.replace(/^\//, ''))
    return !fs.existsSync(filePath)
  })
  record('A3.3', missingPng.length === 0,
    missingPng.length ? `PNG manquants: ${missingPng.join(', ')}` : '12 PNG enluminure présents.')

  // A3.4 — le fond forge enluminé est déclaré et pointe vers un PNG existant.
  const bg = manifest['bg_forge_enluminure']
  const bgOk = bg?.status === 'enluminure_validated' && bg?.src
    && fs.existsSync(path.join(process.cwd(), 'public', bg.src.replace(/^\//, '')))
  record('A3.4', bgOk, bgOk ? 'bg_forge_enluminure présent et validé.' : 'bg_forge_enluminure manquant ou non validé.')
}

// --- A4 : rendu navigateur SVG + fallback emoji -----------------------------
let browser
try {
  browser = await chromium.launch()
  const page = await browser.newPage()
  await page.addInitScript(() => {
    localStorage.setItem('arbre_savoirs_avatar', JSON.stringify({
      base: 'avatar_base_apprenti',
      visage: 'avatar_visage_souriant',
      cheveux: 'avatar_cheveux_01',
      chapeau: null,
      tenue: 'avatar_tablier_forgeron',
      accessoires: ['avatar_gants'],
    }))
  })
  await page.goto(APP, { waitUntil: 'networkidle' })
  await page.click('text=La naissance de l\'acier')
  await page.waitForSelector('[data-testid="scene"]', { timeout: 10000 })
  const imgCount = await page.locator('img[data-testid^="asset-img-"]').count()
  const mineraiVisible = await page.locator('[data-testid="asset-img-prop_minerai_fer"]').count()
  record('A4.1', imgCount >= 5 && mineraiVisible === 1, `Images SVG scène fonte: ${imgCount}, minerai=${mineraiVisible}`)

  await page.click('text=← Retour aux recettes')
  await page.click('text=Le chant de la forêt')
  await page.waitForSelector('[data-testid="scene"]', { timeout: 10000 })
  const forestImgCount = await page.locator('img[data-testid^="asset-img-"]').count()
  const hacheVisible = await page.locator('[data-testid="asset-img-prop_hache"]').count()
  record('A4.2', forestImgCount >= 5 && hacheVisible === 1, `Images SVG scène bûcheron: ${forestImgCount}, hache=${hacheVisible}`)

  const fallbackWorks = await page.evaluate(async () => {
    const mod = await import('/src/assets/assets_manifest.json?import')
    const manifest = mod.default
    return Boolean(manifest.zone_preparation?.emoji)
  })
  record('A4.3', fallbackWorks, 'Fallback emoji disponible via manifest pour zone_preparation.')
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
