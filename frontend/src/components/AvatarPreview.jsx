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

// Construit la liste ordonnée des calques à afficher (en filtrant les null).
function buildLayers(config) {
  const layers = []
  if (!config) return layers
  if (config.base) layers.push(config.base)
  if (config.visage) layers.push(config.visage)
  if (config.cheveux) layers.push(config.cheveux)
  if (config.chapeau) layers.push(config.chapeau)
  if (config.tenue) layers.push(config.tenue)
  if (Array.isArray(config.accessoires)) {
    layers.push(...config.accessoires.filter(Boolean))
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
      {layers.map((id) => (
        <img
          key={id}
          src={`${AVATAR_PATH}${id}.svg`}
          alt=""
          aria-hidden="true"
          draggable="false"
          className="absolute inset-0 h-full w-full object-contain pointer-events-none"
        />
      ))}
    </div>
  )
}
