// AvatarPreview.jsx — Aperçu de l'avatar par superposition de calques SVG.
//
// On empile plusieurs SVG (tous en viewBox 0 0 200 200) en calques absolus
// pour composer l'avatar final : base → visage → cheveux → accessoires.
//
// On utilise directement des balises <img> pointant vers /assets/avatar/*.svg
// plutôt que GameAsset, car on veut contrôler précisément l'ordre d'empilement
// et le redimensionnement commun de tous les calques.
//
// Props :
//   config : { base, visage, cheveux, chapeau, tenue, accessoires: [] }
//            - base, visage, cheveux, chapeau, tenue : ID d'asset (string) ou null
//            - accessoires : tableau d'ID d'assets (multi-choix)
//   size   : taille en px du conteneur carré (défaut 120)
//
// L'ordre de rendu est volontairement explicite (base, visage, cheveux,
// chapeau, tenue, puis accessoires) afin que chapeau/tenue viennent toujours
// au-dessus des cheveux et que les accessoires soient en premier plan.

const AVATAR_PATH = '/assets/avatar/'

const LAYER_KIND = {
  base: 'body',
  visage: 'face',
  cheveux: 'hair',
  chapeau: 'hat',
  tenue: 'outfit',
}

// Transformations d'ancrage : tous les SVG ont le même viewBox, mais les
// accessoires isolés (chapeau, tenue, outils) ont été dessinés comme objets
// indépendants. Sans ancrage explicite, ils tombent au milieu du visage.
const LAYER_STYLE_BY_KIND = {
  body: {},
  face: {},
  hair: {},
  hat: {
    width: '74%',
    height: '38%',
    left: '13%',
    top: '4%',
  },
  outfit: {
    width: '76%',
    height: '48%',
    left: '12%',
    top: '47%',
  },
  hands: {
    width: '64%',
    height: '32%',
    left: '18%',
    top: '61%',
  },
  shoes: {
    width: '58%',
    height: '24%',
    left: '21%',
    top: '78%',
  },
  toolLeft: {
    width: '46%',
    height: '46%',
    left: '-6%',
    top: '46%',
    transform: 'rotate(-12deg)',
  },
  toolRight: {
    width: '42%',
    height: '42%',
    left: '64%',
    top: '43%',
    transform: 'rotate(10deg)',
  },
}

function classifyAccessory(id) {
  if (id === 'avatar_gants') return 'hands'
  if (id === 'avatar_bottes') return 'shoes'
  if (id === 'avatar_accessoire_marteau') return 'toolLeft'
  if (id === 'avatar_accessoire_loupe') return 'toolRight'
  return 'toolRight'
}

// Construit la liste ordonnée des calques à afficher (en filtrant les null).
function buildLayers(config) {
  const layers = []
  if (!config) return layers
  if (config.base) layers.push({ id: config.base, kind: LAYER_KIND.base })
  if (config.visage) layers.push({ id: config.visage, kind: LAYER_KIND.visage })
  if (config.cheveux) layers.push({ id: config.cheveux, kind: LAYER_KIND.cheveux })
  if (config.chapeau) layers.push({ id: config.chapeau, kind: LAYER_KIND.chapeau })
  if (config.tenue) layers.push({ id: config.tenue, kind: LAYER_KIND.tenue })
  if (Array.isArray(config.accessoires)) {
    layers.push(...config.accessoires.filter(Boolean).map((id) => ({ id, kind: classifyAccessory(id) })))
  }
  return layers
}

export default function AvatarPreview({ config, size = 120 }) {
  const layers = buildLayers(config)
  const dim = `${size}px`

  return (
    <div
      data-testid="avatar-preview"
      className="relative select-none"
      style={{ width: dim, height: dim }}
      aria-label="Aperçu de l'avatar"
      role="img"
    >
      {layers.map(({ id, kind }) => (
        <img
          key={id}
          src={`${AVATAR_PATH}${id}.svg`}
          alt=""
          aria-hidden="true"
          draggable="false"
          className="absolute object-contain pointer-events-none"
          style={{ inset: 0, width: '100%', height: '100%', ...LAYER_STYLE_BY_KIND[kind] }}
        />
      ))}
    </div>
  )
}
