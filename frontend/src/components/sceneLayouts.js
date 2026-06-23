// sceneLayouts.js — Coordonnées des dropzones en % sur les fonds annotés.
// Clé = recipe id. Les coordonnées proviennent des images annotées fournies.
// top/left/width/height définissent la zone de dépôt invisible alignée sur le décor peint.

const sceneLayouts = {
  // Recette 0 — le Mineur. Coordonnées issues du fond annoté validé
  // (mineur_bg_annote.png : lanterne, veines charbon/minerai/or, chariot).
  // poche_avatar et sortie_galerie ajoutées hors zones peintes (dépôt de la
  // pépite, sortie du chariot vers le tunnel lumineux en haut à droite).
  mineur_tresors_terre: {
    background: '/assets/mineur/mineur_bg_galerie.png',
    dropzones: {
      lanterne_crochet: { top: '5%',  left: '42%', width: '14%', height: '28%' },
      veine_charbon:    { top: '6%',  left: '4%',  width: '38%', height: '22%' },
      veine_minerai:    { top: '30%', left: '4%',  width: '38%', height: '22%' },
      veine_or:         { top: '68%', left: '3%',  width: '12%', height: '12%' },
      chariot_zone:     { top: '38%', left: '58%', width: '30%', height: '42%' },
      poche_avatar:     { top: '80%', left: '22%', width: '12%', height: '16%' },
      sortie_galerie:   { top: '34%', left: '86%', width: '12%', height: '28%' },
    },
  },
  fondeur_naissance_acier: {
    background: '/assets/chaine_acier/fondeur_bg_atelier.png',
    dropzones: {
      four_haut_fourneau: { top: '28%', left: '28%', width: '22%', height: '38%' },
      moule_lingot:       { top: '62%', left: '62%', width: '20%', height: '16%' },
    },
  },
  forgeron_epee: {
    background: '/assets/chaine_acier/forgeron_bg_atelier.png',
    dropzones: {
      forge_feu:   { top: '30%', left: '30%', width: '22%', height: '35%' },
      avatar_zone: { top: '20%', left: '8%',  width: '18%', height: '55%' },
      metal_chaud: { top: '48%', left: '42%', width: '18%', height: '22%' },
      seau_eau:    { top: '57%', left: '65%', width: '14%', height: '22%' },
    },
  },
}

export default sceneLayouts
