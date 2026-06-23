// sceneLayouts.js — Coordonnées des dropzones en % sur les fonds annotés.
// Clé = recipe id. Les coordonnées proviennent des images annotées fournies.
// top/left/width/height définissent la zone de dépôt invisible alignée sur le décor peint.

const sceneLayouts = {
  fondeur_naissance_acier: {
    background: '/assets/chaine_acier/fondeur_bg_atelier.png',
    dropzones: {
      four_haut_fourneau: { top: '28%', left: '28%', width: '22%', height: '38%' },
      moule_lingot:       { top: '62%', left: '62%', width: '20%', height: '16%' },
      // zone_livraison : table où l'enfant dépose le lingot refroidi (étape 4).
      zone_livraison:     { top: '62%', left: '82%', width: '14%', height: '20%' },
    },
  },
  forgeron_epee: {
    background: '/assets/chaine_acier/forgeron_bg_atelier.png',
    dropzones: {
      forge_feu:   { top: '30%', left: '30%', width: '22%', height: '35%' },
      avatar_zone: { top: '20%', left: '8%',  width: '18%', height: '55%' },
      metal_chaud: { top: '48%', left: '42%', width: '18%', height: '22%' },
      seau_eau:    { top: '57%', left: '65%', width: '14%', height: '22%' },
      // enclume : surface de frappe (étape 5, marteau -> enclume).
      enclume:     { top: '56%', left: '48%', width: '16%', height: '20%' },
    },
  },
}

export default sceneLayouts
